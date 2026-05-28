"""
Utility functions for the application.
"""

from django.db.models import Q, F, Sum, Count, DecimalField, Value
from django.db.models.functions import Coalesce, TruncDate
from django.utils import timezone
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


def get_date_range(start_date=None, end_date=None):
    """
    Get date range with defaults.
    
    Args:
        start_date: Start date string (YYYY-MM-DD) or None for today
        end_date: End date string (YYYY-MM-DD) or None for today
    
    Returns:
        Tuple of (start_date, end_date) as date objects
    """
    if end_date:
        end = datetime.strptime(end_date, '%Y-%m-%d').date()
    else:
        end = timezone.now().date()
    
    if start_date:
        start = datetime.strptime(start_date, '%Y-%m-%d').date()
    else:
        start = end
    
    return start, end


def get_today():
    """Get today's date in local timezone."""
    return timezone.now().date()


def get_yesterday():
    """Get yesterday's date."""
    return get_today() - timedelta(days=1)


def get_date_comparison_period(days=1):
    """
    Get comparison period for period-over-period analysis.
    
    Args:
        days: Number of days to go back
    
    Returns:
        Tuple of (current_period_start, current_period_end, previous_period_start, previous_period_end)
    """
    today = get_today()
    period_start = today - timedelta(days=days - 1)
    period_end = today
    
    prev_period_start = period_start - timedelta(days=days)
    prev_period_end = period_start - timedelta(days=1)
    
    return (period_start, period_end, prev_period_start, prev_period_end)


def calculate_percentage_change(current, previous):
    """
    Calculate percentage change between two values.
    
    Args:
        current: Current value
        previous: Previous value
    
    Returns:
        Percentage change as float, or 0 if division by zero
    """
    if previous == 0:
        return 0 if current == 0 else 100
    return ((current - previous) / abs(previous)) * 100


class BulkOperationHelper:
    """Helper class for bulk operations."""
    
    @staticmethod
    def bulk_create_with_defaults(model, objects, batch_size=1000):
        """
        Bulk create objects with sensible defaults.
        
        Args:
            model: Django model class
            objects: List of model instances
            batch_size: Batch size for bulk_create
        
        Returns:
            List of created objects
        """
        return model.objects.bulk_create(objects, batch_size=batch_size, ignore_conflicts=False)
    
    @staticmethod
    def bulk_update(model, objects, fields, batch_size=1000):
        """
        Bulk update objects.
        
        Args:
            model: Django model class
            objects: List of model instances with pk set
            fields: List of fields to update
            batch_size: Batch size for bulk_update
        
        Returns:
            Number of updated objects
        """
        return model.objects.bulk_update(objects, fields=fields, batch_size=batch_size)
