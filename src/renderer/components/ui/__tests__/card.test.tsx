import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from '../card';

describe('Card', () => {
  it('renders with data-slot="card"', () => {
    render(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');
    expect(card).toHaveAttribute('data-slot', 'card');
    expect(card).toHaveTextContent('Content');
  });

  it('merges custom className', () => {
    render(
      <Card data-testid="card" className="extra">
        Content
      </Card>,
    );
    expect(screen.getByTestId('card')).toHaveClass('extra');
  });
});

describe('CardHeader', () => {
  it('renders with data-slot="card-header"', () => {
    render(<CardHeader data-testid="header">Header</CardHeader>);
    expect(screen.getByTestId('header')).toHaveAttribute(
      'data-slot',
      'card-header',
    );
  });
});

describe('CardTitle', () => {
  it('renders with data-slot="card-title"', () => {
    render(<CardTitle data-testid="title">Title</CardTitle>);
    expect(screen.getByTestId('title')).toHaveAttribute(
      'data-slot',
      'card-title',
    );
    expect(screen.getByTestId('title')).toHaveTextContent('Title');
  });
});

describe('CardDescription', () => {
  it('renders with data-slot="card-description"', () => {
    render(<CardDescription data-testid="desc">Desc</CardDescription>);
    expect(screen.getByTestId('desc')).toHaveAttribute(
      'data-slot',
      'card-description',
    );
  });
});

describe('CardAction', () => {
  it('renders with data-slot="card-action"', () => {
    render(<CardAction data-testid="action">Action</CardAction>);
    expect(screen.getByTestId('action')).toHaveAttribute(
      'data-slot',
      'card-action',
    );
  });
});

describe('CardContent', () => {
  it('renders with data-slot="card-content"', () => {
    render(<CardContent data-testid="content">Body</CardContent>);
    expect(screen.getByTestId('content')).toHaveAttribute(
      'data-slot',
      'card-content',
    );
  });
});

describe('CardFooter', () => {
  it('renders with data-slot="card-footer"', () => {
    render(<CardFooter data-testid="footer">Footer</CardFooter>);
    expect(screen.getByTestId('footer')).toHaveAttribute(
      'data-slot',
      'card-footer',
    );
  });
});

describe('Card composition', () => {
  it('renders a full card with all sub-components', () => {
    render(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>My Title</CardTitle>
          <CardDescription>My Description</CardDescription>
          <CardAction>Action</CardAction>
        </CardHeader>
        <CardContent>Body content</CardContent>
        <CardFooter>Footer content</CardFooter>
      </Card>,
    );
    expect(screen.getByText('My Title')).toBeInTheDocument();
    expect(screen.getByText('My Description')).toBeInTheDocument();
    expect(screen.getByText('Body content')).toBeInTheDocument();
    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });
});
