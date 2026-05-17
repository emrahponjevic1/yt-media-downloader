import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Download, Shuffle, Usb, Music, Video, Play, Globe, Moon, Sun,
  FolderSearch, RefreshCw, StopCircle, Flame, FileText, Settings2,
  CheckCircle2, Loader2, Search, Clock, AlertCircle, XCircle, X, ChevronDown, User, List, Info, Heart, ExternalLink, Github, Linkedin, Trash2
} from 'lucide-react';
import { translations } from './translations';

function formatCodec(vcodec) {
  if (!vcodec || vcodec === 'none') return '';
  if (vcodec.startsWith('avc')) return 'AVC';
  if (vcodec.startsWith('vp9')) return 'VP9';
  if (vcodec.startsWith('av01')) return 'AV1';
  if (vcodec.startsWith('hev')) return 'HEVC';
  return vcodec.split('.')[0].toUpperCase();
}

function formatSize(bytes) {
  if (!bytes) return '~';
  const mb = bytes / (1024 * 1024);
  return mb > 1000
    ? `${(mb / 1024).toFixed(1)} GB`
    : `${Math.round(mb)} MB`;
}

import LandingPage from './LandingPage';

export default function App() {
  const isWeb = typeof window.electronAPI === 'undefined';

  if (isWeb) {
    return <LandingPage />;
  }

  const [activeTab, setActiveTab] = useState('download');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(null);
  const [denoMissing, setDenoMissing] = useState(false);
  const [denoInstalling, setDenoInstalling] = useState(false);
  const [denoResult, setDenoResult] = useState(null);
  const [language, setLanguage] = useState(() => localStorage.getItem('ytd_lang') || 'bs');
  const [authStatus, setAuthStatus] = useState({ loggedIn: false });
  const [showYtLoginModal, setShowYtLoginModal] = useState(false);
  const [showStartupAuthModal, setShowStartupAuthModal] = useState(false);
  const [loginCode, setLoginCode] = useState(null);

  const refreshAuthStatus = useCallback(async () => {
    if (window.electronAPI && window.electronAPI.checkAuthStatus) {
      const status = await window.electronAPI.checkAuthStatus();
      setAuthStatus(status);
    }
  }, []);

  useEffect(() => {
    refreshAuthStatus();
  }, [refreshAuthStatus]);

  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onOAuthCode) {
      window.electronAPI.onOAuthCode((code) => {
        setLoginCode(code);
      });
    }
    return () => {
      if (window.electronAPI && window.electronAPI.removeOAuthListeners) {
        window.electronAPI.removeOAuthListeners();
      }
    };
  }, []);

  const handleCancelOAuth = async () => {
    if (window.electronAPI && window.electronAPI.cancelOAuth) {
      await window.electronAPI.cancelOAuth();
    }
    setShowYtLoginModal(false);
    setLoginCode(null);
    refreshAuthStatus();
  };

  const handleLogin = async () => {
    if (window.electronAPI && window.electronAPI.loginYouTube) {
      const result = await window.electronAPI.loginYouTube();
      if (result.success) {
        await refreshAuthStatus();
        return true;
      }
    }
    return false;
  };

  const handleLogout = async () => {
    if (window.electronAPI && window.electronAPI.logoutOAuth) {
      await window.electronAPI.logoutOAuth();
      await refreshAuthStatus();
    }
  };

  const t = (section, key) => {
    return translations[language]?.[section]?.[key] || translations['bs']?.[section]?.[key] || key;
  };

  useEffect(() => {
    localStorage.setItem('ytd_lang', language);
  }, [language]);

  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onUpdateYtDlpAvailable) {
      window.electronAPI.onUpdateYtDlpAvailable((data) => {
        setUpdateInfo(data);
      });
    }
  }, []);

  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onDenoMissing) {
      window.electronAPI.onDenoMissing(() => {
        setDenoMissing(true);
      });
    }
  }, []);

  useEffect(() => {
    const checkStartupAuth = async () => {
      if (window.electronAPI) {
        const status = await window.electronAPI.checkAuthStatus();
        if (!status.loggedIn) {
          setTimeout(() => setShowStartupAuthModal(true), 1500);
        }
      }
    };
    checkStartupAuth();
  }, []);

  const handleUpdate = async () => {
    setIsUpdating(true);
    const success = await window.electronAPI.startYtDlpUpdate();
    setIsUpdating(false);
    setUpdateSuccess(success);
    if (success) {
      setTimeout(() => setUpdateInfo(null), 3000);
    }
  };

  const handleDenoInstall = async () => {
    setDenoInstalling(true);
    const success = await window.electronAPI.installDeno();
    setDenoInstalling(false);
    setDenoResult(success);
    if (success) {
      setTimeout(() => setDenoMissing(false), 3000);
    }
  };

  const mainBg = isDarkMode ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-900";
  const headerBg = isDarkMode ? "bg-gray-950 border-b border-gray-800" : "bg-white border-b border-gray-200 shadow-sm";

  return (
    <div className={`flex flex-col h-screen font-sans transition-colors duration-200 ${mainBg}`}>
      {showStartupAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`w-full max-w-md p-8 rounded-2xl border ${isDarkMode ? 'bg-gray-900 border-gray-800 shadow-2xl shadow-black' : 'bg-white border-gray-200 shadow-xl'}`}>
            <div className="flex flex-col items-center text-center">
              <div className="bg-red-500/10 p-4 rounded-full mb-6">
                <User size={40} className="text-red-500" />
              </div>
              <h2 className="text-2xl font-bold mb-3">{t('loginPrompt', 'title')}</h2>
              <p className={`text-sm mb-2 font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{t('loginPrompt', 'description')}</p>
              <p className={`text-xs mb-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{t('loginPrompt', 'info')}</p>

              <div className="flex flex-col w-full gap-3">
                <button
                  onClick={async () => {
                    setShowStartupAuthModal(false);
                    await handleLogin();
                  }}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-600/20 active:scale-95"
                >
                  {t('loginPrompt', 'btnLogin')}
                </button>
                <button
                  onClick={() => setShowStartupAuthModal(false)}
                  className={`w-full py-3 rounded-xl font-medium transition-colors ${isDarkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  {t('loginPrompt', 'btnLater')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <header className={`flex items-center justify-between px-6 py-3 z-10 ${headerBg}`} style={{ WebkitAppRegion: 'drag' }}>
        <div className="flex items-center gap-3">
          <div className="bg-red-500/10 p-2 rounded-lg">
            <Play size={22} className="text-red-500 fill-current" />
          </div>
          <div>
            <h1 className={`text-lg font-bold ${isDarkMode ? 'bg-gradient-to-r from-gray-100 to-gray-300 bg-clip-text text-transparent' : 'text-gray-800'}`}>
              {t('global', 'appName')}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4" style={{ WebkitAppRegion: 'no-drag' }}>
          {/* YouTube Auth Status Bar */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold transition-all min-w-fit whitespace-nowrap ${
            authStatus.loggedIn 
              ? (authStatus.method === 'webview' ? 'bg-purple-500/10 border-purple-500/30 text-purple-500' : (authStatus.method === 'oauth2' ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-blue-500/10 border-blue-500/30 text-blue-500'))
              : 'bg-gray-500/10 border-gray-500/30 text-gray-400'
          }`}>
            {authStatus.loggedIn ? (
              <>
                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${authStatus.method === 'webview' ? 'bg-purple-500' : (authStatus.method === 'oauth2' ? 'bg-green-500' : 'bg-blue-500')}`} />
                <span>
                  {authStatus.method === 'webview' 
                    ? t('common', 'connected_oauth') 
                    : authStatus.method === 'oauth2'
                    ? t('common', 'connected_oauth')
                    : t('common', 'connected_browser').replace('{{name}}', authStatus.browserName)}
                </span>
                <button onClick={handleLogout} className="ml-1 hover:text-red-500 transition-colors p-0.5">
                  <X size={12} />
                </button>
              </>
            ) : (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                <span>{t('common', 'guest')}</span>
                <button onClick={handleLogin} className="ml-1 text-red-500 hover:text-red-400 transition-colors uppercase tracking-tight">
                  {t('common', 'youtube_login')}
                </button>
              </>
            )}
          </div>

          <div className={`flex items-center gap-2 text-sm cursor-pointer transition-colors ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-black'}`}>
            <Globe size={18} />
            <select 
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-transparent outline-none cursor-pointer font-medium"
            >
              <option value="bs" className={isDarkMode ? "bg-gray-900 text-white" : "bg-white"}>{t('global', 'bosnian')}</option>
              <option value="en" className={isDarkMode ? "bg-gray-900 text-white" : "bg-white"}>{t('global', 'english')}</option>
              <option value="de" className={isDarkMode ? "bg-gray-900 text-white" : "bg-white"}>{t('global', 'german')}</option>
            </select>
          </div>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`transition-all p-2 rounded-full ${isDarkMode ? 'text-gray-400 hover:text-yellow-400 hover:bg-gray-800' : 'text-gray-500 hover:text-blue-600 hover:bg-gray-100'}`}
            title={isDarkMode ? t('global', 'tooltipLightMode') : t('global', 'tooltipDarkMode')}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button
            onClick={() => window.electronAPI && window.electronAPI.minimizeApp()}
            className={`transition-all p-2 rounded-lg border flex items-center justify-center ${isDarkMode ? 'text-gray-400 border-gray-800 hover:bg-gray-800 hover:text-gray-200' : 'text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-800'}`}
            title={t('global', 'tooltipMinimize')}
          >
            <span style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '12px', height: '2px', backgroundColor: 'currentColor' }}></div>
            </span>
          </button>

          <button
            onClick={() => window.electronAPI && window.electronAPI.closeApp()}
            className={`transition-all p-2 rounded-lg border flex items-center justify-center ${isDarkMode ? 'text-gray-400 border-gray-800 hover:bg-red-500/20 hover:text-red-500 hover:border-red-500/50' : 'text-gray-500 border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'}`}
            title={t('global', 'tooltipClose')}
          >
            <X size={20} />
          </button>
        </div>
      </header>

      <div className={`flex justify-center px-4 pt-4 border-b gap-2 ${isDarkMode ? 'bg-gray-950 border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
        <TabButton icon={<Music size={18} />} label={t('global', 'tabAudioDownload')} isActive={activeTab === 'audio' || activeTab === 'download'} onClick={() => setActiveTab('audio')} isDarkMode={isDarkMode} />
        <TabButton icon={<Video size={18} />} label={t('global', 'tabVideoDownload')} isActive={activeTab === 'video'} onClick={() => setActiveTab('video')} isDarkMode={isDarkMode} />
        <TabButton icon={<Shuffle size={18} />} label={t('global', 'tabRandomize')} isActive={activeTab === 'randomize'} onClick={() => setActiveTab('randomize')} isDarkMode={isDarkMode} />
        <TabButton icon={<Usb size={18} />} label={t('global', 'tabUsb')} isActive={activeTab === 'usb'} onClick={() => setActiveTab('usb')} isDarkMode={isDarkMode} />
        <TabButton icon={<Info size={18} />} label={t('global', 'tabAbout')} isActive={activeTab === 'about'} onClick={() => setActiveTab('about')} isDarkMode={isDarkMode} />
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full w-full">
          <div className={(activeTab === 'audio' || activeTab === 'download') ? 'block h-full p-6 max-w-6xl mx-auto' : 'hidden'}><DownloadTab isDarkMode={isDarkMode} t={t} onOpenYtLogin={handleLogin} /></div>
          <div className={activeTab === 'video' ? 'block h-full p-6 max-w-6xl mx-auto' : 'hidden'}><VideoTab isDarkMode={isDarkMode} t={t} onOpenYtLogin={handleLogin} /></div>
          <div className={activeTab === 'randomize' ? 'block h-full p-6 max-w-6xl mx-auto' : 'hidden'}><RandomizeTab isDarkMode={isDarkMode} t={t} /></div>
          <div className={activeTab === 'usb' ? 'block h-full' : 'hidden'}><UsbTab isDarkMode={isDarkMode} t={t} /></div>
          <div className={activeTab === 'about' ? 'block h-full' : 'hidden'}><AboutTab isDarkMode={isDarkMode} t={t} /></div>
        </div>
      </div>

      {/* UPDATE MODAL */}
      {updateInfo && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300">
          <div className={`p-6 rounded-2xl shadow-2xl max-w-md w-full border text-center ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="bg-blue-500/10 text-blue-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <RefreshCw size={32} className={isUpdating ? "animate-spin" : ""} />
            </div>
            <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {t('updateModal', 'title')}
            </h3>
            
            {updateSuccess === null ? (
              <>
                <p className={`text-sm mb-6 leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {t('updateModal', 'description')}<br/><br/>
                  {t('updateModal', 'yourVersion')} <span className="font-mono text-xs bg-gray-800 px-1 rounded">{updateInfo.local || "Nepoznato / Oštećeno"}</span><br/>
                  {t('updateModal', 'newVersion')} <span className="font-mono text-xs bg-gray-800 px-1 rounded text-green-400">{updateInfo.remote}</span><br/><br/>
                  {t('updateModal', 'warning')}
                </p>
                <div className="flex gap-3 w-full">
                  <button 
                    onClick={() => setUpdateInfo(null)}
                    disabled={isUpdating}
                    className={`flex-1 py-3 rounded-xl font-bold transition-colors ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                  >
                    {t('updateModal', 'btnLater')}
                  </button>
                  <button 
                    onClick={handleUpdate}
                    disabled={isUpdating}
                    className="flex-1 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white flex justify-center items-center gap-2"
                  >
                    {isUpdating ? <><Loader2 size={18} className="animate-spin" /> {t('updateModal', 'btnUpdating')}</> : t('updateModal', 'btnUpdateNow')}
                  </button>
                </div>
              </>
            ) : updateSuccess === true ? (
              <>
                <p className="text-green-500 font-bold mb-4">{t('updateModal', 'successMsg')}</p>
              </>
            ) : (
              <>
                <p className="text-red-500 font-bold mb-4">{t('updateModal', 'errorMsg')}</p>
                <button onClick={() => setUpdateInfo(null)} className="w-full py-3 rounded-xl font-bold bg-gray-800 text-white">{t('updateModal', 'btnClose')}</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* DENO RUNTIME MODAL */}
      {denoMissing && !updateInfo && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300">
          <div className={`p-6 rounded-2xl shadow-2xl max-w-md w-full border text-center ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="bg-yellow-500/10 text-yellow-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Settings2 size={32} className={denoInstalling ? "animate-spin" : ""} />
            </div>
            <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {t('denoModal', 'title')}
            </h3>
            
            {denoResult === null ? (
              <>
                <p className={`text-sm mb-4 leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {t('denoModal', 'description')}
                </p>
                <p className={`text-xs mb-6 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {t('denoModal', 'info')}
                </p>
                <div className="flex gap-3 w-full">
                  <button 
                    onClick={() => setDenoMissing(false)}
                    disabled={denoInstalling}
                    className={`flex-1 py-3 rounded-xl font-bold transition-colors ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                  >
                    {t('denoModal', 'btnLater')}
                  </button>
                  <button 
                    onClick={handleDenoInstall}
                    disabled={denoInstalling}
                    className="flex-1 py-3 rounded-xl font-bold bg-yellow-600 hover:bg-yellow-500 text-white flex justify-center items-center gap-2"
                  >
                    {denoInstalling ? <><Loader2 size={18} className="animate-spin" /> {t('denoModal', 'btnInstalling')}</> : t('denoModal', 'btnInstallNow')}
                  </button>
                </div>
              </>
            ) : denoResult === true ? (
              <>
                <p className="text-green-500 font-bold mb-4">{t('denoModal', 'successMsg')}</p>
              </>
            ) : (
              <>
                <p className="text-red-500 font-bold mb-4">{t('denoModal', 'errorMsg')}</p>
                <button onClick={() => setDenoMissing(false)} className="w-full py-3 rounded-xl font-bold bg-gray-800 text-white">{t('denoModal', 'btnClose')}</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* YOUTUBE LOGIN MODAL */}
      {showYtLoginModal && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300 p-4">
          <div className={`p-6 rounded-2xl shadow-2xl max-w-md w-full border text-center ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="bg-red-500/10 text-red-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <User size={32} />
            </div>
            <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {t('common', 'youtube_login')}
            </h3>

            <div className="space-y-4">
              {!loginCode ? (
                <div className="flex flex-col items-center py-6">
                  <Loader2 size={32} className="text-red-500 animate-spin mb-4" />
                  <p className={`text-sm italic ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {t('common', 'waiting_for_code')}
                  </p>
                </div>
              ) : (
                <>
                  <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {t('common', 'visit_google_device')}
                  </p>
                  <div className={`p-6 rounded-xl border font-mono font-bold text-3xl tracking-widest ${isDarkMode ? 'bg-black/40 border-gray-700 text-white' : 'bg-gray-100 border-gray-200 text-gray-900'}`}>
                    {loginCode}
                  </div>
                  <p className={`text-xs italic ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {t('common', 'login_for_high_res')}
                  </p>
                </>
              )}
            </div>

            <div className="mt-8">
              <button 
                onClick={handleCancelOAuth}
                className={`w-full py-3 rounded-xl font-bold transition-colors ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
              >
                {t('common', 'cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ icon, label, isActive, onClick, isDarkMode }) {
  const activeStyle = isDarkMode
    ? 'bg-gray-900 text-red-400 border-t-2 border-red-500 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]'
    : 'bg-gray-50 text-red-600 border-t-2 border-red-500 shadow-sm';
  const inactiveStyle = isDarkMode
    ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
    : 'text-gray-500 hover:text-gray-700 hover:bg-white';

  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-medium transition-all ${isActive ? activeStyle : inactiveStyle}`}>
      {icon} {label}
    </button>
  );
}

// 1. DOWNLOAD TAB
function DownloadTab({ isDarkMode, t, onOpenYtLogin }) {
  const [url, setUrl] = useState('');
  const [txtUrls, setTxtUrls] = useState([]);
  const [savePath, setSavePath] = useState('');
  const [audioExt, setAudioExt] = useState('MP3');
  const [audioBitrate, setAudioBitrate] = useState('320 kbps');
  const [normalizeVolume, setNormalizeVolume] = useState(false);
  const [queue, setQueue] = useState([]);
  const [wasDownloading, setWasDownloading] = useState(false);
  const [isCompletedCollapsed, setIsCompletedCollapsed] = useState(false);
  const [isErrorCollapsed, setIsErrorCollapsed] = useState(true);
  const stopRequested = useRef(false);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onDownloadProgress((data) => {
        setQueue(prevQueue => prevQueue.map(item => {
          if (item.id === data.id) {
            return { ...item, progress: data.progress || item.progress, status: data.status, errorMsg: data.errorMsg || item.errorMsg };
          }
          return item;
        }));
      });
      return () => {
        window.electronAPI.removeDownloadProgressListener();
      };
    }
  }, []);

  const handleStop = async () => {
    stopRequested.current = true;
    if (window.electronAPI) {
      await window.electronAPI.stopDownload();
      setWasDownloading(false);
      setQueue([]);
    }
  };

  const handleSelectFolder = async () => {
    if (window.electronAPI) {
      const folder = await window.electronAPI.selectFolder();
      if (folder) setSavePath(folder);
    }
  };

  const startDownload = async () => {
    stopRequested.current = false;
    if (!url.trim() && txtUrls.length === 0) return;

    let rawUrls = [...txtUrls];
    if (url.trim()) rawUrls.push(url.trim());

    // Ukloni duple linkove iz samog unosa
    const urlsToProcess = [...new Set(rawUrls)];

    setUrl(''); // clear input immediately
    setTxtUrls([]); // clear selected txt file

    const isQueueIdle = queue.every(item => item.status === 'completed' || item.status === 'error');
    const fetchId = Date.now();

    setQueue(prev => [...prev, { id: fetchId, name: `${t('download', 'alertLoadingLinks').replace('{count}', urlsToProcess.length)}`, status: 'fetching', progress: 0 }]);

    try {
      let allItems = [];
      for (const currentUrl of urlsToProcess) {
        if (stopRequested.current) return;
        try {
          const items = await window.electronAPI.fetchInfo({ url: currentUrl });
          if (stopRequested.current) return;
          // Filtriraj duplikate iz playliste koji su mozda vec ubaceni
          const newUniqueItems = items.filter(item => !allItems.some(existing => existing.url === item.url));
          allItems = [...allItems, ...newUniqueItems];
        } catch (e) {
          console.error("Failed to fetch: " + currentUrl);
          // FALLBACK: Guramo link u red kako ga aplikacija ne bi ignorisala
          allItems = [...allItems, { title: currentUrl, url: currentUrl, failedAtFetch: true }];
        }
      }

      setQueue(prev => prev.filter(item => item.id !== fetchId));
      if (allItems.length === 0 || stopRequested.current) return;

      const formatExt = audioExt;
      const quality = audioBitrate;

      const newItems = allItems.map((item, index) => ({
        id: fetchId + index + 1,
        name: item.title || item.url,
        url: item.url,
        status: 'pending',
        progress: 0,
        formatType: 'audio',
        formatExt,
        quality,
        normalizeVolume
      }));

      setQueue(prev => [...prev, ...newItems]);
    } catch (e) {
      setQueue(prev => prev.map(item => item.id === fetchId ? { ...item, name: t('download', 'alertLoadingError'), status: 'error' } : item));
    }
  };

  const handleImportTxt = async () => {
    if (!window.electronAPI) return;
    const urls = await window.electronAPI.openTxtFile();
    if (urls && urls.length > 0) {
      setTxtUrls(urls);
    }
  };

  const activeDownloads = queue.filter(item => item.status === 'fetching' || item.status === 'downloading' || item.status === 'converting').length;
  const hasActiveDownloads = queue.some(item => ['pending', 'fetching', 'downloading', 'converting'].includes(item.status));
  
  useEffect(() => {
    if (hasActiveDownloads) {
      setWasDownloading(true);
    } else if (wasDownloading && !hasActiveDownloads) {
      setWasDownloading(false);
      // Samo otvori folder ako nema kritičnih grešaka (poput logina) koje zahtijevaju akciju korisnika
      const hasAuthErrors = queue.some(item => item.errorMsg === 'AUTH_REQUIRED');
      if (window.electronAPI && !hasAuthErrors) {
        window.electronAPI.openFolder(savePath);
      }
    }
  }, [hasActiveDownloads, wasDownloading, savePath]);

  useEffect(() => {
    if (stopRequested.current) return;
    if (activeDownloads < 4 && window.electronAPI) {
      const nextItem = queue.find(item => item.status === 'pending');
      if (nextItem) {
        setQueue(prev => prev.map(q => q.id === nextItem.id ? { ...q, status: 'fetching' } : q));
        window.electronAPI.startDownload({
          id: nextItem.id,
          url: nextItem.url,
          formatType: nextItem.formatType,
          formatExt: nextItem.formatExt,
          savePath,
          normalizeVolume: nextItem.normalizeVolume,
          quality: nextItem.quality,
          title: nextItem.name
        }).catch(() => { });
      }
    }
  }, [queue, activeDownloads, savePath]);

  const clearCompleted = () => {
    setQueue(prev => prev.filter(item => item.status !== 'completed'));
  };

  const clearErrors = () => {
    setQueue(prev => prev.filter(item => item.status !== 'error'));
  };

  const cardStyle = isDarkMode ? "bg-gray-800/40 border-gray-700/50" : "bg-white border-gray-200 shadow-sm";
  const inputStyle = isDarkMode ? "bg-gray-900 border-gray-700 text-gray-100" : "bg-gray-50 border-gray-300 text-gray-900";

  const audioFormats = ['MP3', 'WAV', 'M4A', 'FLAC'];
  const audioBitrates = ['320 kbps', '256 kbps', '192 kbps', '128 kbps', '64 kbps'];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'fetching': return <Search size={14} className="animate-pulse" />;
      case 'downloading': return <Download size={14} className="animate-bounce" />;
      case 'converting': return <RefreshCw size={14} className="animate-spin" />;
      case 'completed': return <CheckCircle2 size={14} />;
      case 'error': return <AlertCircle size={14} />;
      default: return <Clock size={14} />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'fetching': return t('download', 'statusFetching');
      case 'downloading': return t('download', 'statusDownloading');
      case 'converting': return t('download', 'statusConverting');
      case 'completed': return t('download', 'statusCompleted');
      case 'error': return t('download', 'statusError');
      default: return t('download', 'statusPending');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'fetching': return "text-amber-400";
      case 'downloading': return "text-blue-400";
      case 'converting': return "text-purple-400";
      case 'completed': return "text-green-400";
      case 'error': return "text-red-500";
      default: return "text-gray-500";
    }
  };

  const totalProgress = queue.length > 0 
    ? queue.reduce((acc, item) => acc + (item.status === 'error' || item.status === 'completed' ? 100 : (item.progress || 0)), 0) / queue.length 
    : 0;

  const activeItems = queue.filter(item => item.status !== 'completed' && item.status !== 'error');
  const completedItems = queue.filter(item => item.status === 'completed');
  const errorItems = queue.filter(item => item.status === 'error');

  const renderRow = (item, idx) => (
    <tr key={item.id} className={`transition-colors ${isDarkMode ? 'hover:bg-gray-800/20' : 'hover:bg-gray-50'}`}>
      <td className="px-4 py-3 text-center text-gray-500">{idx + 1}</td>
      <td className={`px-4 py-3 font-medium truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`} title={item.errorMsg ? `${item.name}\n\nGreška: ${item.errorMsg}` : item.name}>{item.name}</td>
      <td className={`px-4 py-3 font-medium`}>
        <div className={`flex items-center gap-2 ${getStatusColor(item.status)}`} title={item.errorMsg}>
          {getStatusIcon(item.status)}
          {getStatusText(item.status)}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={`flex-1 rounded-full h-1.5 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${item.status === 'completed' ? 'bg-green-500' :
                  item.status === 'error' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' :
                    (item.status === 'converting' ? 'bg-purple-500' : 'bg-blue-500')
                }`}
              style={{ width: `${item.status === 'error' ? 100 : item.progress}%` }}
            ></div>
          </div>
          <span className={`text-[10px] w-8 text-right font-mono ${item.status === 'error' ? 'text-red-500' : 'text-gray-500'}`}>{item.status === 'error' ? 100 : item.progress}%</span>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="h-full flex flex-col gap-4 animate-in fade-in duration-300">
      <div className={`border rounded-xl p-4 flex gap-4 ${cardStyle}`}>
        <div className="flex-1">
          <label className={`text-xs uppercase tracking-wider font-semibold mb-1 block ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('download', 'inputLabel')}</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t('download', 'inputPlaceholder')}
            className={`w-full border rounded-lg px-4 py-3 outline-none transition-all focus:ring-1 focus:ring-red-500 ${inputStyle}`}
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={(e) => {
              if (txtUrls.length > 0) {
                e.preventDefault();
                setTxtUrls([]);
              } else {
                handleImportTxt();
              }
            }}
            className={`group min-w-[160px] h-[46px] px-4 rounded-lg flex items-center justify-center font-bold transition-all border ${txtUrls.length > 0
                ? 'bg-green-600 border-green-500 text-white shadow-lg shadow-green-900/20 hover:bg-red-500 hover:border-red-400 hover:shadow-red-900/20'
                : (isDarkMode ? 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-700')
              }`}
          >
            {txtUrls.length > 0 ? (
              <>
                <div className="flex items-center gap-2 group-hover:hidden">
                  <CheckCircle2 size={20} />
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-xs tracking-wider">{t('download', 'fileSelected')}</span>
                    <span className="text-[10px] font-medium opacity-80">{txtUrls.length} {t('download', 'linksFound')}</span>
                  </div>
                </div>
                <div className="hidden items-center gap-2 group-hover:flex">
                  <XCircle size={20} />
                  <span className="text-xs tracking-wider uppercase">{t('download', 'removeFileTooltip')}</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <FileText size={18} />
                <span>{t('download', 'importTxtBtn')}</span>
              </div>
            )}
          </button>
        </div>
      </div>

      <div className={`border rounded-xl p-4 flex flex-wrap md:flex-nowrap items-center justify-between gap-6 ${cardStyle}`}>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex gap-3">
            <select
              value={audioExt}
              onChange={(e) => setAudioExt(e.target.value)}
              className={`border rounded-lg px-3 py-2 text-sm outline-none ${inputStyle}`}
            >
              {audioFormats.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <select
              value={audioBitrate}
              onChange={(e) => setAudioBitrate(e.target.value)}
              className={`border rounded-lg px-3 py-2 text-sm outline-none ${inputStyle}`}
            >
              {audioBitrates.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>

          <label className={`flex items-center gap-2 cursor-pointer text-sm transition-all ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <input
              type="checkbox"
              checked={normalizeVolume}
              onChange={(e) => setNormalizeVolume(e.target.checked)}
              className="rounded text-red-500 bg-gray-900 border-gray-600 focus:ring-0"
            />
            {t('download', 'normalizeVolume')}
          </label>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className={`text-[10px] uppercase tracking-wider font-bold mb-0.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{t('download', 'saveFolderLabel')}</span>
            <span className={`text-sm font-medium truncate max-w-[180px] ${!savePath ? 'text-red-500' : (isDarkMode ? 'text-gray-300' : 'text-gray-600')}`} title={savePath || t('download', 'saveFolderPlaceholder')}>{savePath || t('download', 'saveFolderPlaceholder')}</span>
          </div>
          <button onClick={handleSelectFolder} className={`border p-2.5 rounded-lg transition-colors shadow-sm ${!savePath ? 'animate-pulse border-red-500 bg-red-500/10 text-red-500' : (isDarkMode ? 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400')}`}>
            <FolderSearch size={18} />
          </button>
        </div>
      </div>

      <div className={`flex-1 border rounded-xl overflow-hidden flex flex-col ${isDarkMode ? 'bg-gray-900 border-gray-700/50' : 'bg-white border-gray-200'}`}>
        <div className={`px-4 py-2 border-b flex justify-between items-center ${isDarkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('download', 'queueTitle')}</h3>
          <div className="flex items-center gap-3">
            {errorItems.length > 0 && (
              <button
                onClick={clearErrors}
                className={`text-[10px] uppercase font-bold px-3 py-1 rounded transition-colors ${isDarkMode ? 'bg-gray-800 border border-gray-700 text-gray-400 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30' : 'bg-gray-100 border border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200'}`}
              >
                {t('download', 'clearErrorsBtn')}
              </button>
            )}
            {completedItems.length > 0 && (
              <button
                onClick={clearCompleted}
                className={`text-[10px] uppercase font-bold px-3 py-1 rounded transition-colors ${isDarkMode ? 'bg-gray-800 border border-gray-700 text-gray-400 hover:bg-green-500/20 hover:text-green-400 hover:border-green-500/30' : 'bg-gray-100 border border-gray-200 text-gray-600 hover:bg-green-50 hover:text-green-600 hover:border-green-200'}`}
              >
                {t('download', 'clearCompletedBtn')}
              </button>
            )}
            <span className="text-[10px] text-gray-500 font-mono">yt-dlp engine</span>
          </div>
        </div>

        <div className={`${isDarkMode ? 'bg-gray-800/30' : 'bg-gray-100/80'} backdrop-blur-sm border-b ${isDarkMode ? 'border-gray-800/50' : 'border-gray-200'}`} style={{ paddingRight: '8px' }}>
          <table className="w-full text-sm text-left" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '4rem' }} />
              <col />
              <col style={{ width: '10rem' }} />
              <col style={{ width: '12rem' }} />
            </colgroup>
            <thead className={`text-xs uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <tr>
                <th className="px-4 py-3 text-center">{t('download', 'tableNum')}</th>
                <th className="px-4 py-3">{t('download', 'tableName')}</th>
                <th className="px-4 py-3">{t('download', 'tableStatus')}</th>
                <th className="px-4 py-3">{t('download', 'tableProgress')}</th>
              </tr>
            </thead>
          </table>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm text-left" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '4rem' }} />
              <col />
              <col style={{ width: '10rem' }} />
              <col style={{ width: '12rem' }} />
            </colgroup>
            <tbody className="divide-y divide-gray-800/50">
              {activeItems.map((item, idx) => renderRow(item, idx))}

              {completedItems.length > 0 && (
                <>
                  <tr className={`${isDarkMode ? 'bg-gray-800/40 hover:bg-gray-800/60' : 'bg-gray-100 hover:bg-gray-200'} cursor-pointer transition-colors`} onClick={() => setIsCompletedCollapsed(!isCompletedCollapsed)}>
                    <td colSpan="4" className="px-4 py-2">
                      <div className="flex items-center gap-3 text-xs font-semibold text-green-500 uppercase tracking-wider">
                        <span>{t('download', 'sectionCompleted')} ({completedItems.length})</span>
                        <div className={`flex-1 h-px ${isDarkMode ? 'bg-green-900/50' : 'bg-green-200'}`}></div>
                        <ChevronDown size={14} className="transform transition-transform duration-200" style={{ transform: isCompletedCollapsed ? 'rotate(-90deg)' : 'rotate(0)' }} />
                      </div>
                    </td>
                  </tr>
                  {!isCompletedCollapsed && completedItems.map((item, idx) => renderRow(item, activeItems.length + idx))}
                </>
              )}

              {errorItems.length > 0 && (
                <>
                  <tr className={`${isDarkMode ? 'bg-gray-800/40 hover:bg-gray-800/60' : 'bg-gray-100 hover:bg-gray-200'} cursor-pointer transition-colors`} onClick={() => setIsErrorCollapsed(!isErrorCollapsed)}>
                    <td colSpan="4" className="px-4 py-2">
                      <div className="flex items-center gap-3 text-xs font-semibold text-red-500 uppercase tracking-wider">
                        <span>{t('download', 'sectionError')} ({errorItems.length})</span>
                        <div className={`flex-1 h-px ${isDarkMode ? 'bg-red-900/50' : 'bg-red-200'}`}></div>
                        <ChevronDown size={14} className="transform transition-transform duration-200" style={{ transform: isErrorCollapsed ? 'rotate(-90deg)' : 'rotate(0)' }} />
                      </div>
                    </td>
                  </tr>
                  {!isErrorCollapsed && errorItems.map((item, idx) => renderRow(item, activeItems.length + completedItems.length + idx))}
                </>
              )}

              {queue.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center py-10 text-gray-500">{t('download', 'noDownloadsMsg')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`border rounded-xl p-4 flex items-center justify-between gap-6 ${cardStyle}`}>
        <div className="flex-1">
          <div className={`flex justify-between text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <span>{t('download', 'totalProgressLabel')}</span>
            <span className="font-mono">{Math.round(totalProgress)}%</span>
          </div>
          <div className={`w-full rounded-full h-3 overflow-hidden ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-200 border-gray-300'}`}>
            <div className="bg-red-500 h-full rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)] transition-all duration-500" style={{ width: `${totalProgress}%` }}></div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleStop}
            disabled={activeDownloads === 0}
            className={`px-6 py-3 rounded-lg flex items-center gap-2 border transition-all ${activeDownloads === 0
                ? 'opacity-50 cursor-not-allowed bg-transparent border-gray-600 text-gray-500'
                : (isDarkMode ? 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-gray-200 active:scale-95' : 'bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-700 active:scale-95')
              }`}
          >
            <StopCircle size={20} /> {t('download', 'btnStop')}
          </button>
          <button
            onClick={startDownload}
            disabled={(!url.trim() && txtUrls.length === 0) || !savePath}
            className={`font-bold px-8 py-3 rounded-lg flex items-center gap-2 transition-all ${(!url.trim() && txtUrls.length === 0) || !savePath
                ? 'bg-red-900/50 text-white/50 cursor-not-allowed opacity-60'
                : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20 active:scale-95'
              }`}
          >
            <Download size={20} /> {t('download', 'btnDownload')}
          </button>
        </div>

      </div>
        {queue.some(item => item.errorMsg === 'AUTH_REQUIRED') && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300">
            <div className={`p-6 rounded-2xl shadow-2xl max-w-md w-full border text-center ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="bg-red-500/10 text-red-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                 <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                 </svg>
              </div>
              <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Potrebna je prijava
              </h3>
              <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Ovaj video zahtijeva potvrdu starosti ili članstvo. Prijavite se na svoj YouTube račun kako biste nastavili preuzimanje.
              </p>
              <div className="flex gap-3 justify-center">
                <button 
                  onClick={clearErrors} 
                  className={`px-4 py-2 rounded-lg font-bold transition-all ${isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  Odustani
                </button>
                <button
                  onClick={async () => {
                    const success = await onOpenYtLogin();
                    if (success) {
                      clearErrors();
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold bg-red-600 hover:bg-red-500 text-white transition-all active:scale-95 shadow-lg shadow-red-500/30"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  Prijavi se na YouTube
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

// 2. VIDEO DOWNLOAD TAB
function VideoTab({ isDarkMode, t, onOpenYtLogin }) {
  const [url, setUrl] = useState('');
  const [videoSavePath, setVideoSavePath] = useState(() => localStorage.getItem('ytd_video_path') || '');
  const [fetchedMedia, setFetchedMedia] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [isPlaylistError, setIsPlaylistError] = useState(false);
  const [selectedFormatId, setSelectedFormatId] = useState(null);
  const [downloadStatus, setDownloadStatus] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [videoErrorMsg, setVideoErrorMsg] = useState('');

  useEffect(() => {
    localStorage.setItem('ytd_video_path', videoSavePath);
  }, [videoSavePath]);

  useEffect(() => {
    if (!url || url.length < 10) {
      setFetchedMedia(null);
      setFetchError(null);
      setIsPlaylistError(false);
      setSelectedFormatId(null);
      return;
    }
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
    if (!isYouTube) return;

    const timer = setTimeout(async () => {
      setIsFetching(true);
      setFetchError(null);
      setIsPlaylistError(false);
      setFetchedMedia(null);
      setSelectedFormatId(null);
      try {
        const result = await window.electronAPI.fetchVideoInfo({ url });
        setFetchedMedia(result);
      } catch (e) {
        if (e.message && e.message.includes('Playlist')) {
          setIsPlaylistError(true);
        } else {
          setFetchError(e.message);
        }
      } finally {
        setIsFetching(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [url]);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onVideoProgress((data) => {
        if (data.progress !== undefined) setDownloadProgress(data.progress);
        if (data.status) setDownloadStatus(data.status);
        if (data.errorMsg) setVideoErrorMsg(data.errorMsg);
      });
      return () => window.electronAPI.removeVideoProgressListener();
    }
  }, []);

  const handleDownload = async (format) => {
    if (!videoSavePath) return;
    const hasAudio = format.acodec !== 'none' && format.acodec !== null;
    setSelectedFormatId(format.format_id);
    setDownloadStatus('downloading');
    setDownloadProgress(0);
    try {
      await window.electronAPI.startVideoDownload({
        id: Date.now(),
        url: fetchedMedia.url,
        formatId: format.format_id,
        hasAudio,
        savePath: videoSavePath,
        title: fetchedMedia.title
      });
    } catch (e) {
      setVideoErrorMsg(prev => prev || e.message || 'Nepoznata greška');
      setDownloadStatus('error');
    }
  };

  const handleSelectFolder = async () => {
    if (window.electronAPI) {
      const folder = await window.electronAPI.selectFolder();
      if (folder) setVideoSavePath(folder);
    }
  };

  const resetForm = () => {
    setUrl('');
    setFetchedMedia(null);
    setDownloadStatus(null);
    setDownloadProgress(0);
    setSelectedFormatId(null);
    setVideoErrorMsg('');
  };

  const cardStyle = isDarkMode ? "bg-gray-800/40 border-gray-700/50" : "bg-white border-gray-200 shadow-sm";
  const inputStyle = isDarkMode ? "bg-gray-900 border-gray-700 text-gray-100" : "bg-gray-50 border-gray-300 text-gray-900";

  return (
    <div className="flex flex-col h-full gap-6 min-h-0">
      {/* 1. Folder Selector i Status (Sada na vrhu) */}
      <div className={`border rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 ${cardStyle}`}>
        <div className="flex-1 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {!downloadStatus && !isFetching && (
                <div className="flex items-center gap-2 text-gray-500 font-bold text-sm">
                  <Clock size={16} />
                  <span>Spreman za preuzimanje</span>
                </div>
              )}
              {isFetching && (
                <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                  <Loader2 size={16} className="animate-spin" />
                  <span>Učitavanje podataka...</span>
                </div>
              )}
              {downloadStatus === 'downloading' && (
                <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                  <Download size={16} className="animate-bounce" />
                  <span>Preuzimanje...</span>
                </div>
              )}
              {downloadStatus === 'converting' && (
                <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Konvertovanje u MP4...</span>
                </div>
              )}
              {downloadStatus === 'completed' && (
                <div className="flex items-center gap-2 text-green-500 font-bold text-sm">
                  <CheckCircle2 size={16} />
                  <span>Završeno!</span>
                </div>
              )}
              {downloadStatus === 'error' && (
                <div className="flex items-center gap-2 text-red-500 font-bold text-sm">
                  <AlertCircle size={16} />
                  {videoErrorMsg === 'AUTH_REQUIRED' ? (
                    <span>Za preuzimanje je potrebna prijava</span>
                  ) : (
                    <span title={videoErrorMsg}>
                      Greška: {videoErrorMsg ? (videoErrorMsg.length > 40 ? videoErrorMsg.substring(0, 40) + '...' : videoErrorMsg) : 'Neuspješno preuzimanje'}
                    </span>
                  )}
                </div>
              )}
            </div>
            <span className="font-mono text-xs font-bold text-gray-500">
              {Math.round(downloadProgress)}%
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`flex-1 rounded-full h-1.5 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
              <div 
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  downloadStatus === 'completed' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 
                  downloadStatus === 'error' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 
                  isFetching ? 'bg-blue-500 animate-pulse' :
                  (downloadStatus === 'converting' ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]' : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]')
                }`}
                style={{ width: `${downloadStatus === 'error' ? 100 : downloadProgress}%` }}
              />
            </div>
            {(downloadStatus === 'downloading' || downloadStatus === 'converting') && (
              <button 
                onClick={async () => {
                  await window.electronAPI.stopVideoDownload();
                  setDownloadStatus(null);
                  setDownloadProgress(0);
                  setSelectedFormatId(null);
                  setVideoErrorMsg('');
                }}
                className="whitespace-nowrap px-3 py-1 rounded bg-red-600/10 border border-red-600/20 hover:bg-red-600/20 text-red-500 text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95"
              >
                Zaustavi
              </button>
            )}
            {downloadStatus === 'completed' && (
              <button 
                onClick={() => window.electronAPI.openFolder(videoSavePath)}
                className="whitespace-nowrap px-3 py-1 rounded bg-green-600/10 border border-green-600/20 hover:bg-green-600/20 text-green-500 text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95"
              >
                Otvori folder
              </button>
            )}
            {downloadStatus === 'error' && videoErrorMsg === 'AUTH_REQUIRED' && (
              <div className="flex items-center gap-2 text-red-500 font-bold text-[10px] uppercase tracking-wider">
                {/* Poruka je već iznad u progress baru, ovdje možemo ostaviti prazno ili mali indikator */}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className={`text-[10px] uppercase tracking-wider font-bold mb-0.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{t('video', 'saveFolderLabel')}</span>
            <span className={`text-sm font-medium truncate max-w-[180px] ${!videoSavePath ? 'text-red-500' : (isDarkMode ? 'text-gray-300' : 'text-gray-600')}`} title={videoSavePath || t('video', 'saveFolderPlaceholder')}>{videoSavePath || t('video', 'saveFolderPlaceholder')}</span>
          </div>
          <button onClick={handleSelectFolder} className={`border p-2.5 rounded-lg transition-colors shadow-sm ${!videoSavePath ? 'animate-pulse border-red-500 bg-red-500/10 text-red-500' : (isDarkMode ? 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400')}`}>
            <FolderSearch size={18} />
          </button>
        </div>
      </div>

      {/* 2. URL Input Sekcija */}
      <div className={`border rounded-xl p-6 flex flex-col min-h-0 ${cardStyle}`}>
        <div className="flex flex-col gap-2">
          <label className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {t('download', 'inputLabel')}
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              disabled={!videoSavePath}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={!videoSavePath ? "Prvo odaberite folder za čuvanje..." : t('video', 'inputPlaceholder')}
              className={`flex-1 border rounded-lg px-4 py-3 outline-none transition-all focus:ring-1 focus:ring-red-500 ${inputStyle} ${!videoSavePath ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            <button
              onClick={resetForm}
              disabled={!url && !fetchedMedia && !downloadStatus}
              className={`px-4 py-2 rounded-lg border font-bold text-xs uppercase tracking-wider transition-all active:scale-95 whitespace-nowrap shadow-sm ${
                (!url && !fetchedMedia && !downloadStatus)
                  ? 'opacity-30 grayscale cursor-not-allowed border-gray-600 text-gray-500' 
                  : (isDarkMode ? 'bg-red-500/10 border-red-500 text-red-500 hover:bg-red-500/20' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100')
              }`}
            >
              Novi prenos
            </button>
          </div>
        </div>

        {isFetching && (
          <div className="flex items-center gap-3 mt-6 text-blue-400 animate-pulse">
            <Loader2 className="animate-spin" size={20} />
            <span className="text-sm font-medium">{t('video', 'fetchingMsg')}</span>
          </div>
        )}

        {isPlaylistError && (
          <div className="mt-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-amber-500">
            <AlertCircle size={20} />
            <span className="text-sm font-medium">{t('video', 'errorPlaylist')}</span>
          </div>
        )}

        {fetchError && (
          <div className="mt-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-500">
            <XCircle size={20} />
            <span className="text-sm font-medium">{t('video', 'errorGeneric')}</span>
          </div>
        )}

        {fetchedMedia && (
          <div className="mt-8 space-y-6 flex-1 min-h-0 flex flex-col animate-in fade-in slide-in-from-top-2 duration-300">
            <div className={`flex flex-col md:flex-row gap-6 p-4 rounded-xl border ${isDarkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <img 
                src={fetchedMedia.thumbnail} 
                alt="thumbnail" 
                referrerPolicy="no-referrer"
                onError={(e) => e.target.style.display = 'none'}
                className="w-full md:w-[160px] aspect-video object-cover rounded-lg shadow-lg"
              />
              <div className="flex flex-col justify-center gap-1 overflow-hidden flex-1">
                <div className="flex items-center justify-between w-full gap-4">
                  <h3 className={`text-lg font-bold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`} title={fetchedMedia.title}>
                    {fetchedMedia.title}
                  </h3>
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-mono font-bold whitespace-nowrap ${isDarkMode ? 'bg-gray-800 text-gray-400 border border-gray-700' : 'bg-gray-200 text-gray-600 border border-gray-300'}`}>
                    <Clock size={12} />
                    <span>{fetchedMedia.duration_string}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between px-2 mb-2">
                <h4 className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {t('video', 'formatResolution')}
                </h4>
                <div className="flex items-center gap-6">
                  <span className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{t('video', 'formatSize')}</span>
                  <div className="w-[100px]"></div>
                </div>
              </div>
              
              <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar mt-2">
                {fetchedMedia.formats.map((f) => {
                  const formatCodec = (vcodec) => {
                    if (!vcodec || vcodec === 'none') return '';
                    if (vcodec.startsWith('avc')) return 'avc1';
                    if (vcodec.startsWith('vp9') || vcodec.startsWith('vp09')) return 'vp9';
                    if (vcodec.startsWith('av01') || vcodec.startsWith('av1')) return 'av01';
                    if (vcodec.startsWith('hvc') || vcodec.startsWith('hev')) return 'hevc';
                    return vcodec.split('.')[0];
                  };

                  const codec = formatCodec(f.vcodec);
                  const isSelected = selectedFormatId === f.format_id;
                  const isBusy = downloadStatus === 'downloading' || downloadStatus === 'converting';

                  return (
                    <div 
                      key={f.format_id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        isSelected 
                          ? 'border-red-500 bg-red-500/5 shadow-[0_0_15px_rgba(239,68,68,0.1)]' 
                          : (isDarkMode ? 'bg-gray-900/30 border-gray-800 hover:bg-gray-800/40' : 'bg-gray-50 border-gray-200 hover:bg-gray-100')
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`px-2.5 py-1.5 rounded-lg flex flex-col items-center justify-center min-w-[60px] ${isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-gray-200 text-gray-800'}`}>
                          <span className="text-xs font-black leading-none">{f.height}P</span>
                        </div>
                        <div className="flex flex-col">
                          <span className={`text-sm font-bold ${isSelected ? 'text-red-500' : (isDarkMode ? 'text-gray-200' : 'text-gray-800')}`}>
                            {f.height >= 2160 ? '4K Ultra HD' : f.height >= 1440 ? '2K Quad HD' : f.height >= 1080 ? 'Full HD' : 'HD Ready'}
                          </span>
                          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                            {f.ext} <span className="mx-1 text-gray-700">|</span> {codec}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="flex flex-col items-end">
                          <span className={`text-xs font-mono font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {formatSize(f.filesize)}
                          </span>
                        </div>
                        <button
                          disabled={isBusy}
                          onClick={() => handleDownload(f)}
                          className={`w-[110px] py-2 rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${
                            isSelected && isBusy
                              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                              : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20'
                          }`}
                        >
                          {isSelected && isBusy ? <Loader2 size={14} className="animate-spin" /> : (
                            <>
                              <Download size={14} />
                              {t('video', 'btnDownload')}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
        {downloadStatus === 'error' && videoErrorMsg === 'AUTH_REQUIRED' && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300">
            <div className={`p-6 rounded-2xl shadow-2xl max-w-md w-full border text-center ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="bg-red-500/10 text-red-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                 <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                 </svg>
              </div>
              <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Potrebna je prijava
              </h3>
              <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Ovaj video zahtijeva potvrdu starosti ili članstvo. Prijavite se na svoj YouTube račun kako biste nastavili preuzimanje.
              </p>
              <div className="flex gap-3 justify-center">
                <button 
                  onClick={() => {
                    setDownloadStatus(null);
                    setVideoErrorMsg('');
                    setSelectedFormatId(null);
                  }} 
                  className={`px-4 py-2 rounded-lg font-bold transition-all ${isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  Odustani
                </button>
                <button
                  onClick={async () => {
                    const success = await onOpenYtLogin();
                    if (success) {
                      setDownloadStatus(null);
                      setVideoErrorMsg('');
                      setSelectedFormatId(null);
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold bg-red-600 hover:bg-red-500 text-white transition-all active:scale-95 shadow-lg shadow-red-500/30"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  Prijavi se na YouTube
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

// 3. RANDOMIZACIJA TAB
function RandomizeTab({ isDarkMode, t }) {
  const [folderPath, setFolderPath] = useState('');
  const [originalFiles, setOriginalFiles] = useState([]);
  const [method, setMethod] = useState('Nasumično');
  const [shuffleTrigger, setShuffleTrigger] = useState(0);
  const [previewFiles, setPreviewFiles] = useState([]);
  const [animatingId, setAnimatingId] = useState(null);

  const methods = [
    { id: 'Abecedno', icon: <List size={18} />, label: t('randomize', 'methodAlphabetical') },
    { id: 'Po izvođaču', icon: <User size={18} />, label: t('randomize', 'methodArtist') },
    { id: 'Nasumično', icon: <Shuffle size={18} />, label: t('randomize', 'methodRandom') }
  ];

  const cardStyle = isDarkMode ? "bg-gray-800/40 border-gray-700/50" : "bg-white border-gray-200 shadow-sm";
  const inputStyle = isDarkMode ? "bg-gray-900 border-gray-700" : "bg-gray-50 border-gray-300";

  const cleanFilename = (name) => {
    // Ukloni brojeve i crtice sa pocetka (npr. "001 - ", "12 - ", "04. ")
    return name.replace(/^(\d+[\s.-]+)+/, '').trim();
  };

  const handleSelectFolder = async () => {
    if (!window.electronAPI) return;
    const path = await window.electronAPI.selectFolder();
    if (path) {
      setFolderPath(path);
      const files = await window.electronAPI.readAudioFiles(path);
      setOriginalFiles(files);
      generatePreview(files, method);
    }
  };

  const generatePreview = (files, currentMethod) => {
    let list = [...files];
    
    // 1. Očisti imena
    let cleanedList = list.map(f => ({ oldName: f, cleanName: cleanFilename(f) }));

    // 2. Sortiraj
    if (currentMethod === 'Abecedno' || currentMethod === 'Po izvođaču') {
      cleanedList.sort((a, b) => a.cleanName.localeCompare(b.cleanName));
    } else if (currentMethod === 'Nasumično') {
      for (let i = cleanedList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cleanedList[i], cleanedList[j]] = [cleanedList[j], cleanedList[i]];
      }
    }
    // "Po izvođaču" za sada radi kao Abecedno s obzirom da ime fajla obicno pocinje sa izvodjacem

    // 3. Dodaj brojeve
    const padLength = Math.max(3, cleanedList.length.toString().length);
    const newPreview = cleanedList.map((item, index) => {
      const num = String(index + 1).padStart(padLength, '0');
      return {
        oldName: item.oldName,
        newName: `${num} - ${item.cleanName}`
      };
    });

    setPreviewFiles(newPreview);
  };

  useEffect(() => {
    if (originalFiles.length > 0) {
      generatePreview(originalFiles, method);
    }
  }, [method, shuffleTrigger]);

  const handleMethodClick = (m) => {
    setAnimatingId(m);
    setTimeout(() => setAnimatingId(null), 400);
    
    if (method === m && m === 'Nasumično') {
      setShuffleTrigger(prev => prev + 1);
    } else {
      setMethod(m);
    }
  };

  const handleApply = async () => {
    if (!window.electronAPI || previewFiles.length === 0 || !folderPath) return;
    
    // Filtriramo fajlove koji se vec zovu ispravno
    const tasks = previewFiles.filter(f => f.oldName !== f.newName);
    if (tasks.length === 0) return;

    const success = await window.electronAPI.renameFiles(folderPath, tasks);
    if (success) {
      // Ponovo ucitaj
      const files = await window.electronAPI.readAudioFiles(folderPath);
      setOriginalFiles(files);
      // Da bismo prikazali zeleni ekran i sprijecili ponovno nasumicno mijesanje,
      // jednostavno izjednacimo preview sa novim imenima
      setPreviewFiles(files.map(f => ({ oldName: f, newName: f })));
    } else {
      alert(t('randomize', 'alertRenameError'));
    }
  };

  const handleRemoveNumbers = async () => {
    if (!window.electronAPI || originalFiles.length === 0 || !folderPath) return;
    
    const tasks = originalFiles.map(f => ({
      oldName: f,
      newName: cleanFilename(f)
    })).filter(f => f.oldName !== f.newName);

    if (tasks.length === 0) return;

    const success = await window.electronAPI.renameFiles(folderPath, tasks);
    if (success) {
      const files = await window.electronAPI.readAudioFiles(folderPath);
      setOriginalFiles(files);
      setPreviewFiles(files.map(f => ({ oldName: f, newName: f })));
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 animate-in fade-in duration-300 min-h-0 pb-2">
      <div className={`border rounded-xl p-6 flex flex-col gap-6 ${cardStyle}`}>
        <div className="flex-1">
          <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1 block">{t('randomize', 'folderLabel')}</label>
          <div className={`flex border rounded-lg overflow-hidden ${inputStyle}`}>
            <input type="text" readOnly value={folderPath || t('randomize', 'folderPlaceholder')} className={`w-full bg-transparent px-4 py-2 outline-none ${folderPath ? (isDarkMode ? 'text-gray-200' : 'text-gray-800') : 'text-gray-500'}`} />
            <button onClick={handleSelectFolder} className={`px-4 border-l ${isDarkMode ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-gray-200 border-gray-300 hover:bg-gray-300'}`}>{t('randomize', 'btnSelect')}</button>
          </div>
        </div>
        <div className="flex gap-4">
          {methods.map((m) => {
            const isActive = method === m.id;
            const isAnimating = animatingId === m.id;
            return (
              <button 
                key={m.id} 
                onClick={() => handleMethodClick(m.id)}
                className={`relative flex items-center gap-2 px-5 py-3 rounded-lg border transition-all ${
                  isActive 
                    ? (isDarkMode ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'bg-blue-50 border-blue-500 text-blue-600 shadow-sm') 
                    : (isDarkMode ? 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-gray-200' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900')
                } ${isAnimating ? 'animate-border-flash' : ''}`}
              >
                <div className={`${isActive && m.id === 'Nasumično' ? 'animate-pulse' : ''}`}>
                  {m.icon}
                </div>
                <span className="font-semibold text-sm">{m.label}</span>
                {isActive && m.id === 'Nasumično' && (
                  <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded border ${isDarkMode ? 'bg-blue-900/30 border-blue-500/30' : 'bg-blue-100 border-blue-200'}`}>
                    {t('randomize', 'clickAgainTooltip')}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        <div className={`border rounded-xl flex flex-col overflow-hidden ${isDarkMode ? 'bg-gray-900 border-gray-700/50' : 'bg-white border-gray-200'}`}>
          <div className={`px-4 py-3 border-b ${isDarkMode ? 'bg-gray-800/80 border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
            <h3 className="text-sm font-semibold">{t('randomize', 'originalFilesTitle')} ({originalFiles.length})</h3>
          </div>
          <div className="flex-1 p-2 overflow-y-auto space-y-1 custom-scrollbar">
            {originalFiles.length === 0 && <div className="p-4 text-sm text-gray-500 text-center flex flex-col items-center gap-2 mt-10"><Music size={32} className="opacity-20" /> {t('randomize', 'noFilesMsg')}</div>}
            {originalFiles.map((f, i) => (
              <div key={i} className={`px-3 py-2 text-sm rounded hover:bg-gray-800/50 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{f}</div>
            ))}
          </div>
        </div>
        <div className={`border rounded-xl flex flex-col overflow-hidden ${isDarkMode ? 'bg-gray-900 border-gray-700/50' : 'bg-white border-gray-200'}`}>
          <div className={`px-4 py-3 border-b ${isDarkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
            <h3 className="text-sm font-semibold">{t('randomize', 'previewFilesTitle')}</h3>
          </div>
          <div className="flex-1 p-2 overflow-y-auto space-y-1 relative custom-scrollbar">
            {previewFiles.length === 0 && <div className="p-4 text-sm text-gray-500 text-center flex flex-col items-center gap-2 mt-10"><List size={32} className="opacity-20" /> {t('randomize', 'noPreviewMsg')}</div>}
            
            {previewFiles.length > 0 && !previewFiles.some(f => f.oldName !== f.newName) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-green-500/5 z-10">
                <div className="bg-green-500/20 p-4 rounded-full mb-4 shadow-[0_0_20px_rgba(34,197,94,0.1)]">
                  <CheckCircle2 size={40} className="text-green-500" />
                </div>
                <h4 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>{t('randomize', 'allGoodTitle')}</h4>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('randomize', 'allGoodDesc')}</p>
              </div>
            )}

            {previewFiles.length > 0 && previewFiles.some(f => f.oldName !== f.newName) && previewFiles.map((f, i) => {
              const numMatch = f.newName.match(/^(\d+) - /);
              const num = numMatch ? numMatch[1] : '';
              const rest = f.newName.replace(/^(\d+) - /, '');
              const isChanged = f.oldName !== f.newName;
              
              return (
                <div key={i} className={`px-3 py-2 text-sm ${isChanged ? (isDarkMode ? 'text-gray-200' : 'text-gray-800') : (isDarkMode ? 'text-gray-600' : 'text-gray-400')}`}>
                  {num && <span className={`${isChanged ? 'text-blue-500' : 'text-gray-500'} mr-2 font-bold`}>{num} -</span>}
                  {rest}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4 mt-2">
        <button onClick={handleRemoveNumbers} disabled={originalFiles.length === 0} className={`px-6 py-3 rounded-lg border transition-all active:scale-95 ${originalFiles.length === 0 ? 'opacity-50 cursor-not-allowed border-gray-600 text-gray-500' : (isDarkMode ? 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm')}`}>
          {t('randomize', 'btnRemoveNumbers')}
        </button>
        <button 
          onClick={handleApply} 
          disabled={previewFiles.length === 0 || !previewFiles.some(f => f.oldName !== f.newName)} 
          className={`font-bold px-8 py-3 rounded-lg flex items-center gap-2 shadow-lg transition-all active:scale-95 ${previewFiles.length === 0 || !previewFiles.some(f => f.oldName !== f.newName) ? 'bg-gray-800 text-gray-500 cursor-not-allowed shadow-none border border-gray-700' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20'}`}
        >
          <Shuffle size={18} />
          {t('randomize', 'btnApply')}
        </button>
      </div>
    </div>
  );
}

// 3. USB BURNING TAB
function UsbTab({ isDarkMode, t }) {
  const [usbDrives, setUsbDrives] = useState([]);
  const [selectedUsb, setSelectedUsb] = useState('');
  const [sourceFolder, setSourceFolder] = useState('');
  const [sourceFiles, setSourceFiles] = useState([]);
  const [totalSize, setTotalSize] = useState(0);
  const [isBurning, setIsBurning] = useState(false);
  const [progress, setProgress] = useState({ total: 0, current: 0, currentFile: '' });
  const [isComplete, setIsComplete] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [formatSuccess, setFormatSuccess] = useState(false);
  const [formatLabel, setFormatLabel] = useState('YTD-USB');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const cardStyle = isDarkMode ? "bg-gray-800/40 border-gray-700/50" : "bg-white border-gray-200 shadow-sm";
  const inputStyle = isDarkMode ? "bg-gray-900 border-gray-700" : "bg-gray-50 border-gray-300";

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const fetchUsbDrives = async () => {
    if (!window.electronAPI) return;
    const drives = await window.electronAPI.getUsbDrives();
    setUsbDrives(drives);
    if (drives.length > 0) {
      // Ako trenutni selectedUsb više ne postoji na listi, prebaci na prvi novi
      if (!selectedUsb || !drives.find(d => d.letter === selectedUsb)) {
        setSelectedUsb(drives[0].letter);
      }
    } else {
      setSelectedUsb('');
    }
  };

  useEffect(() => {
    fetchUsbDrives();
    
    if (window.electronAPI) {
      window.electronAPI.onCopyProgress((data) => {
        setProgress(data);
        if (data.current === data.total) {
          setIsBurning(false);
          setIsComplete(true);
        }
      });
    }
  }, []);

  const handleSelectSource = async () => {
    if (!window.electronAPI) return;
    const path = await window.electronAPI.selectFolder();
    if (path) {
      setSourceFolder(path);
      const files = await window.electronAPI.readAudioFiles(path);
      files.sort((a, b) => a.localeCompare(b));
      
      const sizeInBytes = await window.electronAPI.getFilesSize(path, files);
      
      // Postavljamo tek kad sve izračunamo
      setTotalSize(sizeInBytes);
      setSourceFiles(files);
      
      setIsComplete(false);
      setProgress({ total: 0, current: 0, currentFile: '' });
    }
  };

  const handleSelectDestFolder = async () => {
    if (!window.electronAPI) return;
    const path = await window.electronAPI.selectFolder();
    if (path) {
      const spaceInfo = await window.electronAPI.getFreeSpace(path);
      const fakeDrive = { letter: path, name: 'Testni Folder', freeSpace: spaceInfo.freeSpace, totalSize: spaceInfo.totalSize };
      setUsbDrives([fakeDrive]);
      setSelectedUsb(fakeDrive.letter);
    }
  };

  const handleFormatUsb = async () => {
    if (!window.electronAPI || !selectedUsb) return;
    
    const driveObj = usbDrives.find(d => d.letter === selectedUsb);
    if (driveObj && driveObj.name === 'Testni Folder') {
      alert(t('usb', 'alertCantFormatTest'));
      return;
    }
    
    setFormatLabel('YTD-USB');
    setShowFormatModal(true);
  };

  const confirmFormatUsb = async () => {
    setShowFormatModal(false);
    setIsFormatting(true);
    const success = await window.electronAPI.formatUsb(selectedUsb, formatLabel);
    setIsFormatting(false);
    
    if (success) {
      setFormatSuccess(true);
      fetchUsbDrives();
    } else {
      alert(t('usb', 'alertFormatError'));
    }
  };

  const handleBurn = async () => {
    if (!window.electronAPI || !sourceFolder || !selectedUsb || sourceFiles.length === 0) return;
    
    setIsBurning(true);
    setIsComplete(false);
    setProgress({ total: sourceFiles.length, current: 0, currentFile: 'Priprema...' });

    // Osiguravamo da destinacija ima slash na kraju (npr E:\ ili C:\Test\)
    const destPath = selectedUsb.endsWith('\\') ? selectedUsb : selectedUsb + '\\'; 
    
    const success = await window.electronAPI.copyToUsb(sourceFolder, destPath, sourceFiles);
    if (!success) {
      alert(t('usb', 'alertCopyError'));
      setIsBurning(false);
    }
  };

  const percentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
  
  const selectedDriveObj = usbDrives.find(d => d.letter === selectedUsb);
  const safetyMargin = 50 * 1024 * 1024; // 50 MB sigurnosni bafer za Windows cluster overhead
  const hasEnoughSpace = selectedDriveObj ? selectedDriveObj.freeSpace >= (totalSize + safetyMargin) : false;

  return (
    <div className="h-full w-full overflow-overlay pr-2 pb-6">
      <div className="min-h-full flex flex-col justify-center max-w-3xl mx-auto w-full gap-6 animate-in fade-in duration-300 py-6 px-6">
      <div className="text-center mb-4">
        <div className="inline-flex items-center justify-center p-4 bg-orange-500/10 rounded-full mb-4">
          <Usb size={48} className="text-orange-500" />
        </div>
        <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{t('usb', 'title')}</h2>
        <p className={isDarkMode ? "text-gray-400" : "text-gray-600"}>{t('usb', 'subtitle')}</p>
      </div>

      <div className={`border rounded-2xl p-6 space-y-6 shadow-xl transition-colors ${cardStyle}`}>
        
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2 block">{t('usb', 'sourceLabel')}</label>
            <div className={`flex border rounded-lg overflow-hidden ${inputStyle}`}>
              <input type="text" readOnly value={sourceFolder || t('usb', 'sourcePlaceholder')} className={`w-full bg-transparent px-4 py-3 outline-none ${sourceFolder ? (isDarkMode ? 'text-gray-200' : 'text-gray-800') : 'text-gray-500'}`} />
              <button onClick={handleSelectSource} disabled={isBurning} className={`px-4 border-l font-medium transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 border-gray-300 hover:bg-gray-300 text-gray-700'}`}>
                <FolderSearch size={20} />
              </button>
            </div>
            {sourceFiles.length > 0 && <p className="text-xs text-green-500 mt-2 font-medium">{t('usb', 'sourceReadyMsg')} {sourceFiles.length} {t('usb', 'sourceFilesMsg')} ({t('usb', 'sourceRequiresMsg')} {formatBytes(totalSize)} {t('usb', 'sourceSpaceMsg')}).</p>}
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2 block">{t('usb', 'targetLabel')}</label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <div 
                  onClick={() => { if (!isBurning && usbDrives.length > 0) setIsDropdownOpen(!isDropdownOpen); }}
                  className={`w-full rounded-lg pl-4 pr-12 py-3 outline-none font-medium border flex items-center justify-between transition-all ${
                    isBurning || usbDrives.length === 0 
                      ? `opacity-50 cursor-not-allowed ${inputStyle}` 
                      : `cursor-pointer ${inputStyle} hover:border-blue-500/50 ${isDropdownOpen ? 'ring-2 ring-blue-500/30 border-blue-500' : ''}`
                  }`}
                >
                  <span className="truncate">
                    {usbDrives.length === 0 ? t('usb', 'noUsbFound') : (() => {
                      const selectedDrive = usbDrives.find(d => d.letter === selectedUsb);
                      if (!selectedDrive) return t('usb', 'noUsbFound');
                      const spaceText = selectedDrive.totalSize && selectedDrive.totalSize < Number.MAX_SAFE_INTEGER 
                        ? `(${formatBytes(selectedDrive.freeSpace)} ${t('usb', 'freeSpaceOf')} ${formatBytes(selectedDrive.totalSize)})` 
                        : '';
                      return `${selectedDrive.letter} - ${selectedDrive.name} ${spaceText}`;
                    })()}
                  </span>
                  <div className={`absolute right-4 top-1/2 -translate-y-1/2 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-blue-500' : 'opacity-50'}`}>
                    <ChevronDown size={18} />
                  </div>
                </div>

                {isDropdownOpen && !isBurning && usbDrives.length > 0 && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)}></div>
                    <div className={`absolute left-0 right-0 top-full mt-2 rounded-xl border shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 ${isDarkMode ? 'bg-gray-800 border-gray-700 shadow-black/50' : 'bg-white border-gray-200 shadow-gray-200/50'}`}>
                      <div className="max-h-60 overflow-y-auto py-1">
                        {usbDrives.map(drive => {
                          const spaceText = drive.totalSize && drive.totalSize < Number.MAX_SAFE_INTEGER 
                            ? `(${formatBytes(drive.freeSpace)} ${t('usb', 'freeSpaceOf')} ${formatBytes(drive.totalSize)})` 
                            : '';
                          const isSelected = drive.letter === selectedUsb;
                          
                          return (
                            <div 
                              key={drive.letter} 
                              onClick={() => {
                                setSelectedUsb(drive.letter);
                                setIsComplete(false);
                                setProgress({ total: 0, current: 0, currentFile: '' });
                                setIsDropdownOpen(false);
                              }}
                              className={`px-4 py-3 cursor-pointer flex items-center justify-between transition-colors ${
                                isSelected 
                                  ? (isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600') 
                                  : (isDarkMode ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900')
                              }`}
                            >
                              <div className="flex flex-col">
                                <span className="font-bold">{drive.letter} - {drive.name}</span>
                                {spaceText && <span className={`text-xs ${isSelected ? (isDarkMode ? 'text-blue-400/80' : 'text-blue-600/80') : (isDarkMode ? 'text-gray-500' : 'text-gray-400')}`}>{spaceText}</span>}
                              </div>
                              {isSelected && <CheckCircle2 size={18} />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
              <button 
                onClick={() => {
                  fetchUsbDrives();
                  setIsComplete(false);
                  setProgress({ total: 0, current: 0, currentFile: '' });
                }} 
                disabled={isBurning} 
                title={t('usb', 'tooltipRefresh')} 
                className={`border px-4 rounded-lg flex items-center transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'}`}
              >
                <RefreshCw size={20} />
              </button>
              {usbDrives.length === 0 ? (
                <button onClick={handleSelectDestFolder} disabled={isBurning} title={t('usb', 'tooltipTestFolder')} className={`border px-4 rounded-lg flex items-center transition-colors ${isDarkMode ? 'bg-blue-900/50 border-blue-800 text-blue-400 hover:bg-blue-800/50' : 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100'}`}>
                  {t('usb', 'btnTestFolder')}
                </button>
              ) : (
                <button 
                  onClick={() => {
                    if (formatSuccess) {
                      setFormatSuccess(false);
                    } else {
                      handleFormatUsb();
                    }
                  }} 
                  disabled={isBurning || isFormatting || (!formatSuccess && (usbDrives.find(d => d.letter === selectedUsb)?.name === 'Testni Folder'))}
                  title={formatSuccess ? t('usb', 'tooltipFormatDone') : t('usb', 'tooltipFormatDrive')}
                  className={`border px-4 py-1.5 rounded-lg flex items-center gap-2 font-bold text-xs tracking-wide transition-colors ${
                    isFormatting 
                      ? 'bg-gray-500/20 text-gray-400 border-gray-500/30 cursor-not-allowed' 
                      : formatSuccess
                        ? 'bg-green-500/10 border-green-500/30 text-green-500 hover:bg-green-500/20 cursor-pointer'
                        : 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20'
                  }`}
                >
                  {isFormatting ? (
                    <><Loader2 size={16} className="animate-spin" /> {t('usb', 'btnFormatting')}</>
                  ) : formatSuccess ? (
                    <><CheckCircle2 size={16} /> {t('usb', 'btnFormattedOk')}</>
                  ) : (
                    <><Trash2 size={16} /> {t('usb', 'btnFormatUsb')}</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className={`rounded-xl p-5 border ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex justify-between items-end mb-3">
            <div className="flex-1 overflow-hidden mr-4">
              {isComplete ? (
                <p className="text-green-500 font-bold flex items-center gap-2 text-sm">
                  <CheckCircle2 size={18} /> {t('usb', 'successTransferMsg')}
                </p>
              ) : isBurning ? (
                <div>
                  <p className="text-orange-400 font-bold flex items-center gap-2 text-sm mb-1">
                    <Loader2 size={16} className="animate-spin" /> {t('usb', 'transferringMsg')} {progress.current} {t('usb', 'transferFromMsg')} {progress.total}
                  </p>
                  <p className="text-xs text-gray-500 truncate" title={progress.currentFile}>{progress.currentFile}</p>
                </div>
              ) : (
                <p className="text-orange-400 font-medium flex items-center gap-2 text-sm">
                  <Settings2 size={16} className="animate-spin" /> {t('usb', 'readyToWriteMsg')}
                </p>
              )}
            </div>
            <span className={isDarkMode ? "text-gray-300 font-bold" : "text-gray-800 font-bold"}>{percentage}%</span>
          </div>
          <div className={`w-full rounded-full h-3 overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
            <div className={`h-full rounded-full transition-all duration-300 ${isComplete ? 'bg-green-500' : 'bg-gradient-to-r from-orange-600 to-orange-400'}`} style={{ width: `${percentage}%` }}></div>
          </div>
        </div>

        <div className="space-y-3">

          
          <button 
            onClick={handleBurn} 
            disabled={isBurning || !sourceFolder || !selectedUsb || sourceFiles.length === 0 || isComplete || !hasEnoughSpace}
            className={`w-full font-bold rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg text-lg ${
              isComplete
                ? 'py-4 bg-green-600 text-white cursor-not-allowed'
                : (!hasEnoughSpace && totalSize > 0
                    ? 'py-2 bg-red-900/30 text-red-400 border border-red-800/50 cursor-not-allowed shadow-none'
                    : (isBurning || !sourceFolder || !selectedUsb || sourceFiles.length === 0 
                        ? 'py-4 bg-gray-800 text-gray-500 cursor-not-allowed shadow-none border border-gray-700' 
                        : 'py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white active:scale-[0.98]'))
            }`}
          >
            {!hasEnoughSpace && totalSize > 0 ? (
              <div className="flex flex-col items-center justify-center w-full">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle size={20} />
                  <span>{t('usb', 'notEnoughSpaceTitle')}</span>
                </div>
                <span className="text-xs font-normal text-red-400/80">{t('usb', 'spaceRequired')} {formatBytes(totalSize)} | {t('usb', 'spaceAvailable')} {formatBytes(selectedDriveObj?.freeSpace || 0)}</span>
              </div>
            ) : (
              <>
                {isBurning ? <Loader2 size={24} className="animate-spin" /> : (isComplete ? <CheckCircle2 size={24} className="text-white" /> : <Flame size={24} />)} 
                {isBurning ? t('usb', 'btnWriting') : (isComplete ? t('usb', 'btnDone') : t('usb', 'btnBurn'))}
              </>
            )}
          </button>
          
          {isComplete && (
            <button 
              onClick={() => {
                setSourceFolder('');
                setSourceFiles([]);
                setTotalSize(0);
                setIsComplete(false);
                setProgress({ total: 0, current: 0, currentFile: '' });
              }}
              className={`w-full font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all border ${
                isDarkMode 
                  ? 'bg-gray-800/50 border-gray-600 text-gray-300 hover:bg-gray-700' 
                  : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <RefreshCw size={18} /> {t('usb', 'btnStartNew')}
            </button>
          )}
        </div>
      </div>

      {showFormatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-md p-6 rounded-2xl shadow-2xl border animate-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/20">
                <Trash2 className="text-red-500" size={32} />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {t('usb', 'formatModalTitle')}
              </h3>
              <p className={`mb-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {t('usb', 'formatModalSureText')} <strong className={isDarkMode ? 'text-white' : 'text-black'}>{selectedUsb}</strong>?<br/><br/>
                <strong className="text-red-500">{t('usb', 'formatModalWarning')}</strong>
              </p>
              
              <div className="w-full text-left mb-6">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2 block text-center">{t('usb', 'formatModalInputLabel')}</label>
                <input 
                  type="text" 
                  value={formatLabel} 
                  onChange={(e) => setFormatLabel(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 11))} 
                  placeholder={t('usb', 'formatModalInputPlaceholder')} 
                  maxLength={11}
                  className={`w-full text-center font-bold tracking-widest px-4 py-3 rounded-lg outline-none border focus:ring-2 focus:ring-red-500/50 transition-all ${
                    isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-800'
                  }`} 
                />
                <p className="text-[10px] text-gray-500 text-center mt-1">{t('usb', 'formatModalInputHint')}</p>
              </div>
              
              <div className="flex w-full gap-3">
                <button 
                  onClick={() => setShowFormatModal(false)}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t('usb', 'btnCancel')}
                </button>
                <button 
                  onClick={confirmFormatUsb}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20"
                >
                  {t('usb', 'btnConfirmFormat')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
    </div>
  );
}

// 4. ABOUT TAB
function AboutTab({ isDarkMode, t }) {
  const cardStyle = isDarkMode ? "bg-gray-800/40 border-gray-700/50" : "bg-white border-gray-200 shadow-sm";
  const textMuted = isDarkMode ? "text-gray-400" : "text-gray-600";
  const textHeading = isDarkMode ? "text-gray-200" : "text-gray-800";

  const handleLinkClick = (url) => {
    if (window.electronAPI && window.electronAPI.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="h-full w-full animate-in fade-in duration-300 overflow-overlay pr-2 pb-10">
      <div className="flex flex-col max-w-4xl mx-auto w-full gap-6 pt-6 px-6">
        {/* Header */}
        <div className="text-center mt-1 mb-2">
        <h2 className={`text-3xl font-bold mb-2 bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent inline-block`}>
          {t('about', 'title')}
        </h2>
        <p className={`${textMuted} font-medium`}>{t('about', 'subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Značajke */}
        <div className={`border rounded-2xl p-6 ${cardStyle}`}>
          <div className="flex items-center gap-3 mb-4 border-b border-gray-700/50 pb-3">
            <CheckCircle2 className="text-green-500" size={24} />
            <h3 className={`text-lg font-bold ${textHeading}`}>{t('about', 'featuresTitle')}</h3>
          </div>
          <ul className={`space-y-3 ${textMuted} text-sm`}>
            <li className="flex gap-3"><span className="text-green-500 font-bold">✓</span> {t('about', 'feat1')}</li>
            <li className="flex gap-3"><span className="text-green-500 font-bold">✓</span> {t('about', 'feat2')}</li>
            <li className="flex gap-3"><span className="text-green-500 font-bold">✓</span> {t('about', 'feat3')}</li>
            <li className="flex gap-3"><span className="text-green-500 font-bold">✓</span> {t('about', 'feat4')}</li>
            <li className="flex gap-3"><span className="text-green-500 font-bold">✓</span> {t('about', 'feat5')}</li>
            <li className="flex gap-3"><span className="text-green-500 font-bold">✓</span> {t('about', 'feat6')}</li>
          </ul>
        </div>

        {/* Uputstvo */}
        <div className={`border rounded-2xl p-6 ${cardStyle}`}>
          <div className="flex items-center gap-3 mb-4 border-b border-gray-700/50 pb-3">
            <FileText className="text-blue-500" size={24} />
            <h3 className={`text-lg font-bold ${textHeading}`}>{t('about', 'howtoTitle')}</h3>
          </div>
          <ol className={`space-y-3 ${textMuted} text-sm list-decimal list-inside`}>
            <li>{t('about', 'how1')}</li>
            <li>{t('about', 'how2')}</li>
            <li>{t('about', 'how3')}</li>
            <li>{t('about', 'how4')}</li>
            <li>{t('about', 'how5')}</li>
          </ol>
        </div>
      </div>

      {/* Developer & Donate */}
      <div className={`border rounded-2xl p-6 mt-2 ${cardStyle} flex flex-col md:flex-row gap-6 justify-between items-center bg-gradient-to-br ${isDarkMode ? 'from-gray-800/40 to-gray-900/80' : 'from-gray-50 to-white'}`}>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <User className="text-purple-500" size={20} />
            <h3 className={`font-bold ${textHeading}`}>{t('about', 'devTitle')}</h3>
          </div>
          <p className={`${textMuted} text-sm leading-relaxed mb-5 max-w-lg`}>
            {t('about', 'devDesc1')} <strong className={isDarkMode ? "text-gray-200" : "text-gray-800"}>Emrah Ponjevic</strong>. <br/>
            {t('about', 'devDesc2')}
          </p>
          <div className="flex flex-wrap gap-5">
            <button onClick={() => handleLinkClick('https://www.emrah-dev.net/')} className={`flex items-center gap-2 text-sm font-medium transition-colors ${isDarkMode ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-700'}`}>
              <Globe size={16} /> {t('about', 'btnPortfolio')}
            </button>
            <button onClick={() => handleLinkClick('https://www.linkedin.com/in/emrah-ponjevic/')} className={`flex items-center gap-2 text-sm font-medium transition-colors ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}>
              <Linkedin size={16} /> {t('about', 'btnLinkedin')}
            </button>
            <button onClick={() => handleLinkClick('https://github.com/emrahponjevic1')} className={`flex items-center gap-2 text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'}`}>
              <Github size={16} /> {t('about', 'btnGithub')}
            </button>
          </div>
        </div>

        <div className={`p-5 rounded-xl border flex flex-col items-center justify-center min-w-[280px] text-center ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
          <Heart className="text-red-500 mb-2 fill-current" size={28} />
          <h4 className={`font-bold text-sm mb-1 ${textHeading}`}>{t('about', 'supportTitle')}</h4>
          <p className={`text-xs mb-4 ${textMuted}`}>{t('about', 'supportDesc')}</p>
          <button 
            onClick={() => handleLinkClick('https://paypal.me/emrahponjevic')}
            className="w-full bg-[#0070ba] hover:bg-[#003087] text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg active:scale-95"
          >
            <ExternalLink size={18} /> {t('about', 'btnDonate')}
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}