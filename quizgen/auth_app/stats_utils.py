from django.utils import timezone
from datetime import date, timedelta
from quiz_app.models import QuizHistory
from .xp_utils import update_user_xp, calculate_level
import logging

logger = logging.getLogger(__name__)


def update_user_stats(user, quiz_result, is_learning=False):
    """
    Centralized function to update all user stats after quiz completion.
    
    Args:
        user: User object
        quiz_result: dict containing:
            - quiz: Quiz object
            - score: Number of correct answers
            - total_questions: Total number of questions
            - time_taken: Time spent in seconds
            - percentage_score: Score as percentage
        is_learning: bool - If True, skip XP and time updates (for learning-based quizzes)
    
    Returns:
        dict: Updated stats
    """
    try:
        profile = user.profile
        
        # 1. Update total quizzes attended
        profile.total_quizzes_attended += 1
        
        # 2. Update total time spent (skip for learning-based)
        if not is_learning:
            time_taken = quiz_result.get('time_taken', 0)
            profile.total_time_spent_seconds += time_taken
        
        # 3. Update total questions and correct answers
        total_questions = quiz_result.get('total_questions', 0)
        score = quiz_result.get('score', 0)
        
        profile.total_questions_answered += total_questions
        profile.total_correct_answers += score
        
        # 4. Recalculate average score
        if profile.total_questions_answered > 0:
            profile.average_score = (
                profile.total_correct_answers / profile.total_questions_answered
            ) * 100
        else:
            profile.average_score = 0.0
        
        # 5. Update XP (skip for learning-based)
        if not is_learning:
            quiz = quiz_result.get('quiz')
            quiz_type = quiz_result.get('quiz_type', 'time-based')
            if quiz:
                update_user_xp(user, quiz, score, quiz_type)
        
        # 6. Update daily streak
        update_user_streak(user)
        
        # Save all updates
        profile.save()
        
        logger.info(f"Updated stats for user {user.username}: {profile.total_quizzes_attended} quizzes, {profile.average_score:.2f}% avg (learning mode: {is_learning})")
        
        return {
            'total_quizzes': profile.total_quizzes_attended,
            'average_score': profile.average_score,
            'xp_score': profile.xp_score,
            'level': calculate_level(profile.xp_score),
            'current_streak': profile.current_streak
        }
        
    except Exception as e:
        logger.error(f"Error updating user stats: {str(e)}")
        raise


def update_user_streak(user):
    """
    Update user's daily streak based on last activity.
    A day is counted from 4:00 AM to 3:59 AM the next day.
    
    Args:
        user: User object
    """
    profile = user.profile
    now = timezone.now()
    
    # Adjust for 4 AM cutoff
    cutoff_hour = 4
    if now.hour < cutoff_hour:
        # Before 4 AM counts as previous day
        activity_date = (now - timedelta(days=1)).date()
    else:
        activity_date = now.date()
    
    # If no previous activity
    if not profile.last_activity_date:
        profile.current_streak = 1
        profile.longest_streak = max(profile.longest_streak, 1)
        profile.last_activity_date = activity_date
        return
    
    # Calculate days difference
    days_diff = (activity_date - profile.last_activity_date).days
    
    if days_diff == 0:
        # Same day activity, no streak change
        pass
    elif days_diff == 1:
        # Consecutive day, increment streak
        profile.current_streak += 1
        profile.longest_streak = max(profile.longest_streak, profile.current_streak)
        profile.last_activity_date = activity_date
    else:
        # Streak broken, reset to 1
        profile.current_streak = 1
        profile.last_activity_date = activity_date


def format_time_spent(seconds):
    """
    Format seconds into human-readable time string.
    Shows minutes first, then switches to hours when >= 60 minutes.
    
    Args:
        seconds: Total seconds
        
    Returns:
        str: Formatted time string (e.g., "45m", "2h 30m", "2h")
    """
    if seconds < 60:
        return f"{seconds}s"
    
    minutes = seconds // 60
    
    # Under 60 minutes - show only minutes
    if minutes < 60:
        return f"{minutes}m"
    
    # 60+ minutes - show hours and minutes
    hours = minutes // 60
    remaining_minutes = minutes % 60
    
    if remaining_minutes > 0:
        return f"{hours}h {remaining_minutes}m"
    return f"{hours}h"


def get_user_accuracy(user):
    """
    Calculate user's accuracy percentage.
    
    Args:
        user: User object
        
    Returns:
        float: Accuracy percentage (0-100)
    """
    profile = user.profile
    
    if profile.total_questions_answered == 0:
        return 0.0
    
    return (profile.total_correct_answers / profile.total_questions_answered) * 100
