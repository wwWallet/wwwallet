import type { Page } from '@playwright/test';

// Walks the wallet's DCQL credential-selection popup from its request/
// combination step through one credential step per requested type, selecting
// the first available candidate when needed, then sends the presentation.
// Used for any OpenID4VP request, whether it came from wallet-as's PID sign-in
// (see helpers/issuance.ts) or an actual verifier (see helpers/verifier.ts).
export async function selectAndSendAllRequestedCredentials(page: Page): Promise<void> {
	await page.locator('#next-select-credentials').click();
	while (!(await page.locator('#send-select-credentials').isVisible())) {
		// The DCQL popup auto-selects a credential when there is only one
		// candidate. For multi-candidate requests, select the first candidate
		// on the current credential step if nothing is selected yet.
		const candidates = page.locator('input[name^="credential-"]');
		if ((await candidates.count()) > 0 && (await page.locator('input[name^="credential-"]:checked').count()) === 0) {
			await candidates.first().click();
		}
		await page.locator('#next-select-credentials').click();
	}
	await page
		.getByRole('checkbox', {
			name: /I have reviewed this information and agree to send it to/i,
		})
		.check();
	await page.locator('#send-select-credentials').click();
}
