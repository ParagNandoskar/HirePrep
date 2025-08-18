#!/bin/bash

# HirePrep Backend Setup Script
# This script helps set up the development environment

echo "🚀 Setting up HirePrep Backend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.9+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ Python version: $(python3 --version)"

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Set up Python virtual environment
echo "🐍 Setting up Python environment..."
cd python-services
python3 -m venv venv
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null
pip install -r requirements.txt
cd ..

# Copy environment template
if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your actual configuration values"
else
    echo "✅ Environment file already exists"
fi

# Create logs directory
mkdir -p logs

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Set up MongoDB Atlas database"
echo "3. Get Google Gemini API key"
echo "4. Configure Cloudinary account"
echo "5. Run 'npm run dev' to start development server"
echo ""
echo "For Docker deployment:"
echo "- Run 'docker-compose up --build'"
echo ""
echo "📚 Check README.md for detailed documentation"
