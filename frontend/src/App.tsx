import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signOut,
  type User,
} from "firebase/auth";

import { auth } from "./firebase";
import AuthPage from "./AuthPage";
import Onboarding from "./Onboarding";
import "./App.css";

import {
  getProfiles,
  getProfilePictureUrl,
  getRecommendations,
  getLikes,
  getMatches,
  sendLike,
  type Recommendation,
  type StudentProfile,
  type SavedProfile,
} from "./api";

type Person = SavedProfile & {
  compatibility: number;
  color: string;
  reasons: string[];
  sharedInterests: string[];
};

const CARD_COLORS = [
  "#e7e9ce",
  "#f2dfec",
  "#dce9f5",
  "#f5e8cf",
  "#e5def3",
];

function Frog() {
  return (
    <svg
      viewBox="0 0 100 82"
      aria-label="Fribbet frog mascot"
      role="img"
    >
      <ellipse
        cx="50"
        cy="48"
        rx="37"
        ry="31"
        fill="#a8c99a"
        stroke="#283d30"
        strokeWidth="2.5"
      />
      <circle
        cx="32"
        cy="22"
        r="13"
        fill="#a8c99a"
        stroke="#283d30"
        strokeWidth="2.5"
      />
      <circle
        cx="68"
        cy="22"
        r="13"
        fill="#a8c99a"
        stroke="#283d30"
        strokeWidth="2.5"
      />
      <circle cx="33" cy="23" r="4" fill="#283d30" />
      <circle cx="67" cy="23" r="4" fill="#283d30" />
      <path
        d="M35 51 Q50 64 65 51"
        fill="none"
        stroke="#283d30"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="24" cy="44" r="5" fill="#e9a8a5" opacity=".8" />
      <circle cx="76" cy="44" r="5" fill="#e9a8a5" opacity=".8" />
    </svg>
  );
}

function RadarChart({ traits }: { traits: number[] }) {
  const labels = ["Social", "Talk", "Open", "Empathy", "Adventure"];
  const cx = 120;
  const cy = 110;
  const radius = 76;

  const safeTraits = Array.from({ length: 5 }, (_, i) =>
    Math.max(1, Math.min(10, Number(traits?.[i] ?? 5))),
  );

  const point = (i: number, value: number) => {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;

    return `${cx + (Math.cos(angle) * radius * value) / 10},${
      cy + (Math.sin(angle) * radius * value) / 10
    }`;
  };

  return (
    <svg
      viewBox="0 0 240 230"
      className="radar"
      role="img"
      aria-label="Five personality trait radar chart"
    >
      {[2, 4, 6, 8, 10].map((level) => (
        <polygon
          key={level}
          points={labels.map((_, i) => point(i, level)).join(" ")}
          fill="none"
          stroke="#d9dfd2"
          strokeWidth="1"
        />
      ))}

      {labels.map((label, i) => {
        const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        const [x, y] = point(i, 10).split(",");

        return (
          <g key={label}>
            <line
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="#d9dfd2"
            />
            <text
              x={cx + Math.cos(angle) * 96}
              y={cy + Math.sin(angle) * 96}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="10"
              fill="#526456"
            >
              {label}
            </text>
          </g>
        );
      })}

      <polygon
        points={safeTraits.map((value, i) => point(i, value)).join(" ")}
        fill="#a8c99a"
        fillOpacity=".5"
        stroke="#527b4b"
        strokeWidth="2"
      />

      {safeTraits.map((value, i) => {
        const [x, y] = point(i, value).split(",");

        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="3"
            fill="#527b4b"
          />
        );
      })}
    </svg>
  );
}

function ProfileVisual({ person }: { person: Person }) {
  const [photoFailed, setPhotoFailed] = useState(false);

  const hasPhoto =
    Boolean(person.has_profile_picture) && !photoFailed;

  return (
    <div
      className="profile-visual"
      style={{
        background: person.color,
        position: "relative",
      }}
    >
      {hasPhoto ? (
        <img
          src={getProfilePictureUrl(person.id)}
          alt={`${person.name}'s profile`}
          onError={() => setPhotoFailed(true)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        <div className="avatar-placeholder">
          <span>{person.name.charAt(0).toUpperCase()}</span>
          <span className="avatar-sparkle">✳</span>
        </div>
      )}

      <div className="visual-caption">
        {person.college || "a little bit of their world"}
      </div>
    </div>
  );
}

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [rankedPeople, setRankedPeople] = useState<Person[]>([]);
  const [currentUser, setCurrentUser] =
    useState<StudentProfile | null>(null);

  const [index, setIndex] = useState(0);
  const [apiError, setApiError] = useState("");
  const [apiLoading, setApiLoading] = useState(true);

  const [liked, setLiked] = useState<number[]>([]);
  const [skipped, setSkipped] = useState<number[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [section, setSection] = useState<"discover" | "likes" | "matches">("discover");
  const [likedProfiles, setLikedProfiles] = useState<SavedProfile[]>([]);
  const [matchedProfiles, setMatchedProfiles] = useState<SavedProfile[]>([]);
  const [actionError, setActionError] = useState("");

  async function loadMyProfile(user: User) {
    setApiLoading(true);
    setApiError("");

    try {
      const savedProfiles = await getProfiles();

      // Only load the profile belonging to this Firebase account.
      const mine = savedProfiles.find(
        (profile) => profile.firebase_uid === user.uid,
      );

      if (!mine) {
        setCurrentUser(null);
        setRankedPeople([]);
        setShowOnboarding(true);
        return;
      }

      const myProfile: StudentProfile = {
        id: mine.id,
        name: mine.name,
        age: mine.age,
        college: mine.college,
        course: mine.course,
        traits: mine.traits,
        interests: mine.interests,
        goal: mine.goal,
        has_profile_picture: mine.has_profile_picture,
        firebase_uid: mine.firebase_uid,
      };

      setCurrentUser(myProfile);
      setShowOnboarding(false);
      const [savedLikes, savedMatches] = await Promise.all([
        getLikes(mine.id),
        getMatches(mine.id),
      ]);
      setLikedProfiles(savedLikes);
      setMatchedProfiles(savedMatches);

      const candidates = savedProfiles.filter(
        (profile) =>
          profile.id !== mine.id &&
          profile.firebase_uid !== user.uid,
      );

      if (candidates.length === 0) {
        setRankedPeople([]);
        setIndex(0);
        setApiError(
          "Your profile is ready! More people will appear when other profiles join.",
        );
        return;
      }

      const recommendations: Recommendation[] =
        await getRecommendations(
          {
            id: mine.id,
            name: mine.name,
            traits: mine.traits,
            interests: mine.interests,
            goal: mine.goal,
          },
          candidates.map((candidate) => ({
            id: candidate.id,
            name: candidate.name,
            traits: candidate.traits,
            interests: candidate.interests,
            goal: candidate.goal,
          })),
        );

      const profilesById = new Map(
        candidates.map((candidate) => [candidate.id, candidate]),
      );

      const orderedPeople: Person[] = recommendations.flatMap(
        (recommendation, personIndex) => {
          const savedPerson = profilesById.get(
            recommendation.candidate_id,
          );

          if (!savedPerson) return [];

          return [
            {
              ...savedPerson,
              compatibility: recommendation.compatibility,
              reasons: recommendation.reasons ?? [],
              sharedInterests:
                recommendation.shared_interests ?? [],
              color:
                CARD_COLORS[personIndex % CARD_COLORS.length],
            },
          ];
        },
      );

      setRankedPeople(orderedPeople);
      setIndex(0);
      setApiError("");
    } catch (error) {
      console.error("Fribbet API error:", error);

      setRankedPeople([]);
      setApiError(
        "Could not load profiles. Make sure the backend is running and refresh the page.",
      );
    } finally {
      setApiLoading(false);
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);

      if (user) {
        void loadMyProfile(user);
      } else {
        setCurrentUser(null);
        setRankedPeople([]);
        setApiError("");
        setApiLoading(false);
        setShowOnboarding(false);
        setLiked([]);
        setSkipped([]);
        setLikedProfiles([]);
        setMatchedProfiles([]);
        setSection("discover");
      }
    });

    return unsubscribe;
  }, []);

  const visiblePeople = rankedPeople.filter(
    (person) => !likedProfiles.some((item) => item.id === person.id) && !skipped.includes(person.id),
  );

  const person = visiblePeople[index];

  async function vote(isLike: boolean) {
    if (!person) return;
    setActionError("");
    if (isLike) {
      if (!currentUser) return;
      try {
        const result = await sendLike(currentUser.id, person.id);
        setLikedProfiles((previous) => previous.some((item) => item.id === person.id) ? previous : [...previous, person]);
        setLiked((previous) => previous.includes(person.id) ? previous : [...previous, person.id]);
        if (result.matched) {
          const refreshed = await getMatches(currentUser.id);
          setMatchedProfiles(refreshed);
        }
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Could not save your like.");
        return;
      }
    } else {
      setSkipped((previous) => previous.includes(person.id) ? previous : [...previous, person.id]);
    }
    setIndex(0);
  }

  function handleCardMouseMove(
    event: React.MouseEvent<HTMLElement>,
  ) {
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();

    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    card.style.setProperty("--tilt-x", `${(0.5 - y) * 5}deg`);
    card.style.setProperty("--tilt-y", `${(x - 0.5) * 5}deg`);
  }

  function resetCardTilt(
    event: React.MouseEvent<HTMLElement>,
  ) {
    event.currentTarget.style.setProperty("--tilt-x", "0deg");
    event.currentTarget.style.setProperty("--tilt-y", "0deg");
  }

  if (!authReady) {
    return (
      <main className="auth-page">
        <p>Getting Fribbet ready...</p>
      </main>
    );
  }

  if (!firebaseUser) {
    return <AuthPage onSuccess={() => {}} />;
  }

  if (showOnboarding) {
    return (

<Onboarding
  initialProfile={currentUser}
  onBack={() => {
    if (!currentUser) {
      setApiError("Create your profile to start discovering people.");
      return;
    }

    setShowOnboarding(false);
  }}
  onComplete={() => {
    setShowOnboarding(false);
    void loadMyProfile(firebaseUser);
  }}
/>

    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Fribbet home">
          <span className="frog-mark">
            <Frog />
          </span>

          <span>
            fribbet<span className="brand-dot">.</span>
          </span>
        </a>

        <span className="tagline">
          find your kind of people
        </span>

        <button
          className="profile-button"
          onClick={() => setShowOnboarding(true)}
        >
          your space ↗
        </button>

        <button
          className="profile-button"
          onClick={() => {
            void signOut(auth).catch((error) => {
              console.error("Could not sign out:", error);
            });
          }}
        >
          Sign out
        </button>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <p className="eyebrow">YOUR LITTLE CORNER</p>

          <button type="button" className={`nav-item ${section === "discover" ? "active" : ""}`} onClick={() => setSection("discover")}>
            ✳ &nbsp; Discover
          </button>

          <button type="button" className={`nav-item ${section === "likes" ? "active" : ""}`} onClick={() => setSection("likes")}>
            ♡ &nbsp; Likes <span>{likedProfiles.length}</span>
          </button>

          <button type="button" className={`nav-item ${section === "matches" ? "active" : ""}`} onClick={() => setSection("matches")}>
            ☻ &nbsp; Matches <span>{matchedProfiles.length}</span>
          </button>

          <div className="nav-item">
            ☷ &nbsp; Messages
          </div>

          <div className="sidebar-note">
            <Frog />

            <p>
              Good friendships start with being yourself.
            </p>

            <span>ribbit, ribbit.</span>
          </div>

          <div className="privacy-note">
            A little space to find your people.
            <br />
            Be kind. Be you.
          </div>
        </aside>

        <section className="discover">
          {section !== "discover" ? (
            <div className="saved-section">
              <p className="eyebrow">YOUR LITTLE CORNER</p>
              <h1>{section === "likes" ? "People you like" : "Your matches"}</h1>
              <p>{section === "likes" ? "The people you’ve liked, saved for later." : "It’s a match when you both like each other."}</p>
              {actionError && <p className="form-error" role="alert">{actionError}</p>}
              {(section === "likes" ? likedProfiles : matchedProfiles).length === 0 ? (
                <div className="empty-state"><h2>{section === "likes" ? "No likes yet" : "No matches yet"}</h2><p>{section === "likes" ? "Head to Discover and like someone whose vibe you like." : "Keep discovering people. Mutual likes will show up here."}</p><button type="button" className="profile-button" onClick={() => setSection("discover")}>Explore people</button></div>
              ) : (
                <div className="saved-grid">
                  {(section === "likes" ? likedProfiles : matchedProfiles).map((saved) => (
                    <article className="saved-card" key={saved.id}>
                      {saved.has_profile_picture ? <img src={getProfilePictureUrl(saved.id)} alt={`${saved.name}'s profile`} /> : <div className="saved-avatar">{saved.name.charAt(0).toUpperCase()}</div>}
                      <div><h3>{saved.name}{saved.age ? `, ${saved.age}` : ""}</h3><p>{saved.college || "A Fribbet member"}</p><p>{saved.interests?.slice(0, 3).join(" · ")}</p></div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          ) : <>

          <div className="section-heading">
            <div>
              <p className="eyebrow">
                YOUR NEXT FAVOURITE HUMAN?
              </p>

              <h1>
                People who <em>get you.</em>
              </h1>

              <p className="subheading">
                Thoughtful matches, not just random swipes.
                {currentUser
                  ? ` Welcome, ${currentUser.name}.`
                  : ""}
              </p>
            </div>

            <span className="counter">
              {visiblePeople.length === 0 ? 0 : index + 1}
              {" "}/ {visiblePeople.length}
            </span>
          </div>

          {apiLoading && (
            <p>Finding your people...</p>
          )}

          {apiError && (
            <p className="form-error">{apiError}</p>
          )}

          {!apiLoading && !apiError && person && (
            <div className="profile-card-wrapper">
              <article
                className="profile-card"
                onMouseMove={handleCardMouseMove}
                onMouseLeave={resetCardTilt}
              >
                <ProfileVisual person={person} />

                <div className="profile-details">
                  <div className="name-row">
                    <div>
                      <h2>
                        {person.name}
                        {person.age ? `, ${person.age}` : ""}
                      </h2>

                      <p>
                        {person.college || "College not provided"}
                      </p>

                      <p>
                        {person.course || "Course not provided"}
                      </p>
                    </div>

                    <div className="match-score">
                      {Math.round(person.compatibility)}%
                      <small>compatibility</small>
                    </div>
                  </div>

                  <p className="bio">
                    {person.goal
                      ? `Looking for: ${person.goal}.`
                      : "A little bit of their world."}
                  </p>

                  <p className="mini-label">
                    THINGS THEY'RE INTO
                  </p>

                  <div className="interest-list">
                    {person.interests.map((interest) => (
                      <span key={interest}>
                        {interest}
                      </span>
                    ))}
                  </div>

                  {person.sharedInterests.length > 0 && (
                    <div className="match-reason">
                      <span>✳</span>

                      <p>
                        <strong>You have things in common.</strong>
                        {" "}You both like{" "}
                        {person.sharedInterests.join(", ")}.
                      </p>
                    </div>
                  )}

                  <div className="traits-heading">
                    <div>
                      <p className="mini-label">
                        THEIR PERSONALITY
                      </p>

                      <p className="trait-caption">
                        A little glimpse into who they are.
                      </p>
                    </div>

                    <span className="scale-label">
                      SCALE: 1–10
                    </span>
                  </div>

                  <RadarChart traits={person.traits} />

                  {person.reasons.length > 0 && (
                    <div className="match-reason">
                      <span>✳</span>

                      <p>
                        <strong>Why you might click</strong>
                        <br />
                        {person.reasons.join(" ")}
                      </p>
                    </div>
                  )}

                  <div className="actions">
                    <button
                      className="skip-button"
                      onClick={() => vote(false)}
                    >
                      Pass <span>↗</span>
                    </button>

                    <button
                      className="like-button"
                      onClick={() => vote(true)}
                    >
                      Like <span>♡</span>
                    </button>
                  </div>

                  <p className="demo-footnote">
                    Good friendships start one conversation at a time.
                  </p>
                </div>
              </article>
            </div>
          )}

          {!apiLoading && !apiError && !person && (
            <p>
              You've seen everyone for now. Check back when more
              people join.
            </p>
          )}
          </>}
        </section>
      </div>
    </main>
  );
}