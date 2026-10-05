import { test, expect } from '@playwright/test';
import { signUpNewWallet, issueCredentialByScanningQrCodeUsingPreAuthorizedCode } from './helpers';

// Cross-device-style pre-authorized issuance: the issuer authenticates the
// account via wallet-as and renders an offer page with a QR code and a
// transaction PIN; the wallet scans that QR with its own camera-based scanner
// (see issue-credential-by-qr-scan.spec.ts) and redeems it with the PIN.

test('issues a PID credential by scanning the issuer QR code using the pre-authorized code grant', async ({ page, context }) => {
	await signUpNewWallet(page, context);
	await issueCredentialByScanningQrCodeUsingPreAuthorizedCode(page, context, 'PID');
	await expect(page.getByRole('button', { name: 'PID', exact: true })).toBeVisible({ timeout: 20_000 });
});
