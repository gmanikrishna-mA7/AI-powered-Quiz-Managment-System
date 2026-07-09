from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.utils import timezone
from auth_app.models import UserProfile, PasswordReset, LoginAttempt
from auth_app.utils import (
    generate_password_reset_token,
    generate_email_verification_token,
    verify_email_token,
    check_rate_limit,
    record_login_attempt,
)
import json
from datetime import timedelta


class UserRegistrationTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.valid_data = {
            'full_name': 'John Doe',
            'email': 'john@example.com',
            'password': 'SecurePass123',
            'password_confirm': 'SecurePass123'
        }
    
    def test_successful_registration(self):
        response = self.client.post(
            '/api/auth/register/',
            json.dumps(self.valid_data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertEqual(User.objects.count(), 1)
    
    def test_duplicate_email_rejection(self):
        User.objects.create_user(
            username='john@example.com',
            email='john@example.com',
            password='OldPass123'
        )
        
        response = self.client.post(
            '/api/auth/register/',
            json.dumps(self.valid_data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)


class UserAuthenticationTests(TestCase):    
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='test@example.com',
            email='test@example.com',
            password='SecurePass123'
        )
    
    def test_successful_login(self):
        response = self.client.post(
            '/api/auth/login/',
            json.dumps({
                'email': 'test@example.com',
                'password': 'SecurePass123'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)


class ProfileManagementTests(TestCase):    
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='test@example.com',
            email='test@example.com',
            password='SecurePass123'
        )
        self.client.login(username='test@example.com', password='SecurePass123')
    
    def test_get_profile(self):
        response = self.client.get('/api/auth/profile/')
        self.assertEqual(response.status_code, 200)


class PasswordRecoveryTests(TestCase):    
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='test@example.com',
            email='test@example.com',
            password='SecurePass123'
        )
    
    def test_password_reset_request(self):
        response = self.client.post(
            '/api/auth/password-reset/',
            json.dumps({'email': 'test@example.com'}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
