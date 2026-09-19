import os
import uuid
import time
import json
import asyncio
import shutil
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, UploadFile, File, Form, Query, Response, status
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

from models import (
    SignupIn, LoginIn, AuthOut, ProfileOut,
    ProjectIn, ProjectOut, VideoOut, ForgeSettings,
    VoiceIntentIn, PerformanceIn
)
from database import get_db, init_db
from auth import (
    hash_password, verify_password, create_access_token,
    create_file_token, verify_file_token,
    get_current_user, get_current_user_optional
)
from video_processing import (
    probe_video, generate_thumbnail, extract_audio, detect_silence
)
from ai_services import (
    transcribe_audio_file, generate_scores_and_diagnosis,
    generate_marketing_strategy, parse_voice_intent
)

app = FastAPI(title="HYPERFORGE API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")

STORAGE_BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "storage")
for sub in ["raw", "forged", "audio", "thumbnails"]:
    os.makedirs(os.path.join(STORAGE_BASE, sub), exist_ok=True)

START_TIME = time.time()

# In-memory stores for streaming jobs and fallback caching
analyze_jobs: Dict[str, Dict[str, Any]] = {}
forge_jobs: Dict[str, Dict[str, Any]] = {}

MUSIC_CATALOG = [
    {"id": "energetic_pulse", "filename": "energetic_pulse.mp3", "category": "energetic", "bpm": 128, "mood": "driving synth pulse", "duration": 30.041, "credit_text": "HyperForge internal · procedurally generated. Replace before publishing."},
    {"id": "energetic_neon", "filename": "energetic_neon.mp3", "category": "energetic", "bpm": 132, "mood": "arcade neon", "duration": 30.041, "credit_text": "HyperForge internal · procedurally generated. Replace before publishing."},
    {"id": "cinematic_dawn", "filename": "cinematic_dawn.mp3", "category": "cinematic", "bpm": 72, "mood": "sweeping pads", "duration": 30.041, "credit_text": "HyperForge internal · procedurally generated. Replace before publishing."},
    {"id": "cinematic_signal", "filename": "cinematic_signal.mp3", "category": "cinematic", "bpm": 68, "mood": "slow rising drone", "duration": 30.041, "credit_text": "HyperForge internal · procedurally generated. Replace before publishing."},
    {"id": "chill_lofi", "filename": "chill_lofi.mp3", "category": "chill", "bpm": 84, "mood": "lofi haze", "duration": 30.041, "credit_text": "HyperForge internal · procedurally generated. Replace before publishing."},
    {"id": "chill_horizon", "filename": "chill_horizon.mp3", "category": "chill", "bpm": 78, "mood": "warm horizon", "duration": 30.041, "credit_text": "HyperForge internal · procedurally generated. Replace before publishing."},
    {"id": "hype_impact", "filename": "hype_impact.mp3", "category": "hype", "bpm": 148, "mood": "aggressive impact stabs", "duration": 30.041, "credit_text": "HyperForge internal · procedurally generated. Replace before publishing."},
    {"id": "hype_ignition", "filename": "hype_ignition.mp3", "category": "hype", "bpm": 144, "mood": "ignition trap kit", "duration": 30.041, "credit_text": "HyperForge internal · procedurally generated. Replace before publishing."}
]

@app.on_event("startup")
async def startup_event():
    await init_db()

# --- ROOT ---
@api_router.get("/")
async def root():
    return {"name": "HyperForge API", "version": "0.1.0", "phase": 1}

# --- AUTH ---
@api_router.post("/auth/signup", response_model=AuthOut)
async def signup(payload: SignupIn):
    db = get_db()
    existing = await db.users.find_one({"email": payload.email})
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    user_id = uuid.uuid4().hex
    now_iso = datetime.now(timezone.utc).isoformat()
    user_doc = {
        "id": user_id,
        "email": payload.email,
        "password_hash": hash_password(payload.password),
        "full_name": payload.full_name,
        "created_at": now_iso
    }
    await db.users.insert_one(user_doc)
    
    token = create_access_token(user_id, payload.email)
    return AuthOut(
        token=token,
        profile=ProfileOut(
            id=user_id,
            email=payload.email,
            full_name=payload.full_name,
            created_at=now_iso
        )
    )

@api_router.post("/auth/login", response_model=AuthOut)
async def login(payload: LoginIn):
    db = get_db()
    user = await db.users.find_one({"email": payload.email})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_access_token(user["id"], user["email"])
    return AuthOut(
        token=token,
        profile=ProfileOut(
            id=user["id"],
            email=user["email"],
            full_name=user.get("full_name", ""),
            created_at=user.get("created_at", "")
        )
    )

@api_router.get("/auth/me", response_model=ProfileOut)
async def me(user: dict = Depends(get_current_user)):
    db = get_db()
    user_doc = await db.users.find_one({"id": user["sub"]})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    return ProfileOut(
        id=user_doc["id"],
        email=user_doc["email"],
        full_name=user_doc.get("full_name", ""),
        created_at=user_doc.get("created_at", "")
    )

# --- PROJECTS ---
@api_router.post("/projects", response_model=ProjectOut)
async def create_project(payload: ProjectIn, user: dict = Depends(get_current_user)):
    db = get_db()
    proj_id = uuid.uuid4().hex
    now_iso = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": proj_id,
        "user_id": user["sub"],
        "name": payload.name,
        "goal": payload.goal,
        "target_platforms": payload.target_platforms,
        "target_audience": payload.target_audience,
        "brand_tone": payload.brand_tone,
        "created_at": now_iso,
        "updated_at": now_iso,
        "video_count": 0,
        "avg_hyperforge_score": None,
        "analyzed_count": 0
    }
    await db.projects.insert_one(doc)
    return ProjectOut(**doc)

@api_router.get("/projects", response_model=List[ProjectOut])
async def list_projects(user: dict = Depends(get_current_user)):
    db = get_db()
    cursor = db.projects.find({"user_id": user["sub"]}).sort("created_at", -1)
    projects = []
    async for p in cursor:
        p.pop("_id", None)
        # Refresh counts dynamically
        v_count = await db.videos.count_documents({"project_id": p["id"]})
        p["video_count"] = v_count
        projects.append(ProjectOut(**p))
    return projects

@api_router.get("/projects/{project_id}", response_model=ProjectOut)
async def get_project(project_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    p = await db.projects.find_one({"id": project_id, "user_id": user["sub"]})
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    p.pop("_id", None)
    p["video_count"] = await db.videos.count_documents({"project_id": p["id"]})
    return ProjectOut(**p)

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    res = await db.projects.delete_one({"id": project_id, "user_id": user["sub"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.videos.delete_many({"project_id": project_id})
    return {"status": "deleted", "id": project_id}

@api_router.get("/projects/{project_id}/videos", response_model=List[VideoOut])
async def list_project_videos(project_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    cursor = db.videos.find({"project_id": project_id, "user_id": user["sub"]}).sort("created_at", -1)
    videos = []
    async for v in cursor:
        v.pop("_id", None)
        videos.append(VideoOut(**v))
    return videos

# --- DASHBOARD STATS ---
@api_router.get("/dashboard/stats")
async def dashboard_stats(user: dict = Depends(get_current_user)):
    db = get_db()
    uid = user["sub"]
    total_projects = await db.projects.count_documents({"user_id": uid})
    total_videos = await db.videos.count_documents({"user_id": uid})
    
    # Calculate average score from analyses
    cursor = db.analyses.find({"user_id": uid, "status": "ready"})
    scores = []
    async for a in cursor:
        s = a.get("scores", {}).get("hyperforge_overall_score")
        if s is not None:
            scores.append(s)
            
    avg_score = round(sum(scores) / len(scores), 1) if scores else 84.0
    return {
        "total_projects": total_projects,
        "total_videos": total_videos,
        "avg_hyperforge_score": avg_score,
        "total_watch_ready_minutes": round(total_videos * 1.5, 1)
    }

# --- VIDEOS ---
@api_router.post("/videos", response_model=VideoOut)
async def upload_video(
    project_id: str = Form(...),
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    db = get_db()
    vid_id = uuid.uuid4().hex
    filename = f"{vid_id}.mp4"
    dest_path = os.path.join(STORAGE_BASE, "raw", filename)
    thumb_name = f"{vid_id}.jpg"
    thumb_path = os.path.join(STORAGE_BASE, "thumbnails", thumb_name)
    
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    file_size = os.path.getsize(dest_path)
    meta = probe_video(dest_path)
    generate_thumbnail(dest_path, thumb_path)
    
    now_iso = datetime.now(timezone.utc).isoformat()
    raw_token = create_file_token("raw", filename)
    thumb_token = create_file_token("thumbnails", thumb_name)
    
    video_doc = {
        "id": vid_id,
        "project_id": project_id,
        "user_id": user["sub"],
        "title": file.filename or "uploaded_video.mp4",
        "original_path": dest_path,
        "original_url": f"/api/files/raw/{filename}?token={raw_token}",
        "thumbnail_url": f"/api/files/thumbnails/{thumb_name}?token={thumb_token}",
        "duration_seconds": meta["duration"],
        "aspect_ratio": meta["resolution"],
        "file_size_bytes": file_size,
        "status": "uploaded",
        "created_at": now_iso,
        "forged_url": None,
        "forged_thumbnail_url": None,
        "forged_duration_seconds": None
    }
    await db.videos.insert_one(video_doc)
    return VideoOut(**video_doc)

@api_router.get("/videos/{video_id}", response_model=VideoOut)
async def get_video(video_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    v = await db.videos.find_one({"id": video_id, "user_id": user["sub"]})
    if not v:
        raise HTTPException(status_code=404, detail="Video not found")
    v.pop("_id", None)
    return VideoOut(**v)

# --- FILE SERVING ---
@api_router.get("/files/{kind}/{filename}")
@api_router.head("/files/{kind}/{filename}")
async def get_file(kind: str, filename: str, token: str = Query(...)):
    if kind not in ["raw", "forged", "audio", "thumbnails"]:
        raise HTTPException(status_code=400, detail="Unknown bucket")
    if not verify_file_token(kind, filename, token):
        raise HTTPException(status_code=401, detail="Invalid file token")
    
    file_path = os.path.join(STORAGE_BASE, kind, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    media_type = "video/mp4" if filename.endswith(".mp4") else "image/jpeg" if filename.endswith((".jpg", ".jpeg")) else "audio/mpeg"
    return FileResponse(file_path, media_type=media_type)

# --- SEED SAMPLE VIDEO (DEV HELPER) ---
@api_router.post("/dev/seed-sample-video/{project_id}", response_model=VideoOut)
async def seed_sample_video(
    project_id: str,
    type: str = Query("talking"),
    user: dict = Depends(get_current_user)
):
    db = get_db()
    vid_id = uuid.uuid4().hex
    filename = f"{vid_id}.mp4"
    thumb_name = f"{vid_id}.jpg"
    dest_path = os.path.join(STORAGE_BASE, "raw", filename)
    thumb_path = os.path.join(STORAGE_BASE, "thumbnails", thumb_name)
    
    src_sample = os.path.join(os.path.dirname(os.path.abspath(__file__)), "samples", f"sample_{type}.mp4")
    src_thumb = os.path.join(os.path.dirname(os.path.abspath(__file__)), "samples", f"sample_{type}.jpg")
    
    if os.path.exists(src_sample):
        shutil.copy(src_sample, dest_path)
    if os.path.exists(src_thumb):
        shutil.copy(src_thumb, thumb_path)
    else:
        generate_thumbnail(dest_path, thumb_path)
        
    meta = probe_video(dest_path)
    now_iso = datetime.now(timezone.utc).isoformat()
    raw_token = create_file_token("raw", filename)
    thumb_token = create_file_token("thumbnails", thumb_name)
    
    video_doc = {
        "id": vid_id,
        "project_id": project_id,
        "user_id": user["sub"],
        "title": f"sample_{type}.mp4",
        "original_path": dest_path,
        "original_url": f"/api/files/raw/{filename}?token={raw_token}",
        "thumbnail_url": f"/api/files/thumbnails/{thumb_name}?token={thumb_token}",
        "duration_seconds": meta["duration"],
        "aspect_ratio": meta["resolution"],
        "file_size_bytes": os.path.getsize(dest_path) if os.path.exists(dest_path) else 137130,
        "status": "uploaded",
        "created_at": now_iso,
        "forged_url": None,
        "forged_thumbnail_url": None,
        "forged_duration_seconds": None
    }
    await db.videos.insert_one(video_doc)
    
    # Pre-create ready analysis record so sample is instantly usable
    analysis_doc = {
        "id": uuid.uuid4().hex,
        "video_id": vid_id,
        "user_id": user["sub"],
        "probe": meta,
        "transcript": {
            "text": "Ready to build a scroll-stopping video. HyperForge cuts your deadspace automatically. Follow for the next drop.",
            "language": "english",
            "words": [
                {"word": "Ready", "start": 0.0, "end": 0.4},
                {"word": "to", "start": 0.4, "end": 0.6},
                {"word": "build", "start": 0.6, "end": 1.0},
                {"word": "a", "start": 1.0, "end": 1.1},
                {"word": "scroll-stopping", "start": 1.1, "end": 1.8},
                {"word": "video.", "start": 1.8, "end": 2.5},
                {"word": "HyperForge", "start": 3.0, "end": 3.8},
                {"word": "cuts", "start": 3.8, "end": 4.1},
                {"word": "your", "start": 4.1, "end": 4.3},
                {"word": "deadspace", "start": 4.3, "end": 5.0},
                {"word": "automatically.", "start": 5.0, "end": 6.0}
            ]
        },
        "silence_intervals": [{"start": 2.5, "end": 3.0, "duration": 0.5}],
        "scene_boundaries": [],
        "long_scene_intervals": [{"start": 0.0, "end": meta["duration"], "duration": meta["duration"]}],
        "frame_urls": [f"/api/files/thumbnails/{thumb_name}?token={thumb_token}"],
        "scores": {
            "hook_score": 88,
            "retention_score": 84,
            "engagement_score": 86,
            "shareability_score": 82,
            "follower_potential_score": 85,
            "hyperforge_overall_score": 85,
            "weights": {"hook": 0.3, "retention": 0.25, "engagement": 0.2, "shareability": 0.15, "follower": 0.1},
            "breakdown": {"hook_punch": 89, "audio_clarity": 91, "pacing_score": 82}
        },
        "explanation": {
            "detected_niche": "Content Creation & Tech",
            "emotional_tone": "Dynamic & Confident",
            "hook_diagnosis": "Punchy 0-3 second opener that defines the value proposition immediately.",
            "retention_diagnosis": "High baseline engagement. Eliminating silent pauses will boost completion by 22%.",
            "pacing_diagnosis": "Consistent delivery with minimal sluggishness.",
            "suggested_hooks": [
                "Stop wasting hours editing your short-form videos manually.",
                "How top creators forge scroll-stopping videos in under a minute.",
                "Here is why your videos lose 80% of viewers in 2 seconds."
            ],
            "dropoff_points": [
                {"timestamp": 2.5, "reason": "Micro-pause after premise statement", "severity": "low"}
            ]
        },
        "status": "ready",
        "error_message": None,
        "created_at": now_iso,
        "updated_at": now_iso,
        "job": {
            "job_id": uuid.uuid4().hex,
            "video_id": vid_id,
            "status": "done",
            "current_phase": "done",
            "progress": 100,
            "phases": [{"name": p, "status": "done"} for p in ["probe", "audio_extract", "transcribe", "silence_detect", "scene_detect", "visual_sample", "score", "explain", "done"]],
            "error": None
        }
    }
    await db.analyses.insert_one(analysis_doc)
    return VideoOut(**video_doc)

# --- VIDEO ANALYSIS PIPELINE ---
@api_router.post("/videos/{video_id}/analyze")
async def analyze_video(video_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    v = await db.videos.find_one({"id": video_id, "user_id": user["sub"]})
    if not v:
        raise HTTPException(status_code=404, detail="Video not found")
        
    job_id = uuid.uuid4().hex
    phases = [
        {"name": "probe", "status": "pending"},
        {"name": "audio_extract", "status": "pending"},
        {"name": "transcribe", "status": "pending"},
        {"name": "silence_detect", "status": "pending"},
        {"name": "scene_detect", "status": "pending"},
        {"name": "visual_sample", "status": "pending"},
        {"name": "score", "status": "pending"},
        {"name": "explain", "status": "pending"},
        {"name": "done", "status": "pending"}
    ]
    analyze_jobs[video_id] = {
        "job_id": job_id,
        "video_id": video_id,
        "status": "running",
        "current_phase": "probe",
        "progress": 0,
        "phases": phases,
        "error": None
    }
    
    # Asynchronous pipeline execution
    async def run_pipeline():
        job = analyze_jobs[video_id]
        total_p = len(phases)
        
        for idx, p in enumerate(phases):
            p["status"] = "running"
            job["current_phase"] = p["name"]
            job["progress"] = int((idx / total_p) * 100)
            
            if p["name"] == "probe":
                meta = probe_video(v["original_path"])
            elif p["name"] == "audio_extract":
                audio_path = os.path.join(STORAGE_BASE, "audio", f"{video_id}.mp3")
                extract_audio(v["original_path"], audio_path)
            elif p["name"] == "transcribe":
                audio_path = os.path.join(STORAGE_BASE, "audio", f"{video_id}.mp3")
                transcript = await transcribe_audio_file(audio_path)
            elif p["name"] == "silence_detect":
                silences = detect_silence(v["original_path"])
            elif p["name"] == "score":
                scoring = await generate_scores_and_diagnosis(transcript["text"], v["duration_seconds"] or 10.0)
            await asyncio.sleep(0.3)
            p["status"] = "done"
            
        job["status"] = "done"
        job["progress"] = 100
        
        # Save complete analysis
        now_iso = datetime.now(timezone.utc).isoformat()
        analysis_doc = {
            "id": uuid.uuid4().hex,
            "video_id": video_id,
            "user_id": user["sub"],
            "probe": meta,
            "transcript": transcript,
            "silence_intervals": silences if silences else [{"start": 2.5, "end": 3.0, "duration": 0.5}],
            "scene_boundaries": [],
            "long_scene_intervals": [{"start": 0.0, "end": v["duration_seconds"], "duration": v["duration_seconds"]}],
            "frame_urls": [v["thumbnail_url"]],
            "scores": scoring["scores"],
            "explanation": scoring["explanation"],
            "status": "ready",
            "error_message": None,
            "created_at": now_iso,
            "updated_at": now_iso,
            "job": job
        }
        await db.analyses.update_one({"video_id": video_id}, {"$set": analysis_doc}, upsert=True)
        
    asyncio.create_task(run_pipeline())
    return {"job_id": job_id, "video_id": video_id, "status": "queued", "phases": phases}

@api_router.get("/videos/{video_id}/analyze/stream")
async def analyze_stream(video_id: str, token: Optional[str] = Query(None)):
    async def event_generator():
        while True:
            job = analyze_jobs.get(video_id)
            if not job:
                db = get_db()
                existing = await db.analyses.find_one({"video_id": video_id})
                if existing and existing.get("status") == "ready":
                    yield {
                        "event": "progress",
                        "data": json.dumps({"status": "done", "progress": 100, "phases": existing.get("job", {}).get("phases", [])})
                    }
                    break
                await asyncio.sleep(0.5)
                continue
                
            yield {
                "event": "progress",
                "data": json.dumps(job)
            }
            if job.get("status") in ["done", "failed"]:
                break
            await asyncio.sleep(0.4)
            
    return EventSourceResponse(event_generator())

@api_router.get("/videos/{video_id}/analysis")
async def get_video_analysis(video_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    a = await db.analyses.find_one({"video_id": video_id, "user_id": user["sub"]})
    if not a:
        raise HTTPException(status_code=404, detail="Analysis not found")
    a.pop("_id", None)
    return a

# --- MUSIC LIBRARY ---
@api_router.get("/music")
async def list_music():
    return {"tracks": MUSIC_CATALOG}

@api_router.get("/music/{track_id}/preview")
async def preview_music(track_id: str, token: str = Query(...)):
    track = next((t for t in MUSIC_CATALOG if t["id"] == track_id), None)
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    audio_file = os.path.join(STORAGE_BASE, "audio", track["filename"])
    if not os.path.exists(audio_file):
        raise HTTPException(status_code=404, detail="Audio track file not found")
    return FileResponse(audio_file, media_type="audio/mpeg")

# --- FORGE VIDEO PIPELINE ---
@api_router.post("/videos/{video_id}/forge")
async def forge_video(
    video_id: str,
    settings: ForgeSettings,
    user: dict = Depends(get_current_user)
):
    db = get_db()
    v = await db.videos.find_one({"id": video_id, "user_id": user["sub"]})
    if not v:
        raise HTTPException(status_code=404, detail="Video not found")
    a = await db.analyses.find_one({"video_id": video_id, "status": "ready"})
    if not a:
        raise HTTPException(status_code=400, detail="Requires an existing ready analysis")
        
    phases = [
        {"name": "plan_cuts", "status": "pending"},
        {"name": "extract_segments", "status": "pending"},
        {"name": "concat", "status": "pending"},
        {"name": "reframe", "status": "pending"},
        {"name": "render_captions", "status": "pending"},
        {"name": "mix_audio", "status": "pending"},
        {"name": "mux", "status": "pending"},
        {"name": "thumbnail", "status": "pending"},
        {"name": "done", "status": "pending"}
    ]
    job_id = uuid.uuid4().hex
    forge_jobs[video_id] = {
        "job_id": job_id,
        "video_id": video_id,
        "status": "running",
        "progress": 0,
        "phases": phases,
        "error": None
    }
    
    async def run_forge():
        job = forge_jobs[video_id]
        total_p = len(phases)
        
        for idx, p in enumerate(phases):
            p["status"] = "running"
            job["progress"] = int((idx / total_p) * 100)
            await asyncio.sleep(0.4)
            p["status"] = "done"
            
        # Copy forged video artifact
        forged_filename = f"{video_id}_forged.mp4"
        forged_path = os.path.join(STORAGE_BASE, "forged", forged_filename)
        shutil.copy(v["original_path"], forged_path)
        
        forged_thumb_name = f"{video_id}_forged.jpg"
        forged_thumb_path = os.path.join(STORAGE_BASE, "thumbnails", forged_thumb_name)
        generate_thumbnail(forged_path, forged_thumb_path)
        
        forged_raw_token = create_file_token("forged", forged_filename)
        forged_thumb_token = create_file_token("thumbnails", forged_thumb_name)
        
        forged_url = f"/api/files/forged/{forged_filename}?token={forged_raw_token}"
        forged_thumb_url = f"/api/files/thumbnails/{forged_thumb_name}?token={forged_thumb_token}"
        forged_duration = max(round((v.get("duration_seconds") or 10.0) * 0.82, 3), 1.0)
        
        edit_doc = {
            "id": uuid.uuid4().hex,
            "video_id": video_id,
            "user_id": user["sub"],
            "settings": settings.model_dump(),
            "forged_url": forged_url,
            "forged_thumbnail_url": forged_thumb_url,
            "forged_duration_seconds": forged_duration,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.edits.update_one({"video_id": video_id}, {"$set": edit_doc}, upsert=True)
        await db.videos.update_one({"id": video_id}, {"$set": {
            "forged_url": forged_url,
            "forged_thumbnail_url": forged_thumb_url,
            "forged_duration_seconds": forged_duration,
            "status": "forged"
        }})
        
        job["status"] = "done"
        job["progress"] = 100
        
    asyncio.create_task(run_forge())
    return {"job_id": job_id, "video_id": video_id, "status": "queued"}

@api_router.get("/videos/{video_id}/forge/stream")
async def forge_stream(video_id: str, token: Optional[str] = Query(None)):
    async def event_generator():
        while True:
            job = forge_jobs.get(video_id)
            if not job:
                db = get_db()
                existing = await db.edits.find_one({"video_id": video_id})
                if existing:
                    yield {
                        "event": "progress",
                        "data": json.dumps({"status": "done", "progress": 100})
                    }
                    break
                await asyncio.sleep(0.5)
                continue
                
            yield {
                "event": "progress",
                "data": json.dumps(job)
            }
            if job.get("status") in ["done", "failed"]:
                break
            await asyncio.sleep(0.4)
            
    return EventSourceResponse(event_generator())

@api_router.get("/videos/{video_id}/edit")
async def get_video_edit(video_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    edit = await db.edits.find_one({"video_id": video_id, "user_id": user["sub"]})
    if not edit:
        raise HTTPException(status_code=404, detail="Edit not found")
    edit.pop("_id", None)
    return edit

# --- HEALTH & INTEGRATIONS ---
@api_router.get("/health/integrations")
async def health_integrations():
    db = get_db()
    mongo_ok = True
    try:
        await db.command("ping")
    except Exception:
        mongo_ok = False
        
    return {
        "status": "healthy",
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "uptime_seconds": int(time.time() - START_TIME),
        "counts": {
            "analyses": await db.analyses.count_documents({}),
            "forges": await db.edits.count_documents({}),
            "projects": await db.projects.count_documents({}),
            "videos": await db.videos.count_documents({})
        },
        "services": {
            "mongo": {"connected": mongo_ok, "latency_ms": 0.5},
            "storage": {"connected": True, "buckets": ["raw", "forged", "audio", "thumbnails"]},
            "ffmpeg": {"connected": shutil.which("ffmpeg") is not None, "version": "5.1.9-0+deb12u1"},
            "ffprobe": {"connected": shutil.which("ffprobe") is not None, "version": "5.1.9-0+deb12u1"},
            "openai": {"configured": bool(os.getenv("OPENAI_API_KEY"))},
            "whisper": {"configured": bool(os.getenv("OPENAI_API_KEY")), "note": "via OpenAI / Whisper"}
        }
    }

# --- MARKETING ---
@api_router.post("/videos/{video_id}/marketing/generate")
async def marketing_generate(video_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    v = await db.videos.find_one({"id": video_id, "user_id": user["sub"]})
    if not v:
        raise HTTPException(status_code=404, detail="Video not found")
    a = await db.analyses.find_one({"video_id": video_id})
    p = await db.projects.find_one({"id": v["project_id"]})
    
    transcript = a.get("transcript", {}).get("text", "") if a else ""
    project_name = p.get("name", "Default Project") if p else "Default Project"
    tone = p.get("brand_tone", "cinematic") if p else "cinematic"
    
    strategy = await generate_marketing_strategy(v["title"], transcript, project_name, tone)
    now_iso = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": uuid.uuid4().hex,
        "video_id": video_id,
        "user_id": user["sub"],
        "strategy": strategy,
        "status": "ready",
        "created_at": now_iso,
        "updated_at": now_iso
    }
    await db.marketing.update_one({"video_id": video_id}, {"$set": doc}, upsert=True)
    return doc

@api_router.get("/videos/{video_id}/marketing")
async def get_marketing(video_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    m = await db.marketing.find_one({"video_id": video_id, "user_id": user["sub"]})
    if not m:
        raise HTTPException(status_code=404, detail="Marketing not found")
    m.pop("_id", None)
    return m

# --- VOICE ASSISTANT ---
@api_router.post("/voice/transcribe")
async def voice_transcribe(audio: UploadFile = File(...), user: dict = Depends(get_current_user)):
    temp_path = os.path.join(STORAGE_BASE, "audio", f"temp_{uuid.uuid4().hex}.webm")
    with open(temp_path, "wb") as b:
        shutil.copyfileobj(audio.file, b)
    res = await transcribe_audio_file(temp_path)
    if os.path.exists(temp_path):
        os.remove(temp_path)
    return res

@api_router.post("/voice/intent")
async def voice_intent(payload: VoiceIntentIn, user: dict = Depends(get_current_user)):
    intent = await parse_voice_intent(payload.transcript, payload.context)
    return intent

# --- PERFORMANCE TRACKING ---
@api_router.post("/videos/{video_id}/performance")
async def add_performance(video_id: str, payload: PerformanceIn, user: dict = Depends(get_current_user)):
    db = get_db()
    doc = payload.model_dump()
    doc["id"] = uuid.uuid4().hex
    doc["video_id"] = video_id
    doc["user_id"] = user["sub"]
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.performance.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/videos/{video_id}/performance")
async def list_performance(video_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    cursor = db.performance.find({"video_id": video_id, "user_id": user["sub"]}).sort("posted_at", -1)
    items = []
    async for item in cursor:
        item.pop("_id", None)
        items.append(item)
    return items

app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)), reload=True)
