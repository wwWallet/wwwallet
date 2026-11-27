import { test, expect, type Page } from '@playwright/test';
import { signUpNewWallet } from './helpers';
import { mockBlankCameras, countCameraRequests, cameraTracks, mockCameraWithQrCode } from './helpers/qr';

// How the QR scanner handles the camera across tab switches. Closing it must
// release the camera for good: a scanner that is never destroyed keeps
// listening for visibilitychange, and when the tab comes back into view it asks
// for the camera again on its own, after the popup is gone. Setting up the
// cameras must not hang when one of them fails to open, and a failed permission
// check must show its message instead of a spinner.

// Switching tabs doesn't reliably fire visibilitychange in headless Chromium,
// so the tests fake the tab being hidden and shown again.
async function setTabHidden(page: Page, hidden: boolean): Promise<void> {
	await page.evaluate((hidden) => {
		Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
		Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (hidden ? 'hidden' : 'visible') });
		document.dispatchEvent(new Event('visibilitychange'));
	}, hidden);
}

// A scanner lets go of its stream 300 ms after the tab is hidden, and only
// then does showing the tab again make it ask for a new one.
async function hideAndShowTab(page: Page): Promise<void> {
	await setTabHidden(page, true);
	await page.waitForTimeout(1_000);
	await setTabHidden(page, false);
	await page.waitForTimeout(1_000);
}

async function tapQrButton(page: Page): Promise<void> {
	// The QR scanner is only reachable from the mobile bottom nav.
	await page.setViewportSize({ width: 390, height: 844 });
	await page.locator('#bottom-nav-item-qr').click();
}

async function openScanner(page: Page): Promise<void> {
	await tapQrButton(page);
	// The scanner shows its scan region once it is reading frames.
	await expect(page.locator('.scan-region-highlight')).toBeVisible({ timeout: 10_000 });
	await expect.poll(async () => (await cameraTracks(page)).filter((track) => track.readyState === 'live')).toHaveLength(1);
}

async function closeScanner(page: Page): Promise<void> {
	await page.locator('#close-qr-code-scanner-mobile').click();
	await expect(page.locator('#close-qr-code-scanner-mobile')).toBeHidden();
	await expect.poll(async () => (await cameraTracks(page)).filter((track) => track.readyState === 'live')).toHaveLength(0);
}

test('closing the QR scanner releases the camera after the tab is hidden and shown', async ({ page, context }) => {
	await signUpNewWallet(page, context);
	await mockBlankCameras(page);
	await openScanner(page);

	await closeScanner(page);
	const requestsAfterClose = await countCameraRequests(page);
	await hideAndShowTab(page);

	expect(await countCameraRequests(page)).toBe(requestsAfterClose);
});

test('closing the QR scanner after switching cameras releases both cameras', async ({ page, context }) => {
	await signUpNewWallet(page, context);
	await mockBlankCameras(page, ['environment', 'user']);
	await openScanner(page);

	const previousTracks = (await cameraTracks(page)).filter((track) => track.readyState === 'live');
	expect(previousTracks).toHaveLength(1);
	await page.locator('#switch-camera-qr-code-scanner').click();
	await expect.poll(async () => {
		const tracks = await cameraTracks(page);
		const live = tracks.filter((track) => track.readyState === 'live');
		return live.length === 1 && live[0].deviceId !== previousTracks[0].deviceId
			&& tracks.filter((track) => previousTracks.some((previous) => previous.id === track.id)).every((track) => track.readyState === 'ended');
	}).toBe(true);
	// Each scanner adds its own scan region, so the newest one belongs to the
	// scanner on the camera switched to.
	await expect(page.locator('.scan-region-highlight').last()).toBeVisible({ timeout: 10_000 });

	await closeScanner(page);
	const requestsAfterClose = await countCameraRequests(page);
	await hideAndShowTab(page);

	expect(await countCameraRequests(page)).toBe(requestsAfterClose);
});

test('a camera that fails to open during setup is skipped instead of leaving the popup on a spinner', async ({ page, context }) => {
	await signUpNewWallet(page, context);
	// The front camera refuses to open, as when another app holds it.
	await mockBlankCameras(page, ['environment', 'user'], { failing: ['user'] });
	await openScanner(page);

	// Only the camera that works is offered.
	await expect(page.locator('#switch-camera-qr-code-scanner')).toHaveCount(0);
});

test('a failed camera permission check shows its message and the popup can be closed', async ({ page, context }) => {
	await signUpNewWallet(page, context);
	// The only camera refuses to open, so the permission check fails.
	await mockBlankCameras(page, ['environment'], { failing: ['environment'] });
	await tapQrButton(page);

	await expect(page.getByText('Please allow camera permission to use the QR scanner.')).toBeVisible({ timeout: 5_000 });
	await page.locator('#close-qr-code-scanner-perm').click();
	await expect(page.locator('#close-qr-code-scanner-perm')).toBeHidden();
});

test('one valid scan sends one redirect even when navigation is slow', async ({ page, context }) => {
	await signUpNewWallet(page, context);
	await mockCameraWithQrCode(page, 'openid-credential-offer://?credential_offer_uri=https://example.com/offer?token=abc');
	let redirects = 0;
	await page.route('**/cb?**', async route => {
		redirects++;
		expect(route.request().url()).toContain('offer?token=abc&wwwallet_camera_was_used=true');
		await new Promise(resolve => setTimeout(resolve, 1500));
		await route.fulfill({ contentType: 'text/html', body: '<p>Callback received</p>' });
	});
	await tapQrButton(page);
	await expect(page.getByText('Callback received')).toBeVisible({ timeout: 10000 });
	expect(redirects).toBe(1);
});
