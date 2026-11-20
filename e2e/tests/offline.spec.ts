import { test, expect } from '@playwright/test';
import type { BrowserContext, Locator, Page } from '@playwright/test';
import {
	issueCredentialFromAddPage,
	presentSelectableCredentialToVerifier,
	signUpNewWallet,
} from './helpers';
import { onService, WALLET_URL } from './helpers/config';

const walletTarget = new URL(WALLET_URL);
const localHostnames = new Set(['localhost', '127.0.0.1', '::1']);
const isRemoteHttpsWallet = walletTarget.protocol === 'https:' && !localHostnames.has(walletTarget.hostname);
const remoteHttpsOnlyReason = 'offline PWA tests require WALLET_URL to use HTTPS on a non-local host';

async function waitForServiceWorkerControl(page: Page): Promise<void> {
	await expect.poll(
		() => page.evaluate(() => (
			'serviceWorker' in navigator
			&& navigator.serviceWorker.controller !== null
		)),
		{
			message: 'the wallet page should be controlled by its service worker',
			timeout: 30_000,
		},
	).toBe(true);
}

async function expectImagesLoaded(images: Locator): Promise<void> {
	await expect(images.first()).toBeVisible({ timeout: 20_000 });
	await expect.poll(
		() => images.evaluateAll((elements) => elements.every((image) => {
			const element = image as HTMLImageElement;
			return Boolean(element.getAttribute('src')) && element.complete && element.naturalWidth > 0;
		})),
		{
			message: 'the expected images should load successfully',
			timeout: 20_000,
		},
	).toBe(true);
}

async function navigateFromSidebar(
	page: Page,
	item: 'credentials' | 'add' | 'activity' | 'settings',
	path: RegExp,
): Promise<void> {
	await page.locator(`#sidebar-item-${item}`).click();
	await page.waitForURL(onService(WALLET_URL, path), { timeout: 20_000 });
}

async function reconnectAndSynchronize(
	page: Page,
	context: BrowserContext,
	stopAutoSyncPopupHandler: () => Promise<void>,
): Promise<void> {
	await stopAutoSyncPopupHandler();
	await context.setOffline(false);

	const syncAction = page.locator('#resync-notification-action');
	await expect(syncAction).toBeVisible({ timeout: 20_000 });
	await expect(page.getByText("You're back online. Would you like to resync your wallet?")).toBeVisible();
	await expect(page.locator('#close-message-offline')).not.toBeVisible();
	await syncAction.click();

	const continueSync = page.locator('#continue-login-state');
	await expect(continueSync).toBeVisible();
	await continueSync.click();

	await expect(syncAction).not.toBeVisible({ timeout: 20_000 });
	await expect.poll(
		() => new URL(page.url()).searchParams.has('sync'),
		{ timeout: 20_000 },
	).toBe(false);
}

async function signInCachedWalletOffline(page: Page, walletName: string): Promise<void> {
	await page.locator('#sidebar-item-logout').click();
	await page.waitForURL(onService(WALLET_URL, /^\/login(?:\?|$)/), { timeout: 20_000 });
	await page.reload({ waitUntil: 'domcontentloaded' });

	await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
	await expect(page.getByText('You are offline. Some features may not be available.')).toBeVisible();
	const cachedAccount = page.getByRole('button', { name: `Sign in as ${walletName}`, exact: true });
	await expect(cachedAccount).toBeVisible();
	await cachedAccount.click();
	await page.waitForURL(onService(WALLET_URL, /^\/(?:\?|$)/), { timeout: 20_000 });
}

test.describe('offline PWA usage', () => {
	test.skip(!isRemoteHttpsWallet, remoteHttpsOnlyReason);

	test('loads the cached login app shell while offline', async ({ page, context }) => {
		await page.addInitScript(() => localStorage.setItem('locale', 'en'));
		await page.goto('/login');
		await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
		await waitForServiceWorkerControl(page);

		await context.setOffline(true);
		try {
			await page.reload({ waitUntil: 'domcontentloaded' });

			await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
			await expect(page.getByText('You are offline. Some features may not be available.')).toBeVisible();
		} finally {
			await context.setOffline(false);
		}
	});

	test('restores cached wallet routes after offline login and resynchronizes on reconnect', async ({ page, context }) => {
		test.setTimeout(180_000);

		const credentialCard = page.getByRole('button', { name: 'PID', exact: true });
		const credentialImage = credentialCard.locator('img[alt="Credential"]');
		const pidOffer = page.locator('[id^="querylist-main-"]').filter({
			has: page.getByText('PID', { exact: true }),
		});

		const { walletName, stopAutoSyncPopupHandler } = await test.step('prepare and cache an active wallet', async () => {
			const walletSession = await signUpNewWallet(page, context);
			await navigateFromSidebar(page, 'add', /^\/add(?:\?|$)/);
			await issueCredentialFromAddPage(page, 'PID');

			await expect(credentialCard).toBeVisible({ timeout: 20_000 });
			await expectImagesLoaded(credentialImage);

			await presentSelectableCredentialToVerifier(page, 'PID', 'all');
			await expect(page.getByRole('heading', { name: 'Presentation Successful' })).toBeVisible({ timeout: 20_000 });

			// The verifier is a separate origin, so returning to the wallet cannot use
			// the wallet's internal navigation.
			await page.goto('/');
			await expect(credentialCard).toBeVisible({ timeout: 20_000 });
			await waitForServiceWorkerControl(page);

			return walletSession;
		});

		await context.setOffline(true);
		try {
			await test.step('reload the cached wallet while offline', async () => {
				await page.reload({ waitUntil: 'domcontentloaded' });
				await expect(credentialCard).toBeVisible({ timeout: 20_000 });
				await expect(page.locator('#close-message-offline')).toBeVisible({ timeout: 10_000 });
				await expectImagesLoaded(credentialImage);
			});

			await test.step('log out and sign back in offline', async () => {
				// Reload after logout to discard in-memory React and credential-image caches.
				await signInCachedWalletOffline(page, walletName);
				await expect(credentialCard).toBeVisible({ timeout: 20_000 });
				await expect(page.locator('#close-message-offline')).toBeVisible({ timeout: 10_000 });
				await expectImagesLoaded(credentialImage);
			});

			await test.step('reload credential details offline', async () => {
				await credentialCard.click();
				await page.waitForURL(/\/credential\//, { timeout: 20_000 });
				await expect(page.getByRole('heading', { name: 'PID', exact: true })).toBeVisible();
				await expectImagesLoaded(page.locator('#show-full-screen-credential img[alt="Credential"]'));
				await page.reload({ waitUntil: 'domcontentloaded' });
				await expect(page.getByRole('heading', { name: 'PID', exact: true })).toBeVisible();
				await expectImagesLoaded(page.locator('#show-full-screen-credential img[alt="Credential"]'));
			});

			await test.step('reload Add Credentials offline', async () => {
				await navigateFromSidebar(page, 'add', /^\/add(?:\?|$)/);
				await expect(page.getByRole('heading', { name: 'Add Credentials', exact: true })).toBeVisible();
				await expect(pidOffer).toBeVisible({ timeout: 20_000 });
				await expect(pidOffer).toBeDisabled();
				await expectImagesLoaded(pidOffer.locator('img'));
				await page.reload({ waitUntil: 'domcontentloaded' });
				await expect(page.getByRole('heading', { name: 'Add Credentials', exact: true })).toBeVisible();
				await expect(pidOffer).toBeVisible({ timeout: 20_000 });
				await expect(pidOffer).toBeDisabled();
				await expectImagesLoaded(pidOffer.locator('img'));
			});

			await test.step('reload Activity offline', async () => {
				await navigateFromSidebar(page, 'activity', /^\/activity(?:\?|$)/);
				await expect(page.getByRole('heading', { name: 'Activity', exact: true })).toBeVisible();
				await expect(page.locator('[id^="credential-activity-item-"]')).toHaveCount(1, { timeout: 20_000 });
				await page.reload({ waitUntil: 'domcontentloaded' });
				await expect(page.getByRole('heading', { name: 'Activity', exact: true })).toBeVisible();
				await expect(page.locator('[id^="credential-activity-item-"]')).toHaveCount(1, { timeout: 20_000 });
			});

			await test.step('reload settings and verify offline action guards', async () => {
				await navigateFromSidebar(page, 'settings', /^\/settings(?:\?|$)/);
				await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
				await page.reload({ waitUntil: 'domcontentloaded' });
				await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();

				await expect(page.getByRole('combobox', { name: 'Language' })).toBeEnabled();
				await expect(page.locator('#clear-cache')).toBeDisabled();

				await page.locator('#settings-tab-privacy').click();
				await expect(page.locator('select[title="You are offline. You don\'t have access here right now."]')).toBeDisabled();

				await page.locator('#settings-tab-account').click();
				await expect(page.locator('#add-passkey-trigger')).toBeDisabled();
				await expect(page.locator('#rename-passkey')).toBeDisabled();
				await expect(page.locator('#delete-account')).toBeDisabled();

				await navigateFromSidebar(page, 'activity', /^\/activity(?:\?|$)/);
				await expect(page.getByRole('heading', { name: 'Activity', exact: true })).toBeVisible();
			});

			await test.step('reconnect and synchronize the wallet', async () => {
				await reconnectAndSynchronize(page, context, stopAutoSyncPopupHandler);
				await expect(page.getByRole('heading', { name: 'Activity', exact: true })).toBeVisible();
				await expect(page.locator('[id^="credential-activity-item-"]')).toHaveCount(1);
			});

			await test.step('verify online functionality is restored', async () => {
				await navigateFromSidebar(page, 'add', /^\/add(?:\?|$)/);
				await expect(page.getByRole('heading', { name: 'Add Credentials', exact: true })).toBeVisible();
				await expect(pidOffer).toBeEnabled({ timeout: 20_000 });

				await navigateFromSidebar(page, 'credentials', /^\/(?:\?|$)/);
				await expect(credentialCard).toBeVisible({ timeout: 20_000 });
				await expectImagesLoaded(credentialImage);
			});
		} finally {
			await context.setOffline(false);
		}
	});

	test('persists an offline credential deletion through reconnect and fresh login', async ({ page, context }) => {
		test.setTimeout(180_000);

		const pidCard = page.getByRole('button', { name: 'PID', exact: true });
		const diplomaCard = page.getByRole('button', { name: 'Diploma', exact: true });

		const { walletName, stopAutoSyncPopupHandler } = await test.step('prepare a wallet with two credentials', async () => {
			const walletSession = await signUpNewWallet(page, context);
			await navigateFromSidebar(page, 'add', /^\/add(?:\?|$)/);
			await issueCredentialFromAddPage(page, 'PID');
			await expect(pidCard).toBeVisible({ timeout: 20_000 });
			await navigateFromSidebar(page, 'add', /^\/add(?:\?|$)/);
			await issueCredentialFromAddPage(page, 'Diploma');
			await expect(pidCard).toBeVisible({ timeout: 20_000 });
			await expect(diplomaCard).toBeVisible({ timeout: 20_000 });
			await waitForServiceWorkerControl(page);
			return walletSession;
		});

		await context.setOffline(true);
		try {
			await test.step('delete one credential while offline', async () => {
				await page.reload({ waitUntil: 'domcontentloaded' });
				await expect(pidCard).toBeVisible({ timeout: 20_000 });
				await expect(diplomaCard).toBeVisible({ timeout: 20_000 });

				await diplomaCard.click();
				await page.waitForURL(/\/credential\//, { timeout: 20_000 });
				await page.locator('#credential-actions-menu').click();
				await page.locator('#credential-delete-button').click();
				await page.locator('#confirm-delete-popup').click();

				await page.waitForURL(onService(WALLET_URL, /^\/(?:\?|$)/), { timeout: 20_000 });
				await expect(diplomaCard).not.toBeVisible();
				await expect(pidCard).toBeVisible();
			});

			await test.step('preserve the deletion across reload and offline login', async () => {
				await page.reload({ waitUntil: 'domcontentloaded' });
				await expect(diplomaCard).not.toBeVisible();
				await expect(pidCard).toBeVisible({ timeout: 20_000 });

				await signInCachedWalletOffline(page, walletName);
				await expect(diplomaCard).not.toBeVisible();
				await expect(pidCard).toBeVisible({ timeout: 20_000 });
			});

			await test.step('reconcile the offline deletion after reconnecting', async () => {
				await reconnectAndSynchronize(page, context, stopAutoSyncPopupHandler);
				await expect(diplomaCard).not.toBeVisible();
				await expect(pidCard).toBeVisible({ timeout: 20_000 });
			});

			await test.step('confirm the reconciled state in a fresh online session', async () => {
				await page.locator('#sidebar-item-logout').click();
				await page.waitForURL(onService(WALLET_URL, /^\/login(?:\?|$)/), { timeout: 20_000 });

				const cachedAccount = page.getByRole('button', { name: `Sign in as ${walletName}`, exact: true });
				await expect(cachedAccount).toBeVisible();
				await cachedAccount.click();
				await page.waitForURL(onService(WALLET_URL, /^\/(?:\?|$)/), { timeout: 20_000 });
				await expect(diplomaCard).not.toBeVisible();
				await expect(pidCard).toBeVisible({ timeout: 20_000 });
				await expectImagesLoaded(pidCard.locator('img[alt="Credential"]'));
			});
		} finally {
			await context.setOffline(false);
		}
	});
});
