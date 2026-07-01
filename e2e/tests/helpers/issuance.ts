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

async function fillWalletAsLogin(page: Page): Promise<void> {
	await page.locator('#login').fill('test');
	await page.locator('#password').fill('test');
	// Some scopes (e.g. diploma, ehic, por) also offer a "Sign in with PID"
	// secondary button sharing the same class, so match on exact text instead.
	await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

async function completeWalletAsAuthorization(page: Page): Promise<void> {
	await clickContinueRedirectPopup(page);
	await fillWalletAsLogin(page);
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

// Opens a credential offer from the issuer's own catalog. The catalog offers a
// grant-type toggle that defaults to the pre-authorized code flow; these
// helpers drive the authorization code flow, so select it first. Each catalog
// entry is a single clickable card (an <a>) whose href the toggle rewires to
// the standard `/offer/:id` route; `credentialName` is the exact heading text
// on that card (e.g. "PID mDoc").
async function openIssuerAuthorizationCodeOffer(page: Page, credentialName: string): Promise<void> {
	await page.goto(ISSUER_URL);
	await page.locator('label.flow-toggle__option').filter({ hasText: 'Authorization Code' }).click();
	await page.locator('.card')
		.filter({ has: page.getByRole('heading', { name: credentialName, exact: true }) })
		.click();
	await page.waitForURL(/\/offer\//, { timeout: 20_000 });
}

// Starts issuance from the issuer's own catalog instead of the wallet's
// /add list, using the authorization code grant: open the credential's offer
// page, then click "Open in wwWallet".
export async function issueCredentialFromIssuerUsingAuthorizationCode(page: Page, credentialName: string): Promise<void> {
	await openIssuerAuthorizationCodeOffer(page, credentialName);

	await page.getByRole('link', { name: 'Open in wwWallet', exact: true }).click();

	await completeWalletAsAuthorization(page);
}

// Same starting point as issueCredentialFromIssuerUsingAuthorizationCode, but scans the offer
// page's QR code with the wallet's own scanner instead of clicking its link
// (the issuer page is opened in a separate tab so the wallet tab never
// navigates away).
export async function issueCredentialByScanningQrCode(page: Page, context: BrowserContext, credentialName: string): Promise<void> {
	const issuerPage = await context.newPage();
	await openIssuerAuthorizationCodeOffer(issuerPage, credentialName);
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

// Starts issuance from the issuer's own catalog using the pre-authorized code
// grant. Unlike the authorization code flow, the issuer drives the wallet-as
// login itself (to bind the credential to an account) and then hands the
// wallet a ready-to-redeem offer guarded by a transaction PIN: the browser
// goes issuer catalog -> wallet-as login/consent -> back to the issuer's offer
// page (showing the PIN) -> wallet, which prompts for that PIN and issues the
// credential immediately (no second wallet-as login).
export async function issueCredentialFromIssuerUsingPreAuthorizedCode(page: Page, credentialName: string): Promise<void> {
	await page.goto(ISSUER_URL);
	await page.locator('label.flow-toggle__option').filter({ hasText: 'Pre-Authorized Code' }).click();
	await page.locator('.card')
		.filter({ has: page.getByRole('heading', { name: credentialName, exact: true }) })
		.click();

	// The pre-authorized offer authenticates the account via wallet-as first,
	// then redirects back to the issuer's offer page (not the wallet).
	await page.waitForURL(/localhost:6060\/interaction\//, { timeout: 20_000 });
	await fillWalletAsLogin(page);
	await page.getByRole('button', { name: 'Authorize' }).click();
	await page.waitForURL(/localhost:8003\/callback/, { timeout: 20_000 });

	// The offer page shows the transaction PIN as "Your PIN is <code>"; the
	// wallet asks for it when the offer is opened.
	const pinText = await page.locator('.tx-code').textContent();
	const txCode = pinText?.match(/\d+/)?.[0];
	if (!txCode) {
		throw new Error('Could not read the transaction PIN from the issuer offer page');
	}

	// "Open in wwWallet" points at the wallet with the credential offer (its
	// /cb route renders Home and handles the offer). It opens in a new tab when
	// a PIN is present, so navigate the wallet page to its href directly.
	const walletOfferUrl = await page.getByRole('link', { name: 'Open in wwWallet', exact: true }).getAttribute('href');
	if (!walletOfferUrl) {
		throw new Error('Could not read the wwWallet offer link from the issuer offer page');
	}
	await page.goto(walletOfferUrl);

	await page.locator('#continue-redirect-popup').click();

	// The PIN popup renders one single-character input per digit.
	const digits = txCode.split('');
	const pinInputs = page.locator('input[autocomplete="one-time-code"]');
	for (let i = 0; i < digits.length; i++) {
		await pinInputs.nth(i).fill(digits[i]);
	}
	await page.locator('#submit-pin-input').click();
}
