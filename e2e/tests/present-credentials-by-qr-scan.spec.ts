import { test, expect } from '@playwright/test';
import { signUpNewWallet, issueCredential, presentCredentialsToVerifierByScanningQrCode } from './helpers';

test('presents credentials by scanning the verifier QR code', async ({ page, context }) => {
	await signUpNewWallet(page, context);

	for (const credentialName of ['PID', 'EHIC']) {
		await issueCredential(page, credentialName);
		await expect(page.getByRole('button', { name: credentialName, exact: true })).toBeVisible({ timeout: 20_000 });
	}

	const verifierPage = await presentCredentialsToVerifierByScanningQrCode(page, context, 'PID + EHIC');
	await expect(verifierPage.getByRole('heading', { name: 'Presentation Successful' })).toBeVisible({ timeout: 20_000 });
});
