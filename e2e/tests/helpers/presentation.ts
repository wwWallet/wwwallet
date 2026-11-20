import type { Page } from '@playwright/test';

// Walks the wallet's DCQL credential-selection popup from its request/
// combination step through one credential step per requested type, selecting
// the first available candidate when needed, then sends the presentation.
// Used for any OpenID4VP request, whether it came from wallet-as's PID sign-in
// (see helpers/issuance.ts) or an actual verifier (see helpers/verifier.ts).
export interface PresentationSelectionOptions {
	selectOptionalCredentialNames?: string[];
	selectAllMultiple?: boolean;
}

export async function selectAndSendAllRequestedCredentials(
	page: Page,
	options: PresentationSelectionOptions = {},
): Promise<void> {
	for (const credentialName of options.selectOptionalCredentialNames ?? []) {
		await page
			.locator('label')
			.filter({ hasText: credentialName })
			.locator('input[type="checkbox"]')
			.check();
	}
	await page.locator('#next-select-credentials').click();
	while (!(await page.locator('#send-select-credentials').isVisible())) {
		// The DCQL popup auto-selects a credential when there is only one
		// candidate. For multi-candidate requests, select the first candidate
		// on the current credential step if nothing is selected yet.
		const candidates = page.locator('input[name^="credential-"]');
		const selectAll = page.getByRole('button', { name: /select all/i }).first();
		if (options.selectAllMultiple && (await candidates.count()) > 1) {
			await selectAll.waitFor({ state: 'visible', timeout: 10_000 });
			await selectAll.click({ force: true });
			await page.waitForFunction(() => {
				const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[name^="credential-"]'));
				return inputs.length > 1 && inputs.every((input) => input.checked);
			});
		} else if (
			(await candidates.count()) > 0 &&
			(await page.locator('input[name^="credential-"]:checked').count()) === 0
		) {
			await candidates.first().click({ force: true });
			await page.waitForFunction(() => {
				return document.querySelector<HTMLInputElement>('input[name^="credential-"]:checked') !== null;
			});
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
