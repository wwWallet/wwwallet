import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import {
	captureCreatedPasskeyPrfOutput,
	copyPasskeysToAuthenticator,
	issueCredential,
	setUpPasskeyAuthenticator,
	signUp,
	useSyncedPasskeyPrfOutput,
} from './helpers';
import { WALLET_URL } from './helpers/config';

function waitForPrivateDataSyncCheck(page: Page) {
	return page.waitForResponse(
		(response) =>
			response.request().method() === 'GET' && new URL(response.url()).pathname.endsWith('/user/session/private-data'),
	);
}

function countPrivateDataUpdates(page: Page): () => number {
	let updates = 0;
	page.on('request', (request) => {
		if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/user/session/private-data')) {
			updates += 1;
		}
	});
	return () => updates;
}

async function expectNoSyncPopup(page: Page): Promise<void> {
	await expect(page).not.toHaveURL((url) => url.searchParams.get('sync') === 'fail');
	await expect(page.getByText(/modified your wallet in another session/i)).not.toBeVisible();
}

async function reloadAndExpectSyncStatus(page: Page, status: 200 | 304): Promise<void> {
	const syncCheck = waitForPrivateDataSyncCheck(page);
	await page.reload();
	expect((await syncCheck).status()).toBe(status);
}

async function expectSyncPopup(page: Page): Promise<void> {
	await expect(page).toHaveURL((url) => url.searchParams.get('sync') === 'fail');
	await expect(page.getByText(/modified your wallet in another session/i)).toBeVisible();
}

async function acceptRemoteWallet(page: Page, expectedCredentials: string[]): Promise<void> {
	const getPrivateDataUpdates = countPrivateDataUpdates(page);
	await page.locator('#continue-login-state').click();
	await expectNoSyncPopup(page);
	for (const credential of expectedCredentials) {
		await expect(page.getByRole('button', { name: credential, exact: true })).toBeVisible({ timeout: 20_000 });
	}
	expect(getPrivateDataUpdates()).toBe(0);
}

type TwoBrowserWallet = {
	walletName: string;
	secondContext: BrowserContext;
	secondPage: Page;
	firstAuthenticator: Awaited<ReturnType<typeof setUpPasskeyAuthenticator>>;
	secondAuthenticator: Awaited<ReturnType<typeof setUpPasskeyAuthenticator>>;
};

async function setUpTwoBrowserWallet(
	browser: Browser,
	firstPage: Page,
	firstContext: BrowserContext,
): Promise<TwoBrowserWallet> {
	await firstPage.addInitScript(() => localStorage.setItem('locale', 'en'));
	const readPasskeyPrfOutput = await captureCreatedPasskeyPrfOutput(firstPage);
	const firstAuthenticator = await setUpPasskeyAuthenticator(firstPage, firstContext);
	const walletName = await signUp(firstPage);
	const passkeyPrfOutput = await readPasskeyPrfOutput();
	await useSyncedPasskeyPrfOutput(firstPage, passkeyPrfOutput);

	const secondContext = await browser.newContext({ baseURL: WALLET_URL });
	const secondPage = await secondContext.newPage();
	await secondPage.addInitScript(() => localStorage.setItem('locale', 'en'));
	await useSyncedPasskeyPrfOutput(secondPage, passkeyPrfOutput);
	const secondAuthenticator = await setUpPasskeyAuthenticator(secondPage, secondContext);
	await copyPasskeysToAuthenticator(
		firstAuthenticator.client,
		firstAuthenticator.authenticatorId,
		secondAuthenticator.client,
		secondAuthenticator.authenticatorId,
	);

	return { walletName, secondContext, secondPage, firstAuthenticator, secondAuthenticator };
}

async function loginSecondBrowser(secondPage: Page, walletName: string): Promise<void> {
	await secondPage.goto('/login');
	await secondPage.getByRole('button', { name: 'Sign in with a Passkey', exact: true }).click();
	await secondPage.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 });
	await expect(secondPage.locator('span[title]').filter({ hasText: walletName })).toBeVisible();
}

test.describe('one wallet in two browsers', () => {
	test.describe.configure({ timeout: 120_000 });

	test('login after a remote change adopts it without changing the ETag', async ({ browser, page, context }) => {
		const { walletName, secondContext, secondPage } = await setUpTwoBrowserWallet(browser, page, context);
		try {
			await issueCredential(page, 'PID');
			await expect(page.getByRole('button', { name: 'PID', exact: true })).toBeVisible({ timeout: 20_000 });

			const getSecondBrowserUpdates = countPrivateDataUpdates(secondPage);
			await loginSecondBrowser(secondPage, walletName);
			await expect(secondPage.getByRole('button', { name: 'PID', exact: true })).toBeVisible({ timeout: 20_000 });
			expect(getSecondBrowserUpdates()).toBe(0);

			await reloadAndExpectSyncStatus(page, 304);
			await expectNoSyncPopup(page);
			await reloadAndExpectSyncStatus(secondPage, 304);
			await expectNoSyncPopup(secondPage);
		} finally {
			await secondContext.close();
		}
	});

	test('shows the sync popup after another browser gets a PID and avoids an upload loop', async ({
		browser,
		page,
		context,
	}) => {
		const { walletName, secondContext, secondPage, firstAuthenticator, secondAuthenticator } =
			await setUpTwoBrowserWallet(browser, page, context);
		try {
			const getLoginUpdates = countPrivateDataUpdates(secondPage);
			await loginSecondBrowser(secondPage, walletName);
			expect(getLoginUpdates()).toBe(0);

			await reloadAndExpectSyncStatus(page, 304);
			await expectNoSyncPopup(page);

			await test.step('Browser 2 sees the sync popup after Browser 1 gets a PID', async () => {
				await issueCredential(page, 'PID');
				await expect(page.getByRole('button', { name: 'PID', exact: true })).toBeVisible({ timeout: 20_000 });
				await reloadAndExpectSyncStatus(secondPage, 200);
				await expectSyncPopup(secondPage);
			});

			// Browser 2 accepts the remote fast-forward without uploading it again.
			await acceptRemoteWallet(secondPage, ['PID']);
			await copyPasskeysToAuthenticator(
				secondAuthenticator.client,
				secondAuthenticator.authenticatorId,
				firstAuthenticator.client,
				firstAuthenticator.authenticatorId,
			);

			await reloadAndExpectSyncStatus(page, 304);
			await expectNoSyncPopup(page);

			// Reverse the direction: Browser 2 changes the wallet; Browser 1 accepts it.
			await issueCredential(secondPage, 'EHIC');
			await reloadAndExpectSyncStatus(page, 200);
			await expectSyncPopup(page);
			await acceptRemoteWallet(page, ['PID', 'EHIC']);

			await reloadAndExpectSyncStatus(secondPage, 304);
			await expectNoSyncPopup(secondPage);

			// Once converged, repeated checks in both browsers remain no-ops.
			await reloadAndExpectSyncStatus(page, 304);
			await expectNoSyncPopup(page);
			await reloadAndExpectSyncStatus(secondPage, 304);
			await expectNoSyncPopup(secondPage);
		} finally {
			await secondContext.close();
		}
	});
});
