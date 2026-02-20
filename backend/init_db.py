import sys
from database import SessionLocal, engine
from models import Base, User
from auth import get_password_hash

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Check if admin exists
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        print("Creating default admin user...")
        admin_password = get_password_hash("admin123") # Default password
        admin_user = User(
            username="admin", 
            first_name="Admin",
            last_name="System",
            email="admin@example.com",
            password_hash=admin_password, 
            role="admin",
            is_active=True
        )
        db.add(admin_user)
        
    # Check if client exists
    client = db.query(User).filter(User.username == "client").first()
    if not client:
        print("Creating default client user...")
        client_password = get_password_hash("client123")
        client_user = User(
            username="client", 
            first_name="Demo",
            last_name="Client",
            email="client@example.com",
            password_hash=client_password, 
            role="client",
            is_active=True
        )
        db.add(client_user)
        
    db.commit()
    db.close()
    print("Database initialized successfully.")

if __name__ == "__main__":
    init_db()
