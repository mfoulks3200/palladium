import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from '../input-group';

describe('InputGroup', () => {
  it('renders with data-slot="input-group" and role="group"', () => {
    render(<InputGroup data-testid="group">Content</InputGroup>);
    const group = screen.getByTestId('group');
    expect(group).toHaveAttribute('data-slot', 'input-group');
    expect(group).toHaveAttribute('role', 'group');
  });

  it('merges custom className', () => {
    render(
      <InputGroup data-testid="group" className="custom">
        Content
      </InputGroup>,
    );
    expect(screen.getByTestId('group')).toHaveClass('custom');
  });
});

describe('InputGroupAddon', () => {
  it('renders with data-slot and default align', () => {
    render(<InputGroupAddon data-testid="addon">Icon</InputGroupAddon>);
    const addon = screen.getByTestId('addon');
    expect(addon).toHaveAttribute('data-slot', 'input-group-addon');
    expect(addon).toHaveAttribute('data-align', 'inline-start');
  });

  it('renders with specified alignment', () => {
    render(
      <InputGroupAddon data-testid="addon" align="inline-end">
        Icon
      </InputGroupAddon>,
    );
    expect(screen.getByTestId('addon')).toHaveAttribute(
      'data-align',
      'inline-end',
    );
  });
});

describe('InputGroupButton', () => {
  it('renders a button with data-slot="button"', () => {
    render(<InputGroupButton>Click</InputGroupButton>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('data-slot', 'button');
    expect(btn).toHaveAttribute('type', 'button');
  });
});

describe('InputGroupInput', () => {
  it('renders an input with data-slot="input-group-control"', () => {
    render(<InputGroupInput aria-label="Field" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('data-slot', 'input-group-control');
  });
});

describe('InputGroupText', () => {
  it('renders text content', () => {
    render(<InputGroupText>Label</InputGroupText>);
    expect(screen.getByText('Label')).toBeInTheDocument();
  });
});

describe('InputGroupTextarea', () => {
  it('renders a textarea with data-slot="input-group-control"', () => {
    render(<InputGroupTextarea aria-label="Notes" />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('data-slot', 'input-group-control');
  });
});

describe('InputGroup composition', () => {
  it('renders a complete input group', () => {
    render(
      <InputGroup>
        <InputGroupAddon>$</InputGroupAddon>
        <InputGroupInput aria-label="Amount" placeholder="0.00" />
        <InputGroupAddon align="inline-end">USD</InputGroupAddon>
      </InputGroup>,
    );
    expect(screen.getByText('$')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
    expect(screen.getByText('USD')).toBeInTheDocument();
  });
});
