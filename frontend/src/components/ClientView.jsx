import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api, { BASE_URL } from '../utils/api';
import SettingsModal from './SettingsModal';
import LanguageSwitcher from './LanguageSwitcher';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import ClientEditModal from './ClientEditModal';
import './ClientView.css';
import './ClientViewHistory.css';

const LocationMapPicker = ({ location, mapLocation, setMapLocation }) => {
    const map = useMapEvents({
        click(e) {
            setMapLocation(e.latlng);
        },
        locationfound(e) {
            setMapLocation(e.latlng);
            map.flyTo(e.latlng, 15);
        },
    });

    useEffect(() => {
        if (location) {
            setMapLocation({ lat: location.lat, lng: location.lon });
            map.flyTo([location.lat, location.lon], 15);
        } else {
            map.locate({ setView: true, maxZoom: 15 });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map]);

    return mapLocation ? <Marker position={mapLocation}></Marker> : null;
};

// Fix Leaflet's default icon path issues with webpack/vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function ClientView() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const username = localStorage.getItem('username') || 'User';
    const role = localStorage.getItem('role');

    // State
    const [locationMode, setLocationMode] = useState('auto');
    const [mapLocation, setMapLocation] = useState(null);
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

    // Manual location toggle
    const [isManualLocation, setIsManualLocation] = useState(false);
    const [manualLat, setManualLat] = useState('');
    const [manualLon, setManualLon] = useState('');
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
                // iOS Safari cannot playback video/webm natively, so we request audio/mp4 if supported
                let mimeType = 'audio/webm';
                if (MediaRecorder.isTypeSupported('audio/mp4')) {
                    mimeType = 'audio/mp4';
                }
                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
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
            setStatusMessage(t('form.choose_image_first'));
            setStatusType("error");
            return;
        }

        setIsSubmitting(true);
        setStatusMessage(t('form.uploading'));
        setStatusType("");

        const formData = new FormData();
        formData.append("image", imageFile);
        if (audioBlob) {
            // Pass a filename so backend can discern extension
            const ext = audioBlob.type.includes('mp4') ? 'mp4' : 'webm';
            formData.append("audio", audioBlob, `audio.${ext}`);
        }
        if (notes) formData.append("notes", notes);

        let finalLat = null;
        let finalLon = null;
        if (locationMode === 'map' && mapLocation) {
            finalLat = mapLocation.lat;
            finalLon = mapLocation.lng;
        } else if (locationMode === 'auto' && location) {
            finalLat = location.lat;
            finalLon = location.lon;
        }

        if (finalLat !== null && finalLon !== null) {
            formData.append("latitude", finalLat);
            formData.append("longitude", finalLon);
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
            setLocationMode('auto');
            setMapLocation(null);
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
                <h1>{role === 'admin' ? t('header.data_collection_mode') : t('header.new_tree_entry')}</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <span className="welcome-text">{t('header.welcome', { username })}</span>
                    <LanguageSwitcher />
                    <button className="btn-secondary" onClick={() => setIsSettingsOpen(true)}>⚙️ {t('header.settings')}</button>
                    {role === 'admin' && (
                        <button className="btn-secondary" onClick={() => navigate('/admin')}>Admin Dashboard</button>
                    )}
                    <button className="btn-logout" onClick={handleLogout}>{t('header.logout')}</button>
                </div>
            </header>

            <main className="form-wrapper">
                <form onSubmit={handleSubmit} className="entry-form">

                    {/* Image Section */}
                    <section className="form-section">
                        <label>{t('form.photo')}</label>
                        <div className="image-capture-area">
                            {imagePreview ? (
                                <div className="preview-container">
                                    <img src={imagePreview} alt="Preview" className="image-preview" />
                                    <button type="button" className="btn-secondary mt-2" onClick={() => { setImageFile(null); setImagePreview(null); }}>{t('form.retake_photo')}</button>
                                </div>
                            ) : (
                                <div className="capture-placeholder" onClick={openCamera}>
                                    <div className="camera-icon">📷</div>
                                    <span>{t('form.take_photo')}</span>
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
                        <label>{t('form.voice_note')}</label>
                        <div className={`audio-recorder ${isRecording ? 'recording' : ''}`}>
                            {!isRecording && !audioBlob && (
                                <button type="button" className="btn-record" onClick={startRecording}>
                                    🎙️ {t('form.start_recording')}
                                </button>
                            )}
                            {isRecording && (
                                <div className="recording-active">
                                    <span className="pulse">🔴</span> {t('admin.recording_active')}... {recordingTime}s
                                    <button type="button" className="btn-stop" onClick={stopRecording}>{t('form.stop_recording')}</button>
                                </div>
                            )}
                            {audioBlob && !isRecording && (
                                <div className="audio-preview">
                                    <audio controls src={URL.createObjectURL(audioBlob)}></audio>
                                    <button type="button" className="btn-text-danger" onClick={() => { setAudioBlob(null); setRecordingTime(0); }}>{t('common.delete')}</button>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Notes Section */}
                    <section className="form-section">
                        <label>{t('form.text_notes')}</label>
                        <textarea
                            rows="3"
                            placeholder={t('form.notes_placeholder')}
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="notes-input"
                        ></textarea>
                    </section>

                    {/* Location Section */}
                    <section className="form-section location-section">
                        <div className="location-info">
                            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <span>{t('form.location_weather')}</span>
                                <button type="button" className="action-btn" onClick={() => setLocationMode(locationMode === 'auto' ? 'map' : 'auto')} style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}>
                                    {locationMode === 'auto' ? t('form.pick_map') : t('form.use_auto_gps')}
                                </button>
                            </label>

                            {locationMode === 'map' ? (
                                <div style={{ marginTop: '0.5rem' }}>
                                    <div className="map-picker-container" style={{ height: '300px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                        <MapContainer
                                            key={location ? `${location.lat}-${location.lon}` : 'default'}
                                            center={location ? [location.lat, location.lon] : [0, 0]}
                                            zoom={location ? 15 : 2}
                                            style={{ height: '100%', width: '100%' }}
                                        >
                                            <TileLayer
                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                                            />
                                            <LocationMapPicker
                                                location={location}
                                                mapLocation={mapLocation}
                                                setMapLocation={setMapLocation}
                                            />
                                        </MapContainer>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <p style={{ fontSize: '0.8rem', color: '#666', margin: 0 }}>
                                            {mapLocation ? t('form.selected_map', { lat: mapLocation.lat.toFixed(4), lng: mapLocation.lng.toFixed(4) }) : t('form.tap_on_map')}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (mapLocation) {
                                                    setLocation({ lat: mapLocation.lat, lon: mapLocation.lng });
                                                    setLocationMode('auto');
                                                    fetchTemperature(mapLocation.lat, mapLocation.lng);
                                                }
                                            }}
                                            disabled={!mapLocation}
                                            style={{
                                                backgroundColor: mapLocation ? '#48bb78' : '#cbd5e0',
                                                color: 'white',
                                                padding: '0.5rem 1rem',
                                                borderRadius: '4px',
                                                border: 'none',
                                                fontSize: '0.9rem',
                                                fontWeight: 'bold',
                                                cursor: mapLocation ? 'pointer' : 'not-allowed'
                                            }}
                                        >
                                            {t('form.confirm_pin')}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {location ? (
                                        <p className="loc-data" style={{ padding: '0.5rem', backgroundColor: '#f7fafc', borderRadius: '4px' }}>
                                            📍 {t('form.local_gps', { lat: location.lat.toFixed(4), lon: location.lon.toFixed(4) })}
                                            <br /> 🌡️ {temperature ? `${temperature}°C` : t('form.fetching_temp')}
                                        </p>
                                    ) : (
                                        <p className="loc-missing" style={{ padding: '0.5rem', backgroundColor: '#fff5f5', color: '#c53030', borderRadius: '4px' }}>
                                            {t('form.missing_auto_gps')}
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                        {locationMode === 'auto' && (
                            <button type="button" className="btn-secondary" onClick={getLocation} style={{ marginTop: '0.5rem' }}>
                                {location ? t('form.refresh_auto') : t('form.fetch_gps_auto')}
                            </button>
                        )}
                    </section>

                    {statusMessage && (
                        <div className={`status-banner ${statusType}`}>
                            {statusMessage}
                        </div>
                    )}

                    <button type="submit" className="btn-submit" disabled={isSubmitting}>
                        {isSubmitting ? t('form.uploading') : t('form.upload_entry')}
                    </button>
                </form>

                {/* History Section */}
                {role !== 'admin' && (
                    <section className="history-section mt-4">
                        <h2>{t('history.title')}</h2>
                        {loadingHistory ? (
                            <p>{t('history.syncing')}</p>
                        ) : myEntries.length === 0 ? (
                            <p>{t('history.no_entries')}</p>
                        ) : (
                            <div className="history-grid">
                                {myEntries.map(entry => (
                                    <div
                                        key={entry.id}
                                        className="history-card clickable"
                                        onClick={() => { setSelectedEntry(entry); setIsEditModalOpen(true); }}
                                    >
                                        <img src={`${BASE_URL}/static/${entry.image_path}`} alt="Tree" loading="lazy" />
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
