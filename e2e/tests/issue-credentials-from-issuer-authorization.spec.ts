import { test, expect } from '@playwright/test';
import { signUpNewWallet, issueCredentialFromIssuerUsingAuthorizationCode } from './helpers';

// Same credential types as issue-credentials.spec.ts, but started from the
// issuer's own catalog (select the Authorization Code flow, open the offer,
// then "Open in wwWallet") instead of the wallet's /add list.

test('issues PID, PID mDoc, Diploma, and EHIC all starting from the issuer using the authorization code grant', async ({ page, context }) => {
	await signUpNewWallet(page, context);

	for (const credentialName of ['PID', 'PID mDoc', 'Diploma', 'EHIC']) {
		await issueCredentialFromIssuerUsingAuthorizationCode(page, credentialName);
		await expect(page.getByRole('button', { name: credentialName, exact: true })).toBeVisible({ timeout: 20_000 });
	}
});

// POR is issued deferred: after the flow completes the wallet polls for the
// credential, which can take up to ~2 min to arrive. Separate it out and give
// the test enough total budget to cover signup + issuance + that deferred wait.
test('issues POR starting from the issuer using the authorization code grant', async ({ page, context }) => {
	test.setTimeout(180_000);
	await signUpNewWallet(page, context);

	await issueCredentialFromIssuerUsingAuthorizationCode(page, 'POR');
	await expect(page.getByRole('button', { name: 'POR', exact: true })).toBeVisible({ timeout: 120_000 });
});
