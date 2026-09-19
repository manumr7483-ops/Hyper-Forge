# HYPERFORGE — Forge Scroll-Stopping Content ⚡

> **HyperForge** is an AI-powered short-form video optimization platform engineered to turn raw footage into high-retention, scroll-stopping videos for TikTok, YouTube Shorts, and Instagram Reels.

---

## ✨ Features

- **⚡ AI Video Intelligence Pipeline**: Automated metadata probing, Whisper word-level transcription, silence detection, scene boundary recognition, and multi-factor retention scoring.
- **✂️ Deadspace & Silence Removal**: Automatically detects and trims speech pauses with configurable millisecond padding for punchy pacing.
- **🎯 Hook & Diagnostic Scoring**: Proprietary score calculation for Hook Punch, Retention, Engagement, Shareability, and Follower Potential, paired with actionable diagnosis and dropoff analysis.
- **💬 Dynamic Viral Captions**: Multiple animated subtitle styles (`dynamic_creator`, `clean_bold`, `minimal_white`) synchronized with word-level speech timestamps.
- **🎵 Curated Procedural Audio Library**: Built-in background tracks spanning Energetic, Cinematic, Chill, and Hype genres with automatic audio ducking under dialogue.
- **🎙️ Multimodal Voice Assistant**: Interactive floating voice control powered by Web Speech API, Whisper STT, and GPT-4o intent parsing.
- **📈 Multi-Platform Campaign Generator**: Instant multi-channel marketing campaigns featuring target audience personas, hook variants, platform-specific CTAs, repurposing plans, and posting schedules.
- **📊 Performance Tracking**: Monitor cross-platform engagement metrics (views, completion rate, likes, shares, saves) across TikTok, Instagram Reels, YouTube Shorts, LinkedIn, and X.

---

## 🛠️ Architecture & Tech Stack

### Frontend
- **Framework**: React 18
- **Styling**: Tailwind CSS with dark cyberpunk aesthetic
- **Motion & 3D**: Framer Motion & Three.js / React Three Fiber (`@react-three/fiber`)
- **State & Routing**: React Router v6 & Context API
- **Icons & Feedback**: Lucide React & Sonner toasts

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: MongoDB with async `motor` driver
- **Video Engine**: FFmpeg & FFprobe
- **AI / LLM**: OpenAI Whisper & GPT-4o
- **Auth & Tokens**: JWT (Bearer Authentication & Secure File Streaming Tokens)
- **Streaming**: Server-Sent Events (SSE) via `sse-starlette`

---

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose (recommended) OR
- Node.js 18+ and Python 3.10+
- FFmpeg installed locally

### Quick Start with Docker
```bash
# Clone repository
git clone https://github.com/Keerthanx-Reddy/HypeFoge.git
cd HypeFoge

# Start entire stack
docker-compose up --build
```
https://forge-preview-43.preview.emergentagent.com/

---

### Manual Setup

#### 1. Backend
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/Mac:
# source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env

# Run server
python server.py
```

#### 2. Frontend
```bash
cd frontend
npm install --legacy-peer-deps
npm start
```

---

## 📂 Repository Structure

```
.
├── backend/
│   ├── samples/             # Sample talking & silent videos
│   ├── storage/             # File storage buckets (raw, forged, audio, thumbnails)
│   │   └── audio/           # 8 bundled procedural background music tracks
│   ├── ai_services.py       # Whisper STT, GPT scoring & marketing generation
│   ├── auth.py              # JWT authentication & signed token verification
│   ├── database.py          # Async MongoDB connection
│   ├── models.py            # Pydantic models matching OpenAPI specs
│   ├── server.py            # FastAPI application & REST/SSE endpoints
│   ├── video_processing.py  # FFmpeg video manipulation & audio analysis
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── public/              # HTML template & icons
│   ├── src/
│   │   ├── components/      # UI, 3D Canvas, Video Forge, Audio, Voice Assistant
│   │   ├── contexts/        # Auth Context
│   │   ├── lib/             # API client & utilities
│   │   ├── pages/           # Dashboard, Studio, Analysis, Marketing, Health
│   │   ├── App.js
│   │   └── index.js
│   ├── Dockerfile
│   ├── package.json
│   └── tailwind.config.js
├── docker-compose.yml
└── README.md
```

---

## 📄 License
MIT License
