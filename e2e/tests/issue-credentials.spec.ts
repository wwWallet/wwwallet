import { test, expect } from '@playwright/test';
import { signUpNewWallet, issueCredential } from './helpers';

// Display names as shown in the /add list, from "wwWallet Issuer" specifically

test('issues a PID credential', async ({ page, context }) => {
	await signUpNewWallet(page, context);
	await issueCredential(page, 'PID');
	await expect(page.getByRole('button', { name: 'PID', exact: true })).toBeVisible({ timeout: 20_000 });
});

test('issues a PID mDoc credential', async ({ page, context }) => {
	await signUpNewWallet(page, context);
	await issueCredential(page, 'PID mDoc');
	await expect(page.getByRole('button', { name: 'PID mDoc', exact: true })).toBeVisible({ timeout: 20_000 });
});

test('issues a Diploma credential', async ({ page, context }) => {
	await signUpNewWallet(page, context);
	await issueCredential(page, 'Diploma');
	await expect(page.getByRole('button', { name: 'Diploma', exact: true })).toBeVisible({ timeout: 20_000 });
});

test('issues an EHIC credential', async ({ page, context }) => {
	await signUpNewWallet(page, context);
	await issueCredential(page, 'EHIC');
	await expect(page.getByRole('button', { name: 'EHIC', exact: true })).toBeVisible({ timeout: 20_000 });
});

test('issues a POR credential', async ({ page, context }) => {
	await signUpNewWallet(page, context);
	await issueCredential(page, 'POR');
	await expect(page.getByRole('button', { name: 'POR', exact: true })).toBeVisible({ timeout: 20_000 });
});
