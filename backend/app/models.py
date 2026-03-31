from __future__ import annotations

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from .database import Base
from .utils import utcnow


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True)
    employee_code = Column(String(32), unique=True, nullable=False, index=True)
    name = Column(String(120), nullable=False)
    department = Column(String(80), nullable=False)
    title = Column(String(80), nullable=False)
    baseline_profile = Column(Text, nullable=False, default="{}")
    current_risk_score = Column(Float, nullable=False, default=0.0)
    current_risk_level = Column(String(16), nullable=False, default="Low")
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

    activities = relationship("ActivityLog", back_populates="employee", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="employee", cascade="all, delete-orphan")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    event_type = Column(String(40), nullable=False, index=True)
    source = Column(String(40), nullable=False, default="simulation")
    mode = Column(String(20), nullable=False, default="simulation")
    severity = Column(String(20), nullable=False, default="low")
    risk_delta = Column(Float, nullable=False, default=0.0)
    risk_reasons = Column(Text, nullable=False, default="[]")
    details = Column(Text, nullable=False, default="{}")
    happened_at = Column(DateTime(timezone=True), nullable=False, default=utcnow, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

    employee = relationship("Employee", back_populates="activities")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    risk_score = Column(Float, nullable=False)
    risk_level = Column(String(16), nullable=False)
    reasons = Column(Text, nullable=False, default="[]")
    channel = Column(String(24), nullable=False, default="dashboard")
    status = Column(String(24), nullable=False, default="pending")
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    sent_at = Column(DateTime(timezone=True), nullable=True)

    employee = relationship("Employee", back_populates="alerts")


class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(24), nullable=False, default="admin")
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
