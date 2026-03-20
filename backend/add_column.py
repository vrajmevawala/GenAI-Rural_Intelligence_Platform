from database import engine
from sqlalchemy import text

def add_column():
    with engine.connect() as con:
        try:
            con.execute(text("ALTER TABLE farmers ADD COLUMN profile_photo TEXT"))
            con.commit()
            print("Column profile_photo added successfully")
        except Exception as e:
            print(f"Error adding column: {e}")

if __name__ == "__main__":
    add_column()
