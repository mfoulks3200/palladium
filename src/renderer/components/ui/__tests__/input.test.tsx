import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../input';

describe('Input', () => {
  it('renders with data-slot="input"', () => {
    render(<Input aria-label="Name" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('data-slot', 'input');
  });

  it('renders with the specified type', () => {
    render(<Input type="email" aria-label="Email" />);
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
  });

  it('accepts and displays a value', () => {
    render(<Input aria-label="Name" defaultValue="John" />);
    expect(screen.getByRole('textbox')).toHaveValue('John');
  });

  it('calls onChange when typing', () => {
    const onChange = jest.fn();
    render(<Input aria-label="Name" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Hello' },
    });
    expect(onChange).toHaveBeenCalled();
  });

  it('supports disabled state', () => {
    render(<Input aria-label="Name" disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('supports placeholder', () => {
    render(<Input placeholder="Enter name" />);
    expect(screen.getByPlaceholderText('Enter name')).toBeInTheDocument();
  });

  it('merges custom className', () => {
    render(<Input aria-label="Name" className="custom" />);
    expect(screen.getByRole('textbox')).toHaveClass('custom');
  });
});
