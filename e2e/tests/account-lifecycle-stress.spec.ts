import { test, expect } from '@playwright/test';
import { setUpPasskeyAuthenticator, clearPasskeyCredentials, signUp, issueCredential, deleteAccount } from './helpers';

const CYCLES = 20;
const CREDENTIALS = ['PID', 'PID mDoc'];
const WALLET_NAME = 'test Wallet';

test('repeatedly creates an account, issues every credential, and deletes it', async ({ page, context }) => {
	// Long-running (15-20+ min), so it's skipped by default rather than
	// slowing down every normal test run. Run it explicitly with:
	//   RUN_STRESS_TESTS=1 npx playwright test tests/account-lifecycle-stress.spec.ts
	test.skip(!process.env.RUN_STRESS_TESTS, 'stress test - run explicitly with RUN_STRESS_TESTS=1');
	test.setTimeout(CYCLES * 60_000);

	const { client, authenticatorId } = await setUpPasskeyAuthenticator(page, context);
	await page.addInitScript(() => localStorage.setItem('locale', 'en'));

	for (let i = 1; i <= CYCLES; i++) {
		await test.step(`cycle ${i}/${CYCLES}`, async () => {
			await signUp(page, WALLET_NAME);

			for (const credentialName of CREDENTIALS) {
				await issueCredential(page, credentialName);
				await expect(page.getByRole('button', { name: credentialName, exact: true })).toBeVisible({ timeout: 20_000 });
			}

			await deleteAccount(page);
			// Same device, fresh passkey each cycle: forget the old credential
			// rather than letting it pile up on the (still same) authenticator.
			await clearPasskeyCredentials(client, authenticatorId);
		});
	}
});
