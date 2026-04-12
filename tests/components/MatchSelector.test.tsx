import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MatchSelector } from '../../src/components/MatchSelector';

const {
  setMatchIdMock,
  setMatchNameMock,
  secureStorageGetItemMock,
  maybeSingleMock,
  selectMock,
  fromMock,
} = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return {
    setMatchIdMock: vi.fn(),
    setMatchNameMock: vi.fn(),
    secureStorageGetItemMock: vi.fn(() => null),
    maybeSingleMock: maybeSingle,
    selectMock: select,
    fromMock: from,
  };
});

vi.mock('../../src/context/MatchContext', () => ({
  useMatch: () => ({
    setMatchId: setMatchIdMock,
    setMatchName: setMatchNameMock,
  }),
}));

vi.mock('../../src/components/MatchList', () => ({
  MatchList: () => <div>Mock Match List</div>,
}));

vi.mock('../../src/components/CreateMatchModal', () => ({
  CreateMatchModal: () => <div>Mock Create Match Modal</div>,
}));

vi.mock('../../src/components/SecretPrompt', () => ({
  SecretPrompt: () => <div>Mock Secret Prompt</div>,
}));

vi.mock('../../src/lib/security', () => ({
  hashSecret: vi.fn(async () => 'hash'),
  verifySecret: vi.fn(async () => true),
  SecureStorage: {
    getItem: secureStorageGetItemMock,
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
}));

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: fromMock,
  },
}));

describe('MatchSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    secureStorageGetItemMock.mockReturnValue(null);
    maybeSingleMock.mockResolvedValue({
      data: { match_id: 'ABC123', name: 'Test Match', is_public: true },
      error: null,
    });
  });

  it('renders create, join, and browse actions', () => {
    render(<MatchSelector />);

    expect(screen.getByRole('button', { name: /create match/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /join match/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /browse all matches/i })).toBeInTheDocument();
  });

  it('opens create modal when clicking create match', async () => {
    const user = userEvent.setup();
    render(<MatchSelector />);

    await user.click(screen.getByRole('button', { name: /create match/i }));
    expect(screen.getByText('Mock Create Match Modal')).toBeInTheDocument();
  });

  it('shows validation error for empty and malformed match ids', async () => {
    const user = userEvent.setup();
    render(<MatchSelector />);

    await user.click(screen.getByRole('button', { name: /join match/i }));
    expect(screen.getByText(/please enter a match id/i)).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/enter match id/i), 'abc');
    await user.click(screen.getByRole('button', { name: /join match/i }));
    expect(screen.getByText(/match id must be 6 characters/i)).toBeInTheDocument();
  });

  it('joins public match and updates match context', async () => {
    const user = userEvent.setup();
    render(<MatchSelector />);

    await user.type(screen.getByPlaceholderText(/enter match id/i), 'abc123');
    await user.click(screen.getByRole('button', { name: /join match/i }));

    expect(fromMock).toHaveBeenCalledWith('matches');
    expect(selectMock).toHaveBeenCalledWith('match_id, name, is_public');
    expect(setMatchIdMock).toHaveBeenCalledWith('ABC123');
    expect(setMatchNameMock).toHaveBeenCalledWith('Test Match');
  });

  it('shows secret prompt for private match without stored secret', async () => {
    const user = userEvent.setup();
    maybeSingleMock.mockResolvedValueOnce({
      data: { match_id: 'ABC123', name: 'Private Match', is_public: false },
      error: null,
    });

    render(<MatchSelector />);
    await user.type(screen.getByPlaceholderText(/enter match id/i), 'ABC123');
    await user.click(screen.getByRole('button', { name: /join match/i }));

    expect(screen.getByText('Mock Secret Prompt')).toBeInTheDocument();
  });

  it('shows match list when clicking browse all matches', async () => {
    const user = userEvent.setup();
    render(<MatchSelector />);

    await user.click(screen.getByRole('button', { name: /browse all matches/i }));
    expect(screen.getByText('Mock Match List')).toBeInTheDocument();
  });
});

