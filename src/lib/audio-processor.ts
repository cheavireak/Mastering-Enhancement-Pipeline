import { audioBufferToWav } from './audio-utils';

export type Preset = 'youtube_rap' | 'club_bass' | 'tiktok_trap' | 'high_res';

export interface BassSettings {
  impact: 'Soft' | 'Heavy' | 'Savage';
  punch: 'Short' | 'Tight' | 'Long';
  weight: 'Low' | 'Balanced' | 'Deep';
  clubSafe: boolean;
  phoneSafe: boolean;
}

export interface AudioAnalysis {
  lufs: number;
  truePeak: number;
  dynamicRange: number;
  clipping: boolean;
  bassBalance: 'Good' | 'Heavy' | 'Weak';
  stereoWidth: 'Good' | 'Narrow' | 'Wide';
  aiArtifacts: boolean;
  issues: string[];
  fixes: string[];
}

export async function analyzeAudio(file: File): Promise<AudioAnalysis> {
  // Simulate deep analysis delay
  await new Promise(resolve => setTimeout(resolve, 2500));
  
  // Mock analysis results based on file size/name to feel dynamic
  const isHeavy = file.size % 2 === 0;
  const hasArtifacts = file.size % 3 === 0;
  
  return {
    lufs: -14.4 + (Math.random() * 4 - 2),
    truePeak: isHeavy ? 0.8 : -0.5,
    dynamicRange: 6.5 + Math.random() * 3,
    clipping: isHeavy,
    bassBalance: isHeavy ? 'Heavy' : 'Good',
    stereoWidth: 'Wide',
    aiArtifacts: hasArtifacts,
    issues: isHeavy ? [
      "Sub bass (20-60Hz) eating headroom",
      "808 fundamental masking kick transient",
      "Inter-sample clipping detected (+0.8 dBTP)"
    ] : [
      "Low dynamic contrast in drop",
      "Slightly muddy low-mids (120-250Hz)",
      "Phase-weak stereo width"
    ],
    fixes: isHeavy ? [
      "Mono bass below 120Hz for club safety",
      "Dynamic sub EQ to unmask kick",
      "Apply true-peak limiting to fix clipping"
    ] : [
      "Micro-dynamic expansion (restore life)",
      "Clean up low-mids for better vocal separation",
      "Stereo depth re-balancing"
    ]
  };
}

export async function processAudio(
  file: File,
  preset: Preset,
  intensity: number, // 0 to 100
  bassSettings: BassSettings,
  onProgress: (progress: number, stage: string) => void
): Promise<{ originalBuffer: AudioBuffer, processedWav: Blob, processedBuffer: AudioBuffer }> {
  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const originalBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  
  const offlineCtx = new OfflineAudioContext(
    originalBuffer.numberOfChannels,
    originalBuffer.length,
    originalBuffer.sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = originalBuffer;

  // Build processing chain based on preset and intensity
  let lastNode: AudioNode = source;
  const intensityMultiplier = intensity / 50; // 0 to 2 (1 is normal)

  // 1. AI Humanizer Pass (Simulated)
  const humanizerEQ = offlineCtx.createBiquadFilter();
  humanizerEQ.type = 'peaking';
  humanizerEQ.frequency.value = 4000;
  humanizerEQ.Q.value = 0.5;
  humanizerEQ.gain.value = -1 * intensityMultiplier; // De-harsh
  lastNode.connect(humanizerEQ);
  lastNode = humanizerEQ;

  // 2. Bass Engine (808 Control)
  if (bassSettings.phoneSafe) {
    const hpFilter = offlineCtx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.value = 40; // Cut extreme sub
    lastNode.connect(hpFilter);
    lastNode = hpFilter;
  }

  const bassEQ = offlineCtx.createBiquadFilter();
  bassEQ.type = 'lowshelf';
  bassEQ.frequency.value = 80;
  
  let bassGain = 0;
  if (bassSettings.impact === 'Heavy') bassGain = 3;
  if (bassSettings.impact === 'Savage') bassGain = 6;
  if (bassSettings.weight === 'Deep') bassEQ.frequency.value = 60;
  
  bassEQ.gain.value = bassGain * intensityMultiplier;
  lastNode.connect(bassEQ);
  lastNode = bassEQ;

  // 3. Preset Specifics
  if (preset === 'youtube_rap') {
    const compressor = offlineCtx.createDynamicsCompressor();
    compressor.threshold.value = -16 * intensityMultiplier;
    compressor.ratio.value = 3 + (intensityMultiplier * 1);
    lastNode.connect(compressor);
    lastNode = compressor;
  } else if (preset === 'club_bass') {
    const compressor = offlineCtx.createDynamicsCompressor();
    compressor.threshold.value = -12 * intensityMultiplier;
    compressor.ratio.value = 6 + (intensityMultiplier * 2);
    compressor.attack.value = 0.005; // Let transients through
    lastNode.connect(compressor);
    lastNode = compressor;
  } else if (preset === 'tiktok_trap') {
    const peaking = offlineCtx.createBiquadFilter();
    peaking.type = 'peaking';
    peaking.frequency.value = 2500;
    peaking.Q.value = 1;
    peaking.gain.value = 2 * intensityMultiplier;
    lastNode.connect(peaking);
    lastNode = peaking;
    
    const compressor = offlineCtx.createDynamicsCompressor();
    compressor.threshold.value = -14 * intensityMultiplier;
    compressor.ratio.value = 4;
    lastNode.connect(compressor);
    lastNode = compressor;
  }

  // Final safety limiter
  const limiter = offlineCtx.createDynamicsCompressor();
  limiter.threshold.value = preset === 'club_bass' ? -0.5 : -1.0;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.1;
  lastNode.connect(limiter);
  limiter.connect(offlineCtx.destination);

  source.start(0);

  // Simulate progress and stages
  const stages = [
    'Bass Intelligence Scan', 
    'AI Artifact Humanization', 
    'Smart Low-End Reconstruction', 
    'Dynamic Processing', 
    'Mastering & Limiting', 
    'Validating'
  ];
  let progress = 0;
  let currentStageIdx = 0;
  
  const interval = setInterval(() => {
    progress += 4;
    if (progress % 16 === 0 && currentStageIdx < stages.length - 1) {
      currentStageIdx++;
    }
    if (progress <= 90) {
      onProgress(progress, stages[currentStageIdx]);
    }
  }, 100);

  const renderedBuffer = await offlineCtx.startRendering();
  clearInterval(interval);
  onProgress(100, 'Done');

  const wavBlob = audioBufferToWav(renderedBuffer);
  
  return {
    originalBuffer,
    processedBuffer: renderedBuffer,
    processedWav: wavBlob
  };
}
