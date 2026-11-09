import { VoiceAccent } from '../types/vocabulary';

class PronunciationService {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private accent: VoiceAccent = 'en-GB';
  private fallbackTimer: ReturnType<typeof setTimeout> | null = null;

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

    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }

    try {
      this.synth.cancel();

      const cleanText = text.replace(/^[•*]+\s*/, '').trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const targetLang = options?.accent || this.accent;

      if (this.voices.length === 0) {
        this.loadVoices();
      }

      // Use the same reliable voice for both normal (0.92x) and slow (0.7x) pronunciation
      const preferredVoice =
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
      utterance.rate = options?.rate ?? 0.92;
      utterance.pitch = 1.0;

      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        if (this.fallbackTimer) {
          clearTimeout(this.fallbackTimer);
          this.fallbackTimer = null;
        }
        options?.onEnd?.();
      };

      utterance.onstart = () => options?.onStart?.();
      utterance.onend = finish;
      utterance.onerror = finish;

      this.synth.speak(utterance);

      // Safety fallback in case Android WebView doesn't fire onend
      this.fallbackTimer = setTimeout(finish, 4000);
    } catch {
      options?.onEnd?.();
    }
  }

  public stop() {
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    if (this.synth) {
      this.synth.cancel();
    }
  }
}

export const pronunciation = new PronunciationService();
