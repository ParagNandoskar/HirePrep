#!/usr/bin/env python3
"""
Simple script to start the NLP service on port 5001
"""
import os
os.environ['PORT'] = '5001'

# Import and run the app
from app import app

if __name__ == '__main__':
    print("🚀 Starting HirePrep NLP Service on port 5001...")
    app.run(host='0.0.0.0', port=5001, debug=False)
