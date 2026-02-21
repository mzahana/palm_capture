import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import './AdminUserManagement.css';

export default function AdminUserManagement() {
    const { t } = useTranslation();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form state for creating a new user
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newUser, setNewUser] = useState({
        username: '', password: '', first_name: '', last_name: '', email: '', role: 'client'
    });

    // Form state for editing a user
    const [editUserId, setEditUserId] = useState(null);
    const [editUser, setEditUser] = useState(null);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await api.get('/users');
            setUsers(res.data);
        } catch (err) {
            console.error("Failed to fetch users", err);
            alert("Could not load users.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            await api.post('/users', newUser);
            setIsAddOpen(false);
            setNewUser({ username: '', password: '', first_name: '', last_name: '', email: '', role: 'client' });
            fetchUsers();
            alert("User created successfully!");
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.detail || "Failed to create user");
        }
    };

    const handleSaveEdit = async () => {
        try {
            const payload = {
                first_name: editUser.first_name,
                last_name: editUser.last_name,
                email: editUser.email,
                role: editUser.role,
                is_active: editUser.is_active
            };
            if (editUser.new_password) {
                payload.password = editUser.new_password;
            }
            await api.put(`/users/${editUserId}`, payload);
            setEditUserId(null);
            setEditUser(null);
            fetchUsers();
            alert("User updated successfully!");
        } catch (err) {
            console.error(err);
            alert("Failed to update user.");
        }
    };

    const handleDeleteUser = async (id, username) => {
        if (!window.confirm(`Are you absolutely sure you want to delete user ${username}? This action is permanent.`)) {
            return;
        }
        try {
            await api.delete(`/users/${id}`);
            fetchUsers();
        } catch (err) {
            console.error("Delete failed", err);
            alert("Failed to delete user.");
        }
    };

    const toggleActive = async (user) => {
        try {
            await api.put(`/users/${user.id}`, { is_active: !user.is_active });
            fetchUsers();
        } catch (err) {
            console.error("Toggle active failed", err);
        }
    };

    return (
        <div className="user-management">
            <div className="um-header">
                <h2>{t('header.manage_users')}</h2>
                <button className="btn-primary" onClick={() => setIsAddOpen(!isAddOpen)}>
                    {isAddOpen ? t('common.cancel') : t('admin.add_user')}
                </button>
            </div>

            {isAddOpen && (
                <div className="add-user-card">
                    <h3>{t('admin.add_user')}</h3>
                    <form onSubmit={handleCreateUser} className="add-user-form">
                        <div className="form-group row">
                            <div className="half">
                                <label>{t('login.first_name')}</label>
                                <input type="text" required value={newUser.first_name} onChange={e => setNewUser({ ...newUser, first_name: e.target.value })} />
                            </div>
                            <div className="half">
                                <label>{t('login.last_name')}</label>
                                <input type="text" required value={newUser.last_name} onChange={e => setNewUser({ ...newUser, last_name: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-group row">
                            <div className="half">
                                <label>{t('login.username')}</label>
                                <input type="text" required value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} />
                            </div>
                            <div className="half">
                                <label>{t('login.email')}</label>
                                <input type="email" required value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-group row">
                            <div className="half">
                                <label>{t('login.password')}</label>
                                <input type="password" required value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
                            </div>
                            <div className="half">
                                <label>Role</label>
                                <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                                    <option value="client">Client</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </div>
                        <button type="submit" className="btn-primary mt-2">{t('login.register_btn')}</button>
                    </form>
                </div>
            )}

            {loading ? (
                <p>Loading users...</p>
            ) : (
                <div className="users-table-container">
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Username</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id} className={user.is_active ? '' : 'inactive-row'}>
                                    <td>{user.id}</td>

                                    {editUserId === user.id ? (
                                        <>
                                            <td>{user.username}</td>
                                            <td>
                                                <input type="text" className="edit-xs" placeholder="First" value={editUser.first_name} onChange={e => setEditUser({ ...editUser, first_name: e.target.value })} />
                                                <input type="text" className="edit-xs" placeholder="Last" value={editUser.last_name} onChange={e => setEditUser({ ...editUser, last_name: e.target.value })} />
                                            </td>
                                            <td><input type="email" className="edit-sm" value={editUser.email} onChange={e => setEditUser({ ...editUser, email: e.target.value })} /></td>
                                            <td>
                                                <select value={editUser.role} onChange={e => setEditUser({ ...editUser, role: e.target.value })}>
                                                    <option value="client">Client</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                            </td>
                                            <td>
                                                <label className="status-toggle">
                                                    <input type="checkbox" checked={editUser.is_active} onChange={e => setEditUser({ ...editUser, is_active: e.target.checked })} />
                                                    Active
                                                </label>
                                            </td>
                                            <td className="actions-cell">
                                                <input type="text" className="edit-sm" placeholder="New Password (optional)" value={editUser.new_password || ''} onChange={e => setEditUser({ ...editUser, new_password: e.target.value })} />
                                                <div className="action-btns mt-1">
                                                    <button className="btn-success btn-sm" onClick={handleSaveEdit}>Save</button>
                                                    <button className="btn-secondary btn-sm" onClick={() => setEditUserId(null)}>Cancel</button>
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td><strong>{user.username}</strong></td>
                                            <td>{user.first_name} {user.last_name}</td>
                                            <td>{user.email}</td>
                                            <td><span className={`role-badge ${user.role}`}>{user.role}</span></td>
                                            <td>
                                                <span className={`status-badge ${user.is_active ? 'active' : 'disabled'}`}>
                                                    {user.is_active ? t('common.active') : t('common.disabled')}
                                                </span>
                                            </td>
                                            <td className="actions-cell">
                                                <button className="btn-secondary btn-sm" onClick={() => { setEditUserId(user.id); setEditUser(user); }}>{t('common.edit')}</button>
                                                <button className={`btn-sm ${user.is_active ? 'btn-warning' : 'btn-success'}`} onClick={() => toggleActive(user)}>
                                                    {user.is_active ? t('common.disable') : t('common.enable')}
                                                </button>
                                                <button className="btn-danger btn-sm" onClick={() => handleDeleteUser(user.id, user.username)}>{t('common.delete')}</button>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
