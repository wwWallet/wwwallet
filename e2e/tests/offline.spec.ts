import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { issueCredential, signUpNewWallet } from './helpers';
import { WALLET_URL } from './helpers/config';

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

	test('keeps an issued credential available across offline navigation', async ({ page, context }) => {
		await signUpNewWallet(page, context);
		await issueCredential(page, 'PID');

		const credentialCard = page.getByRole('button', { name: 'PID', exact: true });
		await expect(credentialCard).toBeVisible({ timeout: 20_000 });
		await credentialCard.click();
		await page.waitForURL(/\/credential\//, { timeout: 20_000 });
		await expect(page.getByRole('heading', { name: 'PID', exact: true })).toBeVisible();
		await waitForServiceWorkerControl(page);

		await context.setOffline(true);
		try {
			// A reload exercises the service worker's app-shell fallback for a deep route.
			await page.reload({ waitUntil: 'domcontentloaded' });
			await expect(page.getByRole('heading', { name: 'PID', exact: true })).toBeVisible();
			await expect(page.locator('#close-message-offline')).toBeVisible({ timeout: 10_000 });

			// This is a new document navigation, not just React Router state, so it also
			// proves the home app shell and IndexedDB-backed credential are available offline.
			await page.goto('/');
			await expect(page.getByRole('button', { name: 'PID', exact: true })).toBeVisible();
		} finally {
			await context.setOffline(false);
		}
	});
});
