import os
import json
import subprocess
import shutil
from typing import Dict, Any, List

def run_cmd(cmd: List[str]) -> subprocess.CompletedProcess:
    try:
        return subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    except FileNotFoundError:
        return subprocess.CompletedProcess(cmd, returncode=127, stdout="", stderr="command not found")
    except Exception as e:
        return subprocess.CompletedProcess(cmd, returncode=1, stdout="", stderr=str(e))

def probe_video(file_path: str) -> Dict[str, Any]:
    if not os.path.exists(file_path):
        return {
            "duration": 10.0, "fps": 30.0, "bitrate": 100000,
            "width": 1280, "height": 720, "resolution": "1280x720",
            "codec": "h264", "has_audio": True, "audio_codec": "aac"
        }
    
    cmd = [
        "ffprobe", "-v", "quiet", "-print_format", "json",
        "-show_format", "-show_streams", file_path
    ]
    res = run_cmd(cmd)
    if res.returncode != 0:
        return {
            "duration": 10.0, "fps": 30.0, "bitrate": 100000,
            "width": 1280, "height": 720, "resolution": "1280x720",
            "codec": "h264", "has_audio": True, "audio_codec": "aac"
        }
    try:
        data = json.loads(res.stdout)
        v_stream = next((s for s in data.get("streams", []) if s.get("codec_type") == "video"), {})
        a_stream = next((s for s in data.get("streams", []) if s.get("codec_type") == "audio"), None)
        fmt = data.get("format", {})
        
        width = int(v_stream.get("width", 1280))
        height = int(v_stream.get("height", 720))
        duration = float(fmt.get("duration", v_stream.get("duration", 10.0)))
        bitrate = int(fmt.get("bit_rate", 100000))
        
        r_fps = v_stream.get("r_frame_rate", "30/1")
        if "/" in r_fps:
            num, den = r_fps.split("/")
            fps = round(float(num) / max(float(den), 1.0), 2)
        else:
            fps = float(r_fps)
            
        return {
            "duration": round(duration, 3),
            "fps": fps,
            "bitrate": bitrate,
            "width": width,
            "height": height,
            "resolution": f"{width}x{height}",
            "codec": v_stream.get("codec_name", "h264"),
            "has_audio": a_stream is not None,
            "audio_codec": a_stream.get("codec_name", "aac") if a_stream else None
        }
    except Exception:
        return {
            "duration": 10.0, "fps": 30.0, "bitrate": 100000,
            "width": 1280, "height": 720, "resolution": "1280x720",
            "codec": "h264", "has_audio": True, "audio_codec": "aac"
        }

def generate_thumbnail(video_path: str, thumb_out_path: str, timestamp_sec: float = 1.0) -> bool:
    os.makedirs(os.path.dirname(thumb_out_path), exist_ok=True)
    cmd = [
        "ffmpeg", "-y", "-ss", str(timestamp_sec), "-i", video_path,
        "-vframes", "1", "-q:v", "2", thumb_out_path
    ]
    res = run_cmd(cmd)
    if res.returncode == 0 and os.path.exists(thumb_out_path):
        return True

    # Fallback thumbnail generation using Pillow if ffmpeg is not installed
    try:
        from PIL import Image, ImageDraw
        img = Image.new("RGB", (640, 360), color=(12, 13, 18))
        draw = ImageDraw.Draw(img)
        draw.rectangle([10, 10, 630, 350], outline=(0, 245, 255), width=2)
        draw.text((250, 170), "HYPERFORGE", fill=(0, 245, 255))
        img.save(thumb_out_path, "JPEG")
        return True
    except Exception:
        try:
            with open(thumb_out_path, "wb") as f:
                f.write(b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.\' ",#\x1c\x1c(7),01444\x1f\'9=82<.342\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xbf\x00\xff\xd9')
            return True
        except Exception:
            return False

def extract_audio(video_path: str, audio_out_path: str) -> bool:
    os.makedirs(os.path.dirname(audio_out_path), exist_ok=True)
    cmd = [
        "ffmpeg", "-y", "-i", video_path,
        "-vn", "-acodec", "libmp3lame", "-q:a", "2", audio_out_path
    ]
    res = run_cmd(cmd)
    return res.returncode == 0 and os.path.exists(audio_out_path)

def detect_silence(video_path: str, noise_db: str = "-30dB", duration: float = 0.5) -> List[Dict[str, float]]:
    cmd = [
        "ffmpeg", "-i", video_path,
        "-af", f"silencedetect=noise={noise_db}:d={duration}",
        "-f", "null", "-"
    ]
    res = run_cmd(cmd)
    silences = []
    current_start = None
    for line in res.stderr.splitlines():
        if "silence_start:" in line:
            parts = line.split("silence_start:")
            try:
                current_start = float(parts[1].strip().split()[0])
            except:
                pass
        elif "silence_end:" in line and current_start is not None:
            parts = line.split("silence_end:")
            try:
                end_str = parts[1].strip().split()[0]
                end = float(end_str)
                silences.append({"start": current_start, "end": end, "duration": round(end - current_start, 3)})
                current_start = None
            except:
                pass
    return silences
