import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './tests',
	timeout: 30_000,
	fullyParallel: true,
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
