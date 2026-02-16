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

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
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
