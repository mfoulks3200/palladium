import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { UserInterface } from '../UserInterface';
import { SettingsContext } from '@/lib/settings';

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

// Mock ColorPicker
jest.mock('@/components/ui/color-picker', () => ({
  ColorPicker: () => <div data-testid="color-picker" />,
}));

// Mock Slider
jest.mock('@/components/ui/slider', () => ({
  Slider: () => <div data-testid="slider" />,
}));

// Mock SettingsOption
jest.mock('../../SettingComponents', () => ({
  SettingsOption: ({
    name,
    children,
  }: {
    name: string;
    className?: string;
    children?: React.ReactNode;
  }) => (
    <div>
      <span>{name}</span>
      {children}
    </div>
  ),
}));

// Mock Combobox (imported but not rendered)
jest.mock('@/components/ui/combobox', () => ({
  Combobox: () => <div />,
  ComboboxContent: () => <div />,
  ComboboxEmpty: () => <div />,
  ComboboxInput: () => <div />,
  ComboboxItem: () => <div />,
  ComboboxList: () => <div />,
}));

const renderWithSettings = () => {
  const mockUseSetting = jest.fn((key: string) => {
    switch (key) {
      case 'personalization.userInterface.tintColor':
        return ['3b82f6', jest.fn()];
      case 'personalization.userInterface.transparency':
        return [1, jest.fn()];
      case 'personalization.userInterface.backdropSaturation':
        return [100, jest.fn()];
      case 'personalization.userInterface.blur':
        return [10, jest.fn()];
      default:
        return [null, jest.fn()];
    }
  });

  return render(
    <SettingsContext.Provider value={{ useSetting: mockUseSetting as any }}>
      <UserInterface />
    </SettingsContext.Provider>,
  );
};

describe('UserInterface', () => {
  it('renders all 4 setting option names', () => {
    renderWithSettings();
    expect(screen.getByText('Color Tint')).toBeInTheDocument();
    expect(screen.getByText('Opacity')).toBeInTheDocument();
    expect(screen.getByText('Blur')).toBeInTheDocument();
    expect(screen.getByText('Saturation')).toBeInTheDocument();
  });

  it('renders color picker component', () => {
    renderWithSettings();
    expect(screen.getByTestId('color-picker')).toBeInTheDocument();
  });

  it('renders slider components', () => {
    renderWithSettings();
    const sliders = screen.getAllByTestId('slider');
    expect(sliders).toHaveLength(3);
  });
});
