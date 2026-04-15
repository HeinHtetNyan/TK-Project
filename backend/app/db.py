import os
import logging
from sqlmodel import create_engine, Session
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

# echo=True logs every SQL query — off in production, enable with DB_ECHO=true for debugging
_echo = os.environ.get("DB_ECHO", "false").lower() == "true"
engine = create_engine(DATABASE_URL, echo=_echo)

def init_db():
    # Schema creation is now handled by Alembic migrations
    logger.info("Database initialized. Migrations should be handled manually.")

def get_session():
    with Session(engine) as session:
        yield session
