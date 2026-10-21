import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  Volume2,
  CheckCircle2,
  Circle,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowUpDown,
} from 'lucide-react';
import { VocabWord, LearnedWordRecord } from '../types/vocabulary';
import { pronunciation } from '../utils/pronunciation';

interface WordLibraryViewProps {
  allWords: VocabWord[];
  learnedMap: Record<number, LearnedWordRecord>;
  darkMode: boolean;
  onSelectWord: (word: VocabWord) => void;
}

type StatusFilter = 'all' | 'unlearned' | 'learned';

const PAGE_SIZE = 50;

export const WordLibraryView: React.FC<WordLibraryViewProps> = ({
  allWords,
  learnedMap,
  darkMode,
  onSelectWord,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortOrder, setSortOrder] = useState<'id' | 'alpha'>('id');
  const [pageIndex, setPageIndex] = useState(0);
  const [speakingWordId, setSpeakingWordId] = useState<number | null>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const filteredWords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const list = allWords.filter((w) => {
      if (statusFilter === 'learned' && !learnedMap[w.id]) return false;
      if (statusFilter === 'unlearned' && learnedMap[w.id]) return false;

      if (q) {
        const idMatch = String(w.id) === q.replace(/^#0*/, '');
        const wordMatch = w.word.toLowerCase().includes(q);
        const engMatch = w.englishMeaning.toLowerCase().includes(q);
        const bnMatch = w.banglaMeaning.includes(q);
        return idMatch || wordMatch || engMatch || bnMatch;
      }

      return true;
    });

    if (sortOrder === 'alpha') {
      return [...list].sort((a, b) => a.word.localeCompare(b.word));
    }
    return list;
  }, [allWords, learnedMap, statusFilter, searchQuery, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredWords.length / PAGE_SIZE));
  const safePageIndex = Math.min(pageIndex, totalPages - 1);

  const pageWords = useMemo(() => {
    const start = safePageIndex * PAGE_SIZE;
    return filteredWords.slice(start, start + PAGE_SIZE);
  }, [filteredWords, safePageIndex]);

  const goToPage = (nextPage: number) => {
    setPageIndex(nextPage);
    if (listContainerRef.current) {
      listContainerRef.current.scrollTop = 0;
    }
  };

  const handleQuickSpeak = (e: React.MouseEvent, word: VocabWord) => {
    e.stopPropagation();
    setSpeakingWordId(word.id);
    pronunciation.speak(word.word, {
      rate: 0.92,
      onEnd: () => setSpeakingWordId(null),
    });
  };

  const learnedCount = Object.keys(learnedMap).length;
  const startItemNum = filteredWords.length === 0 ? 0 : safePageIndex * PAGE_SIZE + 1;
  const endItemNum = Math.min(filteredWords.length, (safePageIndex + 1) * PAGE_SIZE);

  return (
    <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-hidden">
      {/* Compact Search & Filter Header */}
      <div
        className={`rounded-2xl p-2.5 border space-y-1.5 shrink-0 ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1 min-w-0">
            <Search
              className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                darkMode ? 'text-slate-500' : 'text-slate-400'
              }`}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPageIndex(0);
              }}
              placeholder="Search word, বাংলা, #..."
              className={`w-full h-9 pl-8 pr-7 rounded-xl border text-xs sm:text-sm outline-none transition-colors ${
                darkMode
                  ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setPageIndex(0);
                }}
                aria-label="Clear search"
                className="h-8 w-8 absolute right-0.5 top-1/2 -translate-y-1/2 flex items-center justify-center opacity-60 hover:opacity-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setSortOrder((s) => (s === 'id' ? 'alpha' : 'id'));
              setPageIndex(0);
            }}
            title="Toggle sort order"
            className={`h-9 px-2.5 rounded-xl border text-xs font-mono-num font-bold flex items-center gap-1 shrink-0 transition-colors ${
              darkMode
                ? 'border-slate-800 text-slate-300 hover:bg-slate-800'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortOrder === 'id' ? '#' : 'A–Z'}</span>
          </button>
        </div>

        {/* 3-Column Filter Strip (Fits 360px Screen With Zero Horizontal Scroll) */}
        <div
          className={`grid grid-cols-3 gap-1 p-0.5 rounded-xl border ${
            darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200/60'
          }`}
        >
          {(
            [
              { id: 'all', label: `All (${allWords.length})` },
              { id: 'unlearned', label: `Left (${allWords.length - learnedCount})` },
              { id: 'learned', label: `Done (${learnedCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setStatusFilter(tab.id);
                setPageIndex(0);
              }}
              className={`h-7 px-1.5 rounded-lg text-[11px] font-semibold truncate transition-colors ${
                statusFilter === tab.id
                  ? darkMode
                    ? 'bg-slate-800 text-white shadow-2xs'
                    : 'bg-white text-slate-900 shadow-2xs'
                  : darkMode
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vertically Scrollable 50-Word Page List */}
      <div
        ref={listContainerRef}
        className={`flex-1 rounded-2xl border overflow-y-auto overflow-x-hidden divide-y min-h-0 ${
          darkMode
            ? 'bg-slate-900 border-slate-800 divide-slate-800/80'
            : 'bg-white border-slate-200 divide-slate-100 shadow-2xs'
        }`}
      >
        {pageWords.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-xs font-semibold opacity-70">No matching words</p>
          </div>
        ) : (
          pageWords.map((w) => {
            const isLearned = Boolean(learnedMap[w.id]);
            const isSpeaking = speakingWordId === w.id;

            return (
              <div
                key={w.id}
                onClick={() => onSelectWord(w)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectWord(w);
                  }
                }}
                className={`w-full px-3 py-2.5 flex items-center justify-between gap-2.5 cursor-pointer transition-colors text-left ${
                  darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50/90'
                }`}
              >
                <button
                  type="button"
                  onClick={(e) => handleQuickSpeak(e, w)}
                  aria-label={`Pronounce ${w.word}`}
                  className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    isSpeaking
                      ? 'bg-indigo-600 text-white'
                      : darkMode
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Volume2 className="w-4 h-4" />
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm sm:text-base font-bold font-display truncate">
                      {w.word}
                    </span>
                    <span className="text-[11px] font-mono-num opacity-55 shrink-0">
                      #{String(w.id).padStart(3, '0')} · {w.partOfSpeech}
                    </span>
                  </div>

                  <p
                    className={`text-xs sm:text-sm font-bangla truncate mt-0.5 ${
                      darkMode ? 'text-emerald-300/90' : 'text-emerald-900'
                    }`}
                  >
                    {w.banglaMeaning}
                  </p>
                </div>

                <div className="shrink-0 flex items-center">
                  {isLearned ? (
                    <CheckCircle2
                      className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
                      aria-label="Learned"
                    />
                  ) : (
                    <Circle className="w-4 h-4 opacity-30" aria-label="Unlearned" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Compact Pagination Bar */}
      {filteredWords.length > PAGE_SIZE && (
        <div
          className={`rounded-2xl px-2.5 py-1.5 border flex items-center justify-between gap-2 shrink-0 ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <button
            type="button"
            onClick={() => goToPage(Math.max(0, safePageIndex - 1))}
            disabled={safePageIndex === 0}
            className={`h-8 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1 disabled:opacity-30 transition-colors ${
              darkMode
                ? 'border-slate-700 text-slate-200 hover:bg-slate-800'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Prev 50</span>
          </button>

          <span className="text-xs font-mono-num font-semibold">
            {startItemNum}–{endItemNum} / {filteredWords.length}
          </span>

          <button
            type="button"
            onClick={() => goToPage(Math.min(totalPages - 1, safePageIndex + 1))}
            disabled={safePageIndex >= totalPages - 1}
            className="h-8 px-3 rounded-xl bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-30 hover:bg-indigo-500 transition-colors"
          >
            <span>Next 50</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
