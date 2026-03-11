import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsCard, SettingsOption, SettingsTab } from '../settings/SettingComponents';

// Mock electron IPC for any components that might use it
Object.defineProperty(window, 'electron', {
  value: {
    ipcRenderer: {
      sendMessage: jest.fn(),
      on: jest.fn(() => jest.fn()),
    },
  },
  writable: true,
});

describe('SettingsCard', () => {
  it('renders title when provided', () => {
    render(<SettingsCard title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<SettingsCard title="T" description="Some description" />);
    expect(screen.getByText('Some description')).toBeInTheDocument();
  });

  it('renders without title or description', () => {
    const { container } = render(<SettingsCard />);
    expect(container.querySelector('.rounded-lg')).toBeInTheDocument();
  });

  it('renders custom contents', () => {
    render(
      <SettingsCard customContents={<div data-testid="custom">Hello</div>} />,
    );
    expect(screen.getByTestId('custom')).toHaveTextContent('Hello');
  });

  it('renders children', () => {
    render(
      <SettingsCard>
        <div data-testid="child">Child Content</div>
      </SettingsCard>,
    );
    expect(screen.getByTestId('child')).toHaveTextContent('Child Content');
  });
});

describe('SettingsOption', () => {
  it('renders name', () => {
    render(<SettingsOption name="Enable Feature" />);
    expect(screen.getByText('Enable Feature')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(
      <SettingsOption name="Feature" description="Toggles the feature" />,
    );
    expect(screen.getByText('Toggles the feature')).toBeInTheDocument();
  });

  it('renders children in the value area', () => {
    render(
      <SettingsOption name="Feature">
        <input data-testid="input" type="checkbox" />
      </SettingsOption>,
    );
    expect(screen.getByTestId('input')).toBeInTheDocument();
  });
});

describe('SettingsTab', () => {
  it('renders tab name and icon', () => {
    render(
      <SettingsTab
        name="General"
        icon={<span data-testid="icon">IC</span>}
        disabled={false}
        isActive={false}
        onClick={jest.fn()}
      />,
    );
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('calls onClick when not disabled', () => {
    const onClick = jest.fn();
    render(
      <SettingsTab
        name="General"
        icon={<span>IC</span>}
        disabled={false}
        isActive={false}
        onClick={onClick}
      />,
    );
    fireEvent.click(screen.getByText('General'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const onClick = jest.fn();
    render(
      <SettingsTab
        name="General"
        icon={<span>IC</span>}
        disabled={true}
        isActive={false}
        onClick={onClick}
      />,
    );
    fireEvent.click(screen.getByText('General'));
    expect(onClick).not.toHaveBeenCalled();
  });
});
