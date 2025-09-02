from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Form
from sqlalchemy.orm import Session
import os
from datetime import datetime
from typing import List

from ..db import get_db
from ..models import User, Photo
from ..auth import get_current_user

router = APIRouter(prefix="/photos")

UPLOAD_DIR = "uploads/photos"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_photo(
    photo: UploadFile = File(...),
    confidence: float = Form(...),  # Confidence score from the face detection
    user_id: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only allow users to upload their own photos or admins to upload for anyone
    if user_id and user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to upload photos for other users")
    
    # Convert confidence to percentage and ensure it's between 0-100
    confidence_percentage = min(max(int(confidence * 100), 0), 100)
    target_user_id = user_id or current_user.id
    
    # Generate unique filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{target_user_id}_{timestamp}.jpg"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    # Save the file
    try:
        with open(filepath, "wb") as buffer:
            contents = await photo.read()
            buffer.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Create database record
    db_photo = Photo(
        user_id=target_user_id,
        filename=filename,
        uploaded_at=datetime.now(),
        confidence_score=confidence_percentage
    )
    db.add(db_photo)
    db.commit()
    db.refresh(db_photo)
    
    return {
        "id": db_photo.id,
        "url": f"/photos/{filename}",
        "timestamp": db_photo.uploaded_at,
        "confidence": confidence_percentage
    }

@router.get("/user/{user_id}")
async def get_user_photos(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[dict]:
    # Users can only view their own photos unless they're admin
    if user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to view other users' photos")
    
    photos = db.query(Photo).filter(Photo.user_id == user_id).all()
    return [{
        "id": photo.id,
        "url": f"/photos/{photo.filename}",
        "timestamp": photo.uploaded_at
    } for photo in photos]

@router.delete("/{photo_id}")
async def delete_photo(
    photo_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # Only allow users to delete their own photos or admins to delete any photo
    if photo.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this photo")
    
    # Delete file
    try:
        filepath = os.path.join(UPLOAD_DIR, photo.filename)
        if os.path.exists(filepath):
            os.remove(filepath)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")
    
    # Delete database record
    db.delete(photo)
    db.commit()
    
    return {"message": "Photo deleted successfully"}
