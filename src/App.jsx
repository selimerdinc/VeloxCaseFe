// src/App.jsx

import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Settings, Clock, LogOut, Sun, Moon, Loader2 } from 'lucide-react'; // Loader2 eklendi
import './App.css';

// Hook'lar
import { useAuth } from './features/auth/useAuth';
import { useDashboard } from './features/dashboard/useDashboard';

// Bileşenler (Aynı Kalır)
import LoginView from './features/auth/components/LoginView';
import DashboardView from './features/dashboard/components/DashboardView';
import HistoryView from './features/dashboard/components/HistoryView';
import SettingsView from './features/settings/components/SettingsView';


const getInitialTheme = () => { /* ... aynı kalır ... */ };

function App() {
  // 1. GLOBAL STATE (Navigation & Theme)
  const [view, setView] = useState('dashboard');
  const [theme, setTheme] = useState(getInitialTheme);

  // 2. GLOBAL MANTIK KATMANI
  // YENİ: authKey'i ve isInitialized'ı hook'tan alıyoruz.
  const { token, handleLogout, authKey, isInitialized } = useAuth();

  const dashboardLogic = useDashboard(token, view, handleLogout, setView);

  const handleThemeToggle = () => { /* ... aynı kalır ... */ setTheme(t => (t === 'light' ? 'dark' : 'light')); };

  useEffect(() => { /* ... aynı kalır ... */ document.body.className = theme === 'dark' ? 'dark-mode' : ''; localStorage.setItem('theme', theme); }, [theme]);


  // --- YENİ: YÜKLENİYOR EKRANI (Token Yüklenene kadar bekle) ---
  if (!isInitialized) {
    return (
      <div className="app-container" style={{justifyContent: 'center', alignItems: 'center'}}>
        <Loader2 className="spinner" size={36} color="var(--primary)"/>
        <p style={{marginTop: '1rem', color: 'var(--text-secondary)'}}>Sistem yükleniyor...</p>
      </div>
    );
  }

  // --- RENDER: LOGIN ---
  if (!token) return <LoginView theme={theme} handleThemeToggle={handleThemeToggle} />;

  // --- RENDER: MAIN APP (Router + Layout) ---
  return (
    // KRİTİK: authKey'i key olarak kullanıyoruz.
    <div className="app-container" key={authKey}>
      <Toaster position="top-center" toastOptions={{duration: 4000, style:{fontSize:'0.9rem', fontWeight:500}}}/>
      <div className="main-wrapper">

        {/* HEADER */}
        <div className="header-card">
          <div className="header-brand"><img src="/logo.png" alt="VeloxCase" style={{height:40, marginRight:15}}/><div className="brand-text"><h1>VeloxCase</h1><p>Kurumsal Test Entegrasyon Platformu</p></div></div>
          <div style={{display:'flex', gap:'10px', alignItems: 'center'}}>

            {/* TEMA DEĞİŞTİRME BUTONU */}
            <button onClick={handleThemeToggle} className="btn btn-text" title="Temayı Değiştir" style={{color: 'var(--text-main)'}}>
                {theme === 'dark' ? <Sun size={20}/> : <Moon size={20}/>}
            </button>

            {view === 'dashboard' && (<><button onClick={() => setView('history')} className="btn btn-text" title="Geçmiş İşlemler"><Clock size={18}/> Geçmiş</button><button onClick={() => setView('settings')} className="btn btn-text" title="Sistem Ayarları"><Settings size={18}/> Ayarlar</button></>)}
            <button onClick={handleLogout} className="btn btn-text text-red" title="Güvenli Çıkış"><LogOut size={20}/></button>
          </div>
        </div>

        {/* CONTENT ROUTER */}
        {view === 'settings' ? (
          <SettingsView {...dashboardLogic} setView={setView} />
        ) : view === 'history' ? (
          <HistoryView {...dashboardLogic} setView={setView} />
        ) : (
          <DashboardView {...dashboardLogic} />
        )}
      </div>
    </div>
  );
}

export default App;