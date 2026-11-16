import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageLoader } from '../components/PageLoader';

describe('PageLoader', () => {
  it('renders a polite status region with loading text', () => {
    render(<PageLoader />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Loading');
  });
});
