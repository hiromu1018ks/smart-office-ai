"""Shared pytest configuration and fixtures."""

import os
import sys

# Add backend directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
