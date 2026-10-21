import React, { useState } from 'react';
import {
  Volume2,
  Turtle,
  X,
  Check,
  RotateCcw,
} from 'lucide-react';
import { VocabWord, LearnedWordRecord } from '../types/vocabulary';
import { pronunciation } from '../utils/pronunciation';

interface WordDetailSheetProps {
  word: VocabWord | null;
  learnedRecord?: LearnedWordRecord;
  darkMode: boolean;
  onClose: () => void;
  onToggleLearned: (wordId: number) => void;
  onSelectWordById: (wordId: number) => void;
}

export const WordDetailSheet: React.FC<WordDetailSheetProps> = ({
  word,
  learnedRecord,
  darkMode,
  onClose,
  onToggleLearned,
  onSelectWordById,
}) => {
  const [speakingMode, setSpeakingMode] = useState<'none' | 'word' | 'slow' | 'sentence'>('none');

  if (!word) return null;

  const isLearned = Boolean(learnedRecord);

  const handleSpeakWord = (rate = 0.92, mode: 'word' | 'slow' = 'word') => {
    setSpeakingMode(mode);
    pronunciation.speak(word.word, {
      rate,
      onEnd: () => setSpeakingMode('none'),
    });
  };

  const handleSpeakSentence = () => {
    setSpeakingMode('sentence');
    pronunciation.speak(word.sentenceEn, {
      rate: 0.9,
      onEnd: () => setSpeakingMode('none'),
    });
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-1.5 sm:p-4 bg-black/55 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="word-detail-title"
    >
      <div
        className={`w-full max-w-lg h-[calc(100dvh-12px)] sm:h-[88dvh] rounded-2xl p-3.5 sm:p-5 flex flex-col justify-between gap-2.5 overflow-hidden shadow-2xl ${
          darkMode
            ? 'bg-slate-900 text-slate-100 border border-slate-800'
            : 'bg-white text-slate-900 border border-slate-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header with Larger Text & Buttons */}
        <div
          className={`pb-2.5 flex items-center justify-between gap-2 border-b shrink-0 ${
            darkMode ? 'border-slate-800' : 'border-slate-100'
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-mono-num opacity-75">
              <span>#{String(word.id).padStart(3, '0')}</span>
              <span aria-hidden="true">·</span>
              <span>Cluster #{String(word.clusterId).padStart(3, '0')}</span>
              <span aria-hidden="true">·</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                {word.partOfSpeech}
              </span>
            </div>
            <h2
              id="word-detail-title"
              className="text-3xl sm:text-4xl font-extrabold tracking-tight font-display mt-0.5 break-words"
            >
              {word.word}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => handleSpeakWord(0.68, 'slow')}
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
              onClick={() => handleSpeakWord(0.92, 'word')}
              title="Pronounce"
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

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={`h-11 w-11 rounded-xl flex items-center justify-center transition-colors ${
                darkMode
                  ? 'text-slate-300 hover:bg-slate-800'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Vertically Stretched Body with Larger Fonts */}
        <div className="flex-1 flex flex-col gap-2.5 min-h-0 overflow-hidden">
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
              {word.banglaMeaning}
            </p>
            <p
              className={`mt-1.5 text-base sm:text-lg font-semibold leading-snug ${
                darkMode ? 'text-slate-200' : 'text-slate-800'
              }`}
            >
              {word.englishMeaning}
            </p>
          </div>

          <div
            className={`flex-[1.35] p-3.5 rounded-xl border flex flex-col justify-center min-h-0 overflow-y-auto ${
              darkMode
                ? 'bg-slate-800/40 border-slate-800'
                : 'bg-slate-50 border-slate-200/80'
            }`}
          >
            <div className="flex items-start justify-between gap-2.5">
              <p className="text-base sm:text-lg leading-relaxed flex-1">
                {renderHighlightedSentence(word.sentenceEn, word.word)}
              </p>
              <button
                type="button"
                onClick={handleSpeakSentence}
                aria-label="Read sentence"
                className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  speakingMode === 'sentence'
                    ? 'bg-indigo-600 text-white'
                    : darkMode
                    ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>
            {word.sentenceBn && (
              <p
                className={`mt-2 text-sm sm:text-base font-bangla leading-relaxed ${
                  darkMode ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                ({word.sentenceBn})
              </p>
            )}
          </div>

          {word.relatedWords.length > 0 && (
            <div className="shrink-0">
              <div className="text-xs font-mono-num opacity-65 mb-1">
                Cluster #{word.clusterId} ({word.relatedWords.length})
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                {word.relatedWords.map((rel) => (
                  <button
                    key={rel.id}
                    type="button"
                    onClick={() => onSelectWordById(rel.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-sm font-bold border whitespace-nowrap shrink-0 transition-colors ${
                      darkMode
                        ? 'bg-slate-800/60 border-slate-700 text-slate-100 hover:border-indigo-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 hover:border-indigo-500'
                    }`}
                  >
                    {rel.word}{' '}
                    <span className="font-normal opacity-65">({rel.partOfSpeech})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Larger Footer Button */}
        <div
          className={`pt-2.5 border-t shrink-0 ${
            darkMode ? 'border-slate-800' : 'border-slate-100'
          }`}
        >
          <button
            type="button"
            onClick={() => onToggleLearned(word.id)}
            className={`w-full h-12 px-5 rounded-xl text-base font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.99] ${
              isLearned
                ? darkMode
                  ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-300'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-indigo-600 text-white hover:bg-indigo-500'
            }`}
          >
            {isLearned ? (
              <>
                <RotateCcw className="w-5 h-5" />
                <span>Learned (Mark Unlearned)</span>
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                <span>Mark Learned</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
