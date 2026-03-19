import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../tabs';

describe('Tabs', () => {
  const renderTabs = () =>
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>,
    );

  it('renders with data-slot="tabs"', () => {
    renderTabs();
    expect(document.querySelector('[data-slot="tabs"]')).toBeInTheDocument();
  });

  it('renders tab triggers', () => {
    renderTabs();
    expect(screen.getByRole('tab', { name: 'Tab 1' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Tab 2' })).toBeInTheDocument();
  });

  it('shows the default tab content', () => {
    renderTabs();
    expect(screen.getByText('Content 1')).toBeInTheDocument();
  });

  it('renders tab 2 trigger as inactive initially', () => {
    renderTabs();
    expect(screen.getByRole('tab', { name: 'Tab 2' })).toHaveAttribute(
      'data-state',
      'inactive',
    );
  });

  it('marks active tab with data-state="active"', () => {
    renderTabs();
    expect(screen.getByRole('tab', { name: 'Tab 1' })).toHaveAttribute(
      'data-state',
      'active',
    );
    expect(screen.getByRole('tab', { name: 'Tab 2' })).toHaveAttribute(
      'data-state',
      'inactive',
    );
  });

  it('renders tablist with data-slot', () => {
    renderTabs();
    expect(
      document.querySelector('[data-slot="tabs-list"]'),
    ).toBeInTheDocument();
  });

  it('supports vertical orientation', () => {
    render(
      <Tabs defaultValue="tab1" orientation="vertical">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content</TabsContent>
      </Tabs>,
    );
    expect(document.querySelector('[data-slot="tabs"]')).toHaveAttribute(
      'data-orientation',
      'vertical',
    );
  });
});
