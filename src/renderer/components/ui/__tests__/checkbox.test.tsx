import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { Checkbox } from '../checkbox';

describe('Checkbox', () => {
  it('renders with data-slot="checkbox"', () => {
    render(<Checkbox aria-label="Accept terms" />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('data-slot', 'checkbox');
  });

  it('is unchecked by default', () => {
    render(<Checkbox aria-label="Accept" />);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('can be checked via defaultChecked', () => {
    render(<Checkbox aria-label="Accept" defaultChecked />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('calls onCheckedChange when clicked', () => {
    const onCheckedChange = jest.fn();
    render(
      <Checkbox aria-label="Accept" onCheckedChange={onCheckedChange} />,
    );
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('supports disabled state', () => {
    render(<Checkbox aria-label="Accept" disabled />);
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });

  it('merges custom className', () => {
    render(<Checkbox aria-label="Accept" className="my-class" />);
    expect(screen.getByRole('checkbox')).toHaveClass('my-class');
  });
});
