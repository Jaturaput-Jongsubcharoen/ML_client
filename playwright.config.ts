import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './e2e',
	fullyParallel: false,
	workers: 1,
	timeout: 45_000,
	expect: { timeout: 10_000 },
	reporter: 'list',
	use: {
		...devices['Desktop Chrome'],
		channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
		baseURL: 'http://127.0.0.1:4184',
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure'
	},
	webServer: {
		command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4184 --strictPort',
		url: 'http://127.0.0.1:4184',
		reuseExistingServer: false,
		timeout: 120_000,
		env: { VITE_API_URL: 'http://127.0.0.1:4184/mock-api' }
	}
});
