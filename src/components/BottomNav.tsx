import type { ReactNode } from 'react';
import './BottomNav.css';

export type Screen = 'home' | 'about';

const HOME_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5.5 9v11h13V9" />
    <path d="M10 20v-6h4v6" />
  </svg>
);

const INFO_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v6" />
    <path d="M12 7.5v.01" />
  </svg>
);

const ITEMS: { screen: Screen; label: string; icon: ReactNode }[] = [
  { screen: 'home', label: 'בית', icon: HOME_ICON },
  { screen: 'about', label: 'אודות', icon: INFO_ICON },
];

type Props = {
  current: Screen;
  onNavigate: (screen: Screen) => void;
};

export default function BottomNav({ current, onNavigate }: Props) {
  return (
    <nav className="bottom-nav" aria-label="ניווט ראשי">
      {ITEMS.map((item) => {
        const active = item.screen === current;
        return (
          <button
            key={item.screen}
            type="button"
            className={active ? 'bottom-nav__item bottom-nav__item--active' : 'bottom-nav__item'}
            aria-current={active ? 'page' : undefined}
            onClick={() => onNavigate(item.screen)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
