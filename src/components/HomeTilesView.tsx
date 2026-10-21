import React from 'react';
import {
  Layers,
  Brain,
  BookOpen,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { ActiveTab } from '../types/vocabulary';
import { SemanticClusterGroup } from '../hooks/useLearningStore';

interface HomeTilesViewProps {
  counts: {
    total: number;
    learned: number;
    unlearned: number;
    newlyLearned: number;
    mastered: number;
    totalClusters: number;
    learnedClusters: number;
    unlearnedClusters: number;
  };
  nextCluster?: SemanticClusterGroup;
  darkMode: boolean;
  onNavigate: (tab: ActiveTab) => void;
  onResetProgress: () => void;
}

export const HomeTilesView: React.FC<HomeTilesViewProps> = ({
  counts,
  nextCluster,
  darkMode,
  onNavigate,
  onResetProgress,
}) => {
  const [confirmReset, setConfirmReset] = React.useState(false);
  const progressPercent = Math.round((counts.learned / Math.max(1, counts.total)) * 100);

  return (
    <div className="flex-1 flex flex-col justify-between gap-2.5 min-h-0 overflow-hidden">
      {/* Slim Progress Bar */}
      <div
        className={`rounded-2xl px-3.5 py-2.5 border shrink-0 ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90'
        }`}
      >
        <div className="flex items-center justify-between gap-2 text-xs font-mono-num">
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <span className="font-bold text-slate-900 dark:text-white">
              {counts.learned}/{counts.total}
            </span>
            <span className="opacity-60">Words</span>
            <span aria-hidden="true" className="opacity-35">·</span>
            <span className="opacity-70 truncate">
              {counts.learnedClusters}/{counts.totalClusters} Clusters
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {progressPercent}%
            </span>
            {counts.learned > 0 && (
              <>
                {!confirmReset ? (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    title="Reset learning progress"
                    className="p-1 rounded-md opacity-50 hover:opacity-100 text-rose-500"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onResetProgress();
                      setConfirmReset(false);
                    }}
                    className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-semibold"
                  >
                    Reset?
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-indigo-600 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Three Responsive Tiles Fitting Smartphone Viewport */}
      <div className="flex-1 grid grid-rows-3 lg:grid-rows-1 lg:grid-cols-3 gap-2.5 min-h-0">
        {/* Tile 1: Daily Words Goal */}
        <button
          type="button"
          onClick={() => onNavigate('daily')}
          className={`w-full h-full min-h-0 rounded-2xl p-3.5 sm:p-5 border text-left flex flex-col justify-between transition-all active:scale-[0.99] group overflow-hidden ${
            darkMode
              ? 'bg-slate-900 border-slate-800 hover:border-indigo-500/60'
              : 'bg-white border-slate-200 hover:border-indigo-500 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between gap-2.5 w-full min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold font-display truncate">
                  Daily Words Goal
                </h2>
                <p className={`text-xs truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Semantic cluster flashcards
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />
          </div>

          <div
            className={`w-full px-3 py-2 rounded-xl border flex items-center justify-between gap-2 text-xs font-mono-num ${
              darkMode
                ? 'bg-slate-950/70 border-slate-800 text-slate-300'
                : 'bg-slate-50 border-slate-200/70 text-slate-700'
            }`}
          >
            {nextCluster ? (
              <>
                <span className="truncate font-sans font-medium">
                  #{nextCluster.clusterId}: {nextCluster.words.map((w) => w.word).join(', ')}
                </span>
                <span className="shrink-0 text-indigo-600 dark:text-indigo-400 font-bold">
                  {nextCluster.words.length}w
                </span>
              </>
            ) : (
              <span className="truncate">All 485 Clusters Done!</span>
            )}
          </div>
        </button>

        {/* Tile 2: Practice Quiz */}
        <button
          type="button"
          onClick={() => onNavigate('quiz')}
          className={`w-full h-full min-h-0 rounded-2xl p-3.5 sm:p-5 border text-left flex flex-col justify-between transition-all active:scale-[0.99] group overflow-hidden ${
            darkMode
              ? 'bg-slate-900 border-slate-800 hover:border-emerald-500/60'
              : 'bg-white border-slate-200 hover:border-emerald-600 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between gap-2.5 w-full min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Brain className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold font-display truncate">
                  Practice Quiz
                </h2>
                <p className={`text-xs truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Priority newly learned words
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />
          </div>

          <div
            className={`w-full px-3 py-2 rounded-xl border flex items-center justify-between gap-1 text-xs font-mono-num ${
              darkMode
                ? 'bg-slate-950/70 border-slate-800 text-slate-300'
                : 'bg-slate-50 border-slate-200/70 text-slate-700'
            }`}
          >
            <span className="truncate">Learned: {counts.learned}</span>
            <span aria-hidden="true">·</span>
            <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0">
              New: {counts.newlyLearned}
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-600 dark:text-emerald-400 shrink-0">
              ✓ {counts.mastered}
            </span>
          </div>
        </button>

        {/* Tile 3: Word Library */}
        <button
          type="button"
          onClick={() => onNavigate('library')}
          className={`w-full h-full min-h-0 rounded-2xl p-3.5 sm:p-5 border text-left flex flex-col justify-between transition-all active:scale-[0.99] group overflow-hidden ${
            darkMode
              ? 'bg-slate-900 border-slate-800 hover:border-slate-600'
              : 'bg-white border-slate-200 hover:border-slate-800 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between gap-2.5 w-full min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  darkMode ? 'bg-slate-800 text-slate-100' : 'bg-slate-900 text-white'
                }`}
              >
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold font-display truncate">
                  Word Library
                </h2>
                <p className={`text-xs truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  1,000 words · Tap for details
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />
          </div>

          <div
            className={`w-full px-3 py-2 rounded-xl border flex items-center justify-between gap-1 text-xs font-mono-num ${
              darkMode
                ? 'bg-slate-950/70 border-slate-800 text-slate-300'
                : 'bg-slate-50 border-slate-200/70 text-slate-700'
            }`}
          >
            <span>All: {counts.total}</span>
            <span aria-hidden="true">·</span>
            <span>Left: {counts.unlearned}</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              Done: {counts.learned}
            </span>
          </div>
        </button>
      </div>
    </div>
  );
};
