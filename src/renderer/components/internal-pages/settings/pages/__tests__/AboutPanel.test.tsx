import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

// Mock imports that AboutPanel uses
jest.mock('../../../../../../CHANGELOG.md', () => '## Changelog\n- Some change');
jest.mock('../../../../../../package.json', () => ({ version: '0.0.8' }), { virtual: true });

import { LinksPanel, VersionsPanel } from '../AboutPanel';

// Mock IPC
Object.defineProperty(window, 'electron', {
  value: {
    ipcRenderer: {
      sendMessage: jest.fn(),
      on: jest.fn(() => jest.fn()),
    },
  },
  writable: true,
});

// Mock system-meta for VersionsPanel
jest.mock('@/lib/system-meta', () => ({
  useSystemMeta: jest.fn(() => ({
    platform: 'darwin',
    arch: 'arm64',
    osVersion: '14.0',
    electronVersion: '35.0.0',
    chromeVersion: '128.0',
    nodeVersion: '20.0',
    appVersion: '0.0.8',
    appName: 'Palladium',
    gitInfo: {
      version: '0.0.8',
      commitHash: 'abc1234def',
      branch: 'main',
      lastCommitDateTime: '2024-01-01',
    },
  })),
}));

// Mock image import
jest.mock('assets/icon.png', () => 'mock-icon.png');

// Mock the CSS module
jest.mock('../AboutPanel.module.css', () => ({
  heroImage: 'heroImage',
}));

describe('LinksPanel', () => {
  it('renders "Made with" text', () => {
    render(<LinksPanel />);
    expect(screen.getByText(/Made with/)).toBeInTheDocument();
    expect(screen.getByText(/North Carolina/)).toBeInTheDocument();
  });

  it('renders GitHub link', () => {
    render(<LinksPanel />);
    expect(screen.getByText('GitHub Repository')).toBeInTheDocument();
  });
});

describe('VersionsPanel', () => {
  it('renders version information', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    render(<VersionsPanel />);

    expect(screen.getByText('Palladium Version')).toBeInTheDocument();
    expect(screen.getByText('Chromium Version')).toBeInTheDocument();
    expect(screen.getByText('Electron Version')).toBeInTheDocument();
    expect(screen.getByText('Node Version')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('displays correct version values', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    render(<VersionsPanel />);

    expect(screen.getByText('0.0.8 ARM64')).toBeInTheDocument();
    expect(screen.getByText('128.0')).toBeInTheDocument();
    expect(screen.getByText('35.0.0')).toBeInTheDocument();
    expect(screen.getByText('20.0')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('displays build info from git', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    render(<VersionsPanel />);

    expect(screen.getByText('MAIN ABC1234')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
