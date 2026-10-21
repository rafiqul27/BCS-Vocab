import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Turtle,
  ChevronLeft,
  ChevronRight,
  Check,
  Layers,
  Award,
  X,
} from 'lucide-react';
import { VocabWord } from '../types/vocabulary';
import { SemanticClusterGroup } from '../hooks/useLearningStore';
import { pronunciation } from '../utils/pronunciation';

interface DailyGoalViewProps {
  unlearnedClusters: SemanticClusterGroup[];
  autoPlayAudio: boolean;
  darkMode: boolean;
  onConfirmSet: (wordIds: number[]) => void;
  onSelectWordDetail: (word: VocabWord) => void;
  onStartQuizAfterSet: () => void;
}

export const DailyGoalView: React.FC<DailyGoalViewProps> = ({
  unlearnedClusters,
  autoPlayAudio,
  darkMode,
  onConfirmSet,
  onStartQuizAfterSet,
}) => {
  const [clusterOffset, setClusterOffset] = useState(0);
  const [cardIndex, setCardIndex] = useState(0);
  const [showOverview, setShowOverview] = useState(false);
  const [speakingType, setSpeakingType] = useState<'none' | 'word' | 'slow' | 'sentence'>('none');
  const touchStartX = useRef<number | null>(null);

  const safeClusterOffset = Math.min(clusterOffset, Math.max(0, unlearnedClusters.length - 1));
  const currentCluster = unlearnedClusters[safeClusterOffset];
  const currentSetWords = currentCluster ? currentCluster.words : [];
  const activeWord = currentSetWords[cardIndex] || currentSetWords[0];

  useEffect(() => {
    if (cardIndex >= currentSetWords.length && currentSetWords.length > 0) {
      setCardIndex(0);
    }
  }, [currentSetWords.length, cardIndex]);

  useEffect(() => {
    if (autoPlayAudio && activeWord && !showOverview) {
      pronunciation.speak(activeWord.word, { rate: 0.92 });
    }
  }, [activeWord?.id, autoPlayAudio, showOverview]);

  const handleSpeak = (text: string, rate: number, type: 'word' | 'slow' | 'sentence') => {
    setSpeakingType(type);
    pronunciation.speak(text, {
      rate,
      onEnd: () => setSpeakingType('none'),
    });
  };

  const handleConfirmCluster = () => {
    if (currentSetWords.length === 0) return;
    const ids = currentSetWords.map((w) => w.id);
    onConfirmSet(ids);
    setCardIndex(0);
    setShowOverview(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(deltaX) < 50) return;
    if (deltaX < 0) {
      if (cardIndex < currentSetWords.length - 1) {
        setCardIndex((p) => p + 1);
      } else if (currentSetWords.length > 1) {
        setShowOverview(true);
      }
    } else if (deltaX > 0 && cardIndex > 0) {
      setCardIndex((p) => p - 1);
    }
  };

  const renderHighlightedSentence = (sentence: string, target: string) => {
    const cleanTarget = target.replace(/[^a-zA-Z]/g, '');
    if (!cleanTarget || cleanTarget.length < 3) return sentence;
    const stem = cleanTarget.length > 5 ? cleanTarget.slice(0, -1) : cleanTarget;
    const regex = new RegExp(`(\\b${stem}[a-zA-Z]*\\b)`, 'gi');
    const parts = sentence.split(regex);
    return parts.map((part, idx) =>
      regex.test(part) ? (
        <span
          key={idx}
          className={`font-bold underline decoration-2 underline-offset-4 ${
            darkMode ? 'text-indigo-300 decoration-indigo-400/80' : 'text-indigo-700 decoration-indigo-500/70'
          }`}
        >
          {part}
        </span>
      ) : (
        <React.Fragment key={idx}>{part}</React.Fragment>
      )
    );
  };

  if (unlearnedClusters.length === 0 || !currentCluster) {
    return (
      <div
        className={`flex-1 rounded-2xl p-6 flex flex-col items-center justify-center text-center border ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center mb-3">
          <Award className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold font-display">All 485 Clusters Completed!</h2>
        <button
          type="button"
          onClick={onStartQuizAfterSet}
          className="mt-4 h-12 px-6 rounded-xl bg-indigo-600 text-white text-base font-bold hover:bg-indigo-500 transition-colors"
        >
          Practice Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {!showOverview && activeWord ? (
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className={`flex-1 rounded-2xl p-3 sm:p-4 border flex flex-col gap-2 min-h-0 overflow-hidden ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
          }`}
        >
          {/* Top Header Inside Card: Larger Text & Buttons */}
          <div className="pb-2 border-b border-slate-200/70 dark:border-slate-800 shrink-0 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-sm font-mono-num">
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                  C#{String(currentCluster.clusterId).padStart(3, '0')}
                </span>
                <span aria-hidden="true" className="opacity-40">·</span>
                <span className="font-bold">
                  {cardIndex + 1}/{currentSetWords.length}
                </span>
                <span aria-hidden="true" className="opacity-40">·</span>
                <span className="opacity-70">#{String(activeWord.id).padStart(3, '0')}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setClusterOffset((p) => Math.max(0, p - 1));
                    setCardIndex(0);
                  }}
                  disabled={safeClusterOffset === 0}
                  title="Previous cluster"
                  className={`h-9 w-9 rounded-xl border flex items-center justify-center disabled:opacity-25 transition-colors ${
                    darkMode
                      ? 'border-slate-800 text-slate-200 hover:bg-slate-800'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setClusterOffset((p) => Math.min(unlearnedClusters.length - 1, p + 1));
                    setCardIndex(0);
                  }}
                  disabled={safeClusterOffset >= unlearnedClusters.length - 1}
                  title="Next cluster"
                  className={`h-9 w-9 rounded-xl border flex items-center justify-center disabled:opacity-25 transition-colors ${
                    darkMode
                      ? 'border-slate-800 text-slate-200 hover:bg-slate-800'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowOverview(true)}
                  title="Cluster Set Overview"
                  className={`h-9 px-3 rounded-xl border text-sm font-mono-num font-bold flex items-center gap-1.5 transition-colors ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700'
                      : 'bg-slate-100 border-slate-200 text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  <Layers className="w-4 h-4 text-indigo-500" />
                  <span>{currentSetWords.length}</span>
                </button>
              </div>
            </div>

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
                  onClick={() => handleSpeak(activeWord.word, 0.68, 'slow')}
                  aria-label="Slow pronunciation"
                  className={`h-11 w-11 rounded-xl flex items-center justify-center transition-colors ${
                    speakingType === 'slow'
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
                  onClick={() => handleSpeak(activeWord.word, 0.92, 'word')}
                  aria-label="Pronounce word"
                  className={`h-11 w-11 rounded-xl flex items-center justify-center transition-colors ${
                    speakingType === 'word'
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
          </div>

          {/* Vertically Stretched Content Panels with Larger Font Sizes */}
          <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-hidden">
            {/* Meaning Box */}
            <div
              className={`flex-1 p-3.5 rounded-xl border flex flex-col justify-center min-h-0 overflow-y-auto ${
                darkMode
                  ? 'bg-emerald-950/20 border-emerald-900/40'
                  : 'bg-emerald-50/50 border-emerald-200/70'
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

            {/* BCS Sentence Box */}
            <div
              className={`flex-[1.35] p-3.5 rounded-xl border flex flex-col justify-center min-h-0 overflow-y-auto ${
                darkMode
                  ? 'bg-slate-800/30 border-slate-800'
                  : 'bg-slate-50/70 border-slate-200/80'
              }`}
            >
              <div className="flex items-start justify-between gap-2.5">
                <p
                  className={`text-base sm:text-lg leading-relaxed flex-1 ${
                    darkMode ? 'text-slate-100' : 'text-slate-900'
                  }`}
                >
                  {renderHighlightedSentence(activeWord.sentenceEn, activeWord.word)}
                </p>
                <button
                  type="button"
                  onClick={() => handleSpeak(activeWord.sentenceEn, 0.9, 'sentence')}
                  aria-label="Listen sentence"
                  className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    speakingType === 'sentence'
                      ? 'bg-indigo-600 text-white'
                      : darkMode
                      ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>

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

            {/* Cluster Word Chips */}
            {currentSetWords.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 shrink-0">
                {currentSetWords.map((cw, idx) => (
                  <button
                    key={cw.id}
                    type="button"
                    onClick={() => setCardIndex(idx)}
                    className={`px-3.5 py-1.5 rounded-xl text-sm font-bold border whitespace-nowrap shrink-0 transition-colors ${
                      idx === cardIndex
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : darkMode
                        ? 'bg-slate-800/60 border-slate-700 text-slate-200'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    {cw.word}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Larger Bottom Navigation Buttons */}
          <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setCardIndex((p) => Math.max(0, p - 1))}
              disabled={cardIndex === 0}
              aria-label="Previous word"
              className={`h-12 w-16 rounded-xl border flex items-center justify-center disabled:opacity-30 transition-colors ${
                darkMode
                  ? 'border-slate-700 text-slate-100 hover:bg-slate-800'
                  : 'border-slate-200 text-slate-800 hover:bg-slate-50'
              }`}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {cardIndex < currentSetWords.length - 1 ? (
              <button
                type="button"
                onClick={() => setCardIndex((p) => p + 1)}
                className="flex-1 h-12 px-5 rounded-xl bg-indigo-600 text-white text-base font-bold flex items-center justify-center gap-2 hover:bg-indigo-500 active:scale-[0.99] transition-all"
              >
                <span>
                  {cardIndex + 2} / {currentSetWords.length}
                </span>
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  currentSetWords.length === 1 ? handleConfirmCluster() : setShowOverview(true)
                }
                className="flex-1 h-12 px-5 rounded-xl bg-emerald-600 text-white text-base font-bold flex items-center justify-center gap-2 hover:bg-emerald-500 active:scale-[0.99] transition-all"
              >
                <Check className="w-5 h-5" />
                <span>{currentSetWords.length === 1 ? 'Confirm' : 'Review Set'}</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Cluster Set Overview & Confirm View */
        <div
          className={`flex-1 rounded-2xl p-3.5 sm:p-4 border flex flex-col justify-between min-h-0 overflow-hidden ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200/70 dark:border-slate-800 shrink-0">
            <div className="min-w-0">
              <span className="text-sm font-mono-num text-emerald-600 dark:text-emerald-400 font-bold">
                CLUSTER #{String(currentCluster.clusterId).padStart(3, '0')} ({currentSetWords.length}w)
              </span>
              <p className="text-base font-bangla font-bold truncate mt-0.5">
                {currentCluster.banglaMeaning}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowOverview(false)}
              aria-label="Close overview"
              className={`h-10 w-10 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
                darkMode
                  ? 'border-slate-700 text-slate-200 hover:bg-slate-800'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto my-1 divide-y divide-slate-100 dark:divide-slate-800 min-h-0">
            {currentSetWords.map((w, idx) => (
              <div
                key={w.id}
                onClick={() => {
                  setCardIndex(idx);
                  setShowOverview(false);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setCardIndex(idx);
                    setShowOverview(false);
                  }
                }}
                className="py-3 flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono-num opacity-60">
                      #{String(w.id).padStart(3, '0')}
                    </span>
                    <span className="text-lg font-bold font-display">{w.word}</span>
                    <span className="text-sm opacity-65">({w.partOfSpeech})</span>
                  </div>
                  <p className="text-sm opacity-80 line-clamp-1 mt-0.5">{w.sentenceEn}</p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSpeak(w.word, 0.92, 'word');
                  }}
                  aria-label={`Pronounce ${w.word}`}
                  className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    darkMode
                      ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={handleConfirmCluster}
              className="w-full h-12 px-5 rounded-xl bg-emerald-600 text-white text-base font-bold flex items-center justify-center gap-2 hover:bg-emerald-500 active:scale-[0.99] transition-all"
            >
              <Check className="w-5 h-5" />
              <span>Confirm Cluster ({currentSetWords.length}w)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
