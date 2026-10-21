import { useState } from 'react';
import BottomNav, { type Screen } from './components/BottomNav.tsx';
import HomeScreen from './screens/HomeScreen.tsx';
import AboutScreen from './screens/AboutScreen.tsx';
import './App.css';

export default function App() {
  // Both screens live in the same React tree; switching never reloads the page.
  const [screen, setScreen] = useState<Screen>('home');

  function navigate(next: Screen) {
    setScreen(next);
    window.scrollTo(0, 0);
  }

  return (
    <div className="app">
      <main className="app__content">
        {screen === 'home' ? <HomeScreen /> : <AboutScreen />}
      </main>
      <BottomNav current={screen} onNavigate={navigate} />
    </div>
  );
}
