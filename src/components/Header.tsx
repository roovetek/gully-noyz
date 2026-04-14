import { Home, BookOpen, Video, Cpu } from 'lucide-react';

export type NavHighlight =
  | 'home'
  | 'gullyRulz'
  | 'videoAnalysis'
  | 'videoAnalysisBrowser'
  | 'admin'
  | 'none';

interface HeaderProps {
  /** Which top-nav item is active (only one primary highlight at a time). */
  highlight: NavHighlight;
  onHome: () => void;
  onOpenGullyRulz: () => void;
  onOpenVideoAnalysis: () => void;
  onOpenVideoAnalysisBrowser: () => void;
}

/** Home: always green (same idea as Gully Rulz always blue); weight shows active route. */
const homeNavClass = (active: boolean) =>
  `flex items-center gap-2 text-sm text-green-400 transition-colors ${
    active ? 'font-bold' : 'font-semibold hover:font-bold'
  }`;

/** Gully Rulz: always blue (distinct from Home green). */
const gullyRulzNavClass = (active: boolean) =>
  `flex items-center gap-2 text-sm text-blue-400 transition-colors ${
    active ? 'font-bold' : 'font-semibold hover:font-bold'
  }`;

/** Video Analysis: always rose; weight shows active route. */
const videoAnalysisNavClass = (active: boolean) =>
  `flex items-center gap-2 text-sm text-rose-400 transition-colors ${
    active ? 'font-bold' : 'font-semibold hover:font-bold'
  }`;

/** In-browser pose lab: amber accent. */
const browserLabNavClass = (active: boolean) =>
  `flex items-center gap-2 text-sm text-amber-400 transition-colors ${
    active ? 'font-bold' : 'font-semibold hover:font-bold'
  }`;

export function Header({
  highlight,
  onHome,
  onOpenGullyRulz,
  onOpenVideoAnalysis,
  onOpenVideoAnalysisBrowser,
}: HeaderProps) {
  const isHome = highlight === 'home';
  const isRulz = highlight === 'gullyRulz';
  const isVideoAnalysis = highlight === 'videoAnalysis';
  const isBrowserLab = highlight === 'videoAnalysisBrowser';

  return (
    <header className="fixed top-0 left-0 right-0 z-40 flex h-16 items-center bg-gray-900 border-b border-gray-800">
      <div className="flex w-full flex-wrap items-center gap-x-6 gap-y-2 px-4">
        <button type="button" onClick={onHome} className={homeNavClass(isHome)}>
          <Home size={20} className="shrink-0" />
          <span>Home</span>
        </button>

        <button type="button" onClick={onOpenGullyRulz} className={gullyRulzNavClass(isRulz)}>
          <BookOpen size={20} className="shrink-0" />
          <span>Gully Rulz</span>
        </button>

        <button
          type="button"
          onClick={onOpenVideoAnalysis}
          className={videoAnalysisNavClass(isVideoAnalysis)}
        >
          <Video size={20} className="shrink-0" />
          <span className="hidden sm:inline">Video Analysis</span>
          <span className="sm:hidden">Video</span>
        </button>

        <button
          type="button"
          onClick={onOpenVideoAnalysisBrowser}
          className={browserLabNavClass(isBrowserLab)}
          title="Pose estimation runs locally in your browser (MediaPipe WASM)"
        >
          <Cpu size={20} className="shrink-0" />
          <span className="hidden sm:inline">Browser lab</span>
          <span className="sm:hidden">Lab</span>
        </button>
      </div>
    </header>
  );
}
