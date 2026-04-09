import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Record } from '../../src/components/Record';

vi.mock('../../src/context/MatchContext', () => ({
  useMatch: () => ({ matchId: 'match-123' }),
}));

vi.mock('../../src/components/VideoCapture', () => ({
  VideoCapture: () => <div data-testid="video-capture">capture</div>,
}));

vi.mock('../../src/components/MatchHeaderSummary', () => ({
  MatchHeaderSummary: () => <div data-testid="match-header-summary">summary</div>,
}));

vi.mock('../../src/components/MatchPageSummaryStrip', () => ({
  MatchPageSummaryStrip: ({ children }: { children: ReactNode }) => (
    <div data-testid="match-page-summary-strip">{children}</div>
  ),
}));

describe('Record layout', () => {
  it.each([640, 932])('renders capture layout at viewport height %ipx', (viewportHeight) => {
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: viewportHeight,
    });

    const { container } = render(<Record />);
    const root = container.firstElementChild as HTMLElement;
    const captureWrapper = root.querySelector('div.relative.min-h-0.flex-1.overflow-hidden');

    expect(root).toBeInTheDocument();
    expect(captureWrapper).toBeTruthy();
    expect(screen.getByTestId('video-capture')).toBeInTheDocument();
  });

  it('uses in-flow flex layout instead of fixed positioning', () => {
    const { container } = render(<Record />);
    const root = container.firstElementChild as HTMLElement;

    expect(root).toBeInTheDocument();
    expect(root.className).toContain('flex-1');
    expect(root.className).toContain('min-h-0');
    expect(root.className).not.toContain('fixed');
    expect(root.className).not.toContain('inset-0');
    expect(root.className).toContain('pb-20');
  });

  it('keeps a dedicated flex capture wrapper for VideoCapture', () => {
    const { container } = render(<Record />);
    const root = container.firstElementChild as HTMLElement;
    const captureWrapper = root.querySelector('div.relative.min-h-0.flex-1.overflow-hidden');

    expect(screen.getByTestId('video-capture')).toBeInTheDocument();
    expect(screen.getByTestId('match-page-summary-strip')).toBeInTheDocument();
    expect(screen.getByTestId('match-header-summary')).toBeInTheDocument();
    expect(captureWrapper).toBeTruthy();
  });
});
