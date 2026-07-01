import { test, expect } from '@playwright/test';
import { signUpNewWallet, issueCredentialFromIssuerUsingPreAuthorizedCode } from './helpers';

// Counterpart to issue-credentials-from-issuer-authorization.spec.ts, but using
// the pre-authorized code grant: the issuer authenticates the account via
// wallet-as, then issues the credential against a transaction PIN entered in
// the wallet (no second wallet-as login).

test('issues a PID credential starting from the issuer using the pre-authorized code grant', async ({ page, context }) => {
	await signUpNewWallet(page, context);

	await issueCredentialFromIssuerUsingPreAuthorizedCode(page, 'PID');
	await expect(page.getByRole('button', { name: 'PID', exact: true })).toBeVisible({ timeout: 20_000 });
});
