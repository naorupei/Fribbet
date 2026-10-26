
from recommendation import recommend


user = {
    "id": 1,
    "name": "You",
    "traits": [8, 9, 7, 9, 6],
    "interests": ["Music", "Gaming", "Reading", "Photography"],
    "goal": "close_friends",
}

candidates = [
    {
        "id": 1,
        "name": "You",
        "traits": [8, 9, 7, 9, 6],
        "interests": ["Music", "Gaming"],
        "goal": "close_friends",
    },
    {
        "id": 2,
        "name": "Ananya",
        "traits": [8, 8, 7, 9, 6],
        "interests": ["Music", "Gaming", "Reading"],
        "goal": "close_friends",
    },
    {
        "id": 3,
        "name": "Rithika",
        "traits": [5, 6, 9, 7, 9],
        "interests": ["Travel", "Photography", "Art"],
        "goal": "study_buddies",
    },
]

results = recommend(user, candidates)

for result in results:
    print(f"\n{result['name']}: {result['compatibility']}%")
    print(f"  Traits: {result['trait_score']}%")
    print(f"  Interests: {result['interest_score']}%")
    print(f"  Goals: {result['goal_score']}%")
    print(f"  Reasons: {' '.join(result['reasons'])}")

assert len(results) == 2, "The current user's own profile should be excluded."
assert results[0]["name"] == "Ananya", "The best match should rank first."
assert results[0]["compatibility"] > results[1]["compatibility"]
print("\nAll recommendation tests passed.")
