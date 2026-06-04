"""
Custom permissions for role-based access control (RBAC).
Directly enforces security specifications outlined in SRS Section 2.3 and 5.3.
file: backend/apps/core/permissions.py
"""

from django.contrib.auth.models import Group
from rest_framework.permissions import BasePermission


def has_group(user, group_name):
    """Helper function to verify if a user belongs to a specific Django Group."""
    return bool(
        user and
        user.is_authenticated and
        (user.is_superuser or user.groups.filter(name=group_name).exists())
    )


class IsAdmin(BasePermission):
    """Allow access only to full system Admin accounts (SRS Section 2.3)."""
    message = 'Admin access required.'

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (
                request.user.is_superuser or 
                getattr(request.user, 'role', None) == 'admin' or 
                has_group(request.user, 'Admin')
            )
        )


class IsManager(BasePermission):
    """Allow access to business performance Managers and Admins (SRS Section 2.3)."""
    message = 'Manager or admin access required.'

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (
                request.user.is_superuser or
                getattr(request.user, 'role', None) in ['admin', 'manager'] or
                has_group(request.user, 'Manager')
            )
        )


class IsFactoryDistributor(BasePermission):
    """
    Allow access to Factory staff and Admins (SRS Section 2.3 & Feature 4.2).
    🌟 Guarded: Supports both manager and distributor strings to prevent mismatch errors.
    """
    message = 'Factory Distributor or Factory Manager access required.'

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (
                request.user.is_superuser or
                getattr(request.user, 'role', None) in ['admin', 'factory_distributor', 'factory_manager'] or
                has_group(request.user, 'Factory Distributor') or
                has_group(request.user, 'Factory Manager')
            )
        )


class IsSalesperson(BasePermission):
    """Allow access to checkout counter Salespersons and Admins (SRS Section 2.3)."""
    message = 'Salesperson access required.'

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (
                request.user.is_superuser or
                getattr(request.user, 'role', None) == 'salesperson' or
                has_group(request.user, 'Salesperson')
            )
        )


class IsSalespersonOrManager(BasePermission):
    """Allow access to front-counter operators, branch supervisors, and admins."""
    message = 'Salesperson or manager access required.'

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (
                request.user.is_superuser or
                getattr(request.user, 'role', None) in ['salesperson', 'manager', 'admin'] or
                has_group(request.user, 'Salesperson') or
                has_group(request.user, 'Manager')
            )
        )


class IsCustomer(BasePermission):
    """Allow access to registered online customers browsing the storefront (SRS Section 2.3)."""
    message = 'Customer access required.'

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (
                getattr(request.user, 'role', None) == 'customer' or
                has_group(request.user, 'Customer')
            )
        )


class IsAdminOrReadOnly(BasePermission):
    """Allow admin full read/write access, while giving others read-only viewing profiles."""

    def has_permission(self, request, view):
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return bool(request.user and request.user.is_authenticated)
        return bool(
            request.user and
            request.user.is_authenticated and
            (
                request.user.is_superuser or
                getattr(request.user, 'role', None) == 'admin' or
                has_group(request.user, 'Admin')
            )
        )