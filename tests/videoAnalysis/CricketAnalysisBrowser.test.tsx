import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CricketAnalysisBrowser } from '../../src/components/videoAnalysis/CricketAnalysisBrowser';

describe('CricketAnalysisBrowser', () => {
  it('renders local-processing disclaimer and scan control', () => {
    const onOpenServerAnalysis = vi.fn();
    render(<CricketAnalysisBrowser onOpenServerAnalysis={onOpenServerAnalysis} />);

    expect(screen.getByText(/Pose runs in your browser via MediaPipe WASM/i)).toBeInTheDocument();
    expect(screen.getByText(/Primary wrist only changes which wrist path is used/i)).toBeInTheDocument();
    expect(screen.getByText(/Browser pose scan defaults/i)).toBeInTheDocument();
    expect(screen.getByText(/Sample step: 0.12s per frame/i)).toBeInTheDocument();
    expect(screen.getByText(/Chooses batting or bowling heuristics/i)).toBeInTheDocument();
    expect(screen.getByText(/Controls how many trajectory points remain visible/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /run browser pose scan/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /server \/ gpu analysis/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /browser pose controls/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Focus Mode/i)).not.toBeInTheDocument();
  });
});
