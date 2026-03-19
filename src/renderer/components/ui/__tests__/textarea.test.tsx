import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { Textarea } from '../textarea';

describe('Textarea', () => {
  it('renders with data-slot="textarea"', () => {
    render(<Textarea aria-label="Bio" />);
    expect(screen.getByRole('textbox')).toHaveAttribute(
      'data-slot',
      'textarea',
    );
  });

  it('accepts and displays a value', () => {
    render(<Textarea aria-label="Bio" defaultValue="Hello world" />);
    expect(screen.getByRole('textbox')).toHaveValue('Hello world');
  });

  it('calls onChange when typing', () => {
    const onChange = jest.fn();
    render(<Textarea aria-label="Bio" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Updated' },
    });
    expect(onChange).toHaveBeenCalled();
  });

  it('supports disabled state', () => {
    render(<Textarea aria-label="Bio" disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('supports placeholder', () => {
    render(<Textarea placeholder="Write something..." />);
    expect(
      screen.getByPlaceholderText('Write something...'),
    ).toBeInTheDocument();
  });

  it('merges custom className', () => {
    render(<Textarea aria-label="Bio" className="custom" />);
    expect(screen.getByRole('textbox')).toHaveClass('custom');
  });
});
