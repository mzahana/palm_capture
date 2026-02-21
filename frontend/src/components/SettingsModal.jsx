import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import './SettingsModal.css';

export default function SettingsModal({ isOpen, onClose }) {
    const { t, i18n } = useTranslation();
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
                <h3>{t('settings.title')}</h3>

                <form onSubmit={handleChangePassword}>
                    <div className="form-group">
                        <label>{t('settings.old_password')}</label>
                        <input
                            type="password"
                            value={oldPassword}
                            onChange={e => setOldPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>{t('settings.new_password')}</label>
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
                    <button type="submit" className="btn-primary">{t('settings.update_password')}</button>
                </form>
            </div>
        </div>
    );
}
