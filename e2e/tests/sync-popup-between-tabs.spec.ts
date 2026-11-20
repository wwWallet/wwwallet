import { expect, test, type Page } from '@playwright/test';
import {
	captureCreatedPasskeyPrfOutput,
	copyPasskeysToAuthenticator,
	setUpPasskeyAuthenticator,
	signUp,
	useSyncedPasskeyPrfOutput,
} from './helpers';

function waitForPrivateDataSyncCheck(page: Page) {
	return page.waitForResponse(
		(response) =>
			response.request().method() === 'GET' && new URL(response.url()).pathname.endsWith('/user/session/private-data'),
	);
}

async function privateDataEtag(page: Page): Promise<string | null> {
	return page.evaluate(() => localStorage.getItem('privateDataEtag'));
}

async function expectNoSyncPopup(page: Page): Promise<void> {
	await expect(page).not.toHaveURL((url) => url.searchParams.get('sync') === 'fail');
	await expect(page.getByText(/modified your wallet in another session/i)).not.toBeVisible();
}

test.describe('wallet synchronization between tabs', () => {
	test.describe.configure({ timeout: 120_000 });

	test('preserves the ETag when a live tab is displaced', async ({ page, context }) => {
		await page.addInitScript(() => localStorage.setItem('locale', 'en'));
		const readPasskeyPrfOutput = await captureCreatedPasskeyPrfOutput(page);
		const firstAuthenticator = await setUpPasskeyAuthenticator(page, context);
		const walletName = await signUp(page);
		const passkeyPrfOutput = await readPasskeyPrfOutput();
		const etagBefore = await privateDataEtag(page);
		expect(etagBefore).not.toBeNull();

		const secondPage = await context.newPage();
		await secondPage.addInitScript(() => localStorage.setItem('locale', 'en'));
		await useSyncedPasskeyPrfOutput(secondPage, passkeyPrfOutput);
		const secondAuthenticator = await setUpPasskeyAuthenticator(secondPage, context);
		await copyPasskeysToAuthenticator(
			firstAuthenticator.client,
			firstAuthenticator.authenticatorId,
			secondAuthenticator.client,
			secondAuthenticator.authenticatorId,
		);

		await secondPage.goto('/login');
		const syncCheck = waitForPrivateDataSyncCheck(secondPage);
		await secondPage.getByRole('button', { name: `Sign in as ${walletName}` }).click();

		expect((await syncCheck).status()).toBe(304);
		await expect(page).toHaveURL(/\/login/);
		await expectNoSyncPopup(secondPage);
		expect(await privateDataEtag(secondPage)).toBe(etagBefore);
	});

	test('preserves the ETag when a different user takes ownership', async ({ page, context }) => {
		const suffix = Date.now();
		const firstWalletName = `Playwright Wallet A ${suffix}`;
		const secondWalletName = `Playwright Wallet B ${suffix}`;

		await page.addInitScript(() => localStorage.setItem('locale', 'en'));
		await setUpPasskeyAuthenticator(page, context);
		await signUp(page, firstWalletName);

		const secondPage = await context.newPage();
		await secondPage.addInitScript(() => localStorage.setItem('locale', 'en'));
		await setUpPasskeyAuthenticator(secondPage, context);
		await signUp(secondPage, secondWalletName);

		await expect(page).toHaveURL(/\/login/);
		const secondUserEtag = await privateDataEtag(secondPage);
		expect(secondUserEtag).not.toBeNull();

		await page.getByRole('button', { name: 'Other accounts' }).click();
		await page.getByRole('button', { name: `Sign in as ${firstWalletName}` }).click();

		await expect(page.locator('span[title]').filter({ hasText: firstWalletName })).toBeVisible();
		await expect(secondPage).toHaveURL(/\/login/);
		await expectNoSyncPopup(page);

		const firstUserEtag = await privateDataEtag(page);
		expect(firstUserEtag).not.toBeNull();
		expect(firstUserEtag).not.toBe(secondUserEtag);
		await expect(page.locator('span[title]').filter({ hasText: secondWalletName })).not.toBeVisible();
	});

	test('preserves the ETag when stale ownership is detected during mount', async ({ page, context }) => {
		await page.addInitScript(() => localStorage.setItem('locale', 'en'));
		const readPasskeyPrfOutput = await captureCreatedPasskeyPrfOutput(page);
		const firstAuthenticator = await setUpPasskeyAuthenticator(page, context);
		const walletName = await signUp(page);
		const passkeyPrfOutput = await readPasskeyPrfOutput();

		const secondPage = await context.newPage();
		await secondPage.addInitScript(() => localStorage.setItem('locale', 'en'));
		await useSyncedPasskeyPrfOutput(secondPage, passkeyPrfOutput);
		const secondAuthenticator = await setUpPasskeyAuthenticator(secondPage, context);
		await copyPasskeysToAuthenticator(
			firstAuthenticator.client,
			firstAuthenticator.authenticatorId,
			secondAuthenticator.client,
			secondAuthenticator.authenticatorId,
		);

		// Unmount the wallet in tab 1 so it misses tab 2's ownership-change event,
		// while its wallet-origin sessionStorage remains attached to this tab.
		await page.goto('about:blank');

		await secondPage.goto('/login');
		await secondPage.getByRole('button', { name: `Sign in as ${walletName}` }).click();
		await expect(secondPage.locator('span[title]').filter({ hasText: walletName })).toBeVisible();

		const etagBeforeReturn = await privateDataEtag(secondPage);
		expect(etagBeforeReturn).not.toBeNull();

		await page.goto('/');

		await expect(page).toHaveURL(/\/login/);
		await expectNoSyncPopup(page);
		expect(await privateDataEtag(page)).toBe(etagBeforeReturn);
	});
});
