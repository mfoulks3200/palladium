import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxEmpty,
  ComboboxSeparator,
  ComboboxValue,
} from '../combobox';

describe('Combobox', () => {
  const fruits = ['Apple', 'Banana', 'Cherry'];

  const renderCombobox = (props: Record<string, any> = {}) =>
    render(
      <Combobox {...props}>
        <ComboboxInput placeholder="Select fruit..." />
        <ComboboxContent>
          <ComboboxList>
            {fruits.map((fruit) => (
              <ComboboxItem key={fruit} value={fruit}>
                {fruit}
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>,
    );

  it('renders the input', () => {
    renderCombobox();
    expect(screen.getByPlaceholderText('Select fruit...')).toBeInTheDocument();
  });

  it('renders input with combobox role', () => {
    renderCombobox();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders with data-slot on input wrapper', () => {
    renderCombobox();
    expect(
      document.querySelector('[data-slot="input-group"]'),
    ).toBeInTheDocument();
  });

  it('renders the trigger icon', () => {
    renderCombobox();
    // The trigger renders a ChevronDown icon inside an InputGroupButton
    expect(
      document.querySelector('[data-slot="input-group-button"]'),
    ).toBeInTheDocument();
  });
});

describe('ComboboxInput options', () => {
  it('hides trigger when showTrigger is false', () => {
    render(
      <Combobox>
        <ComboboxInput placeholder="Search..." showTrigger={false} />
        <ComboboxContent>
          <ComboboxList>
            <ComboboxItem value="a">A</ComboboxItem>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>,
    );
    expect(
      document.querySelector('[data-slot="combobox-trigger"]'),
    ).not.toBeInTheDocument();
  });

  it('supports disabled state', () => {
    render(
      <Combobox>
        <ComboboxInput placeholder="Search..." disabled />
        <ComboboxContent>
          <ComboboxList>
            <ComboboxItem value="a">A</ComboboxItem>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>,
    );
    expect(screen.getByPlaceholderText('Search...')).toBeDisabled();
  });

  it('renders with custom className on input wrapper', () => {
    render(
      <Combobox>
        <ComboboxInput placeholder="Search..." className="custom-input" />
        <ComboboxContent>
          <ComboboxList>
            <ComboboxItem value="a">A</ComboboxItem>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>,
    );
    expect(
      document.querySelector('[data-slot="input-group"]'),
    ).toHaveClass('custom-input');
  });
});

describe('Combobox with getDisplayValue', () => {
  it('renders without error when getDisplayValue is provided', () => {
    const countries = [
      { code: 'us', name: 'United States' },
      { code: 'gb', name: 'United Kingdom' },
    ];

    render(
      <Combobox
        getDisplayValue={(item: (typeof countries)[number]) => item.name}
      >
        <ComboboxInput placeholder="Country..." />
        <ComboboxContent>
          <ComboboxList>
            {countries.map((c) => (
              <ComboboxItem key={c.code} value={c}>
                {c.name}
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>,
    );
    expect(screen.getByPlaceholderText('Country...')).toBeInTheDocument();
  });
});

describe('Combobox with getFormValue', () => {
  it('renders without error when getFormValue is provided', () => {
    render(
      <Combobox getFormValue={(item: { id: string }) => item.id}>
        <ComboboxInput placeholder="Pick..." />
        <ComboboxContent>
          <ComboboxList>
            <ComboboxItem value={{ id: '1' }}>Item 1</ComboboxItem>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>,
    );
    expect(screen.getByPlaceholderText('Pick...')).toBeInTheDocument();
  });
});
