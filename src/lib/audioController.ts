export class AudioController {
  private audioContext: AudioContext | null = null;

  private initContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  playBeep(duration: number = 200, frequency: number = 1000): Promise<void> {
    return new Promise((resolve) => {
      const ctx = this.initContext();
      if (!ctx) {
        resolve();
        return;
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = frequency;
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration / 1000);

      setTimeout(resolve, duration);
    });
  }

  playSuccessChime(): Promise<void> {
    return new Promise(async (resolve) => {
      const ctx = this.initContext();
      if (!ctx) {
        resolve();
        return;
      }

      const frequencies = [523.25, 659.25, 783.99];
      const duration = 150;

      for (const freq of frequencies) {
        await this.playBeep(duration, freq);
      }
      resolve();
    });
  }

  pauseRecognition(recognitionRef: any): void {
    if (recognitionRef && recognitionRef.abort) {
      recognitionRef.abort();
    }
  }

  resumeRecognition(recognitionRef: any): void {
    if (recognitionRef && recognitionRef.start) {
      try {
        recognitionRef.start();
      } catch (e) {
      }
    }
  }
}

export const audioController = new AudioController();
