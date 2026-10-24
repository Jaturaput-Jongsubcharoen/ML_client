import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadEnv } from 'vite';

// Resolves the env files exactly as Vite does for `npm run dev` and `npm run build`.
describe('VITE_API_URL mode defaults', () => {
	let shellValue: string | undefined;

	beforeEach(() => {
		shellValue = process.env.VITE_API_URL;
		delete process.env.VITE_API_URL;
	});

	afterEach(() => {
		if (shellValue === undefined) delete process.env.VITE_API_URL;
		else process.env.VITE_API_URL = shellValue;
	});

	it('targets the local Flask backend in development', () => {
		expect(loadEnv('development', process.cwd(), 'VITE_').VITE_API_URL).toBe(
			'http://127.0.0.1:5000'
		);
	});

	it('targets the Render backend in production builds', () => {
		expect(loadEnv('production', process.cwd(), 'VITE_').VITE_API_URL).toBe(
			'https://ml-server2.onrender.com'
		);
	});

	it('lets an explicit shell or CI value override the file default', () => {
		process.env.VITE_API_URL = 'http://127.0.0.1:4184/mock-api';
		expect(loadEnv('production', process.cwd(), 'VITE_').VITE_API_URL).toBe(
			'http://127.0.0.1:4184/mock-api'
		);
	});
});
