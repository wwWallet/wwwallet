import { test, expect } from '@playwright/test';
import { signUpNewWallet, issueCredentialByScanningQrCode } from './helpers';

// Cross-device-style issuance: instead of clicking a link (see
// issue-credentials-from-issuer.spec.ts), the wallet scans the QR code on the
// issuer's offer page with its own camera-based scanner.

test('issues a PID credential by scanning the issuer QR code', async ({ page, context }) => {
	await signUpNewWallet(page, context);
	await issueCredentialByScanningQrCode(page, context, 'PID');
	await expect(page.getByRole('button', { name: 'PID', exact: true })).toBeVisible({ timeout: 20_000 });
});
