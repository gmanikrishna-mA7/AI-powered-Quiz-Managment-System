from django.urls import path
from .views import (
    CreateQuizView, 
    QuizListView, 
    QuizQuestionsView,
    GetQuizzesByCategoryView,
    CountQuizzesByCategoryView,
    GetQuizQuestionsByIdView,
    GetQuizDetailView,
)
from .views_activity import (
    ActivityScheduleView, 
    ActivityPlayView,
    ActivitySubmitView,
    ActivityLeaderboardView,
    CreateGameSessionView, 
    JoinGameSessionView, 
    GameSessionStateView, 
    UpdateGameSessionView,
    LiveGamePlayerUpdateView,
    GetDailyProgressView
)
from .views_history import LiveQuizHistoryView, LiveQuizResultView
from .leaderboard_view import GetGlobalLeaderboardView

urlpatterns = [
    path('create/', CreateQuizView.as_view(), name='create-quiz'),
    path('list/', QuizListView.as_view(), name='quiz-list'),
    path('<str:quiz_id>/questions/', QuizQuestionsView.as_view(), name='quiz-questions'),
    
    # New APIs for fetching from CSV
    path('by-category/', GetQuizzesByCategoryView.as_view(), name='quizzes-by-category'),
    path('count-by-category/', CountQuizzesByCategoryView.as_view(), name='count-quizzes-by-category'),
    path('csv/<str:quiz_id>/questions/', GetQuizQuestionsByIdView.as_view(), name='csv-quiz-questions'),
    path('detail/<str:quiz_id>/', GetQuizDetailView.as_view(), name='quiz-detail'),
    
    # Leaderboard endpoints
    path('leaderboard/global/', GetGlobalLeaderboardView.as_view(), name='global-leaderboard'),
    path('leaderboard/', GetGlobalLeaderboardView.as_view(), name='leaderboard'),  # Backward compatibility
    
    # Fun & Activities
    path('activities/schedule/', ActivityScheduleView.as_view(), name='activity-schedule'),
    path('activities/daily-progress/', GetDailyProgressView.as_view(), name='activity-daily-progress'),
    path('activities/<int:activity_id>/play/', ActivityPlayView.as_view(), name='activity-play'),
    path('activities/<int:activity_id>/submit/', ActivitySubmitView.as_view(), name='activity-submit'),
    path('activities/<int:activity_id>/leaderboard/', ActivityLeaderboardView.as_view(), name='activity-leaderboard'),
    
    # Live Hosted Quiz
    path('live/create/', CreateGameSessionView.as_view(), name='live-create'),
    path('live/join/', JoinGameSessionView.as_view(), name='live-join'),
    path('live/session/<str:code>/host_state/', GameSessionStateView.as_view(), name='live-host-state'),
    path('live/session/<str:code>/player_state/', GameSessionStateView.as_view(), name='live-player-state'),
    path('live/session/<str:code>/update_state/', UpdateGameSessionView.as_view(), name='live-update-state'),
    path('live/session/<str:code>/player_update/', LiveGamePlayerUpdateView.as_view(), name='live-player-update'),
    
    # Live Quiz History
    path('live/history/', LiveQuizHistoryView.as_view(), name='live-history'),
    path('live/session/<int:session_id>/result/', LiveQuizResultView.as_view(), name='live-result'),
]

