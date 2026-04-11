import sys
import os

# Ensure project root is on the Python path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from src.api.server import app
