from quiz_app.models import QuizHistory


def calculate_quiz_xp(quiz, score):
    """
    Calculate XP based on quiz difficulty and correct answers.
    
    XP Rates:
    - Easy: 5 XP per correct answer
    - Medium: 10 XP per correct answer
    - Hard: 15 XP per correct answer
    
    Args:
        quiz: Quiz object
        score: Number of correct answers
    
    Returns:
        int: Total XP earned
    """
    xp_per_question = {
        'easy': 5,
        'medium': 10,
        'hard': 15
    }
    
    # Get difficulty level from quiz
    difficulty = (quiz.level or quiz.difficulty_level or 'medium').lower()
    xp_rate = xp_per_question.get(difficulty, 10)
    
    return score * xp_rate


def update_user_xp(user, quiz, score, quiz_type='time-based'):
    """
    Update user's XP score based on quiz completion.
    Only awards XP for the first attempt of each quiz.
    
    Args:
        user: User object
        quiz: Quiz object
        score: Number of correct answers
        quiz_type: Type of quiz (time-based, fast-paced, learning-based)
    
    Returns:
        int: XP earned (0 if not first attempt)
    """
    # Check if user has previously completed this quiz
    previous_attempts = QuizHistory.objects.filter(
        user=user,
        quiz=quiz,
        completed_at__isnull=False
    ).count()
    
    # Only award XP for first attempt
    if previous_attempts <= 1:  # Current attempt is the first
        xp_earned = calculate_quiz_xp(quiz, score)
        
        # Update total XP score
        user.profile.check_and_reset_weekly_xp()
        user.profile.xp_score += xp_earned
        user.profile.weekly_xp += xp_earned
        
        update_fields = ['xp_score', 'weekly_xp']
        
        # Update specific quiz type points
        if quiz_type == 'fast-paced':
            user.profile.fast_paced_points += xp_earned
            update_fields.append('fast_paced_points')
        elif quiz_type == 'time-based':
            user.profile.time_based_points += xp_earned
            update_fields.append('time_based_points')
            
        user.profile.save(update_fields=update_fields)
        return xp_earned
    
    return 0  # No XP for subsequent attempts


def calculate_level(xp):
    """
    Calculate user level based on XP with progressive difficulty.
    Each level requires more XP than the previous, with increasing increments.
    
    Level progression:
    Level 1: 50 XP
    Level 2: 110 XP (50 + 60)
    Level 3: 180 XP (110 + 70)
    And so on...
    
    Args:
        xp: Total XP score
    
    Returns:
        int: Current level
    """
    level = 1
    total_xp_required = 0
    base_increment = 50
    current_increment = base_increment
    
    # Calculate level by accumulating XP requirements
    while xp >= total_xp_required + current_increment:
        total_xp_required += current_increment
        level += 1
        current_increment = base_increment + (level - 1) * 10  # Increment increases by 10 each level
    
    return level


def calculate_xp_from_quiz_attempt(quiz_history_entry):
    """
    Calculate XP earned from a specific quiz attempt.
    
    Args:
        quiz_history_entry: QuizHistory object
    
    Returns:
        int: XP earned from this attempt
    """
    if not quiz_history_entry.quiz or quiz_history_entry.score is None:
        return 0
    
    # Use the same logic as calculate_quiz_xp
    xp_per_question = {
        'easy': 5,
        'medium': 10,
        'hard': 15
    }
    
    difficulty = (quiz_history_entry.quiz.level or 
                  quiz_history_entry.quiz.difficulty_level or 
                  'medium').lower()
    xp_rate = xp_per_question.get(difficulty, 10)
    
    return quiz_history_entry.score * xp_rate


def get_weekly_xp_for_user(user, days=7):
    """
    Calculate total XP earned by a user in the current week (Monday-Sunday).
    Only counts XP from the first attempt of each quiz (same logic as update_user_xp).
    
    Args:
        user: User object
        days: Not used, kept for backward compatibility
    
    Returns:
        tuple: (weekly_xp, quiz_count) - Total XP earned and number of unique quizzes completed
    """
    from django.utils import timezone
    from datetime import timedelta
    
    # Get current datetime
    now = timezone.now()
    
    # Calculate Monday of the current week (weekday 0 = Monday)
    days_since_monday = now.weekday()  # 0=Mon, 1=Tue, ..., 6=Sun
    monday_start = now - timedelta(days=days_since_monday)
    
    # Set to beginning of Monday (00:00:00)
    monday_start = monday_start.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Get all quiz attempts completed this week
    weekly_attempts = QuizHistory.objects.filter(
        user=user,
        completed_at__isnull=False,
        completed_at__gte=monday_start
    ).select_related('quiz').order_by('quiz', 'completed_at')
    
    # Track which quizzes we've already counted (only count first attempt per quiz)
    counted_quiz_ids = set()
    total_xp = 0
    first_attempts_count = 0
    
    for attempt in weekly_attempts:
        if attempt.quiz and attempt.quiz.quiz_id not in counted_quiz_ids:
            # This is the first attempt of this quiz this week
            counted_quiz_ids.add(attempt.quiz.quiz_id)
            total_xp += calculate_xp_from_quiz_attempt(attempt)
            first_attempts_count += 1
    
    return total_xp, first_attempts_count

