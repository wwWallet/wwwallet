import { defineConfig, devices } from '@playwright/test';
import { WALLET_URL } from './tests/helpers/config';

export default defineConfig({
	testDir: './tests',
	timeout: 60_000,
	// These hit real shared local services (frontend, backend, issuer, AS), so
	// tests run one at a time rather than competing for the same dev servers.
	fullyParallel: false,
	workers: 1,
	reporter: 'list',
	use: {
		// The full stack (frontend + wallet-backend-server + DB) is expected to
		// already be running before these tests start; see README.md. Override
		// WALLET_URL (and the other service URLs in tests/helpers/config.ts) to
		// point the suite at another deployment.
		baseURL: WALLET_URL,
		trace: 'retain-on-failure',
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
});
