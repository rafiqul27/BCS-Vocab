import { VoiceAccent } from '../types/vocabulary';

class PronunciationService {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private accent: VoiceAccent = 'en-GB';

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

    try {
      this.synth.cancel();

      const cleanText = text.replace(/^[•*]+\s*/, '').trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const targetLang = options?.accent || this.accent;

      if (this.voices.length === 0) {
        this.loadVoices();
      }

      // Prefer high-quality natural English voice matching target accent
      const preferredVoice =
        this.voices.find(
          (v) => v.lang.replace('_', '-') === targetLang && (v.name.includes('Google') || v.name.includes('Natural'))
        ) ||
        this.voices.find((v) => v.lang.replace('_', '-') === targetLang) ||
        this.voices.find((v) => v.lang.startsWith('en'));

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.lang = targetLang;
      utterance.rate = options?.rate ?? 0.92;
      utterance.pitch = 1.0;

      utterance.onstart = () => options?.onStart?.();
      utterance.onend = () => options?.onEnd?.();
      utterance.onerror = () => options?.onEnd?.();

      this.synth.speak(utterance);
    } catch {
      options?.onEnd?.();
    }
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel();
    }
  }
}

export const pronunciation = new PronunciationService();
