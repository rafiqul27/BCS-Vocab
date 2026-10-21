import { useState, useEffect, useMemo, useCallback } from 'react';
import vocabCorpusRaw from '../data/vocabularyData.json';
import {
  VocabCorpus,
  VocabWord,
  LearnedWordRecord,
  VoiceAccent,
} from '../types/vocabulary';
import { pronunciation } from '../utils/pronunciation';

const STORAGE_KEY = 'bcs_vocab_master_state_v1';

const corpus = vocabCorpusRaw as VocabCorpus;
const ALL_WORDS: VocabWord[] = corpus.words;

export interface SemanticClusterGroup {
  clusterId: number;
  words: VocabWord[];
  banglaMeaning: string;
  englishMeaning: string;
}

interface StoredState {
  learnedMap: Record<number, LearnedWordRecord>;
  accent: VoiceAccent;
  autoPlayAudio: boolean;
  darkMode: boolean;
}

const getInitialState = (): StoredState => {
  if (typeof window === 'undefined') {
    return {
      learnedMap: {},
      accent: 'en-GB',
      autoPlayAudio: false,
      darkMode: false,
    };
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        learnedMap: parsed.learnedMap || {},
        accent: parsed.accent || 'en-GB',
        autoPlayAudio: Boolean(parsed.autoPlayAudio),
        darkMode: Boolean(parsed.darkMode),
      };
    }
  } catch {
    // ignore storage errors
  }
  return {
    learnedMap: {},
    accent: 'en-GB',
    autoPlayAudio: false,
    darkMode: false,
  };
};

export function useLearningStore() {
  const [state, setState] = useState<StoredState>(getInitialState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota errors
    }
    pronunciation.setAccent(state.accent);
  }, [state]);

  const wordById = useMemo(() => {
    const map = new Map<number, VocabWord>();
    for (const w of ALL_WORDS) {
      map.set(w.id, w);
    }
    return map;
  }, []);

  // Group all words by semantic clusterId (1..485)
  const allClusters = useMemo<SemanticClusterGroup[]>(() => {
    const map = new Map<number, VocabWord[]>();
    for (const w of ALL_WORDS) {
      const list = map.get(w.clusterId) || [];
      list.push(w);
      map.set(w.clusterId, list);
    }
    const groups: SemanticClusterGroup[] = [];
    map.forEach((words, clusterId) => {
      groups.push({
        clusterId,
        words,
        banglaMeaning: words[0].banglaMeaning,
        englishMeaning: words[0].englishMeaning,
      });
    });
    return groups.sort((a, b) => a.clusterId - b.clusterId);
  }, []);

  // Unlearned semantic clusters (clusters that have at least 1 unlearned word)
  const unlearnedClusters = useMemo<SemanticClusterGroup[]>(() => {
    return allClusters
      .map((cluster) => ({
        ...cluster,
        words: cluster.words.filter((w) => !state.learnedMap[w.id]),
      }))
      .filter((cluster) => cluster.words.length > 0);
  }, [allClusters, state.learnedMap]);

  // Prioritized learned words for Practice Quiz:
  // Newly learned words first (learnedAt DESC, reviewCount === 0), then reviewing, then mastered
  const prioritizedQuizWords = useMemo(() => {
    const records = Object.values(state.learnedMap);
    records.sort((a, b) => {
      const aIsNew = a.reviewCount === 0 || a.status === 'newly_learned' ? 1 : 0;
      const bIsNew = b.reviewCount === 0 || b.status === 'newly_learned' ? 1 : 0;
      if (aIsNew !== bIsNew) return bIsNew - aIsNew;

      if (aIsNew && bIsNew) {
        return b.learnedAt - a.learnedAt;
      }

      if (a.status !== b.status) {
        if (a.status === 'reviewing') return -1;
        if (b.status === 'reviewing') return 1;
      }

      return b.learnedAt - a.learnedAt;
    });

    return records
      .map((rec) => wordById.get(rec.wordId))
      .filter((w): w is VocabWord => Boolean(w));
  }, [state.learnedMap, wordById]);

  // Confirm all words in the present cluster set
  const confirmWordSet = useCallback((wordIds: number[]) => {
    const now = Date.now();
    setState((prev) => {
      const nextLearned = { ...prev.learnedMap };
      wordIds.forEach((id, idx) => {
        nextLearned[id] = {
          wordId: id,
          learnedAt: now + (wordIds.length - idx),
          lastReviewedAt: null,
          reviewCount: prev.learnedMap[id]?.reviewCount ?? 0,
          correctCount: prev.learnedMap[id]?.correctCount ?? 0,
          status: 'newly_learned',
        };
      });
      return {
        ...prev,
        learnedMap: nextLearned,
      };
    });
  }, []);

  const recordQuizReview = useCallback((wordId: number, remembered: boolean) => {
    const now = Date.now();
    setState((prev) => {
      const existing = prev.learnedMap[wordId] || {
        wordId,
        learnedAt: now,
        lastReviewedAt: null,
        reviewCount: 0,
        correctCount: 0,
        status: 'newly_learned' as const,
      };

      const nextReviewCount = existing.reviewCount + 1;
      const nextCorrectCount = existing.correctCount + (remembered ? 1 : 0);

      let nextStatus = existing.status;
      if (remembered) {
        nextStatus = nextCorrectCount >= 2 ? 'mastered' : 'reviewing';
      } else {
        nextStatus = 'newly_learned';
      }

      return {
        ...prev,
        learnedMap: {
          ...prev.learnedMap,
          [wordId]: {
            ...existing,
            lastReviewedAt: now,
            reviewCount: nextReviewCount,
            correctCount: nextCorrectCount,
            status: nextStatus,
          },
        },
      };
    });
  }, []);

  const toggleWordLearned = useCallback((wordId: number) => {
    const now = Date.now();
    setState((prev) => {
      const nextLearned = { ...prev.learnedMap };
      if (nextLearned[wordId]) {
        delete nextLearned[wordId];
      } else {
        nextLearned[wordId] = {
          wordId,
          learnedAt: now,
          lastReviewedAt: null,
          reviewCount: 0,
          correctCount: 0,
          status: 'newly_learned',
        };
      }
      return {
        ...prev,
        learnedMap: nextLearned,
      };
    });
  }, []);

  const setAccent = useCallback((accent: VoiceAccent) => {
    setState((prev) => ({ ...prev, accent }));
  }, []);

  const setAutoPlayAudio = useCallback((autoPlayAudio: boolean) => {
    setState((prev) => ({ ...prev, autoPlayAudio }));
  }, []);

  const setDarkMode = useCallback((darkMode: boolean) => {
    setState((prev) => ({ ...prev, darkMode }));
  }, []);

  const resetAllProgress = useCallback(() => {
    setState((prev) => ({
      ...prev,
      learnedMap: {},
    }));
  }, []);

  const counts = useMemo(() => {
    const records = Object.values(state.learnedMap);
    const newlyLearned = records.filter((r) => r.status === 'newly_learned' || r.reviewCount === 0).length;
    const mastered = records.filter((r) => r.status === 'mastered').length;
    const learnedClustersCount = allClusters.length - unlearnedClusters.length;

    return {
      total: ALL_WORDS.length,
      learned: records.length,
      unlearned: ALL_WORDS.length - records.length,
      newlyLearned,
      mastered,
      totalClusters: allClusters.length,
      learnedClusters: learnedClustersCount,
      unlearnedClusters: unlearnedClusters.length,
    };
  }, [state.learnedMap, allClusters.length, unlearnedClusters.length]);

  return {
    allWords: ALL_WORDS,
    allClusters,
    unlearnedClusters,
    wordById,
    prioritizedQuizWords,
    learnedMap: state.learnedMap,
    counts,
    accent: state.accent,
    autoPlayAudio: state.autoPlayAudio,
    darkMode: state.darkMode,
    confirmWordSet,
    recordQuizReview,
    toggleWordLearned,
    setAccent,
    setAutoPlayAudio,
    setDarkMode,
    resetAllProgress,
  };
}
