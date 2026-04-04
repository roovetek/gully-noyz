import { Home, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  onHome: () => void;
  onOpenAdmin: () => void;
}

export function Header({ onHome, onOpenAdmin }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 bg-gray-900 border-b border-gray-800 z-40">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onHome}
          className="flex items-center gap-2 text-green-400 hover:text-green-300 transition-colors"
        >
          <Home size={20} />
          <span className="text-sm font-semibold">Home</span>
        </button>

        <button
          onClick={onOpenAdmin}
          className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 transition-colors"
        >
          <ShieldCheck size={20} />
          <span className="text-sm font-semibold">Admin</span>
        </button>
      </div>
    </header>
  );
}