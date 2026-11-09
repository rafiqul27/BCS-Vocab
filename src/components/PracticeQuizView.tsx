import React, { useState, useMemo, useEffect } from 'react';
import {
  Volume2,
  Turtle,
  Check,
  X,
  RotateCcw,
  Eye,
  BookOpen,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { VocabWord, LearnedWordRecord } from '../types/vocabulary';
import { pronunciation } from '../utils/pronunciation';

interface PracticeQuizViewProps {
  prioritizedWords: VocabWord[];
  allWords: VocabWord[];
  learnedMap: Record<number, LearnedWordRecord>;
  autoPlayAudio: boolean;
  darkMode: boolean;
  onRecordReview: (wordId: number, remembered: boolean) => void;
  onGoToDailyGoal: () => void;
  onQuickConfirmFirstSet: () => void;
}

export const PracticeQuizView: React.FC<PracticeQuizViewProps> = ({
  prioritizedWords,
  allWords,
  learnedMap,
  autoPlayAudio,
  darkMode,
  onRecordReview,
  onGoToDailyGoal,
  onQuickConfirmFirstSet,
}) => {
  // Default mode is 'blank', ordered: Blank, MCQ, Card
  const [quizMode, setQuizMode] = useState<'blank' | 'mcq' | 'flashcard'>('blank');
  const [filterPriority, setFilterPriority] = useState<'all_learned' | 'newly_learned'>('all_learned');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [speakingMode, setSpeakingMode] = useState<'none' | 'word' | 'slow'>('none');
  const [isResetting, setIsResetting] = useState(false);
  const [sessionWordIds, setSessionWordIds] = useState<number[]>([]);

  // Newly learned words: either unreviewed/newly_learned status, or if all have been reviewed, the latest learned cluster
  const newlyLearnedWords = useMemo(() => {
    const strictNew = prioritizedWords.filter((w) => {
      const rec = learnedMap[w.id];
      return !rec || rec.reviewCount === 0 || rec.status === 'newly_learned';
    });
    if (strictNew.length > 0) return strictNew;

    // Fallback if all learned words were reviewed: pick the most recently learned words (by learnedAt DESC)
    const sortedByRecent = [...prioritizedWords].sort((a, b) => {
      const tA = learnedMap[a.id]?.learnedAt ?? 0;
      const tB = learnedMap[b.id]?.learnedAt ?? 0;
      return tB - tA;
    });
    return sortedByRecent.slice(0, Math.min(10, sortedByRecent.length));
  }, [prioritizedWords, learnedMap]);

  const strictNewCount = useMemo(() => {
    return prioritizedWords.filter((w) => {
      const rec = learnedMap[w.id];
      return !rec || rec.reviewCount === 0 || rec.status === 'newly_learned';
    }).length;
  }, [prioritizedWords, learnedMap]);

  const buildDeck = (
    priorityFilter: 'all_learned' | 'newly_learned',
    shuffleDeck = false
  ) => {
    const source =
      priorityFilter === 'newly_learned' && newlyLearnedWords.length > 0
        ? newlyLearnedWords
        : prioritizedWords;
    const ids = source.map((w) => w.id);

    if (shuffleDeck && ids.length > 1) {
      const currentFirstId = sessionWordIds[currentIndex] ?? ids[0];
      const shuffled = [...ids].sort(() => Math.random() - 0.5);
      // Ensure the new first card differs from the previous card so Reset is immediately visible
      if (shuffled[0] === currentFirstId && shuffled.length > 1) {
        const swapIdx = 1 + Math.floor(Math.random() * (shuffled.length - 1));
        [shuffled[0], shuffled[swapIdx]] = [shuffled[swapIdx], shuffled[0]];
      }
      setSessionWordIds(shuffled);
    } else {
      setSessionWordIds(ids);
    }

    setCurrentIndex(0);
    setIsFlipped(false);
    setSelectedOptionId(null);
  };

  const handleResetQuiz = () => {
    setIsResetting(true);
    buildDeck(filterPriority, true);
    setTimeout(() => setIsResetting(false), 350);
  };

  useEffect(() => {
    if (prioritizedWords.length > 0 && sessionWordIds.length === 0) {
      buildDeck(filterPriority, false);
    }
  }, [prioritizedWords.length]);

  const activeWord = useMemo(() => {
    const targetId = sessionWordIds[currentIndex];
    if (targetId) {
      const found = allWords.find((w) => w.id === targetId);
      if (found) return found;
    }
    return (filterPriority === 'newly_learned' ? newlyLearnedWords[0] : prioritizedWords[0]) || null;
  }, [sessionWordIds, currentIndex, allWords, prioritizedWords, newlyLearnedWords, filterPriority]);

  // Options for BLANK mode: prioritize words from the SAME word cluster first!
  const blankOptions = useMemo(() => {
    if (!activeWord) return [];
    const distractors: VocabWord[] = [];
    const seed = activeWord.id * 37 + currentIndex * 13;

    // 1. Same cluster words first
    const sameClusterWords = allWords
      .filter((w) => w.clusterId === activeWord.clusterId && w.id !== activeWord.id)
      .sort((a, b) => ((a.id * 19 + seed) % 29) - ((b.id * 19 + seed) % 29));

    for (const cw of sameClusterWords) {
      if (distractors.length < 3) {
        distractors.push(cw);
      }
    }

    // 2. If cluster has fewer than 4 words total, fill remaining from learned words first
    if (distractors.length < 3) {
      const learnedCandidates = prioritizedWords
        .filter((w) => w.id !== activeWord.id && !distractors.some((d) => d.id === w.id))
        .sort((a, b) => ((a.id * 23 + seed) % 31) - ((b.id * 23 + seed) % 31));

      for (const lw of learnedCandidates) {
        if (distractors.length < 3) {
          distractors.push(lw);
        }
      }
    }

    // 3. Final fallback from allWords if fewer than 4 total words learned
    let step = 1;
    while (distractors.length < 3 && step < allWords.length) {
      const candidate = allWords[(seed + step * 79) % allWords.length];
      if (
        candidate.id !== activeWord.id &&
        !distractors.some((d) => d.id === candidate.id)
      ) {
        distractors.push(candidate);
      }
      step++;
    }

    const combined = [activeWord, ...distractors];
    return combined.sort((a, b) => ((a.id * 17 + seed) % 31) - ((b.id * 17 + seed) % 31));
  }, [activeWord, allWords, prioritizedWords, currentIndex]);

  // Options for MCQ mode: draw distractor meanings from LEARNED words (with distinct cluster meanings) first!
  const mcqOptions = useMemo(() => {
    if (!activeWord) return [];
    const distractors: VocabWord[] = [];
    const seed = activeWord.id * 41 + currentIndex * 17;

    // 1. Pick from learned words belonging to different clusters (so meanings are distinct)
    const learnedOtherClusters = prioritizedWords
      .filter((w) => w.clusterId !== activeWord.clusterId)
      .sort((a, b) => ((a.id * 23 + seed) % 37) - ((b.id * 23 + seed) % 37));

    for (const lw of learnedOtherClusters) {
      if (
        distractors.length < 3 &&
        !distractors.some((d) => d.clusterId === lw.clusterId)
      ) {
        distractors.push(lw);
      }
    }

    // 2. Fallback to allWords only if the user hasn't learned 4 different clusters yet
    let step = 1;
    while (distractors.length < 3 && step < allWords.length) {
      const candidate = allWords[(seed + step * 79) % allWords.length];
      if (
        candidate.clusterId !== activeWord.clusterId &&
        !distractors.some((d) => d.clusterId === candidate.clusterId)
      ) {
        distractors.push(candidate);
      }
      step++;
    }

    const combined = [activeWord, ...distractors];
    return combined.sort((a, b) => ((a.id * 17 + seed) % 31) - ((b.id * 17 + seed) % 31));
  }, [activeWord, prioritizedWords, allWords, currentIndex]);

  useEffect(() => {
    if (autoPlayAudio && activeWord && quizMode !== 'blank') {
      pronunciation.speak(activeWord.word, { rate: 1.0 });
    }
  }, [activeWord?.id, autoPlayAudio, quizMode]);

  const handleSpeak = (text: string, rate = 1.0, mode: 'word' | 'slow' = 'word') => {
    setSpeakingMode(mode);
    pronunciation.speak(text, {
      rate,
      onEnd: () => setSpeakingMode('none'),
    });
  };

  const handleGradeFlashcard = (remembered: boolean) => {
    if (!activeWord) return;
    onRecordReview(activeWord.id, remembered);
    setIsFlipped(false);
    setSelectedOptionId(null);
    if (currentIndex < sessionWordIds.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      buildDeck(filterPriority, true);
    }
  };

  const handleSelectOption = (optionWordId: number) => {
    if (selectedOptionId !== null || !activeWord) return;
    setSelectedOptionId(optionWordId);
    const isCorrect = optionWordId === activeWord.id;
    onRecordReview(activeWord.id, isCorrect);
    if (quizMode === 'blank') {
      pronunciation.speak(activeWord.word, { rate: 1.0 });
    }
  };

  const handleNextQuestion = () => {
    setSelectedOptionId(null);
    setIsFlipped(false);
    if (currentIndex < sessionWordIds.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      buildDeck(filterPriority, true);
    }
  };

  const renderBlankedSentence = (sentence: string, target: string, revealed: boolean) => {
    const cleanTarget = target.replace(/[^a-zA-Z-]/g, '');
    if (!cleanTarget) return sentence;

    // Match exact word first (or plural/tense inflections), avoiding false matches on other derivatives
    const exactRegex = new RegExp(`(\\b${cleanTarget}(?:s|es|ed|ing|d)?\\b)`, 'gi');
    const stem = cleanTarget.length > 5 ? cleanTarget.slice(0, -1) : cleanTarget;
    const fallbackRegex = new RegExp(`(\\b${stem}[a-zA-Z]*\\b)`, 'gi');
    const activeRegex = exactRegex.test(sentence) ? exactRegex : fallbackRegex;

    const parts = sentence.split(activeRegex);
    return parts.map((part, idx) =>
      activeRegex.test(part) ? (
        <span
          key={idx}
          className={`inline-block font-bold px-2 py-0.5 mx-0.5 rounded-md border-b-2 ${
            revealed
              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-300'
              : 'bg-indigo-500/15 border-indigo-500 text-transparent select-none min-w-[76px]'
          }`}
        >
          {revealed ? part : '_______'}
        </span>
      ) : (
        <React.Fragment key={idx}>{part}</React.Fragment>
      )
    );
  };

  if (prioritizedWords.length === 0) {
    return (
      <div
        className={`flex-1 rounded-2xl p-6 flex flex-col items-center justify-center text-center border ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${
            darkMode ? 'bg-indigo-500/15 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
          }`}
        >
          <BookOpen className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold font-display">No Learned Words Yet</h2>
        <p className={`mt-1 text-sm max-w-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Confirm a cluster in Daily Goal first, or quick-start below.
        </p>

        <div className="mt-5 flex gap-3 w-full max-w-xs">
          <button
            type="button"
            onClick={onGoToDailyGoal}
            className="flex-1 h-12 px-4 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-500 transition-colors"
          >
            Daily Goal
          </button>
          <button
            type="button"
            onClick={onQuickConfirmFirstSet}
            className={`flex-1 h-12 px-4 rounded-xl border text-sm font-bold transition-colors ${
              darkMode
                ? 'border-slate-700 text-slate-200 hover:bg-slate-800'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Quick-Start
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {activeWord && (
        <div
          className={`flex-1 rounded-2xl p-3 sm:p-4 border flex flex-col gap-2 min-h-0 overflow-hidden ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
          }`}
        >
          {/* Top Header Strip */}
          <div className="pb-2 border-b border-slate-200/70 dark:border-slate-800 shrink-0 space-y-1.5">
            <div className="flex items-center justify-between gap-1.5">
              {/* Left: Progress & New Filter Toggle Button */}
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-sm font-mono-num font-extrabold">
                  {currentIndex + 1}/{Math.max(1, sessionWordIds.length)}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    const next = filterPriority === 'all_learned' ? 'newly_learned' : 'all_learned';
                    setFilterPriority(next);
                    buildDeck(next, false);
                  }}
                  title={
                    filterPriority === 'newly_learned'
                      ? 'Showing newly learned words (Tap for All Learned)'
                      : 'Tap to filter Newly Learned words only'
                  }
                  className={`h-8 px-2.5 rounded-xl text-xs font-bold border flex items-center gap-1 transition-all shrink-0 ${
                    filterPriority === 'newly_learned'
                      ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                      : darkMode
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-500/20'
                      : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {filterPriority === 'newly_learned'
                      ? `New (${newlyLearnedWords.length})`
                      : `New: ${strictNewCount > 0 ? strictNewCount : newlyLearnedWords.length}`}
                  </span>
                </button>
              </div>

              {/* Right: Mode Switcher (Blank | MCQ | Card) + Reset */}
              <div className="flex items-center gap-1 shrink-0">
                <div
                  className={`flex items-center p-0.5 rounded-xl border ${
                    darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200/70'
                  }`}
                >
                  {(
                    [
                      { id: 'blank', label: 'Blank' },
                      { id: 'mcq', label: 'MCQ' },
                      { id: 'flashcard', label: 'Card' },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setQuizMode(m.id);
                        setIsFlipped(false);
                        setSelectedOptionId(null);
                      }}
                      className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-colors ${
                        quizMode === m.id
                          ? darkMode
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-slate-900 shadow-2xs'
                          : 'opacity-65 hover:opacity-100'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleResetQuiz}
                  title="Reset & shuffle quiz deck"
                  aria-label="Reset quiz deck"
                  className={`h-8 w-8 rounded-xl border flex items-center justify-center transition-all active:scale-95 ${
                    isResetting
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : darkMode
                      ? 'border-slate-800 text-slate-300 hover:bg-slate-800'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <RotateCcw className={`w-3.5 h-3.5 transition-transform duration-300 ${isResetting ? '-rotate-180' : ''}`} />
                </button>
              </div>
            </div>

            {quizMode !== 'blank' && (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-baseline gap-2.5 min-w-0 flex-wrap">
                  <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-display break-words">
                    {activeWord.word}
                  </h1>
                  <span className="text-sm font-mono-num font-bold text-indigo-600 dark:text-indigo-400">
                    {activeWord.partOfSpeech}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSpeak(activeWord.word, 0.7, 'slow')}
                    aria-label="Slow pronunciation"
                    title="Slow pronunciation"
                    className={`h-11 w-11 rounded-xl flex items-center justify-center transition-colors ${
                      speakingMode === 'slow'
                        ? 'bg-indigo-600 text-white'
                        : darkMode
                        ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Turtle className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSpeak(activeWord.word, 1.0, 'word')}
                    aria-label="Pronounce word"
                    title="Pronounce word"
                    className={`h-11 w-11 rounded-xl flex items-center justify-center transition-colors ${
                      speakingMode === 'word'
                        ? 'bg-indigo-600 text-white'
                        : darkMode
                        ? 'bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30'
                        : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                    }`}
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Vertically Stretched Body: Blank | MCQ | Card */}
          {quizMode === 'blank' ? (
            /* 1. Fill-in-the-Blank Sentence Quiz (Options from Same Cluster first) */
            <div className="flex-1 flex flex-col gap-2.5 min-h-0 overflow-hidden">
              <div
                className={`flex-[1.2] p-3.5 rounded-xl border flex flex-col justify-center min-h-0 overflow-y-auto ${
                  darkMode
                    ? 'bg-slate-800/40 border-slate-800'
                    : 'bg-slate-50 border-slate-200/80'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono-num opacity-65 mb-1.5">
                  <span>Cluster #{String(activeWord.clusterId).padStart(3, '0')} · #{String(activeWord.id).padStart(3, '0')}</span>
                </div>
                <p className="text-base sm:text-lg leading-relaxed">
                  {renderBlankedSentence(
                    activeWord.sentenceEn,
                    activeWord.word,
                    selectedOptionId !== null
                  )}
                </p>
                {activeWord.sentenceBn && (
                  <p
                    className={`mt-2 text-sm sm:text-base font-bangla leading-relaxed ${
                      darkMode ? 'text-emerald-300/90' : 'text-emerald-900'
                    }`}
                  >
                    ({activeWord.sentenceBn})
                  </p>
                )}
              </div>

              <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-2 min-h-0">
                {blankOptions.map((opt) => {
                  const isSelected = selectedOptionId === opt.id;
                  const isCorrect = opt.id === activeWord.id;
                  const showResult = selectedOptionId !== null;

                  let btnStyle = darkMode
                    ? 'bg-slate-800/60 border-slate-700 hover:bg-slate-800 text-slate-100'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-900';

                  if (showResult) {
                    if (isCorrect) {
                      btnStyle = darkMode
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
                        : 'bg-emerald-50 border-emerald-500 text-emerald-950';
                    } else if (isSelected && !isCorrect) {
                      btnStyle = darkMode
                        ? 'bg-rose-950/60 border-rose-500 text-rose-200'
                        : 'bg-rose-50 border-rose-500 text-rose-950';
                    } else {
                      btnStyle = 'opacity-40 border-slate-200 dark:border-slate-800';
                    }
                  }

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={showResult}
                      onClick={() => handleSelectOption(opt.id)}
                      className={`h-full min-h-0 px-3 py-2 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${btnStyle}`}
                    >
                      <span className="text-base sm:text-lg font-extrabold font-display break-words">
                        {opt.word}
                      </span>
                      <span className="text-xs sm:text-sm font-mono-num opacity-65 mt-0.5">
                        {opt.partOfSpeech}
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedOptionId !== null && (
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  className="w-full h-12 px-5 rounded-xl bg-indigo-600 text-white text-base font-bold flex items-center justify-center gap-2 hover:bg-indigo-500 shrink-0 transition-colors"
                >
                  <span>Next</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </div>
          ) : quizMode === 'mcq' ? (
            /* 2. MCQ Mode (Options from Learned Words' Meanings) */
            <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-hidden">
              <div className="flex-1 grid grid-rows-4 gap-2 min-h-0">
                {mcqOptions.map((opt) => {
                  const isSelected = selectedOptionId === opt.id;
                  const isCorrect = opt.id === activeWord.id;
                  const showResult = selectedOptionId !== null;

                  let btnStyle = darkMode
                    ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 text-slate-100'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 text-slate-900';

                  if (showResult) {
                    if (isCorrect) {
                      btnStyle = darkMode
                        ? 'bg-emerald-950/50 border-emerald-500 text-emerald-200'
                        : 'bg-emerald-50 border-emerald-500 text-emerald-950';
                    } else if (isSelected && !isCorrect) {
                      btnStyle = darkMode
                        ? 'bg-rose-950/50 border-rose-500 text-rose-200'
                        : 'bg-rose-50 border-rose-500 text-rose-950';
                    } else {
                      btnStyle = 'opacity-45 border-slate-200 dark:border-slate-800';
                    }
                  }

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={showResult}
                      onClick={() => handleSelectOption(opt.id)}
                      className={`w-full h-full min-h-0 px-3.5 py-2 rounded-xl border text-left flex items-center justify-between gap-2 transition-all overflow-hidden ${btnStyle}`}
                    >
                      <div className="min-w-0">
                        <p className="text-base sm:text-lg font-bold font-bangla leading-snug line-clamp-1">
                          {opt.banglaMeaning}
                        </p>
                        <p className="text-xs sm:text-sm opacity-80 line-clamp-1 mt-0.5">
                          {opt.englishMeaning}
                        </p>
                      </div>

                      {showResult && isCorrect && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      )}
                      {showResult && isSelected && !isCorrect && (
                        <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedOptionId !== null && (
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  className="w-full h-12 px-5 rounded-xl bg-indigo-600 text-white text-base font-bold flex items-center justify-center gap-2 hover:bg-indigo-500 shrink-0 transition-colors"
                >
                  <span>Next</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </div>
          ) : (
            /* 3. Flashcard Mode */
            <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-hidden">
              {!isFlipped ? (
                <button
                  type="button"
                  onClick={() => setIsFlipped(true)}
                  className={`flex-1 w-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2.5 transition-all ${
                    darkMode
                      ? 'border-slate-800 bg-slate-800/20 hover:bg-slate-800/40 text-slate-200'
                      : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100/70 text-slate-800'
                  }`}
                >
                  <Eye className="w-8 h-8 text-indigo-500" />
                  <span className="text-lg sm:text-xl font-bold font-display">Tap to Reveal</span>
                </button>
              ) : (
                <>
                  <div
                    className={`flex-1 p-3.5 rounded-xl border flex flex-col justify-center min-h-0 overflow-y-auto ${
                      darkMode
                        ? 'bg-emerald-950/25 border-emerald-900/50'
                        : 'bg-emerald-50/60 border-emerald-200'
                    }`}
                  >
                    <p
                      className={`text-xl sm:text-2xl font-bold font-bangla leading-snug ${
                        darkMode ? 'text-emerald-300' : 'text-emerald-950'
                      }`}
                    >
                      {activeWord.banglaMeaning}
                    </p>
                    <p
                      className={`mt-1.5 text-base sm:text-lg font-semibold leading-snug ${
                        darkMode ? 'text-slate-200' : 'text-slate-800'
                      }`}
                    >
                      {activeWord.englishMeaning}
                    </p>
                  </div>

                  <div
                    className={`flex-[1.3] p-3.5 rounded-xl border flex flex-col justify-center min-h-0 overflow-y-auto ${
                      darkMode
                        ? 'bg-slate-800/30 border-slate-800'
                        : 'bg-slate-50/70 border-slate-200/80'
                    }`}
                  >
                    <p className="text-base sm:text-lg leading-relaxed">{activeWord.sentenceEn}</p>
                    {activeWord.sentenceBn && (
                      <p
                        className={`mt-2 text-sm sm:text-base font-bangla leading-relaxed ${
                          darkMode ? 'text-slate-300' : 'text-slate-600'
                        }`}
                      >
                        ({activeWord.sentenceBn})
                      </p>
                    )}
                  </div>

                  <div className="pt-1 grid grid-cols-2 gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleGradeFlashcard(false)}
                      className={`h-12 px-4 rounded-xl border text-base font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.99] ${
                        darkMode
                          ? 'bg-amber-950/30 border-amber-800/60 text-amber-300'
                          : 'bg-amber-50 border-amber-200 text-amber-900'
                      }`}
                    >
                      <X className="w-5 h-5" />
                      <span>Again</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleGradeFlashcard(true)}
                      className="h-12 px-4 rounded-xl bg-emerald-600 text-white text-base font-bold flex items-center justify-center gap-2 hover:bg-emerald-500 active:scale-[0.99] transition-all"
                    >
                      <Check className="w-5 h-5" />
                      <span>Got It</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
