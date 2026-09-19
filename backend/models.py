from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr

class SignupIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=200)
    full_name: str = Field(min_length=1, max_length=120)

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class ProfileOut(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    created_at: str

class AuthOut(BaseModel):
    token: str
    token_type: str = "bearer"
    profile: ProfileOut

class ProjectIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    goal: str = Field(min_length=1, max_length=2000)
    target_platforms: List[str] = Field(default_factory=list)
    target_audience: str = Field(default="", max_length=500)
    brand_tone: str = Field(default="cinematic")

class ProjectOut(BaseModel):
    id: str
    user_id: str
    name: str
    goal: str
    target_platforms: List[str]
    target_audience: str
    brand_tone: str
    created_at: str
    updated_at: str
    video_count: int = 0
    avg_hyperforge_score: Optional[float] = None
    analyzed_count: int = 0

class VideoOut(BaseModel):
    id: str
    project_id: str
    user_id: str
    title: str
    original_path: str
    original_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    duration_seconds: Optional[float] = None
    aspect_ratio: Optional[str] = None
    file_size_bytes: int
    status: str
    created_at: str
    forged_url: Optional[str] = None
    forged_thumbnail_url: Optional[str] = None
    forged_duration_seconds: Optional[float] = None

class ForgeSettings(BaseModel):
    target_aspect_ratio: str = Field(default="9:16")
    trim_silences: bool = Field(default=True)
    silence_padding_ms: int = Field(default=150, ge=0, le=2000)
    burn_captions: bool = Field(default=True)
    caption_style: str = Field(default="dynamic_creator")
    music_id: Optional[str] = None
    music_volume_db: float = Field(default=-14.0, ge=-40.0, le=0.0)
    ducking_db: float = Field(default=-18.0, ge=-40.0, le=0.0)

class VoiceIntentIn(BaseModel):
    transcript: str = Field(min_length=1, max_length=2000)
    context: Dict[str, Any] = Field(default_factory=dict)

class PerformanceIn(BaseModel):
    platform: str
    posted_at: str
    views: int = Field(ge=0)
    likes: int = Field(default=0, ge=0)
    comments: int = Field(default=0, ge=0)
    shares: int = Field(default=0, ge=0)
    saves: int = Field(default=0, ge=0)
    watch_time_avg_seconds: float = Field(default=0.0, ge=0.0)
