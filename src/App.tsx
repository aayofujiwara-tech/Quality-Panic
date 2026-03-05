import { useState, useCallback } from 'react';
import type { GameState, Difficulty } from './game/types';
import {
  initGame, prepareRound, drawCard, stopDrawing, nextRound,
  useResponseCard, skipResponseCard, useDesignChange, dismissEvent,
  selectSamplingCard,
} from './game/gameEngine';
import { TitleScreen } from './components/TitleScreen';
import { GameBoard } from './components/GameBoard';
import { GameOverScreen } from './components/GameOverScreen';

function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);

  const handleStart = useCallback((difficulty: Difficulty) => {
    setGameState(initGame(difficulty));
  }, []);

  const handlePrepare = useCallback(() => {
    setGameState((prev) => prev ? prepareRound(prev) : prev);
  }, []);

  const handleDraw = useCallback(() => {
    setGameState((prev) => prev ? drawCard(prev) : prev);
  }, []);

  const handleStop = useCallback(() => {
    setGameState((prev) => prev ? stopDrawing(prev) : prev);
  }, []);

  const handleNextRound = useCallback(() => {
    setGameState((prev) => prev ? nextRound(prev) : prev);
  }, []);

  const handleUseResponseCard = useCallback((cardIndex: number) => {
    setGameState((prev) => prev ? useResponseCard(prev, cardIndex) : prev);
  }, []);

  const handleSkipResponseCard = useCallback(() => {
    setGameState((prev) => prev ? skipResponseCard(prev) : prev);
  }, []);

  const handleUseDesignChange = useCallback((cardIndex: number) => {
    setGameState((prev) => {
      if (!prev) return prev;
      const card = prev.responseHand[cardIndex];
      if (card?.responseType === 'design_change') {
        return useDesignChange(prev, cardIndex);
      }
      return prev;
    });
  }, []);

  const handleDismissEvent = useCallback(() => {
    setGameState((prev) => prev ? dismissEvent(prev) : prev);
  }, []);

  const handleSelectSamplingCard = useCallback((index: number) => {
    setGameState((prev) => prev ? selectSamplingCard(prev, index) : prev);
  }, []);

  const handleRestart = useCallback(() => {
    setGameState(null);
  }, []);

  if (!gameState) {
    return <TitleScreen onStart={handleStart} />;
  }

  if (gameState.phase === 'game_over') {
    return <GameOverScreen state={gameState} onRestart={handleRestart} />;
  }

  return (
    <GameBoard
      state={gameState}
      onDraw={handleDraw}
      onStop={handleStop}
      onNextRound={handleNextRound}
      onPrepare={handlePrepare}
      onUseResponseCard={handleUseResponseCard}
      onSkipResponseCard={handleSkipResponseCard}
      onUseDesignChange={handleUseDesignChange}
      onDismissEvent={handleDismissEvent}
      onSelectSamplingCard={handleSelectSamplingCard}
    />
  );
}

export default App;
