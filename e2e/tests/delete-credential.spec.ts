import { test, expect } from '@playwright/test';
import { signUpNewWallet, issueCredential } from './helpers';

test('deletes a single credential, leaving the rest of the account intact', async ({ page, context }) => {
	await signUpNewWallet(page, context);
	await issueCredential(page, 'PID');
	await expect(page.getByRole('button', { name: 'PID', exact: true })).toBeVisible({ timeout: 20_000 });
	await issueCredential(page, 'EHIC');
	await expect(page.getByRole('button', { name: 'EHIC', exact: true })).toBeVisible({ timeout: 20_000 });

	await page.getByRole('button', { name: 'PID', exact: true }).click();
	await page.waitForURL(/\/credential\//, { timeout: 20_000 });

	await page.locator('#credential-delete-button').click();
	await page.locator('#confirm-delete-popup').click();

	await page.waitForURL((url) => url.pathname === '/', { timeout: 20_000 });
	await expect(page.getByRole('button', { name: 'PID', exact: true })).not.toBeVisible();
	await expect(page.getByRole('button', { name: 'EHIC', exact: true })).toBeVisible();
});
