from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from database import Base
import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    password_hash = Column(String)
    role = Column(String) # 'admin' or 'client'
    is_active = Column(Boolean, default=True) # "admin" or "client"

class TreeEntry(Base):
    __tablename__ = "tree_entries"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    image_path = Column(String)
    audio_path = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    temperature = Column(Float, nullable=True)
    image_width = Column(Integer, nullable=True)
    image_height = Column(Integer, nullable=True)
    image_size_bytes = Column(Integer, nullable=True)
    audio_size_bytes = Column(Integer, nullable=True)
    uploader_id = Column(Integer, ForeignKey("users.id"))
