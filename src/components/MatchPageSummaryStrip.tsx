import type { ReactNode } from 'react';

/**
 * Fixed slot directly under the app header. Keeps the match summary in document flow
 * so it never covers Record/Timeline overlays (e.g. the Innings bar in VideoCapture).
 */
export function MatchPageSummaryStrip({ children }: { children: ReactNode }) {
  return (
    <div
      data-testid="match-page-summary-strip"
      className="shrink-0 px-4 pt-3 pb-3 border-b border-gray-800 bg-black flex justify-start"
    >
      {children}
    </div>
  );
}
