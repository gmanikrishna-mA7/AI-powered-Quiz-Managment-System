from rest_framework import serializers
from django.contrib.auth.models import User
from auth_app.models import UserProfile, PasswordReset
from django.utils import timezone
from datetime import timedelta

class UserProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    is_session_valid = serializers.SerializerMethodField()
    avatar_file = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            'id', 'full_name', 'email', 'username', 'avatar', 'avatar_file', 
            'bio', 'preferences', 'email_verified', 'last_active', 'last_login',
            'is_active', 'is_session_valid', 'created_at', 'updated_at'
        ]
        read_only_fields = ['email', 'username', 'email_verified', 'last_active', 'is_session_valid']

    def get_is_session_valid(self, obj):
        return obj.is_session_valid()
    
    def get_avatar_file(self, obj):
        if obj.avatar_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar_file.url)
            return obj.avatar_file.url
        return None


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['full_name', 'avatar', 'bio', 'preferences']
    
    def validate_preferences(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Preferences must be a JSON object")
        return value


class AvatarUploadSerializer(serializers.ModelSerializer):
    avatar = serializers.FileField(required=False, write_only=True)
    
    class Meta:
        model = UserProfile
        fields = ['avatar_file', 'avatar']
    
    def validate_avatar(self, value):
        if value.size > 5 * 1024 * 1024:  # 5MB limit
            raise serializers.ValidationError("Avatar file must be smaller than 5MB")
        valid_extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']
        file_extension = value.name.split('.')[-1].lower()
        if file_extension not in valid_extensions:
            raise serializers.ValidationError(f"File format not supported. Allowed: {', '.join(valid_extensions)}")
        return value
    
    def update(self, instance, validated_data):
        avatar = validated_data.get('avatar')
        if avatar:
            # Remove old avatar file if exists
            if instance.avatar_file:
                instance.avatar_file.delete()
            instance.avatar_file = avatar
            instance.save()
        return instance


class UserRegistrationSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255, required=True)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(min_length=8, write_only=True, required=True)
    password_confirm = serializers.CharField(min_length=8, write_only=True, required=True)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already registered.")
        return value

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        if value.isdigit():
            raise serializers.ValidationError("Password must contain letters.")
        return value

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return data

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        
        profile = UserProfile.objects.get(user=user)
        profile.full_name = validated_data['full_name']
        profile.save()
        
        return user


class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True)

    def validate(self, data):
        email = data.get('email')
        password = data.get('password')

        # Use filter().first() to handle potential duplicates gracefully
        user = User.objects.filter(email=email).first()
        
        if not user:
            raise serializers.ValidationError("Account does not exist.")

        if not user.check_password(password):
            raise serializers.ValidationError("Invalid email or password.")

        data['user'] = user
        return data


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    
    def validate_email(self, value):
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email not found.")
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)
    password = serializers.CharField(min_length=8, write_only=True, required=True)
    password_confirm = serializers.CharField(min_length=8, write_only=True, required=True)
    
    def validate(self, data):
        token = data.get('token')
        password = data.get('password')
        password_confirm = data.get('password_confirm')
        
        try:
            reset = PasswordReset.objects.get(token=token)
        except PasswordReset.DoesNotExist:
            raise serializers.ValidationError({"token": "Invalid or expired token."})
        
        if not reset.is_valid():
            raise serializers.ValidationError({"token": "Token has expired or already been used."})
        
        if password != password_confirm:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        
        data['reset'] = reset
        return data


class EmailVerificationSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)


class UserDetailSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    email = serializers.EmailField()
    full_name = serializers.CharField()
    avatar = serializers.URLField(allow_blank=True, allow_null=True)
    bio = serializers.CharField(allow_blank=True, allow_null=True)
    preferences = serializers.JSONField()
    email_verified = serializers.BooleanField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()
