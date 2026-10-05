import { test, expect } from '@playwright/test';
import { signUpNewWallet, issueCredentialFromIssuerUsingPreAuthorizedCode, DEFERRED_CREDENTIAL_TIMEOUT } from './helpers';

// Same credential types as issue-credentials-from-issuer-authorization.spec.ts,
// but using the pre-authorized code grant: the issuer authenticates the account
// via wallet-as, then issues each credential against a transaction PIN entered
// in the wallet (no second wallet-as login).

test('issues PID, PID mDoc, Diploma, and EHIC all starting from the issuer using the pre-authorized code grant', async ({ page, context }) => {
	await signUpNewWallet(page, context);

	for (const credentialName of ['PID', 'PID mDoc', 'Diploma', 'EHIC']) {
		await issueCredentialFromIssuerUsingPreAuthorizedCode(page, credentialName);
		await expect(page.getByRole('button', { name: credentialName, exact: true })).toBeVisible({ timeout: 20_000 });
	}
});

// POR is issued deferred. QA's frontend currently uses a 200-second scheduler,
// so keep it separate and allow one polling cycle plus rendering headroom.
test('issues POR starting from the issuer using the pre-authorized code grant', async ({ page, context }) => {
	test.setTimeout(DEFERRED_CREDENTIAL_TIMEOUT + 30_000);
	await signUpNewWallet(page, context);

	await issueCredentialFromIssuerUsingPreAuthorizedCode(page, 'POR');
	await expect(page.getByRole('button', { name: 'POR', exact: true })).toBeVisible({ timeout: DEFERRED_CREDENTIAL_TIMEOUT });
});
