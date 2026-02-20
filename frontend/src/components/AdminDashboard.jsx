import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import SettingsModal from './SettingsModal';
import AdminUserManagement from './AdminUserManagement';
import './AdminDashboard.css';

const formatBytes = (bytes, decimals = 2) => {
    if (bytes === null || bytes === undefined || !+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export default function AdminDashboard() {
    const navigate = useNavigate();
    const username = localStorage.getItem('username') || 'Admin';
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Tab State: 'data' or 'users'
    const [activeTab, setActiveTab] = useState('data');

    // Filter State
    const [filterUser, setFilterUser] = useState('');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [filterAudio, setFilterAudio] = useState(false);
    const [filterLocation, setFilterLocation] = useState(false);
    const [filterNotes, setFilterNotes] = useState(false);
    const [filterTemp, setFilterTemp] = useState(false);

    // Edit state
    const [editNotes, setEditNotes] = useState('');
    const [editTemp, setEditTemp] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchEntries = async () => {
        try {
            setLoading(true);
            const res = await api.get('/entries');
            setEntries(res.data);
        } catch (err) {
            console.error(err);
            if (err.response?.status === 401 || err.response?.status === 403) {
                handleLogout();
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEntries();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        navigate('/');
    };

    const openModal = (entry) => {
        setSelectedEntry(entry);
        setEditNotes(entry.notes || '');
        setEditTemp(entry.temperature || '');
    };

    const closeModal = () => {
        setSelectedEntry(null);
    };

    const saveUpdates = async () => {
        try {
            await api.put(`/entries/${selectedEntry.id}`, {
                notes: editNotes,
                temperature: editTemp ? parseFloat(editTemp) : null
            });
            // Update local state
            setEntries(entries.map(e => e.id === selectedEntry.id ? {
                ...e,
                notes: editNotes,
                temperature: editTemp ? parseFloat(editTemp) : null
            } : e));
            closeModal();
        } catch (err) {
            console.error("Update failed", err);
            alert("Failed to update entry.");
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to permanently delete this data record and any associated files? This cannot be undone.")) return;

        try {
            setIsDeleting(true);
            await api.delete(`/entries/${selectedEntry.id}`);

            // Update local state
            setEntries(entries.filter(e => e.id !== selectedEntry.id));
            closeModal();
        } catch (err) {
            console.error("Delete failed", err);
            alert("Failed to delete entry.");
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredEntries = entries.filter(entry => {
        let match = true;
        if (filterUser && (!entry.uploader_username || !entry.uploader_username.toLowerCase().includes(filterUser.toLowerCase()))) match = false;
        if (filterStartDate && new Date(entry.timestamp) < new Date(filterStartDate)) match = false;
        if (filterEndDate && new Date(entry.timestamp) > new Date(filterEndDate + 'T23:59:59')) match = false;
        if (filterAudio && !entry.audio_path) match = false;
        if (filterLocation && (entry.latitude === null || entry.longitude === null)) match = false;
        if (filterNotes && !entry.notes) match = false;
        if (filterTemp && entry.temperature === null) match = false;
        return match;
    });

    const uniqueUsersCount = new Set(filteredEntries.map(e => e.uploader_id)).size;
    const withAudioCount = filteredEntries.filter(e => e.audio_path).length;
    const withLocationCount = filteredEntries.filter(e => e.latitude !== null && e.longitude !== null).length;

    return (
        <div className="admin-container">
            <header className="admin-header">
                <h1>Admin Dashboard</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span className="welcome-text">Welcome, <strong>{username}</strong></span>

                    <button className={activeTab === 'data' ? 'btn-primary' : 'btn-secondary'} onClick={() => setActiveTab('data')}>Manage Data</button>
                    <button className={activeTab === 'users' ? 'btn-primary' : 'btn-secondary'} onClick={() => setActiveTab('users')}>Manage Users</button>

                    <button className="btn-secondary" onClick={() => navigate('/client')}>📷 Collect Data</button>
                    <button className="btn-secondary" onClick={() => setIsSettingsOpen(true)}>⚙️ Settings</button>
                    <button className="btn-logout" onClick={handleLogout}>Logout</button>
                </div>
            </header>

            <main className="admin-main">
                {activeTab === 'users' ? (
                    <AdminUserManagement />
                ) : (
                    loading ? (
                        <p>Loading entries...</p>
                    ) : (
                        <div className="data-tab-content">
                            <div className="dashboard-top-panel">
                                <div className="stats-panel">
                                    <h3>📊 Data Statistics</h3>
                                    <div className="stats-grid">
                                        <div className="stat-box"><strong>{filteredEntries.length}</strong> Total Entries</div>
                                        <div className="stat-box"><strong>{uniqueUsersCount}</strong> Users</div>
                                        <div className="stat-box"><strong>{withAudioCount}</strong> w/ Audio</div>
                                        <div className="stat-box"><strong>{withLocationCount}</strong> w/ GPS</div>
                                        <div className="stat-box"><strong>{formatBytes(filteredEntries.reduce((acc, curr) => acc + (curr.image_size_bytes || 0), 0))}</strong> Image Storage</div>
                                        <div className="stat-box"><strong>{formatBytes(filteredEntries.reduce((acc, curr) => acc + (curr.audio_size_bytes || 0), 0))}</strong> Audio Storage</div>
                                    </div>
                                </div>

                                <div className="filters-panel">
                                    <h3>🔍 Filter Data</h3>
                                    <div className="filter-controls">
                                        <input type="text" placeholder="Filter by User Name..." value={filterUser} onChange={e => setFilterUser(e.target.value)} />
                                        <input type="date" title="Start Date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
                                        <input type="date" title="End Date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
                                        <div className="checkboxes">
                                            <label><input type="checkbox" checked={filterAudio} onChange={e => setFilterAudio(e.target.checked)} /> Has Audio</label>
                                            <label><input type="checkbox" checked={filterLocation} onChange={e => setFilterLocation(e.target.checked)} /> Has GPS</label>
                                            <label><input type="checkbox" checked={filterNotes} onChange={e => setFilterNotes(e.target.checked)} /> Has Notes</label>
                                            <label><input type="checkbox" checked={filterTemp} onChange={e => setFilterTemp(e.target.checked)} /> Has Temp</label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid">
                                {filteredEntries.length === 0 && <p>No entries match the filters.</p>}
                                {filteredEntries.map(entry => (
                                    <div key={entry.id} className="grid-card" onClick={() => openModal(entry)}>
                                        <div className="card-image-wrapper">
                                            <img src={`http://localhost:8000/static/${entry.image_path}`} alt="Tree" loading="lazy" />
                                            <div className="card-badges">
                                                {entry.audio_path && <span className="badge" title="Has Voice Note">🎙️</span>}
                                                {entry.latitude && entry.longitude && <span className="badge" title="Has GPS">📍</span>}
                                                {entry.temperature !== null && <span className="badge" title="Has Temp">🌡️</span>}
                                                {entry.notes && <span className="badge" title="Has Notes">📝</span>}
                                            </div>
                                        </div>
                                        <div className="card-footer">
                                            <span className="timestamp">{new Date(entry.timestamp).toLocaleDateString()}</span>
                                            <span className="entry-id">ID: {entry.id} by User: {entry.uploader_username}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                )}
            </main>

            {/* Detail Modal */}
            {selectedEntry && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <button className="modal-close" onClick={closeModal}>&times;</button>
                        <div className="modal-body">

                            <div className="modal-left">
                                <img src={`http://localhost:8000/static/${selectedEntry.image_path}`} alt="Tree Enlarge" className="modal-image" />
                                <div className="media-stats">
                                    {selectedEntry.image_width && selectedEntry.image_height && <p>Dimensions: {selectedEntry.image_width} x {selectedEntry.image_height} px</p>}
                                    {selectedEntry.image_size_bytes && <p>Image Size: {formatBytes(selectedEntry.image_size_bytes)}</p>}
                                </div>
                                {selectedEntry.audio_path && (
                                    <div className="modal-audio">
                                        <h4>Voice Recording {selectedEntry.audio_size_bytes ? `(${formatBytes(selectedEntry.audio_size_bytes)})` : ''}</h4>
                                        <audio controls src={`http://localhost:8000/static/${selectedEntry.audio_path}`}></audio>
                                    </div>
                                )}
                            </div>

                            <div className="modal-right">
                                <h3>Entry Details (ID: {selectedEntry.id})</h3>
                                <p className="modal-timestamp" style={{ marginBottom: '0.5rem' }}>Captured: {new Date(selectedEntry.timestamp).toLocaleString()}</p>
                                <p className="modal-timestamp">Uploaded by User: {selectedEntry.uploader_username} (ID: {selectedEntry.uploader_id})</p>

                                <div className="form-group">
                                    <label>Notes</label>
                                    <textarea
                                        rows="4"
                                        value={editNotes}
                                        onChange={e => setEditNotes(e.target.value)}
                                        className="edit-input"
                                    />
                                </div>

                                <div className="form-group row">
                                    <div className="half">
                                        <label>Temperature (°C)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={editTemp}
                                            onChange={e => setEditTemp(e.target.value)}
                                            className="edit-input"
                                        />
                                    </div>
                                    <div className="half">
                                        <label>Location</label>
                                        {selectedEntry.latitude && selectedEntry.longitude ? (
                                            <div className="map-link">
                                                <a href={`https://www.google.com/maps/search/?api=1&query=${selectedEntry.latitude},${selectedEntry.longitude}`} target="_blank" rel="noreferrer">
                                                    View on Map 📍
                                                </a>
                                            </div>
                                        ) : (
                                            <p className="not-avail">Not available</p>
                                        )}
                                    </div>
                                </div>

                                <div className="modal-actions">
                                    <button className="btn-secondary" onClick={closeModal} disabled={isDeleting}>Cancel</button>
                                    <button type="button" onClick={handleDelete} disabled={isDeleting} style={{ backgroundColor: '#E53E3E', color: 'white', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: '500' }}>
                                        {isDeleting ? 'Deleting...' : 'Delete Record'}
                                    </button>
                                    <button className="btn-primary" onClick={saveUpdates} disabled={isDeleting}>Save Changes</button>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            )}

            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </div>
    );
}
