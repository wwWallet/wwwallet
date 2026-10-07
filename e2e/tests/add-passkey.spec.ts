import { expect, test } from '@playwright/test';
import { replacePasskeyAuthenticator, signUpNewWalletWithAuthenticator } from './helpers';

test('adds a new passkey from settings', async ({ page, context }) => {
	const passkeyName = 'Backup passkey';

	const { walletName, client, authenticatorId } = await signUpNewWalletWithAuthenticator(page, context);
	await replacePasskeyAuthenticator(client, authenticatorId);

	await page.locator('#sidebar-item-settings').click();
	await expect(page).toHaveURL((url) => url.pathname === '/settings');
	await page.locator('#settings-tab-account').click();

	await expect(page.locator('#rename-passkey')).toHaveCount(1);
	await page.locator('#add-passkey-trigger').click();
	await page.locator('#add-passkey-settings-client-device').click();

	await page.getByLabel('Name for new credential').fill(passkeyName);
	await page.locator('#save-add-passkey-settings').click();
	await page.locator('#continue-prf-passkey-settings').click();

	await expect(page.getByText(passkeyName, { exact: true })).toBeVisible({ timeout: 20_000 });
	await expect(page.locator('#rename-passkey')).toHaveCount(2);

	await page.goto('/');
	await page.reload();
	await expect(page).toHaveURL((url) => url.pathname === '/');

	await page.locator('#sidebar-item-logout').click();
	await page.waitForURL((url) => url.pathname.startsWith('/login'));
	await page.getByRole('button', { name: 'Sign in with a Passkey', exact: true }).click();
	await page.locator('#continue-prf-loginsignup').click();

	await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 });
	await expect(page.locator('span[title]').filter({ hasText: walletName })).toBeVisible();

	await page.locator('#sidebar-item-settings').click();
	await expect(page).toHaveURL((url) => url.pathname === '/settings');
	await page.locator('#settings-tab-account').click();
	const loggedInPasskey = page.locator('form')
		.filter({ hasText: passkeyName })
		.filter({ hasText: 'Logged in' });
	await expect(loggedInPasskey).toHaveCount(1);
});
