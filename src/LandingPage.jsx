import React, { useState, useCallback, useEffect } from 'react';
import { 
  Download, 
  Music, 
  Video, 
  Shuffle, 
  Usb, 
  User, 
  Github, 
  Sparkles, 
  ChevronRight, 
  Monitor, 
  ShieldCheck, 
  Zap, 
  ExternalLink,
  Flame,
  CheckCircle2,
  Lock,
  Layers,
  Heart
} from 'lucide-react';

// --- Custom 3D Tilt Hook ---
function use3DTilt(maxRotate = 12) {
  const [style, setStyle] = useState({});

  const onMouseMove = useCallback((e) => {
    const card = e.currentTarget;
    const box = card.getBoundingClientRect();
    
    // Koordinate u odnosu na centar elementa
    const x = e.clientX - box.left - box.width / 2;
    const y = e.clientY - box.top - box.height / 2;
    
    // Uglovi rotacije
    const rx = -(y / (box.height / 2)) * maxRotate;
    const ry = (x / (box.width / 2)) * maxRotate;
    
    // Pozicija svjetlosnog sjaja (sheen) u procentima
    const px = ((e.clientX - box.left) / box.width) * 100;
    const py = ((e.clientY - box.top) / box.height) * 100;

    setStyle({
      transform: `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.03, 1.03, 1.03)`,
      '--sheen-x': `${px}%`,
      '--sheen-y': `${py}%`,
      transition: 'transform 0.08s cubic-bezier(0.25, 1, 0.5, 1)'
    });
  }, [maxRotate]);

  const onMouseLeave = useCallback(() => {
    setStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      transition: 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)'
    });
  }, []);

  return { style, onMouseMove, onMouseLeave };
}

export default function LandingPage() {
  const tiltCard1 = use3DTilt(10);
  const tiltCard2 = use3DTilt(10);
  const tiltCard3 = use3DTilt(10);
  const tiltCard4 = use3DTilt(10);
  const heroTilt = use3DTilt(6);

  // State za interaktivni 3D Stepper
  const [activeStep, setActiveStep] = useState(1);
  
  // State za simulaciju inputa u interaktivnom Stepperu
  const [simulatedUrl, setSimulatedUrl] = useState('');
  const [simulatedProgress, setSimulatedProgress] = useState(0);
  const [simulatedStatus, setSimulatedStatus] = useState('idle');

  // Tajmer za automatsku simulaciju koraka
  useEffect(() => {
    let interval;
    if (activeStep === 3) {
      setSimulatedStatus('downloading');
      setSimulatedProgress(0);
      interval = setInterval(() => {
        setSimulatedProgress((prev) => {
          if (prev >= 100) {
            setSimulatedStatus('completed');
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 300);
    } else {
      setSimulatedProgress(0);
      setSimulatedStatus('idle');
    }
    return () => clearInterval(interval);
  }, [activeStep]);

  return (
    <div className="min-h-screen bg-[#030014] text-white overflow-x-hidden font-sans selection:bg-red-600/30 selection:text-red-200">
      
      {/* Ambijentalno neonsko osvjetljenje u pozadini */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[150px] animate-pulse-slow pointer-events-none z-0" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[180px] animate-pulse-slow pointer-events-none z-0" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-10 left-1/3 w-[450px] h-[450px] bg-purple-600/5 rounded-full blur-[140px] animate-pulse-slow pointer-events-none z-0" style={{ animationDelay: '4s' }} />

      {/* 1. NAVIGACIJA */}
      <header className="sticky top-0 z-50 bg-[#030014]/65 backdrop-blur-md border-b border-white/[0.04] transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-red-600/15 p-2.5 rounded-xl border border-red-500/25 shadow-lg shadow-red-500/5">
              <Flame className="text-red-500 animate-pulse" size={24} />
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-xl bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                YT Media
              </span>
              <span className="font-light tracking-wide text-gray-500 ml-1">Downloader</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#demo" className="hover:text-white transition-colors">How It Works</a>
            <a href="#security" className="hover:text-white transition-colors">Security</a>
          </nav>

          <div className="flex items-center gap-4">
            <a 
              href="https://github.com/emrahponjevic1/yt-media-downloader" 
              target="_blank" 
              rel="noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <Github size={20} />
            </a>
            <a 
              href="https://github.com/emrahponjevic1/yt-media-downloader/releases/latest"
              className="relative group overflow-hidden px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-red-500/30 text-sm font-bold tracking-tight transition-all active:scale-95 flex items-center gap-2"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <span>Get App</span>
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>
      </header>

      {/* 2. HERO SEKCIJA (3D PARALLAX) */}
      <section className="relative max-w-7xl mx-auto px-6 pt-16 pb-24 md:py-32 flex flex-col lg:flex-row items-center gap-16 z-10">
        
        {/* Lijeva strana: Tekst i CTA */}
        <div className="flex-1 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs font-semibold text-gray-300 mb-6 backdrop-blur-md">
            <Sparkles size={12} className="text-red-500" />
            <span>Built out of boredom, engineered for power</span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
            The Ultimate
            <span className="block mt-2 bg-gradient-to-r from-white via-gray-100 to-red-500 bg-clip-text text-transparent">
              YT Media Downloader
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 font-light leading-relaxed max-w-2xl mx-auto lg:mx-0 mb-10">
            A premium, crash-proof desktop engine designed with React and Electron. Fully optimized for 4K video extraction, duplicate prevention, and direct music burning for car USBs.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            <a 
              href="https://github.com/emrahponjevic1/yt-media-downloader/releases/latest/download/YT.Media.Downloader.2.0.0.exe"
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold rounded-xl shadow-2xl shadow-red-600/20 hover:shadow-red-500/30 transition-all flex items-center justify-center gap-3 group active:scale-95 border border-red-500/20"
            >
              <Download size={20} />
              <span>Download Portable EXE</span>
            </a>
            <a 
              href="https://github.com/emrahponjevic1/yt-media-downloader"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Github size={18} />
              <span>Source Code</span>
            </a>
          </div>

          <div className="mt-8 flex items-center justify-center lg:justify-start gap-6 text-xs text-gray-500 font-medium">
            <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-red-500" /> Portable (No Install)</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-red-500" /> Windows 10 / 11 Only</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-red-500" /> 100% Free & Open Source</span>
          </div>
        </div>

        {/* Desna strana: Slojeviti 3D Parallax Prozor */}
        <div className="flex-1 w-full flex justify-center perspective-1000">
          <div 
            style={heroTilt.style}
            onMouseMove={heroTilt.onMouseMove}
            onMouseLeave={heroTilt.onMouseLeave}
            className="relative w-full max-w-[500px] aspect-[4/3] rounded-2xl bg-white/[0.02] border border-white/[0.06] shadow-2xl preserve-3d animate-float-3d shadow-black/80 flex flex-col backdrop-blur-xl"
          >
            
            {/* Sjaj preko čitavog prozora */}
            <div 
              className="absolute inset-0 rounded-2xl pointer-events-none z-30 transition-opacity duration-300"
              style={{
                background: `radial-gradient(circle at var(--sheen-x, 50%) var(--sheen-y, 50%), rgba(255, 255, 255, 0.05) 0%, transparent 60%)`
              }}
            />

            {/* Header prozora */}
            <div className="h-12 border-b border-white/[0.06] flex items-center justify-between px-4 z-10 preserve-3d">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
              </div>
              <div className="text-[11px] font-mono tracking-wider text-gray-500 select-none">YT MEDIA DOWNLOADER</div>
              <div className="w-12" />
            </div>

            {/* Sadržaj / Slojevi dubine */}
            <div className="flex-1 p-6 flex flex-col justify-between preserve-3d relative">
              
              {/* Sloj 1 (Glavni UI - Dubina: 15px) */}
              <div 
                className="space-y-4 preserve-3d" 
                style={{ transform: 'translateZ(15px)' }}
              >
                <div className="h-10 bg-white/[0.03] border border-white/[0.05] rounded-lg px-3 flex items-center text-xs text-gray-500 font-mono">
                  https://www.youtube.com/watch?v=njX2bu-_Vw4
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 h-9 bg-red-600/10 border border-red-500/20 text-red-400 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-md shadow-red-500/5">
                    <Music size={13} /> Audio Mode (MP3)
                  </div>
                  <div className="flex-1 h-9 bg-white/[0.03] border border-white/[0.05] text-gray-400 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5">
                    <Video size={13} /> Video Mode (4K)
                  </div>
                </div>
              </div>

              {/* Sloj 2 (Plutajući Tabovi - Dubina: 40px) */}
              <div 
                className="absolute top-1/2 left-6 right-6 p-4 rounded-xl bg-[#09061a]/90 border border-white/[0.08] shadow-2xl preserve-3d space-y-3"
                style={{ transform: 'translateZ(40px) translateY(-25%)' }}
              >
                <div className="flex justify-between items-center text-[10px] tracking-wide text-red-400 font-bold">
                  <span>ACTIVE AUDIO PROCESSES</span>
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                </div>
                <div className="space-y-2">
                  <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 w-[72%] rounded-full animate-pulse" />
                  </div>
                  <div className="flex justify-between text-[9px] text-gray-500 font-mono">
                    <span>temp_chill_mix_2026.mp3</span>
                    <span>72% @ 12.4 MB/s</span>
                  </div>
                </div>
              </div>

              {/* Sloj 3 (Spektakularne 3D Ikone - Dubina: 75px) */}
              <div 
                className="absolute right-2 -bottom-6 sm:-right-6 sm:-bottom-6 w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-tr from-red-600 to-pink-600 rounded-xl sm:rounded-2xl shadow-2xl shadow-red-600/25 flex items-center justify-center preserve-3d"
                style={{ transform: 'translateZ(75px)' }}
              >
                <Sparkles className="text-white animate-pulse w-6 h-6 sm:w-9 sm:h-9" />
              </div>
              
              <div 
                className="absolute left-2 -bottom-4 sm:-left-6 sm:-bottom-4 px-2 py-1 sm:px-3 sm:py-2 bg-blue-900/90 border border-blue-500/20 rounded-lg sm:rounded-xl shadow-xl flex items-center gap-1.5 sm:gap-2 preserve-3d text-[10px] sm:text-xs font-bold"
                style={{ transform: 'translateZ(55px)' }}
              >
                <Usb className="text-blue-400 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="text-blue-300">USB Synced (E:)</span>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* 3. INTERAKTIVNE 3D TILT KARTICE (FEATURES) */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24 border-t border-white/[0.04]">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Powerful Engine, Optimized Layout.
          </h2>
          <p className="text-gray-300 font-normal text-lg">
            Designed to solve real issues, from download bottlenecks and safety corruption to older car players without random support.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Kartica 1: YouTube Auth */}
          <div 
            style={tiltCard1.style}
            onMouseMove={tiltCard1.onMouseMove}
            onMouseLeave={tiltCard1.onMouseLeave}
            className="group relative p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-red-500/20 transition-all flex flex-col gap-6 overflow-hidden shadow-xl shadow-black/10"
          >
            <div 
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background: `radial-gradient(circle at var(--sheen-x, 50%) var(--sheen-y, 50%), rgba(220, 38, 38, 0.08) 0%, transparent 70%)`
              }}
            />
            <div className="bg-red-500/10 p-3.5 rounded-xl border border-red-500/15 w-fit">
              <Lock className="text-red-500" size={24} />
            </div>
            <div className="space-y-3 z-10">
              <h3 className="text-xl font-bold tracking-tight text-white group-hover:text-red-400 transition-colors">YouTube Auth</h3>
              <p className="text-base text-gray-300 font-normal leading-relaxed">
                Integrated WebView & OAuth2 login prompt. Bypass bot checks, download locked content, and unlock maximum download speeds.
              </p>
            </div>
          </div>

          {/* Kartica 2: 4K Resolutions */}
          <div 
            style={tiltCard2.style}
            onMouseMove={tiltCard2.onMouseMove}
            onMouseLeave={tiltCard2.onMouseLeave}
            className="group relative p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-red-500/20 transition-all flex flex-col gap-6 overflow-hidden shadow-xl shadow-black/10"
          >
            <div 
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background: `radial-gradient(circle at var(--sheen-x, 50%) var(--sheen-y, 50%), rgba(220, 38, 38, 0.08) 0%, transparent 70%)`
              }}
            />
            <div className="bg-red-500/10 p-3.5 rounded-xl border border-red-500/15 w-fit">
              <Zap className="text-red-500" size={24} />
            </div>
            <div className="space-y-3 z-10">
              <h3 className="text-xl font-bold tracking-tight text-white group-hover:text-red-400 transition-colors">4K & UHD Support</h3>
              <p className="text-base text-gray-300 font-normal leading-relaxed">
                Intelligent browser detection retrieves cookies directly from Chrome, Edge, or Brave to safely unlock premium resolutions (2160p, 1440p).
              </p>
            </div>
          </div>

          {/* Kartica 3: Car Shuffle */}
          <div 
            style={tiltCard3.style}
            onMouseMove={tiltCard3.onMouseMove}
            onMouseLeave={tiltCard3.onMouseLeave}
            className="group relative p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-red-500/20 transition-all flex flex-col gap-6 overflow-hidden shadow-xl shadow-black/10"
          >
            <div 
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background: `radial-gradient(circle at var(--sheen-x, 50%) var(--sheen-y, 50%), rgba(220, 38, 38, 0.08) 0%, transparent 70%)`
              }}
            />
            <div className="bg-red-500/10 p-3.5 rounded-xl border border-red-500/15 w-fit">
              <Shuffle className="text-red-500" size={24} />
            </div>
            <div className="space-y-3 z-10">
              <h3 className="text-xl font-bold tracking-tight text-white group-hover:text-red-400 transition-colors">Car Player Specialist</h3>
              <p className="text-base text-gray-300 font-normal leading-relaxed">
                Advanced track randomize numbering. Forces older car radios (which only read alphabetical order) to play files in a true shuffle mode.
              </p>
            </div>
          </div>

          {/* Kartica 4: Crash-Proof */}
          <div 
            style={tiltCard4.style}
            onMouseMove={tiltCard4.onMouseMove}
            onMouseLeave={tiltCard4.onMouseLeave}
            className="group relative p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-red-500/20 transition-all flex flex-col gap-6 overflow-hidden shadow-xl shadow-black/10"
          >
            <div 
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background: `radial-gradient(circle at var(--sheen-x, 50%) var(--sheen-y, 50%), rgba(220, 38, 38, 0.08) 0%, transparent 70%)`
              }}
            />
            <div className="bg-red-500/10 p-3.5 rounded-xl border border-red-500/15 w-fit">
              <ShieldCheck className="text-red-500" size={24} />
            </div>
            <div className="space-y-3 z-10">
              <h3 className="text-xl font-bold tracking-tight text-white group-hover:text-red-400 transition-colors">Crash-Proof File Sync</h3>
              <p className="text-base text-gray-300 font-normal leading-relaxed">
                Sandboxed temporary files (`temp_` prefix) and atomic renaming. Automatically detects duplicates and cleans up corrupted downloads.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* 4. INTERAKTIVNI "HOW IT WORKS" STEPPER */}
      <section id="demo" className="max-w-7xl mx-auto px-6 py-24 border-t border-white/[0.04] relative">
        <div className="flex flex-col lg:flex-row items-center gap-16 relative">
          
          <div className="flex-1 space-y-8">
            <div>
              <span className="text-red-500 font-bold text-xs uppercase tracking-wider">Interactive Walkthrough</span>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-2 mb-4">
                How It Works
              </h2>
              <p className="text-gray-300 font-normal text-lg">
                Explore the seamless flow from YouTube to your external storage. Click any step on the left to see the simulation on the right.
              </p>
            </div>

            {/* Stepper dugmad */}
            <div className="space-y-4">
              {[
                { step: 1, title: '1. Paste & Probe Link', desc: 'Input any URL. The app scans metadata, fetches titles, and grabs available streams.' },
                { step: 2, title: '2. Select Format & Quality', desc: 'Choose between standard MP3s (up to 320kbps) or high-quality video files (up to 4K UHD).' },
                { step: 3, title: '3. Download & Sync', desc: 'Download with active progress logs, automatic naming-collision check, and clean up temporary parts.' }
              ].map((s) => (
                <button
                  key={s.step}
                  onClick={() => setActiveStep(s.step)}
                  className={`w-full text-left p-6 rounded-xl border transition-all duration-300 ${activeStep === s.step ? 'bg-[#09061a] border-red-500/30 shadow-lg' : 'bg-transparent border-white/[0.04] hover:border-white/[0.08]'}`}
                >
                  <h4 className={`font-bold tracking-tight text-base ${activeStep === s.step ? 'text-red-400' : 'text-white'}`}>{s.title}</h4>
                  <p className="text-sm text-gray-400 font-normal mt-2 leading-relaxed">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Simulacioni ekran na desnoj strani */}
          <div className="flex-1 w-full max-w-[500px] aspect-[4/3] rounded-2xl bg-[#060318]/95 border border-white/[0.06] shadow-2xl p-6 flex flex-col justify-between relative overflow-hidden">
            
            {/* Elementi na webu */}
            <div className="flex items-center justify-between border-b border-white/[0.04] pb-4 mb-4">
              <span className="text-[10px] font-mono tracking-widest text-red-500 font-bold uppercase">LIVE SIMULATOR</span>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
            </div>

            {/* Aktivni ekrani u zavisnosti od koraka */}
            <div className="flex-grow flex items-center justify-center">
              
              {activeStep === 1 && (
                <div className="w-full space-y-4 animate-in fade-in">
                  <span className="text-xs text-gray-500">Insert URL Address:</span>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Paste YouTube link here..." 
                      className="flex-grow bg-white/[0.02] border border-white/[0.08] rounded-lg px-3 py-2.5 text-xs text-gray-300 font-mono focus:outline-none focus:border-red-500/40"
                      value={simulatedUrl}
                      onChange={(e) => setSimulatedUrl(e.target.value)}
                    />
                    <button 
                      onClick={() => setSimulatedUrl('https://www.youtube.com/watch?v=njX2bu-_Vw4')}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95"
                    >
                      Fill Link
                    </button>
                  </div>
                  {simulatedUrl.includes('youtube.com') && (
                    <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-lg animate-in fade-in flex items-center gap-3">
                      <Music size={20} className="text-red-500" />
                      <div>
                        <p className="text-xs font-bold text-gray-300 truncate">2020 LG OLED l The Black 4K HDR 60fps</p>
                        <p className="text-[9px] text-gray-500">Video length: 04:12 • Author: LG Global</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeStep === 2 && (
                <div className="w-full space-y-4 animate-in fade-in">
                  <span className="text-xs text-gray-500">Choose Output Preset:</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-red-600/10 border border-red-500/30 text-center space-y-1.5 cursor-pointer">
                      <Music size={18} className="text-red-400 mx-auto" />
                      <p className="text-xs font-bold text-white">Audio Preset</p>
                      <p className="text-[9px] text-gray-500 font-mono">MP3 / 320Kbps</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center space-y-1.5 cursor-pointer hover:border-red-500/20 transition-all">
                      <Video size={18} className="text-gray-400 mx-auto" />
                      <p className="text-xs font-bold text-white">Video Preset</p>
                      <p className="text-[9px] text-gray-500 font-mono">MP4 / 2160p (4K)</p>
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 3 && (
                <div className="w-full space-y-4 animate-in fade-in">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-mono">Status: {simulatedStatus}</span>
                    <span className="text-red-400 font-bold">{simulatedProgress}%</span>
                  </div>
                  
                  <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500 rounded-full transition-all duration-300"
                      style={{ width: `${simulatedProgress}%` }}
                    />
                  </div>

                  <div className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.04] text-[10px] font-mono text-gray-500 space-y-1.5">
                    <div>[sys:init] Creating temp file: temp_2020_LG_OLED.mp3.part</div>
                    {simulatedProgress > 30 && <div>[sys:proc] Streaming bytes: 14.5 MB/s</div>}
                    {simulatedProgress > 60 && <div>[sys:proc] Converting stream to MP3 preset...</div>}
                    {simulatedStatus === 'completed' && (
                      <div className="text-green-400 font-bold">[sys:done] Successfully renamed to 2020 LG OLED.mp3</div>
                    )}
                  </div>
                </div>
              )}

            </div>

            <div className="text-[9px] font-mono text-gray-600 text-center border-t border-white/[0.04] pt-3">
              Press buttons on the left to simulate other features
            </div>

          </div>
        </div>
      </section>

      {/* 5. PRIVACY & SECURITY SECTION */}
      <section id="security" className="max-w-5xl mx-auto px-6 py-24 border-t border-white/[0.04] text-center">
        <div className="relative p-12 rounded-3xl bg-gradient-to-tr from-[#0e0721]/60 to-[#030014]/40 border border-white/[0.06] overflow-hidden shadow-2xl">
          
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-red-600/5 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-xs font-mono text-red-400">
              <span>SECURITY & TRUST</span>
            </div>
            
            <h2 className="text-4xl font-extrabold tracking-tight">
              100% Secure, Ad-Free & Private 🛡️
            </h2>

            <p className="text-lg text-gray-300 font-normal leading-relaxed">
              Say goodbye to shady online converters filled with pop-ups, adware, and tracking cookies. YT Media Downloader is built with a privacy-first approach. Every single process runs locally on your computer—zero tracking, zero remote servers, and fully open-source code that you can audit yourself at any time.
            </p>

            <div className="pt-4 flex justify-center gap-4">
              <a 
                href="https://github.com/emrahponjevic1/yt-media-downloader" 
                target="_blank" 
                rel="noreferrer"
                className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold border border-white/10 hover:border-white/20 transition-all flex items-center gap-2"
              >
                <span>Audit Code on GitHub</span>
                <ExternalLink size={12} />
              </a>
              <a 
                href="https://paypal.me/emrahponjevic" 
                target="_blank" 
                rel="noreferrer"
                className="px-6 py-3 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-xs font-bold border border-red-500/20 text-red-400 transition-all flex items-center gap-2"
              >
                <Heart size={12} />
                <span>Support Open Source</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FOOTER */}
      <footer className="border-t border-white/[0.04] bg-[#02000c]">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Flame className="text-red-500" size={20} />
            <span className="text-base text-gray-400 font-normal">
              © {new Date().getFullYear()} YT Media Downloader. Developed by Emrah Ponjevic.
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-gray-500">
            <a href="https://www.emrah-dev.net/" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Developer Portfolio</a>
            <a href="https://www.linkedin.com/in/emrah-ponjevic/" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">LinkedIn</a>
            <a href="https://github.com/emrahponjevic1" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">GitHub</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
