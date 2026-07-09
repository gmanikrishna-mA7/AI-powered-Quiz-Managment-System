from rest_framework import generics, permissions
from .models import GameSession, PlayerSession
from .serializers import GameSessionSerializer, PlayerSessionSerializer
from rest_framework.response import Response
from rest_framework.views import APIView

class LiveQuizHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Fetch sessions where user was a player (Host is also a player)
        player_sessions = PlayerSession.objects.filter(
            user=request.user,
            game_session__status='finished'
        ).select_related('game_session', 'game_session__host')
        
        history = []
        for ps in player_sessions:
            history.append({
                'session_id': ps.game_session.id,
                'join_code': ps.game_session.join_code,
                'played_at': ps.game_session.completed_at,
                'created_at': ps.game_session.created_at,
                'host': ps.game_session.host.username,
                'quiz_title': ps.game_session.quiz_source.title if ps.game_session.quiz_source else f"Live Session {ps.game_session.join_code}",
                'score': ps.score,
                'rank': ps.rank,
                'xp_earned': ps.xp_earned,
                'status': ps.game_session.status
            })
        
        # Sort by most recent (played_at or created_at)
        history.sort(key=lambda x: x['played_at'] or x['created_at'], reverse=True)
        return Response(history)

class LiveQuizResultView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, session_id):
        try:
           # user must be part of session to view results
           if not PlayerSession.objects.filter(game_session_id=session_id, user=request.user).exists():
               return Response({"error": "You did not participate in this session"}, status=403)

           players = PlayerSession.objects.filter(game_session_id=session_id).select_related('user', 'user__profile').order_by('rank')
           
           leaderboard = []
           for p in players:
               leaderboard.append({
                   'name': getattr(p.user.profile, 'full_name', p.user.username) if p.user.profile else p.user.username,
                   'score': p.score,
                   'rank': p.rank,
                   'xp_earned': p.xp_earned,
                   'is_me': p.user == request.user
               })
               
           return Response(leaderboard)
        except Exception as e:
            return Response({"error": str(e)}, status=400)
