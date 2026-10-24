# Frontend architecture

## Framework and deployment decision

The original application was a React 19 + Vite single-page interface with no router or server-rendered behavior. The migration uses SvelteKit 3, Svelte 5, and TypeScript, with the SvelteKit static adapter. The application is prerendered as a static site; prediction requests and map rendering run in the browser. This avoids introducing a frontend server while retaining the existing Flask API.

The React implementation remains available in Git history on the source branch. This branch contains the SvelteKit version. No Render settings, backend code, or model files are changed by this migration.

## Component organization

```text
src/
  app.html
  lib/
    components/
      TorontoCityScene.svelte
      ModelCockpit.svelte
      PerformanceGauge.svelte
      SteeringWheel.svelte
      PredictionWorkspace.svelte
      PredictionResult.svelte
      RoadMark.svelte
      SiteNav.svelte
      TorontoMap.svelte
    data/
      features.ts
      models.ts
    services/
      predictionApi.ts
    scene/
      city.ts
      traffic.ts
    styles/
      global.css
      tokens.css
    types.ts
  routes/
    +layout.svelte
    +page.svelte
    +page.ts
static/
  data/toronto-collision-density.json
scripts/build-map-data.py
e2e/
  experience.spec.ts
  prediction.spec.ts
  layout-map.spec.ts
playwright.config.ts
```

## Prediction data flow

1. The page owns the selected model and loading state. `ModelCockpit` changes that selection; `PredictionWorkspace` receives it as a prop and displays the same model without duplicating the selector. Selection and inputs are disabled during a request.
2. `features.ts` validates numeric coordinate ranges and converts every categorical selection into the existing one-hot `<FIELD>_<value>` keys. It preserves the legacy `Major Arterial ` category with its trailing space.
3. `predictionApi.ts` sends the original `POST /predict` contract to `VITE_API_URL`, with a 90-second timeout for a potentially cold Render service.
4. The service validates the response shape and binary label before the UI renders `Fatal (1)` or `Non-fatal (0)`. It does not synthesize probabilities. The result retains the actual response model, so selecting a different model later never relabels an old result.
5. A successful response increments a feedback sequence shared with the cockpit. Keyed result effects replay for repeated responses, while validation/network errors never trigger outcome effects. Dismissal returns keyboard focus to the request action; "Make another prediction" focuses the first input.

Expected success: `{ "model": "<model_id>", "prediction": 0 | 1 }`. Backend errors are displayed without changing the request contract. The configured live frontend previously pointed to `https://ml-server2.onrender.com/predict`; confirm the Render environment variable before redeploying.

## Model and metric source

The five supported IDs are `random_forest`, `knn`, `svm`, `neural_network`, and `logistic_regression`. The backend bundle stores a model and expected feature list. Model metrics are shown from the values hardcoded in the original frontend, which match the later result block in `ML_server1/Models_Performance.txt`. That text file contains another differing result set, so the values are explicitly presented as reported historical metrics, not live API output.

## Toronto map data flow

`scripts/build-map-data.py` reads a user-provided copy of `TOTAL_KSI_6386614326836635957.csv`. It deduplicates rows by `ACCNUM`, groups identified collision coordinates into `0.005°` cells, and writes only aggregate counts to `static/data/toronto-collision-density.json`. For the included source snapshot, the generated file contains 4,955 geolocated collision IDs, 623 with at least one `ACCLASS=Fatal` row, and 1,590 cells; 4,930 source rows lack an `ACCNUM` and are not counted as individual incidents. The map is loaded on approach to its section and does not alter or influence predictions.

The map remains separate from the artistic city. Its worker URL is explicitly imported as a Vite asset, so the worker is emitted into the static build. Cluster expansion respects reduced motion. Its dataset, generator, counts, legend and click handlers are retained.

## Real-time city architecture

`TorontoCityScene` owns the accessible HTML controls and dynamically imports `scene/city.ts` only after mount. The renderer builds a deterministic miniature using shared box geometry, instanced buildings/windows/markings/roofs, low-poly trees and grouped volumetric vehicles. No external 3D models, textures, branded assets, tile data or remote rendering services are needed for the landing.

`traffic.ts` provides a constant-speed rounded-rectangle route with tangent turns. Unit tests verify closure, finite bounds and direction continuity. Vehicles and signals are illustrative, independent of the classifier and historical collision data.

The renderer exposes only lifecycle and interaction methods to Svelte: theme, motion preference, pause, viewpoint, rotation, pan, follow vehicle and disposal. Raycasting handles building, road, vehicle and intersection selection. Camera interpolation is bounded; explicit controls work without hovering.

Performance boundaries:
- 30fps maximum autonomous rendering; no animation loop offscreen, in hidden tabs, or with reduced motion.
- Mobile startup uses fewer buildings/vehicles and no shadow maps.
- Device pixel ratio capped at 1.25 on mobile and 1.75 otherwise.
- Shared/instanced geometry, one hemisphere light and one shadow-casting directional light; no post-processing.
- Resize/visibility observers, event listeners, animation frames, instanced meshes, geometry, materials and renderer are disposed on unmount.
- WebGL initialization/context-loss errors are logged and surfaced; the rest of the page remains functional.

The stylized grid, shoreline and observation spire are Toronto-inspired, not verified architectural footprints or an exact geospatial model.

## Validation boundaries

Vitest verifies original feature mappings, every model ID/metric, response contracts and aggregate integrity. Playwright runs the production build and browser UI with controlled API responses for fatal/non-fatal/error/loading paths. It also exercises real WebGL, touch controls, WebGL failure, reduced motion, theme persistence, eight viewport sizes, the bundled historical dataset and the MapLibre worker. Basemap tiles are stubbed in the deterministic map test; production uses OpenStreetMap as before. No live Flask prediction is sent by automated tests.

## Deployment architecture

The production build is a static site in `build/`, served directly by a Render Static Site or by the included Nginx container. Set `VITE_API_URL` at build time to the existing Flask deployment. SvelteKit does not introduce a server-side API, proxy, or data store. The exact live Render service settings were not available in this repository and must be checked in the Render dashboard before changing the deployment.
