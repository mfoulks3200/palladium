# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Palladium is a minimalist Electron-based web browser with vertical tabs, a Raycast-style command bar, and userscript support. Built on Electron React Boilerplate (ERB) with React 19, TypeScript, and Tailwind CSS v4.

## Commands

```bash
npm start              # Start dev mode (hot reload)
npm run build          # Production build (main + renderer)
npm run package        # Build distributable app via electron-builder
npm test               # Run Jest tests
npm run lint           # ESLint check
npm run lint:fix       # ESLint with auto-fix
npm run format         # Prettier formatting
npm run build:dll      # Build DLL files for development (run after npm install)
```

## Architecture

Electron main/renderer process separation. Three process boundaries, connected by typed IPC.

### Main Process (`src/main/`)

Handles OS features, window management, tabs (via `WebContentsView`), and core logic.

- `BrowserWindowUI.ts` — Primary frameless window setup, subsystem initialization
- `TabManager.ts` / `Tab.ts` — Tab lifecycle, navigation, WebContents management. Tab state synced to renderer via `update-tab-meta` IPC on 500ms interval
- `SettingsManager.ts` — Persists settings to `~/.palladium/settings.json`, uses Zod validation
- `commands/CommandParser.ts` — Singleton that routes command input to registered `CommandProvider` implementations
- `commands/CommandBar.ts` — Spawns/manages the command bar as a separate `BrowserWindow`
- `commands/builtins/` — Built-in command providers (Base, SearchEngines, Tabs)
- `GlobalShortcuts.ts` — System-wide shortcuts (e.g., `Cmd+Shift+T` for command bar)
- `preload.ts` — Secure `contextBridge` exposing typed IPC to renderer

### Renderer Process (`src/renderer/`)

React UI for browser chrome. Two separate webpack entry points = two independent windows:

- `windows/main-ui/` — Primary browser interface (sidebar, tabs, address bar)
- `windows/command-bar/` — Floating command palette (separate `BrowserWindow`)
- `components/` — Shared UI components. `ui/` subdirectory contains shadcn/UI primitives
- `components/internal-pages/` — Internal page content for `palladium://` URLs (settings, editor)
- `hooks/use-design-tokens.tsx` — Dynamic CSS variable generation from user color preferences
- `lib/settings.tsx` — `SettingsProvider` context that syncs with main process via IPC

### Shared IPC Layer (`src/ipc/`)

The contract between main and renderer processes:

- `index.ts` — `RendererToMainEvents` and `MainToRendererEvents` type maps defining all IPC channels and payloads
- `SettingsRegistry.ts` — Canonical Zod schema for all settings with defaults
- `Utility.ts` — `getDeepProp`/`setDeepProp` helpers for nested settings access

### Build Config (`.erb/configs/`)

Webpack configs for main, renderer (dev + prod), preload, and DLL builds. Dev renderer uses HMR via webpack-dev-server on port 1212.

## Key Patterns

### IPC

Renderer never imports Node.js or Electron modules directly. All communication through `window.electron.ipcRenderer` (from preload). Typed wrappers: `typedIpcMain.on()` in main, `typedWebContents().send()` for responses. To add a new IPC channel: define types in `src/ipc/index.ts`, add handler in main, expose in `preload.ts`.

### Command System

`CommandProvider` interface: `getProviderMetadata()`, `getSuggestions(input)`, `runCommand(id, input, metadata)`. Register in `src/main/commands/builtins/` and export from the builtins index. `CommandParser` auto-discovers providers exported from that module.

### Settings

Zod-validated schema in `src/ipc/SettingsRegistry.ts`. Main reads/writes `~/.palladium/settings.json`. Renderer syncs via `settings-sync` IPC channel. `useSettings(key)` hook in renderer returns `[value, setter]`.

### Styling

Tailwind CSS classes preferred over custom CSS. Use `cn()` utility (clsx + tailwind-merge) for dynamic class composition. Design tokens injected as CSS variables by `DesignTokenProvider`. Path alias: `@/` maps to `src/renderer/`.

### Component Design

Use Radix UI or Base UI primitives for components needing focus management, keyboard navigation, or ARIA. shadcn/UI components live in `src/renderer/components/ui/`.

## Testing

Jest 29 with React Testing Library. Tests are co-located with source files in `__tests__/` directories (e.g., `src/ipc/__tests__/`, `src/renderer/lib/__tests__/`). Run all tests with `npm test`. Run a single test with `npx jest path/to/test`.
