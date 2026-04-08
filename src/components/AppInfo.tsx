import { useEffect, useState } from 'react';
import { getGlobalRules } from '../lib/rulesEngine';
import { Info } from 'lucide-react';
import { MatchRules } from '../lib/types';

export function GullyRulz() {
  const [rules, setRules] = useState<MatchRules | null>(null);

  useEffect(() => {
    async function fetchRules() {
      const fetchedRules = await getGlobalRules();
      setRules(fetchedRules);
    }
    fetchRules();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="p-4 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Info size={24} className="text-blue-400 shrink-0" />
          <div>
            <h1 className="text-2xl font-bold text-white">Gully Rulz</h1>
            <p className="text-sm text-gray-400">
              How to use the app and default rules for this server.
            </p>
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
                <strong className="text-gray-200">umpire passcode</strong> (at least four characters). That
                passcode is not the Dashboard admin password—it is only for this match, and the umpire uses it
                when the app asks for authority during play (for example when an over finishes).
              </li>
              <li>
                Leave the match <strong className="text-gray-200">public</strong> if anyone with the match ID
                should be able to open it. Turn on <strong className="text-gray-200">private</strong> and set a{' '}
                <strong className="text-gray-200">match secret</strong> to restrict who can join: people need
                both the ID and the secret (the secret is never shown again in plain text after you create the
                match—share it safely with your group).
              </li>
              <li>
                You can optionally adjust match rules while creating if your game does not use the defaults
                listed below on this server.
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
                <strong className="text-gray-200">Config</strong> — Match details, effective rules, and
                advanced options for this game (for example credential resets where available).
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

          <div>
            <h3 className="text-lg font-semibold text-white">This page vs Dashboard</h3>
            <p className="mt-2 text-sm text-gray-300 leading-relaxed">
              <strong className="text-gray-200">Gully Rulz</strong> (this screen) shows the{' '}
              <strong className="text-gray-200">default sport rules</strong> configured for this server—what new
              matches inherit unless you customize them at creation.
            </p>
            <p className="mt-2 text-sm text-gray-300 leading-relaxed">
              <strong className="text-gray-200">Dashboard</strong> in the header is for{' '}
              <strong className="text-gray-200">operators and admins</strong>: global app settings (separate from
              your per-match umpire passcode). Use Dashboard only if you have been given that access.
            </p>
          </div>
        </section>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white px-1">Default rules on this server</h2>
          {rules ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-700 bg-gray-900 p-5">
                <h3 className="text-xl font-bold text-white">Overs and Balls</h3>
                <p className="text-sm text-gray-400">Overs per innings: {rules.overs_per_innings}</p>
                <p className="text-sm text-gray-400">Balls per over: {rules.balls_per_over}</p>
              </div>

              <div className="rounded-2xl border border-gray-700 bg-gray-900 p-5">
                <h3 className="text-xl font-bold text-white">Wickets and Bowlers</h3>
                <p className="text-sm text-gray-400">Max wickets: {rules.max_wickets}</p>
                <p className="text-sm text-gray-400">Max overs per bowler: {rules.max_overs_per_bowler}</p>
              </div>

              <div className="rounded-2xl border border-gray-700 bg-gray-900 p-5">
                <h3 className="text-xl font-bold text-white">Extras</h3>
                <p className="text-sm text-gray-400">Wides contribute runs: {rules.wide_no_runs ? 'Yes' : 'No'}</p>
                <p className="text-sm text-gray-400">Wides count as balls: {rules.wide_no_ball_count ? 'Yes' : 'No'}</p>
                <p className="text-sm text-gray-400">Leg-byes contribute runs: {rules.legbye_no_runs ? 'Yes' : 'No'}</p>
              </div>

              <div className="rounded-2xl border border-gray-700 bg-gray-900 p-5">
                <h3 className="text-xl font-bold text-white">Other Rules</h3>
                <p className="text-sm text-gray-400">
                  Consecutive overs required: {rules.consecutive_overs_required ? 'Yes' : 'No'}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm px-1">Loading rules…</p>
          )}
        </div>
      </div>
    </div>
  );
}
