# Palladium Browser — Copilot Instructions

This document provides GitHub Copilot with the context it needs to assist effectively in this repository.

---

## Technology Stack

### Core Frameworks
- **Electron**: The application is built on the standard Electron model (Main + Renderer processes).
- **Electron React Boilerplate (ERB)**: The foundation of this repository, providing the build systems (Webpack), hot-reloading, and packaging scripts (electron-builder).

### Renderer Process (UI)
- **React 19**: Used for all user interface rendering.
- **ShadCN**: Used as the base for components.
- **Tailwind CSS v4**: Primary styling methodology (`@tailwindcss/postcss`).
- **Radix UI & Base UI**: Headless component libraries used for accessible, complex interactive elements (e.g., popovers, dialogs, dropdowns).
- **CMDK**: Used for the command palette interface.
- **Lucide React**: Scalable vector icons used throughout the UI.
- **Pragmatic Drag and Drop (@atlaskit)**: Employed for complex drag-and-drop interactions (e.g., tab reordering).

### Utilities & Other Libraries
- **TypeScript**: Strict typing across both Main and Renderer processes.
- **LiveKit**: WebRTC functionality (e.g., `livekit-client`, `@livekit/components-react`).
- **Zod**: Schema validation for settings, API inputs, or IPC payloads.

---

## Architecture Overview

The project strictly abides by the Electron process separation model.

### 1. Main Process (`src/main/`)
The Main process handles OS-level features, window management, BrowserViews/WebContents (for rendering web pages), and core background logic.

- **Window Management**:
  - `BrowserWindowUI.ts`: Manages the primary application window containing the browser chrome.
  - `OverlayManager.ts`: Handles managing layered floating windows (e.g., the command bar or special popups).
- **Tab & WebContents Management**:
  - `TabManager.ts`, `Tab.ts`: Handle the backend orchestration of browser tabs, their `WebContents`, navigation, and lifecycle events.
- **Data & User Preferences**:
  - `SettingsManager.ts`: Reads, writes, and serves application settings.
  - `HistoryManager.ts`: Manages and persists browsing history.
- **Commands**:
  - `commands/`: Contains abstracted actions that can be triggered via keyboard shortcuts or the command bar.
  - `GlobalShortcuts.ts`: Binds system-wide and app-wide keyboard shortcuts.
- **Preload Scripts**:
  - `preload.ts`: The bridge script that selectively exposes APIs to the Renderer process securely via `contextBridge`.

### 2. Renderer Process (`src/renderer/`)
The Renderer process contains the React codebase for the application's user interfaces (the "browser chrome").

- **`windows/`**: Contains the root React components for different independent Electron windows.
  - `windows/main-ui/`: The primary browser interface (tabs, address bar, buttons).
  - `windows/command-bar/`: The isolated floating command palette interface.
- **`components/`**: Reusable generic UI components (buttons, inputs, layout elements) powered by Tailwind CSS.
- **`lib/` & `hooks/`**: Reusable React hooks and utility functions specific to the UI.
- **`globals.css`**: The main stylesheet injecting the Tailwind directives and defining global CSS variable tokens.

### 3. IPC — Shared Types & Utilities (`src/ipc/`)
This directory acts as the shared contract between the Main and Renderer processes.

- **`index.ts`, `Utility.ts`**: Type definitions, messaging schemas, and shared helper functions.
- **`SettingsRegistry.ts`**: The canonical definition of available settings, their types, and default values.
- **`Icons.ts`**: Shared icon references or enums used to communicate icon states between main and renderer.

---

## Conventions & Best Practices

### Styling UI Elements
- Always prefer **Tailwind CSS classes** over custom CSS or inline styles.
- Use `clsx` and `tailwind-merge` (via the `cn` utility) when composing dynamic class names.

### Inter-Process Communication (IPC)
- Renderer processes must **never** import Node.js built-ins (`fs`, `path`) or Electron main-process modules directly.
- All communication between Renderer and Main must go through functions exposed on `window.electron` (configured in `src/main/preload.ts`).
- If a new IPC channel is needed:
  1. Define the payload types in `src/ipc/`.
  2. Register the listener in `src/main/`.
  3. Expose the caller function in `src/main/preload.ts`.

### Window UI Architecture
- Complex functionality that needs to break out of the main browser window's bounds (e.g., a spotlight search or detached tool panel) should be implemented as its own window/overlay in `src/renderer/windows/` and managed by the Main process.

### Component Design
- Build accessible components. If the component involves focus management, keyboard navigation, or ARIA attributes, build it using **Radix UI** or **Base UI** primitives rather than from scratch.

### TypeScript
- Maintain strict typing throughout. Avoid `any`; prefer explicit interface/type definitions.
- Place shared types used by both Main and Renderer in `src/ipc/`.
