import { test, expect } from '@playwright/test';
import {
	signUpNewWallet,
	issueCredential,
	presentCredentialsToVerifier,
	presentSelectableCredentialToVerifier,
} from './helpers';

// Standard definitions that use immediately issued credentials. Deferred POR
// issuance is covered separately; QES/QC and custom DCQL need additional setup.
test('presents standard verifier definitions using immediately issued credentials', async ({ page, context }) => {
	await signUpNewWallet(page, context);

	for (const credentialName of ['PID', 'EHIC', 'Diploma']) {
		await issueCredential(page, credentialName);
		await expect(page.getByRole('button', { name: credentialName, exact: true })).toBeVisible({ timeout: 20_000 });
	}

	for (const definitionTitle of ['PID + EHIC', 'PID + Diploma']) {
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
