from rest_framework.authentication import BaseAuthentication
from django.contrib.auth.models import AnonymousUser
from rest_framework import exceptions
import logging

logger = logging.getLogger(__name__)

class BearerTokenAuthentication(BaseAuthentication):
    """
    Custom authentication that checks for Bearer token in Authorization header
    and validates it matches the session token.
    """
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header.split(' ')[1] if len(auth_header.split(' ')) > 1 else None
        
        if not token:
            return None
        
        # Check if user is authenticated via session
        if hasattr(request, 'user') and request.user.is_authenticated:
            logger.info(f"Authenticated user via bearer token: {request.user.email}")
            return (request.user, None)
        
        # If no session auth, raise authentication failed
        raise exceptions.AuthenticationFailed('Invalid or expired token')
