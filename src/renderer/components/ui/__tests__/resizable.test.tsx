import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '../resizable';

// Mock ResizeObserver for react-resizable-panels
window.ResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
})) as any;

describe('ResizablePanelGroup', () => {
  it('renders with data-slot="resizable-panel-group"', () => {
    const { container } = render(
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize={50}>Panel 1</ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={50}>Panel 2</ResizablePanel>
      </ResizablePanelGroup>,
    );
    expect(
      container.querySelector('[data-slot="resizable-panel-group"]'),
    ).toBeInTheDocument();
  });

  it('renders children panels', () => {
    const { container } = render(
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize={50}>
          <div data-testid="panel-content">Content</div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={50}>
          <div data-testid="panel-content-2">Content 2</div>
        </ResizablePanel>
      </ResizablePanelGroup>,
    );
    expect(
      container.querySelector('[data-testid="panel-content"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-testid="panel-content-2"]'),
    ).toBeInTheDocument();
  });
});

describe('ResizableHandle', () => {
  it('renders with data-slot="resizable-handle"', () => {
    const { container } = render(
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize={50}>A</ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={50}>B</ResizablePanel>
      </ResizablePanelGroup>,
    );
    expect(
      container.querySelector('[data-slot="resizable-handle"]'),
    ).toBeInTheDocument();
  });

  it('renders grip icon when withHandle is true', () => {
    const { container } = render(
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize={50}>A</ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50}>B</ResizablePanel>
      </ResizablePanelGroup>,
    );
    // The grip icon has a specific size class
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('does not render grip icon by default', () => {
    const { container } = render(
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize={50}>A</ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={50}>B</ResizablePanel>
      </ResizablePanelGroup>,
    );
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });
});
