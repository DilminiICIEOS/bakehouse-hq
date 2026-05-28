"""
Serializers for authentication and user management.
"""

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate
from apps.accounts.models import User


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user representation."""
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'name', 'role', 'status',
            'avatar', 'phone', 'department',
            'is_active', 'created_at', 'last_login_display',
        ]
        read_only_fields = ['id', 'created_at', 'last_login_display']


class UserCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for user creation and update."""
    
    password = serializers.CharField(
        write_only=True,
        required=True,
        min_length=8,
        style={'input_type': 'password'},
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=False,
        style={'input_type': 'password'},
    )

    class Meta:
        model = User
        fields = [
            'email', 'name', 'password', 'password_confirm',
            'role', 'phone', 'department',
        ]
        extra_kwargs = {
            'email': {'required': True},
            'name': {'required': True},
            'role': {'required': True},
        }

    def validate(self, attrs):
        """Validate password confirmation."""
        if 'password_confirm' in attrs:
            if attrs['password'] != attrs['password_confirm']:
                raise serializers.ValidationError(
                    {'password': 'Passwords do not match.'}
                )
        return attrs

    def create(self, validated_data):
        """Create user with password."""
        validated_data.pop('password_confirm', None)
        user = User.objects.create_user(**validated_data)
        return user

    def update(self, instance, validated_data):
        """Update user."""
        password = validated_data.pop('password', None)
        validated_data.pop('password_confirm', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if password:
            instance.set_password(password)
        
        instance.save()
        return instance


class BakeryTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom token serializer with additional user info."""
    
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['email', 'password']

    def validate(self, attrs):
        """Custom validation with email-based auth."""
        email = attrs.get('email')
        password = attrs.get('password')

        if not email or not password:
            raise serializers.ValidationError('Email and password are required.')

        user = authenticate(username=email, password=password)
        
        if not user:
            raise serializers.ValidationError('Invalid email or password.')
        
        if not user.is_active or user.status == 'disabled':
            raise serializers.ValidationError('This account is disabled.')

        refresh = self.get_token(user)

        data = {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        }

        return data

    @classmethod
    def get_token(cls, user):
        """Get token and add custom claims."""
        token = super().get_token(user)
        token['email'] = user.email
        token['name'] = user.name
        token['role'] = user.role
        return token


class TokenRefreshSerializer(serializers.Serializer):
    """Serializer for token refresh."""
    refresh = serializers.CharField()


class MeSerializer(serializers.ModelSerializer):
    """Serializer for current user info."""
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'name', 'role', 'status',
            'avatar', 'phone', 'department',
            'is_active', 'created_at', 'last_login_display',
        ]
        read_only_fields = fields
