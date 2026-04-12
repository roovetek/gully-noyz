import { describe, expect, it } from 'vitest';
import { groundVoiceIntent } from '../voiceOutcomeMapper';

describe('groundVoiceIntent', () => {
  it('maps Florence to four with slang confidence', () => {
    const result = groundVoiceIntent('Florence');

    expect(result.outcome).toBe('4');
    expect(result.batterRuns).toBe(4);
    expect(result.confidence).toBe(0.95);
  });

  it('maps White to wide with slang confidence', () => {
    const result = groundVoiceIntent('White');

    expect(result.outcome).toBe('wide');
    expect(result.extraType).toBe('wide');
    expect(result.extraRuns).toBe(1);
    expect(result.confidence).toBe(0.95);
  });

  it('maps Sick to six with slang confidence', () => {
    const result = groundVoiceIntent('Sick');

    expect(result.outcome).toBe('6');
    expect(result.batterRuns).toBe(6);
    expect(result.confidence).toBe(0.95);
  });

  it('parses obstructing the field from the wicket lexicon', () => {
    const result = groundVoiceIntent('obstructing the field');

    expect(result.outcome).toBe('wicket');
    expect(result.dismissalType).toBe('obstructing');
    expect(result.requiresManualConfirmation).toBe(false);
  });

  it('keeps no ball and four as two distinct data points', () => {
    const result = groundVoiceIntent('No ball and four');

    expect(result.outcome).toBe('4');
    expect(result.batterRuns).toBe(4);
    expect(result.extraType).toBe('noball');
    expect(result.extraRuns).toBe(1);
  });

  it('requires wicket type for plain wicket outcomes', () => {
    const result = groundVoiceIntent('wicket');

    expect(result.requiresManualConfirmation).toBe(true);
    expect(result.confirmationReasons).toContain('wicket-type-required');
  });

  it('uses ambiguous confidence for fuzzy sounds', () => {
    const result = groundVoiceIntent('wyd');

    expect(result.confidence).toBe(0.4);
    expect(result.requiresManualConfirmation).toBe(true);
  });
});