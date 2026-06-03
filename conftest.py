import os
import sys

# Ensure backend/ is on sys.path so tests can import the Django project package `bakery_hq`.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

pytest_plugins = ["backend.conftest", "pytest_django"]
