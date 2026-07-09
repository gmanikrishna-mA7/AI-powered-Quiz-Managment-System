from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth.models import User
from django.utils import timezone
from quiz_app.models import (
    QuizSession,
    QuizQuestion,
    UserScoreHistory,
    CategoryStatistics,
)


@receiver(post_save, sender=User)
def create_user_score_history(sender, instance, created, **kwargs):
    if created:
        if not UserScoreHistory.objects.filter(user=instance).exists():
            UserScoreHistory.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_score_history(sender, instance, **kwargs):
    if hasattr(instance, 'score_history'):
        instance.score_history.save()
    else:
        UserScoreHistory.objects.get_or_create(user=instance)


@receiver(post_save, sender=QuizSession)
def update_user_score_history(sender, instance, created, **kwargs):
    if instance.status == 'completed' and instance.completed_at:
        try:
            score_history = instance.user.score_history
        except UserScoreHistory.DoesNotExist:
            score_history = UserScoreHistory.objects.create(user=instance.user)
        
        # Recalculate statistics from completed quiz sessions
        completed_sessions = QuizSession.objects.filter(
            user=instance.user,
            status='completed'
        )
        
        total_quizzes = completed_sessions.count()
        
        if total_quizzes > 0:
            # Calculate average score
            scores = completed_sessions.values_list('score', flat=True)
            average_score = sum(scores) / total_quizzes
            
            # Get best and worst scores
            best_score = max(scores)
            worst_score = min(scores)
            
            # Count correct answers
            correct_answers = QuizQuestion.objects.filter(
                quiz_session__user=instance.user,
                quiz_session__status='completed',
                is_correct=True
            ).count()
            
            total_questions = QuizQuestion.objects.filter(
                quiz_session__user=instance.user,
                quiz_session__status='completed'
            ).count()
            
            # Update score history
            score_history.total_quizzes = total_quizzes
            score_history.total_questions_answered = total_questions
            score_history.correct_answers = correct_answers
            score_history.average_score = average_score
            score_history.best_score = best_score
            score_history.worst_score = worst_score
            score_history.last_quiz_date = instance.completed_at
            score_history.save()
        
        # Update category statistics
        if instance.category:
            update_category_statistics(instance.category, instance.subcategory)
        
        # Update user's last_active (auth_app profile)
        if hasattr(instance.user, 'profile'):
            instance.user.profile.last_active = timezone.now()
            instance.user.profile.save(update_fields=['last_active'])


def update_category_statistics(category, subcategory=None):
    # Get or create statistics record
    stats, _ = CategoryStatistics.objects.get_or_create(
        category=category,
        subcategory=subcategory
    )
    
    # Filter completed quiz sessions for this category/subcategory
    if subcategory:
        sessions = QuizSession.objects.filter(
            category=category,
            subcategory=subcategory,
            status='completed'
        )
    else:
        sessions = QuizSession.objects.filter(
            category=category,
            status='completed'
        )
    
    total_quizzes = sessions.count()
    
    if total_quizzes > 0:
        # Calculate statistics
        scores = list(sessions.values_list('score', flat=True))
        average_score = sum(scores) / total_quizzes
        
        # Count unique users
        total_users = sessions.values('user').distinct().count()
        
        # Update statistics
        stats.total_quizzes_taken = total_quizzes
        stats.average_score = average_score
        stats.total_users = total_users
        stats.save()


@receiver(post_delete, sender=QuizSession)
def update_stats_on_session_delete(sender, instance, **kwargs):
    user = instance.user
    
    # Trigger score history update by querying remaining sessions
    if hasattr(user, 'score_history'):
        completed_sessions = QuizSession.objects.filter(
            user=user,
            status='completed'
        )
        
        if completed_sessions.exists():
            # Re-update score history from remaining sessions
            latest_session = completed_sessions.latest('completed_at')
            # Simulate a save to trigger the update signal
            latest_session.save()
        else:
            # Reset score history if no quizzes left
            score_history = user.score_history
            score_history.total_quizzes = 0
            score_history.total_questions_answered = 0
            score_history.correct_answers = 0
            score_history.average_score = 0.0
            score_history.best_score = 0
            score_history.worst_score = 0
            score_history.last_quiz_date = None
            score_history.save()
    
    # Update category statistics if applicable
    if instance.category:
        update_category_statistics(instance.category, instance.subcategory)
