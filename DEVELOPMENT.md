# Development and deployment

## Requirements

- Node.js 24.x and npm
- Python 3 only when regenerating the aggregated Toronto map data
- WebGL2-capable browser for the interactive city (a fallback preserves classification when unavailable)

## Install and run locally

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

`VITE_API_URL` is the public base URL of the existing Flask API, without `/predict`. The example points to the backend URL found in the currently deployed frontend bundle. No secret belongs in this frontend variable.

## Validation and production build

```powershell
npm run check
npm run lint
npx playwright install chromium
npm test
npm run build
npm run preview
```

The production output is the prerendered static site in `build/`. API requests remain client-side and use the build-time value of `VITE_API_URL`.

`npm test` runs both `test:unit` (Vitest) and `test:e2e` (Playwright). Browser tests build and start their own production preview on **127.0.0.1:4184**, with a mock-only API URL and per-test request interception. Keep that port free. They never submit predictions to the deployed Flask service. The test server is owned and stopped by Playwright. If a preview is already running while you rebuild manually, restart that preview to refresh its asset manifest.

To use an already installed Chrome rather than downloading Chromium on Windows:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'chrome'
npm.cmd test
Remove-Item Env:PLAYWRIGHT_CHANNEL
```

Use `npm.cmd`/`npx.cmd` where PowerShell policy blocks the corresponding scripts. Test output is ignored under `test-results/`; failures retain a screenshot and trace. Browser tests cover all five model selections, exact displayed metrics, payload compatibility, result snapshots, repeated results, loading/errors/retry, theme persistence, reduced motion, WebGL fallback, responsive layouts, touch input and the historical map worker/zoom.

The E2E build embeds a local mock API URL. **Run `npm run build` again with your deployment's real `VITE_API_URL` before using the output for anything other than tests.** CI does this in its final production-build step.

## City and cockpit development

The city implementation is in `src/lib/scene/city.ts`, with the pure traffic-path math in `traffic.ts`. Its Svelte wrapper dynamically imports the renderer; no Three.js code is run during prerendering. All assets are procedural and local.

Landscape uses the CN Tower overview with cursor-driven tilt and edge orbit. Portrait layouts start with a randomly selected moving vehicle framed below the landing text. Gentle horizontal swipes on the exposed landing scene adjust its follow offset temporarily; vertical scrolling and pinch zoom remain native. There are no camera buttons. Reduced-motion mode freezes traffic and camera movement, and hidden tabs stop the render loop. Geometry, traffic poses, dynamic instance buffers and device capability budgets live in `src/lib/scene/`; `vehicleCamera.ts` owns responsive framing and obstacle clearance.

The cockpit keeps model state in the page, not inside the form. Metrics remain in `src/lib/data/models.ts`; do not replace them with probabilities or a different report run. Result animations must start only after a valid API response, respect reduced motion, and leave the result visible.

## Map data

The repository includes a compact aggregate at `static/data/toronto-collision-density.json`, generated from the Toronto KSI CSV in the companion `ML_server1` project. To regenerate it, provide a local CSV path:

```powershell
python scripts/build-map-data.py ..\ML_server1\TOTAL_KSI_6386614326836635957.csv
```

The script uses only the Python standard library. It deduplicates records by `ACCNUM`, groups identified locations into `0.005°` cells, and excludes records without an accident number. It does not copy raw collision records into the frontend. Review the generated metadata and aggregate totals before committing an update.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `VITE_API_URL` | Yes for prediction | Flask backend base URL; set for local and production builds. |

The frontend contains no credentials. `.env` files are ignored by Git; `.env.example` contains the public backend URL only.

## Render Static Site

For a Render **Static Site** deployment, use:

- Build command: `npm ci && npm run build`
- Publish directory: `build`
- Build environment variable: `VITE_API_URL=https://ml-server2.onrender.com`

The live service's current Render dashboard configuration was not available from this repository. Confirm the service type, branch, build command, publish path, and existing API environment variable before changing settings. This implementation does not modify Render or trigger a deployment.

## Docker

Build and run the Nginx static container:

```powershell
docker build --build-arg VITE_API_URL=https://ml-server2.onrender.com -t collision-fatality-frontend .
docker run --rm -p 8080:8080 collision-fatality-frontend
```

Open `http://localhost:8080`. The Docker build embeds the public API URL into the static JavaScript. The container serves only the frontend; the Flask backend remains a separate service.

## CI

`.github/workflows/validate.yml` runs dependency installation, Svelte/TypeScript checks, ESLint, unit tests, and a production build on pushes and pull requests targeting `main`. It does not deploy. No deployment credentials are needed.

It also installs Playwright Chromium and runs the production-browser suite through `npm test`. The final build uses the existing ML_server2 URL, not the E2E mock URL. Docker remains frontend-only. Nginx explicitly serves emitted `.mjs` workers as JavaScript.

## Validation limitations

Local verification uses installed Chrome and simulated desktop/tablet/mobile widths, not physical iOS/Safari or foldable hardware. API success/error scenarios use mocked HTTP responses; deployed Flask/model health is not established by those tests. Docker image verification requires the Docker Desktop Linux daemon, which was unavailable during this redesign. WebGL libraries produce large lazy-loaded chunks; the build warning is retained rather than hidden.
