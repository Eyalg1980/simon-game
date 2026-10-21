import { fireEvent, render, screen, within } from '@testing-library/react';
import App from '../App.tsx';

function getNav() {
  return screen.getByRole('navigation', { name: 'ניווט ראשי' });
}

describe('App', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
  });

  it('opens on the home screen with title, round indicator, board and start button', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'סיימון' })).toBeInTheDocument();
    expect(screen.getByText('שלב 1 מתוך 10')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
    for (const label of ['ירוק', 'אדום', 'צהוב', 'כחול']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    expect(within(getNav()).getByRole('button', { name: 'בית' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('has exactly two navigation options', () => {
    render(<App />);
    expect(within(getNav()).getAllByRole('button')).toHaveLength(2);
  });

  it('navigates to about and back without leaving the app', () => {
    render(<App />);

    fireEvent.click(within(getNav()).getByRole('button', { name: 'אודות' }));

    expect(screen.getByRole('heading', { level: 1, name: 'אודות' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'על המשחק' })).toBeInTheDocument();
    expect(screen.getByText(/ודא שהטלפון אינו במצב שקט/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '10 המשחקים האחרונים' })).toBeInTheDocument();
    expect(screen.getByText('עדיין אין משחקים שמורים.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'מחק היסטוריה' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ירוק' })).not.toBeInTheDocument();
    expect(within(getNav()).getByRole('button', { name: 'אודות' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    fireEvent.click(within(getNav()).getByRole('button', { name: 'בית' }));

    expect(screen.getByRole('heading', { level: 1, name: 'סיימון' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
  });
});
