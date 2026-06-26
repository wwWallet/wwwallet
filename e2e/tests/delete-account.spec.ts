import { test } from '@playwright/test';
import { signUpNewWallet, deleteAccount } from './helpers';

test('deletes the account from settings', async ({ page, context }) => {
	await signUpNewWallet(page, context);
	await deleteAccount(page);
});
