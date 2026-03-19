import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { Slider } from '../slider';

// Radix Slider uses ResizeObserver internally
window.ResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
})) as any;

describe('Slider', () => {
  it('renders with data-slot="slider"', () => {
    render(<Slider defaultValue={[50]} />);
    expect(
      document.querySelector('[data-slot="slider"]'),
    ).toBeInTheDocument();
  });

  it('renders slider role', () => {
    render(<Slider defaultValue={[50]} />);
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });

  it('renders a thumb for each value', () => {
    render(<Slider defaultValue={[25, 75]} />);
    expect(screen.getAllByRole('slider')).toHaveLength(2);
  });

  it('renders displayValue when provided', () => {
    render(<Slider defaultValue={[50]} displayValue="50%" />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('does not render displayValue when not provided', () => {
    const { container } = render(<Slider defaultValue={[50]} />);
    // The display value box has font-mono class
    expect(container.querySelector('.font-mono')).not.toBeInTheDocument();
  });

  it('renders centerMarker when specified', () => {
    const { container } = render(
      <Slider defaultValue={[50]} centerMarker />,
    );
    expect(container.querySelector('.bg-primary\\/50')).toBeInTheDocument();
  });

  it('merges custom className', () => {
    render(<Slider defaultValue={[50]} className="my-slider" />);
    expect(document.querySelector('[data-slot="slider"]')).toHaveClass(
      'my-slider',
    );
  });
});
