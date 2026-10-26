
const API_URL = "http://127.0.0.1:8000";

export type StudentProfile = {
  id: number;
  name: string;
  age?: number;
  college?: string;
  course?: string;
  traits: number[];
  interests: string[];
  goal: string;
  has_profile_picture?: boolean;
  firebase_uid?: string;
};

export type Recommendation = {
  candidate_id: number;
  name: string;
  compatibility: number;
  trait_score: number;
  interest_score: number;
  goal_score: number;
  shared_interests: string[];
  reasons: string[];
};

export type SavedProfile = StudentProfile;

export async function getProfiles(): Promise<SavedProfile[]> {
  const response = await fetch(`${API_URL}/profiles`);

  if (!response.ok) {
    throw new Error(`Could not load profiles: ${response.status}`);
  }

  return (await response.json()) as SavedProfile[];
}

export async function getRecommendations(
  user: StudentProfile,
  candidates: StudentProfile[],
): Promise<Recommendation[]> {
  const response = await fetch(`${API_URL}/recommend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user, candidates }),
  });

  if (!response.ok) {
    throw new Error(`Recommendation request failed: ${response.status}`);
  }

  return (await response.json()) as Recommendation[];
}

export function getProfilePictureUrl(profileId: number): string {
  return `${API_URL}/profiles/${profileId}/picture`;
}

export type UpdateProfileData = {
  id: number;
  firebase_uid: string;
  name: string;
  age: number;
  college: string;
  course: string;
  goal: string;
  traits: number[];
  interests: string[];
  photo?: File | null;
};

export async function updateProfile(
  profile: UpdateProfileData,
): Promise<{ id: number; message: string }> {
  const formData = new FormData();

  formData.append("firebase_uid", profile.firebase_uid);
  formData.append("name", profile.name.trim());
  formData.append("age", String(profile.age));
  formData.append("college", profile.college.trim());
  formData.append("course", profile.course.trim());
  formData.append("goal", profile.goal);
  formData.append("traits", JSON.stringify(profile.traits));
  formData.append("interests", JSON.stringify(profile.interests));

  if (profile.photo) {
    formData.append("photo", profile.photo);
  }

  const response = await fetch(`${API_URL}/profiles/${profile.id}`, {
    method: "PUT",
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : "Could not update your profile.",
    );
  }

  return data as { id: number; message: string };
}


export async function sendLike(likerId: number, likedId: number): Promise<{ liked: boolean; matched: boolean }> {
  const response = await fetch(`${API_URL}/likes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ liker_id: likerId, liked_id: likedId }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Could not save like.");
  return data as { liked: boolean; matched: boolean };
}

export async function getLikes(profileId: number): Promise<SavedProfile[]> {
  const response = await fetch(`${API_URL}/likes/${profileId}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Could not load likes.");
  return data as SavedProfile[];
}

export async function getMatches(profileId: number): Promise<SavedProfile[]> {
  const response = await fetch(`${API_URL}/matches/${profileId}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Could not load matches.");
  return data as SavedProfile[];
}
