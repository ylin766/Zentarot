
// Declare types for MediaPipe Global variables
declare const drawConnectors: any;
declare const drawLandmarks: any;
declare const HAND_CONNECTIONS: any;

import React, { useState, useEffect, useRef, Component, ReactNode } from 'react';
import TarotScene from './components/TarotScene';
import { GestureService } from './services/GestureService';
import { TarotCardData, CardOrientation, GestureType, HandData, HistoryItem } from './types';
import { TAROT_DECK, CARD_BACK_URL } from './constants';
import { interpretTarot, TarotReadingResult, Language } from './services/geminiService';
import { soundService, SoundType } from './services/SoundService';
import { shuffleArray } from './utils/arrayUtils';
import SoundToggle from './components/SoundToggle';
import GestureGuide from './components/GestureGuide';
import { t } from './i18n';

// Simple functional error boundary component
// Fixed: Using explicit interfaces for Props and State to resolve TS property missing errors.
interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  // Set the error state if a child component crashes
  static getDerivedStateFromError(_error: any) {
    return { hasError: true };
  }

  render() {
    // If an error occurred, show the fallback UI
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center text-center p-10 bg-black text-white">
          <div>
            <h1 className="text-2xl mb-4">Cosmic Interference Detected</h1>
            <p className="text-white/60 mb-8">The celestial assets failed to align. Please refresh the connection.</p>
            <button onClick={() => window.location.reload()} className="px-6 py-2 bg-purple-600 rounded-full hover:bg-purple-500 transition-colors">Reconnect</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// 冥想计时器组件
const MeditationTimer: React.FC<{ initialTime: number; onComplete: () => void; language: Language }> = ({ initialTime, onComplete, language }) => {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isActive, setIsActive] = useState(true);
  const onCompleteRef = useRef(onComplete);

  // 保持回调引用最新
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!isActive) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimeout(() => onCompleteRef.current(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = ((initialTime - timeLeft) / initialTime) * 100;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="64" cy="64" r="56" stroke="rgba(168, 85, 247, 0.2)" strokeWidth="8" fill="none" />
          <circle
            cx="64" cy="64" r="56"
            stroke="url(#meditationGradient)"
            strokeWidth="8" fill="none"
            strokeLinecap="round"
            strokeDasharray={`${progress * 3.52} 352`}
            className="transition-all duration-1000"
          />
          <defs>
            <linearGradient id="meditationGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-mono text-white">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
        </div>
      </div>
      <p className="text-purple-200 text-sm">{t(language).meditationHint}</p>
      <div className="flex gap-3">
        <button
          onClick={() => setIsActive(!isActive)}
          className="px-4 py-2 bg-purple-600/30 rounded-full text-white/80 text-xs hover:bg-purple-600/50"
        >
          {isActive ? t(language).pause : t(language).resume}
        </button>
        <button
          onClick={() => onCompleteRef.current()}
          className="px-4 py-2 bg-white/10 rounded-full text-white/60 text-xs hover:bg-white/20"
        >
          {t(language).skip}
        </button>
      </div>
    </div>
  );
};

// Game flow states
enum GameState {
  START = 'START',
  DRAWING = 'DRAWING',
  ANALYZING = 'ANALYZING',
  RESULT = 'RESULT'
}

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [drawnCards, setDrawnCards] = useState<{ card: TarotCardData, orientation: CardOrientation }[]>([]);
  const [interpretation, setInterpretation] = useState<string>("");

  const [deck, setDeck] = useState<TarotCardData[]>(() => shuffleArray(TAROT_DECK));
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentHand, setCurrentHand] = useState<HandData>({ gesture: GestureType.NONE, x: 0.5, y: 0.5, z: 0 });
  const [isGestureMode, setIsGestureMode] = useState(true);
  // const [lastInterpretation, setLastInterpretation] = useState<string | null>(null); // Removed in favor of interpretation
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraPermissionDenied, setCameraPermissionDenied] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [revealedCard, setRevealedCard] = useState<{ card: TarotCardData, orientation: CardOrientation } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // 挑战性卡牌相关状态
  const [readingResult, setReadingResult] = useState<TarotReadingResult | null>(null);
  const [showMeditation, setShowMeditation] = useState(false);
  const [meditationTime, setMeditationTime] = useState(60);

  // 语言设置
  const [language, setLanguage] = useState<Language>('en');

  // 音效设置
  const [soundEnabled, setSoundEnabled] = useState(true);

  // 新用户引导
  const [showGuide, setShowGuide] = useState(() => {
    // 检查 localStorage 是否为首次访问
    const hasVisited = localStorage.getItem('zentarot_visited');
    return !hasVisited;
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gestureServiceRef = useRef<GestureService | null>(null);

  useEffect(() => {
    const preloadAssets = async () => {
      const imagesToLoad = [
        CARD_BACK_URL,
        ...TAROT_DECK.map(card => card.image)
      ];

      const total = imagesToLoad.length;
      let loaded = 0;

      const loadPromise = (url: string) => {
        return new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.src = url;
          img.onload = () => {
            loaded++;
            setLoadingProgress(Math.round((loaded / total) * 100));
            resolve();
          };
          img.onerror = () => {
            console.warn(`Failed to preload: ${url}`);
            // Still resolve to continue flow
            loaded++;
            setLoadingProgress(Math.round((loaded / total) * 100));
            resolve();
          };
        });
      };

      try {
        await Promise.all(imagesToLoad.map(loadPromise));
      } catch (err) {
        console.error("Error preloading assets", err);
      } finally {
        // Add a small artificial delay for smoother UX if it loads too fast
        setTimeout(() => setIsLoading(false), 500);
      }
    };

    preloadAssets();
  }, []);

  useEffect(() => {
    if (isGestureMode && videoRef.current && !cameraPermissionDenied) {
      const service = new GestureService(videoRef.current, (results) => {
        // 绘制骨骼点
        if (canvasRef.current && videoRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
              for (const landmarks of results.multiHandLandmarks) {
                // 绘制连接线
                drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
                  color: '#00FF00',
                  lineWidth: 2
                });
                // 绘制关键点
                drawLandmarks(ctx, landmarks, {
                  color: '#FF0000',
                  lineWidth: 1,
                  radius: 3
                });
              }
            }
          }
        }

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const handData = GestureService.processLandmarks(results.multiHandLandmarks[0]);
          setCurrentHand(handData);
        } else {
          setCurrentHand(prev => ({ ...prev, gesture: GestureType.NONE }));
        }
      });

      service.start().then(() => {
        setIsCameraActive(true);
        gestureServiceRef.current = service;
      }).catch(err => {
        console.warn("Camera failed, falling back to mouse mode", err);
        setCameraPermissionDenied(true);
        setIsGestureMode(false);
      });

      return () => {
        if (gestureServiceRef.current) {
          gestureServiceRef.current.stop();
        }
        setIsCameraActive(false);
      };
    }
  }, [isGestureMode, cameraPermissionDenied, isLoading]);

  const mouseStartY = useRef<number | null>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    // Only allow interaction in DRAWING state or generic browsing if we want, 
    // but for now let's keep interactions active always so the background remains alive.
    if (!isGestureMode) {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;

      let gesture = GestureType.OPEN;

      if (e.buttons === 1) {
        gesture = GestureType.PINCH;
        if (mouseStartY.current === null) {
          mouseStartY.current = y;
        }
      } else {
        mouseStartY.current = null;
      }

      setCurrentHand({ gesture, x, y, z: 0 });
    }
  };

  const handleStartGame = () => {
    soundService.play(SoundType.BUTTON_CLICK);
    setGameState(GameState.DRAWING);
    setDeck(shuffleArray(TAROT_DECK)); // Reset and shuffle deck
    setDrawnCards([]);
    setInterpretation("");
  };

  const handleRestart = () => {
    soundService.play(SoundType.BUTTON_CLICK);
    setGameState(GameState.START);
    setDrawnCards([]);
    setInterpretation("");
  };

  // 音效开关切换
  const toggleSound = () => {
    const newEnabled = !soundEnabled;
    setSoundEnabled(newEnabled);
    soundService.setEnabled(newEnabled);
    if (newEnabled) {
      soundService.play(SoundType.BUTTON_CLICK);
    }
  };

  const onCardDrawn = async (card: TarotCardData, orientation: CardOrientation) => {
    if (gameState !== GameState.DRAWING) return;

    // Show reveal immediately
    setRevealedCard({ card, orientation });

    // 播放灰烬燃烧音效
    soundService.play(SoundType.ASH_BURN);

    // Add to drawn cards
    const newCard = { card, orientation };
    const newDrawnCards = [...drawnCards, newCard];
    setDrawnCards(newDrawnCards);

    // Remove from deck pool - DELAYED to allow flip animation to finish on the correct card
    setTimeout(() => {
      setDeck(prev => shuffleArray(prev.filter(c => c.id !== card.id)));
    }, 2000);

    // Delay hiding reveal
    setTimeout(async () => {
      setRevealedCard(null);

      // Check if we have drawn 3 cards
      if (newDrawnCards.length >= 3) {
        setGameState(GameState.ANALYZING);
        const result = await interpretTarot(newDrawnCards, language);
        setReadingResult(result);
        setInterpretation(result.interpretation);
        soundService.play(SoundType.RESULT_REVEAL); // 结果揭示音效
        setGameState(GameState.RESULT);
      }
    }, 4000); // 4秒后完成，与灰烬效果同步
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-screen bg-black text-white z-50">
        <div className="mb-8 relative">
          <div className="w-16 h-16 border-4 border-gold/30 border-t-gold rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-xs">✦</div>
        </div>
        <h2 className="text-xl font-serif text-gold tracking-widest mb-4">{t(language).loading}</h2>
        <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gold transition-all duration-300 ease-out"
            style={{ width: `${loadingProgress}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-white/40 font-mono">{loadingProgress}%</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex font-sans" onMouseMove={handleMouseMove}>
      {/* Start Screen */}
      {gameState === GameState.START && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in">
          <h1 className="text-6xl font-serif text-gold mb-8 tracking-widest drop-shadow-[0_0_15px_rgba(212,175,55,0.5)]">{t(language).title}</h1>
          <button
            onClick={handleStartGame}
            className="mystic-button px-12 py-4 rounded-full text-xl font-bold tracking-[0.2em] border-2 border-gold text-gold hover:bg-gold hover:text-black transition-all duration-300 shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_40px_rgba(212,175,55,0.6)]"
          >
            {t(language).beginReading}
          </button>

          {/* 语言选择器 */}
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={() => setLanguage('zh')}
              className={`px-4 py-2 rounded-full text-sm transition-all ${language === 'zh'
                ? 'bg-gold/20 text-gold border border-gold/50'
                : 'text-white/40 hover:text-white/60'
                }`}
            >
              中文
            </button>
            <span className="text-white/20">|</span>
            <button
              onClick={() => setLanguage('en')}
              className={`px-4 py-2 rounded-full text-sm transition-all ${language === 'en'
                ? 'bg-gold/20 text-gold border border-gold/50'
                : 'text-white/40 hover:text-white/60'
                }`}
            >
              English
            </button>
          </div>

          <p className="mt-8 text-white/40 font-mono text-sm">{language === 'zh' ? '抽取三张牌揭示你的命运' : 'Draw 3 cards to reveal your destiny'}</p>
        </div>
      )}



      {/* Analyzing Overlay */}
      {gameState === GameState.ANALYZING && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="animate-pulse text-gold text-2xl font-serif tracking-widest">{t(language).analyzing}</div>
        </div>
      )}

      {/* Result Screen */}
      {gameState === GameState.RESULT && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg animate-fade-in p-12 overflow-y-auto">
          <div className="max-w-4xl w-full flex flex-col items-center my-auto">

            <div className="flex justify-center gap-8 mb-12 w-full">
              {drawnCards.map((item, idx) => (
                <div key={idx} className="flex flex-col items-center animate-slide-up" style={{ animationDelay: `${idx * 100}ms` }}>
                  <div className={`relative w-32 h-56 rounded-lg shadow-[0_0_20px_rgba(255,255,255,0.2)] mb-4 transition-transform hover:scale-105 ${item.orientation === CardOrientation.REVERSED ? 'rotate-180' : ''}`}>
                    <img src={item.card.image} alt={item.card.name} className="w-full h-full object-cover rounded-lg" />
                  </div>
                  <span className="text-gold font-serif text-sm">{item.card.name}</span>
                  <span className="text-white/30 text-[10px] uppercase tracking-widest">{item.orientation}</span>
                </div>
              ))}
            </div>

            <div className="bg-white/5 border border-white/10 p-10 rounded-2xl w-full shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold to-transparent opacity-50"></div>
              <h2 className="text-3xl text-gold font-serif mb-6 text-center tracking-widest">{t(language).theReading}</h2>
              <p className="text-xl text-white/90 leading-relaxed font-light text-center font-serif whitespace-pre-wrap">
                {interpretation}
              </p>
            </div>

            {/* 挑战性卡牌净化/冥想功能 */}
            {readingResult?.hasChallengeCard && (
              <div className="mt-8 w-full">
                <div className="bg-purple-900/30 border border-purple-500/30 p-6 rounded-xl text-center">
                  <p className="text-purple-300 text-sm mb-4">
                    ✨ {t(language).challengeEnergy}：{readingResult.challengeCards.join(', ')}
                  </p>
                  {!showMeditation ? (
                    <button
                      onClick={() => {
                        soundService.play(SoundType.MEDITATION_START);
                        setShowMeditation(true);
                      }}
                      className="px-6 py-3 bg-purple-600/50 hover:bg-purple-500/60 rounded-full text-white text-sm font-medium transition-all border border-purple-400/30"
                    >
                      🧘 {t(language).startMeditation} ({meditationTime}{t(language).seconds})
                    </button>
                  ) : (
                    <MeditationTimer
                      initialTime={meditationTime}
                      onComplete={() => setShowMeditation(false)}
                      language={language}
                    />
                  )}
                </div>
              </div>
            )}

            <button
              onClick={handleRestart}
              className="mt-12 mystic-button px-8 py-3 rounded-full text-sm font-bold tracking-widest border border-white/20 text-white/60 hover:text-white hover:border-white transition-all"
            >
              {t(language).startOver}
            </button>
          </div>
        </div>
      )}
      <div className="absolute inset-0 z-0">
        <ErrorBoundary>
          <TarotScene
            handData={gameState === GameState.DRAWING ? currentHand : { ...currentHand, gesture: GestureType.NONE }}
            onCardDrawn={onCardDrawn}
            deckPool={deck}
            language={language}
            soundEnabled={soundEnabled}
            drawnCount={drawnCards.length}
            drawnCards={drawnCards}
          />
        </ErrorBoundary>
      </div>

      {/* Top Left: Controls */}
      <div className="absolute top-8 left-8 z-30 flex flex-col gap-4 items-start">
        <div className="flex gap-4 items-center">
          {/* 音效开关 */}
          <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />

          <button
            onClick={() => {
              if (!cameraPermissionDenied) {
                setIsGestureMode(!isGestureMode);
              }
            }}
            className={`mystic-button px-6 py-3 rounded-xl text-xs font-bold ${cameraPermissionDenied ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {cameraPermissionDenied ? '⚠️ Camera Denied' : (isGestureMode ? `🖐 ${t(language).gestureMode}` : `🖱 ${t(language).mouseMode}`)}
          </button>

          <div className="glass-panel px-5 py-3 rounded-xl text-xs text-white/80 font-light tracking-wide">
            {cameraPermissionDenied ? (
              <span>{t(language).cameraAccess}</span>
            ) : isGestureMode ? (
              <span>{t(language).hints.open} <span className="text-gold mx-2">|</span> {t(language).hints.pinch} <span className="text-gold mx-2">|</span> {t(language).hints.lift}</span>
            ) : (
              // 鼠标模式的提示也可以中文化，如果 i18n.ts 里有的话。暂时保留或映射
              <span>{language === 'zh' ? '移动: 浏览' : 'Move: Browse'} <span className="text-gold mx-2">|</span> {language === 'zh' ? '点击+上拖: 抽牌' : 'Click+Drag up: Draw'}</span>
            )}
          </div>
        </div>
      </div>

      {/* Top Right: Magic Mirror */}
      <div className={`absolute top-8 right-8 z-30 flex flex-col items-center gap-3 transition-all duration-500 ${isCameraActive ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0 pointer-events-none'}`}>
        <div className="magic-mirror">
          <video
            ref={videoRef}
            className="w-full h-full object-cover transform scale-x-[-1]"
            autoPlay
            playsInline
          />
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full transform scale-x-[-1]"
          />
        </div>

        {/* Gesture Status */}
        <div className="glass-panel px-4 py-2 rounded-full flex items-center gap-3">
          <span className="text-2xl filter drop-shadow-glow">
            {currentHand.gesture === 'PINCH' && '🤏'}
            {currentHand.gesture === 'FIST' && '✊'}
            {currentHand.gesture === 'POINT' && '👆'}
            {currentHand.gesture === 'OPEN' && '🖐️'}
            {currentHand.gesture === 'NONE' && '✨'}
          </span>
          <span className="text-xs text-gold font-serif uppercase tracking-widest">
            {currentHand.gesture === 'NONE' ? 'Detecting...' : currentHand.gesture}
          </span>
        </div>
      </div>

      {/* Side Drawer (Chronicles) */}
      <div className={`side-drawer ${isDrawerOpen ? 'open' : ''} w-96 p-8 overflow-y-auto flex flex-col gap-6`}>
        <button
          className="drawer-toggle shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.6)] transition-shadow"
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
        >
          {isDrawerOpen ? 'CLOSE' : t(language).chronicles.toUpperCase()}
        </button>

        <div className="text-center mt-4">
          <h2 className="text-2xl text-gold mb-2 drop-shadow-lg">{t(language).chronicles}</h2>
          <div className="mystic-divider"></div>
        </div>

        {history.length === 0 ? (
          <div className="flex-grow flex items-center justify-center">
            <div className="text-white/30 italic text-center p-8 border border-white/5 rounded-2xl">
              <p className="mb-2 text-2xl">☾</p>
              The cards act as a mirror to your soul...
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 pb-20">
            {history.map((item, idx) => (
              <div key={item.timestamp} className="history-card group relative flex gap-5 items-start glass-panel p-4 rounded-xl border border-white/5 hover:border-gold/30">
                <div className="absolute -left-2 top-4 w-4 h-4 rounded-full bg-gold/50 shadow-[0_0_10px_gold] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative shrink-0 w-16 group-hover:scale-105 transition-transform duration-300">
                  <img
                    src={item.card.image}
                    alt={item.card.name}
                    className={`w-full h-24 object-cover rounded shadow-lg ${item.orientation === CardOrientation.REVERSED ? 'rotate-180' : ''}`}
                  />
                  <div className="absolute inset-0 rounded ring-1 ring-inset ring-white/20"></div>
                </div>
                <div className="flex-grow pt-1">
                  <div className="text-gold font-serif text-lg leading-tight mb-1">{item.card.name}</div>
                  <div className={`text-[10px] uppercase tracking-widest font-bold mb-2 ${item.orientation === CardOrientation.REVERSED ? 'text-red-300' : 'text-purple-300'}`}>
                    {item.orientation}
                  </div>
                  <div className="text-white/50 text-xs italic line-clamp-2">
                    {idx === 0 && interpretation ? t(language).sessionReading : t(language).momentInTime}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-auto pt-6 border-t border-white/10">
          <button
            onClick={() => { setDeck(shuffleArray(TAROT_DECK)); setHistory([]); setInterpretation(""); }}
            className="mystic-button w-full py-4 rounded-xl text-sm font-bold tracking-widest group"
          >
            <span className="group-hover:text-white transition-colors">✦ RESET DECK ✦</span>
          </button>
          <div className="text-center text-white/20 text-xs mt-4 font-serif">
            {deck.length} cards remaining in the deck
          </div>
        </div>
      </div>

      {/* Floating Interpretation Panel - Removed as per new requirement */}
      {/* {lastInterpretation && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-3xl px-6 z-20 animate-fade-in perspective-[1000px]">
           ...
        </div>
      )} */}
      {/* Reveal Overlay - 已移除，使用 3D 翻转动画代替 */}

      {/* 新用户引导 */}
      {showGuide && gameState === GameState.DRAWING && (
        <GestureGuide
          language={language}
          onComplete={() => {
            setShowGuide(false);
            localStorage.setItem('zentarot_visited', 'true');
          }}
        />
      )}
    </div>
  );
};

export default App;
