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

// Signs up a brand-new wallet with a simulated passkey and lands on the home
// page. Shared by every test that needs an authenticated session to start from.
export async function signUpNewWallet(page: Page, context: BrowserContext): Promise<string> {
	const client = await context.newCDPSession(page);
	await addPasskeyAuthenticator(client);

	// Force English so text-based selectors don't depend on the test runner's locale.
	await page.addInitScript(() => localStorage.setItem('locale', 'en'));

	const walletName = `Playwright Wallet ${Date.now()}`;

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
