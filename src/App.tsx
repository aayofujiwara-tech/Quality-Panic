import { useState, useCallback } from 'react';
import type { GameState, Difficulty, Room } from './game/types';
import {
  initGame, prepareRound, drawCard, stopDrawing, nextRound,
  useResponseCard, skipResponseCard, useDesignChange, dismissEvent,
  selectSamplingCard,
} from './game/gameEngine';
import { TitleScreen } from './components/TitleScreen';
import { GameBoard } from './components/GameBoard';
import { GameOverScreen } from './components/GameOverScreen';
import { RoomCreate } from './components/RoomCreate';
import { RoomJoin } from './components/RoomJoin';
import { WaitingRoom } from './components/WaitingRoom';

type AppScreen =
  | { type: 'title' }
  | { type: 'solo'; state: GameState }
  | { type: 'create_room' }
  | { type: 'join_room' }
  | { type: 'waiting'; roomCode: string; uid: string }
  | { type: 'multiplayer'; roomCode: string; uid: string; room: Room };

function App() {
  const [screen, setScreen] = useState<AppScreen>({ type: 'title' });

  // ===== ソロモード ハンドラ =====
  const handleStart = useCallback((difficulty: Difficulty) => {
    setScreen({ type: 'solo', state: initGame(difficulty) });
  }, []);

  const updateSolo = useCallback((fn: (prev: GameState) => GameState) => {
    setScreen((s) => s.type === 'solo' ? { ...s, state: fn(s.state) } : s);
  }, []);

  const handlePrepare = useCallback(() => updateSolo(prepareRound), [updateSolo]);
  const handleDraw = useCallback(() => updateSolo(drawCard), [updateSolo]);
  const handleStop = useCallback(() => updateSolo(stopDrawing), [updateSolo]);
  const handleNextRound = useCallback(() => updateSolo(nextRound), [updateSolo]);
  const handleDismissEvent = useCallback(() => updateSolo(dismissEvent), [updateSolo]);

  const handleUseResponseCard = useCallback((cardIndex: number) => {
    updateSolo((prev) => useResponseCard(prev, cardIndex));
  }, [updateSolo]);

  const handleSkipResponseCard = useCallback(() => {
    updateSolo(skipResponseCard);
  }, [updateSolo]);

  const handleUseDesignChange = useCallback((cardIndex: number) => {
    updateSolo((prev) => {
      const card = prev.responseHand[cardIndex];
      if (card?.responseType === 'design_change') {
        return useDesignChange(prev, cardIndex);
      }
      return prev;
    });
  }, [updateSolo]);

  const handleSelectSamplingCard = useCallback((index: number) => {
    updateSolo((prev) => selectSamplingCard(prev, index));
  }, [updateSolo]);

  const handleRestart = useCallback(() => {
    setScreen({ type: 'title' });
  }, []);

  // ===== マルチプレイヤー ハンドラ =====
  const handleMultiplayer = useCallback((mode: 'create_room' | 'join_room') => {
    setScreen({ type: mode });
  }, []);

  const handleRoomCreated = useCallback((roomCode: string, uid: string) => {
    setScreen({ type: 'waiting', roomCode, uid });
  }, []);

  const handleRoomJoined = useCallback((roomCode: string, uid: string) => {
    setScreen({ type: 'waiting', roomCode, uid });
  }, []);

  const handleGameStart = useCallback((room: Room) => {
    if (screen.type === 'waiting') {
      setScreen({ type: 'multiplayer', roomCode: screen.roomCode, uid: screen.uid, room });
    }
  }, [screen]);

  const handleBackToTitle = useCallback(() => {
    setScreen({ type: 'title' });
  }, []);

  // ===== レンダリング =====
  switch (screen.type) {
    case 'title':
      return <TitleScreen onStart={handleStart} onMultiplayer={handleMultiplayer} />;

    case 'solo':
      if (screen.state.phase === 'game_over') {
        return <GameOverScreen state={screen.state} onRestart={handleRestart} />;
      }
      return (
        <GameBoard
          state={screen.state}
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

    case 'create_room':
      return <RoomCreate onCreated={handleRoomCreated} onBack={handleBackToTitle} />;

    case 'join_room':
      return <RoomJoin onJoined={handleRoomJoined} onBack={handleBackToTitle} />;

    case 'waiting':
      return (
        <WaitingRoom
          roomCode={screen.roomCode}
          uid={screen.uid}
          onGameStart={handleGameStart}
          onBack={handleBackToTitle}
        />
      );

    case 'multiplayer':
      // Step 3で MultiplayerGame コンポーネントを実装
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <h1 className="text-3xl font-bold text-amber-400">対戦モード</h1>
          <p className="text-gray-400">ルーム: {screen.roomCode}</p>
          <p className="text-gray-500 text-sm">（Step 3で実装予定）</p>
          <button
            onClick={handleBackToTitle}
            className="px-6 py-2 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            タイトルに戻る
          </button>
        </div>
      );
  }
}

export default App;
