import { audioBufferToWav } from './audio-utils';

export type Preset = 'clean' | 'club' | 'vocal' | 'bass';

export async function processAudio(
  file: File,
  preset: Preset,
  onProgress: (progress: number) => void
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

  // Build processing chain
  let lastNode: AudioNode = source;

  if (preset === 'clean') {
    // High-pass to remove rumble
    const hpFilter = offlineCtx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.value = 30;
    lastNode.connect(hpFilter);
    lastNode = hpFilter;

    // Gentle compression
    const compressor = offlineCtx.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 30;
    compressor.ratio.value = 2;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;
    lastNode.connect(compressor);
    lastNode = compressor;
    
    // Slight air
    const highShelf = offlineCtx.createBiquadFilter();
    highShelf.type = 'highshelf';
    highShelf.frequency.value = 10000;
    highShelf.gain.value = 2;
    lastNode.connect(highShelf);
    lastNode = highShelf;

  } else if (preset === 'club') {
    // Low-shelf boost
    const lowShelf = offlineCtx.createBiquadFilter();
    lowShelf.type = 'lowshelf';
    lowShelf.frequency.value = 100;
    lowShelf.gain.value = 4;
    lastNode.connect(lowShelf);
    lastNode = lowShelf;

    // Hard compression / Limiter
    const compressor = offlineCtx.createDynamicsCompressor();
    compressor.threshold.value = -12;
    compressor.knee.value = 0;
    compressor.ratio.value = 10;
    compressor.attack.value = 0.001;
    compressor.release.value = 0.1;
    lastNode.connect(compressor);
    lastNode = compressor;
    
    // Make-up gain
    const gain = offlineCtx.createGain();
    gain.gain.value = 1.5;
    lastNode.connect(gain);
    lastNode = gain;

  } else if (preset === 'vocal') {
    // Mid boost
    const peaking = offlineCtx.createBiquadFilter();
    peaking.type = 'peaking';
    peaking.frequency.value = 3000;
    peaking.Q.value = 1;
    peaking.gain.value = 3;
    lastNode.connect(peaking);
    lastNode = peaking;

    // De-mud
    const demud = offlineCtx.createBiquadFilter();
    demud.type = 'peaking';
    demud.frequency.value = 300;
    demud.Q.value = 1;
    demud.gain.value = -2;
    lastNode.connect(demud);
    lastNode = demud;

    const compressor = offlineCtx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.ratio.value = 3;
    lastNode.connect(compressor);
    lastNode = compressor;

  } else if (preset === 'bass') {
    const lowShelf = offlineCtx.createBiquadFilter();
    lowShelf.type = 'lowshelf';
    lowShelf.frequency.value = 80;
    lowShelf.gain.value = 6;
    lastNode.connect(lowShelf);
    lastNode = lowShelf;
    
    const compressor = offlineCtx.createDynamicsCompressor();
    compressor.threshold.value = -10;
    compressor.ratio.value = 4;
    lastNode.connect(compressor);
    lastNode = compressor;
  }

  // Final safety limiter
  const limiter = offlineCtx.createDynamicsCompressor();
  limiter.threshold.value = -1;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.1;
  lastNode.connect(limiter);
  limiter.connect(offlineCtx.destination);

  source.start(0);

  // Simulate progress since offline rendering is fast but blocks
  let progress = 0;
  const interval = setInterval(() => {
    progress += 10;
    if (progress <= 90) {
      onProgress(progress);
    }
  }, 100);

  const renderedBuffer = await offlineCtx.startRendering();
  clearInterval(interval);
  onProgress(100);

  const wavBlob = audioBufferToWav(renderedBuffer);
  
  return {
    originalBuffer,
    processedBuffer: renderedBuffer,
    processedWav: wavBlob
  };
}
