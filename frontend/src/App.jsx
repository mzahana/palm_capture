import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './i18n';
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
    const { i18n } = useTranslation();

    useEffect(() => {
        // Enforce RTL layout for Arabic
        const isArabic = i18n.language && i18n.language.startsWith('ar');
        document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
        document.documentElement.lang = isArabic ? 'ar' : 'en';
    }, [i18n.language]);

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
