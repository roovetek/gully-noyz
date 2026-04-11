export interface ParsedOutcome {
  rawTranscript: string;
  confidence: number;
  outcome?: string;
}

export function parseOutcome(transcript: string): ParsedOutcome {
  return {
    rawTranscript: transcript,
    confidence: 0.8,
    outcome: transcript,
  };
}
