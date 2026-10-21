export interface RelatedWord {
  id: number;
  word: string;
  partOfSpeech: string;
}

export interface VocabWord {
  id: number;
  clusterId: number;
  word: string;
  partOfSpeech: string;
  banglaMeaning: string;
  englishMeaning: string;
  sentenceEn: string;
  sentenceBn: string;
  relatedWords: RelatedWord[];
}

export interface VocabCorpus {
  metadata: {
    title: string;
    totalWords: number;
    totalClusters: number;
    lastOptimized: string;
  };
  words: VocabWord[];
}

export type MasteryStatus = 'newly_learned' | 'reviewing' | 'mastered';

export interface LearnedWordRecord {
  wordId: number;
  learnedAt: number; // timestamp (ms)
  lastReviewedAt: number | null;
  reviewCount: number;
  correctCount: number;
  status: MasteryStatus;
}

export interface DailyHistoryEntry {
  date: string; // YYYY-MM-DD
  setsCompleted: number;
  wordsLearned: number;
  quizReviewed: number;
}

export type ActiveTab = 'home' | 'daily' | 'quiz' | 'library';

export type VoiceAccent = 'en-US' | 'en-GB';
