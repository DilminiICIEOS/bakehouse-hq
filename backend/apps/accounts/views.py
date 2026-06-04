"""
Authentication views and endpoints.
Integrated with secure cryptographic token generation and email dispatch for password resets.
file: backend/apps/accounts/views.py
"""

import logging
from pathlib import Path

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView as SimpleJWTTokenRefreshView
from django.contrib.auth import authenticate
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

# Core Django mail engines and cryptographic token generators
from django.core.mail import send_mail
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode  # 🌟 Added urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str  # 🌟 Added force_str
from django.conf import settings

from apps.accounts.models import User
from apps.accounts.serializers import (
    BakeryTokenObtainPairSerializer,
    CustomerRegistrationSerializer,
    MeSerializer,
    UserSerializer,
)

logger = logging.getLogger(__name__)


class BakeryTokenObtainPairView(TokenObtainPairView):
    """
    Obtain JWT token pair (access + refresh).
    
    POST /api/auth/login
    {
        "email": "user@example.com",
        "password": "password123"
    }
    """
    serializer_class = BakeryTokenObtainPairSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        """Override to wrap auth responses and return consistent error codes."""
        debug_path = Path(__file__).resolve().parent.parent / 'logs' / 'login_debug.txt'
        try:
            debug_path.parent.mkdir(parents=True, exist_ok=True)
            with open(debug_path, 'a', encoding='utf-8') as f:
                f.write('--- LOGIN REQUEST ---\n')
                f.write(f'content_type={request.content_type}\n')
                f.write(f'body={request.body!r}\n')
                f.write(f'data={request.data!r}\n')
                f.write('\n')
        except Exception:
            pass
        print('DEBUG LOGIN request data:', request.data)
        logger.debug('Login request data: %s', request.data)
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except ValidationError as exc:
            logger.debug('Login failed validation: %s', exc.detail)
            return Response(
                {
                    'success': False,
                    'error': {
                        'message': str(exc.detail),
                        'code': 'authentication_failed',
                    },
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        data = serializer.validated_data
        email = request.data.get('email')
        try:
            user = User.objects.get(email=email)
            user.last_login = timezone.now()
            user.update_last_login_display()
        except User.DoesNotExist:
            pass

        return Response(
            {
                'success': True,
                'data': data,
            },
            status=status.HTTP_200_OK,
        )


class BakeryTokenRefreshView(SimpleJWTTokenRefreshView):
    """
    Refresh JWT access token.
    
    POST /api/auth/refresh
    {
        "refresh": "refresh_token"
    }
    """

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        return Response(
            {
                'success': True,
                'data': response.data,
            },
            status=response.status_code,
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    Logout and invalidate refresh token.
    
    POST /api/auth/logout
    """
    try:
        user = request.user
        user.last_logout = timezone.now()
        user.save()
        
        return Response(
            {
                'success': True,
                'message': 'Successfully logged out.',
            },
            status=status.HTTP_200_OK,
        )
    except Exception as e:
        return Response(
            {
                'success': False,
                'error': {
                    'message': str(e),
                    'code': 'LogoutError',
                },
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user_view(request):
    """
    Get current authenticated user info.
    
    GET /api/auth/me
    """
    serializer = MeSerializer(request.user)
    return Response(
        {
            'success': True,
            'data': serializer.data,
        },
        status=status.HTTP_200_OK,
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """
    Register a new customer account.

    POST /api/auth/register/
    """
    serializer = CustomerRegistrationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()

    return Response(
        {
            'success': True,
            'message': 'Registration successful.',
            'data': UserSerializer(user).data,
        },
        status=status.HTTP_201_CREATED,
    )


# Production-Ready Forgot Password View (Fulfills SRS System Feature 1)
@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password_view(request):
    """
    Generates single-use cryptographic security tokens and dispatches password reset emails.
    POST /api/auth/forgot-password/
    """
    email = request.data.get('email')
    if not email:
        return Response({
            'success': False,
            'error': {
                'message': 'Please enter a valid email address.',
                'code': 'missing_email'
            }
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email=email)
        
        # 1. Generate encrypted single-use recovery token linked directly to account states
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        # 2. Map the target reset callback redirect destination route
        frontend_base_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:8080')
        reset_url = f"{frontend_base_url}/reset-password?uid={uid}&token={token}"
        
        # 3. Compile the communication message body parameters
        email_subject = "BakeryHUB — Account Security Password Reset"
        email_body = (
            f"Hello {user.name},\n\n"
            f"A password reset request was initiated for your employee account profile on BakeryHUB.\n"
            f"Click the link below to safely verify your identity and update your credentials:\n\n"
            f"{reset_url}\n\n"
            f"Note: This token link is single-use and will automatically expire in 15 minutes. "
            f"If you did not initiate this change, please disregard this email safely.\n\n"
            f"BakeryHUB System Administration Security Desk"
        )
        
        # 4. Dispatch via Django Core Mail Infrastructure Engines
        send_mail(
            subject=email_subject,
            message=email_body,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'security@bakeryhub.com'),
            recipient_list=[user.email],
            fail_silently=False,
        )
        
        return Response({
            'success': True,
            'message': 'A secure verification token link has been successfully dispatched.'
        }, status=status.HTTP_200_OK)

    except User.DoesNotExist:
        # Security best practice: Return generic text to mask account information mapping details
        return Response({
            'success': True,
            'message': 'If that account profile exists, an recovery email link has been dispatched.'
        }, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error("Password reset failure encountered: %s", str(e))
        return Response({
            'success': False,
            'error': {
                'message': f"Internal Mail delivery failure: {str(e)}",
                'code': 'mail_delivery_error'
            }
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# 🌟 NEW: End-to-End Password Confirmation Target View
@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password_confirm_view(request):
    """
    Validates cryptographic parameters and safely commits the updated password text.
    POST /api/auth/reset-password-confirm/
    """
    uid_b64 = request.data.get('uid')
    token = request.data.get('token')
    new_password = request.data.get('password')

    if not all([uid_b64, token, new_password]):
        return Response({
            'success': False,
            'error': {
                'message': 'Missing mandatory verification data parameters.',
                'code': 'missing_fields'
            }
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Decode base64 primary key configuration mapping back to real User IDs
        uid = force_str(urlsafe_base64_decode(uid_b64))
        user = User.objects.get(pk=uid)
        
        # Validate that token signatures correlate precisely with user account states
        if not default_token_generator.check_token(user, token):
            return Response({
                'success': False,
                'error': {
                    'message': 'The security recovery token is invalid or has expired.',
                    'code': 'invalid_token'
                }
            }, status=status.HTTP_400_BAD_REQUEST)
            
        # Complete cryptographic updates and reset account access health rules
        user.set_password(new_password)
        user.status = 'active'
        user.is_active = True
        user.save()
        
        return Response({
            'success': True,
            'message': 'Your account security credentials have been successfully updated.'
        }, status=status.HTTP_200_OK)

    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response({
            'success': False,
            'error': {
                'message': 'Invalid verification linkage constraints.',
                'code': 'invalid_user'
            }
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def health_check_view(request):
    """
    Health check endpoint.
    
    POST /api/auth/health/
    """
    return Response(
        {
            'success': True,
            'message': 'API is healthy',
            'timestamp': timezone.now(),
        },
        status=status.HTTP_200_OK,
    )