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
          className={`font-semibold underline decoration-2 underline-offset-4 ${
            darkMode ? 'text-indigo-300 decoration-indigo-400/70' : 'text-indigo-700 decoration-indigo-500/60'
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
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center mb-3">
          <Award className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold font-display">All 485 Clusters Completed!</h2>
        <button
          type="button"
          onClick={onStartQuizAfterSet}
          className="mt-4 min-h-[44px] px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors"
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
          {/* Top Row: Cluster Info + Navigation + Word + Audio */}
          <div className="pb-2 border-b border-slate-200/70 dark:border-slate-800 shrink-0 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-mono-num">
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  C#{String(currentCluster.clusterId).padStart(3, '0')}
                </span>
                <span aria-hidden="true" className="opacity-40">·</span>
                <span className="font-semibold">
                  {cardIndex + 1}/{currentSetWords.length}
                </span>
                <span aria-hidden="true" className="opacity-40">·</span>
                <span className="opacity-65">#{String(activeWord.id).padStart(3, '0')}</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setClusterOffset((p) => Math.max(0, p - 1));
                    setCardIndex(0);
                  }}
                  disabled={safeClusterOffset === 0}
                  title="Previous cluster"
                  className={`h-7 w-7 rounded-lg border flex items-center justify-center disabled:opacity-25 transition-colors ${
                    darkMode
                      ? 'border-slate-800 text-slate-300 hover:bg-slate-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setClusterOffset((p) => Math.min(unlearnedClusters.length - 1, p + 1));
                    setCardIndex(0);
                  }}
                  disabled={safeClusterOffset >= unlearnedClusters.length - 1}
                  title="Next cluster"
                  className={`h-7 w-7 rounded-lg border flex items-center justify-center disabled:opacity-25 transition-colors ${
                    darkMode
                      ? 'border-slate-800 text-slate-300 hover:bg-slate-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowOverview(true)}
                  title="Cluster Set Overview"
                  className={`h-7 px-2 rounded-lg border text-xs font-mono-num font-bold flex items-center gap-1 transition-colors ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                      : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{currentSetWords.length}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-baseline gap-2 min-w-0 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display break-words">
                  {activeWord.word}
                </h1>
                <span className="text-xs font-mono-num font-semibold text-indigo-600 dark:text-indigo-400">
                  {activeWord.partOfSpeech}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleSpeak(activeWord.word, 0.68, 'slow')}
                  aria-label="Slow pronunciation"
                  className={`h-9 w-9 rounded-xl flex items-center justify-center transition-colors ${
                    speakingType === 'slow'
                      ? 'bg-indigo-600 text-white'
                      : darkMode
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Turtle className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSpeak(activeWord.word, 0.92, 'word')}
                  aria-label="Pronounce word"
                  className={`h-9 w-9 rounded-xl flex items-center justify-center transition-colors ${
                    speakingType === 'word'
                      ? 'bg-indigo-600 text-white'
                      : darkMode
                      ? 'bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30'
                      : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  }`}
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Vertically Stretched Content Panels (Zero Dead Space Top/Bottom) */}
          <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-hidden">
            {/* Meaning Box Stretches Proportionally */}
            <div
              className={`flex-1 p-3.5 rounded-xl border flex flex-col justify-center min-h-0 overflow-y-auto ${
                darkMode
                  ? 'bg-emerald-950/20 border-emerald-900/40'
                  : 'bg-emerald-50/50 border-emerald-200/70'
              }`}
            >
              <p
                className={`text-lg sm:text-xl font-bold font-bangla leading-snug ${
                  darkMode ? 'text-emerald-300' : 'text-emerald-950'
                }`}
              >
                {activeWord.banglaMeaning}
              </p>
              <p
                className={`mt-1.5 text-sm sm:text-base font-semibold leading-snug ${
                  darkMode ? 'text-slate-200' : 'text-slate-700'
                }`}
              >
                {activeWord.englishMeaning}
              </p>
            </div>

            {/* BCS Sentence Box Stretches Proportionally */}
            <div
              className={`flex-[1.35] p-3.5 rounded-xl border flex flex-col justify-center min-h-0 overflow-y-auto ${
                darkMode
                  ? 'bg-slate-800/30 border-slate-800'
                  : 'bg-slate-50/70 border-slate-200/80'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p
                  className={`text-sm sm:text-base leading-relaxed flex-1 ${
                    darkMode ? 'text-slate-100' : 'text-slate-900'
                  }`}
                >
                  {renderHighlightedSentence(activeWord.sentenceEn, activeWord.word)}
                </p>
                <button
                  type="button"
                  onClick={() => handleSpeak(activeWord.sentenceEn, 0.9, 'sentence')}
                  aria-label="Listen sentence"
                  className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    speakingType === 'sentence'
                      ? 'bg-indigo-600 text-white'
                      : darkMode
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              {activeWord.sentenceBn && (
                <p
                  className={`mt-2 text-xs sm:text-sm font-bangla leading-relaxed ${
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
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border whitespace-nowrap shrink-0 transition-colors ${
                      idx === cardIndex
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : darkMode
                        ? 'bg-slate-800/60 border-slate-700 text-slate-300'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    {cw.word}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Navigation */}
          <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setCardIndex((p) => Math.max(0, p - 1))}
              disabled={cardIndex === 0}
              aria-label="Previous word"
              className={`h-11 w-14 rounded-xl border flex items-center justify-center disabled:opacity-30 transition-colors ${
                darkMode
                  ? 'border-slate-700 text-slate-200 hover:bg-slate-800'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {cardIndex < currentSetWords.length - 1 ? (
              <button
                type="button"
                onClick={() => setCardIndex((p) => p + 1)}
                className="flex-1 h-11 px-4 rounded-xl bg-indigo-600 text-white text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-indigo-500 active:scale-[0.99] transition-all"
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
                className="flex-1 h-11 px-4 rounded-xl bg-emerald-600 text-white text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-500 active:scale-[0.99] transition-all"
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
          className={`flex-1 rounded-2xl p-3 sm:p-4 border flex flex-col justify-between min-h-0 overflow-hidden ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/70 dark:border-slate-800 shrink-0">
            <div className="min-w-0">
              <span className="text-xs font-mono-num text-emerald-600 dark:text-emerald-400 font-bold">
                CLUSTER #{String(currentCluster.clusterId).padStart(3, '0')} ({currentSetWords.length}w)
              </span>
              <p className="text-xs sm:text-sm font-bangla font-bold truncate mt-0.5">
                {currentCluster.banglaMeaning}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowOverview(false)}
              aria-label="Close overview"
              className={`h-8 w-8 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
                darkMode
                  ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <X className="w-4 h-4" />
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
                className="py-2.5 flex items-center justify-between gap-2.5 cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono-num opacity-55">
                      #{String(w.id).padStart(3, '0')}
                    </span>
                    <span className="text-sm sm:text-base font-bold font-display">{w.word}</span>
                    <span className="text-xs opacity-60">({w.partOfSpeech})</span>
                  </div>
                  <p className="text-xs opacity-75 line-clamp-1 mt-0.5">{w.sentenceEn}</p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSpeak(w.word, 0.92, 'word');
                  }}
                  aria-label={`Pronounce ${w.word}`}
                  className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    darkMode
                      ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={handleConfirmCluster}
              className="w-full h-11 px-4 rounded-xl bg-emerald-600 text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-500 active:scale-[0.99] transition-all"
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
