"""
Custom exception handler and API exceptions.
"""

from rest_framework.views import exception_handler
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)


class APIErrorResponse(APIException):
    """Base class for custom API errors."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'An error occurred.'

    def __init__(self, detail=None, status_code=None):
        if detail is not None:
            self.detail = detail
        if status_code is not None:
            self.status_code = status_code


class ValidationError(APIErrorResponse):
    """Validation error response."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Validation failed.'


class InsufficientPermissions(APIErrorResponse):
    """Insufficient permissions error."""
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = 'You do not have permission to perform this action.'


class ResourceNotFound(APIErrorResponse):
    """Resource not found error."""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Resource not found.'


class StockError(APIErrorResponse):
    """Stock-related error."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Stock operation failed.'


class BusinessLogicError(APIErrorResponse):
    """Business logic error."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Business logic validation failed.'


def custom_exception_handler(exc, context):
    """
    Custom exception handler that logs errors and returns formatted responses.
    """
    # Log the exception
    logger.exception(f"Exception occurred: {str(exc)}")

    # Call the default handler to get the standard exception response
    response = exception_handler(exc, context)

    if response is not None:
        # Add consistent error format
        response.data = {
            'success': False,
            'error': {
                'message': response.data.get('detail', 'An error occurred.'),
                'code': exc.__class__.__name__,
            },
            'data': None,
        }
    else:
        # Handle unexpected errors
        logger.exception("Unhandled exception")
        response = Response(
            {
                'success': False,
                'error': {
                    'message': 'Internal server error',
                    'code': 'InternalServerError',
                },
                'data': None,
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return response
