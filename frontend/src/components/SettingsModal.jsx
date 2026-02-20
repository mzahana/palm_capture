import React, { useState } from 'react';
import api from '../utils/api';
import './SettingsModal.css';

export default function SettingsModal({ isOpen, onClose }) {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    if (!isOpen) return null;

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            await api.put('/users/me/password', {
                old_password: oldPassword,
                new_password: newPassword
            });
            setMessage('Password updated successfully!');
            setIsError(false);
            setOldPassword('');
            setNewPassword('');
            setTimeout(onClose, 2000);
        } catch (err) {
            setMessage(err.response?.data?.detail || 'Failed to update password.');
            setIsError(true);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content settings-modal" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>&times;</button>
                <h3>Settings</h3>

                <form onSubmit={handleChangePassword}>
                    <div className="form-group">
                        <label>Old Password</label>
                        <input
                            type="password"
                            value={oldPassword}
                            onChange={e => setOldPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>New Password</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            required
                        />
                    </div>
                    {message && (
                        <div className={`status-banner ${isError ? 'error' : 'success'}`}>
                            {message}
                        </div>
                    )}
                    <button type="submit" className="btn-primary">Update Password</button>
                </form>
            </div>
        </div>
    );
}
