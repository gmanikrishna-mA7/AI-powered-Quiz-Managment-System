from datetime import datetime, timedelta
from django.utils import timezone

def calculate_activity_date(completed_at):
    """
    Calculate activity date with 4am cutoff.
    Attempts between 2 Jan 4am - 3 Jan 4am count as 2 Jan.
    """
    # Convert to datetime if needed
    if isinstance(completed_at, str):
        completed_at = datetime.fromisoformat(completed_at.replace('Z', '+00:00'))
    
    # Subtract 4 hours to apply cutoff
    adjusted_time = completed_at - timedelta(hours=4)
    
    # Return just the date
    return adjusted_time.date()


def update_user_streak(user, completed_at):
    """
    Update user's streak based on quiz completion time.
    Args:
        user: User object
        completed_at: DateTime when quiz was completed
    """
    profile = user.profile
    activity_date = calculate_activity_date(completed_at)
    
    # First quiz ever
    if not profile.last_activity_date:
        profile.current_streak = 1
        profile.longest_streak = 1
        profile.last_activity_date = activity_date
        profile.save()
        return
    
    # Same day - no change to streak
    if activity_date == profile.last_activity_date:
        return
    
    # Calculate day difference
    days_diff = (activity_date - profile.last_activity_date).days
    
    # Consecutive day (yesterday)
    if days_diff == 1:
        profile.current_streak += 1
        if profile.current_streak > profile.longest_streak:
            profile.longest_streak = profile.current_streak
    # Streak broken (gap > 1 day)
    elif days_diff > 1:
        profile.current_streak = 1
    # Date in past (shouldn't happen, but handle it)
    else:
        return
    
    profile.last_activity_date = activity_date
    profile.save()
