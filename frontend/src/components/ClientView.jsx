import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import SettingsModal from './SettingsModal';
import ClientEditModal from './ClientEditModal';
import './ClientView.css';
import './ClientViewHistory.css';

export default function ClientView() {
    const navigate = useNavigate();
    const username = localStorage.getItem('username') || 'User';
    const role = localStorage.getItem('role');

    // State
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [audioBlob, setAudioBlob] = useState(null);
    const [notes, setNotes] = useState('');
    const [location, setLocation] = useState(null);
    const [temperature, setTemperature] = useState('');

    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [statusType, setStatusType] = useState(''); // 'success' or 'error'

    // V2 & V3 State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [myEntries, setMyEntries] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // V3 Edit State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState(null);

    // Refs
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchMyHistory();
    }, []);

    const fetchMyHistory = async () => {
        try {
            setLoadingHistory(true);
            const res = await api.get('/entries/me');
            setMyEntries(res.data);
        } catch (err) {
            console.error("Failed to load history", err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        navigate('/');
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const openCamera = () => {
        fileInputRef.current.click();
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);

            let seconds = 0;
            timerRef.current = setInterval(() => {
                seconds++;
                setRecordingTime(seconds);
            }, 1000);

        } catch (err) {
            console.error("Error accessing microphone:", err);
            setStatusMessage("Microphone access denied or error occurred.");
            setStatusType("error");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerRef.current);
        }
    };

    // Temperature fetching from Open-Meteo
    const fetchTemperature = async (lat, lon) => {
        try {
            const resp = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
            const data = await resp.json();
            if (data && data.current_weather) {
                setTemperature(data.current_weather.temperature);
            }
        } catch (err) {
            console.error("Could not fetch temperature", err);
        }
    };

    const getLocation = () => {
        if ("geolocation" in navigator) {
            setStatusMessage("Fetching location...");
            setStatusType("");
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    setLocation({ lat, lon });
                    setStatusMessage("Location acquired.");
                    setStatusType("success");
                    fetchTemperature(lat, lon);
                },
                (error) => {
                    console.error(error);
                    setStatusMessage("Could not get location. Enable permissions.");
                    setStatusType("error");
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        } else {
            setStatusMessage("Geolocation not supported by browser.");
            setStatusType("error");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!imageFile) {
            setStatusMessage("Please capture or upload an image first.");
            setStatusType("error");
            return;
        }

        setIsSubmitting(true);
        setStatusMessage("Uploading data...");
        setStatusType("");

        const formData = new FormData();
        formData.append("image", imageFile);
        if (audioBlob) {
            // Pass a filename so backend can discern extension
            formData.append("audio", audioBlob, "audio.webm");
        }
        if (notes) formData.append("notes", notes);
        if (location) {
            formData.append("latitude", location.lat);
            formData.append("longitude", location.lon);
        }
        if (temperature) formData.append("temperature", temperature);

        try {
            await api.post('/upload', formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            setStatusMessage("Upload successful!");
            setStatusType("success");

            // Reset form
            setImageFile(null);
            setImagePreview(null);
            setAudioBlob(null);
            setNotes('');
            setRecordingTime(0);
            fetchMyHistory();

        } catch (err) {
            console.error(err);
            setStatusMessage("Upload failed. Try again.");
            setStatusType("error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="client-container">
            <header className="client-header">
                <h1>{role === 'admin' ? 'Data Collection Mode' : 'New Tree Entry'}</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span className="welcome-text">Welcome, <strong>{username}</strong></span>
                    <button className="btn-secondary" onClick={() => setIsSettingsOpen(true)}>⚙️ Settings</button>
                    {role === 'admin' && (
                        <button className="btn-secondary" onClick={() => navigate('/admin')}>Admin Dashboard</button>
                    )}
                    <button className="btn-logout" onClick={handleLogout}>Logout</button>
                </div>
            </header>

            <main className="form-wrapper">
                <form onSubmit={handleSubmit} className="entry-form">

                    {/* Image Section */}
                    <section className="form-section">
                        <label>1. Capture Image</label>
                        <div className="image-capture-area">
                            {imagePreview ? (
                                <div className="preview-container">
                                    <img src={imagePreview} alt="Preview" className="image-preview" />
                                    <button type="button" className="btn-secondary mt-2" onClick={() => { setImageFile(null); setImagePreview(null); }}>Retake</button>
                                </div>
                            ) : (
                                <div className="capture-placeholder" onClick={openCamera}>
                                    <div className="camera-icon">📷</div>
                                    <span>Tap to open camera</span>
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                ref={fileInputRef}
                                onChange={handleImageChange}
                                className="hidden-input"
                            />
                        </div>
                    </section>

                    {/* Voice Note Section */}
                    <section className="form-section">
                        <label>2. Voice Note (Optional)</label>
                        <div className={`audio-recorder ${isRecording ? 'recording' : ''}`}>
                            {!isRecording && !audioBlob && (
                                <button type="button" className="btn-record" onClick={startRecording}>
                                    🎙️ Start Recording
                                </button>
                            )}
                            {isRecording && (
                                <div className="recording-active">
                                    <span className="pulse">🔴</span> Recording... {recordingTime}s
                                    <button type="button" className="btn-stop" onClick={stopRecording}>Stop</button>
                                </div>
                            )}
                            {audioBlob && !isRecording && (
                                <div className="audio-preview">
                                    <audio controls src={URL.createObjectURL(audioBlob)}></audio>
                                    <button type="button" className="btn-text-danger" onClick={() => { setAudioBlob(null); setRecordingTime(0); }}>Delete</button>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Notes Section */}
                    <section className="form-section">
                        <label>3. Text Notes (Optional)</label>
                        <textarea
                            rows="3"
                            placeholder="Any additional observations..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="notes-input"
                        ></textarea>
                    </section>

                    {/* Location Section */}
                    <section className="form-section location-section">
                        <div className="location-info">
                            <label>4. Location & Weather</label>
                            {location ? (
                                <p className="loc-data">
                                    📍 {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
                                    <br /> 🌡️ {temperature ? `${temperature}°C` : 'Fetching temp...'}
                                </p>
                            ) : (
                                <p className="loc-missing">Location not captured.</p>
                            )}
                        </div>
                        <button type="button" className="btn-secondary" onClick={getLocation}>
                            {location ? 'Refresh Location' : 'Get Location'}
                        </button>
                    </section>

                    {statusMessage && (
                        <div className={`status-banner ${statusType}`}>
                            {statusMessage}
                        </div>
                    )}

                    <button type="submit" className="btn-submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Submitting...' : 'Upload Entry'}
                    </button>
                </form>

                {/* History Section */}
                {role !== 'admin' && (
                    <section className="history-section mt-4">
                        <h2>Your Upload History</h2>
                        {loadingHistory ? (
                            <p>Loading history...</p>
                        ) : myEntries.length === 0 ? (
                            <p>You haven't uploaded any tree data yet.</p>
                        ) : (
                            <div className="history-grid">
                                {myEntries.map(entry => (
                                    <div
                                        key={entry.id}
                                        className="history-card clickable"
                                        onClick={() => { setSelectedEntry(entry); setIsEditModalOpen(true); }}
                                    >
                                        <img src={`http://localhost:8000/static/${entry.image_path}`} alt="Tree" loading="lazy" />
                                        <div className="history-card-info">
                                            <p className="history-date">{new Date(entry.timestamp).toLocaleDateString()}</p>
                                            <div className="history-badges">
                                                {entry.audio_path && <span>🎙️</span>}
                                                {entry.latitude && <span>📍</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}
            </main>

            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

            <ClientEditModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                entry={selectedEntry}
                onSaveSuccess={fetchMyHistory}
                onDeleteSuccess={(deletedId) => setMyEntries(prev => prev.filter(e => e.id !== deletedId))}
            />
        </div>
    );
}
