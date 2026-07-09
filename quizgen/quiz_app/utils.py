from django.utils import timezone
from django.db.models import Avg, Count, Max, Min, Q
from datetime import timedelta
from typing import Dict, List, Optional, Tuple
from quiz_app.models import (
    QuizSession,
    QuizQuestion,
    UserScoreHistory,
    CategoryStatistics,
    Category,
    SubCategory,
)


def calculate_session_score(session: QuizSession) -> int:
    if session.total_questions == 0:
        return 0
    
    questions = QuizQuestion.objects.filter(
        quiz_session=session,
        is_correct=True
    ).count()
    
    score = int((questions / session.total_questions) * 100)
    return max(0, min(100, score))  # Ensure 0-100 range


def get_user_stats(user) -> Dict:
    try:
        history = user.score_history
    except UserScoreHistory.DoesNotExist:
        return {
            'total_quizzes': 0,
            'total_questions': 0,
            'correct_answers': 0,
            'average_score': 0.0,
            'best_score': 0,
            'worst_score': 0,
            'accuracy': 0.0,
            'last_quiz_date': None,
        }
    
    return {
        'total_quizzes': history.total_quizzes,
        'total_questions': history.total_questions_answered,
        'correct_answers': history.correct_answers,
        'average_score': history.average_score,
        'best_score': history.best_score,
        'worst_score': history.worst_score,
        'accuracy': history.get_accuracy_percentage(),
        'last_quiz_date': history.last_quiz_date,
    }


def get_category_stats(category: Category, subcategory: Optional[SubCategory] = None) -> Dict:
    try:
        stats = CategoryStatistics.objects.get(
            category=category,
            subcategory=subcategory
        )
        return {
            'total_quizzes': stats.total_quizzes_taken,
            'average_score': stats.average_score,
            'total_users': stats.total_users,
            'last_updated': stats.last_updated,
        }
    except CategoryStatistics.DoesNotExist:
        return {
            'total_quizzes': 0,
            'average_score': 0.0,
            'total_users': 0,
            'last_updated': None,
        }


def get_leaderboard(limit: int = 10, timeframe_days: Optional[int] = None) -> List[Dict]:
    """
    Get top performers leaderboard.
    
    Args:
        limit: Number of top users to return (default 10)
        timeframe_days: Optional - only include quizzes completed in last N days
    
    Returns:
        List of user statistics ordered by average score
    """
    query = UserScoreHistory.objects.filter(total_quizzes__gt=0)
    
    if timeframe_days:
        cutoff_date = timezone.now() - timedelta(days=timeframe_days)
        query = query.filter(last_quiz_date__gte=cutoff_date)
    
    leaderboard = []
    for entry in query.order_by('-average_score')[:limit]:
        leaderboard.append({
            'rank': len(leaderboard) + 1,
            'user': entry.user.username,
            'email': entry.user.email,
            'average_score': entry.average_score,
            'best_score': entry.best_score,
            'total_quizzes': entry.total_quizzes,
            'accuracy': entry.get_accuracy_percentage(),
        })
    
    return leaderboard


def get_difficulty_stats(category: Category) -> Dict[str, Dict]:
    """
    Get statistics broken down by difficulty level.
    
    Args:
        category: Category object
    
    Returns:
        Dictionary with stats per difficulty level
    """
    result = {}
    
    for difficulty, display_name in [
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
        ('mixed', 'Mixed'),
    ]:
        try:
            subcats = SubCategory.objects.filter(
                parent_category=category,
                difficulty_level=difficulty
            )
            
            sessions = QuizSession.objects.filter(
                category=category,
                subcategory__in=subcats,
                status='completed'
            )
            
            stats = {
                'total_quizzes': sessions.count(),
                'average_score': sessions.aggregate(
                    avg_score=Avg('score')
                )['avg_score'] or 0.0,
                'total_users': sessions.values('user').distinct().count(),
                'subcategories_count': subcats.count(),
            }
            result[display_name] = stats
        except Exception as e:
            result[display_name] = {
                'total_quizzes': 0,
                'average_score': 0.0,
                'total_users': 0,
                'error': str(e),
            }
    
    return result


def validate_quiz_session(session: QuizSession) -> Tuple[bool, str]:
    """
    Validate a quiz session for consistency.
    
    Args:
        session: QuizSession object
    
    Returns:
        Tuple of (is_valid: bool, message: str)
    """
    issues = []
    
    # Check total questions
    question_count = QuizQuestion.objects.filter(quiz_session=session).count()
    if question_count != session.total_questions and session.status == 'completed':
        issues.append(
            f"Question count mismatch: DB={question_count}, "
            f"expected={session.total_questions}"
        )
    
    # Check completed questions
    if session.completed_questions > session.total_questions:
        issues.append(
            f"Completed ({session.completed_questions}) > "
            f"Total ({session.total_questions})"
        )
    
    # Check score range
    if not (0 <= session.score <= 100):
        issues.append(f"Score {session.score} outside 0-100 range")
    
    # Check timestamps
    if session.completed_at and session.started_at > session.completed_at:
        issues.append("Start time after completion time")
    
    # Check time spent
    if session.completed_at and session.started_at:
        actual_duration = (session.completed_at - session.started_at).total_seconds()
        if session.time_spent_seconds > actual_duration * 1.1:  # 10% tolerance
            issues.append(
                f"Time spent ({session.time_spent_seconds}s) > "
                f"actual duration ({actual_duration:.0f}s)"
            )
    
    if issues:
        return False, "; ".join(issues)
    
    return True, "Valid"


def update_all_user_stats() -> int:
    """
    Recalculate UserScoreHistory for all users.
    Used for data consistency after imports or migrations.
    
    Returns:
        Number of users updated
    """
    from django.contrib.auth.models import User
    
    updated_count = 0
    
    for user in User.objects.all():
        try:
            history, _ = UserScoreHistory.objects.get_or_create(user=user)
            
            # Recalculate stats
            completed_sessions = QuizSession.objects.filter(
                user=user,
                status='completed'
            )
            
            total_quizzes = completed_sessions.count()
            
            if total_quizzes > 0:
                scores = list(completed_sessions.values_list('score', flat=True))
                
                correct_answers = QuizQuestion.objects.filter(
                    quiz_session__user=user,
                    quiz_session__status='completed',
                    is_correct=True
                ).count()
                
                total_questions = QuizQuestion.objects.filter(
                    quiz_session__user=user,
                    quiz_session__status='completed'
                ).count()
                
                history.total_quizzes = total_quizzes
                history.total_questions_answered = total_questions
                history.correct_answers = correct_answers
                history.average_score = sum(scores) / total_quizzes
                history.best_score = max(scores)
                history.worst_score = min(scores)
                
                latest_session = completed_sessions.latest('completed_at')
                history.last_quiz_date = latest_session.completed_at
                
                history.save()
                updated_count += 1
        except Exception as e:
            print(f"Error updating stats for {user.email}: {str(e)}")
    
    return updated_count


def update_all_category_stats() -> int:
    """
    Recalculate CategoryStatistics for all categories.
    Used for data consistency after imports or migrations.
    
    Returns:
        Number of category statistics updated
    """
    updated_count = 0
    
    # Category-level stats
    for category in Category.objects.all():
        try:
            stats, _ = CategoryStatistics.objects.get_or_create(
                category=category,
                subcategory=None
            )
            
            sessions = QuizSession.objects.filter(
                category=category,
                status='completed'
            )
            
            total_quizzes = sessions.count()
            
            if total_quizzes > 0:
                scores = list(sessions.values_list('score', flat=True))
                stats.total_quizzes_taken = total_quizzes
                stats.average_score = sum(scores) / total_quizzes
                stats.total_users = sessions.values('user').distinct().count()
                stats.save()
            
            updated_count += 1
        except Exception as e:
            print(f"Error updating category stats for {category.name}: {str(e)}")
    
    # Subcategory-level stats
    for subcategory in SubCategory.objects.all():
        try:
            stats, _ = CategoryStatistics.objects.get_or_create(
                category=subcategory.parent_category,
                subcategory=subcategory
            )
            
            sessions = QuizSession.objects.filter(
                category=subcategory.parent_category,
                subcategory=subcategory,
                status='completed'
            )
            
            total_quizzes = sessions.count()
            
            if total_quizzes > 0:
                scores = list(sessions.values_list('score', flat=True))
                stats.total_quizzes_taken = total_quizzes
                stats.average_score = sum(scores) / total_quizzes
                stats.total_users = sessions.values('user').distinct().count()
                stats.save()
            
            updated_count += 1
        except Exception as e:
            print(f"Error updating subcategory stats for {subcategory.name}: {str(e)}")
    
    return updated_count


def get_trending_categories(limit: int = 5, days: int = 7) -> List[Dict]:
    """
    Get trending categories based on recent activity.
    
    Args:
        limit: Number of categories to return
        days: Look back N days for trending
    
    Returns:
        List of trending categories with stats
    """
    cutoff_date = timezone.now() - timedelta(days=days)
    
    trending = []
    
    for category in Category.objects.all():
        recent_sessions = QuizSession.objects.filter(
            category=category,
            status='completed',
            completed_at__gte=cutoff_date
        )
        
        count = recent_sessions.count()
        if count > 0:
            avg_score = recent_sessions.aggregate(
                avg=Avg('score')
            )['avg'] or 0
            
            trending.append({
                'category': category.name,
                'slug': category.slug,
                'recent_quizzes': count,
                'average_score': avg_score,
                'category_type': category.get_category_type_display(),
            })
    
    # Sort by recent quizzes (trending)
    trending.sort(key=lambda x: x['recent_quizzes'], reverse=True)
    
    return trending[:limit]


def export_user_data(user) -> Dict:
    """
    Export all user quiz data for GDPR compliance.
    
    Args:
        user: Django User object
    
    Returns:
        Dictionary with all user quiz data
    """
    sessions = QuizSession.objects.filter(user=user).select_related(
        'category', 'subcategory'
    ).prefetch_related('questions')
    
    export = {
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'date_joined': user.date_joined.isoformat(),
        },
        'statistics': get_user_stats(user),
        'quiz_sessions': [],
    }
    
    for session in sessions:
        session_data = {
            'id': session.id,
            'category': session.category.name if session.category else None,
            'subcategory': session.subcategory.name if session.subcategory else None,
            'score': session.score,
            'status': session.status,
            'started_at': session.started_at.isoformat(),
            'completed_at': session.completed_at.isoformat() if session.completed_at else None,
            'time_spent_seconds': session.time_spent_seconds,
            'questions': []
        }
        
        for question in session.questions.all():
            question_data = {
                'id': question.id,
                'question_text': question.question_text,
                'correct_answer': question.correct_answer,
                'user_answer': question.user_answer,
                'is_correct': question.is_correct,
                'created_at': question.created_at.isoformat(),
            }
            session_data['questions'].append(question_data)
        
        export['quiz_sessions'].append(session_data)
    
    return export
import random
import csv
import os
import logging
from pathlib import Path
from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)


def generate_unique_quiz_id(max_retries=10):
    """
    Generate a unique 5-digit quiz ID.
    
    Args:
        max_retries: Maximum number of retry attempts
        
    Returns:
        str: Unique 5-digit quiz ID
        
    Raises:
        ValueError: If unable to generate unique ID after max_retries
    """
    from quiz_app.models import Quiz
    
    for attempt in range(max_retries):
        quiz_id = str(random.randint(10000, 99999))
        
        if not Quiz.objects.filter(quiz_id=quiz_id).exists():
            logger.info(f"Generated unique quiz_id: {quiz_id} (attempt {attempt + 1})")
            return quiz_id
    
    raise ValueError(f"Failed to generate unique quiz_id after {max_retries} attempts")


def append_quiz_to_csv(quiz, questions):
    """
    Append quiz and its questions to dataset/quiz.csv
    
    Args:
        quiz: Quiz model instance
        questions: List of Question model instances
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Create dataset directory if it doesn't exist
        dataset_dir = Path(__file__).parent.parent / 'dataset'
        dataset_dir.mkdir(exist_ok=True)
        
        csv_path = dataset_dir / 'quiz.csv'
        
        # Check if file exists to determine if we need to write headers
        file_exists = csv_path.exists()
        
        # Open file in append mode with UTF-8 encoding
        with open(csv_path, 'a', newline='', encoding='utf-8') as csvfile:
            fieldnames = [
                'quiz_id', 'category', 'title', 'level', 'num_questions',
                'duration_seconds', 'question_order', 'question_text',
                'options_json', 'correct_answer', 'created_at'
            ]
            
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            
            # Write header if file is new
            if not file_exists:
                writer.writeheader()
                logger.info(f"Created new CSV file at {csv_path}")
            
            # Write each question as a row
            for question in questions:
                import json
                writer.writerow({
                    'quiz_id': quiz.quiz_id,
                    'category': quiz.category,
                    'title': quiz.title,
                    'level': quiz.level,
                    'num_questions': quiz.num_questions,
                    'duration_seconds': quiz.duration_seconds,
                    'question_order': question.order,
                    'question_text': question.text,
                    'options_json': json.dumps(question.options),
                    'correct_answer': question.correct_answer,
                    'created_at': quiz.created_at.isoformat(),
                })
            
            logger.info(f"Appended {len(questions)} questions for quiz {quiz.quiz_id} to CSV")
            return True
            
    except Exception as e:
        logger.error(f"Failed to append quiz to CSV: {str(e)}")
        return False
