from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from auth_app.models import UserProfile
from auth_app.xp_utils import calculate_level, get_weekly_xp_for_user
import logging

logger = logging.getLogger(__name__)


class GetGlobalLeaderboardView(APIView):
    """
    Get comprehensive global leaderboard with multiple rankings.
    Provides:
    - Total registered users count
    - Overall top 100 players (ranked by total XP)
    - Weekly top 10 players (ranked by XP earned in last 7 days)
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        import logging
        from quiz_app.models import UserActivityAttempt, QuizHistory

        try:
            # Get all users with profiles
            all_users = User.objects.select_related('profile').filter(
                profile__isnull=False
            )
            
            total_users = all_users.count()
            
            # Prepare data
            processed_users = []
            
            # Current time for weekly calculation
            now = timezone.now()
            days_since_monday = now.weekday()
            start_of_week = (now - timedelta(days=days_since_monday)).replace(hour=0, minute=0, second=0, microsecond=0)
            
            for user in all_users:
                try:
                    profile = user.profile
                    # Check and reset weekly XP
                    profile.check_and_reset_weekly_xp()
                    
                    level = calculate_level(profile.xp_score or 0)
                    full_name = profile.full_name or user.username
                    
                    processed_users.append({
                        'user_id': user.id,
                        'username': user.username,
                        'full_name': full_name,
                        'xp_score': profile.xp_score or 0,
                        'weekly_xp': profile.weekly_xp or 0, # Use stored field
                        'level': level,
                        'avatar': profile.avatar_file.url if profile.avatar_file else None
                    })
                except Exception as e:
                    # logger.warning(f"Error processing user {user.id}: {str(e)}")
                    continue
            
            # ===== OVERALL TOP 100 =====
            overall_rankings = sorted(processed_users, key=lambda x: x['xp_score'], reverse=True)
            for idx, user_data in enumerate(overall_rankings, start=1):
                user_data['rank'] = idx
            
            overall_top_100 = overall_rankings[:100]
            
            # ===== WEEKLY TOP 10 =====
            weekly_rankings = sorted(processed_users, key=lambda x: x['weekly_xp'], reverse=True)
            weekly_top_10 = []
            
            # Only top 10 needs detailed quiz count
            rank_counter = 1
            for user_data in weekly_rankings:
                # Filter out users with 0 weekly XP
                if user_data['weekly_xp'] <= 0:
                    continue
                    
                weekly_entry = user_data.copy()
                weekly_entry['rank'] = rank_counter
                
                # Calculate quizzes this week for this user (UserActivityAttempt + QuizHistory)
                # Count Daily Activities
                daily_count = UserActivityAttempt.objects.filter(
                    user_id=user_data['user_id'],
                    completed_at__gte=start_of_week
                ).count()
                
                # Count Generated Quizzes
                quiz_count = QuizHistory.objects.filter(
                    user_id=user_data['user_id'],
                    completed_at__gte=start_of_week
                ).count()
                
                weekly_entry['quizzes_this_week'] = daily_count + quiz_count
                weekly_entry['total_xp'] = user_data['xp_score'] # Frontend expects total_xp here too
                
                weekly_top_10.append(weekly_entry)
                rank_counter += 1
                
                if len(weekly_top_10) >= 10:
                    break
            
            # ===== CURRENT USER RANKS =====
            current_user_overall_rank = None
            current_user_weekly_rank = None
            
            if request.user.is_authenticated:
                # Find overall rank
                for user_data in overall_rankings:
                    if user_data['user_id'] == request.user.id:
                        current_user_overall_rank = user_data['rank']
                        break
                
                # Find weekly rank (iterate full sorted list)
                # We need to calculate rank even if not in top 10
                weekly_rank = 1
                for user_data in weekly_rankings:
                    if user_data['weekly_xp'] > 0:
                        if user_data['user_id'] == request.user.id:
                            current_user_weekly_rank = weekly_rank
                            break
                        weekly_rank += 1
                    elif user_data['user_id'] == request.user.id:
                         # User has 0 xp, effectively unranked or last
                         current_user_weekly_rank = None
                         break

            return Response({
                'success': True,
                'data': {
                    'total_users': total_users,
                    'overall_top_100': overall_top_100,
                    'weekly_top_10': weekly_top_10,
                    'current_user_overall_rank': current_user_overall_rank,
                    'current_user_weekly_rank': current_user_weekly_rank
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error fetching global leaderboard: {str(e)}")
            return Response(
                {'error': 'Failed to fetch global leaderboard', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# Keep the old view name as an alias for backward compatibility
GetLeaderboardView = GetGlobalLeaderboardView
