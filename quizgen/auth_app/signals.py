from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from auth_app.models import UserProfile


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        if not UserProfile.objects.filter(user=instance).exists():
            UserProfile.objects.create(
                user=instance,
                full_name=instance.get_full_name() or instance.username,
                preferences={}
            )


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        # Sync full_name from User to Profile
        instance.profile.full_name = instance.get_full_name() or instance.username
        
        # Save all fields EXCEPT XP-related ones to prevent overwriting with stale data.
        # This fixes the race condition where a User save (e.g. login update) 
        # resets XP to an old value loaded in memory.
        xp_fields = {
            'xp_score', 
            'weekly_xp', 
            'last_weekly_reset', 
            'fast_paced_points', 
            'time_based_points'
        }
        
        # Get all fields that are not in the exclusion list
        update_fields = [
            f.name for f in instance.profile._meta.fields 
            if f.name not in xp_fields and f.name != 'id'
        ]
        
        instance.profile.save(update_fields=update_fields)
