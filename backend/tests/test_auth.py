"""
Comprehensive tests for authentication.
"""

import pytest
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


@pytest.mark.django_db
class TestAuthentication(TestCase):
    """Test authentication endpoints."""

    def setUp(self):
        """Set up test client and user."""
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='test@example.com',
            name='Test User',
            password='testpass123',
            role='salesperson',
        )

    def test_user_login_success(self):
        """Test successful user login."""
        response = self.client.post('/api/v1/auth/login/', {
            'email': 'test@example.com',
            'password': 'testpass123',
        })
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data['data']
        assert 'refresh' in response.data['data']
        assert response.data['data']['user']['email'] == 'test@example.com'

    def test_user_login_invalid_password(self):
        """Test login with invalid password."""
        response = self.client.post('/api/v1/auth/login/', {
            'email': 'test@example.com',
            'password': 'wrongpassword',
        })
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_user_login_nonexistent_email(self):
        """Test login with non-existent email."""
        response = self.client.post('/api/v1/auth/login/', {
            'email': 'nonexistent@example.com',
            'password': 'testpass123',
        })
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_disabled_user_login(self):
        """Test login with disabled user."""
        disabled_user = User.objects.create_user(
            email='disabled@example.com',
            name='Disabled User',
            password='testpass123',
            role='salesperson',
            status='disabled',
        )
        
        response = self.client.post('/api/v1/auth/login/', {
            'email': 'disabled@example.com',
            'password': 'testpass123',
        })
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_current_user(self):
        """Test getting current user info."""
        # Login first
        login_response = self.client.post('/api/v1/auth/login/', {
            'email': 'test@example.com',
            'password': 'testpass123',
        })
        token = login_response.data['data']['access']
        
        # Get current user
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/v1/auth/me/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['data']['email'] == 'test@example.com'

    def test_logout(self):
        """Test user logout."""
        # Login first
        login_response = self.client.post('/api/v1/auth/login/', {
            'email': 'test@example.com',
            'password': 'testpass123',
        })
        token = login_response.data['data']['access']
        
        # Logout
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/v1/auth/logout/')
        
        assert response.status_code == status.HTTP_200_OK
