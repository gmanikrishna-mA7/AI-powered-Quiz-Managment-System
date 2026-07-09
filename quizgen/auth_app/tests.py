from django.test import TestCase
from django.contrib.auth.models import User
from auth_app.models import UserProfile
from auth_app.serializers import UserRegistrationSerializer, UserLoginSerializer


class UserProfileModelTest(TestCase):    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser@example.com',
            email='testuser@example.com',
            password='testpass123'
        )
        # UserProfile is automatically created by signal
        self.profile = self.user.profile
    
    def test_user_profile_creation(self):
        self.assertIsNotNone(self.profile)
        self.assertEqual(self.profile.user.email, 'testuser@example.com')
    
    def test_user_profile_string_representation(self):
        # The profile full_name is set to username by signal in setUp
        expected_str = f"{self.profile.full_name} - {self.user.email}"
        self.assertEqual(str(self.profile), expected_str)


class UserRegistrationSerializerTest(TestCase):
    
    def test_valid_registration_data(self):
        data = {
            'full_name': 'John Doe',
            'email': 'john@example.com',
            'password': 'securepass123',
            'password_confirm': 'securepass123'
        }
        serializer = UserRegistrationSerializer(data=data)
        self.assertTrue(serializer.is_valid())
    
    def test_invalid_email_duplicate(self):
        User.objects.create_user(
            username='existing@example.com',
            email='existing@example.com',
            password='pass123'
        )
        
        data = {
            'full_name': 'Another User',
            'email': 'existing@example.com',
            'password': 'securepass123',
            'password_confirm': 'securepass123'
        }
        serializer = UserRegistrationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
    
    def test_password_mismatch(self):
        data = {
            'full_name': 'John Doe',
            'email': 'john@example.com',
            'password': 'securepass123',
            'password_confirm': 'differentpass123'
        }
        serializer = UserRegistrationSerializer(data=data)
        self.assertFalse(serializer.is_valid())


class UserLoginSerializerTest(TestCase):
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser@example.com',
            email='testuser@example.com',
            password='testpass123'
        )
    
    def test_valid_login_credentials(self):
        data = {
            'email': 'testuser@example.com',
            'password': 'testpass123'
        }
        serializer = UserLoginSerializer(data=data)
        self.assertTrue(serializer.is_valid())
    
    def test_invalid_email(self):
        data = {
            'email': 'nonexistent@example.com',
            'password': 'testpass123'
        }
        serializer = UserLoginSerializer(data=data)
        self.assertFalse(serializer.is_valid())
    
    def test_invalid_password(self):
        data = {
            'email': 'testuser@example.com',
            'password': 'wrongpassword'
        }
        serializer = UserLoginSerializer(data=data)
        self.assertFalse(serializer.is_valid())
