import type { ReactNode } from 'react';

/**
 * Fixed slot directly under the app header. Keeps the match summary in document flow
 * so it never covers Record/Timeline overlays (e.g. the Innings bar in VideoCapture).
 */
export function MatchPageSummaryStrip({ children }: { children: ReactNode }) {
  return (
    <div
      data-testid="match-page-summary-strip"
      className="shrink-0 border-b border-gray-800 bg-black px-3 pb-2 pt-2 flex justify-start sm:px-4 sm:pb-3 sm:pt-3"
    >
      {children}
    </div>
  );
}
