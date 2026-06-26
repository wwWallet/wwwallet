import type { Page, BrowserContext, CDPSession } from '@playwright/test';

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
	await page.locator('#continue-redirect-popup').click();

	// Full-page redirect to wallet-as (the authorization server) for login.
	await page.waitForURL(/localhost:6060\/interaction\//, { timeout: 20_000 });
	await page.locator('#login').fill('test');
	await page.locator('#password').fill('test');
	// Some scopes (e.g. diploma, ehic, por) also offer a "Sign in with PID"
	// secondary button sharing the same class, so match on exact text instead.
	await page.getByRole('button', { name: 'Sign in', exact: true }).click();

	// wallet-as then asks for consent before redirecting back to the wallet.
	await page.getByRole('button', { name: 'Authorize' }).click();

	await page.waitForURL(/localhost:3000\//, { timeout: 20_000 });
}
