# Patera Lekha - Intelligent AI Voice Recorder & Meeting Assistant

Patera Lekha is a production-ready, full-stack mobile application that records audio with high quality, generates speaker-diarized transcriptions via Deepgram Nova-2/OpenAI Whisper, and enhances conversations using advanced LLM processing (Google Gemini, OpenAI GPT, or Anthropic Claude) into summaries, key points, and checkable action items.

This project is built using:
- **Frontend**: Flutter, Riverpod, GoRouter, Hive, Dio, and Material 3 design.
- **Backend**: Node.js, Express.js, Prisma ORM, and PostgreSQL.
- **Environment**: Docker, Docker Compose.

---
skdhfjhsshfssffishvfherksjghsrhgvjsrhou
## Folder Structure

```
Peter-Laka/
├── docker-compose.yml
├── .env.example
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       ├── config/         # DB Instantiation
│       ├── controllers/    # Auth & recordings upload processing
│       ├── middleware/     # Auth checks, error handling, rate limiting
│       ├── routes/         # Router mounts
│       └── services/       # Email, STT transcription, Gemini/OpenAI summaries
└── frontend/
    ├── pubspec.yaml
    └── lib/
        ├── core/           # Database Helper, M3 themes
        ├── models/         # User and recording REST mappings
        ├── providers/      # Session, history, player, recorder states
        ├── routes/         # GoRouter configurations
        ├── services/       # Dio clients, playback, document exporters
        └── features/       # Splashes, locks, auth, dash, wave recorders, viewers
```

---

## Prerequisites

To boot and run this application, ensure you have installed:
1. [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/).
2. [Flutter SDK](https://docs.flutter.dev/get-started/install) (to compile/run the mobile frontend).

---

## Backend Deployment & Setup (Docker)

1. **Clone & Environment Setup**:
   Copy `.env.example` to `.env` at the project root:
   ```bash
   cp .env.example .env
   ```
   Provide your API credentials:
   - `DEEPGRAM_API_KEY`: Required for high-fidelity speaker diarization.
   - `GEMINI_API_KEY` or `OPENAI_API_KEY`: Required for AI summary and action items generation.

2. **Boot containers**:
   From the project root containing `docker-compose.yml`, run:
   ```bash
   docker compose up --build
   ```
   This will spin up:
   - **PostgreSQL Database** on port `5432`
   - **Express REST API** on port `5000`
   - **pgAdmin Panel** on port `5050` (Email: `admin@pateralekha.ai`, Password: `admin_secure_pass`)

3. **Verify Database Setup**:
   The backend container automatically handles Prisma schema synchronization and code generation. If you wish to inspect the database locally, run:
   ```bash
   cd backend
   npm install
   npx prisma studio
   ```

---

## Frontend Setup & Execution (Flutter)

1. **Install Dependencies**:
   Navigate to the frontend directory and retrieve package specifications:
   ```bash
   cd frontend
   flutter pub get
   ```

2. **Configure API Endpoint**:
   - By default, the application is set to point to `http://10.0.2.2:5000` (Android emulator loopback loop for localhost).
   - If running on a physical Android or iOS device, open the **Settings** page in the application and update the **API Base URL** to match your computer's local network IP address (e.g., `http://192.168.1.100:5000`).

3. **Execute Application**:
   Run the project on a connected device or emulator:
   ```bash
   flutter run
   ```

---

## Key Features Built In

* **User Accounts Security**: Signup, Login, Password resets via email verification OTP code parameters, and account deletion. All protected by JWT authentication tokens.
* **Recording Workflow**: Local M4A recording, live speech preview using local speech recognizer, and multipart uploads.
* **Diarized Transcripts**: Groups transcript dialogue lines sequentially by voice footprint matching (Speaker 0, Speaker 1, etc.).
* **AI Analysis**: Produces meetings titles, summaries, key points lists, and structured checklists.
* **Document Share & Exports**: Save transcripts locally as PDF, Word (`.docx`), or plain text (`.txt`) and trigger native sharing dialogs.
