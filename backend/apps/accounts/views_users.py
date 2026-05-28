"""
User management views and endpoints.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from apps.accounts.models import User
from apps.accounts.serializers import UserSerializer, UserCreateUpdateSerializer
from apps.core.permissions import IsAdmin


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for user management.
    
    GET /api/users/ - List all users (admin only)
    POST /api/users/ - Create new user (admin only)
    GET /api/users/{id}/ - Get user details
    PUT /api/users/{id}/ - Update user (admin only)
    DELETE /api/users/{id}/ - Delete user (admin only)
    """
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated, IsAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['role', 'status', 'is_active']
    search_fields = ['name', 'email', 'phone']
    ordering_fields = ['name', 'created_at', 'last_login']
    ordering = ['-created_at']

    def get_serializer_class(self):
        """Use different serializer for create/update."""
        if self.action in ['create', 'update', 'partial_update']:
            return UserCreateUpdateSerializer
        return UserSerializer

    def get_queryset(self):
        """Admin can see all users."""
        if self.request.user.is_admin:
            return User.objects.all()
        return User.objects.filter(id=self.request.user.id)

    def create(self, request, *args, **kwargs):
        """Create a new user."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        return Response(
            {
                'success': True,
                'message': 'User created successfully',
                'data': UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        """Update user."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        return Response(
            {
                'success': True,
                'message': 'User updated successfully',
                'data': UserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        """Delete user."""
        instance = self.get_object()
        instance.delete()
        
        return Response(
            {
                'success': True,
                'message': 'User deleted successfully',
            },
            status=status.HTTP_204_NO_CONTENT,
        )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdmin])
    def toggle_status(self, request, pk=None):
        """
        Toggle user status (active/disabled).
        
        POST /api/users/{id}/toggle_status/
        """
        user = self.get_object()
        user.status = 'active' if user.status == 'disabled' else 'disabled'
        user.save()
        
        return Response(
            {
                'success': True,
                'message': f'User {user.status}',
                'data': UserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdmin])
    def reset_password(self, request, pk=None):
        """
        Send password reset link (placeholder).
        
        POST /api/users/{id}/reset_password/
        """
        user = self.get_object()
        # In production, implement actual email sending
        return Response(
            {
                'success': True,
                'message': f'Password reset link sent to {user.email}',
            },
            status=status.HTTP_200_OK,
        )
