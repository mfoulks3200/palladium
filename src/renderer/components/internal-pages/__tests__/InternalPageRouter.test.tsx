import '@testing-library/jest-dom';
import { render, screen, act } from '@testing-library/react';
import { InternalPageRouter } from '../InternalPageRouter';

// Mock the settings/editor pages to avoid pulling in heavy deps
jest.mock('../settings', () => ({
  SettingsPage: () => <div data-testid="settings-page">Settings</div>,
}));

jest.mock('../editor', () => ({
  EditorPage: () => <div data-testid="editor-page">Editor</div>,
}));

// Mock IPC for settings provider used inside pages
Object.defineProperty(window, 'electron', {
  value: {
    ipcRenderer: {
      sendMessage: jest.fn(),
      on: jest.fn(() => jest.fn()),
    },
  },
  writable: true,
});

describe('InternalPageRouter', () => {
  it('renders settings page for palladium://settings', async () => {
    await act(async () => {
      render(<InternalPageRouter path="palladium://settings" />);
    });
    expect(screen.getByTestId('settings-page')).toBeInTheDocument();
  });

  it('renders editor page for palladium://editor', async () => {
    await act(async () => {
      render(<InternalPageRouter path="palladium://editor" />);
    });
    expect(screen.getByTestId('editor-page')).toBeInTheDocument();
  });

  it('renders empty div for root path', async () => {
    await act(async () => {
      render(<InternalPageRouter path="palladium://" />);
    });
    // Root path renders an empty div, no settings or editor
    expect(screen.queryByTestId('settings-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('editor-page')).not.toBeInTheDocument();
  });
});
