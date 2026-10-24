# Design system

## Concept

The interface layers one full-viewport, real-time architectural city scene behind the complete page. Its opacity eases from 100% to 25% before the cockpit heading enters the reading area and reverses smoothly on scroll-up; one canvas and renderer stay mounted throughout. The reference-style city uses a six-by-six block grid with 72 mid- and high-rise buildings, a front-left waterfront landmark, and one small bridge. Toronto-inspired orthogonal streets, fine rules, matte materials, compact technical labels, and muted road-safety accents preserve the minimal brutalist direction.

## Section order

1. Full-screen interactive 3D landing (`#top`).
2. Model selection and four performance instruments (`#models`).
3. Prediction action and integrated result (`#prediction`).
4. Collision conditions (`#customize`).
5. Historical Toronto collision map (`#toronto-map`).
6. Project explanation and architecture (`#about`).

The hero CTA leads to the cockpit, not directly to the form. Model selection exists only in the cockpit; the form displays a read-only selected-model indicator.

The cockpit continues directly to prediction. Request Prediction uses the selected classifier and the current shared form values immediately; the 15 default categories are supported by the local Toronto KSI dataset, with sample coordinates 43.7, -79.4. These are illustrative inputs, not a claim that their combination reproduces one source row. The existing one-hot feature mapping and Flask request/response contract are unchanged. Customize Conditions is a neutral inverse-theme link that scrolls to the form without resetting state. Predict With These Conditions validates the edited inputs, returns focus and scroll to the prediction heading, and runs the same request handler. Invalid inputs retain field-level errors and focus instead of navigating away. Actions wrap or stack on narrow screens.

## Palette

| Token | Dark | Light | Use |
|---|---|---|---|
| Background | `#101113` | `#F3F2EE` | Page and section backgrounds |
| Surface | `#191B1E` | `#FFFFFF` | Cards and navigation |
| Raised surface | `#202327` | `#EAE9E4` | Inputs and result panels |
| Primary text | `#F1F1ED` | `#17191C` | Headings and body copy |
| Secondary text | `#92969C` | `#62676D` | Supporting information |
| Border | `#35383D` | `#D5D6D2` | Dividers and controls |
| Accent | `#C56B58` | `#A94E3D` | Selection and meaningful actions |

Values are centralized in `src/lib/styles/tokens.css`. Accent colors are reserved for the selected path, links, and important result states.

## Typography and components

The interface uses a system sans-serif stack, compact landing typography, and uppercase metadata. The landing copy occupies a small, translucent reading area above the scene rather than a two-column layout. Section headings use a localized, theme-aware fading scrim and border rule, not a large opaque card; muted text colors are adjusted for contrast in both themes. Forms, model cards, maps, dialogs, and navigation keep their own opaque surfaces. The fixed scene does not intercept pointer input; bounded pointer movement gently shifts its camera without drag, click, keyboard, or on-screen camera controls.

The cockpit keeps five selectable models and four SVG performance instruments. A wide, open SVG steering-wheel arch sits behind the dashboard; on smaller screens it is lowered beneath the metrics so labels and values stay clear. Its strokes have no fill, so the page and subdued city remain visible through the center. Exact metric data remains unchanged; visible percentages round to two decimal places while arcs use the underlying values. Native Info disclosures explain each classifier. A native modal Detail control beside every condition and coordinate label explains the field, selected value, and meaning; Escape closes the dialog and returns focus to its trigger.

The sticky navigation uses a theme-aware vertical background gradient that is opaque at its top edge and fades to transparent at its bottom.

## Responsive rules

- Fluid type uses `clamp()` and page content is constrained by a responsive max-width container.
- Forms collapse from two columns to one. Five model modes become a two-column selection grid and the four gauges become a two-by-two grid; the transparent wheel silhouette scales behind them within the same dashboard panel.
- Navigation becomes a keyboard-operable mobile menu.
- Map height follows viewport width while retaining touch-friendly controls.
- Safe-area insets are respected. Layouts support widths down to 280px; browser tests cover 280, 320, 390, 540, 768, 1024, 1440 and 1920 pixels. These are viewport simulations, not certification on every physical phone or foldable.

## Theme transition

The initial theme is selected synchronously from the saved preference or system preference in `src/app.html`, preventing a hydration flash. Explicit choices are saved in local storage. Supported browsers use the View Transitions API with a circular reveal originating at the theme button; other browsers use color transitions. Reduced-motion preferences bypass the animated reveal, and a guard prevents overlapping transitions.

## Motion and accessibility

The Three.js scene follows the user's dense skyline reference: seven streets in each direction define 36 blocks with two flat-roof towers per block, striped windows on both camera-facing facades, and pedestrian crossings. The larger CN Tower-inspired landmark stands in the open waterfront strip, outside the building grid, so no building sits in front of it in the neutral view. Road slabs are split at intersections so their top faces do not overlap; sidewalk runs and corner pads meet edge-to-edge, above the road surface. The opaque water plane adjoins the land at a separate elevation, and the single bridge has no transparent or coplanar water details. Default Three.js depth testing and depth writes remain enabled; polygon offset and global depth-test changes are not used. The illustration is not a geographically surveyed digital twin.

- Repeated buildings, roofs, windows, road markings, sidewalks, trees, signals, and vehicles reuse geometries and instanced meshes. The skyline retains one renderer with no external textures, shadows, or new dependencies. Standard fleets contain 24 vehicles at phone widths, 30 at tablet widths, and 36 on desktop. Devices reporting four or fewer CPU cores, 4 GB or less memory, or data-saving mode use 12 vehicles and fewer window bands. Fleet capacity is selected at initialization to avoid reallocating instance buffers during rotation. The six non-intersecting loops use opposing lanes on the existing ±30, ±60 and ±90 streets. Lane-specific speeds and evenly spaced slots maintain headway, including a few buses, vans and trucks. This is schematic continuous traffic, not a traffic-signal or collision simulation.
- Desktop, tablet, and mobile device-pixel-ratio ceilings are 1.25, 1.1, and 1.0; low-capability devices use 1.0 regardless of viewport. Vehicles update pooled poses and dynamic instance matrices without creating per-frame path arrays or Svelte state. One requestAnimationFrame loop caps rendering at 30 Hz, stops while the document is hidden, and freezes under reduced motion. Diagnostics update at most four times per second. Initialization time, draw calls, triangles, projected vehicle size, and average CPU render-submission time are exposed for browser measurements; CPU submission time is not GPU frame time or a physical-device FPS guarantee.
- Every screen size starts in vehicle-follow mode; there is no city-overview camera or introductory zoom. The chase rig sits behind and above the followed vehicle on an elevated diagonal (pitch about 0.56-0.68 rad, never top-down), with the vehicle low in frame so the road ahead, intersections and nearby towers stay visible. Field of view (54 to 40 degrees), boom length (40 to 34) and pitch interpolate continuously with aspect ratio rather than width breakpoints. On wide screens a projection offset shifts the vehicle right of centre, clear of the left-aligned landing copy. Resize updates projection, clipping and fog without recreating the scene; framing changes after the first frame glide rather than snap.
- Each load randomly chooses an animated vehicle, excluding the previous selection when session storage is available; if a target becomes invalid another is chosen. This visual-only preference is unrelated to model or input state. Exponential position and shortest-angle heading damping keep tracking stable through turns. Cached building and CN Tower bounds are swept along the current and 1.6-second look-ahead heading, so the boom cranes up smoothly before corners and tall obstacles (pitch speed and acceleration are capped) and never enters or looks through geometry. Tight inner-ring corners can briefly raise the view to a steeper angle.
- A mouse or pen gently swings the chase camera around the followed vehicle (about +/-7 degrees yaw, +/-6 degrees tilt) and eases back when the pointer is centred; it never switches vehicles or returns to an overview. Touch devices allow a gentle horizontal swipe on the exposed landing scene to adjust the tracking offset, hold it briefly, then ease back. Vertical gestures, pinch zoom, navigation, text and controls are not intercepted. Passive pointer listeners never prevent default scrolling, and no camera buttons are added.
- The scene remains fixed behind the entire page, follows light/dark theme changes, and is not recreated while scrolling. The canvas does not capture clicks, keyboard focus, map gestures, or scroll input. Reduced-motion mode shows a stable camera and pauses vehicle/signal animation. WebGL failure reports an accessible fallback without disabling classifiers.

Successful fatal responses trigger a single restrained 2px instrument reaction and a fading terracotta fracture pattern. Non-fatal responses trigger a sage instrument pulse, circular result wave and neutral steering. Neither is a probability or a physics simulation. Feedback lasts roughly two seconds; the classification and its response-model snapshot persist until dismissed or another request starts. Reduced-motion users see the same result without these effects.

## Map visualization

MapLibre renders a pan/zoom Toronto basemap with clustered, coarse density cells derived from the source CSV. Cell centers represent a `0.005°` aggregation grid and are not exact incident coordinates. Cells report distinct identified `ACCNUM` counts and fatal-class counts; rows without an `ACCNUM` are excluded rather than represented as separate collisions. The map legend, source attribution, and explanatory text distinguish historical records from model output. Basemap tiles are provided by OpenStreetMap and require an internet connection.
