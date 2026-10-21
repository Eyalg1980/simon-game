import './BottomNav.css';

export type Screen = 'home' | 'about';

const ITEMS: { screen: Screen; label: string }[] = [
  { screen: 'home', label: 'בית' },
  { screen: 'about', label: 'אודות' },
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
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
