import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../components/ErrorBoundary';

const Bomb = ({ explode }) => {
  if (explode) throw new Error('kaboom');
  return <p>All good</p>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when nothing throws', () => {
    render(<ErrorBoundary><Bomb explode={false} /></ErrorBoundary>);
    expect(screen.getByText('All good')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('renders the fallback with the error message on throw', () => {
    render(<ErrorBoundary><Bomb explode /></ErrorBoundary>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('This screen could not be shown')).toBeInTheDocument();
    expect(screen.getByText('kaboom')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
  });

  it('recovers when Try again is clicked and the child no longer throws', () => {
    let setExplode;
    const Harness = () => {
      const [explode, set] = useState(true);
      setExplode = set;
      return <ErrorBoundary><Bomb explode={explode} /></ErrorBoundary>;
    };
    render(<Harness />);
    expect(screen.getByRole('alert')).toBeInTheDocument();

    setExplode(false);
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('All good')).toBeInTheDocument();
  });
});
