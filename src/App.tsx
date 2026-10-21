import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Moon,
  Sun,
  Globe,
  Download,
  WifiOff,
} from 'lucide-react';
import { useLearningStore } from './hooks/useLearningStore';
import { usePWAInstall } from './hooks/usePWAInstall';
import { ActiveTab, VocabWord } from './types/vocabulary';
import { HomeTilesView } from './components/HomeTilesView';
import { DailyGoalView } from './components/DailyGoalView';
import { PracticeQuizView } from './components/PracticeQuizView';
import { WordLibraryView } from './components/WordLibraryView';
import { WordDetailSheet } from './components/WordDetailSheet';
import { pronunciation } from './utils/pronunciation';

export default function App() {
  const {
    allWords,
    unlearnedClusters,
    wordById,
    prioritizedQuizWords,
    learnedMap,
    counts,
    accent,
    autoPlayAudio,
    darkMode,
    confirmWordSet,
    recordQuizReview,
    toggleWordLearned,
    setAccent,
    setAutoPlayAudio,
    setDarkMode,
    resetAllProgress,
  } = useLearningStore();

  const { isInstallable, isInstalled, isIOS, isOnline, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [selectedWord, setSelectedWord] = useState<VocabWord | null>(null);

  // Navigate with browser history sync for Android hardware back button support
  const handleNavigate = useCallback((nextTab: ActiveTab) => {
    setSelectedWord(null);
    setActiveTab((prev) => {
      if (prev !== nextTab) {
        window.history.pushState({ tab: nextTab, wordId: null }, '');
      }
      return nextTab;
    });
  }, []);

  const handleOpenWordDetail = useCallback((word: VocabWord) => {
    setSelectedWord(word);
    window.history.pushState({ tab: activeTab, wordId: word.id }, '');
  }, [activeTab]);

  const handleCloseWordDetail = useCallback(() => {
    setSelectedWord(null);
    if (window.history.state?.wordId) {
      window.history.back();
    }
  }, []);

  const handleSelectWordById = useCallback((wordId: number) => {
    const found = wordById.get(wordId);
    if (found) {
      setSelectedWord(found);
    }
  }, [wordById]);

  // Listen to Android hardware back button / browser popstate
  useEffect(() => {
    // Initialize root state
    if (!window.history.state) {
      window.history.replaceState({ tab: 'home', wordId: null }, '');
    }

    const handlePopState = (e: PopStateEvent) => {
      const state = e.state as { tab?: ActiveTab; wordId?: number | null } | null;
      if (!state) {
        setSelectedWord(null);
        setActiveTab('home');
        return;
      }
      if (state.wordId) {
        const found = wordById.get(state.wordId);
        setSelectedWord(found || null);
      } else {
        setSelectedWord(null);
      }
      setActiveTab(state.tab || 'home');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [wordById]);

  const handleQuickConfirmFirstSet = () => {
    const firstCluster = unlearnedClusters[0];
    if (firstCluster) {
      confirmWordSet(firstCluster.words.map((w) => w.id));
    }
  };

  const tabTitles: Record<ActiveTab, string> = {
    home: 'BCS Vocab',
    daily: 'Daily Goal',
    quiz: 'Practice Quiz',
    library: 'Word Library',
  };

  return (
    <div
      className={`h-[100dvh] w-full flex flex-col overflow-hidden select-none transition-colors ${
        darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Ultra-Compact 44px Android Top Bar */}
      <header
        className={`h-11 shrink-0 flex items-center justify-between gap-2 px-2.5 sm:px-4 border-b transition-colors ${
          darkMode
            ? 'bg-slate-950 border-slate-800/90'
            : 'bg-white border-slate-200/80'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {activeTab !== 'home' ? (
            <button
              type="button"
              onClick={() => handleNavigate('home')}
              aria-label="Back to Home"
              className={`h-8 px-2.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-colors ${
                darkMode
                  ? 'bg-slate-900 border-slate-800 text-slate-100 hover:bg-slate-800'
                  : 'bg-slate-100 border-slate-200 text-slate-900 hover:bg-slate-200'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="font-display truncate">{tabTitles[activeTab]}</span>
            </button>
          ) : (
            <span className="text-sm sm:text-base font-extrabold tracking-tight font-display pl-1">
              BCS Vocab
            </span>
          )}

          {!isOnline && (
            <span
              title="Offline Mode Active"
              className="h-6 px-1.5 rounded-md bg-amber-500/15 text-amber-500 text-[10px] font-semibold flex items-center gap-1"
            >
              <WifiOff className="w-3 h-3" />
              <span>Offline</span>
            </span>
          )}
        </div>

        {/* Right: Small Icon Controls (Install PWA, Accent, Auto-Speak, Theme) */}
        <div className="flex items-center gap-1 shrink-0">
          {!isInstalled && (isInstallable || isIOS) && (
            <button
              type="button"
              onClick={() => (isInstallable ? install() : setShowIOSGuide(true))}
              title="Install App on Home Screen"
              aria-label="Install App"
              className="h-8 px-2 rounded-lg bg-indigo-600 text-white text-[11px] font-bold flex items-center gap-1 hover:bg-indigo-500 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Install</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              const next = accent === 'en-GB' ? 'en-US' : 'en-GB';
              setAccent(next);
              pronunciation.speak('Voice', { accent: next, rate: 0.92 });
            }}
            title={`Pronunciation Accent: ${accent === 'en-GB' ? 'UK' : 'US'}`}
            className={`h-8 px-2 rounded-lg border text-[11px] font-mono-num font-bold flex items-center gap-1 transition-colors ${
              darkMode
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-indigo-500" />
            <span>{accent === 'en-GB' ? 'UK' : 'US'}</span>
          </button>

          <button
            type="button"
            onClick={() => setAutoPlayAudio(!autoPlayAudio)}
            title={`Auto-pronounce: ${autoPlayAudio ? 'On' : 'Off'}`}
            aria-label="Toggle auto pronunciation"
            className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-colors ${
              autoPlayAudio
                ? 'bg-indigo-600 text-white border-indigo-600'
                : darkMode
                ? 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {autoPlayAudio ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? 'Light mode' : 'Dark mode'}
            aria-label="Toggle dark mode"
            className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-colors ${
              darkMode
                ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* Full-Viewport Main Area */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-2.5 sm:px-4 py-2 flex flex-col min-h-0 overflow-hidden">
        {activeTab === 'home' && (
          <HomeTilesView
            counts={counts}
            nextCluster={unlearnedClusters[0]}
            darkMode={darkMode}
            onNavigate={handleNavigate}
            onResetProgress={resetAllProgress}
          />
        )}

        {activeTab === 'daily' && (
          <DailyGoalView
            unlearnedClusters={unlearnedClusters}
            autoPlayAudio={autoPlayAudio}
            darkMode={darkMode}
            onConfirmSet={confirmWordSet}
            onSelectWordDetail={(w) => handleSelectWordById(w.id)}
            onStartQuizAfterSet={() => handleNavigate('quiz')}
          />
        )}

        {activeTab === 'quiz' && (
          <PracticeQuizView
            prioritizedWords={prioritizedQuizWords}
            allWords={allWords}
            learnedMap={learnedMap}
            autoPlayAudio={autoPlayAudio}
            darkMode={darkMode}
            onRecordReview={recordQuizReview}
            onGoToDailyGoal={() => handleNavigate('daily')}
            onQuickConfirmFirstSet={handleQuickConfirmFirstSet}
          />
        )}

        {activeTab === 'library' && (
          <WordLibraryView
            allWords={allWords}
            learnedMap={learnedMap}
            darkMode={darkMode}
            onSelectWord={handleOpenWordDetail}
          />
        )}
      </main>

      {/* Full-Height Word Detail Flashcard Sheet */}
      <WordDetailSheet
        word={selectedWord}
        learnedRecord={selectedWord ? learnedMap[selectedWord.id] : undefined}
        darkMode={darkMode}
        onClose={handleCloseWordDetail}
        onToggleLearned={toggleWordLearned}
        onSelectWordById={handleSelectWordById}
      />

      {/* iOS Safari Install Guide Modal */}
      {showIOSGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            className={`w-full max-w-xs rounded-2xl p-5 border shadow-xl ${
              darkMode
                ? 'bg-slate-900 border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold font-display">Install on Home Screen</h3>
            <p className="mt-2 text-xs leading-relaxed opacity-80">
              1. Tap the <strong>Share</strong> button in your browser toolbar.<br />
              2. Select <strong>Add to Home Screen</strong>.
            </p>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-4 w-full h-9 rounded-xl bg-indigo-600 text-white text-xs font-bold"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
