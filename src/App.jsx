import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import {
  // BURAYA DİKKAT: Zap tekrar eklendi 👇
  Zap, FolderPlus, Check, ArrowRight, Settings, Clock,
  Image as ImageIcon, Loader2,
  PlusCircle, LogOut, Lock, Save, ArrowLeft, List, XCircle, UserPlus,
  BarChart3, Calendar, Eye, EyeOff, Shield
} from 'lucide-react';
import './App.css';

const API_BASE_URL = 'https://quickcase-api.onrender.com/api';

function App() {
  const [token, setToken] = useState(localStorage.getItem('qc_token'));
  const [view, setView] = useState('dashboard');

  // AUTH STATE
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // PASSWORD STRENGTH
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

  // DASHBOARD STATE
  const [repoId, setRepoId] = useState(1);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [jiraInput, setJiraInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [syncResults, setSyncResults] = useState([]);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // PREVIEW STATE
  const [previewTask, setPreviewTask] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // SETTINGS & DATA
  const [settingsTab, setSettingsTab] = useState('api');
  const [settingsData, setSettingsData] = useState({
    JIRA_BASE_URL: '', JIRA_EMAIL: '', JIRA_API_TOKEN: '',
    TESTMO_BASE_URL: '', TESTMO_API_KEY: ''
  });
  const [passwordData, setPasswordData] = useState({ old: '', new: '', confirm: '' });
  const [settingsLoading, setSettingsLoading] = useState(false);

  const [historyData, setHistoryData] = useState([]);
  const [stats, setStats] = useState({ total_cases: 0, total_images: 0, today_syncs: 0 });

  useEffect(() => {
    document.title = "VeloxCase | Saniyeler İçinde Sync";
    if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }, [token]);

  // --- DEBOUNCED PREVIEW ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (token && jiraInput.length > 5 && !jiraInput.includes(',')) {
        setPreviewLoading(true);
        try {
          const res = await axios.post(`${API_BASE_URL}/preview`, { task_key: jiraInput });
          setPreviewTask(res.data);
        } catch { setPreviewTask(null); }
        finally { setPreviewLoading(false); }
      } else { setPreviewTask(null); }
    }, 800);
    return () => clearTimeout(delayDebounceFn);
  }, [jiraInput, token]);

  // --- AUTH ---
  const handleAuth = async (e) => {
    e.preventDefault();
    if (!username || !password) return toast.error("Lütfen alanları doldurun.");
    setAuthLoading(true);
    const endpoint = isRegistering ? '/register' : '/login';
    try {
      const res = await axios.post(`${API_BASE_URL}${endpoint}`, { username, password });
      if (isRegistering) {
        toast.success("Kayıt Başarılı! Giriş yapabilirsiniz.");
        setIsRegistering(false); setPassword('');
      } else {
        localStorage.setItem('qc_token', res.data.access_token);
        setToken(res.data.access_token);
        toast.success("Giriş Başarılı!");
      }
    } catch (err) { toast.error(err.response?.data?.msg || "İşlem başarısız."); }
    finally { setAuthLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('qc_token');
    setToken(null); setView('dashboard'); setUsername(''); setPassword('');
    toast('Oturum kapatıldı.');
  };

  const fetchFolders = useCallback(async () => {
    if (!repoId || !token || view !== 'dashboard') return;
    setFoldersLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/folders/${repoId}`);
      setFolders(res.data.folders || []);
    } catch (err) { if(err.response?.status === 401) handleLogout(); }
    finally { setFoldersLoading(false); }
  }, [repoId, token, view]);

  const fetchStats = useCallback(async () => {
    if (!token || view !== 'dashboard') return;
    try { const res = await axios.get(`${API_BASE_URL}/stats`); setStats(res.data); }
    catch (err) { console.error(err); }
  }, [token, view]);

  useEffect(() => {
    if(token && view === 'dashboard') { fetchFolders(); fetchStats(); }
  }, [fetchFolders, fetchStats, token, view]);

  useEffect(() => {
    if (view === 'history' && token) axios.get(`${API_BASE_URL}/history`).then(res => setHistoryData(res.data));
    if (view === 'settings' && token) axios.get(`${API_BASE_URL}/settings`).then(res => {
      const { FIGMA_ACCESS_TOKEN, ...cleanData } = res.data;
      setSettingsData(cleanData);
    });
  }, [view, token]);

  const handleSync = async () => {
    if (!jiraInput || !selectedFolder) return toast.error("Lütfen tüm alanları doldurun.");
    setLoading(true); setSyncResults([]);
    const tId = toast.loading('Kayıtlar işleniyor...');
    try {
      const res = await axios.post(`${API_BASE_URL}/sync`, { jira_input: jiraInput, folder_id: selectedFolder, project_id: repoId });
      setSyncResults(res.data.results || []);

      const successCount = res.data.results.filter(r => r.status === 'success').length;
      if (successCount > 0) {
        toast.success(`İşlem Tamamlandı! (${successCount} Kayıt)`, { id: tId });
        setJiraInput(''); fetchStats();
        setTimeout(() => setSyncResults([]), 5000);
      } else {
        toast.error("İşlem başarısız oldu.", { id: tId });
      }
    } catch (err) { toast.error("Sunucu hatası.", { id: tId }); }
    finally { setLoading(false); }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/folders/${repoId}`, { name: newFolderName, parent_id: selectedFolder || null });
      await fetchFolders();
      if(res.data?.id) setSelectedFolder(res.data.id);
      setNewFolderName(''); setShowNewFolder(false);
      toast.success('Klasör oluşturuldu');
    } catch (err) { toast.error(err.message); }
  };

  const saveSettings = async () => {
    setSettingsLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/settings`, settingsData);
      toast.success("Ayarlar kaydedildi");
      setTimeout(() => setView('dashboard'), 1000);
    } catch { toast.error("Hata"); }
    finally { setSettingsLoading(false); }
  };

  const handleChangePassword = async () => {
    if (!passwordData.old || !passwordData.new || !passwordData.confirm) return toast.error("Alanları doldurun.");
    if (passwordData.new !== passwordData.confirm) return toast.error("Yeni şifreler eşleşmiyor.");
    setSettingsLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/change-password`, { old_password: passwordData.old, new_password: passwordData.new });
      toast.success("Şifreniz güncellendi!");
      setPasswordData({ old: '', new: '', confirm: '' });
    } catch (err) { toast.error(err.response?.data?.msg || "Hata oluştu."); }
    finally { setSettingsLoading(false); }
  };

  // Şifremi Unuttum Toast'ı
  const handleForgotPassword = () => {
    toast((t) => (
      <div style={{textAlign: 'center'}}>
        <b>Geliştirici ile iletişime geçiniz:</b>
        <br />
        <a href="mailto:selim@selimerdinc.com" style={{color: '#4f46e5', textDecoration: 'underline', display: 'block', marginTop: '5px', fontWeight: 'bold'}}>
          selim@selimerdinc.com
        </a>
      </div>
    ), {
      icon: '📧', duration: 6000,
      style: { background: '#fff', color: '#333', border: '1px solid #4f46e5', padding: '16px' },
    });
  };

  if (!token) return (
    <div className="app-container login-container">
      <Toaster position="top-center"/>
      <div className="login-card">
        <div className="login-header">
           <img src="/logo.png" alt="VeloxCase" style={{height:80, marginBottom:32}} className="mx-auto"/>
           <h1>VeloxCase</h1>
           <p>{isRegistering ? 'Yeni Hesap Oluşturun' : 'Giriş Yap'}</p>
        </div>
        <form onSubmit={handleAuth}>
          <div className="form-group">
            <label className="form-label">Kullanıcı Adı</label>
            <input className="form-input" value={username} onChange={e=>setUsername(e.target.value)} placeholder="Kullanıcı Adı"/>
          </div>
          <div className="form-group">
            <label className="form-label">Şifre</label>
            <div className="input-wrapper">
              <input type={showPassword ? "text" : "password"} className="form-input" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••••••" style={{paddingRight: '40px'}}/>
              <button type="button" className="eye-btn" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
            </div>
            {isRegistering && password.length > 0 && (<div className="strength-meter"><div className="strength-bar" style={{width: `${strengthScore}%`, backgroundColor: strengthScore < 50 ? '#ef4444' : strengthScore < 75 ? '#eab308' : '#22c55e'}}></div></div>)}
          </div>
          <button type="submit" className="btn btn-primary" disabled={!username || !password || authLoading} style={{width:'100%', marginBottom:'1rem'}}>
            {authLoading ? <Loader2 className="spinner"/> : (isRegistering ? <><UserPlus size={18}/> Kayıt Ol</> : <><Lock size={18}/> Giriş Yap</>)}
          </button>
        </form>
        <div style={{borderTop:'1px solid #e2e8f0', paddingTop:'1rem', fontSize:'0.9rem', display:'flex', flexDirection:'column', alignItems:'center', gap:'5px'}}>
          <div>
            <span style={{color:'#64748b'}}>{isRegistering ? 'Zaten hesabınız var mı?' : 'Hesabınız yok mu?'}</span>
            <button onClick={() => { setIsRegistering(!isRegistering); setUsername(''); setPassword(''); }} className="btn-text" style={{marginLeft:'5px', fontSize:'0.9rem'}}>
              {isRegistering ? 'Giriş Yap' : 'Hemen Kayıt Ol'}
            </button>
          </div>
          {!isRegistering && <button onClick={handleForgotPassword} className="btn-text" style={{fontSize:'0.85rem', color:'#94a3b8', fontWeight:500}}>Şifremi Unuttum</button>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="app-container">
      <Toaster position="top-center"/>
      <div className="main-wrapper">

        <div className="header-card">
          <div className="header-brand">
            <img src="/logo.png" alt="VeloxCase" style={{height:60, marginRight:20}}/>
            <div className="brand-text"><h1>VeloxCase</h1><p>Saniyeler İçinde Sync</p></div>
          </div>
          <div style={{display:'flex', gap:'10px'}}>
            {view === 'dashboard' && (
              <>
                <button onClick={() => setView('history')} className="btn btn-text" title="Geçmiş"><Clock size={20}/> Geçmiş</button>
                <button onClick={() => setView('settings')} className="btn btn-text" title="Ayarlar"><Settings size={20}/> Ayarlar</button>
              </>
            )}
            <button onClick={handleLogout} className="btn btn-text text-red" title="Güvenli Çıkış"><LogOut size={20}/></button>
          </div>
        </div>

        {view === 'settings' ? (
          <div className="settings-view card" style={{animation: 'fadeIn 0.3s ease-out'}}>
             <div className="page-header"><button onClick={()=>setView('dashboard')} className="btn-back"><ArrowLeft size={20}/> Geri Dön</button><div><h2>Sistem Ayarları</h2><p>API ve Güvenlik Yönetimi</p></div></div>
             <div className="settings-tabs">
                <button className={`tab-btn ${settingsTab === 'api' ? 'active' : ''}`} onClick={() => setSettingsTab('api')}><Zap size={18}/> API Bağlantıları</button>
                <button className={`tab-btn ${settingsTab === 'security' ? 'active' : ''}`} onClick={() => setSettingsTab('security')}><Shield size={18}/> Güvenlik</button>
             </div>
             {settingsTab === 'api' ? (
                 <div className="settings-grid tab-content fade-in">
                    {Object.keys(settingsData).map(key => (
                       <div key={key} className="form-group"><label>{key.replace(/_/g, ' ')}</label><input className="form-input" type={key.includes('TOKEN') || key.includes('KEY') ? "password" : "text"} value={settingsData[key]} onChange={e => setSettingsData({...settingsData, [key]: e.target.value})} placeholder={`${key} giriniz...`}/></div>
                    ))}
                    <div style={{gridColumn: 'span 2', textAlign:'right'}}><button onClick={saveSettings} className="btn btn-primary" disabled={settingsLoading} style={{width:'160px'}}>{settingsLoading ? <Loader2 className="spinner"/> : <><Save size={18}/> Kaydet</>}</button></div>
                 </div>
             ) : (
                 <div className="tab-content fade-in" style={{maxWidth:'400px'}}>
                    <div className="form-group"><label>Mevcut Şifre</label><input type="password" className="form-input" value={passwordData.old} onChange={e => setPasswordData({...passwordData, old: e.target.value})}/></div>
                    <div className="form-group"><label>Yeni Şifre</label><input type="password" className="form-input" value={passwordData.new} onChange={e => setPasswordData({...passwordData, new: e.target.value})}/></div>
                    <div className="form-group"><label>Yeni Şifre (Tekrar)</label><input type="password" className="form-input" value={passwordData.confirm} onChange={e => setPasswordData({...passwordData, confirm: e.target.value})}/></div>
                    <button onClick={handleChangePassword} className="btn btn-primary" disabled={settingsLoading} style={{width:'100%', marginTop:'10px'}}>{settingsLoading ? <Loader2 className="spinner"/> : <><Lock size={18}/> Güncelle</>}</button>
                 </div>
             )}
          </div>
        ) : view === 'history' ? (
          <div className="card" style={{animation: 'fadeIn 0.3s ease-out'}}>
             <div className="page-header"><button onClick={()=>setView('dashboard')} className="btn-back"><ArrowLeft size={20}/> Geri Dön</button><div><h2>İşlem Geçmişi</h2><p>Son yapılan aktarımlar</p></div></div>
             <div className="history-table-wrapper">
               <table className="history-table"><thead><tr><th>Tarih</th><th>Task</th><th>Case</th><th>Durum</th></tr></thead><tbody>{historyData.map(log => (<tr key={log.id}><td style={{color:'#64748b'}}>{log.date}</td><td style={{fontWeight:600}}>{log.task}</td><td>{log.case}</td><td><span className="status-badge-success">{log.status}</span></td></tr>))}</tbody></table>
             </div>
          </div>
        ) : (
          <>
          <div className="stats-grid">
             <div className="stat-card"><div className="stat-icon bg-blue"><BarChart3 size={24} color="#2563eb"/></div><div className="stat-info"><h3>{stats.total_cases || 0}</h3><p>Toplam Case</p></div></div>
             <div className="stat-card"><div className="stat-icon bg-purple"><ImageIcon size={24} color="#9333ea"/></div><div className="stat-info"><h3>{stats.total_images || 0}</h3><p>İşlenen Görsel</p></div></div>
             <div className="stat-card"><div className="stat-icon bg-green"><Calendar size={24} color="#16a34a"/></div><div className="stat-info"><h3>{stats.today_syncs || 0}</h3><p>Bugünkü İşlem</p></div></div>
          </div>
          <div className="grid-layout">
            <div className="sidebar">
              <div className="card"><div className="form-group"><label className="form-label">Depo Kimliği (Repository ID)</label><input type="number" className="form-input" value={repoId} onChange={e=>setRepoId(e.target.value)}/></div></div>
              <div className="card"><div className="form-group"><label className="form-label" style={{display:'flex', justifyContent:'space-between'}}>Hedef Klasör <button onClick={()=>setShowNewFolder(!showNewFolder)} className="btn-text"><FolderPlus size={16}/> Yeni</button></label>{showNewFolder && <div className="new-folder-wrapper"><input className="form-input" placeholder="Klasör adı..." value={newFolderName} onChange={e=>setNewFolderName(e.target.value)}/><button onClick={handleCreateFolder} className="btn btn-success"><PlusCircle size={18}/> Oluştur</button></div>}<div className="input-container"><select className="form-select" value={selectedFolder} onChange={e=>setSelectedFolder(e.target.value)} disabled={foldersLoading}><option value="">{foldersLoading ? 'Yükleniyor...' : 'Bir klasör seçiniz...'}</option>{folders.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></div></div></div>
            </div>
            <div className="content-area">
              <div className="card"><label className="form-label" style={{fontSize:'1.1rem'}}>Jira Task Listesi</label>
              {/* PREVIEW KARTI */}
              {previewLoading ? (<div className="preview-loader"><Loader2 className="spinner text-primary"/> Task bilgisi alınıyor...</div>) : previewTask && (<div className="preview-card">{previewTask.icon && <img src={previewTask.icon} alt="Type" style={{width:20, height:20}} />}<div><strong>{previewTask.key}:</strong> {previewTask.summary}<span className={`status-tag ${previewTask.status === 'Done' ? 'status-done' : ''}`}>{previewTask.status}</span></div></div>)}
              <div style={{display:'flex', gap:'12px', marginTop:'1rem'}}><div style={{flex:1}}><input className="form-input" placeholder="Örn: PROJ-123, PROJ-456" value={jiraInput} onChange={e=>setJiraInput(e.target.value)} style={{padding:'1rem', fontSize:'1.1rem', fontWeight:'600'}}/></div><button onClick={handleSync} disabled={loading} className="btn btn-primary" style={{width:'220px'}}>{loading ? <><Loader2 className="spinner" size={20}/> İşleniyor...</> : <><Zap size={20}/> Senkronize Et <ArrowRight size={20}/></>}</button></div><p className="helper-text" style={{marginTop:'1rem'}}>* Çoklu giriş için virgül ile ayırabilirsiniz.</p></div>
              {syncResults.length > 0 && (
                <div className="result-card"><div className="result-header"><div className="success-icon-box" style={{background:'#f1f5f9', color:'#1e293b'}}><List size={24} strokeWidth={3}/></div><div><h3 className="result-title">İşlem Özeti</h3><div className="result-meta"><span className="meta-tag">Toplam: {syncResults.length} Kayıt</span></div></div></div><div className="case-list">{syncResults.map((res, idx) => (<div key={idx} className="case-item" style={{borderLeft: res.status==='success' ? '4px solid #22c55e' : '4px solid #ef4444'}}><div className="case-info">{res.status === 'success' ? <Check className="text-green" size={20}/> : <XCircle className="text-red" size={20}/>}<div><span className="case-name" style={{display:'block'}}>{res.task}</span><span style={{fontSize:'0.8rem', color:'#64748b'}}>{res.status === 'success' ? res.case_name : res.msg}</span></div></div>{res.status === 'success' && <div style={{display:'flex', alignItems:'center', gap:'8px'}}><span className="img-badge"><ImageIcon size={12}/> {res.images} Resim</span></div>}</div>))}</div></div>
              )}
            </div>
          </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;