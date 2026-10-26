
from typing import Any


TRAIT_NAMES = [
    "social_energy",
    "communication",
    "openness",
    "empathy",
    "adventure",
]


def trait_compatibility(
    user_traits: list[int],
    candidate_traits: list[int],
) -> float:
    """Compare five traits scored from 1 to 10."""
    if len(user_traits) != 5 or len(candidate_traits) != 5:
        raise ValueError("Both profiles must have exactly five traits.")

    if any(not 1 <= value <= 10 for value in user_traits + candidate_traits):
        raise ValueError("Trait scores must be between 1 and 10.")

    differences = [
        abs(user - candidate)
        for user, candidate in zip(user_traits, candidate_traits)
    ]

    average_difference = sum(differences) / len(differences)

    return round((1 - average_difference / 9) * 100, 2)


def interest_compatibility(
    user_interests: list[str],
    candidate_interests: list[str],
) -> float:
    """Calculate shared interests as a percentage of the union."""
    user_set = {interest.strip().casefold() for interest in user_interests}
    candidate_set = {
        interest.strip().casefold() for interest in candidate_interests
    }

    user_set.discard("")
    candidate_set.discard("")

    if not user_set and not candidate_set:
        return 0.0

    union = user_set | candidate_set
    shared = user_set & candidate_set

    return round(len(shared) / len(union) * 100, 2)


def goal_compatibility(user_goal: str, candidate_goal: str) -> float:
    """Baseline rule: matching friendship goals receive full credit."""
    if not user_goal.strip() or not candidate_goal.strip():
        return 0.0

    return 100.0 if user_goal.strip().casefold() == candidate_goal.strip().casefold() else 0.0


def recommend(
    user: dict[str, Any],
    candidates: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Score and rank candidates against the user's profile."""
    results = []

    for candidate in candidates:
        if candidate.get("id") == user.get("id"):
            continue

        trait_score = trait_compatibility(
            user["traits"], candidate["traits"]
        )
        interest_score = interest_compatibility(
            user["interests"], candidate["interests"]
        )
        goal_score = goal_compatibility(
            user["goal"], candidate["goal"]
        )

        total = (
            0.50 * trait_score
            + 0.25 * interest_score
            + 0.25 * goal_score
        )

        shared = sorted(
            {
                interest.strip().casefold()
                for interest in user["interests"]
                if interest.strip()
            }
            & {
                interest.strip().casefold()
                for interest in candidate["interests"]
                if interest.strip()
            }
        )

        reasons = [
            f"You share {len(shared)} interests."
        ]

        if trait_score >= 75:
            reasons.append("Your personality traits are quite similar.")

        if goal_score == 100:
            reasons.append("You have the same friendship goal.")

        results.append({
            "candidate_id": candidate["id"],
            "name": candidate["name"],
            "compatibility": round(total, 2),
            "trait_score": trait_score,
            "interest_score": interest_score,
            "goal_score": goal_score,
            "shared_interests": shared,
            "reasons": reasons,
        })

    return sorted(
        results,
        key=lambda item: item["compatibility"],
        reverse=True,
    )
