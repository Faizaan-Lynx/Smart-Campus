from sqlalchemy.orm import Session
from core.database import SessionLocal
from models.users import Users

def test_users_table():
    """Test inserting and fetching users from the database."""
    db: Session = SessionLocal()
    try:
        # Check if test user exists
        user_exists = db.query(Users).filter_by(username="testuser").first()

        if not user_exists:
            # Insert a test user
            new_user = Users(
                username="testuser",
                email="test@example.com",
                hashed_password="hashedpassword",
                is_admin=True,
                ip_address="127.0.0.1"
            )
            db.add(new_user)
            db.commit()
            print("✅ Test user inserted successfully.")

        # Fetch and print all users
        users = db.query(Users).all()
        print(f"📌 Users in database: {users}")
    except Exception as e:
        print(f"❌ Error interacting with Users table: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_users_table()
