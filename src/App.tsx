import { useState, useCallback } from 'react';
import type { GameState, Difficulty } from './game/types';
import { initGame, prepareRound, drawCard, stopDrawing, nextRound } from './game/gameEngine';
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
    />
  );
}

export default App;
