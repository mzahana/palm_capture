import sqlite3
import os

# Define database path
DB_PATH = os.path.join(os.path.dirname(__file__), "sql_app.db")

def migrate_usernames():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}. Nothing to migrate.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Check if users table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        if not cursor.fetchone():
            print("Users table not found. Nothing to migrate.")
            return

        # Fetch all usernames
        cursor.execute("SELECT id, username FROM users")
        users = cursor.fetchall()
        
        migrated_count = 0
        for user_id, username in users:
            lower_username = username.lower()
            if lower_username != username:
                cursor.execute("UPDATE users SET username = ? WHERE id = ?", (lower_username, user_id))
                migrated_count += 1
                print(f"Migrated user ID {user_id}: '{username}' -> '{lower_username}'")
        
        conn.commit()
        print(f"Successfully migrated {migrated_count} usernames to lowercase.")
        
    except sqlite3.Error as e:
        print(f"An error occurred: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_usernames()
