import { test, expect } from '@playwright/test';
import { signUpNewWallet, issueCredentialFromIssuerUsingAuthorizationCode, DEFERRED_CREDENTIAL_TIMEOUT } from './helpers';

// Same credential types as issue-credentials.spec.ts, but started from the
// issuer's own catalog (select the Authorization Code flow, open the offer,
// then follow the wwWallet link) instead of the wallet's /add list.

test('issues PID, PID mDoc, Diploma, and EHIC all starting from the issuer using the authorization code grant', async ({ page, context }) => {
	await signUpNewWallet(page, context);

	for (const credentialName of ['PID', 'PID mDoc', 'Diploma', 'EHIC']) {
		await issueCredentialFromIssuerUsingAuthorizationCode(page, credentialName);
		await expect(page.getByRole('button', { name: credentialName, exact: true })).toBeVisible({ timeout: 20_000 });
	}
});

// POR is issued deferred. QA's frontend currently uses a 200-second scheduler,
// so keep it separate and allow one polling cycle plus rendering headroom.
test('issues POR starting from the issuer using the authorization code grant', async ({ page, context }) => {
	test.setTimeout(DEFERRED_CREDENTIAL_TIMEOUT + 30_000);
	await signUpNewWallet(page, context);

	await issueCredentialFromIssuerUsingAuthorizationCode(page, 'POR');
	await expect(page.getByRole('button', { name: 'POR', exact: true })).toBeVisible({ timeout: DEFERRED_CREDENTIAL_TIMEOUT });
});
