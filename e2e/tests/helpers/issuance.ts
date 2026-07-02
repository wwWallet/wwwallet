import type { Page, BrowserContext } from '@playwright/test';
import { selectAndSendAllRequestedCredentials } from './presentation';
import { mockCameraWithQrCode } from './qr';
import { ISSUER_URL, WALLET_URL, WALLET_AS_URL, WALLET_AS_USERNAME, WALLET_AS_PASSWORD, onService } from './config';

async function clickContinueRedirectPopup(page: Page): Promise<void> {
	await page.locator('#continue-redirect-popup').click();
	await page.waitForURL(onService(WALLET_AS_URL, /^\/interaction\//), { timeout: 20_000 });
}

async function approveWalletAsConsent(page: Page): Promise<void> {
	await page.getByRole('button', { name: 'Authorize' }).click();
	await page.waitForURL(onService(WALLET_URL), { timeout: 20_000 });
}

async function fillWalletAsLogin(page: Page): Promise<void> {
	// Some deployments (e.g. qa) pre-fill the login form with their own demo
	// credentials, so only type ours when a field comes up empty — otherwise
	// we'd overwrite the correct autofilled values with the local dev defaults.
	const login = page.locator('#login');
	const password = page.locator('#password');
	if (!(await login.inputValue())) {
		await login.fill(WALLET_AS_USERNAME);
	}
	if (!(await password.inputValue())) {
		await password.fill(WALLET_AS_PASSWORD);
	}
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
	await page.waitForURL(onService(WALLET_URL, /^\/\?/), { timeout: 20_000 });
	await selectAndSendAllRequestedCredentials(page);

	await page.waitForURL(onService(WALLET_AS_URL, /^\/interaction\//), { timeout: 20_000 });
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

// Reaches the issuer's pre-authorized offer page for a credential and returns
// the transaction PIN it displays, or undefined when the issuer isn't
// configured to require one. Unlike the authorization code flow, the issuer
// drives the wallet-as login itself (to bind the credential to an account)
// before rendering the offer, so this fills that login/consent on the given
// page and leaves it on the offer page (which shows the QR code / wwWallet link
// and, when configured, the PIN).
async function openIssuerPreAuthorizedOffer(page: Page, credentialName: string): Promise<string | undefined> {
	await page.goto(ISSUER_URL);
	await page.locator('label.flow-toggle__option').filter({ hasText: 'Pre-Authorized Code' }).click();
	await page.locator('.card')
		.filter({ has: page.getByRole('heading', { name: credentialName, exact: true }) })
		.click();

	// The pre-authorized offer authenticates the account via wallet-as first,
	// then redirects back to the issuer's offer page (not the wallet).
	await page.waitForURL(onService(WALLET_AS_URL, /^\/interaction\//), { timeout: 20_000 });
	await fillWalletAsLogin(page);
	await page.getByRole('button', { name: 'Authorize' }).click();
	await page.waitForURL(onService(ISSUER_URL, /^\/callback/), { timeout: 20_000 });

	// The offer page shows a transaction PIN as "Your PIN is <code>" only when
	// the issuer is configured with a tx code length > 0 (as the local dev stack
	// is). Other deployments (e.g. qa) issue without a PIN, so treat it as
	// optional and let the wallet redeem the offer directly.
	const txCodeElement = page.locator('.tx-code');
	if (await txCodeElement.count() === 0) {
		return undefined;
	}
	const pinText = await txCodeElement.textContent();
	const txCode = pinText?.match(/\d+/)?.[0];
	if (!txCode) {
		throw new Error('Could not read the transaction PIN from the issuer offer page');
	}
	return txCode;
}

// Redeems a pre-authorized offer already open in the wallet: confirms the
// redirect consent, then — if the offer carried a transaction PIN — enters it
// and submits. The PIN popup renders one single-character input per digit; when
// no PIN is required the wallet issues straight after the redirect consent.
async function redeemPreAuthorizedOffer(page: Page, txCode?: string): Promise<void> {
	await page.locator('#continue-redirect-popup').click();
	if (!txCode) {
		return;
	}

	const digits = txCode.split('');
	const pinInputs = page.locator('input[autocomplete="one-time-code"]');
	for (let i = 0; i < digits.length; i++) {
		await pinInputs.nth(i).fill(digits[i]);
	}
	await page.locator('#submit-pin-input').click();
}

// Starts issuance from the issuer's own catalog using the pre-authorized code
// grant: issuer catalog -> wallet-as login/consent -> back to the issuer's
// offer page (showing the PIN) -> wallet, which prompts for that PIN and issues
// the credential immediately (no second wallet-as login).
export async function issueCredentialFromIssuerUsingPreAuthorizedCode(page: Page, credentialName: string): Promise<void> {
	const txCode = await openIssuerPreAuthorizedOffer(page, credentialName);

	// "Open in wwWallet" points at the wallet with the credential offer (its
	// /cb route renders Home and handles the offer). It opens in a new tab when
	// a PIN is present, so navigate the wallet page to its href directly.
	const walletOfferUrl = await page.getByRole('link', { name: 'Open in wwWallet', exact: true }).getAttribute('href');
	if (!walletOfferUrl) {
		throw new Error('Could not read the wwWallet offer link from the issuer offer page');
	}
	await page.goto(walletOfferUrl);

	await redeemPreAuthorizedOffer(page, txCode);
}

// Same pre-authorized code flow as issueCredentialFromIssuerUsingPreAuthorizedCode,
// but scans the offer page's QR code with the wallet's own scanner instead of
// following its link (the issuer page is opened in a separate tab so the wallet
// tab never navigates away).
export async function issueCredentialByScanningQrCodeUsingPreAuthorizedCode(page: Page, context: BrowserContext, credentialName: string): Promise<void> {
	const issuerPage = await context.newPage();
	const txCode = await openIssuerPreAuthorizedOffer(issuerPage, credentialName);
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

	await redeemPreAuthorizedOffer(page, txCode);
}
