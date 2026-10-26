# Fribbet — AI-Powered Friendship Recommendations

Fribbet is a web application designed to help students discover compatible friends based on their personality traits, shared interests, and personal goals. It uses profile information to generate friendship recommendations and explain potential compatibility.

## Features

- **User profiles:** Create and manage profiles containing personality traits, interests, and goals.
- **Friendship recommendations:** Generate recommendations by comparing a user's profile with other candidate profiles.
- **Compatibility insights:** Display compatibility scores, shared interests, and explanations for recommendations.
- **Authentication:** Firebase Authentication for user sign-in and identity management.
- **Profile storage:** PostgreSQL database for storing and retrieving profile information.
- **Profile pictures:** Support for JPEG, PNG, and WebP images, subject to upload size restrictions.
- **REST API:** FastAPI backend connecting the frontend to profile storage and recommendation functionality.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Backend | Python, FastAPI |
| Database | PostgreSQL |
| Authentication | Firebase Authentication |
| API communication | REST and JSON |

## System Architecture

Fribbet follows a client-server architecture.

1. **Frontend:** Provides the user interface for authentication, profile management, and viewing recommendations.
2. **Backend:** Handles API requests, profile operations, and recommendation generation.
3. **Database:** Stores user profile information, personality traits, and interests.
4. **Authentication service:** Firebase Authentication manages user identity.

### Recommendation Workflow

1. The user signs in and accesses their profile.
2. The application retrieves saved profiles.
3. The current user is excluded from the candidate list.
4. The frontend sends the user's profile and candidate profiles to the recommendation API.
5. The backend generates recommendation results.
6. The frontend displays compatible profiles with scores, shared interests, and explanations.

## Project Structure

```text
Fribbet/
├── backend/
│   ├── main.py
│   ├── recommendation.py
│   └── test_recommendation.py
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   └── api.ts
│   └── package.json
├── .gitignore
└── README.md
```

*Note: This shows the main project files; additional configuration and source files may be present.*

## Prerequisites

Install the following before running the application:

- Python
- Node.js and npm
- PostgreSQL
- Git
- A Firebase project configured for authentication

## Setup and Installation

### 1. Clone the repository

```bash
git clone https://github.com/naorupei/Fribbet.git
cd Fribbet
```

### 2. Set up the backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Configure the backend environment variables using the project's expected names and values. These should include the database connection settings and any required Firebase configuration.

Ensure PostgreSQL is running and the required database and tables are configured.

Start the backend:

```bash
uvicorn main:app --reload
```

The API should be available at:

- API base URL: `http://127.0.0.1:8000`
- Interactive API documentation: `http://127.0.0.1:8000/docs`

FastAPI provides interactive API documentation through Swagger UI. See the [official FastAPI documentation](https://fastapi.tiangolo.com/tutorial/first-steps/).

### 3. Set up the frontend

Open a separate terminal:

```bash
cd frontend
npm install
```

Configure the frontend environment variables required by the Firebase setup and backend API URL, using the variable names expected by the existing application.

Start the development server:

```bash
npm run dev
```

Open the local URL printed by Vite in your terminal.

## API Overview

The backend includes endpoints for the following operations:

| Endpoint | Purpose |
|---|---|
| `GET /health` | Check backend and database connectivity |
| `GET /profiles` | Retrieve saved profiles |
| `POST /profiles` | Create a profile |
| `POST /recommend` | Generate friendship recommendations |

Consult the interactive API documentation at `/docs` for the available request schemas and responses.

## AI and Recommendation Approach

Fribbet's recommendation functionality uses profile information to assess potential friendship compatibility. The recommendation response includes compatibility-related information such as:

- Overall compatibility score
- Trait score
- Interest score
- Goal score
- Shared interests
- Explanations for recommendations

The intended AI problem-solving approach is to identify and rank suitable candidates using these profile attributes.

**Implementation note:** Specific search algorithms, rule-based inference mechanisms, and machine learning models should only be described as implemented after their corresponding code has been verified and tested. Fribbet's use of recommendation scores alone does not establish that it uses a trained machine learning model.

## Testing

The backend includes a recommendation test module:

```text
backend/test_recommendation.py
```

Run the relevant tests from the backend directory using the project's configured test framework. For example, if it uses pytest:

```bash
pytest
```

Verify that the backend starts successfully, the database connection works, profile operations function correctly, and recommendation results are returned in the expected format.

## Security and Configuration

- Keep environment files and credentials out of version control.
- Do not commit Firebase private credentials or database passwords.
- Validate profile inputs and uploaded image types and sizes.
- Use appropriate authentication and authorization checks for profile operations.
- Configure production secrets separately from local development settings.

## Future Enhancements

Potential extensions include:

- Explicit rule-based recommendation and explanation logic.
- A verified search strategy for ranking candidate profiles.
- More comprehensive recommendation tests.
- Improved recommendation quality through feedback and evaluation.
- Deployment with production-ready security and configuration.

## Conclusion

Fribbet combines a modern web frontend, a Python API, persistent profile storage, and authentication to support personalized friendship discovery. Its goal is to make finding compatible friends more intentional by highlighting shared interests, personality similarities, and aligned goals.

---

**Repository:** [naorupei/Fribbet](https://github.com/naorupei/Fribbet)
