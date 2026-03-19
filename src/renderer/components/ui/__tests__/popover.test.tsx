import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
} from '../popover';

describe('Popover', () => {
  it('renders trigger', () => {
    render(
      <Popover>
        <PopoverTrigger>Toggle</PopoverTrigger>
        <PopoverContent>Content</PopoverContent>
      </Popover>,
    );
    expect(screen.getByText('Toggle')).toBeInTheDocument();
  });

  it('opens popover when trigger is clicked', () => {
    render(
      <Popover>
        <PopoverTrigger>Toggle</PopoverTrigger>
        <PopoverContent>Popover body</PopoverContent>
      </Popover>,
    );
    fireEvent.click(screen.getByText('Toggle'));
    expect(screen.getByText('Popover body')).toBeInTheDocument();
  });

  it('renders header, title, and description with data-slots', () => {
    render(
      <Popover open>
        <PopoverContent>
          <PopoverHeader>
            <PopoverTitle>Info</PopoverTitle>
            <PopoverDescription>Details here</PopoverDescription>
          </PopoverHeader>
        </PopoverContent>
      </Popover>,
    );
    expect(
      document.querySelector('[data-slot="popover-header"]'),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-slot="popover-title"]'),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-slot="popover-description"]'),
    ).toBeInTheDocument();
  });
});
