import type { Page } from '@playwright/test';

// Walks the wallet's verifier credential-selection popup from its preview
// step through one selection step per requested credential type (picking
// the first matching card each time) to the summary step, then sends the
// presentation. Used for any OpenID4VP request, whether it came from
// wallet-as's PID sign-in (see helpers/issuance.ts) or an actual verifier
// (see helpers/verifier.ts).
export async function selectAndSendAllRequestedCredentials(page: Page): Promise<void> {
	await page.locator('#next-select-credentials').click();
	while (!(await page.locator('#send-select-credentials').isVisible())) {
		await page.locator('[id^="slider-select-credentials-"]').first().click();
		await page.locator('#next-select-credentials').click();
	}
	await page.locator('#send-select-credentials').click();
}
