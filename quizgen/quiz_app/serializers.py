from rest_framework import serializers
from .models import Quiz, Question, QuizHistory, GameSession, PlayerSession

class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ['id', 'question_text', 'options', 'correct_answer', 'order']

class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Quiz
        fields = [
            'quiz_id', 'title', 'topic', 'difficulty_level', 
            'image_link', 'num_questions', 'duration_minutes', 
            'created_at', 'questions', 'language'
        ]

class QuizHistorySerializer(serializers.ModelSerializer):
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    quiz_id = serializers.CharField(source='quiz.quiz_id', read_only=True)

    class Meta:
        model = QuizHistory
        fields = [
            'id', 'quiz_id', 'quiz_title', 'score', 
            'total_questions', 'completed_at', 'user_answers', 'questions'
        ]

class QuizGenerationSerializer(serializers.Serializer):
    topic = serializers.CharField(max_length=255, required=True)
    difficulty = serializers.ChoiceField(choices=['Easy', 'Medium', 'Hard', 'Mixed'], default='Mixed')
    num_questions = serializers.IntegerField(min_value=1, max_value=20, default=5)


class CreateQuizSerializer(serializers.Serializer):
    """Serializer for creating a new quiz with AI-generated questions"""
    category = serializers.CharField(max_length=255, required=True, help_text="Quiz category")
    title = serializers.CharField(max_length=255, required=True, help_text="Quiz title")
    level = serializers.ChoiceField(choices=['easy', 'medium', 'hard'], required=True, help_text="Difficulty level")
    num_questions = serializers.IntegerField(min_value=1, max_value=50, required=True, help_text="Number of questions")
    duration_seconds = serializers.IntegerField(min_value=60, required=True, help_text="Quiz duration in seconds")
    additional_instructions = serializers.CharField(max_length=500, required=False, allow_blank=True, help_text="Additional context for question generation")


class QuizDetailSerializer(serializers.ModelSerializer):
    """Detailed quiz serializer with all fields"""
    questions_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Quiz
        fields = [
            'id', 'quiz_id', 'category', 'title', 'topic', 'level',
            'num_questions', 'duration_seconds', 'is_mock',
            'created_by', 'created_at', 'updated_at', 'questions_count', 'language'
        ]
    
    def get_questions_count(self, obj):
        return obj.questions.count()

class GameSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = GameSession
        fields = '__all__'

class PlayerSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlayerSession
        fields = '__all__'
