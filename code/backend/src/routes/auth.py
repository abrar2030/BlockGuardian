"""
Authentication API routes for BlockGuardian Backend
Implements secure authentication, registration, and session management
"""

import json
from typing import Any

from flask import Blueprint, g, jsonify, request
from flask_jwt_extended import get_jwt
from src.models.user import User, UserStatus, db
from src.security.audit import AuditEventType, audit_logger
from src.security.auth import auth_manager, jwt_required
from src.security.rate_limiting import RateLimitScope, rate_limit
from src.security.validation import ValidationError, security_validator

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
@rate_limit(limit=5, window=300, scope=RateLimitScope.PER_IP)
def register() -> Any:
    """Register a new user account"""
    try:
        security_validator.validate_request_size()
        data = security_validator.validate_json_input(request.get_json())
        required_fields = ["email", "username", "password", "first_name", "last_name"]
        for field in required_fields:
            if field not in data:
                return (jsonify({"error": f"{field} is required"}), 400)
        email = security_validator.validate_email(data["email"])
        username = security_validator.validate_username(data["username"])
        security_validator.validate_password(data["password"])
        threats = security_validator.check_security_threats(json.dumps(data))
        if threats:
            audit_logger.log_security_alert(
                "registration_security_threat",
                details={"threats": threats},
            )
            return (jsonify({"error": "Invalid input detected"}), 400)
        existing_user = (
            db.session.query(User)
            .filter((User.email == email) | (User.username == username))
            .first()
        )
        if existing_user:
            audit_logger.log_authentication_event(
                AuditEventType.LOGIN_FAILURE,
                success=False,
                details={
                    "reason": "user_already_exists",
                    "email": email,
                    "username": username,
                },
            )
            return (jsonify({"error": "User already exists"}), 409)
        user = User(
            email=email,
            username=username,
            first_name=data["first_name"],
            last_name=data["last_name"],
            status=UserStatus.ACTIVE,
        )
        user.set_password(data["password"])
        if "phone_number" in data:
            user.set_encrypted_field("phone_number", data["phone_number"], "pii")
        elif "phone" in data:
            user.set_encrypted_field("phone_number", data["phone"], "pii")
        if "country" in data:
            user.country = data["country"]
        db.session.add(user)
        db.session.commit()
        audit_logger.log_authentication_event(
            AuditEventType.LOGIN_SUCCESS,
            user_id=user.id,
            success=True,
            details={
                "action": "registration",
                "email": email,
                "username": username,
            },
        )
        tokens = auth_manager.generate_tokens(
            user.id, user.role.value, auth_manager.get_user_permissions(user.role)
        )
        return (
            jsonify(
                {
                    "message": "User registered successfully",
                    "user": user.to_dict(include_sensitive=True),
                    "tokens": tokens,
                }
            ),
            201,
        )
    except ValidationError as e:
        db.session.rollback()
        return (jsonify({"error": e.message, "field": e.field}), 400)
    except Exception as e:
        db.session.rollback()
        audit_logger.log_security_alert("registration_error", details={"error": str(e)})
        return (jsonify({"error": "Registration failed"}), 500)


@auth_bp.route("/login", methods=["POST"])
@rate_limit(limit=10, window=300, scope=RateLimitScope.PER_IP)
def login() -> Any:
    """Authenticate user and return tokens"""
    try:
        security_validator.validate_request_size()
        data = security_validator.validate_json_input(request.get_json())
        if "email" not in data or "password" not in data:
            return (jsonify({"error": "Email and password are required"}), 400)
        email = security_validator.validate_email(data["email"])
        threats = security_validator.check_security_threats(json.dumps(data))
        if threats:
            audit_logger.log_security_alert(
                "login_security_threat", details={"threats": threats, "email": email}
            )
            return (jsonify({"error": "Invalid input detected"}), 400)
        user = db.session.query(User).filter(User.email == email).first()
        if not user:
            audit_logger.log_authentication_event(
                AuditEventType.LOGIN_FAILURE,
                success=False,
                details={"reason": "user_not_found", "email": email},
            )
            return (jsonify({"error": "Invalid credentials"}), 401)
        if user.is_locked():
            audit_logger.log_authentication_event(
                AuditEventType.LOGIN_FAILURE,
                user_id=user.id,
                success=False,
                details={
                    "reason": "account_locked",
                    "locked_until": (
                        user.locked_until.isoformat() if user.locked_until else None
                    ),
                },
            )
            return (jsonify({"error": "Account is locked"}), 423)
        if not user.verify_password(data["password"]):
            user.increment_login_attempts()
            db.session.commit()
            audit_logger.log_authentication_event(
                AuditEventType.LOGIN_FAILURE,
                user_id=user.id,
                success=False,
                details={
                    "reason": "invalid_password",
                    "login_attempts": user.login_attempts,
                },
            )
            return (jsonify({"error": "Invalid credentials"}), 401)
        if user.mfa_enabled:
            mfa_token = data.get("mfa_token")
            if not mfa_token:
                return (
                    jsonify({"error": "MFA token required", "mfa_required": True}),
                    200,
                )
            if not user.verify_mfa_token(mfa_token):
                audit_logger.log_authentication_event(
                    AuditEventType.LOGIN_FAILURE,
                    user_id=user.id,
                    success=False,
                    details={"reason": "invalid_mfa_token"},
                )
                return (jsonify({"error": "Invalid MFA token"}), 401)
        if user.status != UserStatus.ACTIVE:
            audit_logger.log_authentication_event(
                AuditEventType.LOGIN_FAILURE,
                user_id=user.id,
                success=False,
                details={"reason": "account_inactive", "status": user.status.value},
            )
            return (jsonify({"error": f"Account is {user.status.value}"}), 403)
        user.successful_login()
        db.session.commit()
        audit_logger.log_authentication_event(
            AuditEventType.LOGIN_SUCCESS,
            user_id=user.id,
            success=True,
            details={"email": email},
        )
        tokens = auth_manager.generate_tokens(
            user.id, user.role.value, auth_manager.get_user_permissions(user.role)
        )
        return (
            jsonify(
                {
                    "message": "Login successful",
                    "user": user.to_dict(),
                    "tokens": tokens,
                }
            ),
            200,
        )
    except ValidationError as e:
        return (jsonify({"error": e.message, "field": e.field}), 400)
    except Exception as e:
        db.session.rollback()
        audit_logger.log_security_alert("login_error", details={"error": str(e)})
        return (jsonify({"error": "Login failed"}), 500)


@auth_bp.route("/logout", methods=["POST"])
@jwt_required
def logout() -> Any:
    """Logout user and revoke tokens"""
    try:
        jwt_claims = get_jwt()
        jti = jwt_claims.get("jti")
        if jti:
            auth_manager.revoke_token(jti, expires_in=3600)
            audit_logger.log_authentication_event(
                AuditEventType.LOGOUT, user_id=g.current_user_id, success=True
            )
            return (jsonify({"message": "Logout successful"}), 200)
        return (jsonify({"error": "No token provided"}), 400)
    except Exception:
        return (jsonify({"error": "Logout failed"}), 500)


@auth_bp.route("/refresh", methods=["POST"])
@rate_limit(limit=20, window=300, scope=RateLimitScope.PER_IP)
def refresh_token() -> Any:
    """Refresh access token using refresh token"""
    try:
        data = request.get_json()
        if not data or "refresh_token" not in data:
            return (jsonify({"error": "Refresh token is required"}), 400)
        new_tokens = auth_manager.refresh_access_token(data["refresh_token"])
        if not new_tokens:
            return (jsonify({"error": "Invalid refresh token"}), 401)
        return (
            jsonify({"message": "Token refreshed successfully", "tokens": new_tokens}),
            200,
        )
    except Exception:
        return (jsonify({"error": "Token refresh failed"}), 500)


@auth_bp.route("/setup-mfa", methods=["POST"])
@jwt_required
def setup_mfa() -> Any:
    """Set up multi-factor authentication"""
    try:
        user = db.session.get(User, g.current_user_id)
        if not user:
            return (jsonify({"error": "User not found"}), 404)
        secret, qr_code, backup_codes = user.setup_mfa()
        db.session.commit()
        return (
            jsonify(
                {
                    "message": "MFA setup initiated",
                    "secret": secret,
                    "qr_code": qr_code,
                    "backup_codes": backup_codes,
                }
            ),
            200,
        )
    except Exception:
        db.session.rollback()
        return (jsonify({"error": "MFA setup failed"}), 500)


@auth_bp.route("/enable-mfa", methods=["POST"])
@jwt_required
def enable_mfa() -> Any:
    """Enable MFA after verifying token"""
    try:
        data = request.get_json()
        if not data or "token" not in data:
            return (jsonify({"error": "MFA token is required"}), 400)
        user = db.session.get(User, g.current_user_id)
        if not user:
            return (jsonify({"error": "User not found"}), 404)
        if user.enable_mfa(data["token"]):
            db.session.commit()
            audit_logger.log_authentication_event(
                AuditEventType.MFA_ENABLED, user_id=user.id, success=True
            )
            return (jsonify({"message": "MFA enabled successfully"}), 200)
        else:
            return (jsonify({"error": "Invalid MFA token"}), 400)
    except Exception:
        db.session.rollback()
        return (jsonify({"error": "MFA enable failed"}), 500)


@auth_bp.route("/disable-mfa", methods=["POST"])
@jwt_required
def disable_mfa() -> Any:
    """Disable multi-factor authentication"""
    try:
        data = request.get_json()
        if not data or "password" not in data:
            return (jsonify({"error": "Password is required"}), 400)
        user = db.session.get(User, g.current_user_id)
        if not user:
            return (jsonify({"error": "User not found"}), 404)
        if not user.verify_password(data["password"]):
            return (jsonify({"error": "Invalid password"}), 401)
        user.disable_mfa()
        db.session.commit()
        audit_logger.log_authentication_event(
            AuditEventType.MFA_DISABLED, user_id=user.id, success=True
        )
        return (jsonify({"message": "MFA disabled successfully"}), 200)
    except Exception:
        db.session.rollback()
        return (jsonify({"error": "MFA disable failed"}), 500)


@auth_bp.route("/change-password", methods=["POST"])
@jwt_required
@rate_limit(limit=5, window=300, scope=RateLimitScope.PER_USER)
def change_password() -> Any:
    """Change user password"""
    try:
        data = security_validator.validate_json_input(request.get_json())
        required_fields = ["current_password", "new_password"]
        for field in required_fields:
            if field not in data:
                return (jsonify({"error": f"{field} is required"}), 400)
        security_validator.validate_password(data["new_password"])
        user = db.session.get(User, g.current_user_id)
        if not user:
            return (jsonify({"error": "User not found"}), 404)
        if not user.verify_password(data["current_password"]):
            audit_logger.log_authentication_event(
                AuditEventType.PASSWORD_CHANGE,
                user_id=user.id,
                success=False,
                details={"reason": "invalid_current_password"},
            )
            return (jsonify({"error": "Invalid current password"}), 401)
        user.set_password(data["new_password"])
        db.session.commit()
        audit_logger.log_authentication_event(
            AuditEventType.PASSWORD_CHANGE, user_id=user.id, success=True
        )
        return (jsonify({"message": "Password changed successfully"}), 200)
    except ValidationError as e:
        return (jsonify({"error": e.message, "field": e.field}), 400)
    except Exception:
        db.session.rollback()
        return (jsonify({"error": "Password change failed"}), 500)


@auth_bp.route("/profile", methods=["GET"])
@jwt_required
def get_profile() -> Any:
    """Get current user profile"""
    try:
        user = db.session.get(User, g.current_user_id)
        if not user:
            return (jsonify({"error": "User not found"}), 404)
        return (jsonify({"user": user.to_dict(include_sensitive=False)}), 200)
    except Exception:
        return (jsonify({"error": "Failed to get profile"}), 500)


@auth_bp.route("/profile", methods=["PUT"])
@jwt_required
@rate_limit(limit=10, window=300, scope=RateLimitScope.PER_USER)
def update_profile() -> Any:
    """Update user profile"""
    try:
        data = security_validator.validate_json_input(request.get_json())
        threats = security_validator.check_security_threats(json.dumps(data))
        if threats:
            audit_logger.log_security_alert(
                "profile_update_security_threat",
                user_id=g.current_user_id,
                details={"threats": threats},
            )
            return (jsonify({"error": "Invalid input detected"}), 400)
        user = db.session.get(User, g.current_user_id)
        if not user:
            return (jsonify({"error": "User not found"}), 404)
        allowed_fields = [
            "first_name",
            "last_name",
            "phone_number",
            "address_line1",
            "city",
            "country",
            "postal_code",
        ]
        for field in allowed_fields:
            if field in data:
                if field in user._encrypted_fields:
                    user.set_encrypted_field(field, data[field], "pii")
                else:
                    setattr(user, field, data[field])
        db.session.commit()
        audit_logger.log_data_access(
            action="update",
            resource="user_profile",
            user_id=user.id,
            details={"updated_fields": list(data.keys())},
        )
        return (
            jsonify(
                {
                    "message": "Profile updated successfully",
                    "user": user.to_dict(include_sensitive=False),
                }
            ),
            200,
        )
    except ValidationError as e:
        return (jsonify({"error": e.message, "field": e.field}), 400)
    except Exception:
        db.session.rollback()
        return (jsonify({"error": "Profile update failed"}), 500)


@auth_bp.route("/verify-token", methods=["POST"])
def verify_token() -> Any:
    """Verify if a token is valid"""
    try:
        data = request.get_json()
        if not data or "token" not in data:
            return (jsonify({"error": "Token is required"}), 400)
        payload = auth_manager.verify_token(data["token"])
        if payload:
            return (
                jsonify(
                    {
                        "valid": True,
                        "user_id": payload.get("sub"),
                        "role": payload.get("role"),
                        "expires_at": payload.get("exp"),
                    }
                ),
                200,
            )
        else:
            return (jsonify({"valid": False}), 200)
    except Exception:
        return (jsonify({"error": "Token verification failed"}), 500)
