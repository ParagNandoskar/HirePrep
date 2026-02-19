#!/bin/bash

# HirePrep Setup and Run Script
# Usage: ./setup_and_run.sh

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting HirePrep Setup...${NC}"

# Check for required tools
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed.${NC}"
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 is not installed.${NC}"
    exit 1
fi

# 1. Setup Backend (Node.js)
echo -e "${BLUE}Setting up Backend (Node.js)...${NC}"
cd backend || exit

# Create .env from example if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating backend/.env from .env.example...${NC}"
    cp .env.example .env
fi

# Install Node dependencies if node_modules doesn't exist
if [ ! -d node_modules ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    npm install
else
    echo -e "${GREEN}Backend dependencies already installed.${NC}"
fi

# Return to root
cd ..

# 2. Setup NLP Service
echo -e "${BLUE}Setting up NLP Service...${NC}"
if [ -d "backend/nlp-service" ]; then
    cd backend/nlp-service
    
    # Create venv if not exists
    if [ ! -d "venv" ]; then
        echo -e "${YELLOW}Creating venv for NLP Service...${NC}"
        python3 -m venv venv
    fi
    
    # Activate and install
    source venv/bin/activate
    
    # Check if dependencies are already installed
    if ! python -c "import spacy" 2>/dev/null; then
        echo -e "${YELLOW}Installing NLP dependencies...${NC}"
        pip install --upgrade pip > /dev/null 2>&1
        pip install -r requirements.txt
    else
        echo -e "${GREEN}NLP dependencies already installed.${NC}"
    fi
    
    # Check if spaCy model is downloaded
    if ! python -c "import spacy; spacy.load('en_core_web_sm')" 2>/dev/null; then
        echo -e "${YELLOW}Downloading spaCy model...${NC}"
        python -m spacy download en_core_web_sm
    else
        echo -e "${GREEN}spaCy model already downloaded.${NC}"
    fi
    
    # Setup .env
    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}Creating .env...${NC}"
        # Try to find example in root or parent
        if [ -f "../../nlp.env.example" ]; then
            cp "../../nlp.env.example" .env
        fi
    fi
    
    deactivate
    cd ../..
fi

# 3. Setup Video/Audio Services
echo -e "${BLUE}Setting up Video/Audio Services...${NC}"
if [ -d "backend/python-services" ]; then
    cd backend/python-services
    
    # Create venv if not exists
    if [ ! -d "venv" ]; then
        echo -e "${YELLOW}Creating venv for Python Services...${NC}"
        python3 -m venv venv
    fi
    
    # Activate and install
    source venv/bin/activate
    
    # Check if dependencies are already installed
    if ! python -c "import transformers, mediapipe" 2>/dev/null; then
        echo -e "${YELLOW}Installing Video/Audio dependencies...${NC}"
        pip install --upgrade pip > /dev/null 2>&1
        pip install -r requirements.txt
    else
        echo -e "${GREEN}Video/Audio dependencies already installed.${NC}"
    fi
    
    deactivate
    cd ../..
fi

# 4. Start Services
echo -e "${BLUE}Starting all services...${NC}"

# Function to kill all background processes on exit
cleanup() {
    echo -e "${RED}Stopping all services...${NC}"
    kill $(jobs -p) 2>/dev/null
}
trap cleanup EXIT

# # Start Node Backend
# echo -e "${GREEN}Starting Node.js Backend on port 5000...${NC}"
# cd backend
# npm run dev &
# BACKEND_PID=$!
# cd ..

# Start NLP Service
echo -e "${GREEN}Starting NLP Service on port 5001...${NC}"
cd backend/nlp-service
export PORT=5001
# Use direct path to venv python
venv/bin/python app.py &
NLP_PID=$!
cd ../..

# Start Video Service
echo -e "${GREEN}Starting Video Analysis Service on port 8001...${NC}"
cd backend/python-services
export PORT=8001
venv/bin/python video_analysis.py &
VIDEO_PID=$!
cd ../..

# Start Audio Service
echo -e "${GREEN}Starting Audio Analysis Service on port 8002...${NC}"
cd backend/python-services
export PORT=8002
venv/bin/python audio_analysis.py &
AUDIO_PID=$!
cd ../..

echo -e "${BLUE}All services started! Press Ctrl+C to stop.${NC}"

# Wait for all processes
wait
