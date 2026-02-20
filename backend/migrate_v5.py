import sqlite3
import os
from PIL import Image

DB_PATH = os.path.join(os.path.dirname(__file__), "sql_app.db")
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Add new columns (ignore if they already exist)
    columns = [
        "image_width INTEGER",
        "image_height INTEGER",
        "image_size_bytes INTEGER",
        "audio_size_bytes INTEGER"
    ]
    
    for col in columns:
        try:
            cursor.execute(f"ALTER TABLE tree_entries ADD COLUMN {col}")
            print(f"Added column {col}")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                pass
            else:
                print(f"Error adding {col}: {e}")

    # Backfill missing data for existing records
    cursor.execute("SELECT id, image_path, audio_path FROM tree_entries")
    rows = cursor.fetchall()
    
    for row in rows:
        entry_id, img_path, aud_path = row
        img_width, img_height, img_size = None, None, None
        aud_size = None
        
        if img_path:
            full_img = os.path.join(UPLOAD_DIR, img_path)
            if os.path.exists(full_img):
                img_size = os.path.getsize(full_img)
                try:
                    with Image.open(full_img) as img:
                        img_width, img_height = img.size
                except Exception:
                    pass
                    
        if aud_path:
            full_aud = os.path.join(UPLOAD_DIR, aud_path)
            if os.path.exists(full_aud):
                aud_size = os.path.getsize(full_aud)
                
        cursor.execute("""
            UPDATE tree_entries 
            SET image_width=?, image_height=?, image_size_bytes=?, audio_size_bytes=?
            WHERE id=?
        """, (img_width, img_height, img_size, aud_size, entry_id))
        
    conn.commit()
    conn.close()
    print("Migration and backfill complete.")

if __name__ == "__main__":
    migrate()
