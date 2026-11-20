import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { signUpNewWallet, issueCredential, presentCustomCredentialsToVerifier } from './helpers';

function loadQuery(name: string) {
	return JSON.parse(fs.readFileSync(path.resolve(__dirname, `../fixtures/${name}`), 'utf8'));
}

test('presents credentials for complex combined DCQL queries', async ({ page, context }) => {
	await signUpNewWallet(page, context);

	for (const credentialName of ['PID', 'PID mDoc', 'EHIC']) {
		await issueCredential(page, credentialName);
		await expect(page.getByRole('button', { name: credentialName, exact: true })).toBeVisible({ timeout: 20_000 });
	}

	// Issue two Diplomas so query2 exercises a descriptor with multiple: true.
	for (let i = 0; i < 2; i++) {
		await issueCredential(page, 'Diploma');
		await expect(page.getByRole('button', { name: 'Diploma', exact: true }).last()).toBeVisible({ timeout: 20_000 });
	}
	await expect(page.getByRole('button', { name: 'Diploma', exact: true })).toHaveCount(2, { timeout: 20_000 });

	await presentCustomCredentialsToVerifier(page, loadQuery('complex-query1.json'), {
		selectOptionalCredentialNames: ['EHIC'],
	});
	await expect(page.getByRole('heading', { name: 'Presentation Successful' })).toBeVisible({ timeout: 20_000 });

	await presentCustomCredentialsToVerifier(page, loadQuery('complex-query2.json'), {
		selectAllMultiple: true,
	});
	await expect(page.getByRole('heading', { name: 'Presentation Successful' })).toBeVisible({ timeout: 20_000 });
});
