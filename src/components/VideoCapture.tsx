import { useState, useRef, useEffect, useCallback } from 'react';
import { Circle, Square, ChevronUp, Pause, Play, SkipForward, Mic } from 'lucide-react';
import { useMatch } from '../context/MatchContext';
import { useMatchClips } from '../context/MatchClipsContext';
import { executeTrackedAction, supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

import { validateRole } from '../lib/accessControl';
import { deriveRecorderHudFromInningsClips } from '../lib/recorderFromClips';
import { formatDismissalOptionLabel, getDismissalOptionOrder } from '../lib/dismissalOptions';
import { DEFAULT_GLOBAL_RULES, getEffectiveRules } from '../lib/rulesEngine';
import { isValidBall, parseBaseRuns, resolveBallScoring } from '../lib/ballCounter';
import type { BallOutcome, MatchRules } from '../lib/types';
import { useMatchEngine } from '../hooks/useMatchEngine';
import { ExtraType, WicketType } from '../engine/types';
import {
  getAIScoringMode,
  scoreFromAudioWithLocalAI,
  setAIScoringMode,
  type AIScoreDecision,
  type AIScoringMode,
} from '../lib/aiScoringClient';
import { writeAIDecisionTrace } from '../lib/aiDecisionTrace';
import { userFriendlyMessage } from '../lib/userFriendlyError';
import { ERROR_MESSAGES } from '../lib/constants';
import { uploadClipBlob } from '../lib/clipStorage';

interface RecordingData {
  blob: Blob;
  duration: number;
  timestamp: number;
}

type SpeechRecognitionResultLike = {
  0: {
    transcript: string;
  };
};

type SpeechRecognitionEventLike = Event & {
  results: {
    [index: number]: SpeechRecognitionResultLike;
    length: number;
  };
  resultIndex: number;
};

type SpeechRecognitionLike = EventTarget & {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getCameraUserMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'name' in err) {
    const name = (err as { name?: string }).name;
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return 'Camera or microphone access was denied. Allow access in your browser settings and try again.';
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return 'No camera or microphone was found.';
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return 'Camera or microphone is in use by another app.';
    }
    if (name === 'OverconstrainedError') {
      return 'The camera could not use the requested settings. Try another device or browser.';
    }
    if (name === 'SecurityError') {
      return 'Camera access is blocked. Use HTTPS or localhost.';
    }
  }
  return 'Could not access the camera or microphone. Check permissions and try again.';
}

export interface VideoCaptureProps {
  onRecordingDone?: (blob: Blob, durationMs: number) => void;
}

export function VideoCapture({ onRecordingDone }: VideoCaptureProps = {}) {
  const { matchId } = useMatch();
  const { clips, refresh, currentInnings, ballsPerOver, totalOvers } = useMatchClips();
  const { initialize: initializeEngine, dispatch: dispatchEngine } = useMatchEngine();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [overNumber, setOverNumber] = useState(1);
  const [ballNumber, setBallNumber] = useState(1);
  const [deliveryNumber, setDeliveryNumber] = useState(1);
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [selectedOutType, setSelectedOutType] = useState<string | null>(null);
  const [selectedExtraRuns, setSelectedExtraRuns] = useState(0);
  const [showDrawer, setShowDrawer] = useState(false);
  const [recordingData, setRecordingData] = useState<RecordingData | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [confirmBallNumber, setConfirmBallNumber] = useState(1);
  const [confirmDeliveryNumber, setConfirmDeliveryNumber] = useState(1);
  const [usedDeliveries, setUsedDeliveries] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [rules, setRules] = useState<MatchRules>(DEFAULT_GLOBAL_RULES);
  const [totalRuns, setTotalRuns] = useState(0);
  const [totalWickets, setTotalWickets] = useState(0);
  const [currentOvers, setCurrentOvers] = useState('0');
  const [cameraInitialized, setCameraInitialized] = useState(false);
  const [inningsComplete, setInningsComplete] = useState(false);
  const [trimStartMs, setTrimStartMs] = useState<number | null>(null);
  const [trimEndMs, setTrimEndMs] = useState<number | null>(null);
  const [hitTimestampMs, setHitTimestampMs] = useState<number | null>(null);
  const [voiceToast, setVoiceToast] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [pendingVoiceOutcome, setPendingVoiceOutcome] = useState<string | null>(null);
  const [aiMode, setAiMode] = useState<AIScoringMode>(() => getAIScoringMode());
  const [isAIScoring, setIsAIScoring] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AIScoreDecision | null>(null);
  const [aiStatus, setAiStatus] = useState<string>('AI assist is off');
  const [needsFallbackTrace, setNeedsFallbackTrace] = useState(false);

  // Over-complete confirm/edit state
  const [overCompleteData, setOverCompleteData] = useState<{
    completedOver: number;
    nextOver: number;
    advanceInnings: boolean;
  } | null>(null);
  const [showUmpireAuth, setShowUmpireAuth] = useState(false);
  const [umpirePasscodeInput, setUmpirePasscodeInput] = useState('');
  const [umpireAuthError, setUmpireAuthError] = useState('');
  const [umpireAuthenticated, setUmpireAuthenticated] = useState(false);
  const [editableOverBalls, setEditableOverBalls] = useState<
    {
      id: string;
      ball_number: number;
      delivery_index: number;
      outcome: string;
      dismissal_type: string | null;
      extra_runs: number;
      is_valid_ball: boolean;
    }[]
  >([]);
  const [editBallOutcome, setEditBallOutcome] = useState<Record<string, string>>({});
  const [editBallDismissalType, setEditBallDismissalType] = useState<Record<string, string>>({});

  const mapOutcomeToExtraType = (outcome: BallOutcome): ExtraType => {
    if (outcome === 'wide') return ExtraType.Wide;
    if (outcome === 'noball') return ExtraType.NoBall;
    if (outcome === 'bye') return ExtraType.Bye;
    if (outcome === 'legbye') return ExtraType.LegBye;
    return ExtraType.None;
  };

  const mapDismissalType = (value: string | null): WicketType | null => {
    if (!value) return null;
    const v = value.toLowerCase();
    const all = new Set<string>(Object.values(WicketType));
    return all.has(v) ? (v as WicketType) : WicketType.Unknown;
  };

  useEffect(() => {
    if (!matchId) return;
    void (async () => {
      const effectiveRules = (await getEffectiveRules(matchId)) ?? DEFAULT_GLOBAL_RULES;
      setRules(effectiveRules);
    })();
  }, [matchId]);

  useEffect(() => {
    if (!matchId) return;
    initializeEngine(matchId, rules);
  }, [matchId, rules, initializeEngine]);

  useEffect(() => {
    if (!matchId) return;
    const inningsClips = clips.filter((c) => c.innings_number === currentInnings);
    const hud = deriveRecorderHudFromInningsClips(inningsClips, ballsPerOver, totalOvers);
    setTotalRuns(hud.totalRuns);
    setTotalWickets(hud.totalWickets);
    setCurrentOvers(hud.currentOvers);
    setOverNumber(hud.overNumber);
    setBallNumber(hud.ballNumber);
    setDeliveryNumber(hud.deliveryNumber);
    setInningsComplete(hud.inningsComplete);
    setUsedDeliveries(hud.usedDeliveries);
  }, [matchId, clips, currentInnings, ballsPerOver, totalOvers]);

  useEffect(() => {
    if (!voiceToast) return;
    const timeout = setTimeout(() => setVoiceToast(null), 3000);
    return () => clearTimeout(timeout);
  }, [voiceToast]);

  useEffect(() => {
    return () => {
      speechRecognitionRef.current?.stop();
    };
  }, []);

  const getElapsedRecordingMs = useCallback(() => {
    if (!recordingStartedAtRef.current) {
      return recordingTime * 1000;
    }
    return Math.max(0, Date.now() - recordingStartedAtRef.current);
  }, [recordingTime]);

  const formatMs = (value: number | null): string => {
    if (value === null) return '--';
    return (value / 1000).toFixed(2);
  };

  const initCamera = async (): Promise<boolean> => {
    if (cameraInitialized) return true;

    setCameraError(null);

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('capture', 'environment');
        setCameraInitialized(true);
        return true;
      }
      setCameraError('Video element is not ready. Try again.');
      return false;
    } catch (error) {
      console.error('Camera access error:', error);
      setCameraError(getCameraUserMessage(error));
      return false;
    }
  };

  const handleRecordToggle = async () => {
    if (!isRecording) {
      const ok = await initCamera();
      if (!ok || !videoRef.current?.srcObject) return;
      startRecording();
    } else {
      stopRecording();
    }
  };

  const handlePauseResume = () => {
    if (!mediaRecorderRef.current) return;

    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          if (newTime >= 15) {
            stopRecording();
            return 15;
          }
          return newTime;
        });
      }, 1000);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const startRecording = async () => {
    if (!videoRef.current?.srcObject) {
      const ok = await initCamera();
      if (!ok) return;
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!videoRef.current?.srcObject) return;

    const stream = videoRef.current.srcObject as MediaStream;
    chunksRef.current = [];

    try {
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      recordingStartedAtRef.current = Date.now();
      if (trimStartMs === null) {
        setTrimStartMs(0);
      }
      setTrimEndMs(null);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const data: RecordingData = {
          blob,
          duration: recordingTime,
          timestamp: Date.now(),
        };
        setRecordingData(data);
        setConfirmBallNumber(ballNumber);
        setConfirmDeliveryNumber(deliveryNumber);

        if (onRecordingDone) {
          onRecordingDone(blob, recordingTime * 1000);
          return;
        }

        setShowDrawer(true);

        console.log('Recording stopped', {
          duration: recordingTime,
          blobSize: blob.size,
          blob,
        });
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          if (newTime >= 15) {
            mediaRecorder.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
            return 15;
          }
          return newTime;
        });
      }, 1000);
    } catch (error) {
      console.error('Recording error:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (trimEndMs === null) {
        setTrimEndMs(getElapsedRecordingMs());
      }
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleOutcomeSelect = useCallback((outcome: string) => {
    setSelectedOutcome(outcome);
    if (outcome !== 'wicket') {
      setSelectedOutType(null);
    }
    if (outcome !== 'wide' && outcome !== 'noball') {
      setSelectedExtraRuns(0);
    } else if (outcome === 'wide') {
      setSelectedExtraRuns(rules.wide_no_runs ? 0 : 1);
    } else {
      setSelectedExtraRuns(0);
    }
  }, [rules]);

  const applyAISuggestion = useCallback((decision: AIScoreDecision) => {
    handleOutcomeSelect(decision.outcome);
    setSelectedOutType(decision.outcome === 'wicket' ? decision.dismissal_type ?? 'unknown' : null);
    if (decision.outcome === 'wide' || decision.outcome === 'noball') {
      setSelectedExtraRuns(decision.extra_runs);
    }
  }, [handleOutcomeSelect]);

  useEffect(() => {
    if (!showDrawer || !pendingVoiceOutcome) return;
    handleOutcomeSelect(pendingVoiceOutcome);
    setPendingVoiceOutcome(null);
  }, [showDrawer, pendingVoiceOutcome, handleOutcomeSelect]);

  useEffect(() => {
    if (!showDrawer) {
      setAiSuggestion(null);
      setIsAIScoring(false);
      setNeedsFallbackTrace(false);
      return;
    }
    if (aiMode === 'off') {
      setAiStatus('AI assist is off');
      setAiSuggestion(null);
      return;
    }
    if (aiMode === 'live' && !recordingData?.blob) {
      setAiStatus('Record audio to use live AI');
      setAiSuggestion(null);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setIsAIScoring(true);
      setAiStatus(aiMode === 'mock' ? 'Generating mock suggestion...' : 'Getting local AI suggestion...');
      const audioBlob = recordingData?.blob ?? new Blob(['mock-audio'], { type: 'audio/webm' });
      const result = await scoreFromAudioWithLocalAI({ audioBlob, matchId });
      if (cancelled) return;

      if (result.ok) {
        setAiSuggestion(result.decision);
        setAiStatus(
          `AI suggestion ready (${Math.round(result.decision.confidence * 100)}% confidence)`
        );
        setNeedsFallbackTrace(false);
        await writeAIDecisionTrace({
          matchId,
          inningsNumber: currentInnings,
          overNumber,
          ballNumber: confirmBallNumber,
          deliveryIndex: confirmDeliveryNumber,
          mode: result.mode,
          status: 'success',
          transcript: result.decision.transcript,
          rationale: result.decision.rationale,
          confidence: result.decision.confidence,
          decision: result.decision,
          rawResponse: result.raw,
        });
      } else {
        setAiSuggestion(null);
        setAiStatus(`AI unavailable: ${result.message}`);
        setNeedsFallbackTrace(result.reason !== 'disabled');
        await writeAIDecisionTrace({
          matchId,
          inningsNumber: currentInnings,
          overNumber,
          ballNumber: confirmBallNumber,
          deliveryIndex: confirmDeliveryNumber,
          mode: result.mode === 'off' ? 'off' : 'live',
          status: result.reason === 'error' ? 'error' : 'unavailable',
          decision: {},
          errorMessage: result.message,
          rawResponse: result.raw,
        });
      }
      setIsAIScoring(false);
    };
    void run();

    return () => {
      cancelled = true;
    };
  }, [
    showDrawer,
    aiMode,
    recordingData,
    matchId,
    currentInnings,
    overNumber,
    confirmBallNumber,
    confirmDeliveryNumber,
  ]);

  const handleStartDelivery = async () => {
    setVoiceError(null);
    setTrimStartMs(isRecording ? getElapsedRecordingMs() : 0);
    setTrimEndMs(null);
    setHitTimestampMs(null);

    if (!isRecording) {
      const ok = await initCamera();
      if (!ok || !videoRef.current?.srcObject) return;
      await startRecording();
    }

    setVoiceToast('Recording started');
  };

  const handleBallDead = () => {
    if (!isRecording) {
      setVoiceToast('No active recording');
      return;
    }
    const endMs = getElapsedRecordingMs();
    setTrimEndMs(endMs);
    stopRecording();
    setVoiceToast('Recording stopped. Choose outcome to save.');
  };

  const handleMarkHit = () => {
    const markerMs = getElapsedRecordingMs();
    if (!isRecording && !showDrawer) {
      setVoiceToast('Start a delivery before marking hit');
      return;
    }
    setHitTimestampMs(markerMs);
    setVoiceToast(`Hit marked at ${formatMs(markerMs)}s`);
  };

  const applyVoiceOutcome = (outcome: string) => {
    if (!showDrawer && !isRecording) {
      handleSkipRecording();
    }
    if (showDrawer) {
      handleOutcomeSelect(outcome);
    } else {
      setPendingVoiceOutcome(outcome);
    }
    setVoiceToast(`Outcome set to ${outcome}`);
  };

  const parseVoiceCommand = (transcript: string) => {
    const normalized = transcript.toLowerCase();

    if (
      normalized.includes('start delivery') ||
      normalized.includes('start recording') ||
      normalized.includes('begin recording')
    ) {
      void handleStartDelivery();
      return;
    }
    if (
      normalized.includes('ball dead') ||
      normalized.includes('end play') ||
      normalized.includes('stop delivery') ||
      normalized.includes('stop recording') ||
      normalized.includes('end recording')
    ) {
      handleBallDead();
      return;
    }
    if (normalized.includes('mark hit') || normalized.includes('bat hit')) {
      handleMarkHit();
      return;
    }

    if (normalized.includes('wide')) {
      applyVoiceOutcome('wide');
      return;
    }
    if (normalized.includes('no ball') || normalized.includes('noball')) {
      applyVoiceOutcome('noball');
      return;
    }
    if (normalized.includes('out') || normalized.includes('wicket')) {
      applyVoiceOutcome('wicket');
      return;
    }
    if (normalized.includes('dot')) {
      applyVoiceOutcome('dot');
      return;
    }
    if (normalized.includes('four') || normalized.match(/\b4\b/)) {
      applyVoiceOutcome('4');
      return;
    }
    if (normalized.includes('six') || normalized.match(/\b6\b/)) {
      applyVoiceOutcome('6');
      return;
    }
    if (normalized.includes('one') || normalized.match(/\b1\b/)) {
      applyVoiceOutcome('1');
      return;
    }
    if (normalized.includes('two') || normalized.match(/\b2\b/)) {
      applyVoiceOutcome('2');
      return;
    }
    if (normalized.includes('three') || normalized.match(/\b3\b/)) {
      applyVoiceOutcome('3');
      return;
    }

    setVoiceToast(`Heard: ${transcript}`);
  };

  const startVoiceCapture = () => {
    if (isListening) return;
    setVoiceError(null);

    const SpeechRecognitionCtor = (
      window as Window & {
        SpeechRecognition?: new () => SpeechRecognitionLike;
        webkitSpeechRecognition?: new () => SpeechRecognitionLike;
      }
    ).SpeechRecognition ?? (
      window as Window & {
        webkitSpeechRecognition?: new () => SpeechRecognitionLike;
      }
    ).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setVoiceError('Speech recognition is not available in this browser');
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const text = event.results[event.resultIndex]?.[0]?.transcript?.trim();
      if (!text) return;
      setVoiceToast(`Voice: "${text}"`);
      parseVoiceCommand(text);
    };
    recognition.onerror = () => {
      setVoiceError('Could not understand voice command');
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };

    speechRecognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopVoiceCapture = () => {
    speechRecognitionRef.current?.stop();
    setIsListening(false);
  };

  const uploadClip = async () => {
    if (!selectedOutcome || !matchId) return;

    if (selectedOutcome === 'wicket' && !selectedOutType) {
      setError('Please select the type of dismissal');
      return;
    }

    if (usedDeliveries.has(confirmDeliveryNumber)) {
      setError(`Delivery ${confirmDeliveryNumber} has already been recorded for Over ${overNumber}`);
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const outcomeValue = selectedOutcome.toLowerCase() as BallOutcome;
      const dismissalTypeValue =
        selectedOutcome === 'wicket' && selectedOutType ? selectedOutType.toLowerCase() : null;
      const baseRuns = parseBaseRuns(outcomeValue);
      const configuredExtras =
        outcomeValue === 'wide'
          ? (rules.wide_no_runs ? 0 : selectedExtraRuns)
          : outcomeValue === 'noball'
            ? selectedExtraRuns
            : 0;
      const { effectiveExtraRuns, validBall } = resolveBallScoring(
        outcomeValue,
        rules,
        baseRuns,
        configuredExtras
      );

      let videoUrl: string | null = null;

      if (recordingData) {
        videoUrl = await uploadClipBlob({
          matchId,
          blob: recordingData.blob,
          contentType: 'video/webm',
        });
      }

      const { error: dbError } = await executeTrackedAction({
        tableName: 'clips',
        action: 'insert',
        payload: {
          match_id: matchId,
          innings_number: currentInnings,
          over_number: overNumber,
          ball_number: confirmBallNumber,
          delivery_index: confirmDeliveryNumber,
          outcome: outcomeValue,
          dismissal_type: dismissalTypeValue,
          extra_runs: effectiveExtraRuns,
          is_valid_ball: validBall,
          video_url: videoUrl,
          duration: recordingData?.duration ?? 0,
          trim_start_ms: trimStartMs,
          trim_end_ms: trimEndMs,
          hit_timestamp_ms: hitTimestampMs,
          is_highlight: ['4', '6', 'wicket'].includes(outcomeValue),
          input_method: 'manual',
        },
        matchId,
        execute: async () =>
          supabase.from('clips').insert({
            match_id: matchId,
            innings_number: currentInnings,
            over_number: overNumber,
            ball_number: confirmBallNumber,
            delivery_index: confirmDeliveryNumber,
            outcome: outcomeValue,
            dismissal_type: dismissalTypeValue,
            extra_runs: effectiveExtraRuns,
            is_valid_ball: validBall,
            video_url: videoUrl,
            duration: recordingData?.duration ?? 0,
            trim_start_ms: trimStartMs,
            trim_end_ms: trimEndMs,
            hit_timestamp_ms: hitTimestampMs,
            is_highlight: ['4', '6', 'wicket'].includes(outcomeValue),
            input_method: 'manual',
          }),
      });

      if (dbError) {
        logger.error('Failed to insert clip into database', dbError);
        setError(
          userFriendlyMessage(dbError, { fallback: 'Failed to save ball outcome. Please try again.' })
        );
        setIsUploading(false);
        return;
      }

      dispatchEngine({
        type: 'DELIVER_BALL',
        payload: {
          outcome_label: outcomeValue,
          runs_batter: baseRuns,
          runs_extras: effectiveExtraRuns,
          extra_type: mapOutcomeToExtraType(outcomeValue),
          wicket_type: mapDismissalType(dismissalTypeValue),
          wicket_counts: Boolean(dismissalTypeValue || outcomeValue === 'wicket'),
          metadata: {
            hit_timestamp_ms: hitTimestampMs,
            video_clip_id: videoUrl,
            voice_intent_confidence: null,
            is_highlight: ['4', '6', 'wicket'].includes(outcomeValue),
            transcript: null,
            input_method: 'manual',
            trace_id: null,
          },
        },
      });

      if (needsFallbackTrace) {
        await writeAIDecisionTrace({
          matchId,
          inningsNumber: currentInnings,
          overNumber,
          ballNumber: confirmBallNumber,
          deliveryIndex: confirmDeliveryNumber,
          mode: 'fallback',
          status: 'success',
          rationale: 'Manual fallback used after AI failure/unavailability',
          decision: {
            outcome: outcomeValue,
            dismissal_type: dismissalTypeValue,
            extra_runs: effectiveExtraRuns,
          },
        });
        setNeedsFallbackTrace(false);
      }

      const nextBall = validBall ? confirmBallNumber + 1 : confirmBallNumber;
      if (validBall && nextBall > ballsPerOver) {
        const nextOver = overNumber + 1;
        const advanceInnings = nextOver > totalOvers && currentInnings === 1;
        setOverCompleteData({ completedOver: overNumber, nextOver, advanceInnings });
      }

      await refresh();

      setShowDrawer(false);
      setSelectedOutcome(null);
      setSelectedOutType(null);
      setSelectedExtraRuns(0);
      setRecordingData(null);
      setTrimStartMs(null);
      setTrimEndMs(null);
      setHitTimestampMs(null);
      setIsUploading(false);
      setAiSuggestion(null);
      setAiStatus(aiMode === 'off' ? 'AI assist is off' : 'Ready for next delivery');
    } catch (err) {
      logger.error('Upload clip failed', err);
      setError(userFriendlyMessage(err, { fallback: ERROR_MESSAGES.UPLOAD_FAILED }));
      setIsUploading(false);
    }
  };

  const handleSkipRecording = () => {
    setRecordingData(null);
    setConfirmBallNumber(ballNumber);
    setConfirmDeliveryNumber(deliveryNumber);
    setShowDrawer(true);
  };

  const handleOverConfirm = async () => {
    if (!overCompleteData || !matchId) return;
    const { advanceInnings } = overCompleteData;
    setOverCompleteData(null);
    setUmpireAuthenticated(false);
    if (advanceInnings) {
      await executeTrackedAction({
        tableName: 'matches',
        action: 'advance_innings',
        matchId,
        payload: { current_innings: 2 },
        execute: async () =>
          supabase
            .from('matches')
            .update({ current_innings: 2 })
            .eq('match_id', matchId)
            .select('match_id, current_innings')
            .single(),
      });
    }
    await refresh();
  };

  const handleUmpireAuth = async () => {
    if (!matchId) return;
    setUmpireAuthError('');
    const valid = await validateRole(matchId, umpirePasscodeInput, 'umpire');
    if (!valid) {
      setUmpireAuthError('Incorrect umpire passcode');
      return;
    }
    setUmpireAuthenticated(true);
    setShowUmpireAuth(false);
    setUmpirePasscodeInput('');
    // Load balls for the completed over
    if (overCompleteData) {
      const { data } = await supabase
        .from('clips')
        .select('id, ball_number, delivery_index, outcome, dismissal_type, extra_runs, is_valid_ball')
        .eq('match_id', matchId)
        .eq('innings_number', currentInnings)
        .eq('over_number', overCompleteData.completedOver)
        .order('delivery_index')
        .order('ball_number');
      setEditableOverBalls(data || []);
      setEditBallOutcome({});
      setEditBallDismissalType({});
    }
  };

  const handleSaveOverEdits = async () => {
    if (!matchId) return;

    for (const ball of editableOverBalls) {
      const selectedOutcome = editBallOutcome[ball.id] ?? ball.outcome;
      const selectedDismissal = editBallDismissalType[ball.id] ?? ball.dismissal_type ?? '';
      const normalizedOutcome = selectedOutcome.toLowerCase() as BallOutcome;
      const normalizedDismissal =
        normalizedOutcome === 'wicket' ? (selectedDismissal ? selectedDismissal.toLowerCase() : null) : null;

      if (normalizedOutcome === 'wicket' && !normalizedDismissal) {
        setError(`Select dismissal type for delivery ${ball.delivery_index}`);
        return;
      }
    }

    const { error: batchError } = await executeTrackedAction({
      tableName: 'clips',
      action: 'update_over_outcomes',
      matchId,
      payload: {
        innings_number: currentInnings,
        clip_ids: editableOverBalls.map((b) => b.id),
      },
      execute: async () => {
        for (const ball of editableOverBalls) {
          const selectedOutcome = editBallOutcome[ball.id] ?? ball.outcome;
          const selectedDismissal = editBallDismissalType[ball.id] ?? ball.dismissal_type ?? '';
          const normalizedOutcome = selectedOutcome.toLowerCase() as BallOutcome;
          const normalizedDismissal =
            normalizedOutcome === 'wicket' ? (selectedDismissal ? selectedDismissal.toLowerCase() : null) : null;
          const extraRuns =
            normalizedOutcome === 'wide'
              ? (rules.wide_no_runs ? 0 : Math.max(1, ball.extra_runs ?? 1))
              : normalizedOutcome === 'noball'
                ? Math.max(0, ball.extra_runs ?? 0)
                : 0;
          const validBall = isValidBall(normalizedOutcome, rules);

          if (ball.id) {
            const { error } = await supabase
              .from('clips')
              .update({
                outcome: normalizedOutcome,
                dismissal_type: normalizedDismissal,
                extra_runs: extraRuns,
                is_valid_ball: validBall,
              })
              .eq('id', ball.id);
            if (error) {
              return { error };
            }
          }
        }
        return { error: null };
      },
    });

    if (batchError) {
      logger.error('Failed to save over edits', batchError);
      setError(userFriendlyMessage(batchError, { fallback: 'Failed to save over edits. Please try again.' }));
      return;
    }

    setUmpireAuthenticated(false);
    setEditableOverBalls([]);
    setEditBallOutcome({});
    setEditBallDismissalType({});
    await refresh();
  };

  const handleCancel = () => {
    setShowDrawer(false);
    setSelectedOutcome(null);
    setSelectedOutType(null);
    setSelectedExtraRuns(0);
    setRecordingData(null);
    setTrimStartMs(null);
    setTrimEndMs(null);
    setHitTimestampMs(null);
    setAiSuggestion(null);
    setAiStatus(aiMode === 'off' ? 'AI assist is off' : 'Cancelled');
    setNeedsFallbackTrace(false);
  };

  return (
    <div className="absolute inset-0 min-h-0 bg-black">
      <div className="absolute inset-0 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="absolute top-0 left-0 right-0 z-10 space-y-1 p-2 text-white sm:space-y-2 sm:p-3">
        {cameraError && (
          <div
            role="alert"
            className="bg-red-500/20 border border-red-400 rounded-lg p-3 flex flex-col gap-2"
          >
            <p className="text-red-200 text-sm">{cameraError}</p>
            <button
              type="button"
              onClick={() => setCameraError(null)}
              className="self-start text-xs text-gray-300 underline hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}

        {voiceError && (
          <div
            role="alert"
            className="bg-red-500/20 border border-red-400 rounded-lg p-3 flex items-center justify-between"
          >
            <p className="text-red-200 text-sm">{voiceError}</p>
            <button
              type="button"
              onClick={() => setVoiceError(null)}
              className="text-xs text-gray-300 underline hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}

        {voiceToast && (
          <div
            role="status"
            aria-live="polite"
            className="bg-black/70 backdrop-blur rounded-lg border border-purple-400 p-3 drop-shadow-md"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Voice</p>
            <p className="mt-0.5 text-sm font-semibold text-white">{voiceToast}</p>
          </div>
        )}

        {!showDrawer && (
          <>
            <div className="bg-black/70 backdrop-blur rounded-lg px-4 py-2 mb-2 text-center border-2 border-orange-400">
              <span className="text-orange-400 text-lg font-bold">Innings {currentInnings}</span>
              <span className="text-gray-400 text-sm ml-2">of 2</span>
            </div>

            {inningsComplete && currentInnings === 1 && (
              <div className="bg-yellow-400/20 border border-yellow-400 rounded-lg p-3 mb-2 text-center">
                <p className="text-yellow-400 font-semibold">Innings 1 Complete! Start Innings 2</p>
              </div>
            )}

            {inningsComplete && currentInnings === 2 && (
              <div className="bg-green-400/20 border border-green-400 rounded-lg p-3 mb-2 text-center">
                <p className="text-green-400 font-semibold">Match Complete!</p>
              </div>
            )}

            <div className="flex justify-between items-center gap-2 mb-2">
              <div className="bg-black/70 backdrop-blur px-4 py-2 rounded-lg border border-green-400">
                <span className="text-sm text-gray-300">Over {overNumber} - Ball </span>
                <span className="text-lg font-bold text-green-400">{ballNumber}</span>
              </div>

              {isRecording && (
                <div className="bg-red-500/80 backdrop-blur px-4 py-2 rounded-lg">
                  <span className="text-sm font-semibold">
                    {isPaused ? 'Paused ' : ''}{recordingTime}s / 15s
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 mb-2">
              <div className="bg-black/70 backdrop-blur rounded-lg p-2 text-center border border-green-400">
                <div className="text-gray-400 text-xs">Runs</div>
                <div className="text-green-400 text-lg font-bold">{totalRuns}</div>
              </div>
              <div className="bg-black/70 backdrop-blur rounded-lg p-2 text-center border border-blue-400">
                <div className="text-gray-400 text-xs">Overs</div>
                <div className="text-blue-400 text-lg font-bold">{currentOvers}</div>
              </div>
              <div className="bg-black/70 backdrop-blur rounded-lg p-2 text-center border border-red-400">
                <div className="text-gray-400 text-xs">Wickets</div>
                <div className="text-red-400 text-lg font-bold">{totalWickets}</div>
              </div>
            </div>

            <div className="bg-black/70 backdrop-blur rounded-lg px-3 py-2 border border-purple-400">
              <div className="text-xs text-gray-400">
                Trim start: <span className="text-white">{formatMs(trimStartMs)}s</span>
                <span className="mx-2 text-gray-500">|</span>
                Trim end: <span className="text-white">{formatMs(trimEndMs)}s</span>
                <span className="mx-2 text-gray-500">|</span>
                Hit: <span className="text-white">{formatMs(hitTimestampMs)}s</span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-col gap-2 px-4 pb-20 pt-1">
        <div className="shrink-0 rounded-lg border border-cyan-400 bg-black/85 px-3 py-2 backdrop-blur">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-cyan-300">AI Assist</span>
            <select
              data-testid="ai-assist-mode-select"
              aria-label="AI assist mode"
              value={aiMode}
              onChange={(e) => {
                const nextMode = e.target.value as AIScoringMode;
                setAIScoringMode(nextMode);
                setAiMode(nextMode);
                setAiSuggestion(null);
                setAiStatus(nextMode === 'off' ? 'AI assist is off' : 'Mode updated');
              }}
              className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-white"
            >
              <option value="off">Manual only</option>
              <option value="live">Local AI</option>
              <option value="mock">Mock AI</option>
            </select>
          </div>
          <div data-testid="ai-assist-status" className="mt-1 text-[11px] text-gray-300">
            {aiStatus}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => void handleStartDelivery()}
            disabled={showDrawer || inningsComplete || !!overCompleteData || isUploading}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-2 rounded-lg text-xs transition-colors"
          >
            Start Recording
          </button>
          <button
            onClick={handleBallDead}
            disabled={!isRecording || isUploading}
            className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-2 rounded-lg text-xs transition-colors"
          >
            Stop Recording
          </button>
          <button
            onClick={handleMarkHit}
            disabled={(!isRecording && !showDrawer) || isUploading}
            className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-2 rounded-lg text-xs transition-colors"
          >
            Mark Hit
          </button>
          <button
            onPointerDown={startVoiceCapture}
            onPointerUp={stopVoiceCapture}
            onPointerCancel={stopVoiceCapture}
            onPointerLeave={stopVoiceCapture}
            disabled={isUploading}
            className={`flex items-center justify-center gap-1 font-bold py-2 rounded-lg text-xs transition-colors ${
              isListening
                ? 'bg-purple-600 text-white'
                : 'bg-purple-500 hover:bg-purple-600 text-black'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Hold to talk"
          >
            <Mic size={14} />
            {isListening ? 'Listening' : 'Hold to Talk'}
          </button>
        </div>

        <div className="flex justify-center items-center gap-4 pb-1">
          {isRecording && (
            <button
              onClick={handlePauseResume}
              className="w-16 h-16 rounded-full bg-yellow-400 hover:bg-yellow-500 flex items-center justify-center transition-all shadow-lg"
            >
              {isPaused ? (
                <Play size={28} className="text-black" />
              ) : (
                <Pause size={28} className="text-black" />
              )}
            </button>
          )}
          <button
            onClick={handleRecordToggle}
            disabled={showDrawer || inningsComplete || !!overCompleteData}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-green-500 hover:bg-green-600'
            } ${showDrawer || inningsComplete || overCompleteData ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isRecording ? (
              <Square size={32} className="text-white fill-white" />
            ) : (
              <Circle size={32} className="text-white fill-white" />
            )}
          </button>
          {!isRecording && !showDrawer && !inningsComplete && !overCompleteData && (
            <button
              onClick={handleSkipRecording}
              aria-label="Log outcome without recording"
              data-testid="skip-recording-button"
              className="w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center transition-all shadow-lg"
              title="Log outcome without recording"
            >
              <SkipForward size={22} className="text-white" />
            </button>
          )}
        </div>
      </div>

      {overCompleteData && !showUmpireAuth && !umpireAuthenticated && (
        <div className="fixed inset-x-0 bottom-0 z-[100] rounded-t-2xl border-t-2 border-yellow-400 bg-gray-900 px-6 pb-24 pt-[max(1.5rem,env(safe-area-inset-top))]">
          <div className="flex justify-center mb-4">
            <ChevronUp size={32} className="text-gray-600" />
          </div>
          <h3 className="text-white text-xl font-bold mb-2 text-center">
            Over {overCompleteData.completedOver} Complete!
          </h3>
          <p className="text-gray-400 text-sm text-center mb-6">
            {overCompleteData.advanceInnings
              ? 'Innings 1 complete. Ready to start Innings 2.'
              : `Ready for Over ${overCompleteData.nextOver}`}
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleOverConfirm}
              data-testid="confirm-over-continue-button"
              className="w-full bg-green-500 hover:bg-green-600 text-black font-bold py-4 rounded-lg transition-colors"
            >
              Confirm &amp; Continue
            </button>
            <button
              onClick={() => setShowUmpireAuth(true)}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-4 rounded-lg transition-colors"
            >
              Edit Over (Umpire)
            </button>
          </div>
        </div>
      )}

      {showUmpireAuth && (
        <div className="fixed inset-x-0 bottom-0 z-[100] rounded-t-2xl border-t-2 border-yellow-400 bg-gray-900 px-6 pb-24 pt-[max(1.5rem,env(safe-area-inset-top))]">
          <div className="flex justify-center mb-4">
            <ChevronUp size={32} className="text-gray-600" />
          </div>
          <h3 className="text-white text-xl font-bold mb-4 text-center">Umpire Verification</h3>
          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Umpire Passcode</label>
              <input
                type="password"
                value={umpirePasscodeInput}
                onChange={(e) => setUmpirePasscodeInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUmpireAuth()}
                placeholder="Enter umpire passcode"
                className="w-full bg-gray-800 border border-gray-700 text-white py-3 px-4 rounded-lg focus:outline-none focus:border-yellow-400"
              />
            </div>
            {umpireAuthError && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
                <p className="text-red-400 text-sm">{umpireAuthError}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowUmpireAuth(false); setUmpireAuthError(''); setUmpirePasscodeInput(''); }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUmpireAuth}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-4 rounded-lg transition-colors"
              >
                Verify
              </button>
            </div>
          </div>
        </div>
      )}

      {umpireAuthenticated && editableOverBalls.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-[100] max-h-[80vh] overflow-y-auto rounded-t-2xl border-t-2 border-yellow-400 bg-gray-900 px-6 pb-24 pt-[max(1.5rem,env(safe-area-inset-top))]">
          <div className="flex justify-center mb-4">
            <ChevronUp size={32} className="text-gray-600" />
          </div>
          <h3 className="text-white text-xl font-bold mb-4 text-center">
            Edit Over {overCompleteData?.completedOver}
          </h3>
          <div className="space-y-3 mb-6">
            {editableOverBalls.map((ball) => (
              <div key={ball.id} className="flex items-center gap-3 bg-gray-800 rounded-lg p-3">
                <span className="text-gray-400 text-sm w-20 flex-shrink-0">
                  Ball {ball.ball_number}
                  <br />
                  <span className="text-xs text-gray-500">Del {ball.delivery_index}</span>
                </span>
                <div className="flex-1 space-y-2">
                  <select
                    value={editBallOutcome[ball.id] ?? ball.outcome}
                    onChange={(e) => {
                      const value = e.target.value;
                      setEditBallOutcome(prev => ({ ...prev, [ball.id]: value }));
                      if (value !== 'wicket') {
                        setEditBallDismissalType(prev => ({ ...prev, [ball.id]: '' }));
                      }
                    }}
                    className="w-full bg-gray-700 border border-gray-600 text-white py-2 px-3 rounded-lg focus:outline-none focus:border-yellow-400"
                  >
                    <option value="dot">Dot</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="6">6</option>
                    <option value="wide">Wide</option>
                    <option value="noball">No ball</option>
                    <option value="wicket">Wicket</option>
                    <option value="other">Other</option>
                  </select>
                  {(editBallOutcome[ball.id] ?? ball.outcome) === 'wicket' && (
                    <select
                      value={editBallDismissalType[ball.id] ?? ball.dismissal_type ?? ''}
                      onChange={(e) =>
                        setEditBallDismissalType(prev => ({ ...prev, [ball.id]: e.target.value }))
                      }
                      className="w-full bg-gray-700 border border-gray-600 text-white py-2 px-3 rounded-lg focus:outline-none focus:border-yellow-400"
                    >
                      <option value="">Select dismissal type</option>
                      {getDismissalOptionOrder().map((kind) => (
                        <option key={kind} value={kind}>
                          {formatDismissalOptionLabel(kind)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={async () => { await handleSaveOverEdits(); await handleOverConfirm(); }}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-4 rounded-lg transition-colors"
            >
              Save Changes &amp; Continue
            </button>
            <button
              onClick={handleOverConfirm}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 rounded-lg transition-colors"
            >
              Continue Without Changes
            </button>
          </div>
        </div>
      )}

      {showDrawer && (
        <div
          data-testid="manual-outcome-drawer"
          className="fixed inset-x-0 bottom-0 z-[100] flex max-h-[calc(100dvh-13.5rem)] animate-slide-up flex-col overflow-hidden rounded-t-2xl border-t-2 border-green-400 bg-gray-900 pb-24 pt-3"
        >
          <div className="shrink-0 px-6">
            <div className="mb-3 flex justify-center">
              <ChevronUp size={32} className="text-gray-600" />
            </div>

            <div className="mb-3 rounded-lg border border-green-400 bg-gray-800 px-3 py-2.5 text-center sm:p-4">
              <div className="mb-0.5 text-xs text-gray-400 sm:text-sm">Recording - Innings {currentInnings}</div>
              <div
                data-testid="record-over-ball-indicator"
                className="text-xl font-bold text-white sm:text-2xl"
              >
                Over {overNumber} - Ball {confirmBallNumber}
              </div>
            </div>

            <h3 className="mb-2 text-center text-lg font-bold text-white sm:text-xl">
              Confirm Recording
            </h3>

            {ballNumber === 1 && overNumber > 1 && (
              <div className="mb-3 rounded-lg border border-yellow-400 bg-yellow-400/20 p-3 text-center">
                <p className="font-semibold text-yellow-400">
                  Over {overNumber - 1} Complete! Starting Over {overNumber}
                </p>
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5">
            <div className="bg-gray-800/80 mb-3 rounded-lg border border-cyan-500/70 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div data-testid="ai-suggestion-heading" className="text-xs font-semibold text-cyan-300">
                    AI Suggestion
                  </div>
                  <div className="text-xs text-gray-300">
                    {isAIScoring
                      ? 'Analyzing audio...'
                      : aiSuggestion
                        ? `${aiSuggestion.outcome.toUpperCase()} (${Math.round(aiSuggestion.confidence * 100)}%)`
                        : 'No suggestion yet'}
                  </div>
                  {aiSuggestion?.rationale && (
                    <div className="mt-1 text-[11px] text-gray-400">{aiSuggestion.rationale}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => aiSuggestion && applyAISuggestion(aiSuggestion)}
                  disabled={!aiSuggestion || isAIScoring}
                  className="rounded-lg bg-cyan-500 px-3 py-2 text-xs font-bold text-black transition-colors hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
            </div>

            <label className="mb-2 block text-sm text-gray-400">Outcome</label>
            <div className="mb-3 grid grid-cols-4 gap-2">
              {['dot', '1', '2', '3'].map((outcome) => (
                <button
                  key={outcome}
                  aria-label={`Outcome ${outcome === 'dot' ? 'Dot' : outcome}`}
                  onClick={() => handleOutcomeSelect(outcome)}
                  className={`rounded-lg py-3 font-bold transition-colors ${
                    selectedOutcome === outcome
                      ? 'bg-green-500 text-black'
                      : 'bg-gray-800 text-white hover:bg-gray-700'
                  }`}
                >
                  {outcome === 'dot' ? 'Dot' : outcome}
                </button>
              ))}
              {['4', '6', 'wicket', 'other', 'wide', 'noball'].map((outcome) => (
                <button
                  key={outcome}
                  aria-label={`Outcome ${outcome}`}
                  onClick={() => handleOutcomeSelect(outcome)}
                  className={`rounded-lg py-3 font-bold transition-colors ${
                    selectedOutcome === outcome
                      ? outcome === 'wicket'
                        ? 'bg-red-500 text-white'
                        : outcome === 'wide' || outcome === 'noball'
                          ? 'bg-orange-500 text-black'
                          : 'bg-yellow-400 text-black'
                      : 'bg-gray-800 text-white hover:bg-gray-700'
                  }`}
                >
                  {outcome === 'wicket'
                    ? 'Wicket'
                    : outcome === 'other'
                      ? 'Other'
                      : outcome === 'wide'
                        ? 'Wide'
                        : outcome === 'noball'
                          ? 'No ball'
                          : outcome}
                </button>
              ))}
            </div>

            {(selectedOutcome === 'wide' || selectedOutcome === 'noball') && (
              <div className="mb-3">
                <label className="mb-2 block text-xs text-gray-400">
                  {selectedOutcome === 'wide' ? 'Wide runs' : 'No-ball runs'}
                </label>
                <select
                  data-testid="extra-runs-input"
                  aria-label={selectedOutcome === 'wide' ? 'Wide runs' : 'No-ball runs'}
                  value={selectedOutcome === 'wide' && rules.wide_no_runs ? 0 : selectedExtraRuns}
                  onChange={(e) => {
                    if (selectedOutcome === 'wide' && rules.wide_no_runs) {
                      setSelectedExtraRuns(0);
                      return;
                    }
                    setSelectedExtraRuns(Number.parseInt(e.target.value, 10));
                  }}
                  disabled={selectedOutcome === 'wide' && rules.wide_no_runs}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-orange-400 focus:outline-none disabled:opacity-60"
                >
                  {Array.from({ length: 13 }, (_, i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
                {selectedOutcome === 'wide' && rules.wide_no_runs && (
                  <p className="mt-1 text-xs text-gray-500">Match config sets wides to 0 runs.</p>
                )}
              </div>
            )}

            {selectedOutcome === 'wicket' && (
              <div className="mb-4">
                <label className="mb-2 block text-xs text-gray-400">Type of Dismissal</label>
                <select
                  data-testid="dismissal-type-select"
                  value={selectedOutType || ''}
                  onChange={(e) => setSelectedOutType(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-3 text-white focus:border-red-400 focus:outline-none"
                >
                  <option value="">Select dismissal type</option>
                  {getDismissalOptionOrder().map((kind) => (
                    <option key={kind} value={kind}>
                      {formatDismissalOptionLabel(kind)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-gray-800 bg-gray-900 px-6 pt-3">
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                disabled={isUploading}
                className="flex-1 rounded-lg bg-gray-700 py-4 font-bold text-white transition-colors hover:bg-gray-600 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={uploadClip}
                disabled={!selectedOutcome || isUploading}
                className="flex-1 rounded-lg bg-green-500 py-4 font-bold text-black transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUploading ? 'Uploading...' : 'Save Clip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
