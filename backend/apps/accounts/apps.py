"""
Accounts app configuration.
"""

from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.accounts'
    verbose_name = 'Accounts & Authentication'

    def ready(self):
        """Initialize role groups and permissions when the app is ready."""
        try:
            from django.contrib.auth.models import Group, Permission
            from django.contrib.contenttypes.models import ContentType
            from django.db.utils import OperationalError, ProgrammingError
            from apps.accounts.models import User
            from apps.products.models import Product, ProductBatch
            from apps.sales.models import Sale
            from apps.wastage.models import Wastage
        except Exception:
            return

        try:
            # Ensure all role groups exist
            role_groups = {
                'Admin': None,
                'Manager': [
                    'view_sale', 'view_wastage', 'view_product', 'view_productbatch',
                    'view_user',
                ],
                'Salesperson': [
                    'add_sale', 'view_sale', 'add_wastage', 'view_wastage',
                    'view_product', 'view_productbatch',
                ],
                'Factory Distributor': [
                    'add_product', 'change_product', 'view_product',
                    'add_productbatch', 'change_productbatch', 'view_productbatch',
                ],
                'Customer': [
                    'view_product',
                ],
            }

            content_models = [Product, ProductBatch, Sale, Wastage, User]
            content_types = {
                model.__name__.lower(): ContentType.objects.get_for_model(model)
                for model in content_models
            }

            for group_name, perm_codenames in role_groups.items():
                group, _ = Group.objects.get_or_create(name=group_name)
                if perm_codenames is None:
                    # Admin group gets all perms for these app models
                    perms = Permission.objects.filter(content_type__in=list(content_types.values()))
                else:
                    perms = Permission.objects.filter(
                        content_type__in=list(content_types.values()),
                        codename__in=perm_codenames,
                    )
                group.permissions.set(perms)
        except (OperationalError, ProgrammingError):
            # Database not ready yet (migrations in progress)
            return
        except Exception:
            return
