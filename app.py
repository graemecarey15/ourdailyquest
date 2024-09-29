import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.exc import SQLAlchemyError

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)
app = Flask(__name__)

# Use the DATABASE_URL environment variable
database_url = os.environ.get("DATABASE_URL")
if database_url and database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db.init_app(app)

with app.app_context():
    try:
        # Import models here
        from models import User, Task
        
        # Create tables
        db.create_all()
        
        # Create users if they don't exist
        def create_users():
            if not User.query.filter_by(name='G').first():
                user_g = User(name='G')
                db.session.add(user_g)
            if not User.query.filter_by(name='A').first():
                user_a = User(name='A')
                db.session.add(user_a)
            db.session.commit()
        
        create_users()
        print("Database tables created and users initialized successfully.")
    except SQLAlchemyError as e:
        print(f"An error occurred while setting up the database: {str(e)}")

# Import routes after database initialization
from routes import *

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
