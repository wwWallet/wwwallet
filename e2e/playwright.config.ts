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
		// The required services must already be running; see README.md. Override
		// WALLET_URL and the other service URLs in tests/helpers/config.ts to point
		// the suite at another environment.
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
