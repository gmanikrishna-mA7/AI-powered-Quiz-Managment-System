from django.contrib import admin
from django.utils.html import format_html
from quiz_app.models import (
    Category,
    SubCategory,
    QuizSession,
    QuizQuestion,
    UserScoreHistory,
    CategoryStatistics,
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'slug',
        'category_type',
        'subcategory_count',
        'created_at',
        'updated_at',
    )
    list_filter = ('category_type', 'created_at', 'updated_at')
    search_fields = ('name', 'slug', 'description')
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'slug', 'category_type')
        }),
        ('Details', {
            'fields': ('description', 'icon_url'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def subcategory_count(self, obj):
        return obj.subcategories.count()
    subcategory_count.short_description = 'Subcategories'


@admin.register(SubCategory)
class SubCategoryAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'parent_category',
        'difficulty_level',
        'question_count',
        'created_at',
    )
    list_filter = ('parent_category', 'difficulty_level', 'created_at')
    search_fields = ('name', 'slug', 'description')
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'slug', 'parent_category', 'difficulty_level')
        }),
        ('Details', {
            'fields': ('description',),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def question_count(self, obj):
        return QuizQuestion.objects.filter(
            quiz_session__subcategory=obj
        ).count()
    question_count.short_description = 'Questions'


@admin.register(QuizSession)
class QuizSessionAdmin(admin.ModelAdmin):
    list_display = (
        'session_id',
        'user',
        'category',
        'status_badge',
        'score',
        'progress_bar',
        'duration',
        'started_at',
    )
    list_filter = ('status', 'category', 'started_at', 'completed_at')
    search_fields = ('user__username', 'user__email', 'category__name')
    readonly_fields = (
        'user',
        'started_at',
        'completed_at',
        'progress_percentage',
        'formatted_metadata',
    )
    fieldsets = (
        ('User & Category', {
            'fields': ('user', 'category', 'subcategory')
        }),
        ('Quiz Details', {
            'fields': (
                'total_questions',
                'completed_questions',
                'progress_percentage',
                'score',
                'status',
            )
        }),
        ('Timing', {
            'fields': ('started_at', 'completed_at', 'time_spent_seconds')
        }),
        ('Metadata', {
            'fields': ('formatted_metadata',),
            'classes': ('collapse',)
        }),
    )

    def session_id(self, obj):
        return f"Quiz #{obj.id}"
    session_id.short_description = 'Session'

    def status_badge(self, obj):
        colors = {
            'in_progress': '#FFC107',
            'completed': '#28A745',
            'expired': '#DC3545',
            'abandoned': '#6C757D',
        }
        color = colors.get(obj.status, '#000000')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 5px 10px; '
            'border-radius: 3px; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'

    def progress_bar(self, obj):
        percentage = obj.get_progress_percentage()
        return format_html(
            '<div style="width: 100px; height: 20px; background-color: #E9ECEF; '
            'border-radius: 3px; overflow: hidden;">'
            '<div style="width: {}%; height: 100%; background-color: #007BFF; '
            'display: flex; align-items: center; justify-content: center; '
            'color: white; font-size: 12px; font-weight: bold;">'
            '{}%</div></div>',
            percentage,
            percentage
        )
    progress_bar.short_description = 'Progress'

    def duration(self, obj):
        minutes = obj.time_spent_seconds // 60
        seconds = obj.time_spent_seconds % 60
        return f"{minutes}m {seconds}s"
    duration.short_description = 'Duration'

    def progress_percentage(self, obj):
        return f"{obj.get_progress_percentage()}%"
    progress_percentage.short_description = 'Progress %'

    def formatted_metadata(self, obj):
        import json
        metadata = obj.get_metadata()
        return format_html('<pre>{}</pre>', json.dumps(metadata, indent=2))
    formatted_metadata.short_description = 'Metadata (JSON)'


@admin.register(QuizQuestion)
class QuizQuestionAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'quiz_session',
        'is_correct_badge',
        'user_answer_preview',
        'created_at',
    )
    list_filter = ('is_correct', 'created_at', 'quiz_session__status')
    search_fields = ('question_text', 'correct_answer', 'user_answer')
    readonly_fields = (
        'quiz_session',
        'created_at',
        'formatted_options',
        'formatted_ai_metadata',
    )
    fieldsets = (
        ('Question Details', {
            'fields': ('quiz_session', 'question_text')
        }),
        ('Options & Answers', {
            'fields': ('formatted_options', 'correct_answer', 'user_answer')
        }),
        ('Result', {
            'fields': ('is_correct',)
        }),
        ('AI Metadata', {
            'fields': ('formatted_ai_metadata',),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )

    def is_correct_badge(self, obj):
        if obj.is_correct:
            return format_html(
                '<span style="background-color: #28A745; color: white; '
                'padding: 5px 10px; border-radius: 3px; font-weight: bold;">✓ Correct</span>'
            )
        else:
            return format_html(
                '<span style="background-color: #DC3545; color: white; '
                'padding: 5px 10px; border-radius: 3px; font-weight: bold;">✗ Incorrect</span>'
            )
    is_correct_badge.short_description = 'Result'

    def user_answer_preview(self, obj):
        if obj.user_answer:
            return obj.user_answer[:50] + '...' if len(obj.user_answer) > 50 else obj.user_answer
        return '-'
    user_answer_preview.short_description = 'User Answer'

    def formatted_options(self, obj):
        import json
        options = obj.get_options()
        return format_html('<pre>{}</pre>', json.dumps(options, indent=2))
    formatted_options.short_description = 'Options (JSON)'

    def formatted_ai_metadata(self, obj):
        import json
        metadata = obj.get_ai_metadata()
        return format_html('<pre>{}</pre>', json.dumps(metadata, indent=2))
    formatted_ai_metadata.short_description = 'AI Metadata (JSON)'


@admin.register(UserScoreHistory)
class UserScoreHistoryAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'total_quizzes',
        'accuracy_badge',
        'average_score',
        'best_score',
        'last_quiz_date',
        'last_updated',
    )
    list_filter = ('last_updated', 'last_quiz_date')
    search_fields = ('user__username', 'user__email')
    readonly_fields = (
        'user',
        'total_quizzes',
        'total_questions_answered',
        'correct_answers',
        'accuracy_percentage',
        'best_score',
        'worst_score',
        'last_quiz_date',
        'last_updated',
    )
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Statistics', {
            'fields': (
                'total_quizzes',
                'total_questions_answered',
                'correct_answers',
                'accuracy_percentage',
            )
        }),
        ('Scores', {
            'fields': ('average_score', 'best_score', 'worst_score')
        }),
        ('Metadata', {
            'fields': ('last_quiz_date', 'last_updated')
        }),
    )
    can_delete = False

    def accuracy_badge(self, obj):
        accuracy = obj.get_accuracy_percentage()
        if accuracy >= 80:
            color = '#28A745'
        elif accuracy >= 60:
            color = '#FFC107'
        else:
            color = '#DC3545'
        
        return format_html(
            '<span style="background-color: {}; color: white; padding: 5px 10px; '
            'border-radius: 3px; font-weight: bold;">{:.1f}%</span>',
            color,
            accuracy
        )
    accuracy_badge.short_description = 'Accuracy'

    def accuracy_percentage(self, obj):
        return f"{obj.get_accuracy_percentage():.1f}%"
    accuracy_percentage.short_description = 'Accuracy %'


@admin.register(CategoryStatistics)
class CategoryStatisticsAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'category',
        'subcategory',
        'total_quizzes_taken',
        'average_score',
        'total_users',
        'last_updated',
    )
    list_filter = ('category', 'last_updated')
    search_fields = ('category__name', 'subcategory__name')
    readonly_fields = ('category', 'subcategory', 'last_updated')
    fieldsets = (
        ('Category Information', {
            'fields': ('category', 'subcategory')
        }),
        ('Statistics', {
            'fields': ('total_quizzes_taken', 'average_score', 'total_users')
        }),
        ('Metadata', {
            'fields': ('last_updated',)
        }),
    )
