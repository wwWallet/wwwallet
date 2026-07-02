import { test, expect } from '@playwright/test';
import { signUpNewWallet, issueCredential } from './helpers';

// Display names as shown in the /add list, from "wwWallet Issuer" specifically.

test('issues PID, PID mDoc, Diploma, and EHIC all to the same account', async ({ page, context }) => {
	await signUpNewWallet(page, context);

	for (const credentialName of ['PID', 'PID mDoc', 'Diploma', 'EHIC']) {
		await issueCredential(page, credentialName);
		await expect(page.getByRole('button', { name: credentialName, exact: true })).toBeVisible({ timeout: 20_000 });
	}
});

// POR is issued deferred: after the flow completes the wallet polls for the
// credential, which can take up to ~2 min to arrive. Separate it out and give
// the test enough total budget to cover signup + issuance + that deferred wait.
test('issues POR to an account', async ({ page, context }) => {
	test.setTimeout(180_000);
	await signUpNewWallet(page, context);

	await issueCredential(page, 'POR');
	await expect(page.getByRole('button', { name: 'POR', exact: true })).toBeVisible({ timeout: 120_000 });
});
