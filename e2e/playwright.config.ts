import { defineConfig, devices } from '@playwright/test';

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
		// already be running before these tests start; see README.md.
		baseURL: 'http://localhost:3000',
		trace: 'retain-on-failure',
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
});
