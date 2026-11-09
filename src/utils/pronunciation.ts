import { VoiceAccent } from '../types/vocabulary';

class PronunciationService {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private accent: VoiceAccent = 'en-GB';
  private speakTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
  }

  public setAccent(accent: VoiceAccent) {
    this.accent = accent;
  }

  public getAccent(): VoiceAccent {
    return this.accent;
  }

  public speak(
    text: string,
    options?: {
      rate?: number;
      accent?: VoiceAccent;
      onStart?: () => void;
      onEnd?: () => void;
    }
  ) {
    if (!this.synth) {
      options?.onEnd?.();
      return;
    }

    if (this.speakTimer) {
      clearTimeout(this.speakTimer);
      this.speakTimer = null;
    }

    const synth = this.synth;
    const wasSpeaking = synth.speaking || synth.pending;

    try {
      synth.cancel();
    } catch {
      // ignore cancel errors
    }

    const startUtterance = () => {
      try {
        const cleanText = text.replace(/^[•*]+\s*/, '').trim();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        const targetLang = options?.accent || this.accent;
        const requestedRate = options?.rate ?? 0.92;

        if (this.voices.length === 0) {
          this.loadVoices();
        }

        // For slow tortoise mode (rate <= 0.65), prefer localService voice if available as some network voices ignore rate
        const isSlowMode = requestedRate <= 0.65;
        const preferredVoice =
          (isSlowMode &&
            this.voices.find(
              (v) => v.lang.replace('_', '-') === targetLang && v.localService
            )) ||
          this.voices.find(
            (v) =>
              v.lang.replace('_', '-') === targetLang &&
              (v.name.includes('Google') || v.name.includes('Natural'))
          ) ||
          this.voices.find((v) => v.lang.replace('_', '-') === targetLang) ||
          this.voices.find((v) => v.lang.startsWith('en'));

        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        utterance.lang = targetLang;
        utterance.rate = requestedRate;
        utterance.pitch = isSlowMode ? 0.95 : 1.0;

        utterance.onstart = () => options?.onStart?.();
        utterance.onend = () => options?.onEnd?.();
        utterance.onerror = () => options?.onEnd?.();

        synth. resume?.();
        synth.speak(utterance);
      } catch {
        options?.onEnd?.();
      }
    };

    // Small delay after cancel() when interrupting active speech prevents Android Chrome WebSpeech from dropping the new utterance
    if (wasSpeaking) {
      this.speakTimer = setTimeout(startUtterance, 40);
    } else {
      startUtterance();
    }
  }

  public stop() {
    if (this.speakTimer) {
      clearTimeout(this.speakTimer);
      this.speakTimer = null;
    }
    if (this.synth) {
      this.synth.cancel();
    }
  }
}

export const pronunciation = new PronunciationService();
