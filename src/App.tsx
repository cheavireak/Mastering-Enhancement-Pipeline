import React, { useState, useRef, useEffect } from 'react';
import { Upload, Settings, Play, Square, Download, Activity, Sliders, CheckCircle2, Loader2, Music, Pause } from 'lucide-react';
import { processAudio, Preset } from './lib/audio-processor';

type AppState = 'idle' | 'analyzing' | 'ready' | 'processing' | 'done';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<AppState>('idle');
  const [preset, setPreset] = useState<Preset>('clean');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ originalUrl: string, processedUrl: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTrack, setActiveTrack] = useState<'original' | 'processed'>('processed');
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('audio/')) {
      handleFileSelect(droppedFile);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setStatus('analyzing');
    // Simulate analysis
    setTimeout(() => {
      setStatus('ready');
    }, 1500);
  };

  const handleProcess = async () => {
    if (!file) return;
    setStatus('processing');
    setProgress(0);

    try {
      const { processedWav } = await processAudio(file, preset, (p) => setProgress(p));
      
      const originalUrl = URL.createObjectURL(file);
      const processedUrl = URL.createObjectURL(processedWav);
      
      setResults({ originalUrl, processedUrl });
      setStatus('done');
    } catch (error) {
      console.error("Processing failed", error);
      setStatus('ready');
      alert("Failed to process audio.");
    }
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

  useEffect(() => {
    if (audioRef.current && results) {
      const wasPlaying = !audioRef.current.paused;
      const currentTime = audioRef.current.currentTime;
      
      audioRef.current.src = activeTrack === 'original' ? results.originalUrl : results.processedUrl;
      audioRef.current.currentTime = currentTime;
      
      if (wasPlaying) {
        audioRef.current.play();
      }
    }
  }, [activeTrack, results]);

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-3xl space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-white flex items-center justify-center gap-3">
            <Activity className="w-8 h-8 text-emerald-500" />
            Pro Audio Enhancer
          </h1>
          <p className="text-zinc-400 font-mono text-sm">AI-Powered Mastering & Enhancement Pipeline</p>
        </div>

        {/* Main Card */}
        <div className="bg-[#111111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          
          {/* Upload State */}
          {status === 'idle' && (
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className="p-12 border-2 border-dashed border-white/10 m-6 rounded-xl flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors cursor-pointer"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <input 
                id="file-upload" 
                type="file" 
                accept="audio/*" 
                className="hidden" 
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
              <Upload className="w-12 h-12 text-zinc-500 mb-4" />
              <h3 className="text-lg font-medium text-zinc-200 mb-1">Drop your audio file here</h3>
              <p className="text-sm text-zinc-500">Supports MP3, WAV, AAC up to 50MB</p>
            </div>
          )}

          {/* Analyzing State */}
          {status === 'analyzing' && (
            <div className="p-16 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
              <div className="text-center">
                <h3 className="text-lg font-medium text-zinc-200">Analyzing Audio Fingerprint</h3>
                <p className="text-sm text-zinc-500 font-mono mt-2">Computing LUFS, True Peak, and Spectral Balance...</p>
              </div>
            </div>
          )}

          {/* Ready & Settings State */}
          {(status === 'ready' || status === 'processing') && (
            <div className="p-6 space-y-8">
              {/* File Info */}
              <div className="flex items-center gap-4 p-4 bg-black/40 rounded-xl border border-white/5">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                  <Music className="w-6 h-6 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">{file?.name}</p>
                  <p className="text-xs text-zinc-500 font-mono">{(file?.size || 0) / 1024 / 1024 | 0} MB • Ready for processing</p>
                </div>
              </div>

              {/* Presets */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4" />
                  Processing Chain Preset
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'clean', name: 'Clean & Hi-Fi', desc: 'Light denoise, dynamic EQ, gentle glue' },
                    { id: 'club', name: 'Club Loud', desc: 'Low-end control, saturation, strong limiter' },
                    { id: 'vocal', name: 'Vocal Pop', desc: 'De-ess, presence EQ, vocal comp' },
                    { id: 'bass', name: 'Bass Boost++', desc: 'Smart sub harmonic, bass limiter' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPreset(p.id as Preset)}
                      disabled={status === 'processing'}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        preset === p.id 
                          ? 'bg-emerald-500/10 border-emerald-500/50' 
                          : 'bg-black/20 border-white/5 hover:border-white/20'
                      } ${status === 'processing' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-medium ${preset === p.id ? 'text-emerald-400' : 'text-zinc-200'}`}>
                          {p.name}
                        </span>
                        {preset === p.id && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      </div>
                      <p className="text-xs text-zinc-500">{p.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action */}
              <div className="pt-4">
                {status === 'processing' ? (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm font-mono text-zinc-400">
                      <span>Applying DSP Chain...</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 bg-black rounded-full overflow-hidden border border-white/10">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleProcess}
                    className="w-full py-4 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <Settings className="w-5 h-5" />
                    Start Processing
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Done State */}
          {status === 'done' && results && (
            <div className="p-8 space-y-8">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-semibold text-white">Enhancement Complete</h2>
                <p className="text-zinc-400 text-sm">Your audio has been processed successfully.</p>
              </div>

              {/* A/B Player */}
              <div className="bg-black/40 rounded-xl p-6 border border-white/5 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">A/B Comparison</h3>
                  <div className="flex bg-black rounded-lg p-1 border border-white/10">
                    <button
                      onClick={() => setActiveTrack('original')}
                      className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                        activeTrack === 'original' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      Original
                    </button>
                    <button
                      onClick={() => setActiveTrack('processed')}
                      className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                        activeTrack === 'processed' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      Enhanced
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={togglePlayback}
                    className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:bg-zinc-200 transition-colors shrink-0"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
                  </button>
                  <div className="flex-1 h-12 bg-black/50 rounded-lg border border-white/5 flex items-center px-4 overflow-hidden relative">
                     {/* Fake waveform visualization */}
                     <div className="absolute inset-0 flex items-center gap-[2px] px-2 opacity-50">
                        {Array.from({ length: 50 }).map((_, i) => (
                          <div 
                            key={i} 
                            className={`w-full rounded-full ${activeTrack === 'processed' ? 'bg-emerald-500' : 'bg-zinc-500'}`}
                            style={{ height: `${20 + Math.random() * 60}%`, transition: 'all 0.3s ease' }}
                          />
                        ))}
                     </div>
                  </div>
                </div>
                
                <audio 
                  ref={audioRef} 
                  src={results.processedUrl} 
                  onEnded={() => setIsPlaying(false)}
                  onPause={() => setIsPlaying(false)}
                  onPlay={() => setIsPlaying(true)}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setFile(null);
                    setStatus('idle');
                    setResults(null);
                    setIsPlaying(false);
                  }}
                  className="flex-1 py-3 bg-black border border-white/10 text-white font-medium rounded-xl hover:bg-white/5 transition-colors"
                >
                  Process Another
                </button>
                <a
                  href={results.processedUrl}
                  download={`enhanced_${file?.name || 'audio.wav'}`}
                  className="flex-1 py-3 bg-emerald-500 text-black font-semibold rounded-xl hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download WAV
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
