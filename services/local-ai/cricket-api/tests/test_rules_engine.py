"""Unit tests for ICC T20 subset rules engine."""

import unittest

from rules.engine import DeliveryType, MatchState, RulesEngine, VisionEvent


class TestStrikeRotationLegal(unittest.TestCase):
    def test_odd_runs_swap_ends(self) -> None:
        eng = RulesEngine()
        eng.state = MatchState(striker_end="A", non_striker_end="B")
        e = VisionEvent(
            ball_visible=True,
            ball_x_norm=0.5,
            ball_y_norm=0.5,
            delivery_completed=True,
            runs_off_bat=1,
        )
        eng.step(e)
        self.assertEqual(eng.state.striker_end, "B")
        self.assertEqual(eng.state.non_striker_end, "A")

    def test_even_runs_same_striker(self) -> None:
        eng = RulesEngine()
        eng.state = MatchState(striker_end="A", non_striker_end="B")
        e = VisionEvent(
            ball_visible=True,
            ball_x_norm=0.5,
            ball_y_norm=0.5,
            delivery_completed=True,
            runs_off_bat=2,
        )
        eng.step(e)
        self.assertEqual(eng.state.striker_end, "A")

    def test_over_completion_swaps_strike(self) -> None:
        eng = RulesEngine()
        eng.state = MatchState(over_index=0, ball_in_over=5, striker_end="A", non_striker_end="B")
        e = VisionEvent(
            ball_visible=True,
            ball_x_norm=0.5,
            ball_y_norm=0.5,
            delivery_completed=True,
            runs_off_bat=0,
        )
        eng.step(e)
        self.assertEqual(eng.state.ball_in_over, 0)
        self.assertEqual(eng.state.over_index, 1)
        self.assertEqual(eng.state.striker_end, "B")


class TestWideNoBall(unittest.TestCase):
    def test_wide_heuristic(self) -> None:
        eng = RulesEngine()
        e = VisionEvent(
            ball_visible=True,
            ball_x_norm=0.96,
            ball_y_norm=0.5,
            wide_threshold=0.42,
            delivery_completed=True,
        )
        eng.step(e)
        self.assertEqual(eng.state.last_delivery, DeliveryType.WIDE)
        self.assertGreater(eng.state.runs_total, 0)

    def test_no_ball_foot(self) -> None:
        eng = RulesEngine()
        e = VisionEvent(
            ball_visible=True,
            ball_x_norm=0.5,
            ball_y_norm=0.5,
            bowler_front_foot_over_crease=True,
            delivery_completed=True,
        )
        eng.step(e)
        self.assertEqual(eng.state.last_delivery, DeliveryType.NO_BALL)

    def test_incomplete_delivery_no_score(self) -> None:
        eng = RulesEngine()
        eng.state = MatchState(runs_total=10)
        e = VisionEvent(
            ball_visible=True,
            ball_x_norm=0.96,
            ball_y_norm=0.5,
            delivery_completed=False,
        )
        eng.step(e)
        self.assertEqual(eng.state.runs_total, 10)


if __name__ == "__main__":
    unittest.main()
