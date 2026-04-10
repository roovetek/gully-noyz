import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateMatchModal } from '../../src/components/CreateMatchModal';

const defaultRules = {
  overs_per_innings: 20,
  balls_per_over: 6,
  max_wickets: 10,
  max_overs_per_bowler: 4,
  wide_no_runs: false,
  wide_no_ball_count: true,
  legbye_no_runs: false,
  consecutive_overs_required: false,
};

const {
  getGlobalRulesMock,
  executeTrackedActionMock,
  createMatchAccessMock,
  userFriendlyMessageMock,
} = vi.hoisted(() => ({
  getGlobalRulesMock: vi.fn(),
  executeTrackedActionMock: vi.fn(),
  createMatchAccessMock: vi.fn(async () => undefined),
  userFriendlyMessageMock: vi.fn(() => 'Friendly create error'),
}));

vi.mock('../../src/lib/rulesEngine', () => ({
  getGlobalRules: getGlobalRulesMock,
}));

vi.mock('../../src/lib/supabase', () => ({
  executeTrackedAction: executeTrackedActionMock,
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(async () => ({ error: null })),
    })),
  },
}));

vi.mock('../../src/lib/accessControl', () => ({
  createMatchAccess: createMatchAccessMock,
}));

vi.mock('../../src/lib/match', () => ({
  generateMatchId: () => 'ABC123',
}));

vi.mock('../../src/lib/security', () => ({
  hashSecret: vi.fn(async () => 'hashed-secret'),
}));

vi.mock('../../src/lib/userFriendlyError', () => ({
  userFriendlyMessage: userFriendlyMessageMock,
}));

describe('CreateMatchModal', () => {
  const onClose = vi.fn();
  const onMatchCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    getGlobalRulesMock.mockResolvedValue(defaultRules);
    executeTrackedActionMock.mockImplementation(async ({ execute }: { execute: () => Promise<unknown> }) => {
      await execute();
      return { error: null };
    });
  });

  it('renders key fields and action buttons', async () => {
    render(<CreateMatchModal onClose={onClose} onMatchCreated={onMatchCreated} />);

    await screen.findByText('Create New Match');
    expect(screen.getByPlaceholderText('e.g., India vs Pakistan Finals')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Set a passcode for the umpire')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Match' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('validates required fields and passcode minimum length', async () => {
    const user = userEvent.setup();
    render(<CreateMatchModal onClose={onClose} onMatchCreated={onMatchCreated} />);

    await screen.findByText('Create New Match');
    await user.click(screen.getByRole('button', { name: 'Create Match' }));
    expect(screen.getByText(/please enter a match name/i)).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('e.g., India vs Pakistan Finals'), 'A');
    await user.click(screen.getByRole('button', { name: 'Create Match' }));
    expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText('e.g., India vs Pakistan Finals'));
    await user.type(screen.getByPlaceholderText('e.g., India vs Pakistan Finals'), 'Valid Match Name');
    await user.click(screen.getByRole('button', { name: 'Create Match' }));
    expect(screen.getByText(/umpire passcode must be at least 4 characters/i)).toBeInTheDocument();
  });

  it('requires secret for private matches and allows public matches without secret', async () => {
    const user = userEvent.setup();
    render(<CreateMatchModal onClose={onClose} onMatchCreated={onMatchCreated} />);

    await screen.findByText('Create New Match');

    await user.type(screen.getByPlaceholderText('e.g., India vs Pakistan Finals'), 'Private Match');
    await user.type(screen.getByPlaceholderText('Set a passcode for the umpire'), '1234');

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Create Match' }));
    expect(screen.getByText(/please enter a secret/i)).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Create Match' }));
    await waitFor(() => {
      expect(onMatchCreated).toHaveBeenCalledWith('ABC123', undefined, 'Private Match');
    });
  });

  it('toggles customize rules mode', async () => {
    const user = userEvent.setup();
    render(<CreateMatchModal onClose={onClose} onMatchCreated={onMatchCreated} />);

    await screen.findByText('Create New Match');
    expect(screen.getByRole('button', { name: 'Toggle customize rules' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Toggle customize rules' }));
    expect(screen.getByText('Use Defaults')).toBeInTheDocument();
  });

  it('shows loading state while create request is in-flight', async () => {
    const user = userEvent.setup();
    executeTrackedActionMock.mockImplementation(
      () =>
        new Promise(() => {
          // keep pending to assert loading state
        })
    );

    render(<CreateMatchModal onClose={onClose} onMatchCreated={onMatchCreated} />);

    await screen.findByText('Create New Match');
    await user.type(screen.getByPlaceholderText('e.g., India vs Pakistan Finals'), 'Pending Match');
    await user.type(screen.getByPlaceholderText('Set a passcode for the umpire'), '1234');
    await user.click(screen.getByRole('button', { name: 'Create Match' }));

    expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('shows user-friendly error message when create fails', async () => {
    const user = userEvent.setup();
    executeTrackedActionMock.mockResolvedValue({ error: new Error('insert failed') });

    render(<CreateMatchModal onClose={onClose} onMatchCreated={onMatchCreated} />);

    await screen.findByText('Create New Match');
    await user.type(screen.getByPlaceholderText('e.g., India vs Pakistan Finals'), 'Error Match');
    await user.type(screen.getByPlaceholderText('Set a passcode for the umpire'), '1234');
    await user.click(screen.getByRole('button', { name: 'Create Match' }));

    await screen.findByText('Friendly create error');
    expect(userFriendlyMessageMock).toHaveBeenCalled();
  });

  it('calls onClose from cancel and top-right close buttons', async () => {
    const user = userEvent.setup();
    const { container } = render(<CreateMatchModal onClose={onClose} onMatchCreated={onMatchCreated} />);

    await screen.findByText('Create New Match');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    const iconCloseButton = container.querySelector('div.flex.items-center.justify-between button');
    expect(iconCloseButton).toBeTruthy();
    if (iconCloseButton) {
      await user.click(iconCloseButton as HTMLButtonElement);
    }
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

