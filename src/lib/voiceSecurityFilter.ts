import DOMPurify from 'dompurify';

export interface SanitizedVoiceData {
  raw_transcript: string;
  sanitized_transcript: string;
  is_safe: boolean;
}

export function sanitizeTranscript(rawTranscript: string): SanitizedVoiceData {
  if (!rawTranscript || typeof rawTranscript !== 'string') {
    return {
      raw_transcript: '',
      sanitized_transcript: '',
      is_safe: true,
    };
  }

  const trimmed = rawTranscript.trim();
  const sanitized = DOMPurify.sanitize(trimmed, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });

  const is_safe = sanitized === trimmed;

  return {
    raw_transcript: trimmed,
    sanitized_transcript: sanitized,
    is_safe,
  };
}

export function sanitizeForSpeechSynthesis(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
}

export function isTranscriptSafe(transcript: string): boolean {
  const sanitized = sanitizeTranscript(transcript);
  return sanitized.is_safe;
}
