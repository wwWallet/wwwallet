import { test, expect } from '@playwright/test';
import { signUpNewWallet, issueCredential, presentCredentialsToVerifier } from './helpers';

test('presents PID and EHIC to the verifier', async ({ page, context }) => {
	await signUpNewWallet(page, context);

	await issueCredential(page, 'PID');
	await expect(page.getByRole('button', { name: 'PID', exact: true })).toBeVisible({ timeout: 20_000 });
	await issueCredential(page, 'EHIC');
	await expect(page.getByRole('button', { name: 'EHIC', exact: true })).toBeVisible({ timeout: 20_000 });

	await presentCredentialsToVerifier(page, 'PID + EHIC');
	await expect(page.getByRole('heading', { name: 'Presentation Successful' })).toBeVisible({ timeout: 20_000 });
});
