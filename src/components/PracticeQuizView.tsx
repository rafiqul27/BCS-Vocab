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
  const [quizMode, setQuizMode] = useState<'flashcard' | 'mcq' | 'blank'>('flashcard');
  const [filterPriority, setFilterPriority] = useState<'all_learned' | 'newly_learned'>('all_learned');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [sessionWordIds, setSessionWordIds] = useState<number[]>([]);

  const newlyLearnedCount = useMemo(() => {
    return prioritizedWords.filter((w) => {
      const rec = learnedMap[w.id];
      return !rec || rec.reviewCount === 0 || rec.status === 'newly_learned';
    }).length;
  }, [prioritizedWords, learnedMap]);

  const buildDeck = (priorityFilter: 'all_learned' | 'newly_learned') => {
    const filtered =
      priorityFilter === 'newly_learned'
        ? prioritizedWords.filter((w) => {
            const rec = learnedMap[w.id];
            return !rec || rec.reviewCount === 0 || rec.status === 'newly_learned';
          })
        : prioritizedWords;
    const source = filtered.length > 0 ? filtered : prioritizedWords;
    setSessionWordIds(source.map((w) => w.id));
    setCurrentIndex(0);
    setIsFlipped(false);
    setSelectedOptionId(null);
  };

  useEffect(() => {
    if (prioritizedWords.length > 0 && sessionWordIds.length === 0) {
      buildDeck(filterPriority);
    }
  }, [prioritizedWords.length]);

  const activeWord = useMemo(() => {
    const targetId = sessionWordIds[currentIndex];
    if (targetId) {
      const found = allWords.find((w) => w.id === targetId);
      if (found) return found;
    }
    return prioritizedWords[0] || null;
  }, [sessionWordIds, currentIndex, allWords, prioritizedWords]);

  const activeRecord = activeWord ? learnedMap[activeWord.id] : undefined;

  const mcqOptions = useMemo(() => {
    if (!activeWord) return [];
    const distractors: VocabWord[] = [];
    const seed = activeWord.id * 37 + currentIndex * 13;
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
  }, [activeWord, allWords, currentIndex]);

  useEffect(() => {
    if (autoPlayAudio && activeWord && quizMode !== 'blank') {
      pronunciation.speak(activeWord.word, { rate: 0.92 });
    }
  }, [activeWord?.id, autoPlayAudio, quizMode]);

  const handleSpeak = (text: string, rate = 0.92) => {
    setSpeaking(true);
    pronunciation.speak(text, {
      rate,
      onEnd: () => setSpeaking(false),
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
      buildDeck(filterPriority);
    }
  };

  const handleSelectOption = (optionWordId: number) => {
    if (selectedOptionId !== null || !activeWord) return;
    setSelectedOptionId(optionWordId);
    const isCorrect = optionWordId === activeWord.id;
    onRecordReview(activeWord.id, isCorrect);
    if (quizMode === 'blank') {
      pronunciation.speak(activeWord.word, { rate: 0.92 });
    }
  };

  const handleNextQuestion = () => {
    setSelectedOptionId(null);
    setIsFlipped(false);
    if (currentIndex < sessionWordIds.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      buildDeck(filterPriority);
    }
  };

  const renderBlankedSentence = (sentence: string, target: string, revealed: boolean) => {
    const cleanTarget = target.replace(/[^a-zA-Z]/g, '');
    if (!cleanTarget || cleanTarget.length < 3) return sentence;
    const stem = cleanTarget.length > 5 ? cleanTarget.slice(0, -1) : cleanTarget;
    const regex = new RegExp(`(\\b${stem}[a-zA-Z]*\\b)`, 'gi');
    const parts = sentence.split(regex);
    return parts.map((part, idx) =>
      regex.test(part) ? (
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
          {/* Top Header Strip with Larger Font & Controls */}
          <div className="pb-2 border-b border-slate-200/70 dark:border-slate-800 shrink-0 space-y-1.5">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 text-sm font-mono-num min-w-0">
                <span className="font-extrabold">
                  {currentIndex + 1}/{Math.max(1, sessionWordIds.length)}
                </span>
                <span aria-hidden="true" className="opacity-35">·</span>
                <span className="opacity-70">#{String(activeWord.id).padStart(3, '0')}</span>
                <span aria-hidden="true" className="opacity-35">·</span>
                <span
                  className={
                    !activeRecord || activeRecord.reviewCount === 0 || activeRecord.status === 'newly_learned'
                      ? 'text-amber-500 font-bold'
                      : 'text-emerald-500 font-bold'
                  }
                >
                  {!activeRecord || activeRecord.reviewCount === 0 || activeRecord.status === 'newly_learned'
                    ? 'New'
                    : activeRecord.status === 'mastered'
                    ? '✓'
                    : `${activeRecord.reviewCount}x`}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const next = filterPriority === 'all_learned' ? 'newly_learned' : 'all_learned';
                    setFilterPriority(next);
                    buildDeck(next);
                  }}
                  title="Filter newly learned words"
                  className={`h-9 px-2.5 rounded-xl text-xs font-mono-num border flex items-center gap-1 transition-colors ${
                    filterPriority === 'newly_learned'
                      ? 'bg-amber-500 text-white border-amber-500 font-bold'
                      : darkMode
                      ? 'border-slate-800 text-slate-300 hover:bg-slate-800'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{newlyLearnedCount}</span>
                </button>

                <div
                  className={`flex items-center p-0.5 rounded-xl border ${
                    darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200/70'
                  }`}
                >
                  {(
                    [
                      { id: 'flashcard', label: 'Card' },
                      { id: 'mcq', label: 'MCQ' },
                      { id: 'blank', label: 'Blank' },
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
                      className={`h-8 px-2.5 rounded-lg text-xs font-bold transition-colors ${
                        quizMode === m.id
                          ? darkMode
                            ? 'bg-slate-800 text-white'
                            : 'bg-white text-slate-900 shadow-2xs'
                          : 'opacity-65'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => buildDeck(filterPriority)}
                  title="Reset queue"
                  className={`h-9 w-9 rounded-xl border flex items-center justify-center transition-colors ${
                    darkMode
                      ? 'border-slate-800 text-slate-300 hover:bg-slate-800'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <RotateCcw className="w-4 h-4" />
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
                    onClick={() => handleSpeak(activeWord.word, 0.68)}
                    aria-label="Slow pronunciation"
                    className={`h-11 w-11 rounded-xl flex items-center justify-center transition-colors ${
                      darkMode
                        ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Turtle className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSpeak(activeWord.word, 0.92)}
                    aria-label="Pronounce word"
                    className={`h-11 w-11 rounded-xl flex items-center justify-center transition-colors ${
                      speaking
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

          {/* Vertically Stretched Body with Larger Fonts & Buttons */}
          {quizMode === 'flashcard' ? (
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
          ) : quizMode === 'mcq' ? (
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
            /* Fill-in-the-Blank Sentence Quiz Mode */
            <div className="flex-1 flex flex-col gap-2.5 min-h-0 overflow-hidden">
              <div
                className={`flex-[1.2] p-3.5 rounded-xl border flex flex-col justify-center min-h-0 overflow-y-auto ${
                  darkMode
                    ? 'bg-slate-800/40 border-slate-800'
                    : 'bg-slate-50 border-slate-200/80'
                }`}
              >
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
                {mcqOptions.map((opt) => {
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
          )}
        </div>
      )}
    </div>
  );
};
