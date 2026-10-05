import { test, expect } from '@playwright/test';
import { signUpNewWallet, issueCredential, issueCredentialUsingPidSignIn } from './helpers';

// wallet-as offers "Sign in with PID" as an alternative to typing the demo
// username/password, for scopes other than PID itself: instead of a
// password, the user presents a PID they already hold, handled by the
// wallet's ordinary verifier credential-selection popup.

test('issues a Diploma credential by signing in to wallet-as with an existing PID', async ({ page, context }) => {
	await signUpNewWallet(page, context);

	await issueCredential(page, 'PID');
	await expect(page.getByRole('button', { name: 'PID', exact: true })).toBeVisible({ timeout: 20_000 });

	await issueCredentialUsingPidSignIn(page, 'Diploma');
	await expect(page.getByRole('button', { name: 'Diploma', exact: true })).toBeVisible({ timeout: 20_000 });
});
