import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Header } from '../../src/components/Header';

describe('Header', () => {
  it('renders Home, Gully Rulz and Video Analysis links and handles clicks', async () => {
    const user = userEvent.setup();
    const onHome = vi.fn();
    const onOpenGullyRulz = vi.fn();
    const onOpenVideoAnalysis = vi.fn();
    const onOpenVideoAnalysisBrowser = vi.fn();

    render(
      <Header
        highlight="none"
        onHome={onHome}
        onOpenGullyRulz={onOpenGullyRulz}
        onOpenVideoAnalysis={onOpenVideoAnalysis}
        onOpenVideoAnalysisBrowser={onOpenVideoAnalysisBrowser}
      />
    );

    const homeButton = screen.getByRole('button', { name: /home/i });
    const rulzButton = screen.getByRole('button', { name: /gully rulz/i });
    const videoAnalysisButton = screen.getByRole('button', { name: /video/i });
    const browserLabButton = screen.getByRole('button', { name: /lab/i });

    expect(homeButton).toBeInTheDocument();
    expect(rulzButton).toBeInTheDocument();
    expect(videoAnalysisButton).toBeInTheDocument();
    expect(browserLabButton).toBeInTheDocument();

    await user.click(homeButton);
    await user.click(rulzButton);
    await user.click(videoAnalysisButton);
    await user.click(browserLabButton);

    expect(onHome).toHaveBeenCalledTimes(1);
    expect(onOpenGullyRulz).toHaveBeenCalledTimes(1);
    expect(onOpenVideoAnalysis).toHaveBeenCalledTimes(1);
    expect(onOpenVideoAnalysisBrowser).toHaveBeenCalledTimes(1);
  });

  it('applies active/inactive class styles based on highlight', () => {
    const { rerender } = render(
      <Header
        highlight="home"
        onHome={vi.fn()}
        onOpenGullyRulz={vi.fn()}
        onOpenVideoAnalysis={vi.fn()}
        onOpenVideoAnalysisBrowser={vi.fn()}
      />
    );

    const homeButton = screen.getByRole('button', { name: /home/i });
    const rulzButton = screen.getByRole('button', { name: /gully rulz/i });
    const videoAnalysisButton = screen.getByRole('button', { name: /video/i });

    expect(homeButton.className).toContain('font-bold');
    expect(rulzButton.className).toContain('font-semibold');
    expect(videoAnalysisButton.className).toContain('font-semibold');
    expect(homeButton.className).toContain('text-green-400');
    expect(rulzButton.className).toContain('text-blue-400');
    expect(videoAnalysisButton.className).toContain('text-rose-400');

    rerender(
      <Header
        highlight="gullyRulz"
        onHome={vi.fn()}
        onOpenGullyRulz={vi.fn()}
        onOpenVideoAnalysis={vi.fn()}
        onOpenVideoAnalysisBrowser={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /gully rulz/i }).className).toContain('font-bold');

    rerender(
      <Header
        highlight="videoAnalysis"
        onHome={vi.fn()}
        onOpenGullyRulz={vi.fn()}
        onOpenVideoAnalysis={vi.fn()}
        onOpenVideoAnalysisBrowser={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /video/i }).className).toContain('font-bold');

    rerender(
      <Header
        highlight="videoAnalysisBrowser"
        onHome={vi.fn()}
        onOpenGullyRulz={vi.fn()}
        onOpenVideoAnalysis={vi.fn()}
        onOpenVideoAnalysisBrowser={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /lab/i }).className).toContain('font-bold');
  });
});

