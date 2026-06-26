import { test, expect } from '@playwright/test';
import { signUpNewWallet, issueCredential, presentCredentialsToVerifier, presentSelectableCredentialToVerifier } from './helpers';

// Every definition on wallet-verifier's catalog that doesn't need extra
// setup beyond holding the right credentials (the QES/QC transaction-data
// and custom-DCQL definitions aren't covered).

test('presents every standard verifier definition', async ({ page, context }) => {
	await signUpNewWallet(page, context);

	for (const credentialName of ['PID', 'EHIC', 'POR', 'Diploma']) {
		await issueCredential(page, credentialName);
		await expect(page.getByRole('button', { name: credentialName, exact: true })).toBeVisible({ timeout: 20_000 });
	}

	for (const definitionTitle of ['PID + EHIC', 'PID + POR', 'PID + Diploma']) {
		await presentCredentialsToVerifier(page, definitionTitle);
		await expect(page.getByRole('heading', { name: 'Presentation Successful' })).toBeVisible({ timeout: 20_000 });
	}

	for (const definitionTitle of ['PID', 'Bachelor Diploma', 'EHIC']) {
		for (const fields of ['all', 'one'] as const) {
			await presentSelectableCredentialToVerifier(page, definitionTitle, fields);
			await expect(page.getByRole('heading', { name: 'Presentation Successful' })).toBeVisible({ timeout: 20_000 });
		}
	}
});
