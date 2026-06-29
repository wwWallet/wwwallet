import { test, expect } from '@playwright/test';
import { signUpNewWallet } from './helpers';

test('signs up with a new passkey', async ({ page, context }) => {
	const walletName = await signUpNewWallet(page, context);
	await expect(page.getByText(walletName)).toBeVisible();
});
