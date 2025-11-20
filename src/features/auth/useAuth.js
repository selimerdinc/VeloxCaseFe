// src/features/auth/useAuth.js

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
// import { LogOut } from 'lucide-react'; // <<< HATA KAYNAĞI: Bu satır kaldırıldı.

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

    // --- YAN ETKİ: Token Değiştiğinde Axios Header'ını Güncelleme ---
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            // Token silindiğinde Authorization Header'ını kaldır.
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

    // --- İŞLEV: Oturum Açma / Kayıt Olma (GELİŞTİRİLDİ) ---
    const handleAuth = useCallback(async (e) => {
        e.preventDefault();

        // 1. Validasyon Kontrolü
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

        // 2. KAYIT OLMAYA ÖZEL EK VALIDASYON (Profesyonel Ekleme)
        if (isRegistering && password.length < 8) {
            setErrors(e => ({...e, password: true}));
            toast.error("Parola güvenliği için en az 8 karakter gereklidir.", {
                icon: '🔑'
            });
            return;
        }

        setAuthLoading(true);
        const endpoint = isRegistering ? '/register' : '/login';

        try {
            const res = await axios.post(`${API_BASE_URL}${endpoint}`, { username, password });

            if (isRegistering) {
                // Profesyonel Success Mesajı
                toast.success(`Tebrikler! Hesabınız oluşturuldu. Giriş sayfasına yönlendiriliyorsunuz.`, { icon: '✅', duration: 5000 });
                setIsRegistering(false);
                setPassword('');
            } else {
                localStorage.setItem('qc_token', res.data.access_token);
                setToken(res.data.access_token);
                // Profesyonel Success Mesajı
                toast.success(`Giriş Başarılı! Sisteme hoş geldiniz, ${username}.`, { icon: '👋' });
            }
        } catch (err) {
            // Profesyonel Hata Yakalama ve Mesajı
            const apiMsg = err.response?.data?.msg;
            let displayMsg = "Kimlik doğrulama işlemi başarısız. Lütfen bilgileri kontrol edin.";

            if (apiMsg === 'User already exists') {
                displayMsg = "Kayıt Başarısız: Bu kullanıcı adı zaten sistemde mevcut.";
            } else if (apiMsg === 'Invalid username or password') {
                 displayMsg = "Giriş Başarısız: Kullanıcı adı veya parola hatalı. Lütfen kontrol ediniz.";
            }

            toast.error(displayMsg, {
                icon: '⚠️',
                style: { border: '1px solid #ef4444', color: '#b91c1c' }
            });
        } finally {
            setAuthLoading(false);
        }
    }, [username, password, isRegistering]);

    // --- İŞLEV: Oturumu Kapatma ---
    const handleLogout = useCallback(() => {
        localStorage.removeItem('qc_token');
        setToken(null);
        setUsername('');
        setPassword('');
        setErrors({username:false, password:false});
        toast('Oturum güvenli bir şekilde sonlandırıldı.', {icon:'🔒'});
    }, []);

    // --- İŞLEV: Şifremi Unuttum ---
    const handleForgotPassword = useCallback(() => {
        toast((t) => (
            <div style={{textAlign: 'center', padding: '4px'}}>
                <strong style={{display:'block', marginBottom:'6px', fontSize:'0.95rem'}}>Geliştirici İletişimi</strong>
                <span style={{fontSize:'0.85rem', color:'#64748b'}}>Şifre sıfırlama talebiniz için lütfen iletişime geçiniz:</span>
                <a
                    href="mailto:selim@selimerdinc.com"
                    style={{
                        color: '#4f46e5',
                        fontWeight: '600',
                        textDecoration: 'none',
                        display: 'block',
                        marginTop: '8px',
                        padding: '6px',
                        background: '#eff6ff',
                        borderRadius: '6px'
                    }}
                >
                    selim@selimerdinc.com
                </a>
            </div>
        ), {
            icon: '📧',
            duration: 6000,
            style: {
                background: '#fff',
                color: '#1e293b',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            },
        });
    }, []);


    // --- KAPSÜLLENMİŞ ARAYÜZ ---
    return {
        // State ve Değerler
        token,
        strengthScore,
        isRegistering,
        username,
        password,
        showPassword,
        authLoading,
        errors,

        // State Değiştiriciler (Setters)
        setUsername: (value) => {
            setUsername(value);
            if(errors.username) setErrors(e => ({...e, username: false}));
        },
        setPassword: (value) => {
            setPassword(value);
            if(errors.password) setErrors(e => ({...e, password: false}));
        },
        setIsRegistering,
        setShowPassword,

        // İşlevler
        handleAuth,
        handleLogout,
        handleForgotPassword,
    };
};