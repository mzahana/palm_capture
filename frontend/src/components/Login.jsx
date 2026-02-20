import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './Login.css';

export default function Login() {
    const [isRegistering, setIsRegistering] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        if (isRegistering) {
            try {
                await api.post('/register', {
                    username,
                    password,
                    first_name: firstName,
                    last_name: lastName,
                    email
                });
                setSuccess('Registration successful. You can now log in.');
                setIsRegistering(false);
                setPassword('');
                setFirstName('');
                setLastName('');
                setEmail('');
            } catch (err) {
                setError(err.response?.data?.detail || 'Registration failed');
            } finally {
                setLoading(false);
            }
        } else {
            try {
                const formData = new URLSearchParams();
                formData.append('username', username);
                formData.append('password', password);

                const response = await api.post('/auth/token', formData, {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                });

                localStorage.setItem('token', response.data.access_token);
                localStorage.setItem('role', response.data.role);
                localStorage.setItem('username', username); // Save username for display

                if (response.data.role === 'admin') {
                    navigate('/admin');
                } else {
                    navigate('/client');
                }
            } catch (err) {
                setError('Invalid username or password');
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2>Tree Dataset Collection</h2>
                <p>{isRegistering ? 'Create a new account' : 'Login to your account'}</p>

                {error && <div className="error-message">{error}</div>}
                {success && <div className="status-banner success">{success}</div>}

                <form onSubmit={handleSubmit}>
                    {isRegistering && (
                        <>
                            <div className="form-group row">
                                <div className="half">
                                    <label>First Name</label>
                                    <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                                </div>
                                <div className="half">
                                    <label>Last Name</label>
                                    <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                            </div>
                        </>
                    )}
                    <div className="form-group">
                        <label>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" disabled={loading} className="btn-primary">
                        {loading ? 'Processing...' : (isRegistering ? 'Register' : 'Login')}
                    </button>
                </form>

                <div className="toggle-auth" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <p style={{ color: '#718096', fontSize: '0.9rem' }}>
                        {isRegistering ? 'Already have an account? ' : "Don't have an account? "}
                        <button
                            type="button"
                            style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 'bold' }}
                            onClick={() => {
                                setIsRegistering(!isRegistering);
                                setError('');
                                setSuccess('');
                            }}
                        >
                            {isRegistering ? 'Log in' : 'Register'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
