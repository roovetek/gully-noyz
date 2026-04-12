"""
Deterministic ICC T20 subset: wide, no-ball, legal delivery, runs, strike rotation.

MVP heuristics: vision provides normalized ball X (0-1), foot over line flag, etc.
Full pitch geometry is out of scope; values are documented for tests and extension.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class DeliveryType(str, Enum):
    LEGAL = "legal"
    WIDE = "wide"
    NO_BALL = "no_ball"


@dataclass
class VisionEvent:
    """One frame or aggregated tick of vision-derived signals (0-1 normalized where noted)."""

    ball_x_norm: float | None = None
    ball_y_norm: float | None = None
    ball_visible: bool = False
    bowler_front_foot_over_crease: bool = False
    # Heuristic bands: |x - 0.5| > wide_threshold => wide (standing in for guideline width)
    wide_threshold: float = 0.42
    # Treat delivery as "completed" for strike rotation (e.g. ball reached batter zone)
    delivery_completed: bool = False
    runs_off_bat: int = 0
    extras_wide: int = 0
    extras_no_ball: int = 0
    bye_runs: int = 0
    leg_bye_runs: int = 0
    wicket_fell: bool = False
    striker_dismissed: bool = False


@dataclass
class MatchState:
    innings: int = 1
    over_index: int = 0
    ball_in_over: int = 0
    runs_total: int = 0
    wickets: int = 0
    striker_end: str = "A"
    non_striker_end: str = "B"
    last_delivery: DeliveryType = DeliveryType.LEGAL
    last_outcome_summary: str = ""

    def to_rules_snapshot(self) -> dict[str, Any]:
        return {
            "innings": self.innings,
            "over_index": self.over_index,
            "ball_in_over": self.ball_in_over,
            "runs_total": self.runs_total,
            "wickets": self.wickets,
            "striker_end": self.striker_end,
            "non_striker_end": self.non_striker_end,
            "last_delivery": self.last_delivery.value,
            "last_outcome_summary": self.last_outcome_summary,
        }


@dataclass
class RulesEngine:
    """Stateful T20 rules: call step() once per logical delivery or frame tick."""

    state: MatchState = field(default_factory=MatchState)
    balls_per_over: int = 6

    def reset(self) -> None:
        self.state = MatchState()

    def step(self, event: VisionEvent) -> MatchState:
        """
        Process one event. For MVP, wide/no-ball inferred from heuristics each tick;
        strike rotation applied when delivery_completed and legal/wide/no-ball accounting done.
        """
        s = self.state
        delivery = DeliveryType.LEGAL
        extras = 0
        runs_bat = event.runs_off_bat

        if event.bowler_front_foot_over_crease:
            delivery = DeliveryType.NO_BALL
            extras = 1
        elif event.ball_visible and event.ball_x_norm is not None:
            if abs(event.ball_x_norm - 0.5) > event.wide_threshold:
                delivery = DeliveryType.WIDE
                extras = 1

        s.last_delivery = delivery

        if not event.delivery_completed:
            s.last_outcome_summary = (
                f"Ball tracked; delivery={delivery.value}"
                if event.ball_visible
                else "No ball signal"
            )
            return s

        # Completed delivery accounting
        if delivery == DeliveryType.WIDE:
            total_runs = 1 + event.extras_wide + runs_bat
            s.runs_total += total_runs
            s.last_outcome_summary = f"Wide + {total_runs - 1} runs" if total_runs > 1 else "Wide"
            self._advance_ball_in_over(s)
            self._rotate_strike_wide_no_ball(s, total_runs, event)
        elif delivery == DeliveryType.NO_BALL:
            penalty = 1 + event.extras_no_ball
            total_runs = penalty + runs_bat + event.bye_runs + event.leg_bye_runs
            s.runs_total += total_runs
            s.last_outcome_summary = f"No ball; total +{total_runs}"
            self._advance_ball_in_over(s)
            self._rotate_strike_no_ball(s, runs_bat, event.bye_runs, event.leg_bye_runs)
        else:
            total = runs_bat + event.bye_runs + event.leg_bye_runs
            s.runs_total += total
            s.last_outcome_summary = f"Legal: {total} run(s)" if total else "Legal: dot"
            self._advance_ball_in_over(s)
            self._rotate_strike_legal(s, runs_bat, event.bye_runs, event.leg_bye_runs)

        if event.wicket_fell:
            s.wickets += 1
            if event.striker_dismissed:
                s.striker_end, s.non_striker_end = s.non_striker_end, s.striker_end
            s.last_outcome_summary += "; WICKET"

        return s

    def _advance_ball_in_over(self, s: MatchState) -> None:
        s.ball_in_over += 1
        if s.ball_in_over >= self.balls_per_over:
            s.ball_in_over = 0
            s.over_index += 1
            s.striker_end, s.non_striker_end = s.non_striker_end, s.striker_end

    def _rotate_strike_legal(
        self,
        s: MatchState,
        runs_bat: int,
        byes: int,
        leg_byes: int,
    ) -> None:
        total_bat = runs_bat
        if total_bat % 2 == 1:
            s.striker_end, s.non_striker_end = s.non_striker_end, s.striker_end
        if byes % 2 == 1 or leg_byes % 2 == 1:
            s.striker_end, s.non_striker_end = s.non_striker_end, s.striker_end

    def _rotate_strike_wide_no_ball(self, s: MatchState, total_runs: int, event: VisionEvent) -> None:
        off_bat = event.runs_off_bat
        if off_bat % 2 == 1:
            s.striker_end, s.non_striker_end = s.non_striker_end, s.striker_end
        elif (total_runs - off_bat) % 2 == 1 and off_bat == 0:
            s.striker_end, s.non_striker_end = s.non_striker_end, s.striker_end

    def _rotate_strike_no_ball(
        self,
        s: MatchState,
        runs_bat: int,
        byes: int,
        leg_byes: int,
    ) -> None:
        if runs_bat % 2 == 1:
            s.striker_end, s.non_striker_end = s.non_striker_end, s.striker_end
        if byes % 2 == 1 or leg_byes % 2 == 1:
            s.striker_end, s.non_striker_end = s.non_striker_end, s.striker_end
