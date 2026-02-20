import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import ClientView from './components/ClientView';
import AdminDashboard from './components/AdminDashboard';
import './index.css';

// Simple protective route wrapper
const ProtectedRoute = ({ children, allowedRole }) => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (!token) return <Navigate to="/" />;

    // Admin can access everything. Otherwise, exact role match is needed.
    if (allowedRole && role !== 'admin' && role !== allowedRole) return <Navigate to="/" />;

    return children;
};

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/client" element={
                    <ProtectedRoute allowedRole="client">
                        <ClientView />
                    </ProtectedRoute>
                } />
                <Route path="/admin" element={
                    <ProtectedRoute allowedRole="admin">
                        <AdminDashboard />
                    </ProtectedRoute>
                } />
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
