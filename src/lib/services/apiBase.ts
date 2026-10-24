/** The Flask API base URL from the build-time environment, without a trailing slash. */
export function getApiBaseUrl(): string | undefined {
	const baseUrl = import.meta.env.VITE_API_URL?.trim();
	return baseUrl ? baseUrl.replace(/\/+$/, '') : undefined;
}
