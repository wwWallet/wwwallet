import { test, expect } from '@playwright/test';
import { signUpNewWallet, issueCredentialFromIssuerUsingPreAuthorizedCode } from './helpers';

// Same credential types as issue-credentials-from-issuer-authorization.spec.ts,
// but using the pre-authorized code grant: the issuer authenticates the account
// via wallet-as, then issues each credential against a transaction PIN entered
// in the wallet (no second wallet-as login).

test('issues PID, PID mDoc, Diploma, EHIC, and POR all starting from the issuer using the pre-authorized code grant', async ({ page, context }) => {
	await signUpNewWallet(page, context);

	for (const credentialName of ['PID', 'PID mDoc', 'Diploma', 'EHIC', 'POR']) {
		await issueCredentialFromIssuerUsingPreAuthorizedCode(page, credentialName);
		await expect(page.getByRole('button', { name: credentialName, exact: true })).toBeVisible({ timeout: 20_000 });
	}
});
