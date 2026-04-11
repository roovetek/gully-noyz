import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VideoCapture } from '../../src/components/VideoCapture';

vi.mock('../../src/context/MatchContext', () => ({
  useMatch: () => ({ matchId: 'TEST01' }),
}));

vi.mock('../../src/context/MatchClipsContext', () => ({
  useMatchClips: () => hoisted.stableMatchClips,
}));

vi.mock('../../src/lib/accessControl', () => ({
  validateRole: vi.fn(async () => true),
}));

vi.mock('../../src/lib/rulesEngine', () => ({
  DEFAULT_GLOBAL_RULES: {
    overs_per_innings: 20,
    balls_per_over: 6,
    max_wickets: 10,
    max_overs_per_bowler: 4,
    wide_no_runs: false,
    wide_no_ball_count: true,
    legbye_no_runs: false,
    consecutive_overs_required: false,
  },
  getEffectiveRules: vi.fn(async () => ({
    overs_per_innings: 20,
    balls_per_over: 6,
    max_wickets: 10,
    max_overs_per_bowler: 4,
    wide_no_runs: false,
    wide_no_ball_count: true,
    legbye_no_runs: false,
    consecutive_overs_required: false,
  })),
}));

const hoisted = vi.hoisted(() => {
  const stableClips: never[] = [];
  const stableMatchClips = {
    matchId: 'TEST01',
    clips: stableClips,
    inn1: { runs: 0, wickets: 0, overs: '0' },
    inn2: { runs: 0, wickets: 0, overs: '0' },
    loading: false,
    currentInnings: 1,
    ballsPerOver: 6,
    totalOvers: 20,
    refresh: vi.fn(async () => {}),
  };
  const supabase = {
    from: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(),
      })),
    })),
    removeChannel: vi.fn(),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(async () => ({ error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/clip.webm' } })),
      })),
    },
  } as any;
  const makeMatchesQuery = () => ({
    eq: vi.fn(() => ({
      maybeSingle: vi.fn(async () => ({
        data: { balls_per_over: 6, total_overs: 20, current_innings: 1 },
        error: null,
      })),
    })),
  });

  const makeClipsQuery = () => ({
    eq: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => ({
          order: vi.fn(() => ({
            order: vi.fn(async () => ({ data: [], error: null })),
          })),
        })),
      })),
    })),
  });

  const makeDeliveryIndexQuery = () => ({
    eq: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(async () => ({ data: [], error: null })),
      })),
    })),
  });

  supabase.from = vi.fn((table: string) => {
    if (table === 'matches') return { select: vi.fn(() => makeMatchesQuery()) };
    if (table === 'clips') {
      return {
        select: vi.fn((columns: string) => {
          if (columns.includes('delivery_index') && !columns.includes('outcome')) {
            return makeDeliveryIndexQuery();
          }
          return makeClipsQuery();
        }),
      };
    }
    return {
      select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: null, error: null })) })) })),
    };
  });
  return { supabase, stableMatchClips };
});

vi.mock('../../src/lib/supabase', () => {
  return {
    isAuditLoggingEnabled: false,
    executeTrackedAction: vi.fn(async ({ execute }: any) => execute()),
    supabase: hoisted.supabase,
  };
});

describe('VideoCapture smoke', () => {
  it('renders record HUD without crashing', async () => {
    render(<VideoCapture />);

    await waitFor(() => {
      expect(screen.getByText('Innings 1')).toBeInTheDocument();
      expect(screen.getByText('Start Delivery')).toBeInTheDocument();
      expect(screen.getByText('AI Assist')).toBeInTheDocument();
    });
  });

  it('shows key outcome actions in drawer (dot/1/4/6/W/WD/NB)', async () => {
    const user = userEvent.setup();
    render(<VideoCapture />);

    await waitFor(() => {
      expect(screen.getByText('Innings 1')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Log outcome without recording' }));

    expect(screen.getByRole('button', { name: 'Outcome Dot' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Outcome 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Outcome 4' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Outcome 6' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Outcome wicket' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Outcome wide' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Outcome noball' })).toBeInTheDocument();
  });

  it('reveals dismissal select for wicket and keeps canonical ordering', async () => {
    const user = userEvent.setup();
    render(<VideoCapture />);

    await waitFor(() => {
      expect(screen.getByText('Innings 1')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Log outcome without recording' }));
    await user.click(screen.getByRole('button', { name: 'Outcome wicket' }));

    const dismissalLabel = screen.getByText('Type of Dismissal');
    expect(dismissalLabel).toBeInTheDocument();

    const comboboxes = screen.getAllByRole('combobox');
    const dismissalSelect = comboboxes[comboboxes.length - 1];
    const options = Array.from(dismissalSelect.querySelectorAll('option')).map((o) =>
      o.textContent?.trim()
    );

    expect(options[1]).toBe('Bowled');
    expect(options.at(-1)).toBe('Other');
  });

  it('allows changing AI Assist mode from Manual only', async () => {
    const user = userEvent.setup();
    render(<VideoCapture />);

    await waitFor(() => {
      expect(screen.getByText('AI Assist')).toBeInTheDocument();
    });

    const aiSelect = screen.getByRole('combobox', { name: 'AI assist mode' });
    await user.selectOptions(aiSelect, 'mock');

    expect(screen.getByText(/mode updated/i)).toBeInTheDocument();
    expect((aiSelect as HTMLSelectElement).value).toBe('mock');
  });
});

