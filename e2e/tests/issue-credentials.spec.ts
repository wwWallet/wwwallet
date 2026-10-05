import { test, expect } from '@playwright/test';
import { signUpNewWallet, issueCredential, DEFERRED_CREDENTIAL_TIMEOUT } from './helpers';

// Display names as shown in the /add list, from "wwWallet Issuer" specifically.

test('issues PID, PID mDoc, Diploma, and EHIC all to the same account', async ({ page, context }) => {
	await signUpNewWallet(page, context);

	for (const credentialName of ['PID', 'PID mDoc', 'Diploma', 'EHIC']) {
		await issueCredential(page, credentialName);
		await expect(page.getByRole('button', { name: credentialName, exact: true })).toBeVisible({ timeout: 20_000 });
	}
});

// POR is issued deferred. QA's frontend currently uses a 200-second scheduler,
// so keep it separate and allow one polling cycle plus rendering headroom.
test('issues POR to an account', async ({ page, context }) => {
	test.setTimeout(DEFERRED_CREDENTIAL_TIMEOUT + 30_000);
	await signUpNewWallet(page, context);

	await issueCredential(page, 'POR');
	await expect(page.getByRole('button', { name: 'POR', exact: true })).toBeVisible({ timeout: DEFERRED_CREDENTIAL_TIMEOUT });
});
