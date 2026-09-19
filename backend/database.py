import os
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "hyperforge")

client = None
db = None

async def init_db():
    global client, db
    try:
        motor_client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=1500)
        await motor_client.server_info()
        client = motor_client
        db = client[DB_NAME]
        print("Connected to MongoDB successfully.")
    except Exception as e:
        print(f"MongoDB not reachable ({e}). Falling back to in-memory async database (mongomock-motor).")
        from mongomock_motor import AsyncMongoMockClient
        client = AsyncMongoMockClient()
        db = client[DB_NAME]

    # Auto-seed default demo account if not present
    try:
        from auth import hash_password
        existing_demo = await db.users.find_one({"email": "demo@hyperforge.ai"})
        if not existing_demo:
            user_id = uuid.uuid4().hex
            now_iso = datetime.now(timezone.utc).isoformat()
            demo_user = {
                "id": user_id,
                "email": "demo@hyperforge.ai",
                "password_hash": hash_password("password123"),
                "full_name": "Demo Creator",
                "created_at": now_iso
            }
            await db.users.insert_one(demo_user)
            print("Seeded default demo account (email: demo@hyperforge.ai / password: password123)")
    except Exception as seed_err:
        print(f"Demo seeding notice: {seed_err}")

def get_db():
    global client, db
    if db is None:
        try:
            client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=1500)
            db = client[DB_NAME]
        except Exception:
            from mongomock_motor import AsyncMongoMockClient
            client = AsyncMongoMockClient()
            db = client[DB_NAME]
    return db
