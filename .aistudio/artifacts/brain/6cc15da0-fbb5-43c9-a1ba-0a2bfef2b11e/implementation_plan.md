# Implementation Plan: True UI Style Layouts, SVG Liquid Glass Refraction, and Subtractive Design

We will transform GlassiumOS into an authentic multi-paradigm OS experience where switching UI styles fundamentally changes the desktop shell layout (macOS Menu/Dock, One UI Reachability, Material 3 Nav Rail, MIUI Alive), applies physical SVG displacement refraction ripples, enforces strict design subtraction (minimal clutter, clock positioning, temperature-only weather), delivers stylish Web Audio system soundscapes, and completely fixes the web browser.

---

## 1. User Review Required & Critical Design Decisions

> [!IMPORTANT]
> **Key Architecture Decisions Based on User Preferences:**
> - **Full Shell Layout Adaptation**: Switching UI style (`macOS`, `One UI`, `MIUI`, `Material 3`, `The AI`, etc.) will actively switch the structural shell layout of the entire desktop (e.g. macOS gets top global menu bar + bottom magnification Dock + top-left traffic lights; One UI splits into top viewing area and bottom thumb interaction zone; Material 3 introduces left navigation rail / tonal FAB; Glassium maintains pure Zero Border Line floating glass).
> - **Dynamic SVG Liquid Glass Distortion**: A global SVG `<filter id="liquid-refraction">` utilizing `<feTurbulence>`, `<feDisplacementMap>`, and dynamic mouse/drag motion parameters will refract and dynamically distort windows and glass panels.
> - **Design Subtraction ("デザインの引き算")**: All redundant labels, static pill capsules, secondary status chips, and cluttered metadata will be eliminated. The Sleep screen and Desktop widgets will feature only the essential clock, layout switcher, date, and pure temperature (e.g. `21°C`).
> - **Zero Emojis**: Every icon is dynamically rendered as a crisp vector SVG icon.

---

## 2. Proposed Changes & Component Architecture

### A. Dynamic SVG Liquid Glass Refraction Engine (`src/os/LiquidGlassFilter.tsx` & `src/index.css`)
- Create `<LiquidGlassFilter />` component mounted in root:
  - `<filter id="liquid-glass-lens">` with `<feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" result="noise" />` + `<feDisplacementMap in="SourceGraphic" in2="noise" scale="12" xChannelSelector="R" yChannelSelector="G" />` + `<feSpecularLighting surfaceScale="3" specularConstant="1.2" specularExponent="20">`.
  - Interactive pointer velocity listener that modulates the displacement map scale and base frequency on drag and hover, creating authentic liquid ripples.
  - Update `.liquid-glass-window` and `.liquid-glass-card` to use the dynamic SVG filter alongside `backdrop-filter: blur(28px) saturate(170%)`.

### B. True UI Style Desktop Layout Architecture (`src/os/Desktop.tsx` & `src/os/Taskbar.tsx`)
- When `uiStyle` changes:
  - **`macos`**: Top global menu bar (Apple vector logo, Active app title, File/Edit/View, Audio, Battery, Wifi, Time) + Bottom floating macOS Dock with smooth magnification and active dot indicators. Window frames shift caption buttons to the top-left traffic lights (`#ff5f56`, `#ffbd2e`, `#27c93f`).
  - **`one-ui`**: Samsung Reachability architecture. Desktop is organized into a Top Viewing Area (spacious clock & weather widget) and a Bottom 55% Interaction Area where app icons and controls are comfortably reachable. Large 26px squircles.
  - **`material3`**: Google Material Design 3 layout. Vertical left navigation rail with 9999px pill active indicators, tonal elevation layers, and floating action button (FAB).
  - **`miui`**: Xiaomi Alive layout with superellipse $n=3$ cards, fluid widget layout, and dynamic alive refraction.
  - **`the-ai`**: Sci-Fi Cybernetic HUD with top telemetry diagnostics, left status rail (CPU/RAM/NET bars), and matrix green accent.
  - **`nyan-cat`**: Retro arcade layout with rainbow chrome header and floating arcade icons.
  - **`meme`**: Doge comic layout with golden flair and playful dialogue bubbles.
  - **`glassium`**: Pure Zero Border Line liquid glass floating desktop.

### C. Design Subtraction ("引き算の美学") & Weather/Clock Controls (`src/os/LockScreen.tsx`)
- **Clock Positioning**: Add placement selector (`center`, `top`, `bottom`) for the clock.
- **Weather Display**: Strip out all secondary text (no "Clear sky", no "Humidity", no city name clutter). Show ONLY the clean temperature: e.g. `21°C` with a vector weather icon.
- **Visual Decluttering**: Remove static pill badges, redundant tags, and nested borders.
- **Animated Sleep Backgrounds**: Enhance canvas rendering with continuous high-fps animations for `aurora`, `void`, `matrix`, `galaxy`, `retro`, and moving wallpaper ripples.

### D. Stylish System Soundscape (`src/os/soundService.ts`)
- Replace abrasive waveforms with sleek acoustic/glass synthesis:
  - **`click`**: High-frequency micro-haptic tap (3000Hz sine with 6ms decay, whisper volume).
  - **`open`**: Soft dual-harmonic glass bell chime (880Hz + 1320Hz pure sine with subtle exponential decay).
  - **`lock`**: Deep luxury dampened acoustic lock thud (90Hz $\to$ 40Hz sub-bass transient).
  - **`notify`**: Shimmering glassy ambient interval (587Hz + 880Hz chord with smooth release).

### E. Complete Browser Repair (`server.ts` & `src/os/apps/Browser.tsx`)
- In `server.ts`:
  - Enhance `/api/proxy` to strip CSP frame-ancestors, remove restrictive headers, forward origin/referrer, and automatically rewrite relative asset paths with `<base href="...">`.
  - Provide fallback support for direct links and curated web portals (Wikipedia, DuckDuckGo, Archive.org, Hacker News, MDN, DevDocs).
  - Prevent iframe loading locks or blank screen states.
- In `Browser.tsx`:
  - Ensure immediate window launch, clean navigation bar with Zero Border Line, and responsive error recovery.

### F. Strict No-Emoji Rule
- Audit the entire codebase to ensure zero emoji characters (`⭐`, `🔥`, `✨`, `👍`, etc.) are used. All iconography will be dynamically rendered via Lucide and Fluent SVG vector icons.

---

## 3. Verification Plan

### Automated Verification
1. `lint_applet`: Verify zero TypeScript or ESLint errors (`npm run lint`).
2. `compile_applet`: Verify Vite build compiles successfully (`npm run build`).

### Manual Browser & Interaction Verification
1. **UI Style Layout Switch**:
   - In Settings $\to$ Appearance, switch between `macOS`, `One UI`, `Material 3`, `The AI`, `MIUI`, and `Glassium`.
   - Confirm macOS shows Top Menu Bar + Bottom Dock + Traffic Lights.
   - Confirm One UI applies top viewing / bottom thumb interaction reachability.
   - Confirm Material 3 displays left nav rail with pill indicators.
2. **SVG Liquid Glass Filter**:
   - Move windows and hover across panels to see dynamic physical refraction ripples.
3. **Design Subtraction & Sleep Screen**:
   - Test Sleep screen: confirm only clock, date, layout button, and temperature (e.g. `21°C`) are displayed without visual clutter.
   - Test clock position selector (`top`, `center`, `bottom`).
   - Confirm sleep backgrounds are smoothly animated in real-time.
4. **Stylish System Sounds**:
   - Click icons, open windows, and lock/unlock system to confirm subtle, elegant audio.
5. **Browser Execution**:
   - Open Browser from desktop or dock, enter search queries and URLs, and verify pages render cleanly.
