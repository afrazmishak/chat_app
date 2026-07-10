import bcrypt
import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from fastapi.staticfiles import StaticFiles
from datetime import datetime, timedelta
from database import (
    save_user, 
    save_room_message, 
    save_private_message,
    get_room_messages,
    get_private_messages,
    get_user_rooms,
    save_room_member,
    get_private_conversations,
    get_user_by_email,
    get_profile,
    update_profile,
    update_last_seen,
    set_user_online,
    mark_room_message_seen,
    edit_room_message,
    delete_room_message,
    search_room_messages,
)
from pydantic import BaseModel
from database import create_user
from jose import jwt, JWTError
from message_builder import build_room_message, build_private_message

SECRET_KEY = "change-this-secret-key-later"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

app = FastAPI()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def create_access_token(data: dict):
    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    to_encode.update({"exp": expire})

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload

    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

class SignupRequest(BaseModel):
    username: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class ProfileUpdateRequest(BaseModel):
    bio: str | None = None
    avatar_url: str | None = None

@app.get("/")
def home():
    return {"message": "Chat backend is running"}

@app.post("/signup")
def signup(user: SignupRequest):
    try:
        password_hash = bcrypt.hashpw(
            user.password.encode("utf-8"),
            bcrypt.gensalt()
        ).decode("utf-8")

        new_user = create_user(
            user.username,
            user.email,
            password_hash
        )

        if not new_user:
            return {"error": "Username or email already exists"}

        return {
            "message": "User created successfully",
            "user": new_user
        }

    except Exception as e:
        return {
            "error": str(e)
        }

@app.post("/login")
def login(user: LoginRequest):
    db_user = get_user_by_email(user.email)

    if not db_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    password_valid = bcrypt.checkpw(
        user.password.encode("utf-8"),
        db_user["password_hash"].encode("utf-8")
    )

    if not password_valid:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    access_token = create_access_token({
        "sub": db_user["email"],
        "username": db_user["username"]
    })

    return {
        "message": "Login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": db_user["id"],
            "username": db_user["username"],
            "email": db_user["email"]
        }
    }

@app.get("/rooms/{room_name}/messages")
def room_message_history(
    room_name: str,
    current_user: dict = Depends(get_current_user)
):
    return get_room_messages(room_name)

@app.get("/private/{user1}/{user2}/messages")
def private_message_history(
    user1: str, 
    user2: str,
    current_user: dict = Depends(get_current_user)
):
    if current_user["username"] != user1:
        raise HTTPException(
            status_code=403,
            detail="Access denied"
        )

    return get_private_messages(user1, user2)

@app.get("/users/{username}/rooms")
def user_rooms(username: str, current_user: dict = Depends(get_current_user)):
    if current_user["username"] != username:
        raise HTTPException(
            status_code=403,
            detail="Access denied"
        )

    return get_user_rooms(username)

@app.get("/users/{username}/private-conversations")
def user_private_conversations(username: str, current_user: dict = Depends(get_current_user)):
    if current_user["username"] != username:
        raise HTTPException(
            status_code=403,
            detail="Access denied"
        )

    return get_private_conversations(username)

@app.get("/rooms/{room_name}/search")
def search_messages(
    room_name: str,
    q: str,
    current_user: dict = Depends(get_current_user)
):
    return search_room_messages(room_name, q)

class ConnectionManager:
    def __init__(self):
        self.rooms = {}
        self.users = {}
        self.active_users = {}

    async def connect(self, room: str, username: str, websocket: WebSocket):
        await websocket.accept()

        if room not in self.rooms:
            self.rooms[room] = []
            self.users[room] = []

        self.rooms[room].append(websocket)
        self.users[room].append(username)
        self.active_users[username] = websocket

    def disconnect(self, room: str, username: str, websocket: WebSocket):
        if room in self.rooms:
            if websocket in self.rooms[room]:
                self.rooms[room].remove(websocket)

            if username in self.users[room]:
                self.users[room].remove(username)

                if self.active_users.get(username) == websocket:
                    del self.active_users[username]

            if len(self.rooms[room]) == 0:
                del self.rooms[room]
                del self.users[room]

    async def broadcast(self, room: str, data: dict):
        disconnected = []

        for connection in self.rooms.get(room, []):
            try:
                await connection.send_json(data)
            except WebSocketDisconnect:
                disconnected.append(connection)
            except RuntimeError:
                disconnected.append(connection)

        for connection in disconnected:
            if connection in self.rooms.get(room, []):
                self.rooms[room].remove(connection)

    async def broadcast_users(self, room: str):
        await self.broadcast(room, {
            "type": "users",
            "users": self.users.get(room, [])
        })

    async def broadcast_global_users(self):
        global_users = list(self.active_users.keys())
        disconnected_users = []
        
        for username, connection in self.active_users.items():
            try:
                await connection.send_json({
                "type": "global_users",
                "users": global_users
                })
            except RuntimeError:
                disconnected_users.append(username)
            except WebSocketDisconnect:
                disconnected_users.append(username)

        for username in disconnected_users:
            if username in self.active_users:
                del self.active_users[username]

    async def send_private_message(self, sender: str, receiver: str, data: dict):
        sender_socket = self.active_users.get(sender)
        receiver_socket = self.active_users.get(receiver)

        if sender_socket:
            await sender_socket.send_json(data)

        if receiver_socket and receiver_socket != sender_socket:
            await receiver_socket.send_json(data)

manager = ConnectionManager()


@app.websocket("/ws/{room}/{username}")
async def websocket_endpoint(
    websocket: WebSocket,
    room: str,
    username: str,
    token: str
):

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        if payload["username"] != username:
            await websocket.close(code=1008)
            return
    
    except JWTError:
        await websocket.close(code=1008)
        return

    await manager.connect(room, username, websocket)
    set_user_online(username, True)

    save_user(username)
    save_room_member(username, room)
    
    await manager.broadcast(room, {
        "type": "system",
        "text": f"{username}: joined the room"
        })
    
    await manager.broadcast_users(room)
    await manager.broadcast_global_users()

    try:
        while True:
            raw_message = await websocket.receive_json()

            print(raw_message)

            timestamp = datetime.now().strftime("%H:%M")

            if raw_message["type"] == "typing":
                await manager.broadcast(
                    room,
                    {
                        "type": "typing",
                        "username": username
                    }
                )

                continue

            if raw_message["type"] == "message_seen":
                message_id = raw_message["message_id"]

                mark_room_message_seen(message_id, username)

                await manager.broadcast(room, {
                    "type": "message_seen",
                    "message_id": message_id,
                    "username": username
                })

                continue

            if raw_message["type"] == "edit_room_message":
                updated = edit_room_message(
                    raw_message["message_id"],
                    username,
                    raw_message["text"]
                )

                if updated:
                    await manager.broadcast(room, {
                        "type": "room_message_edited",
                        "message_id": raw_message["message_id"],
                        "text": raw_message["text"],
                        "edited": True,
                        "edited_at": datetime.now().strftime("%H:%M")
                    })

                continue

            if raw_message["type"] == "delete_room_message":
                try:
                    print("Deleting message:", raw_message)
                    
                    deleted = delete_room_message(
                        raw_message["message_id"],
                        username
                    )

                    print("Deleted result:", deleted)

                    if deleted:
                        await manager.broadcast(room, {
                            "type": "room_message_deleted",
                            "message_id": raw_message["message_id"],
                            "deleted": True,
                            'deleted_at': datetime.now().strftime("%H:%M")
                        })

                    continue

                except Exception as e:
                    print("DELETE ERROR:", e)
                    continue

            if raw_message["type"] == "room_message":
                reply_to_message_id = raw_message.get("reply_to_message_id")
                attachments = raw_message.get("attachments", [])

                message_id = save_room_message(
                    room,
                    username,
                    raw_message["text"],
                    reply_to_message_id,
                    attachments
                )

                message = build_room_message(
                    message_id,
                    username,
                    room,
                    raw_message["text"],
                    timestamp
                )

                message["reply_to"] = reply_to_message_id
                message["reply_preview"] = None
                message["attachments"] = attachments

                if reply_to_message_id:
                    history = get_room_messages(room)

                    for old_message in history:
                        if old_message["id"] == reply_to_message_id:
                            message["reply_preview"] = {
                                "username": old_message["username"],
                                "text": old_message["text"],
                                "deleted": old_message.get("deleted", False),
                            }
                            break

                await manager.broadcast(room, message)

            elif raw_message["type"] == "private_message":
                receiver = raw_message["to"]

                message_id = save_private_message(
                    username,
                    receiver,
                    raw_message["text"]
                )

                message = build_private_message(
                    message_id,
                    username,
                    receiver,
                    raw_message["text"],
                    timestamp
                )

                await manager.send_private_message(username, receiver, message)

    except (WebSocketDisconnect, RuntimeError):
        manager.disconnect(room, username, websocket)
        set_user_online(username, False)
        update_last_seen(username)

        try:
            await manager.broadcast(room, {
                "type": "system",
                "text": f"System: {username} left the room"
            })
            
            await manager.broadcast_users(room)
            await manager.broadcast_global_users()

        except RuntimeError:
            pass

@app.get("/profile")
def profile(current_user: dict = Depends(get_current_user)):
    return get_profile(current_user["username"])

@app.put("/profile")
def edit_profile(
    profile_data: ProfileUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    return update_profile(
        current_user["username"],
        profile_data.bio,
        profile_data.avatar_url
    )

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    file_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    return {
        "filename": file.filename,
        "url": f"http://127.0.0.1:8000/uploads/{file.filename}",
        "content_type": file.content_type
    }