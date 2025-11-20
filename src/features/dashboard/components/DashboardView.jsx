// src/features/dashboard/components/DashboardView.jsx

import React from 'react';
import {
  Zap, FolderPlus, ArrowRight, Image as ImageIcon, Loader2,
  PlusCircle, List, XCircle, BarChart3, Calendar, Check
} from 'lucide-react';

// Prop'lar: useDashboard hook'undan gelen tüm değerler
function DashboardView(props) {
    const {
        stats, repoId, setRepoId,
        folders, foldersLoading, selectedFolder, setSelectedFolder,
        showNewFolder, setShowNewFolder, newFolderName, setNewFolderName, handleCreateFolder,
        jiraInput, setJiraInput, previewTask, previewLoading,
        loading, handleSync, syncResults,
        dashboardErrors // YENİ: Dashboard Hataları
    } = props;

    return (
        <>
          {/* 1. STATS GRID (Aynı Kalır) */}
          <div className="stats-grid">
             <div className="stat-card"><div className="stat-icon bg-blue"><BarChart3 size={24} color="#2563eb"/></div><div className="stat-info"><h3>{stats.total_cases || 0}</h3><p>Toplam Senaryo</p></div></div>
             <div className="stat-card"><div className="stat-icon bg-purple"><ImageIcon size={24} color="#9333ea"/></div><div className="stat-info"><h3>{stats.total_images || 0}</h3><p>İşlenen Görsel</p></div></div>
             <div className="stat-card"><div className="stat-icon bg-green"><Calendar size={24} color="#16a34a"/></div><div className="stat-info"><h3>{stats.today_syncs || 0}</h3><p>Bugünkü İşlem</p></div></div>
          </div>

          <div className="grid-layout">
            {/* 2. SIDEBAR */}
            <div className="sidebar">
              {/* Repo ID */}
              <div className="card"><div className="form-group"><label className="form-label">Depo Kimliği (Repository ID)</label><input type="number" className="form-input" value={repoId} onChange={e=>setRepoId(e.target.value)}/></div></div>

              {/* Hedef Klasör */}
              <div className="card">
                <div className="form-group">
                  <label className="form-label" style={{display:'flex', justifyContent:'space-between'}}>Hedef Klasör <button onClick={()=>setShowNewFolder(!showNewFolder)} className="btn-text"><FolderPlus size={16}/> Yeni</button></label>

                  {/* Yeni Klasör Oluşturma Alanı */}
                  {showNewFolder && (
                    <div className="new-folder-wrapper">
                      <input className="form-input" placeholder="Klasör adı..." value={newFolderName} onChange={e=>setNewFolderName(e.target.value)}/>
                      <button onClick={handleCreateFolder} className="btn btn-success"><PlusCircle size={18}/> Oluştur</button>
                    </div>
                  )}

                  {/* Klasör Seçimi (GÜNCELLENDİ) */}
                  <div className="input-container">
                    <select
                        // Hata Sınıfı Eklendi
                        className={`form-select ${dashboardErrors.selectedFolder ? 'input-error' : ''}`}
                        value={selectedFolder}
                        onChange={e=>setSelectedFolder(e.target.value)}
                        disabled={foldersLoading}
                    >
                      <option value="">{foldersLoading ? 'Yükleniyor...' : 'Bir klasör seçiniz...'}</option>
                      {folders.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                    {/* Hata Mesajı */}
                    {dashboardErrors.selectedFolder && <p className="helper-text text-red" style={{color:'var(--error)'}}>Lütfen hedef klasörü seçiniz.</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. CONTENT AREA */}
            <div className="content-area">
              <div className="card">
                <label className="form-label" style={{fontSize:'1.1rem'}}>Jira Task Listesi</label>

                {/* Preview Card */}
                {previewLoading ? (
                    <div className="preview-card"><Loader2 className="spinner" size={20}/> Önizleme yükleniyor...</div>
                ) : previewTask && (
                  <div className="preview-card">
                    {previewTask.icon && <img src={previewTask.icon} alt="Type" style={{width:20, height:20}} />}
                    <div><strong>{previewTask.key}:</strong> {previewTask.summary}<span className={`status-tag ${previewTask.status === 'Done' ? 'status-done' : ''}`}>{previewTask.status}</span></div>
                  </div>
                )}

                {/* Sync Input & Button (GÜNCELLENDİ) */}
                <div style={{display:'flex', gap:'12px', marginTop:'1rem'}}>
                  <div style={{flex:1}}>
                    <input
                        // Hata Sınıfı Eklendi
                        className={`form-input ${dashboardErrors.jiraInput ? 'input-error' : ''}`}
                        placeholder="Örn: PROJ-123, PROJ-456"
                        value={jiraInput}
                        onChange={e=>setJiraInput(e.target.value)}
                        style={{padding:'1rem', fontSize:'1.1rem', fontWeight:'600'}}
                    />
                    {/* Hata Mesajı */}
                    {dashboardErrors.jiraInput && <p className="helper-text text-red" style={{color:'var(--error)'}}>Lütfen Jira görev anahtarını giriniz.</p>}
                  </div>
                  <button onClick={handleSync} disabled={loading} className="btn btn-primary" style={{width:'220px'}}>
                    {loading ? <><Loader2 className="spinner" size={20}/> İşleniyor...</> : <><Zap size={20}/> Senkronize Et <ArrowRight size={20}/></>}
                  </button>
                </div>
                <p className="helper-text" style={{marginTop:'1rem'}}>* Çoklu giriş için virgül ile ayırabilirsiniz.</p>
              </div>

              {/* Sync Results Card (Aynı Kalır) */}
              {syncResults.length > 0 && (
                <div className="result-card">
                    <div className="result-header">
                        <div className="success-icon-box" style={{background:'#f1f5f9', color:'#1e293b'}}><List size={24} strokeWidth={3}/></div>
                        <div><h3 className="result-title">İşlem Özeti</h3><div className="result-meta"><span className="meta-tag">Toplam: {syncResults.length} Kayıt</span></div></div>
                    </div>
                    <div className="case-list">
                        {syncResults.map((res, idx) => (
                            <div key={idx} className="case-item" style={{borderLeft: res.status==='success' ? '4px solid #22c55e' : '4px solid #ef4444'}}>
                                <div className="case-info">
                                    {res.status === 'success' ? <Check className="text-green" size={20}/> : <XCircle className="text-red" size={20}/>}
                                    <div>
                                        <span className="case-name" style={{display:'block'}}>{res.task}</span>
                                        <span style={{fontSize:'0.8rem', color:'#64748b'}}>{res.status === 'success' ? res.case_name : res.msg}</span>
                                    </div>
                                </div>
                                {res.status === 'success' && <div style={{display:'flex', alignItems:'center', gap:'8px'}}><span className="img-badge"><ImageIcon size={12}/> {res.images} Resim</span></div>}
                            </div>
                        ))}
                    </div>
                </div>
              )}
            </div>
          </div>
        </>
    );
}

export default DashboardView;