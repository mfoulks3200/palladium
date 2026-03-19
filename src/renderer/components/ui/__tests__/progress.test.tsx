import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { Progress } from '../progress';

describe('Progress', () => {
  it('renders with data-slot="progress"', () => {
    render(<Progress value={50} data-testid="progress" />);
    expect(screen.getByTestId('progress')).toHaveAttribute(
      'data-slot',
      'progress',
    );
  });

  it('renders with progressbar role', () => {
    render(<Progress value={50} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders the indicator with transform based on value', () => {
    render(<Progress value={75} data-testid="progress" />);
    const indicator = document.querySelector(
      '[data-slot="progress-indicator"]',
    );
    expect(indicator).toHaveStyle({ transform: 'translateX(-25%)' });
  });

  it('renders 0% progress correctly', () => {
    render(<Progress value={0} />);
    const indicator = document.querySelector(
      '[data-slot="progress-indicator"]',
    );
    expect(indicator).toHaveStyle({ transform: 'translateX(-100%)' });
  });

  it('renders 100% progress correctly', () => {
    render(<Progress value={100} />);
    const indicator = document.querySelector(
      '[data-slot="progress-indicator"]',
    );
    expect(indicator).toHaveStyle({ transform: 'translateX(-0%)' });
  });

  it('merges custom className', () => {
    render(<Progress value={50} className="custom" data-testid="progress" />);
    expect(screen.getByTestId('progress')).toHaveClass('custom');
  });
});
