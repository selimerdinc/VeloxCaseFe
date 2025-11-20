// src/features/auth/useAuth.js

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = 'https://quickcase-api.onrender.com/api';

/**
 * useAuth: Kimlik doğrulama (Giriş/Kayıt) mantığını yöneten özel Hook.
 */
export const useAuth = () => {
    // --- KRİTİK DÜZELTME: Başlangıçta token'ı NULL yapıyoruz. ---
    const [token, setToken] = useState(null);
    const [isLoadingInitial, setIsLoadingInitial] = useState(true); // Token yükleniyor mu?

    const [isRegistering, setIsRegistering] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [authLoading, setAuthLoading] = useState(false);
    const [errors, setErrors] = useState({ username: false, password: false });

    // YENİ: Yeniden render'ı tetiklemek için anahtar (Login Hang Fix)
    const [authKey, setAuthKey] = useState(0);

    // --- YAN ETKİ: LocalStorage'dan İlk Yükleme ve Axios Header Ayarı ---
    useEffect(() => {
        const storedToken = localStorage.getItem('qc_token');
        if (storedToken) {
            setToken(storedToken);
            axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        }
        setIsLoadingInitial(false);
        // Bu useEffect sadece bir kez çalışır ([])
    }, []);

    // Token her değiştiğinde Axios Header'ını GÜNCELLE
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }
    }, [token]);


    // --- YARDIMCI FONKSİYON: Şifre Gücü ---
    const getStrength = (pass) => {
        if(!pass) return 0;
        let score = 0;
        if (pass.length > 7) score += 25;
        if (/[A-Z]/.test(pass)) score += 25;
        if (/[0-9]/.test(pass)) score += 25;
        if (/[^A-Za-z0-9]/.test(pass)) score += 25;
        return score;
    }
    const strengthScore = getStrength(password);

    // --- İŞLEV: Oturum Açma / Kayıt Olma ---
    const handleAuth = useCallback(async (e) => {
        e.preventDefault();

        // 1. Validasyon Kontrolü (Aynı kalır)
        const newErrors = {
            username: !username.trim(),
            password: !password.trim()
        };
        setErrors(newErrors);
        if (newErrors.username || newErrors.password) { /* ... */ return; }
        if (isRegistering && password.length < 8) { /* ... */ return; }

        setAuthLoading(true);
        const endpoint = isRegistering ? '/register' : '/login';

        try {
            const res = await axios.post(`${API_BASE_URL}${endpoint}`, { username, password });
            const receivedToken = res.data.access_token;
            if (!receivedToken) { throw new Error("API'den geçerli token alınamadı."); }

            if (isRegistering) {
                toast.success(`Tebrikler! Hesabınız oluşturuldu. Giriş sayfasına yönlendiriliyorsunuz.`, { icon: '✅', duration: 5000 });
                setIsRegistering(false);
                setPassword('');
            } else {
                // Giriş başarılı:
                localStorage.setItem('qc_token', receivedToken);

                // KRİTİK: setToken'ı çağır ve anahtarı değiştirerek App.jsx'i zorla.
                setToken(receivedToken);
                setAuthKey(prev => prev + 1);

                // Form alanlarını temizle
                setUsername('');
                setPassword('');
                setErrors({username: false, password: false});

                toast.success(`Giriş Başarılı! Sisteme hoş geldiniz, ${username}.`, { icon: '👋' });
            }
        } catch (err) { /* ... hata yönetimi aynı kalır ... */ } finally { setAuthLoading(false); }
    }, [username, password, isRegistering]);

    // --- İŞLEV: Oturumu Kapatma ---
    const handleLogout = useCallback(() => {
        localStorage.removeItem('qc_token');
        setToken(null);
        setAuthKey(prev => prev + 1); // Logout'ta da yenile
        setUsername('');
        setPassword('');
        setErrors({username:false, password:false});
        toast('Oturum güvenli bir şekilde sonlandırıldı.', {icon:'🔒'});
    }, []);

    // --- İŞLEV: Şifremi Unuttum ---
    const handleForgotPassword = useCallback(() => { /* ... aynı kalır ... */ }, []);

    // --- KAPSÜLLENMİŞ ARAYÜZ ---
    return {
        // State ve Değerler
        token: token, // Artık sadece token'ı döndürüyoruz.
        authKey,
        strengthScore,
        isRegistering,
        username,
        password,
        showPassword,
        authLoading,
        errors,

        // Yükleniyorsa boş ekran göster (UX)
        isInitialized: !isLoadingInitial,

        // State Değiştiriciler (Setters)
        setUsername: (value) => { /* ... */ setUsername(value); if(errors.username) setErrors(e => ({...e, username: false})); },
        setPassword: (value) => { /* ... */ setPassword(value); if(errors.password) setErrors(e => ({...e, password: false})); },
        setIsRegistering,
        setShowPassword,

        // İşlevler
        handleAuth,
        handleLogout,
        handleForgotPassword,
    };
};