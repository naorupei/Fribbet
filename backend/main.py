import os
import json
from contextlib import asynccontextmanager

import psycopg
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field

from recommendation import recommend

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
MAX_IMAGE_SIZE = 5 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


def get_connection():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is missing from .env")
    return psycopg.connect(DATABASE_URL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    yield


app = FastAPI(
    title="Fribbet AI API",
    description="Friendship compatibility and recommendation engine",
    version="0.3.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class StudentProfile(BaseModel):
    id: int
    name: str
    traits: list[int] = Field(min_length=5, max_length=5)
    interests: list[str]
    goal: str


class RecommendationRequest(BaseModel):
    user: StudentProfile
    candidates: list[StudentProfile]


@app.get("/")
def home():
    return {
        "app": "Fribbet",
        "status": "running",
        "message": "Friendship recommendation engine is coming to life!",
    }


@app.get("/health")
def health():
    try:
        with get_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
        return {"status": "healthy", "database": "connected"}
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Database connection failed",
        )


@app.post("/recommend")
def get_recommendations(request: RecommendationRequest):
    return recommend(
        request.user.model_dump(),
        [candidate.model_dump() for candidate in request.candidates],
    )


@app.post("/profiles")
async def create_profile(
    name: str = Form(...),
    age: int = Form(...),
    college: str = Form(...),
    course: str = Form(...),
    goal: str = Form(...),
    traits: str = Form(...),
    interests: str = Form(...),
    photo: UploadFile | None = File(default=None),
    firebase_uid: str = Form(...),
):
    firebase_uid = firebase_uid.strip()

    if not firebase_uid:
        raise HTTPException(
            status_code=400,
            detail="Firebase user ID is required.",
        )

    name = name.strip()
    college = college.strip()
    course = course.strip()
    goal = goal.strip()

    if not name or not college or not course or not goal:
        raise HTTPException(
            status_code=422,
            detail="Required fields cannot be blank",
        )

    if age < 16 or age > 100:
        raise HTTPException(
            status_code=422,
            detail="Age must be between 16 and 100",
        )

    try:
        trait_values = json.loads(traits)
        interest_values = json.loads(interests)

        if (
            not isinstance(trait_values, list)
            or len(trait_values) != 5
            or any(
                type(value) is not int or not 1 <= value <= 10
                for value in trait_values
            )
        ):
            raise ValueError("Traits must contain five integers from 1 to 10")

        if (
            not isinstance(interest_values, list)
            or any(
                not isinstance(value, str) or not value.strip()
                for value in interest_values
            )
        ):
            raise ValueError("Interests must be non-empty strings")

        interest_values = list(
            dict.fromkeys(value.strip() for value in interest_values)
        )

    except (ValueError, TypeError):
        raise HTTPException(
            status_code=422,
            detail="Invalid traits or interests format",
        )

    photo_bytes = None
    photo_mime_type = None

    if photo is not None:
        photo_mime_type = photo.content_type

        if photo_mime_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=415,
                detail="Upload a JPEG, PNG, or WebP image",
            )

        photo_bytes = await photo.read(MAX_IMAGE_SIZE + 1)

        if len(photo_bytes) > MAX_IMAGE_SIZE:
            raise HTTPException(
                status_code=413,
                detail="Profile picture must be 5 MB or smaller",
            )

        if not photo_bytes:
            raise HTTPException(
                status_code=400,
                detail="Uploaded image is empty",
            )

    try:
        with get_connection() as connection:
            with connection.cursor() as cursor:
                # Prevent accidental duplicate profiles for one account.
                cursor.execute(
                    "SELECT id FROM profiles WHERE firebase_uid = %s",
                    (firebase_uid,),
                )
                existing = cursor.fetchone()

                if existing:
                    raise HTTPException(
                        status_code=409,
                        detail="A profile already exists for this account.",
                    )

                cursor.execute(
                    """
                    INSERT INTO profiles
                        (name, age, college, course, goal,
                         profile_picture, picture_mime_type, firebase_uid)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (
                        name,
                        age,
                        college,
                        course,
                        goal,
                        photo_bytes,
                        photo_mime_type,
                        firebase_uid,
                    ),
                )
                profile_id = cursor.fetchone()[0]

                cursor.execute(
                    """
                    INSERT INTO personality_traits
                        (profile_id, social_energy, communication,
                         openness, empathy, adventure)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (profile_id, *trait_values),
                )

                for interest in interest_values:
                    cursor.execute(
                        """
                        INSERT INTO interests (name)
                        VALUES (%s)
                        ON CONFLICT (name) DO NOTHING
                        """,
                        (interest,),
                    )

                    cursor.execute(
                        "SELECT id FROM interests WHERE name = %s",
                        (interest,),
                    )
                    interest_id = cursor.fetchone()[0]

                    cursor.execute(
                        """
                        INSERT INTO profile_interests
                            (profile_id, interest_id)
                        VALUES (%s, %s)
                        ON CONFLICT DO NOTHING
                        """,
                        (profile_id, interest_id),
                    )

        return {
            "id": profile_id,
            "name": name,
            "message": "Profile created successfully",
            "has_profile_picture": photo_bytes is not None,
        }

    except HTTPException:
        raise
    except psycopg.Error:
        raise HTTPException(
            status_code=500,
            detail="Could not save the profile to the database",
        )


@app.put("/profiles/{profile_id}")
async def update_profile(
    profile_id: int,
    name: str = Form(...),
    age: int = Form(...),
    college: str = Form(...),
    course: str = Form(...),
    goal: str = Form(...),
    traits: str = Form(...),
    interests: str = Form(...),
    firebase_uid: str = Form(...),
    photo: UploadFile | None = File(default=None),
):
    firebase_uid = firebase_uid.strip()
    name = name.strip()
    college = college.strip()
    course = course.strip()
    goal = goal.strip()

    if not firebase_uid:
        raise HTTPException(status_code=400, detail="Firebase user ID is required.")

    if not name or not college or not course or not goal:
        raise HTTPException(status_code=422, detail="Required fields cannot be blank.")

    if age < 16 or age > 100:
        raise HTTPException(status_code=422, detail="Age must be between 16 and 100.")

    try:
        trait_values = json.loads(traits)
        interest_values = json.loads(interests)

        if (
            not isinstance(trait_values, list)
            or len(trait_values) != 5
            or any(type(value) is not int or not 1 <= value <= 10 for value in trait_values)
        ):
            raise ValueError()

        if (
            not isinstance(interest_values, list)
            or any(not isinstance(value, str) or not value.strip() for value in interest_values)
        ):
            raise ValueError()

        interest_values = list(dict.fromkeys(value.strip() for value in interest_values))

    except (ValueError, TypeError):
        raise HTTPException(status_code=422, detail="Invalid traits or interests format.")

    photo_bytes = None
    photo_mime_type = None

    if photo is not None:
        photo_mime_type = photo.content_type

        if photo_mime_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(status_code=415, detail="Upload a JPEG, PNG, or WebP image.")

        photo_bytes = await photo.read(MAX_IMAGE_SIZE + 1)

        if not photo_bytes:
            raise HTTPException(status_code=400, detail="Uploaded image is empty.")

        if len(photo_bytes) > MAX_IMAGE_SIZE:
            raise HTTPException(status_code=413, detail="Profile picture must be 5 MB or smaller.")

    try:
        with get_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT id FROM profiles WHERE id = %s AND firebase_uid = %s",
                    (profile_id, firebase_uid),
                )

                if cursor.fetchone() is None:
                    raise HTTPException(
                        status_code=404,
                        detail="Profile not found for this account.",
                    )

                if photo_bytes is not None:
                    cursor.execute(
                        """
                        UPDATE profiles
                        SET name = %s, age = %s, college = %s, course = %s,
                            goal = %s, profile_picture = %s, picture_mime_type = %s
                        WHERE id = %s AND firebase_uid = %s
                        """,
                        (
                            name, age, college, course, goal,
                            photo_bytes, photo_mime_type, profile_id, firebase_uid,
                        ),
                    )
                else:
                    cursor.execute(
                        """
                        UPDATE profiles
                        SET name = %s, age = %s, college = %s, course = %s, goal = %s
                        WHERE id = %s AND firebase_uid = %s
                        """,
                        (name, age, college, course, goal, profile_id, firebase_uid),
                    )

                cursor.execute(
                    """
                    UPDATE personality_traits
                    SET social_energy = %s, communication = %s, openness = %s,
                        empathy = %s, adventure = %s
                    WHERE profile_id = %s
                    """,
                    (*trait_values, profile_id),
                )

                cursor.execute(
                    "DELETE FROM profile_interests WHERE profile_id = %s",
                    (profile_id,),
                )

                for interest in interest_values:
                    cursor.execute(
                        """
                        INSERT INTO interests (name)
                        VALUES (%s)
                        ON CONFLICT (name) DO NOTHING
                        """,
                        (interest,),
                    )

                    cursor.execute(
                        "SELECT id FROM interests WHERE name = %s",
                        (interest,),
                    )
                    interest_id = cursor.fetchone()[0]

                    cursor.execute(
                        """
                        INSERT INTO profile_interests (profile_id, interest_id)
                        VALUES (%s, %s)
                        ON CONFLICT DO NOTHING
                        """,
                        (profile_id, interest_id),
                    )

        return {"id": profile_id, "message": "Profile updated successfully"}

    except HTTPException:
        raise
    except psycopg.Error:
        raise HTTPException(
            status_code=500,
            detail="Could not update the profile in the database.",
        )

@app.get("/profiles")
def list_profiles():
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT p.id, p.name, p.age, p.college, p.course, p.goal,
                       t.social_energy, t.communication, t.openness,
                       t.empathy, t.adventure, p.firebase_uid,
                       (p.profile_picture IS NOT NULL)
                FROM profiles p
                JOIN personality_traits t ON t.profile_id = p.id
                ORDER BY p.id
                """
            )
            rows = cursor.fetchall()

            profiles = []

            for row in rows:
                profile_id = row[0]

                cursor.execute(
                    """
                    SELECT i.name
                    FROM profile_interests pi
                    JOIN interests i ON i.id = pi.interest_id
                    WHERE pi.profile_id = %s
                    ORDER BY i.name
                    """,
                    (profile_id,),
                )
                interest_rows = cursor.fetchall()

                profiles.append(
                    {
                        "id": row[0],
                        "name": row[1],
                        "age": row[2],
                        "college": row[3],
                        "course": row[4],
                        "goal": row[5],
                        "traits": list(row[6:11]),
                        "firebase_uid": row[11],
                        "interests": [item[0] for item in interest_rows],
                        "has_profile_picture": bool(row[12]),
                    }
                )

    return profiles


@app.get("/profiles/{profile_id}/picture")
def get_profile_picture(profile_id: int):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT profile_picture, picture_mime_type
                FROM profiles
                WHERE id = %s
                """,
                (profile_id,),
            )
            row = cursor.fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    image_bytes, mime_type = row

    if image_bytes is None:
        raise HTTPException(
            status_code=404,
            detail="No profile picture uploaded",
        )

    return Response(
        content=bytes(image_bytes),
        media_type=mime_type or "application/octet-stream",
        headers={"Cache-Control": "no-store"},
    )


class LikeRequest(BaseModel):
    liker_id: int
    liked_id: int


@app.post("/likes")
def create_like(request: LikeRequest):
    if request.liker_id == request.liked_id:
        raise HTTPException(status_code=400, detail="You cannot like your own profile.")

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT id FROM profiles WHERE id IN (%s, %s)", (request.liker_id, request.liked_id))
            if len(cursor.fetchall()) != 2:
                raise HTTPException(status_code=404, detail="One or both profiles were not found.")

            cursor.execute(
                "INSERT INTO likes (liker_id, liked_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (request.liker_id, request.liked_id),
            )
            cursor.execute(
                "SELECT id FROM likes WHERE liker_id = %s AND liked_id = %s",
                (request.liker_id, request.liked_id),
            )
            like_row = cursor.fetchone()
            cursor.execute(
                "SELECT id FROM likes WHERE liker_id = %s AND liked_id = %s",
                (request.liked_id, request.liker_id),
            )
            mutual = cursor.fetchone() is not None
            if mutual:
                one, two = sorted((request.liker_id, request.liked_id))
                cursor.execute(
                    "INSERT INTO matches (profile_one, profile_two) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                    (one, two),
                )

    return {"liked": True, "matched": mutual, "like_id": like_row[0] if like_row else None}


@app.get("/likes/{profile_id}")
def get_likes(profile_id: int):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT id FROM profiles WHERE id = %s", (profile_id,))
            if cursor.fetchone() is None:
                raise HTTPException(status_code=404, detail="Profile not found")
            cursor.execute(
                """
                SELECT p.id, p.name, p.age, p.college, p.course, p.goal,
                       t.social_energy, t.communication, t.openness, t.empathy, t.adventure,
                       p.firebase_uid, (p.profile_picture IS NOT NULL), l.created_at
                FROM likes l
                JOIN profiles p ON p.id = l.liked_id
                JOIN personality_traits t ON t.profile_id = p.id
                WHERE l.liker_id = %s
                ORDER BY l.created_at DESC, l.id DESC
                """, (profile_id,)
            )
            rows = cursor.fetchall()
            results = []
            for row in rows:
                cursor.execute("""SELECT i.name FROM profile_interests pi JOIN interests i ON i.id = pi.interest_id WHERE pi.profile_id = %s ORDER BY i.name""", (row[0],))
                interests = [item[0] for item in cursor.fetchall()]
                results.append({"id": row[0], "name": row[1], "age": row[2], "college": row[3], "course": row[4], "goal": row[5], "traits": list(row[6:11]), "firebase_uid": row[11], "has_profile_picture": bool(row[12]), "interests": interests, "created_at": row[13].isoformat() if row[13] else None})
    return results


@app.get("/matches/{profile_id}")
def get_matches(profile_id: int):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT id FROM profiles WHERE id = %s", (profile_id,))
            if cursor.fetchone() is None:
                raise HTTPException(status_code=404, detail="Profile not found")
            cursor.execute(
                """
                SELECT p.id, p.name, p.age, p.college, p.course, p.goal,
                       t.social_energy, t.communication, t.openness, t.empathy, t.adventure,
                       p.firebase_uid, (p.profile_picture IS NOT NULL), m.created_at
                FROM matches m
                JOIN profiles p ON p.id = CASE WHEN m.profile_one = %s THEN m.profile_two ELSE m.profile_one END
                JOIN personality_traits t ON t.profile_id = p.id
                WHERE m.profile_one = %s OR m.profile_two = %s
                ORDER BY m.created_at DESC, m.id DESC
                """, (profile_id, profile_id, profile_id)
            )
            rows = cursor.fetchall()
            results = []
            for row in rows:
                cursor.execute("""SELECT i.name FROM profile_interests pi JOIN interests i ON i.id = pi.interest_id WHERE pi.profile_id = %s ORDER BY i.name""", (row[0],))
                interests = [item[0] for item in cursor.fetchall()]
                results.append({"id": row[0], "name": row[1], "age": row[2], "college": row[3], "course": row[4], "goal": row[5], "traits": list(row[6:11]), "firebase_uid": row[11], "has_profile_picture": bool(row[12]), "interests": interests, "created_at": row[13].isoformat() if row[13] else None})
    return results
