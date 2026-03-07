import { useState, useCallback } from 'react';
import type { GameState, Difficulty, Room } from './game/types';
import {
  initGame, prepareRound, drawCard, stopDrawing, nextRound,
  useResponseCard, skipResponseCard, useDesignChange, dismissEvent,
  selectSamplingCard,
} from './game/gameEngine';
import { useAnimations } from './game/animations';
import { TitleScreen } from './components/TitleScreen';
import { GameBoard } from './components/GameBoard';
import { GameOverScreen } from './components/GameOverScreen';
import { RoomCreate } from './components/RoomCreate';
import { RoomJoin } from './components/RoomJoin';
import { WaitingRoom } from './components/WaitingRoom';
import { MultiplayerGame } from './components/MultiplayerGame';

type AppScreen =
  | { type: 'title' }
  | { type: 'solo'; state: GameState }
  | { type: 'create_room' }
  | { type: 'join_room' }
  | { type: 'waiting'; roomCode: string; uid: string }
  | { type: 'multiplayer'; roomCode: string; uid: string; room: Room };

function App() {
  const [screen, setScreen] = useState<AppScreen>({ type: 'title' });
  const animations = useAnimations();

  // ===== ソロモード ハンドラ =====
  const handleStart = useCallback((difficulty: Difficulty) => {
    animations.reset();
    setScreen({ type: 'solo', state: initGame(difficulty) });
  }, [animations]);

  const updateSolo = useCallback((fn: (prev: GameState) => GameState) => {
    setScreen((s) => s.type === 'solo' ? { ...s, state: fn(s.state) } : s);
  }, []);

  const handlePrepare = useCallback(() => {
    setScreen((s) => {
      if (s.type !== 'solo') return s;
      const prev = s.state;
      const next = prepareRound(prev);

      // 汚染投入演出
      if (prev.round > 1) {
        const added = prev.contaminationStock.length - next.contaminationStock.length;
        if (added > 0) {
          animations.showContamination(added);
        }
      }

      return { ...s, state: next };
    });
  }, [animations]);

  // カードをめくる（フリップアニメーション付き）
  const handleDraw = useCallback(() => {
    if (animations.anim.busy) return;

    setScreen((s) => {
      if (s.type !== 'solo') return s;
      if (s.state.drawPile.length === 0) return s;

      const nextCard = s.state.drawPile[0];
      animations.flipCard(nextCard, () => {
        setScreen((s2) => {
          if (s2.type !== 'solo') return s2;
          const newState = drawCard(s2.state);

          // パニック演出
          const lastResult = newState.roundHistory[newState.roundHistory.length - 1];
          if (newState.phase === 'result' && lastResult?.panicked) {
            animations.playPanic(() => {});
          }

          // イベントカード演出
          if (newState.phase === 'event_display' && newState.pendingEvent) {
            animations.playEventGlow(newState.pendingEvent);
          }

          return { ...s2, state: newState };
        });
      });

      return s;
    });
  }, [animations]);

  const handleStop = useCallback(() => {
    if (animations.anim.busy) return;
    setScreen((s) => {
      if (s.type !== 'solo') return s;
      const profit = s.state.currentRoundProfit;
      const next = stopDrawing(s.state);

      if (profit > 0) animations.countUpScore();
      if (profit >= 8) animations.showBigShipment();

      return { ...s, state: next };
    });
  }, [animations]);

  const handleNextRound = useCallback(() => updateSolo(nextRound), [updateSolo]);
  const handleDismissEvent = useCallback(() => updateSolo(dismissEvent), [updateSolo]);

  const handleUseResponseCard = useCallback((cardIndex: number) => {
    if (animations.anim.busy) return;
    animations.playCardUse(cardIndex, () => {
      updateSolo((prev) => useResponseCard(prev, cardIndex));
    });
  }, [updateSolo, animations]);

  const handleSkipResponseCard = useCallback(() => {
    updateSolo(skipResponseCard);
  }, [updateSolo]);

  const handleUseDesignChange = useCallback((cardIndex: number) => {
    if (animations.anim.busy) return;
    animations.playCardUse(cardIndex, () => {
      updateSolo((prev) => {
        const card = prev.responseHand[cardIndex];
        if (card?.responseType === 'design_change') {
          return useDesignChange(prev, cardIndex);
        }
        return prev;
      });
    });
  }, [updateSolo, animations]);

  const handleSelectSamplingCard = useCallback((index: number) => {
    updateSolo((prev) => selectSamplingCard(prev, index));
  }, [updateSolo]);

  const handleRestart = useCallback(() => {
    animations.reset();
    setScreen({ type: 'title' });
  }, [animations]);

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
    animations.reset();
    setScreen({ type: 'title' });
  }, [animations]);

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
          anim={animations.anim}
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
      return (
        <MultiplayerGame
          roomCode={screen.roomCode}
          uid={screen.uid}
          initialRoom={screen.room}
          onBack={handleBackToTitle}
        />
      );
  }
}

export default App;
