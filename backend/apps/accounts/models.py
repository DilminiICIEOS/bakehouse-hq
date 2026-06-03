"""
User models for authentication and role-based access control.
"""

from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.validators import EmailValidator
from django.utils import timezone
from apps.core.models import TimeStampedModel


class UserManager(BaseUserManager):
    """Custom user manager for User model."""

    def create_user(self, email, password=None, **extra_fields):
        """
        Create and save a regular user with an email and password.
        """
        if not email:
            raise ValueError('Email is required')
        
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """
        Create and save a superuser with an email and password.
        """
        extra_fields.setdefault('role', 'admin')
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin, TimeStampedModel):
    """
    Custom user model with role-based access control.
    """
    ROLE_CHOICES = [
        ('admin', 'Administrator'),
        ('manager', 'Manager'),
        ('salesperson', 'Salesperson'),
        ('factory_distributor', 'Factory Distributor'),
        ('customer', 'Customer'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('disabled', 'Disabled'),
    ]

    # Basic fields
    email = models.EmailField(
        unique=True,
        validators=[EmailValidator()],
        db_index=True,
    )
    name = models.CharField(max_length=255)
    avatar = models.URLField(null=True, blank=True)

    # Role and permissions
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='salesperson',
        db_index=True,
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active',
        db_index=True,
    )

    # Standard Django auth fields
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)

    # Activity tracking
    last_login = models.DateTimeField(null=True, blank=True)
    last_logout = models.DateTimeField(null=True, blank=True)
    
    # For frontend display
    last_login_display = models.CharField(max_length=255, null=True, blank=True)

    # Metadata
    phone = models.CharField(max_length=20, null=True, blank=True)
    department = models.CharField(max_length=100, null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    EMAIL_FIELD = 'email'
    REQUIRED_FIELDS = ['name']

    class Meta:
        db_table = 'accounts_user'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['role']),
            models.Index(fields=['status']),
            models.Index(fields=['is_active']),
        ]
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f"{self.name} ({self.email})"

    ROLE_GROUP_MAPPING = {
        'admin': 'Admin',
        'manager': 'Manager',
        'salesperson': 'Salesperson',
        'factory_distributor': 'Factory Distributor',
        'customer': 'Customer',
    }

    @classmethod
    def group_name_for_role(cls, role):
        return cls.ROLE_GROUP_MAPPING.get(role)

    def sync_groups(self):
        """Ensure the user is assigned to the correct role group."""
        try:
            from django.contrib.auth.models import Group

            group_name = self.group_name_for_role(self.role)
            if not group_name:
                return

            current_group, _ = Group.objects.get_or_create(name=group_name)
            self.groups.add(current_group)

            for other_group_name in self.ROLE_GROUP_MAPPING.values():
                if other_group_name != group_name:
                    other_group, _ = Group.objects.get_or_create(name=other_group_name)
                    self.groups.remove(other_group)
        except Exception:
            pass

    def save(self, *args, **kwargs):
        """Save and sync status with is_active and group membership."""
        if self.status == 'disabled':
            self.is_active = False
        elif self.status == 'active':
            self.is_active = True
        super().save(*args, **kwargs)
        self.sync_groups()

    def update_last_login_display(self):
        """Update the display-friendly last_login field."""
        if self.last_login:
            self.last_login_display = self.last_login.strftime('%Y-%m-%d %H:%M')
        else:
            self.last_login_display = '—'
        self.save(update_fields=['last_login_display'])

    @property
    def is_admin(self):
        """Check if user is admin."""
        return self.role == 'admin' or self.is_superuser

    @property
    def is_manager(self):
        """Check if user is manager or admin."""
        return self.role in ['admin', 'manager'] or self.is_superuser

    @property
    def is_salesperson(self):
        """Check if user is salesperson."""
        return self.role == 'salesperson' or self.is_admin

    @property
    def is_factory_distributor(self):
        """Check if user is factory distributor."""
        return self.role == 'factory_distributor' or self.is_admin

    @property
    def is_customer(self):
        """Check if user is a customer."""
        return self.role == 'customer'

    def can_edit_user(self, target_user):
        """Check if user can edit another user."""
        if self.is_admin:
            return True
        return False

    def can_view_reports(self):
        """Check if user can view reports."""
        return self.is_manager

    def can_manage_users(self):
        """Check if user can manage users."""
        return self.is_admin

    def can_create_sale(self):
        """Check if user can create sales."""
        return self.role == 'salesperson' or self.is_admin

    def can_record_wastage(self):
        """Check if user can record wastage."""
        return self.role == 'salesperson' or self.is_admin
