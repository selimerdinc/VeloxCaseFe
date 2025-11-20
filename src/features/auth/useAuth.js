// src/features/auth/useAuth.js

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = 'https://quickcase-api.onrender.com/api';

/**
 * useAuth: Kimlik doğrulama (Giriş/Kayıt) mantığını yöneten özel Hook.
 */
export const useAuth = () => {
    // --- AUTH STATE'leri ---
    const [token, setToken] = useState(localStorage.getItem('qc_token'));
    const [isRegistering, setIsRegistering] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [authLoading, setAuthLoading] = useState(false);
    const [errors, setErrors] = useState({ username: false, password: false });

    // YENİ: Yeniden render'ı tetiklemek için anahtar
    const [authKey, setAuthKey] = useState(0);

    // --- YAN ETKİ: Token Değiştiğinde Axios Header'ını Güncelleme ---
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }
    }, [token]);
    // ... (getStrength ve strengthScore aynı kalır)

    // --- İŞLEV: Oturum Açma / Kayıt Olma (KRİTİK GÜNCELLEME) ---
    const handleAuth = useCallback(async (e) => {
        e.preventDefault();

        // 1. Validasyon Kontrolü (Aynı kalır)
        const newErrors = {
            username: !username.trim(),
            password: !password.trim()
        };
        setErrors(newErrors);

        if (newErrors.username || newErrors.password) {
            toast.error("Zorunlu alanları eksiksiz doldurunuz. (Kullanıcı Adı ve Parola)", {
                style: { border: '1px solid #ef4444', color: '#7f1d1d' }
            });
            return;
        }

        if (isRegistering && password.length < 8) { /* ... aynı kalır ... */ return; }

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

                // setToken çağrısından hemen önce/sonra anahtarı değiştir:
                setToken(receivedToken);
                setAuthKey(prev => prev + 1); // <<< KRİTİK: Anahtarı değiştirerek App.jsx'i yenilemeye zorla

                // Form alanlarını ve hata state'lerini temizle
                setUsername('');
                setPassword('');
                setErrors({username: false, password: false});

                toast.success(`Giriş Başarılı! Sisteme hoş geldiniz, ${username}.`, { icon: '👋' });
            }
        } catch (err) { /* ... hata yönetimi aynı kalır ... */ } finally { setAuthLoading(false); }
    }, [username, password, isRegistering]);

    // --- İŞLEV: Oturumu Kapatma (authKey'i sıfırla) ---
    const handleLogout = useCallback(() => {
        localStorage.removeItem('qc_token');
        setToken(null);
        setAuthKey(prev => prev + 1); // <<< Logout'ta da yenile
        setUsername('');
        setPassword('');
        setErrors({username:false, password:false});
        toast('Oturum güvenli bir şekilde sonlandırıldı.', {icon:'🔒'});
    }, []);

    // ... (Diğer fonksiyonlar aynı kalır) ...

    // --- KAPSÜLLENMİŞ ARAYÜZ ---
    return {
        // ... (Diğer state'ler)
        token,
        authKey, // YENİ: Auth anahtarını geri döndür
        strengthScore,
        isRegistering,
        username,
        password,
        showPassword,
        authLoading,
        errors,

        // ... (Setters ve İşlevler)
        setUsername: (value) => { /* ... */ },
        setPassword: (value) => { /* ... */ },
        setIsRegistering,
        setShowPassword,
        handleAuth,
        handleLogout,
        handleForgotPassword,
    };
};