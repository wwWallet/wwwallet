import type { Page, BrowserContext, CDPSession } from '@playwright/test';
import QRCode from 'qrcode';

// Simulates a platform passkey using Chrome DevTools Protocol's WebAuthn
// virtual authenticator, so signup can be tested without real biometrics.
// The wallet's signup flow relies on the WebAuthn PRF extension (see
// wallet-frontend/src/api/index.ts signupWebauthn), so the virtual
// authenticator must advertise `hasPrf` and CTAP 2.1 support.
export async function addPasskeyAuthenticator(client: CDPSession) {
	await client.send('WebAuthn.enable');
	const { authenticatorId } = await client.send('WebAuthn.addVirtualAuthenticator', {
		options: {
			protocol: 'ctap2',
			ctap2Version: 'ctap2_1',
			transport: 'internal',
			hasResidentKey: true,
			hasUserVerification: true,
			hasPrf: true,
			isUserVerified: true,
			automaticPresenceSimulation: true,
		},
	});
	return authenticatorId;
}

// Registers a single virtual authenticator for the page's CDP session. Split
// out from signUp() so tests that sign up more than once (e.g. a repeated
// create/delete cycle) can call this once and reuse it, rather than stacking
// up one virtual authenticator per signup.
export async function setUpPasskeyAuthenticator(
	page: Page,
	context: BrowserContext,
): Promise<{ client: CDPSession, authenticatorId: string }> {
	const client = await context.newCDPSession(page);
	const authenticatorId = await addPasskeyAuthenticator(client);
	return { client, authenticatorId };
}

// Deleting an account in the app only removes server-side data, the same as
// in real life it doesn't revoke the passkey from the device, so a reused
// authenticator accumulates one resident credential per signup. Real
// authenticators (and this virtual one) cap how many they'll store, so
// repeated create/delete cycles in one test need to clear it out between
// signups — simulating the same device getting a fresh passkey each time,
// as if the old one had been forgotten when its account was deleted.
export async function clearPasskeyCredentials(client: CDPSession, authenticatorId: string): Promise<void> {
	await client.send('WebAuthn.clearCredentials', { authenticatorId });
}

// Same idea, but simulating a different device signing up each time instead
// of the same device getting a new passkey: removes the old virtual
// authenticator entirely and registers a brand-new one.
export async function replacePasskeyAuthenticator(client: CDPSession, authenticatorId: string): Promise<string> {
	await client.send('WebAuthn.removeVirtualAuthenticator', { authenticatorId });
	return addPasskeyAuthenticator(client);
}

// Signs up a brand-new wallet with a simulated passkey (registered via
// setUpPasskeyAuthenticator) and lands on the home page.
export async function signUp(page: Page, walletName: string = `Playwright Wallet ${Date.now()}`): Promise<string> {
	await page.goto('/login');
	await page.locator('#signUp-switch-loginsignup').click();

	await page.locator('input[name="name"]').fill(walletName);
	await page.getByRole('button', { name: 'Create account with a Passkey' }).click();

	await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 });

	// New accounts get a one-time welcome tour modal that would otherwise sit
	// on top of the page and intercept clicks on whatever comes next. It mounts
	// asynchronously, so wait for it rather than checking visibility immediately.
	await page.locator('#close-welcome-modal').click({ timeout: 5_000 }).catch(() => {});

	return walletName;
}

// Convenience wrapper for tests that only sign up once: sets up the
// authenticator and immediately signs up. Shared by every test that needs an
// authenticated session to start from.
export async function signUpNewWallet(page: Page, context: BrowserContext): Promise<string> {
	await setUpPasskeyAuthenticator(page, context);
	// Force English so text-based selectors don't depend on the test runner's locale.
	await page.addInitScript(() => localStorage.setItem('locale', 'en'));
	return signUp(page);
}

// Deletes the currently signed-in account from settings, ending back on /login.
export async function deleteAccount(page: Page): Promise<void> {
	await page.goto('/settings');

	// Deleting is locked behind a re-authentication step (client-side
	// safeguard only); this triggers another WebAuthn assertion against the
	// same passkey used to sign in.
	await page.locator('#unlock-passkey-management-settings').click();
	await page.locator('#delete-account').click();
	await page.locator('#confirm-delete-popup').click();

	await page.waitForURL((url) => url.pathname.startsWith('/login'), { timeout: 20_000 });
}

async function clickContinueRedirectPopup(page: Page): Promise<void> {
	await page.locator('#continue-redirect-popup').click();
	await page.waitForURL(/localhost:6060\/interaction\//, { timeout: 20_000 });
}

async function approveWalletAsConsent(page: Page): Promise<void> {
	await page.getByRole('button', { name: 'Authorize' }).click();
	await page.waitForURL(/localhost:3000\//, { timeout: 20_000 });
}

async function completeWalletAsAuthorization(page: Page): Promise<void> {
	await clickContinueRedirectPopup(page);

	await page.locator('#login').fill('test');
	await page.locator('#password').fill('test');
	// Some scopes (e.g. diploma, ehic, por) also offer a "Sign in with PID"
	// secondary button sharing the same class, so match on exact text instead.
	await page.getByRole('button', { name: 'Sign in', exact: true }).click();

	await approveWalletAsConsent(page);
}

// Alternative to completeWalletAsAuthorization: logs in by presenting a PID
// the account already holds (see issueCredential(page, 'PID')) instead of
// the demo username/password. wallet-as only offers this for scopes other
// than PID itself.
async function completeWalletAsAuthorizationWithPidSignIn(page: Page): Promise<void> {
	await clickContinueRedirectPopup(page);
	await page.getByRole('button', { name: 'Sign in with PID' }).click();

	// Redirects to the wallet with an OpenID4VP request for the PID, handled
	// by the same credential-selection popup any verifier request would use.
	await page.waitForURL(/localhost:3000\/\?/, { timeout: 20_000 });
	await page.locator('#next-select-credentials').click();
	await page.locator('[id^="slider-select-credentials-"]').first().click();
	await page.locator('#next-select-credentials').click();
	await page.locator('#send-select-credentials').click();

	await page.waitForURL(/localhost:6060\/interaction\//, { timeout: 20_000 });
	await approveWalletAsConsent(page);
}

// Drives the full OpenID4VCI authorization code flow for one credential type,
// from the /add list through wallet-as login/consent, ending back on the
// wallet's home page. `listName` is the credential's exact display name as
// shown in the /add list (e.g. "PID mDoc") — list items render an avatar
// initial and an issuer badge alongside it, so matching on exact text rather
// than the button's full (concatenated) accessible name avoids ambiguity
// between e.g. "PID" and "PID mDoc".
export async function issueCredential(page: Page, listName: string): Promise<void> {
	await page.goto('/add');
	await page.getByRole('button').filter({ has: page.getByText(listName, { exact: true }) }).click();
	await completeWalletAsAuthorization(page);
}

// Same as issueCredential, but requires a PID credential already issued and
// `listName` to be a type other than PID itself.
export async function issueCredentialUsingPidSignIn(page: Page, listName: string): Promise<void> {
	await page.goto('/add');
	await page.getByRole('button').filter({ has: page.getByText(listName, { exact: true }) }).click();
	await completeWalletAsAuthorizationWithPidSignIn(page);
}

const ISSUER_URL = 'http://localhost:8003';

// Starts issuance from the issuer's own catalog instead of the wallet's
// /add list: click "Issue" on a credential card, then "Open in wwWallet" on
// its offer page. `credentialName` is the exact heading text on that card
// (e.g. "PID mDoc").
export async function issueCredentialFromIssuer(page: Page, credentialName: string): Promise<void> {
	await page.goto(ISSUER_URL);
	await page.locator('.card')
		.filter({ has: page.getByRole('heading', { name: credentialName, exact: true }) })
		.getByRole('link', { name: 'Issue', exact: true })
		.click();
	await page.waitForURL(/\/offer\//, { timeout: 20_000 });

	await page.getByRole('link', { name: 'Open in wwWallet', exact: true }).click();

	await completeWalletAsAuthorization(page);
}

// Renders `text` as a real QR code onto an offscreen canvas, then replaces
// the wallet's camera APIs (enumerateDevices, getUserMedia) so its scanner
// "sees" that canvas instead of a real camera.
async function mockCameraWithQrCode(page: Page, text: string): Promise<void> {
	const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
	const size = qr.modules.size;
	const matrix: number[][] = [];
	for (let row = 0; row < size; row++) {
		const cols: number[] = [];
		for (let col = 0; col < size; col++) {
			cols.push(qr.modules.get(row, col) ? 1 : 0);
		}
		matrix.push(cols);
	}

	await page.evaluate(({ matrix, moduleSize, quietZone }) => {
		const size = matrix.length;
		const dim = (size + quietZone * 2) * moduleSize;

		const canvas = document.createElement('canvas');
		canvas.width = dim;
		canvas.height = dim;
		const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
		ctx.fillStyle = '#fff';
		ctx.fillRect(0, 0, dim, dim);
		ctx.fillStyle = '#000';
		for (let row = 0; row < size; row++) {
			for (let col = 0; col < size; col++) {
				if (matrix[row][col]) {
					ctx.fillRect((col + quietZone) * moduleSize, (row + quietZone) * moduleSize, moduleSize, moduleSize);
				}
			}
		}

		// Chromium only emits a "new" captured frame when the canvas pixels
		// change, so a static canvas stalls the scanner's frame loop after one
		// attempt. Toggling one corner pixel keeps frames flowing.
		setInterval(() => {
			ctx.fillStyle = ctx.fillStyle === '#000000' ? '#fefefe' : '#000000';
			ctx.fillRect(dim - 1, dim - 1, 1, 1);
		}, 100);

		// Reused for every getUserMedia() call rather than capturing fresh each
		// time: the scanner probes the "camera" twice before Webcam's own call,
		// stop()-ing the track each time, which otherwise left the stream stuck
		// at readyState 0 for good. stop() is stubbed out to a no-op so that's
		// harmless here.
		const stream = canvas.captureStream(10);
		const track = stream.getVideoTracks()[0];
		// CanvasCaptureMediaStreamTrack doesn't normally implement this; the
		// scanner needs it to pick a "back" camera and a resolution.
		track.getCapabilities = () => ({ width: { max: dim }, height: { max: dim }, facingMode: ['environment'] }) as MediaTrackCapabilities;
		track.stop = () => { };

		const fakeDevice = { deviceId: 'e2e-fake-camera', kind: 'videoinput' as const, label: 'e2e fake camera', groupId: 'e2e-fake-camera-group' };
		// @ts-expect-error test-only override of the real camera APIs
		navigator.mediaDevices.enumerateDevices = async () => [fakeDevice];
		navigator.mediaDevices.getUserMedia = async () => stream;
	}, {
		matrix,
		moduleSize: 8,
		// The scanner only analyzes the center 2/3 of the frame, so the quiet
		// zone needs to be wider than the spec minimum to keep the QR pattern
		// itself inside that crop.
		quietZone: Math.ceil(size / 2),
	});
}

// Same starting point as issueCredentialFromIssuer, but scans the offer
// page's QR code with the wallet's own scanner instead of clicking its link
// (the issuer page is opened in a separate tab so the wallet tab never
// navigates away).
export async function issueCredentialByScanningQrCode(page: Page, context: BrowserContext, credentialName: string): Promise<void> {
	const issuerPage = await context.newPage();
	await issuerPage.goto(ISSUER_URL);
	await issuerPage.locator('.card')
		.filter({ has: issuerPage.getByRole('heading', { name: credentialName, exact: true }) })
		.getByRole('link', { name: 'Issue', exact: true })
		.click();
	await issuerPage.waitForURL(/\/offer\//, { timeout: 20_000 });
	const qrText = await issuerPage.locator('#qr').getAttribute('data-value');
	await issuerPage.close();
	if (!qrText) {
		throw new Error('Could not read the QR code value from the issuer offer page');
	}

	// The QR scanner is only reachable from the mobile bottom nav (see
	// wallet-frontend's useScreenType hook: < 480px counts as "mobile").
	await page.setViewportSize({ width: 390, height: 844 });
	await mockCameraWithQrCode(page, qrText);
	await page.locator('#bottom-nav-item-qr').click();

	await completeWalletAsAuthorization(page);
}
