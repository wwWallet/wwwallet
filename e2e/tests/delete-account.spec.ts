import { test, expect } from '@playwright/test';
import { signUpNewWallet } from './helpers';

test('deletes the account from settings', async ({ page, context }) => {
	await signUpNewWallet(page, context);

	await page.goto('/settings');

	// Deleting is locked behind a re-authentication step (client-side
	// safeguard only); this triggers another WebAuthn assertion against the
	// same simulated passkey created during signup.
	await page.locator('#unlock-passkey-management-settings').click();
	await page.locator('#delete-account').click();
	await page.locator('#confirm-delete-popup').click();

	await page.waitForURL((url) => url.pathname.startsWith('/login'), { timeout: 20_000 });
});
