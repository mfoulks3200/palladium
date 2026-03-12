import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { useContext } from 'react';
import {
  PersonalizationContext,
  PersonalizationProvider,
} from '../PersonalizationProvider';

const TestConsumer = () => {
  const value = useContext(PersonalizationContext);
  return <div data-testid="value">{value === null ? 'null' : value}</div>;
};

describe('PersonalizationProvider', () => {
  it('renders children', () => {
    render(
      <PersonalizationProvider>
        <div data-testid="child">Hello</div>
      </PersonalizationProvider>,
    );
    expect(screen.getByTestId('child')).toHaveTextContent('Hello');
  });

  it('provides empty string as context value', () => {
    render(
      <PersonalizationProvider>
        <TestConsumer />
      </PersonalizationProvider>,
    );
    // Empty string, not null
    expect(screen.getByTestId('value').textContent).toBe('');
  });

  it('provides null when used outside provider', () => {
    render(<TestConsumer />);
    expect(screen.getByTestId('value')).toHaveTextContent('null');
  });
});
