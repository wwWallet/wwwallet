import type { Page, BrowserContext } from '@playwright/test';
import { selectAndSendAllRequestedCredentials } from './presentation';
import { mockCameraWithQrCode } from './qr';

async function clickContinueRedirectPopup(page: Page): Promise<void> {
	await page.locator('#continue-redirect-popup').click();
	await page.waitForURL(/localhost:6060\/interaction\//, { timeout: 20_000 });
}

async function approveWalletAsConsent(page: Page): Promise<void> {
	await page.getByRole('button', { name: 'Authorize' }).click();
	await page.waitForURL(/localhost:3000\//, { timeout: 20_000 });
}

async function completeWalletAsAuthorization(page: Page): Promise<void> {
	await clickContinueRedirectPopup(page);

	await page.locator('#login').fill('test');
	await page.locator('#password').fill('test');
	// Some scopes (e.g. diploma, ehic, por) also offer a "Sign in with PID"
	// secondary button sharing the same class, so match on exact text instead.
	await page.getByRole('button', { name: 'Sign in', exact: true }).click();

	await approveWalletAsConsent(page);
}

// Alternative to completeWalletAsAuthorization: logs in by presenting a PID
// the account already holds (see issueCredential(page, 'PID')) instead of
// the demo username/password. wallet-as only offers this for scopes other
// than PID itself.
async function completeWalletAsAuthorizationWithPidSignIn(page: Page): Promise<void> {
	await clickContinueRedirectPopup(page);
	await page.getByRole('button', { name: 'Sign in with PID' }).click();

	// Redirects to the wallet with an OpenID4VP request for the PID, handled
	// by the same credential-selection popup any verifier request would use.
	await page.waitForURL(/localhost:3000\/\?/, { timeout: 20_000 });
	await selectAndSendAllRequestedCredentials(page);

	await page.waitForURL(/localhost:6060\/interaction\//, { timeout: 20_000 });
	await approveWalletAsConsent(page);
}

// Drives the full OpenID4VCI authorization code flow for one credential type,
// from the /add list through wallet-as login/consent, ending back on the
// wallet's home page. `listName` is the credential's exact display name as
// shown in the /add list (e.g. "PID mDoc") — list items render an avatar
// initial and an issuer badge alongside it, so matching on exact text rather
// than the button's full (concatenated) accessible name avoids ambiguity
// between e.g. "PID" and "PID mDoc".
export async function issueCredential(page: Page, listName: string): Promise<void> {
	await page.goto('/add');
	await page.getByRole('button').filter({ has: page.getByText(listName, { exact: true }) }).click();
	await completeWalletAsAuthorization(page);
}

// Same as issueCredential, but requires a PID credential already issued and
// `listName` to be a type other than PID itself.
export async function issueCredentialUsingPidSignIn(page: Page, listName: string): Promise<void> {
	await page.goto('/add');
	await page.getByRole('button').filter({ has: page.getByText(listName, { exact: true }) }).click();
	await completeWalletAsAuthorizationWithPidSignIn(page);
}

const ISSUER_URL = 'http://localhost:8003';

// Starts issuance from the issuer's own catalog instead of the wallet's
// /add list: click "Issue" on a credential card, then "Open in wwWallet" on
// its offer page. `credentialName` is the exact heading text on that card
// (e.g. "PID mDoc").
export async function issueCredentialFromIssuer(page: Page, credentialName: string): Promise<void> {
	await page.goto(ISSUER_URL);
	await page.locator('.card')
		.filter({ has: page.getByRole('heading', { name: credentialName, exact: true }) })
		.getByRole('link', { name: 'Issue', exact: true })
		.click();
	await page.waitForURL(/\/offer\//, { timeout: 20_000 });

	await page.getByRole('link', { name: 'Open in wwWallet', exact: true }).click();

	await completeWalletAsAuthorization(page);
}

// Same starting point as issueCredentialFromIssuer, but scans the offer
// page's QR code with the wallet's own scanner instead of clicking its link
// (the issuer page is opened in a separate tab so the wallet tab never
// navigates away).
export async function issueCredentialByScanningQrCode(page: Page, context: BrowserContext, credentialName: string): Promise<void> {
	const issuerPage = await context.newPage();
	await issuerPage.goto(ISSUER_URL);
	await issuerPage.locator('.card')
		.filter({ has: issuerPage.getByRole('heading', { name: credentialName, exact: true }) })
		.getByRole('link', { name: 'Issue', exact: true })
		.click();
	await issuerPage.waitForURL(/\/offer\//, { timeout: 20_000 });
	const qrText = await issuerPage.locator('#qr').getAttribute('data-value');
	await issuerPage.close();
	if (!qrText) {
		throw new Error('Could not read the QR code value from the issuer offer page');
	}

	// The QR scanner is only reachable from the mobile bottom nav (see
	// wallet-frontend's useScreenType hook: < 480px counts as "mobile").
	await page.setViewportSize({ width: 390, height: 844 });
	await mockCameraWithQrCode(page, qrText);
	await page.locator('#bottom-nav-item-qr').click();

	await completeWalletAsAuthorization(page);
}
