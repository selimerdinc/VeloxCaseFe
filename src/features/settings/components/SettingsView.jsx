// src/features/settings/components/SettingsView.jsx

import React from 'react';
import { ArrowLeft, Zap, Shield, Loader2, Save, Lock } from 'lucide-react';

function SettingsView(props) {
    const {
        settingsTab, setSettingsTab, settingsData, setSettingsData,
        saveSettings, settingsLoading, passwordData, setPasswordData,
        handleChangePassword, setView,
        passwordErrors // useDashboard'dan gelen Hata State'i
    } = props;

    return (
        <div className="settings-view card" style={{animation: 'fadeIn 0.3s ease-out'}}>
             <div className="page-header">
                 <button onClick={()=>setView('dashboard')} className="btn-back"><ArrowLeft size={20}/> Geri Dön</button>
                 <div><h2>Sistem Ayarları</h2><p>API ve Güvenlik Yönetimi</p></div>
             </div>

             {/* Sekmeler (Tabs) */}
             <div className="settings-tabs">
                <button className={`tab-btn ${settingsTab === 'api' ? 'active' : ''}`} onClick={() => setSettingsTab('api')}><Zap size={18}/> API Bağlantıları</button>
                <button className={`tab-btn ${settingsTab === 'security' ? 'active' : ''}`} onClick={() => setSettingsTab('security')}><Shield size={18}/> Güvenlik</button>
             </div>

             {/* API Ayarları (Aynı Kalır) */}
             {settingsTab === 'api' ? (
                 <div className="settings-grid tab-content fade-in">
                    {Object.keys(settingsData).map(key => (
                       <div key={key} className="form-group">
                           <label>{key.replace(/_/g, ' ')}</label>
                           <input
                               className="form-input"
                               type={key.includes('TOKEN') || key.includes('KEY') ? "password" : "text"}
                               value={settingsData[key]}
                               onChange={e => setSettingsData({...settingsData, [key]: e.target.value})}
                               placeholder={`${key} değerini giriniz...`}
                           />
                       </div>
                    ))}
                    <div style={{gridColumn: 'span 2', textAlign:'right'}}>
                        <button onClick={saveSettings} className="btn btn-primary" disabled={settingsLoading} style={{width:'160px'}}>
                            {settingsLoading ? <Loader2 className="spinner" size={20}/> : <><Save size={18}/> Kaydet</>}
                        </button>
                    </div>
                 </div>
             ) : (

             /* Güvenlik Ayarları (Şifre Değiştirme - Hata Borderı Eklendi) */
                 <div className="tab-content fade-in" style={{maxWidth:'400px'}}>
                    <div className="form-group">
                        <label>Mevcut Şifre</label>
                        <input
                            type="password"
                            className={`form-input ${passwordErrors.old ? 'input-error' : ''}`}
                            value={passwordData.old}
                            onChange={e => setPasswordData({...passwordData, old: e.target.value, confirm: false})} // Hata Temizleme (UX)
                        />
                    </div>
                    <div className="form-group">
                        <label>Yeni Şifre</label>
                        <input
                            type="password"
                            className={`form-input ${passwordErrors.new ? 'input-error' : ''}`}
                            value={passwordData.new}
                            onChange={e => setPasswordData({...passwordData, new: e.target.value, confirm: false})} // Hata Temizleme (UX)
                        />
                    </div>
                    <div className="form-group">
                        <label>Yeni Şifre (Tekrar)</label>
                        <input
                            type="password"
                            className={`form-input ${passwordErrors.confirm ? 'input-error' : ''}`}
                            value={passwordData.confirm}
                            onChange={e => setPasswordData({...passwordData, confirm: e.target.value, new: false})} // Hata Temizleme (UX)
                        />
                    </div>
                    <button onClick={handleChangePassword} className="btn btn-primary" disabled={settingsLoading} style={{width:'100%', marginTop:'10px'}}>
                        {settingsLoading ? <Loader2 className="spinner"/> : <><Lock size={18}/> Güncelle</>}
                    </button>
                 </div>
             )}
        </div>
    );
}

export default SettingsView;