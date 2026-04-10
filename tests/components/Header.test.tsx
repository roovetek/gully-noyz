import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Header } from '../../src/components/Header';

describe('Header', () => {
  it('renders Home and Gully Rulz links and handles clicks', async () => {
    const user = userEvent.setup();
    const onHome = vi.fn();
    const onOpenGullyRulz = vi.fn();

    render(<Header highlight="none" onHome={onHome} onOpenGullyRulz={onOpenGullyRulz} />);

    const homeButton = screen.getByRole('button', { name: /home/i });
    const rulzButton = screen.getByRole('button', { name: /gully rulz/i });

    expect(homeButton).toBeInTheDocument();
    expect(rulzButton).toBeInTheDocument();

    await user.click(homeButton);
    await user.click(rulzButton);

    expect(onHome).toHaveBeenCalledTimes(1);
    expect(onOpenGullyRulz).toHaveBeenCalledTimes(1);
  });

  it('applies active/inactive class styles based on highlight', () => {
    const { rerender } = render(
      <Header highlight="home" onHome={vi.fn()} onOpenGullyRulz={vi.fn()} />
    );

    const homeButton = screen.getByRole('button', { name: /home/i });
    const rulzButton = screen.getByRole('button', { name: /gully rulz/i });

    expect(homeButton.className).toContain('font-bold');
    expect(rulzButton.className).toContain('font-semibold');
    expect(homeButton.className).toContain('text-green-400');
    expect(rulzButton.className).toContain('text-blue-400');

    rerender(<Header highlight="gullyRulz" onHome={vi.fn()} onOpenGullyRulz={vi.fn()} />);
    expect(screen.getByRole('button', { name: /gully rulz/i }).className).toContain('font-bold');
  });
});

