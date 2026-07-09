

class GetUserAchievementsView(APIView):
    """
    Get user's achievements with unlock status.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            profile = request.user.profile
            current_xp = profile.xp_score or 0
            current_level = calculate_level(current_xp)
            
            # Define achievement milestones (same as frontend)
            achievement_milestones = [
                {'level': 2, 'name': 'Level Up!', 'description': 'Reached Level 2', 'xp_reward': 100},
                {'level': 5, 'name': 'Rising Star', 'description': 'Reached Level 5', 'xp_reward': 250},
                {'level': 10, 'name': 'Knowledge Seeker', 'description': 'Reached Level 10', 'xp_reward': 500},
                {'level': 20, 'name': 'Quiz Master', 'description': 'Reached Level 20', 'xp_reward': 1000},
                {'level': 30, 'name': 'Legendary Scholar', 'description': 'Reached Level 30', 'xp_reward': 2000},
                {'level': 50, 'name': 'Ultimate Champion', 'description': 'Reached Level 50', 'xp_reward': 5000},
            ]
            
            achievements = []
            total_unlocked = 0
            
            for milestone in achievement_milestones:
                is_unlocked = current_level >= milestone['level']
                if is_unlocked:
                    total_unlocked += 1
                
                # Calculate progress toward this achievement
                if current_level >= milestone['level']:
                    progress = 100
                else:
                    # Progress based on current level vs required level
                    prev_level = achievement_milestones[achievement_milestones.index(milestone) - 1]['level'] if achievement_milestones.index(milestone) > 0 else 0
                    level_range = milestone['level'] - prev_level
                    current_progress = current_level - prev_level
                    progress = min(100, int((current_progress / level_range) * 100))
                
                achievements.append({
                    'id': f"level_{milestone['level']}",
                    'name': milestone['name'],
                    'description': milestone['description'],
                    'required_level': milestone['level'],
                    'xp_reward': milestone['xp_reward'],
                    'unlocked': is_unlocked,
                    'progress': progress
                })
            
            return ResponseFormatter.success({
                'achievements': achievements,
                'total_unlocked': total_unlocked,
                'total_achievements': len(achievements),
                'current_level': current_level,
                'current_xp': current_xp
            })
            
        except Exception as e:
            logger.error(f"Error fetching achievements: {str(e)}")
            return ResponseFormatter.error(f"Failed to fetch achievements: {str(e)}", status_code=500)
