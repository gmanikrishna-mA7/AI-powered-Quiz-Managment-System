from rest_framework.views import APIView
from django.core.cache import cache
from django.core.mail import send_mail
from django.conf import settings
import random
import logging
import requests
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
import logging

logger = logging.getLogger(__name__)
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.utils import timezone
from django.conf import settings
from auth_app.models import UserProfile, PasswordReset
from auth_app.serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserProfileSerializer,
    UserDetailSerializer,
    ProfileUpdateSerializer,
    AvatarUploadSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    EmailVerificationSerializer,
)
from auth_app.utils import (
    generate_password_reset_token,
    generate_email_verification_token,
    verify_email_token,
    check_rate_limit,
    record_login_attempt,
    sanitize_profile_data,
    get_client_ip,
    send_password_reset_email,
    send_email_verification,
)
import json
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token


class ResponseFormatter:    
    @staticmethod
    def success(data=None, message="Success", status_code=200):
        return Response({
            'success': True,
            'message': message,
            'data': data
        }, status=status_code)

    @staticmethod
    def error(message="Error", errors=None, status_code=400):
        return Response({
            'success': False,
            'message': message,
            'errors': errors or {}
        }, status=status_code)


@method_decorator(csrf_exempt, name='dispatch')
class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        
        if serializer.is_valid():
            user = serializer.save()
            
            # Send verification email
            try:
                profile = user.profile
                token = generate_email_verification_token(profile)
                send_email_verification(user, token, request)
            except Exception as e:
                print(f"Failed to send verification email: {str(e)}")
            
            # Log the user in
            login(request, user)
            
            # Create or get profile (should be created by signal, but good to be safe)
            try:
                profile = user.profile
                # Initialize preferences if empty
                if not profile.preferences:
                    profile.preferences = {}
                    profile.save(update_fields=['preferences'])
            except UserProfile.DoesNotExist:
                profile = UserProfile.objects.create(user=user, preferences={})

            # Serialize profile data for frontend
            profile_serializer = UserProfileSerializer(profile, context={'request': request})

            return ResponseFormatter.success(
                data=profile_serializer.data,
                message="Registration successful",
                status_code=status.HTTP_201_CREATED
            )
        
        return ResponseFormatter.error(
            message="Registration failed",
            errors=serializer.errors,
            status_code=status.HTTP_400_BAD_REQUEST
        )


@method_decorator(csrf_exempt, name='dispatch')
class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        # Get client IP for rate limiting
        client_ip = get_client_ip(request)
        email = request.data.get('email', '')
        
        # Check rate limit
        auth_settings = getattr(settings, 'AUTH_SETTINGS', {})
        limit_attempts = auth_settings.get('LOGIN_ATTEMPT_LIMIT', 5)
        limit_window = auth_settings.get('LOGIN_ATTEMPT_WINDOW', 15)
        
        is_limited, attempts_remaining, retry_after = check_rate_limit(
            client_ip, 
            limit_type='login',
            attempts=limit_attempts,
            window_minutes=limit_window
        )
        
        if is_limited:
            return ResponseFormatter.error(
                message="Too many login attempts. Please try again later.",
                errors={'retry_after': retry_after},
                status_code=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        serializer = UserLoginSerializer(data=request.data)
        
        if serializer.is_valid():
            user = serializer.validated_data['user']
            
            # Record successful login
            record_login_attempt(client_ip, email, success=True)
            
            # Update last_login
            try:
                profile = user.profile
                profile.last_login = timezone.now()
                profile.save(update_fields=['last_login'])
            except UserProfile.DoesNotExist:
                profile = UserProfile.objects.create(user=user)
            
            login(request, user)
            
            # Check for remember_me flag
            remember_me = request.data.get('remember_me', False)
            if remember_me:
                # Set session expiry to 2 days (48 hours)
                request.session.set_expiry(172800)
            else:
                # Use default session expiry (usually browser close or settings default)
                request.session.set_expiry(0)
                
            profile_serializer = UserProfileSerializer(profile, context={'request': request})
            
            return ResponseFormatter.success(
                data=profile_serializer.data,
                message="Login successful",
                status_code=status.HTTP_200_OK
            )
        
        # Record failed login
        record_login_attempt(client_ip, email, success=False)
        
        return ResponseFormatter.error(
            message="Login failed",
            errors=serializer.errors,
            status_code=status.HTTP_401_UNAUTHORIZED
        )


@method_decorator(csrf_exempt, name='dispatch')
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            logout(request)
            return ResponseFormatter.success(
                message="Logout successful",
                status_code=status.HTTP_200_OK
            )
        except Exception as e:
            return ResponseFormatter.error(
                message="Logout failed",
                errors={'detail': str(e)},
                status_code=status.HTTP_400_BAD_REQUEST
            )


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            profile = UserProfile.objects.get(user=request.user)
            serializer = UserProfileSerializer(profile, context={'request': request})
            
            return ResponseFormatter.success(
                data=serializer.data,
                message="Profile retrieved successfully",
                status_code=status.HTTP_200_OK
            )
        except UserProfile.DoesNotExist:
            return ResponseFormatter.error(
                message="User profile not found",
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return ResponseFormatter.error(
                message="Failed to retrieve profile",
                errors={'detail': str(e)},
                status_code=status.HTTP_400_BAD_REQUEST
            )


@method_decorator(csrf_exempt, name='dispatch')
class ProfileUpdateView(APIView):
    permission_classes = [IsAuthenticated]
    
    def put(self, request):
        try:
            profile = request.user.profile
            serializer = ProfileUpdateSerializer(data=request.data, partial=True)
            
            if serializer.is_valid():
                # Sanitize data before saving
                sanitized_data = sanitize_profile_data(serializer.validated_data)
                
                # Update profile fields
                for field, value in sanitized_data.items():
                    if value is not None:
                        setattr(profile, field, value)
                
                profile.save()
                result_serializer = UserProfileSerializer(profile, context={'request': request})
                
                return ResponseFormatter.success(
                    data=result_serializer.data,
                    message="Profile updated successfully",
                    status_code=status.HTTP_200_OK
                )
            
            return ResponseFormatter.error(
                message="Profile update failed",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST
            )
        except UserProfile.DoesNotExist:
            return ResponseFormatter.error(
                message="User profile not found",
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return ResponseFormatter.error(
                message="Failed to update profile",
                errors={'detail': str(e)},
                status_code=status.HTTP_400_BAD_REQUEST
            )


class CheckAuthView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        # Check if user is authenticated
        if request.user and request.user.is_authenticated:
            try:
                profile = UserProfile.objects.get(user=request.user)
                serializer = UserProfileSerializer(profile, context={'request': request})
                
                return ResponseFormatter.success(
                    data=serializer.data,
                    message="User is authenticated",
                    status_code=status.HTTP_200_OK
                )
            except UserProfile.DoesNotExist:
                return ResponseFormatter.success(
                    data=None,
                    message="User authenticated but profile not found",
                    status_code=status.HTTP_200_OK
                )
        else:
            # Return 401 for unauthenticated users
            return ResponseFormatter.error(
                message="User is not authenticated",
                status_code=status.HTTP_401_UNAUTHORIZED
            )


@method_decorator(csrf_exempt, name='dispatch')
class AvatarUploadView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            profile = request.user.profile
            serializer = AvatarUploadSerializer(profile, data=request.FILES, partial=True)
            
            if serializer.is_valid():
                serializer.save()
                # Refresh profile from database to get updated avatar_file
                profile.refresh_from_db()
                result_serializer = UserProfileSerializer(profile, context={'request': request})
                
                return ResponseFormatter.success(
                    data=result_serializer.data,
                    message="Avatar uploaded successfully",
                    status_code=status.HTTP_200_OK
                )
            
            return ResponseFormatter.error(
                message="Avatar upload failed",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST
            )
        except UserProfile.DoesNotExist:
            return ResponseFormatter.error(
                message="User profile not found",
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return ResponseFormatter.error(
                message="Failed to upload avatar",
                errors={'detail': str(e)},
                status_code=status.HTTP_400_BAD_REQUEST
            )
    
    def put(self, request):
        try:
            profile = request.user.profile
            serializer = AvatarUploadSerializer(profile, data=request.FILES, partial=True)
            
            if serializer.is_valid():
                serializer.save()
                # Refresh profile from database to get updated avatar_file
                profile.refresh_from_db()
                result_serializer = UserProfileSerializer(profile, context={'request': request})
                
                return ResponseFormatter.success(
                    data=result_serializer.data,
                    message="Avatar uploaded successfully",
                    status_code=status.HTTP_200_OK
                )
            
            return ResponseFormatter.error(
                message="Avatar upload failed",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST
            )
        except UserProfile.DoesNotExist:
            return ResponseFormatter.error(
                message="User profile not found",
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return ResponseFormatter.error(
                message="Failed to upload avatar",
                errors={'detail': str(e)},
                status_code=status.HTTP_400_BAD_REQUEST
            )


class ProfileHistoryView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            profile = request.user.profile
            data = {
                'last_login': profile.last_login,
                'last_active': profile.last_active,
                'created_at': profile.created_at,
                'email_verified': profile.email_verified,
                'is_active': profile.is_active,
                'session_valid': profile.is_session_valid(),
            }
            
            return ResponseFormatter.success(
                data=data,
                message="Activity history retrieved successfully",
                status_code=status.HTTP_200_OK
            )
        except UserProfile.DoesNotExist:
            return ResponseFormatter.error(
                message="User profile not found",
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return ResponseFormatter.error(
                message="Failed to retrieve activity history",
                errors={'detail': str(e)},
                status_code=status.HTTP_400_BAD_REQUEST
            )


@method_decorator(csrf_exempt, name='dispatch')
class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        client_ip = get_client_ip(request)
        
        # Check rate limit
        auth_settings = getattr(settings, 'AUTH_SETTINGS', {})
        limit_attempts = auth_settings.get('PASSWORD_RESET_LIMIT', 3)
        limit_window = auth_settings.get('PASSWORD_RESET_WINDOW', 60)
        
        is_limited, attempts_remaining, retry_after = check_rate_limit(
            client_ip,
            limit_type='reset',
            attempts=limit_attempts,
            window_minutes=limit_window
        )
        
        if is_limited:
            return ResponseFormatter.error(
                message="Too many password reset requests. Please try again later.",
                errors={'retry_after': retry_after},
                status_code=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        serializer = PasswordResetRequestSerializer(data=request.data)
        
        if serializer.is_valid():
            email = serializer.validated_data['email']
            
            try:
                user = User.objects.get(email=email)
                token = generate_password_reset_token(user)
                
                # Send email with reset token
                email_sent, email_message = send_password_reset_email(user, token, request)
                
                if email_sent:
                    return ResponseFormatter.success(
                        data={
                            'email': email,
                            'message': 'Password reset link sent to your email'
                        },
                        message="Password reset email sent successfully",
                        status_code=status.HTTP_200_OK
                    )
                else:
                    # Email failed but don't reveal the error to user
                    print(f"Email send error: {email_message}")
                    return ResponseFormatter.success(
                        message="If this email exists, password reset link will be sent",
                        status_code=status.HTTP_200_OK
                    )
            except User.DoesNotExist:
                # Don't reveal if email exists
                return ResponseFormatter.success(
                    message="If this email exists, password reset link will be sent",
                    status_code=status.HTTP_200_OK
                )
        
        return ResponseFormatter.error(
            message="Password reset request failed",
            errors=serializer.errors,
            status_code=status.HTTP_400_BAD_REQUEST
        )


@method_decorator(csrf_exempt, name='dispatch')
class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        
        if serializer.is_valid():
            reset = serializer.validated_data['reset']
            new_password = serializer.validated_data['password']
            
            # Update password
            user = reset.user
            user.set_password(new_password)
            user.save()
            
            # Mark token as used
            reset.is_used = True
            reset.used_at = timezone.now()
            reset.save()
            
            return ResponseFormatter.success(
                message="Password reset successfully",
                status_code=status.HTTP_200_OK
            )
        
        return ResponseFormatter.error(
            message="Password reset failed",
            errors=serializer.errors,
            status_code=status.HTTP_400_BAD_REQUEST
        )


@method_decorator(csrf_exempt, name='dispatch')
class SendEmailVerificationView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            profile = request.user.profile
            
            if profile.email_verified:
                return ResponseFormatter.success(
                    message="Email already verified",
                    status_code=status.HTTP_200_OK
                )
            
            token = generate_email_verification_token(profile)
            
            # Send verification email
            email_sent, email_message = send_email_verification(request.user, token, request)
            
            if email_sent:
                return ResponseFormatter.success(
                    data={
                        'email': request.user.email,
                        'message': 'Verification link sent to your email'
                    },
                    message="Verification email sent successfully",
                    status_code=status.HTTP_200_OK
                )
            else:
                print(f"Email send error: {email_message}")
                return ResponseFormatter.error(
                    message="Failed to send verification email. Please try again.",
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        except UserProfile.DoesNotExist:
            return ResponseFormatter.error(
                message="User profile not found",
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return ResponseFormatter.error(
                message="Failed to send verification email",
                errors={'detail': str(e)},
                status_code=status.HTTP_400_BAD_REQUEST
            )


@method_decorator(csrf_exempt, name='dispatch')
class VerifyEmailView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        token = request.query_params.get('token')
        
        # Debug logging
        print(f"[EMAIL VERIFICATION] Received token: {token[:20] if token else 'None'}...")
        print(f"[EMAIL VERIFICATION] Full query params: {dict(request.query_params)}")
        
        if not token:
            print("[EMAIL VERIFICATION] Error: No token provided")
            return ResponseFormatter.error(
                message="Verification token required",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        success, message = verify_email_token(token)
        
        print(f"[EMAIL VERIFICATION] Result: success={success}, message={message}")
        
        if success:
            return ResponseFormatter.success(
                message=message,
                status_code=status.HTTP_200_OK
            )
        else:
            # Return 400 only for truly invalid/expired tokens, not for already verified
            status_code = status.HTTP_400_BAD_REQUEST if "already verified" not in message.lower() else status.HTTP_200_OK
            return ResponseFormatter.error(
                message=message,
                status_code=status_code
            )


@method_decorator(csrf_exempt, name='dispatch')
class GoogleSignInView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get('token')
        mode = request.data.get('mode', 'register')  # Default to register if not provided

        if not token:
            return ResponseFormatter.error(
                message="Google token is required",
                status_code=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Try verification as Access Token (User Info Endpoint) - New Flow
            user_info_url = "https://www.googleapis.com/oauth2/v3/userinfo"
            response = requests.get(user_info_url, params={'access_token': token})
            
            if response.status_code == 200:
                idinfo = response.json()
                google_id = idinfo.get('sub')
                email = idinfo.get('email')
                full_name = idinfo.get('name', '')
                avatar = idinfo.get('picture', '')
                email_verified = idinfo.get('email_verified', False)
            else:
                 # Fallback: Try verification as ID Token (Old Flow - Backward/Mobile Compatibility)
                try:
                    idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), settings.GOOGLE_CLIENT_ID)

                    if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                        raise ValueError('Wrong issuer.')

                    # Extract user info
                    google_id = idinfo['sub']
                    email = idinfo['email']
                    full_name = idinfo.get('name', '')
                    avatar = idinfo.get('picture', '')
                    email_verified = idinfo.get('email_verified', False)
                except Exception as e:
                    # If both fail, raise invalid token error
                    raise ValueError('Invalid token')

            if not email_verified:
                return ResponseFormatter.error(
                    message="Google email not verified",
                    status_code=status.HTTP_400_BAD_REQUEST
                )

            # Check if user exists
            try:
                user = User.objects.get(email=email)
                profile = user.profile
            except User.DoesNotExist:
                # If mode is explicitly 'login', fail if user doesn't exist
                mode = request.data.get('mode', 'register')
                if mode == 'login':
                    return ResponseFormatter.error(
                        message="Account does not exist. Please register first.",
                        status_code=status.HTTP_404_NOT_FOUND
                    )
                
                # Create new user (only if not in strict login mode)
                username = email.split('@')[0]
                # Ensure username is unique
                base_username = username
                counter = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}_{counter}"
                    counter += 1

                user = User.objects.create_user(
                    username=username,
                    email=email,
                    first_name=full_name.split(' ')[0] if full_name else '',
                    last_name=' '.join(full_name.split(' ')[1:]) if full_name and len(full_name.split(' ')) > 1 else ''
                )

                # Profile is automatically created by post_save signal on User creation
                profile = UserProfile.objects.get(user=user)
                profile.full_name = full_name
                profile.avatar = avatar
                profile.google_id = google_id
                profile.email_verified = email_verified
                profile.save()

            # Update profile with latest Google info
            profile.google_id = google_id
            profile.avatar = avatar
            profile.email_verified = email_verified
            if not profile.full_name and full_name:
                profile.full_name = full_name
            profile.last_login = timezone.now()
            profile.save()

            # Log the user in
            login(request, user)

            # Serialize profile data
            serializer = UserProfileSerializer(profile, context={'request': request})

            return ResponseFormatter.success(
                data=serializer.data,
                message="Google sign-in successful",
                status_code=status.HTTP_200_OK
            )

        except ValueError as e:
            return ResponseFormatter.error(
                message="Invalid Google token",
                errors={'detail': str(e)},
                status_code=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            print(f"Google sign-in error: {str(e)}")
            return ResponseFormatter.error(
                message="Google sign-in failed",
                errors={'detail': str(e)},
                status_code=status.HTTP_400_BAD_REQUEST
            )


# Quiz History Views
from quiz_app.models import Quiz, Question, QuizHistory

class SaveQuizAttemptView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from quiz_app.utils import generate_unique_quiz_id
        from django.utils import timezone
        import csv
        import os
        
        quiz_id = request.data.get('quiz_id')
        selected_answers = request.data.get('selected_answers', {})
        time_taken = request.data.get('time_taken', 0)
        quiz_type = request.data.get('quiz_type', 'time-based')  # Get quiz_type from request
        
        if not quiz_id:
            return ResponseFormatter.error("quiz_id is required", status_code=400)
        
        # Check if this is a learning-based quiz
        is_learning_based = quiz_type == 'learning-based'
        
        try:
            # First, try to find quiz in database
            quiz = Quiz.objects.filter(quiz_id=quiz_id).first()
            
            if quiz:
                # Database quiz - use existing logic
                questions = list(Question.objects.filter(quiz=quiz).order_by('order').values(
                    'id', 'order', 'text', 'question_text', 'options', 'correct_answer'
                ))
                
                score = 0
                user_answers_list = []
                for q in questions:
                    q_id = str(q['order'] - 1)
                    user_answer = selected_answers.get(q_id, '')
                    is_correct = user_answer == q['correct_answer']
                    if is_correct:
                        score += 1
                    
                    user_answers_list.append({
                        'question_id': q['id'],
                        'question_text': q['text'] or q['question_text'],
                        'user_answer': user_answer,
                        'correct_answer': q['correct_answer'],
                        'is_correct': is_correct
                    })
            else:
                # Quiz not in database - try to fetch from CSV
                csv_path = os.path.join(
                    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                    'dataset',
                    'categoryQuizzes.csv'
                )
                
                if not os.path.exists(csv_path):
                    return ResponseFormatter.error("Quiz not found in database or CSV", status_code=404)
                
                # Fetch quiz data from CSV
                questions_from_csv = []
                quiz_info = None
                
                with open(csv_path, 'r', encoding='utf-8') as file:
                    reader = csv.DictReader(file)
                    for row in reader:
                        if row['QuizID'] == str(quiz_id):
                            if not quiz_info:
                                quiz_info = {
                                    'quiz_id': row['QuizID'],
                                    'category': row['Category'],
                                    'subtopic': row['Subtopic'],
                                    'title': row['Title'],
                                    'level': row['Level'],
                                    'duration_seconds': row['DurationSeconds']
                                }
                            
                            questions_from_csv.append({
                                'question_text': row['QuestionText'],
                                'options': {
                                    'A': row['OptionA'],
                                    'B': row['OptionB'],
                                    'C': row['OptionC'],
                                    'D': row['OptionD']
                                },
                                'correct_answer': row['CorrectAnswer']
                            })
                
                if not quiz_info:
                    return ResponseFormatter.error("Quiz not found", status_code=404)
                
                # Create a temporary Quiz object for history (not saved to DB)
                quiz = Quiz(
                    quiz_id=quiz_info['quiz_id'],
                    title=quiz_info['title'],
                    category=quiz_info['category'],
                    topic=quiz_info['subtopic'],
                    level=quiz_info['level'],
                    difficulty_level=quiz_info['level'],
                    num_questions=len(questions_from_csv),
                    duration_seconds=int(quiz_info['duration_seconds']) if quiz_info['duration_seconds'] else 600
                )
                # Save the temp quiz to DB so it can be referenced in history
                quiz.save()
                
                # Calculate score for CSV quiz
                score = 0
                user_answers_list = []
                questions = []
                
                for idx, q in enumerate(questions_from_csv):
                    q_id = str(idx)
                    user_answer = selected_answers.get(q_id, '')
                    is_correct = user_answer == q['correct_answer']
                    if is_correct:
                        score += 1
                    
                    user_answers_list.append({
                        'question_id': idx,
                        'question_text': q['question_text'],
                        'user_answer': user_answer,
                        'correct_answer': q['correct_answer'],
                        'is_correct': is_correct
                    })
                    
                    questions.append({
                        'id': idx,
                        'order': idx + 1,
                        'text': q['question_text'],
                        'question_text': q['question_text'],
                        'options': list(q['options'].values()),
                        'correct_answer': q['correct_answer']
                    })
            
            # Create quiz history
            history = QuizHistory.objects.create(
                user=request.user,
                quiz=quiz,
                score=score,
                total_questions=len(questions),
                quiz_type=quiz_type,  # Save quiz type (fast-paced, time-based, learning-based)
                questions=questions,
                user_answers=user_answers_list,
                completed_at=timezone.now()
            )
            
            # Update user's daily streak
            from auth_app.streak_utils import update_user_streak
            update_user_streak(request.user, history.completed_at)
            
            # Only update XP and time stats if NOT learning-based quiz
            if not is_learning_based:
                # Update XP based on score and quiz difficulty
                from .xp_utils import update_user_xp
                total_questions = len(questions) # Ensure total_questions is defined for percentage calculation
                update_user_xp(request.user, quiz, score, quiz_type)
                
                # Calculate percentage score
                percentage_score = (score / total_questions * 100) if total_questions > 0 else 0
                
                # Update comprehensive user stats (includes time_taken)
                from .stats_utils import update_user_stats
                quiz_result = {
                    'quiz': quiz,
                    'score': score,
                    'total_questions': total_questions,
                    'time_taken': time_taken,
                    'percentage_score': percentage_score,
                    'quiz_type': quiz_type
                }
                updated_stats = update_user_stats(request.user, quiz_result)
            else:
                # For learning-based: only update quiz attendance, not XP or time
                from .stats_utils import update_user_stats
                total_questions = len(questions)
                percentage_score = (score / total_questions * 100) if total_questions > 0 else 0
                quiz_result = {
                    'quiz': quiz,
                    'score': score,
                    'total_questions': total_questions,
                    'time_taken': 0,  # Don't track time for learning-based
                    'percentage_score': percentage_score
                }
                # Pass is_learning flag to stats_utils so it can skip time/XP updates
                updated_stats = update_user_stats(request.user, quiz_result, is_learning=True)
            
            return ResponseFormatter.success({
                'message': 'Quiz attempt saved successfully',
                'quiz_id': quiz_id,
                'score': score,
                'total_questions': total_questions,
                'percentage': percentage_score,
                'time_taken': time_taken if not is_learning_based else 0,
                'stats_updated': updated_stats  # Include updated stats in response
            })
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error saving quiz attempt: {str(e)}")
            return ResponseFormatter.error(f"Failed to save quiz attempt: {str(e)}", status_code=500)


class GetHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            history = QuizHistory.objects.filter(
                user=request.user,
                completed_at__isnull=False
            ).select_related('quiz').order_by('-completed_at')
            
            attempts = []
            for h in history:
                percentage = round((h.score / h.total_questions * 100)) if h.total_questions > 0 else 0
                attempts.append({
                    'attempt_id': h.id,
                    'quiz_id': h.quiz.quiz_id,
                    'title': h.quiz.title,
                    'topic': h.quiz.category or h.quiz.topic,
                    'level': h.quiz.level or h.quiz.difficulty_level,
                    'quiz_type': h.quiz_type,  # Include quiz mode for displaying in frontend
                    'questions_answered': h.score,
                    'total_questions': h.total_questions,
                    'score': h.score,
                    'percentage': percentage,
                    'completed_at': h.completed_at.isoformat() if h.completed_at else None
                })
            
            return ResponseFormatter.success({'attempts': attempts, 'count': len(attempts)})
        except Exception as e:
            return ResponseFormatter.error(f"Failed to fetch: {str(e)}", status_code=500)


class GetHistoryDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            history = QuizHistory.objects.filter(user=request.user, completed_at__isnull=False)
            total_quizzes = history.count()
            
            if total_quizzes == 0:
                return ResponseFormatter.success({
                    'total_quizzes_attempted': 0,
                    'average_score_percentage': 0,
                    'total_questions_answered': 0,
                    'total_questions_not_answered': 0,
                    'total_time_spent': 0
                })
            
            total_score = sum(h.score or 0 for h in history)
            total_questions = sum(h.total_questions for h in history)
            avg_percentage = round((total_score / total_questions * 100)) if total_questions > 0 else 0
            
            total_answered = sum(1 for h in history for ans in h.user_answers if ans.get('user_answer'))
            total_not_answered = total_questions - total_answered
            
            return ResponseFormatter.success({
                'total_quizzes_attempted': total_quizzes,
                'average_score_percentage': avg_percentage,
                'total_questions_answered': total_answered,
                'total_questions_not_answered': total_not_answered,
                'total_time_spent': 0
            })
        except Exception as e:
            return ResponseFormatter.error(f"Failed to fetch: {str(e)}", status_code=500)


class GetQuizHistoryByIdView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, attempt_id):
        try:
            history = QuizHistory.objects.filter(
                id=attempt_id,
                user=request.user
            ).select_related('quiz').first()
            
            if not history:
                return ResponseFormatter.error("Quiz attempt not found", status_code=404)
            
            percentage = round((history.score / history.total_questions * 100)) if history.total_questions > 0 else 0
            
            questions_with_answers = []
            for ans in history.user_answers:
                questions_with_answers.append({
                    'text': ans.get('question_text', ''),
                    'user_answer': ans.get('user_answer', ''),
                    'correct_answer': ans.get('correct_answer', ''),
                    'is_correct': ans.get('is_correct', False)
                })
            
            return ResponseFormatter.success({
                'attempt_id': history.id,
                'quiz_id': history.quiz.quiz_id,
                'title': history.quiz.title,
                'category': history.quiz.category or history.quiz.topic,
                'level': history.quiz.level or history.quiz.difficulty_level,
                'quiz_type': history.quiz_type,  # Include quiz mode
                'score': history.score,
                'total_questions': history.total_questions,
                'percentage': percentage,
                'completed_at': history.completed_at.isoformat() if history.completed_at else None,
                'questions': questions_with_answers
            })
        except Exception as e:
            return ResponseFormatter.error(f"Failed to fetch: {str(e)}", status_code=500)



class GetCategoryPerformanceView(APIView):
    """
    Get user's performance by category - top 3 categories by average score.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            history = QuizHistory.objects.filter(
                user=request.user,
                completed_at__isnull=False
            ).select_related('quiz')
            
            if not history.exists():
                return ResponseFormatter.success({
                    'categories': [],
                    'message': 'No quizzes attempted yet'
                })
            
            # Calculate average score per category
            category_stats = {}
            for h in history:
                raw_category = h.quiz.category or h.quiz.topic or 'General'
                # Normalize: strip whitespace and convert to Title Case to merge "c++" and "C++"
                category = raw_category.strip().title()
                
                percentage = round((h.score / h.total_questions * 100)) if h.total_questions > 0 else 0
                
                if category not in category_stats:
                    category_stats[category] = {
                        'total_score': 0,
                        'count': 0,
                        'category': category
                    }
                
                category_stats[category]['total_score'] += percentage
                category_stats[category]['count'] += 1
            
            # Calculate averages and sort
            categories = []
            for cat, stats in category_stats.items():
                avg_score = round(stats['total_score'] / stats['count'])
                categories.append({
                    'category': cat,
                    'average_score': avg_score,
                    'quiz_count': stats['count']
                })
            
            # Sort by average score descending and get top 3
            categories.sort(key=lambda x: x['average_score'], reverse=True)
            top_categories = categories[:3]
            
            return ResponseFormatter.success({
                'categories': top_categories,
                'total_categories': len(categories)
            })
            
        except Exception as e:
            return ResponseFormatter.error(f"Failed to fetch: {str(e)}", status_code=500)


class GetUserStreakView(APIView):
    """
    Get user's daily streak statistics.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            profile = request.user.profile
            
            return ResponseFormatter.success({
                'current_streak': profile.current_streak,
                'longest_streak': profile.longest_streak,
                'last_activity_date': profile.last_activity_date.isoformat() if profile.last_activity_date else None
            })
            
        except Exception as e:
            return ResponseFormatter.error(f"Failed to fetch streak: {str(e)}", status_code=500)


class GetUserXPView(APIView):
    """
    Get user's total XP score directly from profile.
    This is a pure getter method that does not modify the XP score.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            profile = request.user.profile
            return ResponseFormatter.success({
                'xp_score': profile.xp_score
            })
            
        except Exception as e:
            return ResponseFormatter.error(f"Failed to fetch XP: {str(e)}", status_code=500)


class CreateUserQuizView(APIView):
    """
    Create a new quiz with AI-generated questions.
    Requires authentication and associates quiz with the user.
    Saves to database and CSV file.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from quiz_app.models import Quiz, Question
        from quiz_app.utils import generate_unique_quiz_id, append_quiz_to_csv
        from quiz_app.gemini_utils import generate_quiz_questions
        from django.db import transaction
        import logging
        
        logger = logging.getLogger(__name__)
        
        # Get quiz details from request
        category = request.data.get('category')
        title = request.data.get('title')
        level = request.data.get('level', 'easy')
        num_questions = request.data.get('num_questions', 10)
        duration_seconds = request.data.get('duration_seconds', 600)
        additional_instructions = request.data.get('additional_instructions', '')
        language = request.data.get('language', 'English')
        
        # Validate required fields
        if not category or not title:
            return ResponseFormatter.error("Category and title are required", status_code=400)
        
        try:
            # Step 1: Generate unique quiz_id
            logger.info(f"Generating quiz: {title} - {category} ({language}) for user {request.user.email}")
            quiz_id = generate_unique_quiz_id()
            logger.info(f"Generated quiz_id: {quiz_id}")
            
            # Step 2: Generate questions using Gemini
            logger.info(f"Calling Gemini API for {num_questions} questions")
            questions_data, error_msg = generate_quiz_questions(
                category=category,
                title=title,
                level=level,
                num_questions=num_questions,
                additional_instructions=additional_instructions,
                language=language
            )
            
            if not questions_data:
                logger.error(f"Gemini API failed: {error_msg}")
                return ResponseFormatter.error("Failed to generate questions", status_code=502)
            
            logger.info(f"Successfully generated {len(questions_data)} questions")
            
            # Step 3: Create Quiz and Question objects
            with transaction.atomic():
                # Create quiz
                quiz = Quiz.objects.create(
                    quiz_id=quiz_id,
                    category=category,
                    title=title,
                    topic=category,
                    level=level,
                    difficulty_level=level,
                    num_questions=num_questions,
                    duration_seconds=duration_seconds,
                    duration_minutes=duration_seconds // 60,
                    created_by=request.user,
                    is_mock=False,
                    language=language
                )
                
                # Create question objects
                question_objects = []
                for idx, q_data in enumerate(questions_data, start=1):
                    question = Question(
                        quiz=quiz,
                        order=idx,
                        text=q_data['text'],
                        question_text=q_data['text'],
                        options=q_data['options'],
                        correct_answer=q_data['correct_answer'],
                        metadata={}
                    )
                    question_objects.append(question)
                
                # Save to database
                Question.objects.bulk_create(question_objects)
                
                # Step 4: Add quiz_id to user's created_quiz_ids
                profile = request.user.profile
                created_quizzes = profile.created_quiz_ids or []
                if quiz_id not in created_quizzes:
                    created_quizzes.append(quiz_id)
                    profile.created_quiz_ids = created_quizzes
                    profile.save()
                
                # Step 5: Append to CSV file
                csv_success = append_quiz_to_csv(quiz, question_objects)
                if not csv_success:
                    logger.warning(f"CSV append failed for quiz {quiz_id}")
                else:
                    logger.info(f"Successfully saved quiz {quiz_id} to CSV")
            
            # Step 6: Return success response
            return ResponseFormatter.success({
                'quiz_id': quiz.quiz_id,
                'num_questions': len(question_objects),
                'category': quiz.category,
                'title': quiz.title,
                'level': quiz.level,
                'created_by': request.user.email
            })
            
        except Exception as e:
            logger.error(f"Error creating quiz: {str(e)}")
            return ResponseFormatter.error(f"Failed to create quiz: {str(e)}", status_code=500)


class GetUserCreatedQuizzesView(APIView):
    """
    Get list of quizzes created by the authenticated user.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            from quiz_app.models import Quiz
            
            # Get user's created quiz IDs
            profile = request.user.profile
            created_quiz_ids = profile.created_quiz_ids or []
            
            if not created_quiz_ids:
                return ResponseFormatter.success({
                    'quizzes': [],
                    'total_count': 0
                })
            
            # Fetch quiz details
            quizzes = Quiz.objects.filter(quiz_id__in=created_quiz_ids).order_by('-created_at')
            
            quiz_list = []
            for quiz in quizzes:
                quiz_list.append({
                    'quiz_id': quiz.quiz_id,
                    'title': quiz.title,
                    'category': quiz.category,
                    'level': quiz.level,
                    'num_questions': quiz.num_questions,
                    'duration_seconds': quiz.duration_seconds,
                    'created_at': quiz.created_at.isoformat() if quiz.created_at else None,
                    'language': quiz.language or 'English'
                })
            
            return ResponseFormatter.success({
                'quizzes': quiz_list,
                'total_count': len(quiz_list)
            })
            
        except Exception as e:
            return ResponseFormatter.error(f"Failed to fetch created quizzes: {str(e)}", status_code=500)


class GetUserAchievementsView(APIView):
    """
    Get user's achievements with unlock status.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            profile = request.user.profile
            current_xp = profile.xp_score or 0
            current_level = calculate_level(current_xp)
            
            # Define achievement milestones (same as frontend)
            achievement_milestones = [
                {'level': 2, 'name': 'Level Up!', 'description': 'Reached Level 2', 'xp_reward': 100},
                {'level': 5, 'name': 'Rising Star', 'description': 'Reached Level 5', 'xp_reward': 250},
                {'level': 10, 'name': 'Knowledge Seeker', 'description': 'Reached Level 10', 'xp_reward': 500},
                {'level': 20, 'name': 'Quiz Master', 'description': 'Reached Level 20', 'xp_reward': 1000},
                {'level': 30, 'name': 'Legendary Scholar', 'description': 'Reached Level 30', 'xp_reward': 2000},
                {'level': 50, 'name': 'Ultimate Champion', 'description': 'Reached Level 50', 'xp_reward': 5000},
            ]
            
            achievements = []
            total_unlocked = 0
            
            for milestone in achievement_milestones:
                is_unlocked = current_level >= milestone['level']
                if is_unlocked:
                    total_unlocked += 1
                
                # Calculate progress toward this achievement
                if current_level >= milestone['level']:
                    progress = 100
                else:
                    # Progress based on current level vs required level
                    prev_level = achievement_milestones[achievement_milestones.index(milestone) - 1]['level'] if achievement_milestones.index(milestone) > 0 else 0
                    level_range = milestone['level'] - prev_level
                    current_progress = current_level - prev_level
                    progress = min(100, int((current_progress / level_range) * 100))
                
                achievements.append({
                    'id': f"level_{milestone['level']}",
                    'name': milestone['name'],
                    'description': milestone['description'],
                    'required_level': milestone['level'],
                    'xp_reward': milestone['xp_reward'],
                    'unlocked': is_unlocked,
                    'progress': progress
                })
            
            return ResponseFormatter.success({
                'achievements': achievements,
                'total_unlocked': total_unlocked,
                'total_achievements': len(achievements),
                'current_level': current_level,
                'current_xp': current_xp
            })
            
        except Exception as e:
            logger.error(f"Error fetching achievements: {str(e)}")
            return ResponseFormatter.error(f"Failed to fetch achievements: {str(e)}", status_code=500)


class GetUserStatsView(APIView):
    """
    Get comprehensive user statistics in a single API call.
    Returns all stats including XP, level, quizzes, scores, time, streaks, achievements, and rank.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            from .stats_utils import format_time_spent, get_user_accuracy
            from .xp_utils import calculate_level
            from django.contrib.auth.models import User
            
            profile = request.user.profile
            
            # Calculate derived values
            current_level = calculate_level(profile.xp_score)
            accuracy_percentage = get_user_accuracy(request.user)
            time_formatted = format_time_spent(profile.total_time_spent_seconds)
            
            # Get global rank
            all_users = User.objects.select_related('profile').all()
            users_with_xp = []
            for user in all_users:
                try:
                    users_with_xp.append({
                        'user_id': user.id,
                        'xp_score': user.profile.xp_score or 0
                    })
                except:
                    continue
            
            users_with_xp.sort(key=lambda x: x['xp_score'], reverse=True)
            
            global_rank = None
            for idx, user_data in enumerate(users_with_xp, start=1):
                if user_data['user_id'] == request.user.id:
                    global_rank = idx
                    break
            
            # Get achievements (reuse logic from GetUserAchievementsView)
            achievement_milestones = [
                {'level': 2, 'name': 'Level Up!'},
                {'level': 5, 'name': 'Rising Star'},
                {'level': 10, 'name': 'Knowledge Seeker'},
                {'level': 20, 'name': 'Quiz Master'},
                {'level': 30, 'name': 'Legendary Scholar'},
                {'level': 50, 'name': 'Ultimate Champion'},
            ]
            
            total_achievements_unlocked = sum(
                1 for milestone in achievement_milestones 
                if current_level >= milestone['level']
            )
            
            recent_achievements = [
                milestone for milestone in achievement_milestones
                if current_level >= milestone['level']
            ][-3:]  # Last 3 unlocked
            
            return ResponseFormatter.success({
                # Core stats
                'xp_score': profile.xp_score,
                'fast_paced_points': profile.fast_paced_points,
                'time_based_points': profile.time_based_points,
                'level': current_level,
                'total_quizzes_attended': profile.total_quizzes_attended,
                'average_score': round(profile.average_score, 2),
                
                # Time tracking
                'total_time_spent_seconds': profile.total_time_spent_seconds,
                'total_time_spent_formatted': time_formatted,
                
                # Streaks
                'current_streak': profile.current_streak,
                'longest_streak': profile.longest_streak,
                
                # Question stats
                'total_questions_answered': profile.total_questions_answered,
                'total_correct_answers': profile.total_correct_answers,
                'accuracy_percentage': round(accuracy_percentage, 2),
                
                # Achievements
                'achievements': {
                    'total_unlocked': total_achievements_unlocked,
                    'total_available': len(achievement_milestones),
                    'recent': recent_achievements
                },
                
                # Ranking
                'rank': {
                    'global_rank': global_rank,
                    'total_users': len(users_with_xp)
                }
            })
            
        except Exception as e:
            return ResponseFormatter.error(f"Failed to fetch stats: {str(e)}", status_code=500)


# Password Reset Views
class RequestPasswordResetView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return ResponseFormatter.error('Email is required', status_code=400)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return ResponseFormatter.error('Email does not exist', status_code=404)

        # Generate 6-digit OTP
        otp = str(random.randint(100000, 999999))
        
        # Cache key
        cache_key = f'password_reset_otp_{email}'
        
        try:
            # Store in cache for 10 minutes
            cache.set(cache_key, otp, timeout=600)

            # Send Email
            send_mail(
                'Password Reset OTP - QuizGen',
                f'Your OTP for password reset is: {otp}. It is valid for 10 minutes.',
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
            )
            logger.info(f"Password reset OTP sent to {email}")
            return ResponseFormatter.success({'message': 'OTP sent successfully'})

        except Exception as e:
            logger.error(f"Failed to send password reset email: {str(e)}")
            return ResponseFormatter.error('Failed to send email service', status_code=500)


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        otp = request.data.get('otp')
        new_password = request.data.get('new_password')
        
        if not all([email, otp, new_password]):
            return ResponseFormatter.error('Email, OTP, and new password are required', status_code=400)

        # Verify OTP
        cache_key = f'password_reset_otp_{email}'
        cached_otp = cache.get(cache_key)

        if not cached_otp or str(cached_otp) != str(otp):
            return ResponseFormatter.error('Invalid or expired OTP', status_code=400)

        try:
            user = User.objects.get(email=email)
            
            # Set new password
            user.set_password(new_password)
            user.save()

            # Clear OTP
            cache.delete(cache_key)
            
            logger.info(f"Password reset successful for {email}")
            return ResponseFormatter.success({'message': 'Password updated successfully'})
            
        except User.DoesNotExist:
            return ResponseFormatter.error('User not found', status_code=404)

