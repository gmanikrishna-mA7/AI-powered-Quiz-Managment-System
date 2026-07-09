import secrets
import string
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
from auth_app.models import LoginAttempt, PasswordReset, UserProfile
from django.contrib.auth.models import User


def generate_token(length=32):
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def generate_password_reset_token(user):
    token = generate_token()
    expires_at = timezone.now() + timedelta(hours=24)
    
    reset = PasswordReset.objects.create(
        user=user,
        token=token,
        expires_at=expires_at
    )
    return token


def generate_email_verification_token(user_profile):
    token = generate_token()
    user_profile.email_verification_token = token
    user_profile.email_verification_sent_at = timezone.now()
    user_profile.save()
    return token


def verify_email_token(token):
    print(f"[VERIFY_TOKEN] Looking for token: {token[:20]}...")
    try:
        profile = UserProfile.objects.get(email_verification_token=token)
        print(f"[VERIFY_TOKEN] Found profile: {profile.user.email}, verified={profile.email_verified}")
        
        # Check if already verified
        if profile.email_verified:
            print("[VERIFY_TOKEN] Email already verified")
            return True, "Email is already verified"
        
        # Token expires after 48 hours
        if profile.email_verification_sent_at:
            expires_at = profile.email_verification_sent_at + timedelta(hours=48)
            if timezone.now() > expires_at:
                print(f"[VERIFY_TOKEN] Token expired. Sent at: {profile.email_verification_sent_at}, Expires: {expires_at}")
                return False, "Token has expired. Please request a new verification email."
        
        profile.email_verified = True
        profile.email_verification_token = None
        profile.email_verification_sent_at = None
        profile.save()
        print(f"[VERIFY_TOKEN] Email verified successfully for {profile.user.email}")
        return True, "Email verified successfully"
    except UserProfile.DoesNotExist:
        print("[VERIFY_TOKEN] Profile not found with this token")
        # Try to find profile that's already verified with this scenario
        # This might be a case where user already verified
        return False, "Invalid or already used verification link. If your email is verified, you can proceed to login."


def check_rate_limit(ip_address, limit_type='login', attempts=5, window_minutes=15):
    now = timezone.now()
    window_start = now - timedelta(minutes=window_minutes)
    
    recent_attempts = LoginAttempt.objects.filter(
        ip_address=ip_address,
        attempted_at__gte=window_start
    ).count()
    
    is_limited = recent_attempts >= attempts
    attempts_remaining = max(0, attempts - recent_attempts)
    
    if is_limited:
        oldest_attempt = LoginAttempt.objects.filter(
            ip_address=ip_address,
            attempted_at__gte=window_start
        ).earliest('attempted_at').attempted_at
        retry_after = window_start - oldest_attempt + timedelta(minutes=window_minutes)
        retry_seconds = max(0, int(retry_after.total_seconds()))
    else:
        retry_seconds = 0
    
    return is_limited, attempts_remaining, retry_seconds


def record_login_attempt(ip_address, email, success=False):
    LoginAttempt.objects.create(
        ip_address=ip_address,
        email=email,
        success=success
    )
    
    # Clean up old attempts (older than 30 days)
    cutoff_date = timezone.now() - timedelta(days=30)
    LoginAttempt.objects.filter(attempted_at__lt=cutoff_date).delete()


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def sanitize_profile_data(data):
    sanitized = {}
    
    # Allowed fields
    allowed_fields = ['full_name', 'bio', 'preferences', 'avatar']
    
    for field, value in data.items():
        if field not in allowed_fields:
            continue
        
        if value is None:
            sanitized[field] = None
            continue
        
        # Sanitize strings
        if isinstance(value, str):
            # Remove potential HTML/script tags
            value = value.replace('<', '&lt;').replace('>', '&gt;')
            sanitized[field] = value
        elif isinstance(value, dict):
            # For preferences, ensure it's a plain dict
            sanitized[field] = value
        else:
            sanitized[field] = value
    
    return sanitized


def update_last_active(user):
    try:
        profile = user.profile
        profile.last_active = timezone.now()
        profile.save(update_fields=['last_active'])
    except UserProfile.DoesNotExist:
        pass


def is_session_active(user):
    try:
        profile = user.profile
        return profile.is_session_valid()
    except UserProfile.DoesNotExist:
        return False


def send_password_reset_email(user, token, request=None):
    from django.core.mail import send_mail
    from django.urls import reverse
    
    try:
        # Build reset link - point to frontend, not Django backend
        # Frontend will call the API endpoint with the token
        reset_url = f'http://localhost:3000/reset-password?token={token}'
        subject = 'Password Reset Request - Quiz Gen'
        message = f"""
Hello {user.first_name or user.username},

You have requested to reset your password. Click the link below to set a new password:

{reset_url}

This link will expire in 24 hours.

If you didn't request this, please ignore this email.

Best regards,
Quiz Gen Team
"""
        
        html_message = f"""
<html>
  <body>
    <h2>Password Reset Request</h2>
    <p>Hello {user.first_name or user.username},</p>
    <p>You have requested to reset your password. Click the button below to set a new password:</p>
    <p>
      <a href="{reset_url}" style="
        background-color: #007bff;
        color: white;
        padding: 12px 24px;
        text-decoration: none;
        border-radius: 4px;
        display: inline-block;
      ">Reset Password</a>
    </p>
    <p>This link will expire in 24 hours.</p>
    <p>If you didn't request this, please ignore this email.</p>
    <p>Best regards,<br>Quiz Gen Team</p>
  </body>
</html>
"""
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            html_message=html_message,
            fail_silently=False,
        )
        return True, "Email sent successfully"
    except Exception as e:
        return False, f"Failed to send email: {str(e)}"


def send_email_verification(user, token, request=None):
    from django.core.mail import send_mail
    
    try:
        # Build verification link - point to frontend, not Django backend
        # Frontend will call the API endpoint with the token
        verify_url = f'http://localhost:3000/verify-email?token={token}'
        
        subject = 'Verify Your Email - Quiz Gen'
        message = f"""
Hello {user.first_name or user.username},

Thank you for signing up! Please verify your email address by clicking the link below:

{verify_url}

This link will expire in 48 hours.

Best regards,
Quiz Gen Team
"""
        
        html_message = f"""
<html>
  <body>
    <h2>Email Verification</h2>
    <p>Hello {user.first_name or user.username},</p>
    <p>Thank you for signing up! Please verify your email address by clicking the button below:</p>
    <p>
      <a href="{verify_url}" style="
        background-color: #28a745;
        color: white;
        padding: 12px 24px;
        text-decoration: none;
        border-radius: 4px;
        display: inline-block;
      ">Verify Email</a>
    </p>
    <p>This link will expire in 48 hours.</p>
    <p>Best regards,<br>Quiz Gen Team</p>
  </body>
</html>
"""
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            html_message=html_message,
            fail_silently=False,
        )
        return True, "Verification email sent successfully"
    except Exception as e:
        return False, f"Failed to send email: {str(e)}"

