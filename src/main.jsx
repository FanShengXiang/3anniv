import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, Check, Gift, Heart, Lock, MapPin, RotateCcw, Sparkles, Star, X } from 'lucide-react';
import './styles.css';

const STORAGE_KEY = 'anniversary-game-progress';

function normalizeAnswer(value) {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

function loadProgress(levelCount) {
  const fallback = { unlocked: 1, completed: [] };

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return fallback;

    return {
      unlocked: Math.min(Math.max(Number(saved.unlocked) || 1, 1), levelCount + 1),
      completed: Array.isArray(saved.completed) ? saved.completed : []
    };
  } catch {
    return fallback;
  }
}

function App() {
  const [config, setConfig] = useState(null);
  const [screen, setScreen] = useState('map');
  const [activeLevelId, setActiveLevelId] = useState(null);
  const [progress, setProgress] = useState({ unlocked: 1, completed: [] });
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('');
  const [openedChest, setOpenedChest] = useState(false);

  useEffect(() => {
    fetch(`/game-config.json?v=${Date.now()}`, { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('設定檔讀取失敗');
        return response.json();
      })
      .then((data) => {
        setConfig(data);
        setProgress(loadProgress(data.levels.length));
      })
      .catch(() => {
        setFeedbackType('error');
        setFeedback('讀不到 game-config.json，請確認檔案存在。');
      });
  }, []);

  useEffect(() => {
    if (!config) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [config, progress]);

  const activeLevel = useMemo(
    () => config?.levels.find((level) => level.id === activeLevelId),
    [activeLevelId, config]
  );

  const allCompleted = config && progress.completed.length >= config.levels.length;

  function openLevel(level) {
    if (level.id > progress.unlocked) return;
    setActiveLevelId(level.id);
    setAnswer('');
    setFeedback('');
    setFeedbackType('');
    setScreen('level');
  }

  function submitAnswer(event) {
    event.preventDefault();
    if (!activeLevel) return;

    const acceptedAnswers = activeLevel.answers.map(normalizeAnswer);
    const isCorrect = acceptedAnswers.includes(normalizeAnswer(answer));

    if (!isCorrect) {
      setFeedbackType('error');
      setFeedback('答案還不對，再想想這個回憶。');
      return;
    }

    const completed = Array.from(new Set([...progress.completed, activeLevel.id]));
    const unlocked = Math.min(Math.max(progress.unlocked, activeLevel.id + 1), config.levels.length + 1);

    setProgress({ completed, unlocked });
    setFeedbackType('success');
    setFeedback('答對了，下一關已解鎖。');

    window.setTimeout(() => {
      setScreen('map');
      setActiveLevelId(null);
    }, 800);
  }

  function resetProgress() {
    const nextProgress = { unlocked: 1, completed: [] };
    setProgress(nextProgress);
    setOpenedChest(false);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProgress));
  }

  if (!config) {
    return (
      <main className="loading-screen">
        <Sparkles size={32} />
        <p>{feedback || '載入紀念地圖中...'}</p>
      </main>
    );
  }

  return (
    <main className="app-shell">
      {screen === 'map' && (
        <MapScreen
          config={config}
          progress={progress}
          allCompleted={allCompleted}
          openedChest={openedChest}
          onOpenLevel={openLevel}
          onOpenChest={() => {
            if (allCompleted) {
              setOpenedChest(true);
              setScreen('card');
            }
          }}
          onReset={resetProgress}
        />
      )}

      {screen === 'level' && activeLevel && (
        <LevelScreen
          level={activeLevel}
          answer={answer}
          feedback={feedback}
          feedbackType={feedbackType}
          isCompleted={progress.completed.includes(activeLevel.id)}
          onAnswer={setAnswer}
          onSubmit={submitAnswer}
          onBack={() => setScreen('map')}
        />
      )}

      {screen === 'card' && (
        <CardScreen card={config.card} onBack={() => setScreen('map')} />
      )}
    </main>
  );
}

function MapScreen({ config, progress, allCompleted, openedChest, onOpenLevel, onOpenChest, onReset }) {
  return (
    <section className="map-screen map-only" aria-label={config.title}>
      <button className="reset-icon" type="button" onClick={onReset} aria-label="重新開始">
        <RotateCcw size={20} />
      </button>

      <div className="map-wrap">
        <div className="cute-cloud cloud-1" />
        <div className="cute-cloud cloud-2" />
        <div className="candy candy-1" />
        <div className="candy candy-2" />
        <div className="candy candy-3" />
        <div className="map-path" />

        {config.levels.map((level, index) => {
          const locked = level.id > progress.unlocked;
          const completed = progress.completed.includes(level.id);

          return (
            <button
              className={`level-node node-${index + 1} ${locked ? 'locked' : ''} ${completed ? 'completed' : ''}`}
              key={level.id}
              type="button"
              onClick={() => onOpenLevel(level)}
              aria-label={`${level.title}${locked ? '，尚未解鎖' : ''}`}
            >
              {locked ? <Lock size={22} /> : completed ? <Heart size={26} fill="currentColor" /> : <Star size={25} fill="currentColor" />}
            </button>
          );
        })}

        <button
          className={`treasure ${allCompleted ? 'ready' : ''} ${openedChest ? 'opened' : ''}`}
          type="button"
          onClick={onOpenChest}
          aria-label="終點寶箱"
        >
          <Gift size={44} />
        </button>
      </div>
    </section>
  );
}

function LevelScreen({ level, answer, feedback, feedbackType, isCompleted, onAnswer, onSubmit, onBack }) {
  return (
    <section className="level-screen">
      <button className="back-button" type="button" onClick={onBack}>
        <ArrowLeft size={20} />
        回地圖
      </button>

      <article className="question-panel">
        <div className="photo-frame">
          <img src={level.photo} alt={`${level.title} 照片`} />
        </div>

        <div className="question-box">
          <p className="eyebrow">{level.title}</p>
          <h2>{level.question}</h2>

          <form onSubmit={onSubmit}>
            <input
              value={answer}
              onChange={(event) => onAnswer(event.target.value)}
              placeholder="輸入答案"
              autoFocus
            />
            <button type="submit">{isCompleted ? '再次確認' : '送出答案'}</button>
          </form>

          {feedback && (
            <p className={`feedback ${feedbackType}`}>
              {feedbackType === 'success' ? <Check size={18} /> : <X size={18} />}
              {feedback}
            </p>
          )}
        </div>
      </article>
    </section>
  );
}

function CardScreen({ card, onBack }) {
  return (
    <section className="card-screen">
      <button className="back-button" type="button" onClick={onBack}>
        <ArrowLeft size={20} />
        回地圖
      </button>

      <article className="anniversary-card">
        <p className="eyebrow">{card.dear}</p>
        <h2>{card.title}</h2>
        <p className="card-message">{card.message}</p>
        <p className="signature">{card.signature}</p>
      </article>
    </section>
  );
}

createRoot(document.getElementById('root')).render(<App />);
