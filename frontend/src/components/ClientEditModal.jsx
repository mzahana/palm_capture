import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api, { BASE_URL } from '../utils/api';
import './ClientEditModal.css';

const formatBytes = (bytes, decimals = 2) => {
    if (bytes === null || bytes === undefined || !+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export default function ClientEditModal({ isOpen, onClose, entry, onSaveSuccess, onDeleteSuccess }) {
    const { t } = useTranslation();

    // Hooks must be called before any conditional returns
    const [editNotes, setEditNotes] = useState('');
    const [editTemp, setEditTemp] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Audio edit state
    const [newAudioBlob, setNewAudioBlob] = useState(null);
    const [deleteAudio, setDeleteAudio] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);

    // Sync state when entry changes or modal opens
    React.useEffect(() => {
        if (isOpen && entry) {
            setEditNotes(entry.notes || '');
            setEditTemp(entry.temperature || '');
            setNewAudioBlob(null);
            setDeleteAudio(false);
            setIsRecording(false);
            setRecordingTime(0);
        }
    }, [isOpen, entry]);

    if (!isOpen || !entry) return null;

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
                let mimeType = 'audio/webm';
                if (MediaRecorder.isTypeSupported('audio/mp4')) {
                    mimeType = 'audio/mp4';
                }
                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                setNewAudioBlob(audioBlob);
                setDeleteAudio(false);
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
            alert("Microphone access denied or error occurred.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerRef.current);
        }
    };

    const handleDeleteCurrentAudio = () => {
        setDeleteAudio(true);
        setNewAudioBlob(null);
    };

    const handleDelete = async () => {
        if (!window.confirm(t('common.confirm_delete'))) return;

        try {
            setIsDeleting(true);
            await api.delete(`/entries/${entry.id}`);
            if (onDeleteSuccess) {
                onDeleteSuccess(entry.id);
            }
            onClose();
        } catch (err) {
            console.error("Delete failed", err);
            alert("Failed to delete entry.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            const formData = new FormData();
            formData.append("notes", editNotes);
            if (editTemp !== '') formData.append("temperature", editTemp);

            if (deleteAudio && entry.audio_path) {
                formData.append("delete_audio", true);
            }
            if (newAudioBlob) {
                const ext = newAudioBlob.type.includes('mp4') ? 'mp4' : 'webm';
                formData.append("audio", newAudioBlob, `audio.${ext}`);
            }

            await api.put(`/entries/${entry.id}`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            onSaveSuccess();
            onClose();
        } catch (err) {
            console.error(err);
            alert("Failed to save changes.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content client-edit-modal" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>&times;</button>
                <div className="modal-body">
                    <div className="modal-left">
                        <img src={`${BASE_URL}/static/${entry.image_path}`} alt="Tree Preview" className="modal-image" />
                        <div className="media-stats">
                            {entry.image_width && entry.image_height && <p>{t('admin.modal_dimensions')}: {entry.image_width} x {entry.image_height} px</p>}
                            {entry.image_size_bytes && <p>{t('admin.modal_image_size')}: {formatBytes(entry.image_size_bytes)}</p>}
                        </div>
                    </div>
                    <div className="modal-right">
                        <h3>{t('admin.entry_details_id', { id: entry.id })}</h3>
                        <p className="modal-timestamp" style={{ marginBottom: "1rem" }}>
                            {t('admin.captured')}: {new Date(entry.timestamp).toLocaleString()}
                        </p>

                        <div className="form-group row">
                            <div className="half">
                                <label>{t('admin.temperature')}</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={editTemp}
                                    onChange={e => setEditTemp(e.target.value)}
                                    className="edit-input"
                                />
                            </div>
                            <div className="half">
                                <label>{t('admin.location')}</label>
                                {entry.latitude && entry.longitude ? (
                                    <div className="map-link">
                                        <a href={`https://www.google.com/maps/search/?api=1&query=${entry.latitude},${entry.longitude}`} target="_blank" rel="noreferrer">
                                            {t('admin.view_on_map')}
                                        </a>
                                    </div>
                                ) : (
                                    <p className="not-avail">{t('admin.not_available')}</p>
                                )}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>{t('admin.notes')}</label>
                            <textarea
                                rows="4"
                                value={editNotes}
                                onChange={e => setEditNotes(e.target.value)}
                                className="edit-input"
                            />
                        </div>

                        <div className="form-group">
                            <label>{t('form.voice_note')}</label>
                            <div className="audio-edit-section">
                                {entry.audio_path && !deleteAudio && !newAudioBlob && (
                                    <div className="current-audio">
                                        <p>{t('admin.current_recording')} {entry.audio_size_bytes ? `(${formatBytes(entry.audio_size_bytes)})` : ''}:</p>
                                        <audio controls src={`${BASE_URL}/static/${entry.audio_path}`}></audio>
                                        <button type="button" className="btn-text-danger" onClick={handleDeleteCurrentAudio}>{t('common.delete')}</button>
                                    </div>
                                )}

                                {(deleteAudio || !entry.audio_path || newAudioBlob) && (
                                    <div className={`audio-recorder ${isRecording ? 'recording' : ''}`}>
                                        {!isRecording && !newAudioBlob && (
                                            <button type="button" className="btn-record" onClick={startRecording}>
                                                🎙️ {t('admin.add_recording')}
                                            </button>
                                        )}
                                        {isRecording && (
                                            <div className="recording-active">
                                                <span className="pulse">🔴</span> {t('admin.recording_active')}... {recordingTime}s
                                                <button type="button" className="btn-stop" onClick={stopRecording}>{t('form.stop_recording')}</button>
                                            </div>
                                        )}
                                        {newAudioBlob && !isRecording && (
                                            <div className="audio-preview">
                                                <audio controls src={URL.createObjectURL(newAudioBlob)}></audio>
                                                <button type="button" className="btn-text-danger" onClick={() => { setNewAudioBlob(null); setRecordingTime(0); }}>{t('admin.discard')}</button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="modal-actions" style={{ marginTop: "1.5rem" }}>
                            <button className="btn-secondary" onClick={onClose} disabled={isSaving || isDeleting}>{t('common.cancel')}</button>
                            <button type="button" onClick={handleDelete} disabled={isSaving || isDeleting} style={{ backgroundColor: '#E53E3E', color: 'white', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: '500' }}>
                                {isDeleting ? 'Deleting...' : t('common.delete_record')}
                            </button>
                            <button className="btn-primary" onClick={handleSave} disabled={isSaving || isDeleting}>
                                {isSaving ? "Saving..." : t('common.save_changes')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
