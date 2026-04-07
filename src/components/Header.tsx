import { Home, BookOpen, ShieldCheck } from 'lucide-react';

export type NavHighlight = 'home' | 'gullyRulz' | 'admin' | 'none';

interface HeaderProps {
  /** Which top-nav item is active (only one primary highlight at a time). */
  highlight: NavHighlight;
  onHome: () => void;
  onOpenGullyRulz: () => void;
  onOpenAdmin: () => void;
}

export function Header({ highlight, onHome, onOpenGullyRulz, onOpenAdmin }: HeaderProps) {
  const isHome = highlight === 'home';
  const isRulz = highlight === 'gullyRulz';
  const isAdmin = highlight === 'admin';

  return (
    <header className="fixed top-0 left-0 right-0 z-40 flex h-16 items-center bg-gray-900 border-b border-gray-800">
      <div className="flex w-full items-center justify-between px-4">
        <button
          type="button"
          onClick={onHome}
          className={`flex items-center gap-2 transition-colors ${
            isHome ? 'text-green-400' : 'text-gray-500 hover:text-green-300'
          }`}
        >
          <Home size={20} />
          <span className="text-sm font-semibold">Home</span>
        </button>

        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={onOpenGullyRulz}
            className={`flex items-center gap-2 transition-colors ${
              isRulz ? 'text-blue-400' : 'text-gray-500 hover:text-blue-300'
            }`}
          >
            <BookOpen size={20} />
            <span className="text-sm font-semibold">Gully Rulz</span>
          </button>

          <button
            type="button"
            onClick={onOpenAdmin}
            className={`flex items-center gap-2 transition-colors ${
              isAdmin ? 'text-yellow-400' : 'text-gray-500 hover:text-yellow-300'
            }`}
          >
            <ShieldCheck size={20} />
            <span className="text-sm font-semibold">Dashboard</span>
          </button>
        </div>
      </div>
    </header>
  );
}
