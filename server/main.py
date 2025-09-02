from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from db import get_db
import models, auth, schemas
from routers import photos

app = FastAPI()

# Mount the photos directory for serving uploaded files
app.mount("/photos", StaticFiles(directory="uploads/photos"), name="photos")

# Include the photos router
app.include_router(photos.router)

# Allow frontend (adjust if needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # in dev, allow all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/auth/register", response_model=schemas.Token)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_pw = auth.get_password_hash(user.password)
    new_user = models.User(username=user.username, password_hash=hashed_pw)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    token = auth.create_access_token({"sub": new_user.username})
    return {"access_token": token, "token_type": "bearer"}

import json
import random

@app.post("/auth/login", response_model=schemas.Token)
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if not db_user or not auth.verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = auth.create_access_token({"sub": db_user.username})
    return {"access_token": token, "token_type": "bearer"}

from typing import List

@app.post("/faces/register", status_code=status.HTTP_201_CREATED)
def register_face(embedding: List[float], db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    # The frontend is now sending the embedding directly.
    # We just need to serialize it to a JSON string for storage.
    embedding_json = json.dumps(embedding)

    new_face = models.Face(user_id=current_user.id, embedding=embedding_json)
    db.add(new_face)
    db.commit()
    db.refresh(new_face)

    return {"message": "Face saved", "face_id": new_face.id}
