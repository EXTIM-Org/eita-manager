from datetime import datetime, timezone
from sqlalchemy import Column, Integer, BigInteger, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database.connection import Base

def utc_now():
    return datetime.now(timezone.utc)

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    internal_id = Column(String(50), unique=True, index=True, nullable=False)
    label = Column(String(100), nullable=True)
    phone_masked = Column(String(30), nullable=False)
    phone_raw = Column(String(30), nullable=True)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    username = Column(String(100), nullable=True)
    status = Column(String(30), default="CONNECTED") # CONNECTED, NEEDS_REAUTH, BUSY, RESTRICTED
    total_channels_cached = Column(Integer, default=0)
    total_groups_cached = Column(Integer, default=0)
    last_login_at = Column(DateTime, default=utc_now)
    last_cleaned_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    session = relationship("SessionRecord", back_populates="account", uselist=False, cascade="all, delete-orphan")
    jobs = relationship("CleaningJob", back_populates="account", cascade="all, delete-orphan")
    dialogs = relationship("DialogSnapshot", back_populates="account", cascade="all, delete-orphan")

class SessionRecord(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, unique=True)
    encrypted_session_data = Column(Text, nullable=False)
    crypto_iv = Column(String(64), nullable=False)
    crypto_salt = Column(String(64), nullable=False)
    is_valid = Column(Boolean, default=True)
    last_verified_at = Column(DateTime, default=utc_now)

    account = relationship("Account", back_populates="session")

class CleaningJob(Base):
    __tablename__ = "cleaning_jobs"

    id = Column(String(64), primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(30), default="PENDING") # PENDING, RUNNING, PAUSED, COMPLETED, FAILED, ABORTED
    total_targets = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    fail_count = Column(Integer, default=0)
    remaining_count = Column(Integer, default=0)
    started_at = Column(DateTime, default=utc_now)
    finished_at = Column(DateTime, nullable=True)
    failure_summary = Column(Text, nullable=True)

    account = relationship("Account", back_populates="jobs")
    items = relationship("JobItem", back_populates="job", cascade="all, delete-orphan")

class JobItem(Base):
    __tablename__ = "job_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    job_id = Column(String(64), ForeignKey("cleaning_jobs.id", ondelete="CASCADE"), nullable=False)
    peer_id = Column(String(50), nullable=False)
    peer_type = Column(String(30), nullable=False) # channel, supergroup, basic_group
    peer_title = Column(String(255), nullable=True)
    status = Column(String(30), default="QUEUED") # QUEUED, LEFT_SUCCESS, ERROR, SKIPPED_ADMIN
    error_code = Column(String(50), nullable=True)
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    processed_at = Column(DateTime, nullable=True)

    job = relationship("CleaningJob", back_populates="items")

class DialogSnapshot(Base):
    __tablename__ = "dialog_snapshots"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    peer_id = Column(String(50), nullable=False)
    peer_type = Column(String(30), nullable=False) # channel, supergroup, basic_group
    title = Column(String(255), nullable=True)
    access_hash = Column(BigInteger, default=0)
    members_count = Column(Integer, default=0)
    is_creator = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)
    scanned_at = Column(DateTime, default=utc_now)

    account = relationship("Account", back_populates="dialogs")
