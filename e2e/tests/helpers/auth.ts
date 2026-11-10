import type { Page, BrowserContext, CDPSession } from '@playwright/test';

// Simulates a platform passkey using Chrome DevTools Protocol's WebAuthn
// virtual authenticator, so signup can be tested without real biometrics.
// The wallet's signup flow relies on the WebAuthn PRF extension (see
// wallet-frontend/src/api/index.ts signupWebauthn), so the virtual
// authenticator must advertise `hasPrf` and CTAP 2.1 support.
export async function addPasskeyAuthenticator(client: CDPSession) {
	await client.send('WebAuthn.enable');
	const { authenticatorId } = await client.send('WebAuthn.addVirtualAuthenticator', {
		options: {
			protocol: 'ctap2',
			ctap2Version: 'ctap2_1',
			transport: 'internal',
			hasResidentKey: true,
			hasUserVerification: true,
			hasPrf: true,
			isUserVerified: true,
			automaticPresenceSimulation: true,
		},
	});
	return authenticatorId;
}

// Registers a single virtual authenticator for the page's CDP session. Split
// out from signUp() so tests that sign up more than once (e.g. a repeated
// create/delete cycle) can call this once and reuse it, rather than stacking
// up one virtual authenticator per signup.
export async function setUpPasskeyAuthenticator(
	page: Page,
	context: BrowserContext,
): Promise<{ client: CDPSession, authenticatorId: string }> {
	const client = await context.newCDPSession(page);
	const authenticatorId = await addPasskeyAuthenticator(client);
	return { client, authenticatorId };
}

// Deleting an account in the app only removes server-side data, the same as
// in real life it doesn't revoke the passkey from the device, so a reused
// authenticator accumulates one resident credential per signup. Real
// authenticators (and this virtual one) cap how many they'll store, so
// repeated create/delete cycles in one test need to clear it out between
// signups — simulating the same device getting a fresh passkey each time,
// as if the old one had been forgotten when its account was deleted.
export async function clearPasskeyCredentials(client: CDPSession, authenticatorId: string): Promise<void> {
	await client.send('WebAuthn.clearCredentials', { authenticatorId });
}

// Same idea, but simulating a different device signing up each time instead
// of the same device getting a new passkey: removes the old virtual
// authenticator entirely and registers a brand-new one.
export async function replacePasskeyAuthenticator(client: CDPSession, authenticatorId: string): Promise<string> {
	await client.send('WebAuthn.removeVirtualAuthenticator', { authenticatorId });
	return addPasskeyAuthenticator(client);
}

// Copies the WebAuthn signing credentials from one virtual authenticator to
// another. CDP does not expose the separate PRF/HMAC secret, so tests for a
// wallet that encrypts data with PRF must transfer that output independently.
// Browser storage is deliberately not copied: the second browser must restore
// the wallet from the backend in the same way a genuinely new device would.
export async function copyPasskeysToAuthenticator(
	sourceClient: CDPSession,
	sourceAuthenticatorId: string,
	targetClient: CDPSession,
	targetAuthenticatorId: string,
): Promise<void> {
	const { credentials } = await sourceClient.send('WebAuthn.getCredentials', {
		authenticatorId: sourceAuthenticatorId,
	});

	if (credentials.length === 0) {
		throw new Error('The source authenticator has no passkeys to copy');
	}

	await targetClient.send('WebAuthn.clearCredentials', {
		authenticatorId: targetAuthenticatorId,
	});

	for (const credential of credentials) {
		await targetClient.send('WebAuthn.addCredential', {
			authenticatorId: targetAuthenticatorId,
			credential,
		});
	}
}

// Captures the PRF result used when the wallet creates its passkey. Chromium's
// virtual authenticator keeps the underlying random HMAC key private, even
// when WebAuthn.getCredentials exports the rest of the credential.
export async function captureCreatedPasskeyPrfOutput(page: Page): Promise<() => Promise<number[]>> {
	await page.addInitScript(() => {
		const credentials = navigator.credentials;
		const originalCreate = credentials.create.bind(credentials);

		Object.defineProperty(credentials, 'create', {
			configurable: true,
			value: async (options: CredentialCreationOptions) => {
				const credential = await originalCreate(options);
				if (credential instanceof PublicKeyCredential) {
					const extensionResults = credential.getClientExtensionResults() as AuthenticationExtensionsClientOutputs & {
						prf?: { results?: { first?: ArrayBuffer } },
					};
					const first = extensionResults.prf?.results?.first;
					if (first) {
						(window as typeof window & { __playwrightPasskeyPrfOutput?: number[] })
							.__playwrightPasskeyPrfOutput = Array.from(new Uint8Array(first));
					}
				}
				return credential;
			},
		});
	});

	return async () => {
		const output = await page.evaluate(
			() => (window as typeof window & { __playwrightPasskeyPrfOutput?: number[] }).__playwrightPasskeyPrfOutput,
		);
		if (!output) {
			throw new Error('The passkey registration did not return a PRF output');
		}
		return output;
	};
}

// CDP can import the same signing credential into another authenticator but
// cannot import its PRF/HMAC secret. Returning the captured output here models
// the PRF continuity provided by a real passkey-sync provider.
export async function useSyncedPasskeyPrfOutput(page: Page, prfOutput: number[]): Promise<void> {
	await page.addInitScript((output) => {
		const credentials = navigator.credentials;
		const originalGet = credentials.get.bind(credentials);

		Object.defineProperty(credentials, 'get', {
			configurable: true,
			value: async (options: CredentialRequestOptions) => {
				const credential = await originalGet(options);
				if (!(credential instanceof PublicKeyCredential)) {
					return credential;
				}

				const extensionResults = credential.getClientExtensionResults();
				Object.defineProperty(credential, 'getClientExtensionResults', {
					configurable: true,
					value: () => ({
						...extensionResults,
						prf: {
							...(extensionResults as AuthenticationExtensionsClientOutputs & { prf?: object }).prf,
							results: { first: new Uint8Array(output).buffer },
						},
					}),
				});
				return credential;
			},
		});
	}, prfOutput);
}

// Signs up a brand-new wallet with a simulated passkey (registered via
// setUpPasskeyAuthenticator) and lands on the home page.
export async function signUp(page: Page, walletName: string = `Playwright Wallet ${Date.now()}`): Promise<string> {
	await page.goto('/login');
	await page.locator('#signUp-switch-loginsignup').click();

	await page.locator('input[name="name"]').fill(walletName);
	await page.getByRole('button', { name: 'Create account with a Passkey' }).click();

	await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 });

	// New accounts get a one-time welcome tour modal that would otherwise sit
	// on top of the page and intercept clicks on whatever comes next. It mounts
	// asynchronously, so wait for it rather than checking visibility immediately.
	await page.locator('#close-welcome-modal').click({ timeout: 5_000 }).catch(() => {});

	return walletName;
}

// qa intermittently raises a "Synchronize Wallet" popup when it notices the
// account's private data changed server-side (e.g. once a deferred credential
// resolves), which overlays the page and blocks the test. Auto-complete its
// passkey re-sync whenever it appears; it never shows on the local stack.
async function autoDismissSyncPopup(page: Page): Promise<void> {
	await page.addLocatorHandler(
		page.locator('#continue-login-state'),
		async (popup) => {
			await popup.click();
		},
	);
}

// Convenience wrapper for tests that only sign up once: sets up the
// authenticator and immediately signs up. Shared by every test that needs an
// authenticated session to start from.
export async function signUpNewWallet(page: Page, context: BrowserContext): Promise<string> {
	const { walletName } = await signUpNewWalletWithAuthenticator(page, context);
	return walletName;
}

export async function signUpNewWalletWithAuthenticator(page: Page, context: BrowserContext): Promise<{
	walletName: string,
	client: CDPSession,
	authenticatorId: string,
}> {
	const { client, authenticatorId } = await setUpPasskeyAuthenticator(page, context);
	// Force English so text-based selectors don't depend on the test runner's locale.
	await page.addInitScript(() => localStorage.setItem('locale', 'en'));
	await autoDismissSyncPopup(page);
	const walletName = await signUp(page);
	return { walletName, client, authenticatorId };
}

// Deletes the currently signed-in account from settings, ending back on /login.
export async function deleteAccount(page: Page): Promise<void> {
	await page.goto('/settings');

	// Account deletion lives under the "Account" tab now, so switch to it first.
	await page.locator('#settings-tab-account').click();

	// Clicking delete is gated behind a re-authentication step: it triggers another WebAuthn assertion against the same
	// passkey used to sign in, then opens the confirmation popup.
	await page.locator('#delete-account').click();
	await page.locator('#confirm-delete-popup').click();

	await page.waitForURL((url) => url.pathname.startsWith('/login'), { timeout: 20_000 });
}
