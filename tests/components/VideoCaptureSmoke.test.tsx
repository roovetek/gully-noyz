import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { VideoCapture } from '../../src/components/VideoCapture';

vi.mock('../../src/context/MatchContext', () => ({
  useMatch: () => ({ matchId: 'TEST01' }),
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

vi.mock('../../src/lib/supabase', async () => {
  const actual = await vi.importActual<typeof import('../../src/lib/supabase')>('../../src/lib/supabase');

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

  return {
    ...actual,
    executeTrackedAction: vi.fn(async ({ execute }) => execute()),
    supabase: {
      ...actual.supabase,
      from: vi.fn((table: string) => {
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
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: null, error: null })) })) })) };
      }),
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
    },
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
});

