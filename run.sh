#!/bin/bash

# Default values
HOST="127.0.0.1"
BACKEND_PORT="8000"
FRONTEND_PORT="5173"

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --host) HOST="$2"; shift ;;
        --backend-port) BACKEND_PORT="$2"; shift ;;
        --frontend-port) FRONTEND_PORT="$2"; shift ;;
        -h|--help)
            echo "Usage: ./run.sh [options]"
            echo "Options:"
            echo "  --host <ip>            Host IP to bind to (default: 127.0.0.1. Use 0.0.0.0 to expose externally)"
            echo "  --backend-port <port>  Port for the FastAPI backend (default: 8000)"
            echo "  --frontend-port <port> Port for the Vite/React frontend (default: 5173)"
            exit 0
            ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

echo -e "\033[0;32mStarting Palm Capture Web App...\033[0m"

# Handle graceful shutdown
cleanup() {
    echo -e "\n\033[0;31mShutting down servers...\033[0m"
    if [ ! -z "$BACKEND_PID" ]; then kill $BACKEND_PID 2>/dev/null; fi
    if [ ! -z "$FRONTEND_PID" ]; then kill $FRONTEND_PID 2>/dev/null; fi
    exit 0
}
trap cleanup SIGINT SIGTERM

# Start Backend
echo "Starting Backend on $HOST:$BACKEND_PORT... (Logs: backend/backend.log)"
cd backend
uvicorn main:app --host $HOST --port $BACKEND_PORT > backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Start Frontend
echo "Starting Frontend on $HOST:$FRONTEND_PORT... (Logs: frontend/frontend.log)"
cd frontend
export VITE_BACKEND_URL="http://$HOST:$BACKEND_PORT"
npm run dev -- --host $HOST --port $FRONTEND_PORT > frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo -e "\n\033[1;32mEverything is running!\033[0m"
if [ "$HOST" = "0.0.0.0" ]; then
    echo -e "Access the web app pointing your browser to your server's IP at port \033[1;36m$FRONTEND_PORT\033[0m"
else
    echo -e "Access the web app locally at: \033[1;36mhttp://$HOST:$FRONTEND_PORT\033[0m"
fi
echo -e "Press Ctrl+C to stop both servers.\n"

# Wait for background processes
wait $BACKEND_PID $FRONTEND_PID
