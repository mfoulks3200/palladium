# Palladium

> The browser that gets out of your way.

Palladium is a modern, minimalist web browser built on top of [Electron](https://www.electronjs.org/). Designed for power users who value speed, efficiency, and deep customization, Palladium focuses on keeping the interface clean while providing powerful tools at your fingertips.

## Key Features

- **Vertical Tabs**: Reclaim your horizontal screen real estate. Manage dozens of tabs effortlessly with a sidebar-based tab system.
- **Command Bar**: A Raycast-inspired interface for quick navigation, search, and browser control. Press a shortcut and go anywhere.
- **Mods (Userscripts)**: Customize any website with first-party support for userscripts. Palladium "Mods" allow you to extend the web exactly how you want it.
- **Minimalist Design**: Interface elements that only appear when you need them, letting you focus on the content.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (22.22.2+ on Node 22, 24.15.0+ on Node 24, or Node 26+)
- [npm](https://www.npmjs.com/)

### Installation

Clone the repository and install the dependencies:

```bash
git clone https://github.com/your-username/palladium.git
cd palladium
npm install
```

### Starting Development

Run the following command to start the browser in development mode:

```bash
npm start
```

### Managing unpacked Chrome extensions

Open **Settings → Extensions → Load unpacked…**, choose a folder containing a Chrome extension’s `manifest.json`, review its requested permissions and website access, then select **Install**. Palladium installs a private copy and remembers which extensions are enabled. Use **Permissions**, **Enable**, **Disable**, or **Remove** in the same panel. Reload an open website to see content-script changes. Removing an extension leaves its original folder alone. To install an edited version, remove it and select the updated folder again.

The included `examples/localhost-extension` is a small extension you can try. Compatibility depends on Electron’s supported Chrome APIs.

### Trying an extension from the development shell

Start a local page by running `python3 -m http.server 8765 --bind 127.0.0.1 --directory examples/localhost-extension` from the repository root. In a second terminal, launch the development browser with the demo extension:

```bash
PALLADIUM_UNPACKED_EXTENSION="$PWD/examples/localhost-extension" npm start
```

Open `http://127.0.0.1:8765/` in a website tab. A highlighted “Palladium extension active” label appears above the directory listing. Quit and run plain `npm start` to disable it. To try another trusted unpacked extension, point the variable at its directory containing `manifest.json`. It runs in your existing website profile with access to matching pages. This developer proof of concept targets content scripts. Toolbar actions and Chrome Web Store installation are outside its scope.

### Packaging for Production

To build and package the application for your current platform:

```bash
npm run package
```

## Tech Stack

Palladium is built with a modern web stack:

- **Runtime**: [Electron](https://www.electronjs.org/)
- **Frontend**: [React](https://reactjs.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Internal IPC**: Custom IPC layer for seamless main/renderer communication.

## License

MIT © Atlas Pup Labs
