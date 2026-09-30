import fs from 'node:fs';
import path from 'node:path';

// Load an optional e2e/.env (see .env.template) so service URLs can be set
// per-checkout without exporting shell vars. This runs before the reads below,
// and shell-provided env vars still take precedence (loadEnvFile does not
// override entries already present in process.env).
const envFile = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envFile)) {
	process.loadEnvFile(envFile);
}

// Service URLs for the environment under test. They default to the local dev
// stack and can be overridden through environment variables or e2e/.env.
// WALLET_URL also feeds playwright.config.ts's baseURL, so page.goto('/add')
// and friends follow it automatically.
export const WALLET_URL = process.env.WALLET_URL ?? 'http://localhost:3000';
export const ISSUER_URL = process.env.ISSUER_URL ?? 'http://localhost:8003';
export const WALLET_AS_URL = process.env.WALLET_AS_URL ?? 'http://localhost:6060';
export const VERIFIER_URL = process.env.VERIFIER_URL ?? 'http://localhost:8005';

// Demo credentials for the wallet-as username/password login. Other
// environments may use different values or pre-fill the login form, so these
// are only used when the fields are empty.
export const WALLET_AS_USERNAME = process.env.WALLET_AS_USERNAME ?? 'test';
export const WALLET_AS_PASSWORD = process.env.WALLET_AS_PASSWORD ?? 'test';

// Builds a page.waitForURL() predicate that matches when the page is on the
// given service. It matches the service's origin and, if the service URL
// includes a base path, requires the page to be under that path too. An optional
// pathPattern is tested against the remaining path + search — i.e. relative to
// the base path — so callers pass
// routes like /^\/interaction\// regardless of where the service is mounted.
// This is what keeps the suite portable across environments.
export function onService(serviceUrl: string, pathPattern?: RegExp): (url: URL) => boolean {
	const base = new URL(serviceUrl);
	const basePath = base.pathname.replace(/\/+$/, '');
	return (url: URL) => {
		if (url.origin !== base.origin) {
			return false;
		}
		if (basePath && url.pathname !== basePath && !url.pathname.startsWith(basePath + '/')) {
			return false;
		}
		if (!pathPattern) {
			return true;
		}
		return pathPattern.test(url.pathname.slice(basePath.length) + url.search);
	};
}
