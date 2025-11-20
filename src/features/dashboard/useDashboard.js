// src/features/dashboard/useDashboard.js

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = 'https://quickcase-api.onrender.com/api';

/**
 * useDashboard: Dashboard ekranının tüm veri yönetimi ve iş mantığını yönetir.
 */
export const useDashboard = (token, currentView, onLogout, setView) => {
    // --- DASHBOARD STATE'leri ---
    const [repoId, setRepoId] = useState(1);
    const [folders, setFolders] = useState([]);
    const [selectedFolder, setSelectedFolder] = useState('');
    const [jiraInput, setJiraInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [foldersLoading, setFoldersLoading] = useState(false);
    const [syncResults, setSyncResults] = useState([]);
    const [showNewFolder, setShowNewFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    // YENİ: Dashboard Input Hata State'i
    const [dashboardErrors, setDashboardErrors] = useState({ jiraInput: false, selectedFolder: false });

    // --- PREVIEW STATE ---
    const [previewTask, setPreviewTask] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    // --- SETTINGS & DATA STATE'leri ---
    const [settingsData, setSettingsData] = useState({});
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [historyData, setHistoryData] = useState([]);
    const [stats, setStats] = useState({ total_cases: 0, total_images: 0, today_syncs: 0 });
    const [settingsTab, setSettingsTab] = useState('api');
    const [passwordData, setPasswordData] = useState({ old: '', new: '', confirm: '' });
    const [passwordErrors, setPasswordErrors] = useState({ old: false, new: false, confirm: false });


    // --- VERİ ÇEKME İŞLEVLERİ (Aynı kalır) ---
    const fetchFolders = useCallback(async () => {
        if (!repoId || !token || currentView !== 'dashboard') return;
        setFoldersLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/folders/${repoId}`);
            setFolders(res.data.folders || []);
        } catch (err) {
            if(err.response?.status === 401) onLogout();
        } finally {
            setFoldersLoading(false);
        }
    }, [repoId, token, currentView, onLogout]);

    const fetchStats = useCallback(async () => {
        if (!token || currentView !== 'dashboard') return;
        try {
            const res = await axios.get(`${API_BASE_URL}/stats`);
            setStats(res.data);
        } catch (err) {
            console.error(err);
        }
    }, [token, currentView]);


    // --- YAN ETKİLER (USE EFFECT - Aynı kalır) ---
    useEffect(() => {
        if(token && currentView === 'dashboard') {
            fetchFolders();
            fetchStats();
        }
    }, [fetchFolders, fetchStats, token, currentView]);

    useEffect(() => {
        if (currentView === 'history' && token) {
            axios.get(`${API_BASE_URL}/history`).then(res => setHistoryData(res.data));
        }
        if (currentView === 'settings' && token) {
            axios.get(`${API_BASE_URL}/settings`).then(res => {
                const { ...cleanData } = res.data;
                setSettingsData(cleanData);
            });
        }
    }, [currentView, token]);

    useEffect(() => {
        setPreviewTask(null);
        const delay = setTimeout(async () => {
            if (token && jiraInput.length > 5 && !jiraInput.includes(',')) {
                setPreviewLoading(true);
                try {
                    const res = await axios.post(`${API_BASE_URL}/preview`, { task_key: jiraInput });
                    setPreviewTask(res.data);
                } catch {
                    setPreviewTask(null);
                } finally {
                    setPreviewLoading(false);
                }
            } else {
                setPreviewTask(null);
            }
        }, 800);
        return () => clearTimeout(delay);
    }, [jiraInput, token]);


    // --- İŞLEVLER: CRUD/AKSYONLAR (GÜNCELLENDİ) ---

    // Senkronizasyon Başlatma (GÜNCELLENDİ)
    const handleSync = async () => {
        // Hata kontrolü için yeni değişkenler
        const newErrors = {
            jiraInput: !jiraInput || jiraInput.trim() === '',
            selectedFolder: !selectedFolder || selectedFolder === ''
        };
        setDashboardErrors(newErrors);

        if (newErrors.jiraInput || newErrors.selectedFolder) {
            return toast.error("Lütfen Jira Anahtarı ve Hedef Klasör alanlarını doldurunuz.", { icon: '🛑' });
        }

        // Eğer hata yoksa senkronizasyonu başlat
        setLoading(true); setSyncResults([]);
        const tId = toast.loading('Entegrasyon başlatıldı, veriler işleniyor...');
        try {
            const res = await axios.post(`${API_BASE_URL}/sync`, { jira_input: jiraInput, folder_id: selectedFolder, project_id: repoId });
            setSyncResults(res.data.results || []);
            const success = res.data.results.filter(r => r.status === 'success').length;
            const failed = res.data.results.length - success;
            if (success > 0) {
                toast.success(`İşlem Tamamlandı! ${success} kayıt başarıyla aktarıldı. ${failed > 0 ? `(${failed} tanesi hata verdi.)` : ''}`, { id: tId, duration: 8000 });
                setJiraInput('');
                fetchStats();
                setTimeout(() => setSyncResults([]), 10000);
            } else {
                toast.error("Tüm görev anahtarları işlenirken hata oluştu. Lütfen girişleri kontrol edin.", { id: tId });
            }
        } catch (err) {
            toast.error("Sunucu ile iletişim kurulamadı. Lütfen API bağlantılarınızı kontrol edin.", { id: tId });
        } finally {
            setLoading(false);
        }
    };

    // Yeni Klasör Oluşturma
    const handleCreateFolder = async () => {
        if (!newFolderName) return toast.error("Lütfen klasör adı giriniz.");
        try {
            const res = await axios.post(`${API_BASE_URL}/folders/${repoId}`, { name: newFolderName, parent_id: selectedFolder || null });
            await fetchFolders();
            if(res.data?.id) setSelectedFolder(res.data.id);
            setNewFolderName('');
            setShowNewFolder(false);
            toast.success(`Klasör başarıyla oluşturuldu: ${newFolderName}`, { icon: '📁' });
        } catch (err) {
            const msg = err.response?.data?.msg || "Klasör oluşturma hatası. Aynı isimde bir klasör olabilir.";
            toast.error(msg);
        }
    };

    // Ayarları Kaydetme
    const saveSettings = async () => {
        setSettingsLoading(true);
        try {
            await axios.post(`${API_BASE_URL}/settings`, settingsData);
            toast.success("Yapılandırma ayarları başarıyla güncellendi.", { icon: '💾' });
            setTimeout(() => setView('dashboard'), 1000);
        } catch {
            toast.error("Ayarlar kaydedilemedi. Lütfen tüm alanların doğru olduğundan emin olun.");
        } finally {
            setSettingsLoading(false);
        }
    };

    // Şifre Değiştirme
    const handleChangePassword = async () => {
        setPasswordErrors({ old: false, new: false, confirm: false });

        let hasError = false;
        const tempErrors = { old: false, new: false, confirm: false };

        if (!passwordData.old) { tempErrors.old = true; hasError = true; }
        if (!passwordData.new) { tempErrors.new = true; hasError = true; }
        if (!passwordData.confirm) { tempErrors.confirm = true; hasError = true; }

        if (hasError) {
            setPasswordErrors(tempErrors);
            return toast.error("Lütfen şifre alanlarını eksiksiz doldurunuz.");
        }

        if (passwordData.new !== passwordData.confirm) {
            setPasswordErrors(e => ({...e, new: true, confirm: true}));
            return toast.error("Yeni şifreler birbiriyle uyuşmuyor.");
        }

        if (passwordData.new.length < 8) {
            setPasswordErrors(e => ({...e, new: true, confirm: true}));
            return toast.error("Yeni şifreniz en az 8 karakter olmalıdır.");
        }

        setSettingsLoading(true);
        try {
            await axios.post(`${API_BASE_URL}/change-password`, { old_password: passwordData.old, new_password: passwordData.new });
            toast.success("Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapınız.", { icon: '🔒' });
            setPasswordData({ old: '', new: '', confirm: '' });
        } catch (err) {
            const msg = err.response?.data?.msg || "Şifre değiştirilemedi.";
            if (msg.includes('old password is incorrect')) {
                 setPasswordErrors(e => ({...e, old: true}));
                 toast.error("Mevcut şifreniz hatalı. Lütfen doğru şifrenizi giriniz.");
            } else {
                 toast.error(msg);
            }
        } finally {
            setSettingsLoading(false);
        }
    };

    // --- KAPSÜLLENMİŞ ARAYÜZ (RETURN) ---
    return {
        // State'ler
        repoId, folders, selectedFolder, jiraInput, loading, foldersLoading,
        syncResults, showNewFolder, newFolderName, previewTask, previewLoading,
        settingsData, settingsLoading, historyData, stats, settingsTab, passwordData,
        passwordErrors,
        dashboardErrors, // YENİ EKLENDİ

        // Setters (Input/Select güncellenince hatayı temizleme mantığı eklendi)
        setRepoId,
        setSelectedFolder: (value) => {
            setSelectedFolder(value);
            if (dashboardErrors.selectedFolder) setDashboardErrors(e => ({...e, selectedFolder: false}));
        },
        setJiraInput: (value) => {
            setJiraInput(value);
            if (dashboardErrors.jiraInput) setDashboardErrors(e => ({...e, jiraInput: false}));
        },
        setShowNewFolder, setNewFolderName, setSettingsData, setSettingsTab, setPasswordData,
        setPasswordErrors,

        // İşlevler
        handleSync, handleCreateFolder, saveSettings, handleChangePassword,
        fetchFolders, fetchStats
    };
};