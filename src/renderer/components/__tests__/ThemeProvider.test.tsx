import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '../ThemeProvider';

// Mock next-themes — the ThemeProvider is a simple div that renders children
// and passes through props as data attributes to avoid React DOM warnings
const mockThemeProvider = jest.fn();

jest.mock('next-themes', () => ({
  ThemeProvider: (props: { children: React.ReactNode; [key: string]: unknown }) => {
    mockThemeProvider(props);
    return <div data-testid="next-themes-provider">{props.children}</div>;
  },
}));

beforeEach(() => {
  mockThemeProvider.mockClear();
});

describe('ThemeProvider', () => {
  it('renders children', () => {
    render(
      <ThemeProvider>
        <span>Hello from the theme side</span>
      </ThemeProvider>,
    );
    expect(screen.getByText('Hello from the theme side')).toBeInTheDocument();
  });

  it('passes props through to the underlying provider', () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="dark">
        <span>Themed child</span>
      </ThemeProvider>,
    );

    expect(mockThemeProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        attribute: 'class',
        defaultTheme: 'dark',
      }),
    );
  });
});
