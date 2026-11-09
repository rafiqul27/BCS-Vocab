import { VoiceAccent } from '../types/vocabulary';

class PronunciationService {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private accent: VoiceAccent = 'en-GB';
  private fallbackTimer: ReturnType<typeof setTimeout> | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

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
      // Detach callbacks from any previous utterance so cancel() does not prematurely trigger onEnd for the new speech
      if (this.currentUtterance) {
        this.currentUtterance.onstart = null;
        this.currentUtterance.onend = null;
        this.currentUtterance.onerror = null;
        this.currentUtterance = null;
      }

      if (this.synth.speaking || this.synth.pending) {
        this.synth.cancel();
      }

      const requestedRate = options?.rate ?? 1.0;
      const isSlow = requestedRate <= 0.75;

      const cleanText = text.replace(/^[•*]+\s*/, '').trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      this.currentUtterance = utterance;

      const targetLang = options?.accent || this.accent;

      if (this.voices.length === 0) {
        this.loadVoices();
      }

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
      // Web Speech API compresses rate nonlinearly on single words; 0.45 produces a clear ~0.7x audible slow pronunciation vs 1.0x normal
      utterance.rate = isSlow ? 0.45 : requestedRate;
      utterance.pitch = 1.0;

      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        if (this.currentUtterance === utterance) {
          this.currentUtterance = null;
        }
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
      this.fallbackTimer = setTimeout(finish, 4500);
    } catch {
      options?.onEnd?.();
    }
  }

  public stop() {
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    if (this.currentUtterance) {
      this.currentUtterance.onstart = null;
      this.currentUtterance.onend = null;
      this.currentUtterance.onerror = null;
      this.currentUtterance = null;
    }
    if (this.synth && (this.synth.speaking || this.synth.pending)) {
      this.synth.cancel();
    }
  }
}

export const pronunciation = new PronunciationService();
