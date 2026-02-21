from fastapi import FastAPI, Depends, UploadFile, File, Form, HTTPException, status
import os
import shutil
from typing import Optional, List
from database import engine, Base
from sqlalchemy.orm import Session
import models
import auth
import database
import schemas
from pydantic import BaseModel
from datetime import datetime
from fastapi.staticfiles import StaticFiles
from PIL import Image

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Tree Dataset Collection API")

# Ensure upload directories exist
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Mount static files for uploads
app.mount("/static", StaticFiles(directory=UPLOAD_DIR), name="static")

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Tree Dataset Collection API"}

from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import auth

@app.post("/auth/token")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username.lower()).first()
    if not user or not auth.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = auth.timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username, "role": user.role}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "role": user.role}

@app.get("/users/me")
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return {"username": current_user.username, "role": current_user.role}

@app.post("/register")
def register_user(user_data: schemas.UserRegister, db: Session = Depends(database.get_db)):
    # Check if user exists (case-insensitive)
    username_lower = user_data.username.lower()
    existing_user = db.query(models.User).filter(models.User.username == username_lower).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    new_user = models.User(
        username=username_lower,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        email=user_data.email,
        password_hash=auth.get_password_hash(user_data.password),
        role="client",
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User registered successfully"}

@app.put("/users/me/password")
def change_password(password_data: schemas.PasswordChange, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    if not auth.verify_password(password_data.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect old password")
    
    current_user.password_hash = auth.get_password_hash(password_data.new_password)
    db.commit()
    return {"message": "Password updated successfully"}

# ---- Admin User Management Endpoints ----

@app.get("/users")
def get_all_users(current_user: models.User = Depends(auth.get_current_admin_user), db: Session = Depends(database.get_db)):
    users = db.query(models.User).all()
    # Mask password hashes before returning
    for u in users:
        u.password_hash = None
    return users

@app.post("/users")
def create_user(user_data: schemas.UserCreateAdmin, current_user: models.User = Depends(auth.get_current_admin_user), db: Session = Depends(database.get_db)):
    username_lower = user_data.username.lower()
    existing_user = db.query(models.User).filter(models.User.username == username_lower).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    new_user = models.User(
        username=username_lower,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        email=user_data.email,
        password_hash=auth.get_password_hash(user_data.password),
        role=user_data.role,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    return {"message": "User created successfully"}

@app.put("/users/{user_id}")
def update_user(user_id: int, user_data: schemas.UserUpdateAdmin, current_user: models.User = Depends(auth.get_current_admin_user), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user_data.first_name is not None: user.first_name = user_data.first_name
    if user_data.last_name is not None: user.last_name = user_data.last_name
    if user_data.email is not None: user.email = user_data.email
    if user_data.role is not None: user.role = user_data.role
    if user_data.is_active is not None: user.is_active = user_data.is_active
    if user_data.password is not None and user_data.password != "":
        user.password_hash = auth.get_password_hash(user_data.password)
        
    db.commit()
    return {"message": "User updated successfully"}

@app.delete("/users/{user_id}")
def delete_user(user_id: int, current_user: models.User = Depends(auth.get_current_admin_user), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}

# ----------------------------------------


class EntryUpdate(BaseModel):
    notes: Optional[str] = None
    temperature: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

@app.get("/entries")
def get_entries(current_user: models.User = Depends(auth.get_current_admin_user), db: Session = Depends(database.get_db)):
    entries = db.query(models.TreeEntry).order_by(models.TreeEntry.timestamp.desc()).all()
    results = []
    for e in entries:
        e_dict = {c.name: getattr(e, c.name) for c in e.__table__.columns}
        user = db.query(models.User).filter(models.User.id == e.uploader_id).first()
        e_dict["uploader_username"] = user.username if user else "Unknown"
        results.append(e_dict)
    return results

@app.get("/entries/me")
def get_my_entries(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    entries = db.query(models.TreeEntry).filter(models.TreeEntry.uploader_id == current_user.id).order_by(models.TreeEntry.timestamp.desc()).all()
    return entries

@app.put("/entries/{entry_id}")
async def update_entry(
    entry_id: int, 
    notes: Optional[str] = Form(None),
    temperature: Optional[float] = Form(None),
    audio: Optional[UploadFile] = File(None),
    delete_audio: Optional[bool] = Form(False),
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(database.get_db)
):
    entry = db.query(models.TreeEntry).filter(models.TreeEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
        
    if current_user.role != "admin" and entry.uploader_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this entry")
    
    if notes is not None:
        entry.notes = notes
    if temperature is not None:
        entry.temperature = temperature
        
    if delete_audio and entry.audio_path:
        old_audio_path = os.path.join(UPLOAD_DIR, entry.audio_path)
        if os.path.exists(old_audio_path):
            os.remove(old_audio_path)
        entry.audio_path = None
        entry.audio_size_bytes = None
        
    if audio:
        ext = os.path.splitext(audio.filename)[1]
        unique_filename = f"audio_{entry_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}{ext}"
        filepath = os.path.join(UPLOAD_DIR, unique_filename)
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)
        
        # remove old audio file if replacing
        if entry.audio_path:
             old_audio_path = os.path.join(UPLOAD_DIR, entry.audio_path)
             if os.path.exists(old_audio_path):
                 os.remove(old_audio_path)
                 
        entry.audio_path = unique_filename
        entry.audio_size_bytes = os.path.getsize(filepath)
        
    db.commit()
    db.refresh(entry)
    return entry

@app.delete("/entries/{entry_id}")
async def delete_entry_data(
    entry_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    entry = db.query(models.TreeEntry).filter(models.TreeEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
        
    if current_user.role != "admin" and entry.uploader_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this entry")
        
    # Delete associated files
    if entry.image_path:
        img_path = os.path.join(UPLOAD_DIR, entry.image_path)
        if os.path.exists(img_path):
            os.remove(img_path)
            
    if entry.audio_path:
        aud_path = os.path.join(UPLOAD_DIR, entry.audio_path)
        if os.path.exists(aud_path):
            os.remove(aud_path)
            
    db.delete(entry)
    db.commit()
    return {"message": "Entry deleted successfully"}

@app.post("/upload")
async def upload_entry(
    image: UploadFile = File(...),
    audio: Optional[UploadFile] = File(None),
    notes: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    temperature: Optional[float] = Form(None),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    # Save Image
    image_ext = image.filename.split(".")[-1]
    image_filename = f"img_{current_user.id}_{int(auth.datetime.utcnow().timestamp())}.{image_ext}"
    image_path = os.path.join(UPLOAD_DIR, image_filename)
    with open(image_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)
        
    image_size_bytes = os.path.getsize(image_path)
    try:
        with Image.open(image_path) as img:
            image_width, image_height = img.size
    except Exception:
        image_width, image_height = None, None
        
    audio_path = None
    audio_size_bytes = None
    if audio:
        audio_ext = audio.filename.split(".")[-1]
        audio_filename = f"aud_{current_user.id}_{int(auth.datetime.utcnow().timestamp())}.{audio_ext}"
        audio_path_full = os.path.join(UPLOAD_DIR, audio_filename)
        with open(audio_path_full, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)
        audio_path = audio_filename
        audio_size_bytes = os.path.getsize(audio_path_full)
        
    new_entry = models.TreeEntry(
        image_path=image_filename,
        audio_path=audio_path,
        notes=notes,
        latitude=latitude,
        longitude=longitude,
        temperature=temperature,
        image_width=image_width,
        image_height=image_height,
        image_size_bytes=image_size_bytes,
        audio_size_bytes=audio_size_bytes,
        uploader_id=current_user.id
    )
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    
    return {"message": "Upload successful", "entry_id": new_entry.id}

