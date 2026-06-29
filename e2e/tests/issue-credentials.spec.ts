import { test, expect } from '@playwright/test';
import { signUpNewWallet, issueCredential } from './helpers';

// Display names as shown in the /add list, from "wwWallet Issuer" specifically.

test('issues PID, PID mDoc, Diploma, EHIC, and POR all to the same account', async ({ page, context }) => {
	await signUpNewWallet(page, context);

	for (const credentialName of ['PID', 'PID mDoc', 'Diploma', 'EHIC', 'POR']) {
		await issueCredential(page, credentialName);
		await expect(page.getByRole('button', { name: credentialName, exact: true })).toBeVisible({ timeout: 20_000 });
	}
});
