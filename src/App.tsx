import { useState } from 'react';
import BottomNav, { type Screen } from './components/BottomNav.tsx';
import HomeScreen from './screens/HomeScreen.tsx';
import AboutScreen from './screens/AboutScreen.tsx';
import { useGame } from './game/useGame.ts';
import './App.css';

export default function App() {
  // Both screens live in the same React tree; switching never reloads the page.
  const [screen, setScreen] = useState<Screen>('home');
  // Game state is owned here so switching screens does not unmount it
  const game = useGame(screen === 'home');

  function navigate(next: Screen) {
    // Leaving during an active game pauses it before the screen switches (ADR-3)
    if (next === 'about') game.pause();
    setScreen(next);
    window.scrollTo(0, 0);
  }

  return (
    <div className="app">
      <main className="app__content">
        {screen === 'home' ? <HomeScreen game={game} /> : <AboutScreen />}
      </main>
      <BottomNav current={screen} onNavigate={navigate} />
    </div>
  );
}
