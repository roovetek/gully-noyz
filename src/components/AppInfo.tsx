import { Info } from 'lucide-react';

export function GullyRulz() {
  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="p-4 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Info size={24} className="text-blue-400 shrink-0" />
          <div>
            <h1 className="text-2xl font-bold text-white">Gully Rulz</h1>
            <p className="text-sm text-gray-400">Tips for using GullyStream</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-8 max-w-3xl mx-auto">
        <section
          className="rounded-2xl border border-gray-700 bg-gray-900 p-5 space-y-6"
          aria-labelledby="gully-rulz-guide-heading"
        >
          <div>
            <h2 id="gully-rulz-guide-heading" className="text-xl font-bold text-white">
              How to use GullyStream
            </h2>
            <p className="mt-2 text-sm text-gray-300 leading-relaxed">
              GullyStream helps you run and follow informal cricket—gully, street, or park games—with a live
              score, ball-by-ball history, and optional video clips tied to each ball. Use it on one phone or
              share the match ID so friends can follow along on theirs.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white">Starting a match</h3>
            <ul className="mt-2 list-disc list-inside space-y-2 text-sm text-gray-300 leading-relaxed">
              <li>
                Tap <strong className="text-gray-200">Create</strong>, give the game a name, and set an{' '}
                <strong className="text-gray-200">umpire passcode</strong> (at least four characters). It is
                only for this match—the umpire uses it when the app asks for authority during play (for example
                when an over finishes).
              </li>
              <li>
                Leave the match <strong className="text-gray-200">public</strong> if anyone with the match ID
                should be able to open it. Turn on <strong className="text-gray-200">private</strong> and set a{' '}
                <strong className="text-gray-200">match secret</strong> to restrict who can join: people need
                both the ID and the secret (the secret is never shown again in plain text after you create the
                match—share it safely with your group).
              </li>
              <li>
                <strong className="text-gray-200">Match rules</strong> are fixed when the match is created:
                overs, wickets, how extras affect runs, and similar. Tap{' '}
                <strong className="text-gray-200">Customize</strong> under{' '}
                <strong className="text-gray-200">Match Rules</strong> to set overs per innings, balls per
                over, max wickets, max overs per bowler, and extras-related options for that game.
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white">Joining a match</h3>
            <p className="mt-2 text-sm text-gray-300 leading-relaxed">
              Enter the <strong className="text-gray-200">match ID</strong> on the home screen. Public matches
              open right away. Private matches ask for the match secret the first time you join on this
              device; after a successful join, your browser can remember it for next time.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white">Inside the match</h3>
            <p className="mt-2 text-sm text-gray-300 leading-relaxed">
              Once you are in, use the bottom tabs:
            </p>
            <ul className="mt-2 list-disc list-inside space-y-2 text-sm text-gray-300 leading-relaxed">
              <li>
                <strong className="text-gray-200">Record</strong> — Log each ball (runs, wickets, extras) and
                optionally capture short video for that ball.
              </li>
              <li>
                <strong className="text-gray-200">Timeline</strong> — Review the sequence of balls and events
                for the innings.
              </li>
              <li>
                <strong className="text-gray-200">Stats</strong> — See summaries and figures for the match so
                far.
              </li>
              <li>
                <strong className="text-gray-200">Config</strong> — Match details, effective rules, and other
                options for this game.
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white">Umpire passcode and correcting an over</h3>
            <p className="mt-2 text-sm text-gray-300 leading-relaxed">
              Everyone who joined can follow the game live. When an <strong className="text-gray-200">over</strong>{' '}
              completes, the flow may ask for the <strong className="text-gray-200">umpire passcode</strong> before
              moving on. After you enter it, you can <strong className="text-gray-200">review and edit</strong> the
              outcomes for that finished over if something was tapped wrong—then confirm to start the next over.
              Plan ahead: only people who should control that step should know the umpire passcode.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
