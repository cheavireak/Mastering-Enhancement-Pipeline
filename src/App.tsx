import React, { useState, useRef, useEffect } from 'react';
import { Upload, Settings, Play, Download, Activity, Sliders, CheckCircle2, Loader2, Music, Pause, ShieldCheck, Smartphone, Speaker, Car, Mic2, Radio, Zap, FileAudio, Cpu, Waves, BarChart3 } from 'lucide-react';
import { processAudio, Preset, analyzeAudio, AudioAnalysis, BassSettings } from './lib/audio-processor';

type AppState = 'idle' | 'analyzing' | 'ready' | 'processing' | 'done';

export default function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [status, setStatus] = useState<AppState>('idle');
  const [analyses, setAnalyses] = useState<Record<string, AudioAnalysis>>({});
  
  const [preset, setPreset] = useState<Preset>('youtube_rap');
  const [intensity, setIntensity] = useState<number>(50);
  const [aiHumanization, setAiHumanization] = useState(true);
  
  const [bassSettings, setBassSettings] = useState<BassSettings>({
    impact: 'Heavy',
    punch: 'Tight',
    weight: 'Deep',
    clubSafe: true,
    phoneSafe: true
  });

  const [progress, setProgress] = useState({ current: 0, total: 0, currentFileProgress: 0, stage: '' });
  const [results, setResults] = useState<Record<string, { originalUrl: string, processedUrl: string }>>({});
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTrack, setActiveTrack] = useState<'original' | 'processed'>('processed');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = async (newFiles: File[]) => {
    const audioFiles = newFiles.filter(f => f.type.startsWith('audio/'));
    if (audioFiles.length === 0) return;
    
    setFiles(audioFiles);
    setStatus('analyzing');
    setSelectedFileIndex(0);
    
    const newAnalyses: Record<string, AudioAnalysis> = {};
    for (const file of audioFiles) {
      try {
        newAnalyses[file.name] = await analyzeAudio(file);
      } catch (e) {
        console.error("Analysis failed for", file.name);
      }
    }
    setAnalyses(newAnalyses);
    setStatus('ready');
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    setStatus('processing');
    setProgress({ current: 0, total: files.length, currentFileProgress: 0, stage: 'Initializing...' });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const { processedWav } = await processAudio(file, preset, intensity, bassSettings, (p, stage) => {
          setProgress({ current: i, total: files.length, currentFileProgress: p, stage });
        });
        
        setResults(prev => ({
          ...prev,
          [file.name]: {
            originalUrl: URL.createObjectURL(file),
            processedUrl: URL.createObjectURL(processedWav)
          }
        }));
      } catch (error) {
        console.error(`Processing failed for ${file.name}`, error);
      }
    }
    
    setStatus('done');
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const previousTrackRef = useRef<number>(selectedFileIndex);

  useEffect(() => {
    const selectedResult = files[selectedFileIndex] ? results[files[selectedFileIndex].name] : null;
    
    if (audioRef.current && selectedResult) {
      const targetUrl = activeTrack === 'original' ? selectedResult.originalUrl : selectedResult.processedUrl;
      
      if (audioRef.current.src !== targetUrl) {
        const isTrackChange = previousTrackRef.current !== selectedFileIndex;
        previousTrackRef.current = selectedFileIndex;

        const wasPlaying = !audioRef.current.paused && !audioRef.current.ended;
        const currentTime = isTrackChange ? 0 : audioRef.current.currentTime;
        
        audioRef.current.src = targetUrl;
        audioRef.current.load();
        
        audioRef.current.oncanplay = () => {
          if (audioRef.current) {
            audioRef.current.currentTime = currentTime;
            if (wasPlaying) {
              audioRef.current.play().catch(console.error);
            }
          }
          if (audioRef.current) audioRef.current.oncanplay = null;
        };
      }
    }
  }, [activeTrack, selectedFileIndex, results, files]);

  const selectedFile = files[selectedFileIndex];
  const selectedAnalysis = selectedFile ? analyses[selectedFile.name] : null;
  const selectedResult = selectedFile ? results[selectedFile.name] : null;

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-200 flex flex-col font-sans">
      {/* Header */}
      <header className="h-16 border-b border-white/5 bg-[#0a0a0a] flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <Waves className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="font-bold text-white leading-none">Pro Master</h1>
            <p className="text-[10px] text-emerald-500 font-mono tracking-widest uppercase mt-1">Hip-Hop Edition</p>
          </div>
        </div>
        {status === 'done' && (
          <div className="flex items-center gap-3">
            <button onClick={() => {
              Object.entries(results).forEach(([filename, res]: [string, any]) => {
                const a = document.createElement('a');
                a.href = res.processedUrl;
                a.download = `${filename.split('.')[0]}_Master.wav`;
                a.click();
              });
            }} className="px-4 py-1.5 bg-emerald-500 text-black text-sm font-medium rounded-lg hover:bg-emerald-400 transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" /> Download All
            </button>
            <button onClick={() => {
              setFiles([]);
              setStatus('idle');
              setResults({});
              setAnalyses({});
            }} className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-lg transition-colors">
              New Session
            </button>
          </div>
        )}
      </header>

      {status === 'idle' ? (
        <main className="flex-1 flex items-center justify-center p-8">
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className="w-full max-w-2xl p-20 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors cursor-pointer bg-[#0a0a0a]"
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <input id="file-upload" type="file" accept="audio/*" multiple className="hidden" onChange={handleFileInput} />
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
              <Upload className="w-10 h-10 text-emerald-500" />
            </div>
            <h3 className="text-2xl font-medium text-white mb-2">Drop your tracks here</h3>
            <p className="text-zinc-500 mb-8 max-w-md">Upload single or multiple mixes (MP3/WAV). We'll analyze and master them all intelligently.</p>
            <button className="px-8 py-3 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 transition-colors">
              Browse Files
            </button>
          </div>
        </main>
      ) : (
        <main className="flex-1 flex overflow-hidden">
          {/* Left: Track Queue */}
          <div className="w-80 border-r border-white/5 bg-[#0a0a0a] flex flex-col">
            <div className="p-4 border-b border-white/5">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Track Queue ({files.length})</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {files.map((f, i) => {
                const isProcessed = !!results[f.name];
                const isAnalyzing = status === 'analyzing' && !analyses[f.name];
                const isProcessing = status === 'processing' && progress.current === i;
                
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedFileIndex(i)}
                    className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-colors ${
                      selectedFileIndex === i ? 'bg-emerald-500/10 border border-emerald-500/20' : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    {isProcessed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : isAnalyzing || isProcessing ? (
                      <Loader2 className="w-4 h-4 text-emerald-500 animate-spin shrink-0" />
                    ) : (
                      <FileAudio className="w-4 h-4 text-zinc-500 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${selectedFileIndex === i ? 'text-emerald-400 font-medium' : 'text-zinc-300'}`}>{f.name}</p>
                      <p className="text-[10px] text-zinc-500 font-mono">
                        {isProcessed ? 'Mastered' : isProcessing ? `${progress.currentFileProgress}%` : isAnalyzing ? 'Analyzing...' : 'Ready'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            {status === 'processing' && (
              <div className="p-4 border-t border-white/5 bg-black/20">
                <div className="flex justify-between text-xs font-mono text-zinc-400 mb-2">
                  <span>Overall Progress</span>
                  <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
                </div>
              </div>
            )}
            {(status === 'ready' || status === 'done') && (
              <div className="p-4 border-t border-white/5">
                <button
                  onClick={handleProcess}
                  disabled={status === 'done'}
                  className={`w-full py-3 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors ${
                    status === 'done' ? 'bg-white/5 text-zinc-500 cursor-not-allowed' : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                  }`}
                >
                  {status === 'done' ? 'Mastering Complete' : 'Start Professional Mastering'}
                </button>
              </div>
            )}
          </div>

          {/* Center: Controls */}
          <div className="flex-1 overflow-y-auto p-8 bg-[#050505]">
            <div className="max-w-2xl mx-auto space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Global Mastering Profile</h2>
                <p className="text-zinc-400 text-sm">Configure once. AI adapts these settings per track.</p>
              </div>

              {/* Mastering Intent */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4" /> Mastering Intent
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'youtube_rap', icon: Radio, name: 'YouTube Rap', desc: 'Slight bass emphasis' },
                    { id: 'club_bass', icon: Speaker, name: 'Club / Car Bass', desc: 'Aggressive limiter' },
                    { id: 'tiktok_trap', icon: Smartphone, name: 'TikTok Trap', desc: 'Mid-forward, punchy' },
                    { id: 'high_res', icon: Waves, name: 'High-Res Archive', desc: 'Preserved dynamics' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPreset(p.id as Preset)}
                      disabled={status === 'processing' || status === 'done'}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        preset === p.id ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-[#0a0a0a] border-white/5 hover:border-white/20'
                      } ${(status === 'processing' || status === 'done') ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-3 mb-1">
                        <p.icon className={`w-4 h-4 ${preset === p.id ? 'text-emerald-400' : 'text-zinc-500'}`} />
                        <span className={`font-medium text-sm ${preset === p.id ? 'text-emerald-400' : 'text-zinc-200'}`}>{p.name}</span>
                      </div>
                      <p className="text-xs text-zinc-500">{p.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 808 Authority Engine */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                  <Speaker className="w-4 h-4" /> 808 Authority Engine
                </h3>
                <div className="bg-[#0a0a0a] rounded-xl border border-white/5 p-5 space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Impact</label>
                      <select 
                        value={bassSettings.impact} 
                        onChange={(e) => setBassSettings({...bassSettings, impact: e.target.value as any})}
                        disabled={status === 'processing' || status === 'done'}
                        className="w-full bg-black border border-white/10 rounded-lg p-2 text-sm text-white focus:border-emerald-500 outline-none disabled:opacity-50"
                      >
                        <option>Soft</option><option>Heavy</option><option>Savage</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Shape</label>
                      <select 
                        value={bassSettings.punch} 
                        onChange={(e) => setBassSettings({...bassSettings, punch: e.target.value as any})}
                        disabled={status === 'processing' || status === 'done'}
                        className="w-full bg-black border border-white/10 rounded-lg p-2 text-sm text-white focus:border-emerald-500 outline-none disabled:opacity-50"
                      >
                        <option>Short</option><option>Tight</option><option>Long</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Sub Weight</label>
                      <select 
                        value={bassSettings.weight} 
                        onChange={(e) => setBassSettings({...bassSettings, weight: e.target.value as any})}
                        disabled={status === 'processing' || status === 'done'}
                        className="w-full bg-black border border-white/10 rounded-lg p-2 text-sm text-white focus:border-emerald-500 outline-none disabled:opacity-50"
                      >
                        <option>Low</option><option>Balanced</option><option>Deep</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-4 pt-4 border-t border-white/5">
                    <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                      <input type="checkbox" checked={bassSettings.clubSafe} onChange={(e) => setBassSettings({...bassSettings, clubSafe: e.target.checked})} disabled={status === 'processing' || status === 'done'} className="accent-emerald-500" />
                      Mono bass below 120Hz
                    </label>
                    <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                      <input type="checkbox" checked={bassSettings.phoneSafe} onChange={(e) => setBassSettings({...bassSettings, phoneSafe: e.target.checked})} disabled={status === 'processing' || status === 'done'} className="accent-emerald-500" />
                      Phone speaker safe
                    </label>
                  </div>
                </div>
              </div>

              {/* Intensity & AI */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0a0a0a] rounded-xl border border-white/5 p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Intensity</label>
                    <span className="text-xs font-mono text-emerald-500">{intensity}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="100" value={intensity} 
                    onChange={(e) => setIntensity(parseInt(e.target.value))}
                    disabled={status === 'processing' || status === 'done'}
                    className="w-full accent-emerald-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                  />
                </div>
                <div className="bg-[#0a0a0a] rounded-xl border border-white/5 p-5 flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5" /> AI Humanization
                    </label>
                    <p className="text-[10px] text-zinc-500 mt-1">Restores micro-dynamics</p>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${aiHumanization ? 'bg-emerald-500' : 'bg-zinc-700'} ${status === 'processing' || status === 'done' ? 'opacity-50 pointer-events-none' : ''}`} onClick={() => setAiHumanization(!aiHumanization)}>
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${aiHumanization ? 'left-6' : 'left-1'}`} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Meters & Analysis */}
          <div className="w-80 border-l border-white/5 bg-[#0a0a0a] flex flex-col">
            <div className="p-4 border-b border-white/5">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Track Analysis
              </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {status === 'analyzing' && !selectedAnalysis ? (
                <div className="flex flex-col items-center justify-center h-40 text-zinc-500 space-y-3">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                  <span className="text-sm font-mono">Analyzing track...</span>
                </div>
              ) : selectedAnalysis ? (
                <>
                  {/* Meters */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-400">Loudness</span>
                        <span className={`font-mono ${selectedAnalysis.lufs < -16 ? 'text-yellow-400' : 'text-emerald-400'}`}>{selectedAnalysis.lufs.toFixed(1)} LUFS</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full ${selectedAnalysis.lufs < -16 ? 'bg-yellow-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, Math.max(0, (selectedAnalysis.lufs + 24) / 16 * 100))}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-400">True Peak</span>
                        <span className={`font-mono ${selectedAnalysis.truePeak > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{selectedAnalysis.truePeak > 0 ? '+' : ''}{selectedAnalysis.truePeak.toFixed(1)} dBTP</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full ${selectedAnalysis.truePeak > 0 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, Math.max(0, (selectedAnalysis.truePeak + 6) / 8 * 100))}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    {selectedAnalysis.clipping && (
                      <span className="px-2 py-1 bg-red-500/10 text-red-400 text-[10px] font-semibold uppercase rounded border border-red-500/20">Clipping</span>
                    )}
                    {selectedAnalysis.aiArtifacts && (
                      <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 text-[10px] font-semibold uppercase rounded border border-yellow-500/20">AI Artifacts</span>
                    )}
                    <span className="px-2 py-1 bg-white/5 text-zinc-300 text-[10px] font-semibold uppercase rounded border border-white/10">{selectedAnalysis.bassBalance} Bass</span>
                  </div>

                  {/* A/B Player (if done) */}
                  {selectedResult && (
                    <div className="bg-black/40 rounded-xl p-4 border border-white/5 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-500 uppercase">A/B Listen</span>
                        <div className="flex bg-black rounded p-0.5 border border-white/10">
                          <button onClick={() => setActiveTrack('original')} className={`px-2 py-1 text-[10px] font-medium rounded-sm ${activeTrack === 'original' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>Orig</button>
                          <button onClick={() => setActiveTrack('processed')} className={`px-2 py-1 text-[10px] font-medium rounded-sm ${activeTrack === 'processed' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-500'}`}>Master</button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={togglePlayback} className="w-8 h-8 bg-emerald-500 text-black rounded-full flex items-center justify-center hover:bg-emerald-400 shrink-0">
                          {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
                        </button>
                        <div className="flex-1 h-8 bg-black/60 rounded border border-white/5 flex items-center px-2 overflow-hidden relative">
                           <div className="absolute inset-0 flex items-center gap-[2px] px-2 opacity-70">
                              {Array.from({ length: 30 }).map((_, i) => (
                                <div key={i} className={`w-full rounded-full ${activeTrack === 'processed' ? 'bg-emerald-500' : 'bg-zinc-600'}`} style={{ height: `${activeTrack === 'processed' ? 40 + Math.random() * 40 : 20 + Math.random() * 60}%` }} />
                              ))}
                           </div>
                        </div>
                      </div>
                      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} onPause={() => setIsPlaying(false)} onPlay={() => setIsPlaying(true)} />
                      
                      <a href={selectedResult.processedUrl} download={`${selectedFile?.name.split('.')[0]}_Master.wav`} className="w-full py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-medium rounded-lg flex items-center justify-center gap-2 transition-colors">
                        <Download className="w-3.5 h-3.5" /> Download Track
                      </a>
                    </div>
                  )}

                  {/* Issues & Fixes */}
                  {!selectedResult && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Detected Issues</h4>
                        <ul className="space-y-1.5">
                          {selectedAnalysis.issues.map((issue, i) => (
                            <li key={i} className="text-xs text-zinc-400 flex items-start gap-2">
                              <span className="text-yellow-500 mt-0.5">•</span> {issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Auto-Fix Strategy</h4>
                        <ul className="space-y-1.5">
                          {selectedAnalysis.fixes.map((fix, i) => (
                            <li key={i} className="text-xs text-zinc-400 flex items-start gap-2">
                              <span className="text-emerald-500 mt-0.5">•</span> {fix}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-40 text-zinc-600 text-sm">
                  Select a track to view analysis
                </div>
              )}
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
