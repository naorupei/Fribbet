import { useState } from "react";
import { auth } from "./firebase";
import type { StudentProfile } from "./api";
import { updateProfile } from "./api";
type Trait =
  | "social"
  | "communication"
  | "openness"
  | "empathy"
  | "adventure";

type Profile = {
  name: string;
  age: string;
  college: string;
  course: string;
  interests: string[];
  goal: string;
};

type CompletedProfile = Profile & {
  traits: number[];
  id?: number;
  photoUrl?: string;
};

type Question = {
  question: string;
  options: { text: string; trait: Trait; value: number }[];
};

const questions: Question[] = [
  {
    question: "Your ideal free afternoon looks like…",
    options: [
      { text: "A spontaneous outing", trait: "adventure", value: 3 },
      { text: "Coffee and a long conversation", trait: "communication", value: 3 },
      { text: "A quiet reset with favourite people", trait: "social", value: 2 },
      { text: "Trying something completely new", trait: "openness", value: 3 },
    ],
  },
  {
    question: "A friend seems upset. You usually…",
    options: [
      { text: "Listen and let them talk", trait: "empathy", value: 3 },
      { text: "Help them work through it", trait: "communication", value: 2 },
      { text: "Give them space and check in later", trait: "empathy", value: 2 },
      { text: "Suggest doing something uplifting", trait: "adventure", value: 2 },
    ],
  },
  {
    question: "In a new group, you're usually…",
    options: [
      { text: "Starting conversations", trait: "social", value: 3 },
      { text: "Quiet at first, open later", trait: "openness", value: 2 },
      { text: "Helping people feel included", trait: "empathy", value: 3 },
      { text: "Going with the flow", trait: "adventure", value: 2 },
    ],
  },
  {
    question: "What matters most in a friendship?",
    options: [
      { text: "Talking about absolutely anything", trait: "communication", value: 3 },
      { text: "Feeling understood and supported", trait: "empathy", value: 3 },
      { text: "Growing and learning together", trait: "openness", value: 3 },
      { text: "Having fun and making memories", trait: "adventure", value: 3 },
    ],
  },
  {
    question: "How do you feel about last-minute plans?",
    options: [
      { text: "Yes, tell me where and when", trait: "adventure", value: 3 },
      { text: "Depends on my energy", trait: "social", value: 2 },
      { text: "I prefer plans made in advance", trait: "communication", value: 2 },
      { text: "I'll try it if it sounds interesting", trait: "openness", value: 3 },
    ],
  },
  {
    question: "After a long college day, you prefer…",
    options: [
      { text: "Hanging out with a group", trait: "social", value: 3 },
      { text: "Talking with one close friend", trait: "communication", value: 2 },
      { text: "Some time alone to recharge", trait: "social", value: 1 },
      { text: "Doing something new outside", trait: "adventure", value: 3 },
    ],
  },
  {
    question: "When a misunderstanding happens, you…",
    options: [
      { text: "Talk it through as soon as possible", trait: "communication", value: 3 },
      { text: "Take time to process", trait: "openness", value: 2 },
      { text: "Try to understand both perspectives", trait: "empathy", value: 3 },
      { text: "Reconnect once things settle", trait: "communication", value: 1 },
    ],
  },
  {
    question: "Your favourite kind of conversation is…",
    options: [
      { text: "Deep talks about life", trait: "communication", value: 3 },
      { text: "Silly jokes and random stories", trait: "social", value: 2 },
      { text: "Ideas and possibilities", trait: "openness", value: 3 },
      { text: "Sharing feelings and experiences", trait: "empathy", value: 3 },
    ],
  },
  {
    question: "When a friend needs advice, you…",
    options: [
      { text: "Ask questions and listen first", trait: "empathy", value: 3 },
      { text: "Offer practical next steps", trait: "communication", value: 2 },
      { text: "Share a similar experience", trait: "openness", value: 2 },
      { text: "Help them try a different approach", trait: "adventure", value: 2 },
    ],
  },
  {
    question: "What would make a friendship fulfilling?",
    options: [
      { text: "Feeling safe to be myself", trait: "openness", value: 3 },
      { text: "Showing up for each other", trait: "empathy", value: 3 },
      { text: "Sharing new adventures", trait: "adventure", value: 3 },
      { text: "Laughing and staying connected", trait: "communication", value: 3 },
    ],
  },
];

const interestOptions = [
  "Music", "Movies", "Web series", "Anime", "K-pop", "Bollywood",
  "Memes", "YouTube", "Gaming", "Reading", "Cafés", "Food hunting",
  "Late-night talks", "College events", "Shopping", "Hostel life",
  "Study sessions", "Procrastinating", "Random walks", "Sleep",
  "Photography", "Dancing", "Singing", "Drawing", "Writing", "Cooking",
  "Fitness", "Badminton", "Cricket", "Football", "Travel",
  "Exploring new places", "Deep conversations", "Gossip", "Dark humour",
  "Dry humour", "Trying new things", "Small friend groups",
  "Big friend groups", "Spontaneous plans", "One-on-one hangouts",
  "Being a listener",
];

const traitOrder: Trait[] = [
  "social",
  "communication",
  "openness",
  "empathy",
  "adventure",
];

function calculateTraits(answers: number[]): number[] {
  const totals = [5, 5, 5, 5, 5];

  answers.forEach((answerIndex, questionIndex) => {
    const selectedOption = questions[questionIndex].options[answerIndex];
    const traitIndex = traitOrder.indexOf(selectedOption.trait);
    totals[traitIndex] += selectedOption.value;
  });

  return totals.map((score) => Math.min(10, Math.max(1, score)));
}

export default function Onboarding({
  onComplete,
  onBack,
  initialProfile,
}: {
  onComplete: (profile: CompletedProfile) => void;
  onBack: () => void;
  initialProfile?: StudentProfile | null;
}) {
  const [stage, setStage] = useState<"signup" | "quiz" | "saving">("signup");

  const [profile, setProfile] = useState<Profile>(() => ({
  name: initialProfile?.name ?? "",
  age: initialProfile?.age != null ? String(initialProfile.age) : "",
  college: initialProfile?.college ?? "Karunya University",
  course: initialProfile?.course ?? "",
  interests: initialProfile?.interests ?? [],
  goal: initialProfile?.goal ?? "Close friends",
}));

const isEditing = initialProfile != null;
  const [photoName, setPhotoName] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [error, setError] = useState("");

  function toggleInterest(interest: string) {
    setProfile((current) => ({
      ...current,
      interests: current.interests.includes(interest)
        ? current.interests.filter((item) => item !== interest)
        : [...current.interests, interest],
    }));
  }

  async function saveProfile(completedProfile: Profile & { traits: number[] }) {
    setError("");

    const firebaseUser = auth.currentUser;

    if (!firebaseUser) {
      setError("Please sign in before saving your profile.");
      setStage("signup");
      return;
    }

    if (photoFile) {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

      if (!allowedTypes.includes(photoFile.type)) {
        setError("Please choose a JPEG, PNG, or WebP image.");
        setStage("signup");
        return;
      }

      if (photoFile.size > 5 * 1024 * 1024) {
        setError("Your profile photo must be 5 MB or smaller.");
        setStage("signup");
        return;
      }
    }

    try {
      // Update the existing profile without changing its ID or personality traits.
      if (isEditing && initialProfile?.id != null) {
        await updateProfile({
          id: initialProfile.id,
          firebase_uid: firebaseUser.uid,
          name: completedProfile.name.trim(),
          age: Number(completedProfile.age),
          college: completedProfile.college.trim(),
          course: completedProfile.course.trim(),
          goal: completedProfile.goal,
          traits: initialProfile.traits,
          interests: completedProfile.interests,
          photo: photoFile,
        });

        onComplete({
          ...completedProfile,
          name: completedProfile.name.trim(),
          traits: initialProfile.traits,
          id: initialProfile.id,
        });
        return;
      }

      // Create a new profile for first-time users.
      const formData = new FormData();

      formData.append("firebase_uid", firebaseUser.uid);
      formData.append("name", completedProfile.name.trim());
      formData.append("age", completedProfile.age);
      formData.append("college", completedProfile.college.trim());
      formData.append("course", completedProfile.course.trim());
      formData.append("goal", completedProfile.goal);
      formData.append("traits", JSON.stringify(completedProfile.traits));
      formData.append("interests", JSON.stringify(completedProfile.interests));

      if (photoFile) {
        formData.append("photo", photoFile);
      }

      const response = await fetch("http://127.0.0.1:8000/profiles", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Could not save your profile.",
        );
      }

      onComplete({
        ...completedProfile,
        name: completedProfile.name.trim(),
        id: data.id,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not connect to Fribbet. Check that the backend is running.",
      );

      if (isEditing) {
        setStage("signup");
      } else {
        setAnswers((current) => current.slice(0, -1));
        setStage("quiz");
      }
    }
  }

  if (stage === "saving") {
    return (
      <main className="onboarding-shell">
        <div className="onboarding-card">
          <div className="onboarding-brand">fribbet<span>.</span></div>
          <p className="eyebrow">ONE LITTLE MOMENT</p>
          <h1>
            {isEditing ? "Updating your" : "Finding your"}
            <br />
            <em>{isEditing ? "little space." : "kind of people."}</em>
          </h1>
          <p className="onboarding-description">
            {isEditing
              ? "Saving your changes…"
              : "Saving your profile and personality vibe…"}
          </p>
          {error && <p className="form-error">{error}</p>}
        </div>
      </main>
    );
  }

  if (stage === "quiz") {
    const current = answers.length;
    const question = questions[current];

    return (
      <main className="onboarding-shell">
        <button
          className="back-link"
          onClick={() => {
            if (current === 0) {
              setStage("signup");
            } else {
              setAnswers((previous) => previous.slice(0, -1));
            }
            setError("");
          }}
        >
          ← Back
        </button>

        <div className="onboarding-card">
          <div className="onboarding-brand">fribbet<span>.</span></div>
          <p className="eyebrow">THE LITTLE VIBE CHECK</p>

          <div className="progress-track">
            <div style={{ width: `${(current / questions.length) * 100}%` }} />
          </div>

          <p className="quiz-count">
            QUESTION {current + 1} OF {questions.length}
          </p>

          <h1 className="quiz-question">{question.question}</h1>

          <div className="quiz-options">
            {question.options.map((option, index) => (
              <button
                key={option.text}
                className="quiz-option"
                onClick={() => {
                  const nextAnswers = [...answers, index];
                  setAnswers(nextAnswers);
                  setError("");

                  if (nextAnswers.length === questions.length) {
                    setStage("saving");
                    void saveProfile({
                      ...profile,
                      traits: calculateTraits(nextAnswers),
                    });
                  }
                }}
              >
                <span>{String.fromCharCode(65 + index)}</span>
                {option.text}
                <span className="option-arrow">↗</span>
              </button>
            ))}
          </div>

          {error && <p className="form-error">{error}</p>}
          <p className="quiz-note">No right answers. Just you, being you.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="onboarding-shell">
      <button className="back-link" onClick={onBack}>
        ← Back to discover
      </button>

      <form
        className="onboarding-card"
        onSubmit={(event) => {
          event.preventDefault();

          if (profile.interests.length < 3) {
            setError("Choose at least 3 interests to help us find your people.");
            return;
          }

          setError("");
          if (isEditing && initialProfile) {
  setError("");
  setStage("saving");

  void saveProfile({
              ...profile,
              traits: initialProfile.traits,
            });

  return;
}
          setAnswers([]);
          setStage("quiz");
        }}
      >
        <div className="onboarding-brand">fribbet<span>.</span></div>
        <p className="eyebrow">YOUR PEOPLE ARE OUT THERE</p>
        <h1>
          First, a little
          <br />
          <em>about you.</em>
        </h1>
        <p className="onboarding-description">
          Let's make your corner of Fribbet feel like you.
        </p>

        <label className="photo-upload">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              setPhotoFile(file);
              setPhotoName(file?.name ?? "");
              setError("");
            }}
          />
          <span className="photo-icon">+</span>
          <span>{photoName || "Add a profile photo (optional)"}</span>
        </label>

        <div className="form-grid">
          <label>
            Your name
            <input
              required
              maxLength={40}
              value={profile.name}
              onChange={(event) =>
                setProfile({ ...profile, name: event.target.value })
              }
              placeholder="What should we call you?"
            />
          </label>

          <label>
            Age
            <input
              required
              type="number"
              min="16"
              max="100"
              value={profile.age}
              onChange={(event) =>
                setProfile({ ...profile, age: event.target.value })
              }
              placeholder="18"
            />
          </label>

          <label className="full-field">
            College / university
            <input
              required
              maxLength={200}
              value={profile.college}
              onChange={(event) =>
                setProfile({ ...profile, college: event.target.value })
              }
            />
          </label>

          <label className="full-field">
            Course / year
            <input
              required
              maxLength={150}
              value={profile.course}
              onChange={(event) =>
                setProfile({ ...profile, course: event.target.value })
              }
              placeholder="CSE · Year 1"
            />
          </label>

          <label className="full-field">
            What kind of connections are you looking for?
            <select
              value={profile.goal}
              onChange={(event) =>
                setProfile({ ...profile, goal: event.target.value })
              }
            >
              <option>Close friends</option>
              <option>People with similar interests</option>
              <option>Study buddies</option>
              <option>Activity partners</option>
              <option>Expand my social circle</option>
            </select>
          </label>
        </div>

        <div className="form-section">
          <p className="form-label">WHAT DO YOU LOVE?</p>
          <p className="form-hint">Pick at least 3. Pick as many as you like.</p>

          <div className="interest-picker">
            {interestOptions.map((interest) => (
              <button
                type="button"
                key={interest}
                className={
                  profile.interests.includes(interest)
                    ? "interest-choice selected"
                    : "interest-choice"
                }
                onClick={() => toggleInterest(interest)}
              >
                {interest}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        <button className="primary-button" type="submit">
          {isEditing ? "Save changes →" : "Find my vibe →"}
        </button>
      </form>
    </main>
  );
}
