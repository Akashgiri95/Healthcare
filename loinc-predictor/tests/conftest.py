"""
tests/conftest.py — Pytest configuration and shared fixtures.
"""

import sys
import os

# Add backend to path so all test files can import backend modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

def pytest_configure(config):
    config.addinivalue_line("markers", "slow: marks tests as slow (require model + CSV)")
