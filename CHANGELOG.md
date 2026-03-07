## [0.0.9] — 2026-03-07

### Added

- **Media Widget** — Now-playing media widget with album artwork, playback controls, and progress scrubber
  - Media state synchronization between tabs and the browser chrome via IPC
  - Play/pause, skip forward, and skip backward controls that execute on the originating tab's `WebContents`
  - Focus-tab button to quickly navigate to the tab playing media
- **History Command Parser** — Command bar can now search and navigate browsing history
- **AGENTS.md** — Architecture & agent guide documentation for contributors and AI agents

### Changed

- **Command Bar Search** — Improved search relevance and result ranking
- **React Performance Improvements** — Comprehensive re-render audit across the renderer process
  - Wrapped `BrowserTab` in `React.memo` and replaced `useEffect` derived state with `useMemo`
  - Stabilized context values with `useMemo` and callback refs to prevent cascading re-renders
  - Fixed IPC listener leaks in settings and command bar components

### Fixed

- Settings tab content not rendering until clicking the tab a second time
- Internal pages incorrectly appearing in command bar search results
- Command bar regression causing empty content on respawn
- Open command not executing correctly
- Sidebar scroll position resetting unexpectedly

---

## [0.0.8] — 2026-03-06

### Added

- **Exception Tracking** — Comprehensive error reporting via PostHog across both processes
  - Main process handlers for `uncaughtException` and `unhandledRejection`
  - Renderer-side `window.onerror` and `window.onunhandledrejection` forwarded over IPC
  - React `ErrorBoundary` component wrapping both app roots with a user-friendly fallback UI
  - `captureException()` helper on `AnalyticsManager` funneling all errors through the opt-out gate
- **System Metadata IPC** — `get-system-meta` / `system-meta` channel exposing platform, arch, OS version, Electron/Chrome/Node versions, and app info
  - `SystemMetaProvider` and `useSystemMeta()` hook for renderer consumption
- **Window Action IPC** — `window-action` channel for close, minimize, and maximize/restore from the renderer
- **Open Settings IPC** — `open-settings` channel that focuses an existing settings tab or creates one
- **Native Window Controls** — Renderer-side window control buttons using the new `window-action` channel
- **Version Information** — Build and git revision info displayed in the UI
- **Command Bar Multi-Monitor Support** — Command bar now spawns centered on the monitor where the cursor is located

### Changed

- **Source Maps Preserved in Production** — Removed `deleteSourceMaps()` from both production webpack configs so `.map` files ship with the build, enabling meaningful stack traces in error reports
- Command bar window styling improvements for cross-platform consistency

---

## [0.0.7] — 2026-03-05

### Added

- **Feature Flag System** — React context-based feature flag infrastructure powered by PostHog ([feature-flags.tsx](src/renderer/lib/feature-flags.tsx))
  - `FeatureFlagProvider` subscribes to Main process flag updates and exposes them via React context
  - Supports boolean and multivariate (string) flag values
  - On-demand flag refresh and automatic sync from `AnalyticsManager`
- **Cross-Platform Builds** — Dev builds and build targets for all supported platforms
- **About Page** — Polished about page content and layout

### Changed

- Removed liquid glass dependency

### Fixed

- Memory leak issue
- Settings persistence bug
- Editor styling improvements

---

## [0.0.5] — 2026-03-05

### Added

- **Design Token System** — Full theming infrastructure with CSS custom property design tokens, enabling dynamic color theming across the entire UI ([#8](https://github.com/mfoulks3200/browser/pull/8))
  - Implemented core design token engine with semantic color layers (background, surface, border)
  - Migrated ShadCN components to consume design tokens
  - User-controllable tint, opacity, blur, and saturation settings applied globally
  - Primary tint color mixed into background and surface tokens
  - Proper handling of light/dark mode extremes (pure white cards, fade-to-white in dark mode)
  - Mathematically scaled surface and border elevations by tint extremes
- **PostHog Analytics Integration** — Opt-in analytics with full user control ([#5](https://github.com/mfoulks3200/browser/pull/5))
  - `AnalyticsManager` in the Main process (`posthog-node`)
  - Opt-out toggle in settings
  - Dedicated settings page for analytics preferences
- **Background Shader System** — GPU-accelerated animated background shaders
  - Multiple selectable background shaders
  - Background shader preview in settings
  - Shader performance improvements and flicker fixes
  - Buttons made background-responsive to blend with active shader
- **Monaco Editor** — Integrated Monaco code editor for internal workspace/editor pages
- **Workspace System** — Internal workspace/file-tree functionality
- **Copilot Instructions** — Project architecture and coding conventions document for GitHub Copilot ([#7](https://github.com/mfoulks3200/browser/pull/7))
- **Architecture Guide** — `AGENTS.md` documentation for AI agents and contributors

### Fixed

- Input field styling issues
- Shader background flicker on transitions
- Shader rendering performance

---

## [0.0.4] — 2026-02-28

### Added

- **DevTools Panel** — Built-in developer tools panel for inspecting page content
- **Browsing History UI** — History page for viewing and navigating past browsing sessions
- **Custom Search Engine UI** — Interface for adding and managing custom search engine providers
- **UI Polish Pass** — Refined styling across the browser chrome

### Fixed

- Tab display logic on window show
- `@electron/notarize` upgraded from 3.0.0 to 3.1.1 to fix Publish workflow failure ([#3](https://github.com/mfoulks3200/browser/pull/3))

---

## [0.0.3] — 2026-02-20

### Added

- **GitHub Actions CI/CD** — Automated build and publish pipeline for macOS (DMG + ZIP)
  - Code signing and notarization support
  - Pipeline environment variable configuration
- **Custom Window Icons** — Custom application and tab icons

### Fixed

- Native dependency rebuilds for Electron
- macOS `hdiutil` pipeline issues (pinned to `macos-14`, fixed `notarize.js` env vars) ([#1](https://github.com/mfoulks3200/browser/pull/1))
- Various edge-case fixes in tab and navigation logic

---

## [0.0.2] — 2026-02-16

### Added

- **Settings System** — Basic settings pages with persistent storage via `SettingsManager`
- **Command Bar** — Refined floating command palette (`cmdk`-based) with multiple entry points
- **Tab Close History** — Ability to reopen recently closed tabs
- **History Logging** — Background browsing history recording via `HistoryManager`

---

## [0.0.1] — 2026-02-15

### Added

- **Tab Management** — Core tab creation, switching, closing, and WebContents lifecycle
- **Drag and Drop Tabs** — Tab reordering via `@atlaskit/pragmatic-drag-and-drop`
- **IPC Architecture** — Secure Main ↔ Renderer communication layer (`preload.ts`, typed channels in `src/ipc/`)

---

## [0.0.0] — 2026-02-14

### Added

- **Project Initialization** — Scaffolded from Electron React Boilerplate
- **React 19 + TypeScript** — Renderer process foundation
- **Tailwind CSS v4** — Utility-first styling pipeline
- **ShadCN UI** — Base component library integration
- **Prettier** — Code formatting configuration
- **Browser Tab Primitive** — Initial `BrowserTab` React component
