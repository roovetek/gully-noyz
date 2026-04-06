import { useState, useRef, useEffect, useCallback } from 'react';
import { Circle, Square, ChevronUp, Pause, Play, SkipForward } from 'lucide-react';
import { useMatch } from '../context/MatchContext';
import { executeTrackedAction, supabase } from '../lib/supabase';
import { getTestDataFilter } from '../lib/testDataFilter';
import { logger } from '../lib/logger';

import { validateRole } from '../lib/accessControl';
import { calculateInningsOversDisplay } from '../lib/match';

const DISMISSAL_TYPES = [
  'unknown',
  'bowled',
  'caught',
  'lbw',
  'runout',
  'stumped',
  'hitwicket',
  'hitballtwice',
  'obstructing',
  'timedout',
  'handledball',
] as const;

interface RecordingData {
  blob: Blob;
  duration: number;
  timestamp: number;
}

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

export function VideoCapture() {
  const { matchId } = useMatch();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [overNumber, setOverNumber] = useState(1);
  const [ballNumber, setBallNumber] = useState(1);
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [selectedOutType, setSelectedOutType] = useState<string | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [recordingData, setRecordingData] = useState<RecordingData | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [confirmBallNumber, setConfirmBallNumber] = useState(1);
  const [usedBalls, setUsedBalls] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [ballsPerOver, setBallsPerOver] = useState(6);
  const [totalOvers, setTotalOvers] = useState(20);
  const [totalRuns, setTotalRuns] = useState(0);
  const [totalWickets, setTotalWickets] = useState(0);
  const [currentOvers, setCurrentOvers] = useState('0');
  const [cameraInitialized, setCameraInitialized] = useState(false);
  const [currentInnings, setCurrentInnings] = useState(1);
  const [inningsComplete, setInningsComplete] = useState(false);

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
    { id: string; ball_number: number; outcome: string; dismissal_type: string | null }[]
  >([]);
  const [editBallOutcome, setEditBallOutcome] = useState<Record<number, string>>({});
  const [editBallDismissalType, setEditBallDismissalType] = useState<Record<number, string>>({});

  const loadMatchAndClips = useCallback(async () => {
    if (!matchId) return;

    const { data: matchData } = await supabase
      .from('matches')
      .select('balls_per_over, total_overs, current_innings')
      .eq('match_id', matchId)
      .maybeSingle();

    const bpo = matchData?.balls_per_over ?? 6;
    const to = matchData?.total_overs ?? 20;
    const inningsForQuery = matchData?.current_innings ?? currentInnings;

    if (matchData) {
      setBallsPerOver(bpo);
      setTotalOvers(to);
      setCurrentInnings(matchData.current_innings);
    }

    const testDataFilter = getTestDataFilter();
    let clipsQuery = supabase
      .from('clips')
      .select('outcome, dismissal_type, over_number, ball_number, innings_number')
      .eq('match_id', matchId)
      .eq('innings_number', inningsForQuery);

    if (testDataFilter !== undefined) {
      clipsQuery = clipsQuery.eq('is_test_data', testDataFilter);
    }

    const { data: clips } = await clipsQuery
      .order('over_number', { ascending: false })
      .order('ball_number', { ascending: false });

    if (clips && clips.length > 0) {
      const runs = clips.reduce((total, clip) => {
        const runValue = parseInt(clip.outcome);
        return total + (isNaN(runValue) ? 0 : runValue);
      }, 0);

      const wickets = clips.filter(clip => clip.dismissal_type != null || clip.outcome === 'wicket').length;

      setTotalRuns(runs);
      setTotalWickets(wickets);
      setCurrentOvers(calculateInningsOversDisplay(clips, bpo));

      const latestClip = clips[0];
      if (latestClip.over_number >= to && latestClip.ball_number >= bpo) {
        setInningsComplete(true);
      } else if (latestClip.ball_number >= bpo) {
        setOverNumber(latestClip.over_number + 1);
        setBallNumber(1);
      } else {
        setOverNumber(latestClip.over_number);
        setBallNumber(latestClip.ball_number + 1);
      }
    } else {
      setOverNumber(1);
      setBallNumber(1);
      setTotalRuns(0);
      setTotalWickets(0);
      setCurrentOvers('0');
      setInningsComplete(false);
    }

    let usedQuery = supabase
      .from('clips')
      .select('ball_number')
      .eq('match_id', matchId)
      .eq('innings_number', inningsForQuery)
      .eq('over_number', overNumber);

    if (testDataFilter !== undefined) {
      usedQuery = usedQuery.eq('is_test_data', testDataFilter);
    }

    const { data: usedData } = await usedQuery;

    if (usedData) {
      setUsedBalls(new Set(usedData.map(clip => clip.ball_number)));
    }
  }, [matchId, overNumber, currentInnings]);

  useEffect(() => {
    void loadMatchAndClips();
  }, [loadMatchAndClips]);

  useEffect(() => {
    if (!matchId) return;

    const channel = supabase
      .channel(`videocapture_clips_${matchId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clips', filter: `match_id=eq.${matchId}` },
        () => {
          void loadMatchAndClips();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, loadMatchAndClips]);

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
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleOutcomeSelect = (outcome: string) => {
    setSelectedOutcome(outcome);
    if (outcome !== 'wicket') {
      setSelectedOutType(null);
    }
  };

  const uploadClip = async () => {
    if (!selectedOutcome || !matchId) return;

    if (selectedOutcome === 'wicket' && !selectedOutType) {
      setError('Please select the type of dismissal');
      return;
    }

    if (usedBalls.has(confirmBallNumber)) {
      setError(`Ball ${confirmBallNumber} has already been recorded for Over ${overNumber}`);
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const outcomeValue = selectedOutcome.toLowerCase();
      const dismissalTypeValue =
        selectedOutcome === 'wicket' && selectedOutType ? selectedOutType.toLowerCase() : null;

      let videoUrl: string | null = null;

      if (recordingData) {
        const fileName = `${matchId}/${Date.now()}.webm`;
        const { error: uploadError } = await executeTrackedAction({
          tableName: 'storage.clips',
          action: 'upload',
          matchId,
          payload: { fileName, contentType: 'video/webm' },
          execute: () =>
            supabase.storage
              .from('clips')
              .upload(fileName, recordingData.blob, {
                contentType: 'video/webm',
                upsert: false,
              }),
        });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('clips').getPublicUrl(fileName);
        videoUrl = urlData.publicUrl;
      }

      const { error: dbError } = await executeTrackedAction({
        tableName: 'clips',
        action: 'insert',
        payload: {
          match_id: matchId,
          innings_number: currentInnings,
          over_number: overNumber,
          ball_number: confirmBallNumber,
          outcome: outcomeValue,
          dismissal_type: dismissalTypeValue,
          video_url: videoUrl,
          duration: recordingData?.duration ?? 0,
        },
        matchId,
        execute: async () =>
          supabase.from('clips').insert({
            match_id: matchId,
            innings_number: currentInnings,
            over_number: overNumber,
            ball_number: confirmBallNumber,
            outcome: outcomeValue,
            dismissal_type: dismissalTypeValue,
            video_url: videoUrl,
            duration: recordingData?.duration ?? 0,
          }),
      });

      if (dbError) {
        logger.error('Failed to insert clip into database', dbError);
        setError('Failed to save ball outcome. Please try again.');
        setIsUploading(false);
        return;
      }

      const nextBall = confirmBallNumber + 1;
      if (nextBall > ballsPerOver) {
        // Over is complete — show confirm/edit modal instead of auto-advancing
        const nextOver = overNumber + 1;
        const advanceInnings = nextOver > totalOvers && currentInnings === 1;
        setOverCompleteData({ completedOver: overNumber, nextOver, advanceInnings });
      } else {
        setBallNumber(nextBall);
      }

      setShowDrawer(false);
      setSelectedOutcome(null);
      setSelectedOutType(null);
      setRecordingData(null);
      setIsUploading(false);
    } catch (err) {
      console.error('Upload error:', err);
      setIsUploading(false);
    }
  };

  const handleSkipRecording = () => {
    setRecordingData(null);
    setConfirmBallNumber(ballNumber);
    setShowDrawer(true);
  };

  const handleOverConfirm = async () => {
    if (!overCompleteData || !matchId) return;
    const { nextOver, advanceInnings } = overCompleteData;
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
      setCurrentInnings(2);
      setOverNumber(1);
      setBallNumber(1);
      setInningsComplete(false);
    } else {
      setOverNumber(nextOver);
      setBallNumber(1);
    }
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
        .select('id, ball_number, outcome, dismissal_type')
        .eq('match_id', matchId)
        .eq('innings_number', currentInnings)
        .eq('over_number', overCompleteData.completedOver)
        .order('ball_number');
      setEditableOverBalls(data || []);
      setEditBallOutcome({});
      setEditBallDismissalType({});
    }
  };

  const handleSaveOverEdits = async () => {
    for (const ball of editableOverBalls) {
      const selectedOutcome = editBallOutcome[ball.ball_number] ?? ball.outcome;
      const selectedDismissal = editBallDismissalType[ball.ball_number] ?? ball.dismissal_type ?? '';
      const normalizedOutcome = selectedOutcome.toLowerCase();
      const normalizedDismissal =
        normalizedOutcome === 'wicket' ? (selectedDismissal ? selectedDismissal.toLowerCase() : null) : null;

      if (normalizedOutcome === 'wicket' && !normalizedDismissal) {
        setError(`Select dismissal type for ball ${ball.ball_number}`);
        return;
      }

      if (ball.id) {
        await supabase
          .from('clips')
          .update({ outcome: normalizedOutcome, dismissal_type: normalizedDismissal })
          .eq('id', ball.id);
      }
    }
    setUmpireAuthenticated(false);
    setEditableOverBalls([]);
    setEditBallOutcome({});
    setEditBallDismissalType({});
  };

  const handleCancel = () => {
    setShowDrawer(false);
    setSelectedOutcome(null);
    setSelectedOutType(null);
    setRecordingData(null);
  };

  return (
    <div className="relative h-full bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />

      <canvas ref={canvasRef} className="hidden" />

      <div className="absolute top-0 left-0 right-0 p-4 text-white z-10 space-y-2">
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
      </div>

      <div className="absolute bottom-0 left-0 right-0 pb-20 px-4 z-10">
        <div className="flex justify-center items-center gap-4">
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
              className="w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center transition-all shadow-lg"
              title="Log outcome without recording"
            >
              <SkipForward size={22} className="text-white" />
            </button>
          )}
        </div>
      </div>

      {overCompleteData && !showUmpireAuth && !umpireAuthenticated && (
        <div className="absolute inset-x-0 bottom-0 bg-gray-900 border-t-2 border-yellow-400 rounded-t-2xl p-6 pb-24 z-20">
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
        <div className="absolute inset-x-0 bottom-0 bg-gray-900 border-t-2 border-yellow-400 rounded-t-2xl p-6 pb-24 z-20">
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
        <div className="absolute inset-x-0 bottom-0 bg-gray-900 border-t-2 border-yellow-400 rounded-t-2xl p-6 pb-24 z-20 overflow-y-auto max-h-[80vh]">
          <div className="flex justify-center mb-4">
            <ChevronUp size={32} className="text-gray-600" />
          </div>
          <h3 className="text-white text-xl font-bold mb-4 text-center">
            Edit Over {overCompleteData?.completedOver}
          </h3>
          <div className="space-y-3 mb-6">
            {editableOverBalls.map((ball) => (
              <div key={ball.ball_number} className="flex items-center gap-3 bg-gray-800 rounded-lg p-3">
                <span className="text-gray-400 text-sm w-16 flex-shrink-0">Ball {ball.ball_number}</span>
                <div className="flex-1 space-y-2">
                  <select
                    value={editBallOutcome[ball.ball_number] ?? ball.outcome}
                    onChange={(e) => {
                      const value = e.target.value;
                      setEditBallOutcome(prev => ({ ...prev, [ball.ball_number]: value }));
                      if (value !== 'wicket') {
                        setEditBallDismissalType(prev => ({ ...prev, [ball.ball_number]: '' }));
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
                    <option value="wicket">Wicket</option>
                    <option value="other">Other</option>
                  </select>
                  {(editBallOutcome[ball.ball_number] ?? ball.outcome) === 'wicket' && (
                    <select
                      value={editBallDismissalType[ball.ball_number] ?? ball.dismissal_type ?? ''}
                      onChange={(e) =>
                        setEditBallDismissalType(prev => ({ ...prev, [ball.ball_number]: e.target.value }))
                      }
                      className="w-full bg-gray-700 border border-gray-600 text-white py-2 px-3 rounded-lg focus:outline-none focus:border-yellow-400"
                    >
                      <option value="">Select dismissal type</option>
                      {DISMISSAL_TYPES.map((kind) => (
                        <option key={kind} value={kind}>
                          {kind}
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
        <div className="absolute inset-x-0 bottom-0 bg-gray-900 border-t-2 border-green-400 rounded-t-2xl p-6 pb-24 z-20 animate-slide-up">
          <div className="flex justify-center mb-4">
            <ChevronUp size={32} className="text-gray-600" />
          </div>

          <h3 className="text-white text-xl font-bold mb-4 text-center">
            Confirm Recording
          </h3>

          {ballNumber === 1 && overNumber > 1 && (
            <div className="bg-yellow-400/20 border border-yellow-400 rounded-lg p-3 mb-4 text-center">
              <p className="text-yellow-400 font-semibold">
                Over {overNumber - 1} Complete! Starting Over {overNumber}
              </p>
            </div>
          )}

          <div className="space-y-4 mb-6">
            <div>
              <div className="bg-gray-800 border border-green-400 rounded-lg p-4 text-center">
                <div className="text-gray-400 text-sm mb-1">Recording - Innings {currentInnings}</div>
                <div className="text-white text-3xl font-bold">
                  Over {overNumber} - Ball {confirmBallNumber}
                </div>
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-2 block">Outcome</label>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {['dot', '1', '2', '3'].map((outcome) => (
                  <button
                    key={outcome}
                    onClick={() => handleOutcomeSelect(outcome)}
                    className={`py-3 rounded-lg font-bold transition-colors ${
                      selectedOutcome === outcome
                        ? 'bg-green-500 text-black'
                        : 'bg-gray-800 hover:bg-gray-700 text-white'
                    }`}
                  >
                    {outcome === 'dot' ? 'Dot' : outcome}
                  </button>
                ))}
                {['4', '6', 'wicket', 'other'].map((outcome) => (
                  <button
                    key={outcome}
                    onClick={() => handleOutcomeSelect(outcome)}
                    className={`py-3 rounded-lg font-bold transition-colors ${
                      selectedOutcome === outcome
                        ? outcome === 'wicket' ? 'bg-red-500 text-white' : 'bg-yellow-400 text-black'
                        : 'bg-gray-800 hover:bg-gray-700 text-white'
                    }`}
                  >
                    {outcome === 'wicket' ? 'Wicket' : outcome === 'other' ? 'Other' : outcome}
                  </button>
                ))}
              </div>

              {selectedOutcome === 'wicket' && (
                <div>
                  <label className="text-gray-400 text-xs mb-2 block">Type of Dismissal</label>
                  <select
                    value={selectedOutType || ''}
                    onChange={(e) => setSelectedOutType(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white py-3 px-3 rounded-lg focus:outline-none focus:border-red-400"
                  >
                    <option value="">Select dismissal type</option>
                    <option value="bowled">Bowled</option>
                    <option value="caught">Caught</option>
                    <option value="lbw">Leg Before Wicket (LBW)</option>
                    <option value="runout">Run Out</option>
                    <option value="stumped">Stumped</option>
                    <option value="hitwicket">Hit Wicket</option>
                    <option value="hitballtwice">Hit the Ball Twice</option>
                    <option value="obstructing">Obstructing the Field</option>
                    <option value="timedout">Timed Out</option>
                    <option value="handledball">Handled the Ball</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/50 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              disabled={isUploading}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={uploadClip}
              disabled={!selectedOutcome || isUploading}
              className="flex-1 bg-green-500 hover:bg-green-600 text-black font-bold py-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Uploading...' : 'Save Clip'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
