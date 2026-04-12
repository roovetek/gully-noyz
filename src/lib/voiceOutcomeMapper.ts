import { distance } from 'fastest-levenshtein';
import { sanitizeForSpeechSynthesis, sanitizeTranscript } from './voiceSecurityFilter';

const CRICKET_LEXICON = {
	RUNS: [
		'dot',
		'zero',
		'one',
		'two',
		'three',
		'four',
		'six',
		'boundary',
		'maximum',
		'single',
		'double',
		'triple',
	],
	EXTRAS: [
		'wide',
		'no ball',
		'overstep',
		'height',
		'waist high',
		'bye',
		'leg bye',
		'penalty',
		'dead ball',
		'free hit',
	],
	WICKETS: [
		'bowled',
		'caught',
		'lbw',
		'stumped',
		'run out',
		'hit wicket',
		'retired out',
		'timed out',
		'obstructing the field',
	],
	SLANG: {
		gone: 'wicket',
		'got him': 'wicket',
		howzat: 'wicket',
		florence: 'four',
		white: 'wide',
		sick: 'six',
		bold: 'bowled',
		coat: 'caught',
	},
} as const;

const EXACT_CONFIDENCE = 0.8;
const SLANG_CONFIDENCE = 0.95;
const AMBIGUOUS_CONFIDENCE = 0.4;
const FUZZY_THRESHOLD = 0.72;
const AMBIGUOUS_THRESHOLD = 0.55;

export type VoiceExtraType = 'wide' | 'noball' | 'bye' | 'legbye';

type FuzzyMatch = {
	term: string;
	candidate: string;
	score: number;
};

type RunInterpretation = {
	outcome: string;
	batterRuns: number;
	label: string;
};

export interface ParsedVoiceResult {
	outcome: string;
	value: number;
	isWicket: boolean;
	dismissalType?: string;
	batterRuns?: number;
	extraRuns?: number;
	extraType?: VoiceExtraType | null;
	confidence: number;
	displayLabel: string;
	requiresManualConfirmation?: boolean;
	confirmationReasons?: string[];
	sanitizedTranscript: string;
}

export function groundVoiceIntent(transcript: string): ParsedVoiceResult {
	const sanitizedTranscript = sanitizeTranscript(transcript).sanitized_transcript;
	const normalizedTranscript = normalizeTranscript(sanitizedTranscript);

	for (const [slang, target] of Object.entries(CRICKET_LEXICON.SLANG)) {
		if (normalizedTranscript.includes(slang)) {
			return resolveIntent(
				normalizedTranscript.replace(slang, target),
				SLANG_CONFIDENCE,
				sanitizedTranscript
			);
		}
	}

	const fuzzySlang = getBestFuzzyMatch(
		buildCandidatePhrases(normalizedTranscript),
		Object.keys(CRICKET_LEXICON.SLANG)
	);

	if (fuzzySlang && fuzzySlang.score >= FUZZY_THRESHOLD) {
		const target = CRICKET_LEXICON.SLANG[
			fuzzySlang.term as keyof typeof CRICKET_LEXICON.SLANG
		];

		return resolveIntent(
			normalizedTranscript.replace(fuzzySlang.candidate, target),
			AMBIGUOUS_CONFIDENCE,
			sanitizedTranscript,
			['fuzzy-match']
		);
	}

	return resolveIntent(normalizedTranscript, EXACT_CONFIDENCE, sanitizedTranscript);
}

function normalizeTranscript(text: string): string {
	return text
		.toLowerCase()
		.replace(/-/g, ' ')
		.replace(/[^a-z0-9\s]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function buildCandidatePhrases(text: string): string[] {
	const tokens = text.split(' ').filter(Boolean);
	const phrases = new Set<string>([text]);

	for (let start = 0; start < tokens.length; start += 1) {
		for (let length = 1; length <= 4 && start + length <= tokens.length; length += 1) {
			phrases.add(tokens.slice(start, start + length).join(' '));
		}
	}

	return Array.from(phrases);
}

function similarityScore(left: string, right: string): number {
	const maxLength = Math.max(left.length, right.length, 1);
	return 1 - distance(left, right) / maxLength;
}

function getBestFuzzyMatch(candidates: string[], terms: string[]): FuzzyMatch | null {
	let best: FuzzyMatch | null = null;

	for (const candidate of candidates) {
		for (const term of terms) {
			const score = similarityScore(candidate, term);
			if (!best || score > best.score) {
				best = { term, candidate, score };
			}
		}
	}

	return best;
}

function interpretRunToken(token: string | null): RunInterpretation | null {
	if (!token) return null;

	if (token === 'dot' || token === 'zero') {
		return { outcome: 'dot', batterRuns: 0, label: 'Dot ball' };
	}
	if (token === 'one' || token === 'single') {
		return { outcome: '1', batterRuns: 1, label: 'One run' };
	}
	if (token === 'two' || token === 'double') {
		return { outcome: '2', batterRuns: 2, label: 'Two runs' };
	}
	if (token === 'three' || token === 'triple') {
		return { outcome: '3', batterRuns: 3, label: 'Three runs' };
	}
	if (token === 'four' || token === 'boundary') {
		return { outcome: '4', batterRuns: 4, label: 'Four' };
	}
	if (token === 'six' || token === 'maximum') {
		return { outcome: '6', batterRuns: 6, label: 'Six' };
	}

	return null;
}

function mapDigitToRunToken(value: number | null): string | null {
	if (value === null) return null;

	const lookup: Record<number, string | null> = {
		0: 'zero',
		1: 'one',
		2: 'two',
		3: 'three',
		4: 'four',
		5: null,
		6: 'six',
	};

	return lookup[value] ?? null;
}

function mapDismissalTerm(term: string | null): string | undefined {
	if (!term) return undefined;
	if (term === 'run out') return 'runout';
	if (term === 'hit wicket') return 'hitwicket';
	if (term === 'timed out') return 'timedout';
	if (term === 'obstructing the field') return 'obstructing';
	if (term === 'retired out') return 'retiredout';
	return term.replace(/\s+/g, '');
}

function resolveIntent(
	text: string,
	baseConfidence: number,
	sanitizedTranscript: string,
	seededReasons: string[] = []
): ParsedVoiceResult {
	const normalized = normalizeTranscript(text);
	const phrases = buildCandidatePhrases(normalized);
	const numbers = extractNumbers(normalized);
	const runInterpretation =
		interpretRunToken(CRICKET_LEXICON.RUNS.find((term) => phrases.includes(term)) ?? null) ||
		interpretRunToken(mapDigitToRunToken(numbers.primaryNumber));
	const dismissalToken = CRICKET_LEXICON.WICKETS.find((term) => phrases.includes(term)) ?? null;
	const fuzzyCanonical = getBestFuzzyMatch(
		phrases,
		[...CRICKET_LEXICON.RUNS, ...CRICKET_LEXICON.EXTRAS, ...CRICKET_LEXICON.WICKETS]
	);

	const hasWide = phrases.includes('wide') || phrases.includes('waist high');
	const hasNoBall = phrases.includes('no ball') || phrases.includes('overstep');
	const hasBye = phrases.includes('bye') && !phrases.includes('leg bye');
	const hasLegBye = phrases.includes('leg bye');
	const hasWicket =
		phrases.includes('wicket') ||
		phrases.includes('out') ||
		phrases.includes('dismissed') ||
		dismissalToken !== null;
	const hasRunSignal = runInterpretation !== null || normalized.includes('no run');
	const extrasKinds = [hasWide, hasNoBall, hasBye, hasLegBye].filter(Boolean).length;

	let outcome = 'dot';
	let value = 0;
	let isWicket = false;
	let batterRuns = 0;
	let extraRuns = 0;
	let extraType: VoiceExtraType | null = null;
	let dismissalType = mapDismissalTerm(dismissalToken);
	let confidence = baseConfidence;
	let displayLabel = 'Dot ball';
	let requiresManualConfirmation = false;
	const confirmationReasons = [...seededReasons];

	if (hasNoBall && runInterpretation && runInterpretation.batterRuns > 0) {
		outcome = runInterpretation.outcome;
		value = runInterpretation.batterRuns;
		batterRuns = runInterpretation.batterRuns;
		extraRuns = 1;
		extraType = 'noball';
		displayLabel = `No ball and ${runInterpretation.label.toLowerCase()}`;
		confidence += 0.08;
	} else if (hasWide) {
		outcome = 'wide';
		value = numbers.primaryNumber ?? 1;
		extraRuns = value;
		extraType = 'wide';
		displayLabel = value > 1 ? `Wide, ${value} runs` : 'Wide';
		confidence += 0.1;
	} else if (hasNoBall) {
		outcome = 'noball';
		value = numbers.primaryNumber ?? 0;
		extraRuns = value > 0 ? value : 1;
		extraType = 'noball';
		displayLabel = value > 0 ? `No ball, ${value} extra runs` : 'No ball';
		confidence += 0.1;
	} else if (hasBye) {
		outcome = 'bye';
		value = numbers.primaryNumber ?? 0;
		extraRuns = value;
		extraType = 'bye';
		displayLabel = value > 0 ? `Bye, ${value} runs` : 'Bye';
		confidence += 0.05;
	} else if (hasLegBye) {
		outcome = 'legbye';
		value = numbers.primaryNumber ?? 0;
		extraRuns = value;
		extraType = 'legbye';
		displayLabel = value > 0 ? `Leg bye, ${value} runs` : 'Leg bye';
		confidence += 0.05;
	} else if (hasWicket) {
		outcome = 'wicket';
		isWicket = true;
		displayLabel = dismissalType ? `Wicket, ${dismissalType}` : 'Wicket';
		confidence += dismissalType ? 0.12 : 0.05;
		if (!dismissalType) {
			confidence -= 0.2;
			requiresManualConfirmation = true;
			confirmationReasons.push('wicket-type-required');
		}
	} else if (runInterpretation) {
		outcome = runInterpretation.outcome;
		value = runInterpretation.batterRuns;
		batterRuns = runInterpretation.batterRuns;
		displayLabel = runInterpretation.label;
		confidence += 0.1;
	} else if (normalized.includes('no run') || numbers.primaryNumber === 0) {
		outcome = 'dot';
		displayLabel = 'Dot ball';
		confidence += 0.1;
	} else if (fuzzyCanonical && fuzzyCanonical.score >= FUZZY_THRESHOLD) {
		confidence = AMBIGUOUS_CONFIDENCE;
		requiresManualConfirmation = true;
		confirmationReasons.push('fuzzy-match');

		if (CRICKET_LEXICON.RUNS.includes(fuzzyCanonical.term as (typeof CRICKET_LEXICON.RUNS)[number])) {
			const fuzzyRun = interpretRunToken(fuzzyCanonical.term);
			if (fuzzyRun) {
				outcome = fuzzyRun.outcome;
				value = fuzzyRun.batterRuns;
				batterRuns = fuzzyRun.batterRuns;
				displayLabel = fuzzyRun.label;
			}
		} else if (CRICKET_LEXICON.WICKETS.includes(fuzzyCanonical.term as (typeof CRICKET_LEXICON.WICKETS)[number])) {
			outcome = 'wicket';
			isWicket = true;
			dismissalType = mapDismissalTerm(fuzzyCanonical.term);
			displayLabel = dismissalType ? `Wicket, ${dismissalType}` : 'Wicket';
		} else if (fuzzyCanonical.term === 'leg bye') {
			outcome = 'legbye';
			extraType = 'legbye';
			displayLabel = 'Leg bye';
		} else if (fuzzyCanonical.term === 'bye') {
			outcome = 'bye';
			extraType = 'bye';
			displayLabel = 'Bye';
		} else if (fuzzyCanonical.term === 'no ball' || fuzzyCanonical.term === 'overstep') {
			outcome = 'noball';
			extraRuns = 1;
			extraType = 'noball';
			displayLabel = 'No ball';
		} else {
			outcome = 'wide';
			extraRuns = 1;
			extraType = 'wide';
			displayLabel = 'Wide';
		}
	}

	if (extrasKinds > 1) {
		confidence -= 0.35;
		requiresManualConfirmation = true;
		confirmationReasons.push('conflicting-extras');
	}

	if (hasWicket && hasRunSignal) {
		confidence -= 0.3;
		requiresManualConfirmation = true;
		confirmationReasons.push('run-wicket-conflict');
	}

	if (numbers.uniqueNumbers.length > 1) {
		confidence -= 0.2;
		requiresManualConfirmation = true;
		confirmationReasons.push('multiple-run-values');
	}

	if (
		fuzzyCanonical &&
		fuzzyCanonical.score >= AMBIGUOUS_THRESHOLD &&
		fuzzyCanonical.score < FUZZY_THRESHOLD
	) {
		confidence = AMBIGUOUS_CONFIDENCE;
		requiresManualConfirmation = true;
		confirmationReasons.push('ambiguous-sound');
	}

	if (outcome === 'dot' && !hasRunSignal && !hasWicket && extrasKinds === 0) {
		confidence = Math.min(confidence, AMBIGUOUS_CONFIDENCE);
		requiresManualConfirmation = true;
		confirmationReasons.push('unclear-outcome');
		displayLabel = sanitizedTranscript || 'Dot ball';
	}

	if (baseConfidence === SLANG_CONFIDENCE) {
		confidence = Math.min(confidence, SLANG_CONFIDENCE);
	}

	return {
		outcome,
		value,
		isWicket,
		dismissalType,
		batterRuns,
		extraRuns,
		extraType,
		confidence: Math.max(0, Math.min(1, confidence)),
		displayLabel: sanitizeForSpeechSynthesis(displayLabel),
		requiresManualConfirmation,
		confirmationReasons,
		sanitizedTranscript,
	};
}

function extractNumbers(normalized: string): {
	primaryNumber: number | null;
	uniqueNumbers: number[];
} {
	const wordToNumber: Record<string, number> = {
		zero: 0,
		one: 1,
		two: 2,
		three: 3,
		four: 4,
		five: 5,
		six: 6,
	};
	const extractedNumbers: number[] = [];
	const digitMatches = normalized.match(/\b([0-6])\b/g) ?? [];

	for (const token of digitMatches) {
		const parsed = Number.parseInt(token, 10);
		if (Number.isFinite(parsed)) {
			extractedNumbers.push(parsed);
		}
	}

	for (const [word, value] of Object.entries(wordToNumber)) {
		if (normalized.includes(word)) {
			extractedNumbers.push(value);
		}
	}

	if (normalized.includes('single')) extractedNumbers.push(1);
	if (normalized.includes('double')) extractedNumbers.push(2);
	if (normalized.includes('triple')) extractedNumbers.push(3);
	if (normalized.includes('boundary')) extractedNumbers.push(4);
	if (normalized.includes('maximum')) extractedNumbers.push(6);

	const uniqueNumbers = Array.from(new Set(extractedNumbers));
	return {
		primaryNumber: uniqueNumbers.length > 0 ? uniqueNumbers[0] : null,
		uniqueNumbers,
	};
}
