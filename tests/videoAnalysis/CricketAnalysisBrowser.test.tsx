import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CricketAnalysisBrowser } from '../../src/components/videoAnalysis/CricketAnalysisBrowser';

describe('CricketAnalysisBrowser', () => {
  it('renders local-processing disclaimer and scan control', () => {
    const onOpenServerAnalysis = vi.fn();
    render(<CricketAnalysisBrowser onOpenServerAnalysis={onOpenServerAnalysis} />);

    expect(screen.getByText(/Pose runs in your browser via MediaPipe WASM/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /run browser pose scan/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /server \/ gpu analysis/i })).toBeInTheDocument();
  });
});
