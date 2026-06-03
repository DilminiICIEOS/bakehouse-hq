"""
Custom permissions for role-based access control.
"""

from django.contrib.auth.models import Group
from rest_framework.permissions import BasePermission


def has_group(user, group_name):
    return bool(
        user and
        user.is_authenticated and
        (user.is_superuser or user.groups.filter(name=group_name).exists())
    )


class IsAdmin(BasePermission):
    """Allow access only to admin users."""
    message = 'Admin access required.'

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_superuser or request.user.role == 'admin' or has_group(request.user, 'Admin'))
        )


class IsManager(BasePermission):
    """Allow access to admin and manager users."""
    message = 'Manager or admin access required.'

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (
                request.user.is_superuser or
                request.user.role in ['admin', 'manager'] or
                has_group(request.user, 'Manager')
            )
        )


class IsFactoryDistributor(BasePermission):
    """Allow access to factory distributors and admins."""
    message = 'Factory Distributor access required.'

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (
                request.user.is_superuser or
                request.user.role in ['admin', 'factory_distributor'] or
                has_group(request.user, 'Factory Distributor')
            )
        )


class IsSalesperson(BasePermission):
    """Allow access to salespeople and admins."""
    message = 'Salesperson access required.'

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (
                request.user.is_superuser or
                request.user.role == 'salesperson' or
                has_group(request.user, 'Salesperson')
            )
        )


class IsSalespersonOrManager(BasePermission):
    """Allow access to salespeople, managers, and admins."""
    message = 'Salesperson or manager access required.'

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (
                request.user.is_superuser or
                request.user.role in ['salesperson', 'manager'] or
                has_group(request.user, 'Salesperson') or
                has_group(request.user, 'Manager')
            )
        )


class IsCustomer(BasePermission):
    """Allow access to customers."""
    message = 'Customer access required.'

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (
                request.user.role == 'customer' or
                has_group(request.user, 'Customer')
            )
        )


class IsAdminOrReadOnly(BasePermission):
    """Allow admin full access, others read-only."""

    def has_permission(self, request, view):
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return request.user and request.user.is_authenticated
        return bool(
            request.user and
            request.user.is_authenticated and
            (
                request.user.is_superuser or
                request.user.role == 'admin' or
                has_group(request.user, 'Admin')
            )
        )
