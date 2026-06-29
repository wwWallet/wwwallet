import { test, expect } from '@playwright/test';
import { signUpNewWallet, issueCredentialFromIssuer } from './helpers';

// Same credential types as issue-credentials.spec.ts, but started from the
// issuer's own site (its "Issue" button, then "Open in wwWallet") instead of
// the wallet's /add list.

test('issues PID, PID mDoc, Diploma, EHIC, and POR all starting from the issuer', async ({ page, context }) => {
	await signUpNewWallet(page, context);

	for (const credentialName of ['PID', 'PID mDoc', 'Diploma', 'EHIC', 'POR']) {
		await issueCredentialFromIssuer(page, credentialName);
		await expect(page.getByRole('button', { name: credentialName, exact: true })).toBeVisible({ timeout: 20_000 });
	}
});
