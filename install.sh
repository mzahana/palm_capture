#!/bin/bash

# Exit on any error
set -e

# Define color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}  Palm Capture - Setup Script        ${NC}"
echo -e "${BLUE}=======================================${NC}\n"

# Verify Node.js is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Verify Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: python3 is not installed.${NC}"
    exit 1
fi

echo -e "${GREEN}[1/3] Setting up Backend Python dependencies...${NC}"
# Install backend dependencies
cd backend
echo -e "Installing Python dependencies (assumes environment is activated)..."
pip install -r requirements.txt

# Initialize database
echo -e "Initializing SQLite database..."
python3 init_db.py
cd ..


echo -e "\n${GREEN}[2/3] Setting up Frontend Node Environment...${NC}"
cd frontend
echo -e "Installing NPM packages..."
npm install
cd ..


echo -e "\n${GREEN}[3/3] Installation Complete!${NC}"
echo -e "You can now run the application using the ${BLUE}./run.sh${NC} script."
echo -e "Run ${BLUE}./run.sh --help${NC} for usage information.\n"
