import type { Page } from '@playwright/test';
import { selectAndSendAllRequestedCredentials } from './presentation';

// wallet-verifier's own site, separate from both the wallet-frontend app and
// wallet-issuer.
const VERIFIER_URL = 'http://localhost:8005';

// Shared tail of every wallet-verifier presentation, once its request page
// (with the "Open with wwWallet" button) is showing: ends on the verifier's
// own "Presentation Successful" result page.
async function openInWwalletAndSendPresentation(page: Page): Promise<void> {
	await page.getByRole('button', { name: 'Open with wwWallet', exact: true }).click();
	await page.waitForURL(/localhost:3000\/cb\?/, { timeout: 20_000 });

	await selectAndSendAllRequestedCredentials(page);
	await page.waitForURL(/localhost:8005\/verifier\/callback/, { timeout: 20_000 });
}

// Presents credentials to wallet-verifier: pick a definition card from its
// catalog (e.g. "PID + EHIC"), then send whatever it asks for. The account
// needs to already hold whatever credential types the chosen definition
// requests.
export async function presentCredentialsToVerifier(page: Page, definitionTitle: string): Promise<void> {
	await page.goto(`${VERIFIER_URL}/verifier/public/definitions`);
	await page.locator('a.def-card').filter({ has: page.getByText(definitionTitle, { exact: true }) }).click();
	await page.waitForURL(/\/presentation-request\//, { timeout: 20_000 });
	await openInWwalletAndSendPresentation(page);
}

// Same as presentCredentialsToVerifier, but for a "_selectable: true"
// definition (PID, Bachelor Diploma, EHIC), which routes through an extra
// claim-picking step first. `fields` chooses between requesting every
// offered claim or just the first one. The checkboxes are styled with a
// custom overlay that blocks plain clicks, hence `force: true`.
export async function presentSelectableCredentialToVerifier(page: Page, definitionTitle: string, fields: 'all' | 'one'): Promise<void> {
	await page.goto(`${VERIFIER_URL}/verifier/public/definitions`);
	await page.locator('a.def-card').filter({ has: page.getByText(definitionTitle, { exact: true }) }).click();
	await page.waitForURL(/\/request-credentials\//, { timeout: 20_000 });

	if (fields === 'all') {
		await page.locator('#select-all-attributes').check({ force: true });
	} else {
		await page.locator('input[name="attributes[]"]').first().check({ force: true });
	}
	await page.getByRole('button', { name: 'Request Credentials', exact: true }).click();

	await page.waitForURL(/\/presentation-request\//, { timeout: 20_000 });
	await openInWwalletAndSendPresentation(page);
}
