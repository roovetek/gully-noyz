import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MatchList } from '../../src/components/MatchList';
import { MatchProvider } from '../../src/context/MatchContext';

const hoisted = vi.hoisted(() => {
  const supabase = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(),
      })),
    })),
    removeChannel: vi.fn(),
  } as any;
  return { supabase };
});

vi.mock('../../src/lib/supabase', () => ({
  isAuditLoggingEnabled: false,
  executeTrackedAction: vi.fn(async ({ execute }: any) => execute()),
  supabase: hoisted.supabase,
}));

describe('MatchList', () => {
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render match list heading', async () => {
    render(
      <MatchProvider>
        <MatchList onBack={mockOnBack} />
      </MatchProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('All Matches')).toBeInTheDocument();
    });
  });

  it('should show no matches message when empty', async () => {
    render(
      <MatchProvider>
        <MatchList onBack={mockOnBack} />
      </MatchProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('No matches yet')).toBeInTheDocument();
    });
  });
});
