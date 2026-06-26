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

// Clicks through the wallet's own redirect-consent popup onto wallet-as's
// login page. Shared by every way of starting issuance (the /add list, an
// issuer's own "Open in wwWallet" link, or scanning the issuer's QR code).
async function clickContinueRedirectPopup(page: Page): Promise<void> {
	await page.locator('#continue-redirect-popup').click();
	// Full-page redirect to wallet-as (the authorization server) for login.
	await page.waitForURL(/localhost:6060\/interaction\//, { timeout: 20_000 });
}

// Approves wallet-as's consent screen, ending back on the wallet's home
// page. Shared by every wallet-as login method (username/password, PID
// sign-in).
async function approveWalletAsConsent(page: Page): Promise<void> {
	await page.getByRole('button', { name: 'Authorize' }).click();
	await page.waitForURL(/localhost:3000\//, { timeout: 20_000 });
}

// Drives the part of the OpenID4VCI authorization code flow shared by every
// way of starting issuance: the wallet's own redirect-consent popup, then
// wallet-as login (demo username/password) and consent, ending back on the
// wallet's home page.
async function completeWalletAsAuthorization(page: Page): Promise<void> {
	await clickContinueRedirectPopup(page);

	await page.locator('#login').fill('test');
	await page.locator('#password').fill('test');
	// Some scopes (e.g. diploma, ehic, por) also offer a "Sign in with PID"
	// secondary button sharing the same class, so match on exact text instead.
	await page.getByRole('button', { name: 'Sign in', exact: true }).click();

	await approveWalletAsConsent(page);
}

// Same as completeWalletAsAuthorization, but logs into wallet-as with the
// "Sign in with PID" alternative instead of typing the demo
// username/password: an OpenID4VP presentation of a PID credential the
// account already holds (see issueCredential(page, 'PID')), handled by the
// wallet's ordinary verifier credential-selection popup. wallet-as only
// offers this for scopes other than PID itself (see its
// util/pidAuthEligibility.ts), so it isn't available when issuing PID.
async function completeWalletAsAuthorizationWithPidSignIn(page: Page): Promise<void> {
	await clickContinueRedirectPopup(page);

	await page.getByRole('button', { name: 'Sign in with PID' }).click();

	// wallet-as redirects to the wallet with an OpenID4VP request for the PID;
	// the wallet handles it with the same credential-selection popup any
	// verifier request would trigger.
	await page.waitForURL(/localhost:3000\/\?/, { timeout: 20_000 });
	await page.locator('#next-select-credentials').click();
	await page.locator('[id^="slider-select-credentials-"]').first().click();
	await page.locator('#next-select-credentials').click();
	await page.locator('#send-select-credentials').click();

	// Sending the presentation redirects back to wallet-as's PID callback
	// page, which auto-submits and lands on the same consent screen the
	// username/password flow would.
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

// Same as issueCredential, but signs into wallet-as with an existing PID
// instead of the demo username/password (see
// completeWalletAsAuthorizationWithPidSignIn). The account must already hold
// a PID credential, and `listName` must be a type other than PID itself.
export async function issueCredentialUsingPidSignIn(page: Page, listName: string): Promise<void> {
	await page.goto('/add');
	await page.getByRole('button').filter({ has: page.getByText(listName, { exact: true }) }).click();
	await completeWalletAsAuthorizationWithPidSignIn(page);
}

// The issuer's own landing pages (wallet-issuer's "wwWallet Issuer" catalog),
// separate from the wallet-frontend app the rest of these helpers drive.
const ISSUER_URL = 'http://localhost:8003';

// Drives issuance the way a real user would when starting from the issuer's
// own site instead of the wallet's /add list: browse its catalog, click
// "Issue" on one credential's card, then "Open in wwWallet" on its offer
// page. That link does a full top-level navigation back to the wallet (a
// different origin, in the same tab/device) carrying a `credential_offer_uri`
// the wallet's UriHandlerProvider picks up on load, showing the same
// redirect-consent popup as the /add flow. `credentialName` is the exact
// heading text on the issuer's catalog card (e.g. "PID mDoc").
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

// Renders `text` as a real QR code (the same encoder the issuer uses to draw
// its own QR canvas) onto an offscreen canvas inside the page, then replaces
// the camera APIs the wallet's QRCodeScanner relies on (enumerateDevices,
// getUserMedia) so that opening the scanner "sees" that canvas instead of a
// real camera. This drives the actual on-screen scan-and-decode flow (camera
// permission check, device capability probing, the qr-scanner library
// reading real video frames) without needing real camera hardware or
// browser-level fake-camera launch flags.
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

		// Chromium only emits a "new" canvas-captured frame when the canvas
		// pixels actually change, regardless of the requested frame rate, so a
		// canvas drawn once and never touched again yields a stream stuck on
		// its first frame; that in turn means requestVideoFrameCallback (which
		// the scanner's frame loop prefers) never fires a second time and
		// scanning stalls after a single attempt. Toggling one corner pixel on
		// an interval keeps real frames flowing without visibly affecting the
		// QR code.
		setInterval(() => {
			ctx.fillStyle = ctx.fillStyle === '#000000' ? '#fefefe' : '#000000';
			ctx.fillRect(dim - 1, dim - 1, 1, 1);
		}, 100);

		// One capture, reused for every getUserMedia() call: the scanner probes
		// the "camera" twice (once for permission, once per enumerated device)
		// before the real one Webcam uses, stop()-ing the track each time. A
		// fresh captureStream() per call would still report itself as "live",
		// but reliably left the video element that ultimately uses it stuck at
		// readyState 0 forever — something about a track from this same canvas
		// having already been stopped once seems to poison later captures of
		// it. Stubbing out stop() as a no-op and always handing back the same
		// stream avoids that entirely.
		const stream = canvas.captureStream(10);
		const track = stream.getVideoTracks()[0];
		// CanvasCaptureMediaStreamTrack doesn't normally implement
		// getCapabilities(); the scanner needs it to pick a "back" camera and a
		// resolution.
		track.getCapabilities = () => ({ width: { max: dim }, height: { max: dim }, facingMode: ['environment'] }) as MediaTrackCapabilities;
		track.stop = () => { };

		const fakeDevice = { deviceId: 'e2e-fake-camera', kind: 'videoinput' as const, label: 'e2e fake camera', groupId: 'e2e-fake-camera-group' };
		// @ts-expect-error test-only override of the real camera APIs, see comment above mockCameraWithQrCode
		navigator.mediaDevices.enumerateDevices = async () => [fakeDevice];
		navigator.mediaDevices.getUserMedia = async () => stream;
	}, {
		matrix,
		moduleSize: 8,
		// wallet-frontend's qr-scanner only scans the center 2/3 of the video
		// frame by default (see _calculateScanRegion in
		// wallet-frontend/src/utils/qr/qr-scanner.ts), so the quiet zone needs
		// to be wide enough that the QR pattern itself — not just its margin —
		// stays within that crop, rather than the spec-minimum 4 modules.
		quietZone: Math.ceil(size / 2),
	});
}

// Drives issuance the way a real user would when scanning the issuer's QR
// code with the wallet's own scanner — the cross-device path (e.g. phone
// wallet, laptop issuer screen). The issuer's offer page is opened in a
// separate tab so the already signed-in wallet tab never navigates away;
// the QR's exact contents are read directly from the canvas the issuer
// renders it from (the value it passes to its own QR-rendering library),
// then re-rendered as a real QR code fed into the wallet's camera APIs.
// `credentialName` is the exact heading text on the issuer's catalog card
// (e.g. "PID mDoc").
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
