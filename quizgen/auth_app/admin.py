from django.contrib import admin
from auth_app.models import UserProfile, PasswordReset, LoginAttempt

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('id', 'full_name', 'user', 'email_verified', 'is_active')
    list_filter = ('created_at', 'is_active', 'email_verified')
    search_fields = ('full_name', 'user__email', 'bio')
    readonly_fields = ('created_at', 'last_active', 'last_login', 'email_verification_token')
    
    fieldsets = (
        ('User Information', {
            'fields': ('user', 'full_name', 'email_display', 'email_verified')
        }),
        ('Profile Details', {
            'fields': ('avatar_file', 'bio', 'preferences')
        }),
        ('Account Status', {
            'fields': ('is_active', 'session_timeout_minutes')
        }),
        ('Activity', {
            'fields': ('last_login', 'last_active', 'created_at'),
            'classes': ('collapse',)
        }),
        ('Email Verification', {
            'fields': ('email_verification_token',),
            'classes': ('collapse',)
        }),
    )

    def email_display(self, obj):
        return obj.user.email
    email_display.short_description = 'Email'

    def has_add_permission(self, request):
        return False


@admin.register(PasswordReset)
class PasswordResetAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'is_used', 'expires_at', 'created_at')
    list_filter = ('is_used', 'created_at', 'expires_at')
    search_fields = ('user__email', 'token')
    readonly_fields = ('token', 'created_at', 'expires_at', 'used_at')
    
    def has_add_permission(self, request):
        return False


@admin.register(LoginAttempt)
class LoginAttemptAdmin(admin.ModelAdmin):
    list_display = ('id', 'email', 'ip_address', 'success', 'attempted_at')
    list_filter = ('success', 'attempted_at')
    search_fields = ('email', 'ip_address')
    readonly_fields = ('attempted_at',)
    
    def has_add_permission(self, request):
        return False
