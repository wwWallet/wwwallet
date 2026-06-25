import { test, expect, type CDPSession } from '@playwright/test';

// Simulates a platform passkey using Chrome DevTools Protocol's WebAuthn
// virtual authenticator, so signup can be tested without real biometrics.
// The wallet's signup flow relies on the WebAuthn PRF extension (see
// wallet-frontend/src/api/index.ts signupWebauthn), so the virtual
// authenticator must advertise `hasPrf` and CTAP 2.1 support.
async function addPasskeyAuthenticator(client: CDPSession) {
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

test('signs up with a new passkey', async ({ page, context }) => {
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
	await expect(page.getByText(walletName)).toBeVisible();
});
