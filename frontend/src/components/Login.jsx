import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import LanguageSwitcher from './LanguageSwitcher';
import './Login.css';

export default function Login() {
    const { t } = useTranslation();
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
            <div style={{ position: 'absolute', top: '1rem', right: '1rem', left: 'auto' }}>
                <LanguageSwitcher />
            </div>
            <div className="login-card">
                <h2>{t('login.title')}</h2>
                <p>{isRegistering ? t('login.register_btn') : t('login.login_btn')}</p>

                {error && <div className="error-message">{error}</div>}
                {success && <div className="status-banner success">{success}</div>}

                <form onSubmit={handleSubmit}>
                    {isRegistering && (
                        <>
                            <div className="form-group row">
                                <div className="half">
                                    <label>{t('login.first_name')}</label>
                                    <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                                </div>
                                <div className="half">
                                    <label>{t('login.last_name')}</label>
                                    <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>{t('login.email')}</label>
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                            </div>
                        </>
                    )}
                    <div className="form-group">
                        <label>{t('login.username')}</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>{t('login.password')}</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" disabled={loading} className="btn-primary">
                        {loading ? 'Processing...' : (isRegistering ? t('login.register_btn') : t('login.login_btn'))}
                    </button>
                </form>

                <div className="toggle-auth" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <p style={{ color: '#718096', fontSize: '0.9rem' }}>
                        <button
                            type="button"
                            style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 'bold' }}
                            onClick={() => {
                                setIsRegistering(!isRegistering);
                                setError('');
                                setSuccess('');
                            }}
                        >
                            {isRegistering ? t('login.have_account') : t('login.no_account')}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
