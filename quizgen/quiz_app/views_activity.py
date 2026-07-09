from rest_framework import views, status, permissions
from rest_framework.response import Response
from django.utils import timezone
from django.shortcuts import get_object_or_404
from .models import Activity, GameSession, PlayerSession, Quiz, UserActivityAttempt
from django.contrib.auth.models import User
from django.db.models import Max
from django.db import transaction
import random
import string
import json

class ActivityScheduleView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        today = timezone.now().date()
        activities = Activity.objects.filter(date__gte=today).exclude(type='buzzer').order_by('date')
        # Get completed activities for user if logged in
        completed_ids = set()
        if request.user.is_authenticated:
            completed_ids = set(
                UserActivityAttempt.objects.filter(
                    user=request.user, 
                    activity__in=activities
                ).values_list('activity_id', flat=True)
            )
            print(f"DEBUG DAILY: User {request.user.id}, Today {today}, Completed IDs: {completed_ids}")
            logger.info(f"Debug Daily: User {request.user.id}, Today {today}, Completed IDs: {completed_ids}")
        
        schedule = {}
        for act in activities:
            day_str = act.date.strftime('%Y-%m-%d')
            if day_str not in schedule:
                schedule[day_str] = []
            
            is_completed = act.id in completed_ids
            schedule[day_str].append({
                'id': act.id,
                'type': act.type,
                'title': act.title,
                'difficulty': act.difficulty,
                'completed': is_completed
            })
            if is_completed:
                print(f"DEBUG DAILY: Activity {act.id} marked as completed for user.")
            if is_completed:
                logger.info(f"Debug Daily: Activity {act.id} marked as completed for user.")
            
        return Response(schedule)

class GetDailyProgressView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        date_param = request.query_params.get('date')
        if date_param:
            try:
                today = timezone.datetime.strptime(date_param, '%Y-%m-%d').date()
            except ValueError:
                today = timezone.now().date()
        else:
            today = timezone.now().date()
        
        requested_date = today
        
        def get_stats_for_date(check_date):
            acts = Activity.objects.filter(date=check_date).exclude(type='buzzer')
            if not acts.exists():
                return None
            
            total = acts.count()
            completed = 0
            if request.user.is_authenticated and total > 0:
                completed = UserActivityAttempt.objects.filter(
                    user=request.user,
                    activity__in=acts
                ).values('activity').distinct().count()
            
            return {
                'total': total,
                'completed': completed,
                'is_bonus_unlocked': completed >= total and total >= 3,
                'date': str(check_date)
            }

        # 1. Try requested date
        stats = get_stats_for_date(requested_date)

        # 2. Fallback: If 0 completed, try yesterday (timezone lag handler)
        # Only if stats exist but completed is 0, OR if stats don't exist
        if stats and stats['completed'] == 0:
             yesterday = requested_date - timezone.timedelta(days=1)
             fallback_stats = get_stats_for_date(yesterday)
             if fallback_stats and fallback_stats['completed'] > 0:
                 stats = fallback_stats
        
        if not stats:
             stats = {
                'total': 0, 'completed': 0, 'is_bonus_unlocked': False, 'date': str(requested_date)
             }
            
        return Response(stats)

class ActivityPlayView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, activity_id):
        activity = get_object_or_404(Activity, id=activity_id)
        
        # Check if already completed
        attempt = UserActivityAttempt.objects.filter(user=request.user, activity=activity).first()
        if attempt:
            return Response({
                'completed': True,
                'score': attempt.score,
                'total_questions': activity.questions.count(),
                'rank': UserActivityAttempt.objects.filter(activity=activity, score__gt=attempt.score).values('user').distinct().count() + 1,
                'activity': {
                    'id': activity.id,
                    'title': activity.title,
                    'type': activity.type
                },
                'questions': [] # No need to send questions
            })

        questions = activity.questions.all().order_by('order')
        
        return Response({
            'completed': False,
            'activity': {
                'id': activity.id,
                'title': activity.title,
                'type': activity.type
            },
            'questions': [q.content for q in questions]
        })

class ActivitySubmitView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, activity_id):
        activity = get_object_or_404(Activity, id=activity_id)
        score = request.data.get('score', 0)
        
        # Save attempt
        attempt = UserActivityAttempt.objects.create(
            user=request.user,
            activity=activity,
            score=score
        )
        
        # Calculate rank (simple count of people with higher score + 1)
        rank = UserActivityAttempt.objects.filter(
            activity=activity, 
            score__gt=score
        ).values('user').distinct().count() + 1
        
        # --- XP Logic ---
        profile = request.user.profile
        xp_earned = 10 # Base XP for activity
        
        # Check for Daily Bonus (All 3 completed?)
        today = timezone.now().date()
        todays_activities = Activity.objects.filter(date=today)
        completed_today_ids = set(UserActivityAttempt.objects.filter(
            user=request.user,
            activity__in=todays_activities
        ).values_list('activity_id', flat=True))
        
        # Add current activity to the set (since it's just created/updated but might not be in query yet depending on transaction isolation, strictly it is safe to just add it)
        completed_today_ids.add(activity.id)
        
        is_bonus = False
        if len(completed_today_ids) == 3:
            is_bonus = True
            xp_earned += 20
            
        # Update XP
        profile.check_and_reset_weekly_xp()
        profile.xp_score += xp_earned
        profile.weekly_xp += xp_earned
        profile.save(update_fields=['xp_score', 'weekly_xp'])
        
        return Response({'status': 'saved', 'rank': rank, 'xp_earned': xp_earned, 'bonus_unlocked': is_bonus})

class ActivityLeaderboardView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, activity_id):
        # Count unique participants
        total_participants = UserActivityAttempt.objects.filter(activity_id=activity_id).values('user').distinct().count()

        # Top 10 users by score (distinct users)
        attempts = UserActivityAttempt.objects.filter(activity_id=activity_id) \
            .select_related('user__profile') \
            .values('user__username', 'user__email', 'user__profile__full_name', 'score') \
            .order_by('-score')[:20]
            
        # Deduplicate users keeping highest score
        leaderboard = []
        seen_users = set()
        for att in attempts:
            if att['user__username'] not in seen_users:
                # Use full name if available, fallback to username
                display_name = att.get('user__profile__full_name') or att['user__username']
                leaderboard.append({
                    'username': display_name,  # Mapping full_name to 'username' field to avoid breaking frontend immediately, but I also send email
                    'full_name': display_name,
                    'email': att.get('user__email', ''),
                    'score': att['score']
                })
                seen_users.add(att['user__username'])
            if len(leaderboard) >= 10: break
            
        return Response({
            'total_participants': total_participants,
            'leaderboard': leaderboard
        })


# --- Live Game Views ---

def generate_join_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

class CreateGameSessionView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from .gemini_utils import generate_quiz_questions
        from .utils import generate_unique_quiz_id
        from .models import Quiz, Question

        host = request.user
        
        # Always generate a NEW quiz for live sessions to ensure freshness
        topics = ["General Knowledge", "Science", "History", "Technology", "Movies", "Geography", "Literature", "Sports", "Pop Culture", "Animals"]
        topic = random.choice(topics)
        title = f"{topic} Challenge {random.randint(100, 999)}"
        
        quiz_to_use = None
        
        try:
            # Generate fresh questions using Gemini
            questions_data, _ = generate_quiz_questions(
                category=topic, 
                title=title, 
                level="easy", 
                num_questions=5 
            )
            
            if questions_data:
                with transaction.atomic():
                    quiz_to_use = Quiz.objects.create(
                        quiz_id=generate_unique_quiz_id(),
                        title=title,
                        topic=topic,
                        difficulty_level="easy",
                        num_questions=len(questions_data),
                        created_by=host 
                    )
                    
                    question_objs = []
                    for idx, q in enumerate(questions_data):
                        question_objs.append(Question(
                            quiz=quiz_to_use,
                            order=idx + 1,
                            text=q['text'],
                            options=q['options'],
                            correct_answer=q['correct_answer']
                        ))
                    Question.objects.bulk_create(question_objs)
        except Exception as e:
            print(f"Failed to auto-generate quiz: {e}")
            # Fallback to ANY existing quiz if generation fails
            if Quiz.objects.exists():
                quiz_to_use = Quiz.objects.order_by('?').first()

        # If absolutely no quiz could be created or found (rare edge case)
        if not quiz_to_use:
             # Create a dummy failsafe quiz so the game doesn't crash
             with transaction.atomic():
                quiz_to_use = Quiz.objects.create(
                    quiz_id=generate_unique_quiz_id(),
                    title="Quick Fire Trivia",
                    topic="General",
                    difficulty_level="easy",
                    num_questions=1,
                    created_by=host
                )
                Question.objects.create(
                    quiz=quiz_to_use,
                    order=1,
                    text="Which planet is known as the Red Planet?",
                    options=["Mars", "Venus", "Jupiter", "Saturn"],
                    correct_answer="Mars"
                )

        code = generate_join_code()
        while GameSession.objects.filter(join_code=code).exists():
            code = generate_join_code()

        session = GameSession.objects.create(
            host=host,
            join_code=code,
            status='lobby',
            state={'timer': 0, 'players_ready': 0},
            quiz_source=quiz_to_use
        )
        
        # Create PlayerSession for Host so they appear in history/leaderboard
        PlayerSession.objects.create(
            game_session=session,
            user=host,
            guest_name=host.username
        )

        return Response({'join_code': code, 'session_id': session.id})

class JoinGameSessionView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        code = request.data.get('code', '').upper()
        # nickname = request.data.get('nickname', 'Guest') 
        # Using Auth user now
        
        session = get_object_or_404(GameSession, join_code=code)
        
        if session.status != 'lobby':
            # Hide existence of started games to prevent late joining confusion
            return Response({'error': 'Game session not found or has already started.'}, status=404)
            
        # Create player session
        player, created = PlayerSession.objects.get_or_create(
            game_session=session,
            user=request.user,
            defaults={'guest_name': request.user.username}
        )
        # Ensure name is set if updating legacy guest
        if not player.guest_name: 
            player.guest_name = request.user.username
            player.save()
        
        return Response({
            'player_id': player.id,
            'nickname': player.guest_name,
            'session_status': session.status
        })

class GameSessionStateView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, code):
        session = get_object_or_404(GameSession, join_code=code)
        
        # Poll logic
        players = session.players.all()
        player_list = [{'name': p.guest_name, 'score': p.score} for p in players]
        
        return Response({
            'status': session.status,
            'current_q': session.current_question_index,
            'state': session.state,
            'players': player_list,
            'player_count': len(player_list)
        })

class UpdateGameSessionView(views.APIView):
    permission_classes = [permissions.IsAuthenticated] 

    def post(self, request, code):
        session = get_object_or_404(GameSession, join_code=code)
        # Verify host
        if session.host != request.user: return Response({'error': 'Not host'}, status=403)
        
        action = request.data.get('action')
        
        if action == 'start_game':
            session.status = 'active'
            session.current_question_index = 0
            session.state['timer'] = 30 # Default example
            
        elif action == 'next_question':
            session.current_question_index += 1
            session.state['timer'] = 30
            
        elif action == 'end_game':
            session.status = 'finished'
            
        elif action == 'update_timer':
            session.state['timer'] = request.data.get('timer', 0)
            
        session.save()
        return Response({'status': 'updated', 'new_status': session.status})

class LiveGamePlayerUpdateView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, code):
        session = get_object_or_404(GameSession, join_code=code)
        player = get_object_or_404(PlayerSession, game_session=session, user=request.user)
        
        score_delta = request.data.get('score_delta', 0)
        if score_delta:
            player.score += int(score_delta)
            player.save()
            
        return Response({'status': 'updated', 'score': player.score})
