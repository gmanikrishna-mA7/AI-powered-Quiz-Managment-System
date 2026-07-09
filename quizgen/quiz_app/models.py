from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
import json


class Category(models.Model):
    CATEGORY_CHOICES = [
        ('academic', 'Academic'),
        ('entertainment', 'Entertainment'),
        ('general_knowledge', 'General Knowledge'),
    ]
    
    name = models.CharField(max_length=255, unique=True, db_index=True)
    slug = models.SlugField(max_length=255, unique=True, db_index=True)
    category_type = models.CharField(
        max_length=50,
        choices=CATEGORY_CHOICES,
        db_index=True
    )
    description = models.TextField(blank=True, null=True)
    icon_url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Category'
        verbose_name_plural = 'Categories'
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['category_type']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_category_type_display()})"


class SubCategory(models.Model):
    DIFFICULTY_CHOICES = [
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
        ('mixed', 'Mixed'),
    ]
    
    name = models.CharField(max_length=255, db_index=True)
    slug = models.SlugField(max_length=255, db_index=True)
    parent_category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name='subcategories'
    )
    description = models.TextField(blank=True, null=True)
    difficulty_level = models.CharField(
        max_length=20,
        choices=DIFFICULTY_CHOICES,
        default='mixed'
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'SubCategory'
        verbose_name_plural = 'SubCategories'
        unique_together = ('parent_category', 'slug')
        indexes = [
            models.Index(fields=['parent_category', 'slug']),
            models.Index(fields=['difficulty_level']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.parent_category.name} > {self.name}"


class QuizSession(models.Model):
    STATUS_CHOICES = [
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('expired', 'Expired'),
        ('abandoned', 'Abandoned'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='quiz_sessions'
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='quiz_sessions'
    )
    subcategory = models.ForeignKey(
        SubCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='quiz_sessions'
    )
    total_questions = models.IntegerField(
        default=10,
        validators=[MinValueValidator(1), MaxValueValidator(100)]
    )
    completed_questions = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)]
    )
    score = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='in_progress',
        db_index=True
    )
    started_at = models.DateTimeField(auto_now_add=True, db_index=True)
    completed_at = models.DateTimeField(blank=True, null=True, db_index=True)
    time_spent_seconds = models.IntegerField(default=0)
    metadata = models.TextField(
        default='{}',
        help_text='JSON field for additional metadata'
    )
    
    class Meta:
        verbose_name = 'Quiz Session'
        verbose_name_plural = 'Quiz Sessions'
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['category', 'subcategory']),
            models.Index(fields=['started_at']),
            models.Index(fields=['completed_at']),
            models.Index(fields=['user', 'started_at']),
        ]
        ordering = ['-started_at']
    
    def __str__(self):
        return f"{self.user.email} - {self.category.name} ({self.get_status_display()})"
    
    def get_progress_percentage(self):
        if self.total_questions == 0:
            return 0
        return int((self.completed_questions / self.total_questions) * 100)
    
    def get_metadata(self):
        try:
            return json.loads(self.metadata)
        except (json.JSONDecodeError, TypeError):
            return {}
    
    def set_metadata(self, data):
        self.metadata = json.dumps(data)


class QuizQuestion(models.Model):
    quiz_session = models.ForeignKey(
        QuizSession,
        on_delete=models.CASCADE,
        related_name='questions'
    )
    question_text = models.TextField()
    options = models.TextField(
        help_text='JSON array of answer options',
        default='[]'
    )
    correct_answer = models.CharField(max_length=500)
    user_answer = models.CharField(
        max_length=500,
        blank=True,
        null=True
    )
    is_correct = models.BooleanField(default=False, db_index=True)
    ai_metadata = models.TextField(
        default='{}',
        help_text='JSON metadata from AI generation'
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        verbose_name = 'Quiz Question'
        verbose_name_plural = 'Quiz Questions'
        indexes = [
            models.Index(fields=['quiz_session', 'is_correct']),
            models.Index(fields=['created_at']),
        ]
        ordering = ['created_at']
    
    def __str__(self):
        return f"Q: {self.question_text[:50]}..."
    
    def get_options(self):
        try:
            return json.loads(self.options)
        except (json.JSONDecodeError, TypeError):
            return []
    
    def set_options(self, options_list):
        self.options = json.dumps(options_list)
    
    def get_ai_metadata(self):
        try:
            return json.loads(self.ai_metadata)
        except (json.JSONDecodeError, TypeError):
            return {}
    
    def set_ai_metadata(self, metadata_dict):
        self.ai_metadata = json.dumps(metadata_dict)


class UserScoreHistory(models.Model):
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='score_history'
    )
    total_quizzes = models.IntegerField(default=0)
    total_questions_answered = models.IntegerField(default=0)
    correct_answers = models.IntegerField(default=0)
    average_score = models.FloatField(default=0.0)
    best_score = models.IntegerField(default=0)
    worst_score = models.IntegerField(default=0)
    last_quiz_date = models.DateTimeField(blank=True, null=True, db_index=True)
    last_updated = models.DateTimeField(auto_now=True, db_index=True)
    
    class Meta:
        verbose_name = 'User Score History'
        verbose_name_plural = 'User Score Histories'
        indexes = [
            models.Index(fields=['average_score']),
            models.Index(fields=['best_score']),
            models.Index(fields=['last_updated']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - Avg: {self.average_score:.1f}, Best: {self.best_score}"
    
    def get_accuracy_percentage(self):
        if self.total_questions_answered == 0:
            return 0
        return (self.correct_answers / self.total_questions_answered) * 100


class CategoryStatistics(models.Model):
    
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name='statistics'
    )
    subcategory = models.ForeignKey(
        SubCategory,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='statistics'
    )
    total_quizzes_taken = models.IntegerField(default=0)
    average_score = models.FloatField(default=0.0)
    total_users = models.IntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True, db_index=True)
    
    class Meta:
        verbose_name = 'Category Statistics'
        verbose_name_plural = 'Category Statistics'
        unique_together = ('category', 'subcategory')
        indexes = [
            models.Index(fields=['category', 'subcategory']),
            models.Index(fields=['average_score']),
        ]
    
    def __str__(self):
        if self.subcategory:
            return f"{self.category.name} > {self.subcategory.name}"
        return f"{self.category.name} (All)"


class Quiz(models.Model):
    DIFFICULTY_CHOICES = [
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
        ('mixed', 'Mixed'),
    ]

    quiz_id = models.CharField(max_length=20, unique=True, db_index=True, help_text="Unique quiz ID")
    category = models.CharField(max_length=255, help_text="Quiz category (e.g., Mathematics, Science)", db_index=True, blank=True, null=True)
    title = models.CharField(max_length=255)
    topic = models.CharField(max_length=255, help_text="Interest or topic of the quiz")
    level = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, db_index=True, help_text="Difficulty level", blank=True, null=True)
    language = models.CharField(max_length=50, default='English', help_text="Language of the quiz content")
    # Legacy field for backwards compatibility
    difficulty_level = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, blank=True, null=True)
    image_link = models.URLField(blank=True, null=True)
    num_questions = models.IntegerField(validators=[MinValueValidator(1)])
    duration_seconds = models.IntegerField(help_text="Quiz duration in seconds", validators=[MinValueValidator(1)], blank=True, null=True)
    # Legacy field for backwards compatibility
    duration_minutes = models.IntegerField(help_text="Quiz duration in minutes (legacy)", validators=[MinValueValidator(1)], blank=True, null=True)
    is_mock = models.BooleanField(default=False, help_text="If True, this is a pre-defined mock quiz")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_quizzes')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, blank=True, null=True)

    def __str__(self):
        return f"{self.title} ({self.quiz_id})"

    class Meta:
        verbose_name = 'Generated Quiz'
        verbose_name_plural = 'Generated Quizzes'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['quiz_id']),
            models.Index(fields=['category']),
            models.Index(fields=['level']),
            models.Index(fields=['created_at']),
        ]



class Question(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions')
    text = models.TextField(help_text="Question text")
    # Legacy field for backwards compatibility
    question_text = models.TextField(blank=True, null=True, help_text="Question text (legacy)")
    options = models.JSONField(help_text="List of 4 options")
    correct_answer = models.CharField(max_length=255, help_text="Correct answer - must match one of the options")
    order = models.IntegerField(default=0, help_text="Question order in quiz (1-based)")
    metadata = models.JSONField(default=dict, blank=True, help_text="Additional metadata (hints, tags, explanations)")

    def __str__(self):
        text_to_show = self.text or self.question_text or ""
        return f"{self.quiz.title} - Q{self.order}: {text_to_show[:50]}"

    class Meta:
        ordering = ['order']
        indexes = [
            models.Index(fields=['quiz', 'order']),
        ]



class QuizHistory(models.Model):
    QUIZ_TYPE_CHOICES = [
        ('fast-paced', 'Fast Paced'),
        ('time-based', 'Time Based'),
        ('learning-based', 'Learning Based'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='quiz_history')
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='attempted_by')
    score = models.IntegerField(null=True, blank=True)
    total_questions = models.IntegerField()
    quiz_type = models.CharField(
        max_length=20,
        choices=QUIZ_TYPE_CHOICES,
        default='time-based',
        help_text='Quiz mode: fast-paced, time-based, or learning-based'
    )
    questions = models.JSONField(default=list, help_text="List of questions generated for this attempt")
    user_answers = models.JSONField(default=list, help_text="List of user answers with correctness")
    completed_at = models.DateTimeField(blank=True, null=True)
    started_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.quiz.title} - {self.score}/{self.total_questions}"

    class Meta:
        verbose_name = 'Quiz History'
        verbose_name_plural = 'Quiz Histories'
        ordering = ['-completed_at']


class Activity(models.Model):
    ACTIVITY_TYPES = [
        ('buzzer', 'Buzzer Mode'),
        ('lightning', 'Lightning Round'),
        ('scramble', 'Word Scramble'),
        ('two_truths', 'Two Truths One Lie'),
    ]
    DIFFICULTY_CHOICES = [
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
    ]

    type = models.CharField(max_length=50, choices=ACTIVITY_TYPES, db_index=True)
    date = models.DateField(db_index=True, help_text="Date this activity is scheduled for")
    title = models.CharField(max_length=255)
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Daily Activity'
        verbose_name_plural = 'Daily Activities'
        unique_together = ('type', 'date')
        indexes = [
            models.Index(fields=['date', 'type']),
        ]

    def __str__(self):
        return f"{self.get_type_display()} - {self.date}"


class ActivityQuestion(models.Model):
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE, related_name='questions')
    content = models.JSONField(help_text="Flexible content: {question: '...', options: [], answer: '...'}")
    correct_answer = models.CharField(max_length=500)
    points = models.IntegerField(default=10)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.activity} - Q{self.order}"


class GameSession(models.Model):
    STATUS_CHOICES = [
        ('lobby', 'Lobby'),
        ('active', 'Active'),
        ('finished', 'Finished'),
    ]

    host = models.ForeignKey(User, on_delete=models.CASCADE, related_name='hosted_games')
    quiz_source = models.ForeignKey(Quiz, on_delete=models.SET_NULL, null=True, blank=True, help_text="Optional link to a pre-built quiz")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='lobby')
    current_question_index = models.IntegerField(default=0)
    state = models.JSONField(default=dict, help_text="Current game state (timer, active flags)")
    join_code = models.CharField(max_length=6, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"Game {self.join_code} ({self.get_status_display()})"


class PlayerSession(models.Model):
    game_session = models.ForeignKey(GameSession, on_delete=models.CASCADE, related_name='players')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='played_games', null=True, blank=True)
    guest_name = models.CharField(max_length=100, blank=True, null=True)
    score = models.IntegerField(default=0)
    streak = models.IntegerField(default=0)
    rank = models.IntegerField(default=0)
    xp_earned = models.IntegerField(default=0)
    last_active = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('game_session', 'user') 

    def __str__(self):
        return f"{self.user.username if self.user else self.guest_name} in {self.game_session.join_code}"


class UserActivityAttempt(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activity_attempts')
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE, related_name='attempts')
    score = models.IntegerField(default=0)
    completed_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-score', 'completed_at']
        indexes = [
            models.Index(fields=['activity', 'score']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.activity} - {self.score}"
