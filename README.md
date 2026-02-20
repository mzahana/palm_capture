# Palm Capture Data Collection App

Palm Capture is a modern, mobile-responsive web application designed to collect tree-related datasets efficiently. It empowers field workers and researchers to capture images, voice notes, location coordinates, and environmental temperature, all synchronized with a central database.

## Features

- **Multi-Role Authentication**: Secure JWT-based login with distinct "Client" (data collector) and "Admin" roles.
- **Rich User Profiles**: First Name, Last Name, and Email properties tracked per account.
- **Comprehensive Data Collection**:
  - Image capturing (uses device camera on mobile).
  - Voice Note recording (HTML5 microphone API).
  - Background GPS Coordinate fetching.
  - Automatic Temperature fetching (via Open-Meteo based on GPS).
- **Client History & Editing**: Workers can view their past data submissions. They can also seamlessly edit their past inputs, including recording replacement voice notes or fixing temperature readings.
- **Admin Dashboard**: A global view for administrators. Features a data grid mapping out all entries, detailed overlay cards with embedded maps, and a built-in Data Collection mode identical to the client form.
- **User Management**: Admins can provision, modify, disable, and delete user accounts directly from the Web UI.

---

## 🛠 Prerequisites

Ensure you have the following installed on your machine / server:
- **Python 3.8+**
- **Node.js** (v16+) & **npm**

*(**Note**: It is recommended to use a virtual environment for the backend. Please activate your preferred environment before running the installation or the app).*

---

## 🚀 Installation & Setup

We have provided a streamlined, one-click installation script that installs Python packages, sets up the SQLite database, and downloads Node modules.

1. Clone or navigate to this repository.
2. Activate your Python virtual environment.
3. Make the scripts executable (if they are not already):
   ```bash
   chmod +x install.sh run.sh
   ```
4. Run the installation script:
   ```bash
   ./install.sh
   ```

*The default initialization creates two user accounts for testing: `admin` / `admin123` and `client` / `client123`.*

---

## 💻 Running the Application

To run both the FastAPI backend and the React frontend concurrently, use the `run.sh` script.

### Default Local Run
```bash
./run.sh
```
This binds the servers to `127.0.0.1`. The web interface will be accessible at: **http://127.0.0.1:5173**

### Deploying / Exposing Externally
If you are running this on a remote server (e.g., an AWS EC2 instance or a Raspberry Pi) and want to access it from other devices on the network, bind the host to `0.0.0.0`:
```bash
./run.sh --host 0.0.0.0
```

### Custom Ports
You can explicitly define which ports the Backend (FastAPI) and Frontend (Vite) use:
```bash
./run.sh --host 0.0.0.0 --backend-port 8080 --frontend-port 3000
```

*Press `Ctrl+C` in the terminal at any time to gracefully shut down both servers.*

---

## 📂 Project Structure

```text
palm_capture/
├── backend/                  # FastAPI Application
│   ├── main.py               # API Endpoints
│   ├── models.py             # SQLAlchemy Database Models
│   ├── schemas.py            # Pydantic Validation Schemas
│   ├── database.py           # SQLite connection logic
│   ├── auth.py               # JWT Authentication & Password Hashing
│   └── init_db.py            # Script to wipe/seed database tables
├── frontend/                 # Vite + React Application
│   ├── src/
│   │   ├── components/       # Login, Dashboard, Modals, Forms
│   │   ├── utils/api.js      # Axios instance with Auto-JWT header
│   │   └── App.jsx           # React Router
├── install.sh                # Automated dependency & DB installation
├── run.sh                    # Automated dual-server boot script
└── README.md                 # Project Documentation
```
