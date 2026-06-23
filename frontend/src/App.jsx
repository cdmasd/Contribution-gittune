import React, { useState, useRef, useEffect } from 'react';
import { FetchContributions, GenerateAndPlayMusic } from '../wailsjs/go/main/App';
import ContributionGrid from './components/ContributionGrid';
import WaveformVisualizer from './components/WaveformVisualizer';

function App() {
  const [username, setUsername] = useState('');
  const [contributions, setContributions] = useState(null);
  const [audioBase64, setAudioBase64] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingWeekIndex, setPlayingWeekIndex] = useState(-1);
  const [analyser, setAnalyser] = useState(null);
  
  const audioCtxRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const startTimeRef = useRef(0);
  const rafRef = useRef(null);

  const CHORD_DURATION = 0.120; // 120ms per chord

  const validateUsername = (name) => {
    if (!name) return "Username cannot be empty";
    if (name.length > 39) return "Username is too long (max 39 characters)";
    if (!/^[a-zA-Z0-9-]+$/.test(name)) return "Username can only contain alphanumeric characters and hyphens";
    if (name.startsWith('-') || name.endsWith('-')) return "Username cannot begin or end with a hyphen";
    if (name.includes('--')) return "Username cannot have multiple consecutive hyphens";
    return null;
  };

  const fetchGraph = async () => {
    if (!username) return;

    const validationError = validateUsername(username);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    setContributions(null);
    setAudioBase64(null);
    setIsPlaying(false);
    setPlayingWeekIndex(-1);
    stopAudio();

    try {
      const data = await FetchContributions(username);
      setContributions(data);
      
      const wavBase64 = await GenerateAndPlayMusic(data);
      setAudioBase64(wavBase64);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) {}
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setIsPlaying(false);
    setPlayingWeekIndex(-1);
  };

  const playAudio = async () => {
    if (!audioBase64) return;
    if (isPlaying) {
      stopAudio();
      return;
    }

    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    
    // Ensure context is running (fixes autoplay policy issues sometimes)
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    try {
      // Decode base64 to array buffer
      const binaryString = window.atob(audioBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const audioBuffer = await ctx.decodeAudioData(bytes.buffer);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 2048;
      
      source.connect(analyserNode);
      analyserNode.connect(ctx.destination);
      
      setAnalyser(analyserNode);

      source.onended = () => {
        setIsPlaying(false);
        setPlayingWeekIndex(-1);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };

      sourceNodeRef.current = source;
      startTimeRef.current = ctx.currentTime;
      source.start(0);
      setIsPlaying(true);

      const trackProgress = () => {
        if (!sourceNodeRef.current) return;
        const elapsed = ctx.currentTime - startTimeRef.current;
        const currentWeek = Math.floor(elapsed / CHORD_DURATION);
        if (currentWeek < 52) {
          setPlayingWeekIndex(currentWeek);
          rafRef.current = requestAnimationFrame(trackProgress);
        }
      };
      rafRef.current = requestAnimationFrame(trackProgress);

    } catch (err) {
      console.error('Failed to play audio:', err);
      setError('Failed to play audio');
    }
  };

  const downloadWav = () => {
    if (!audioBase64) return;
    const binaryString = window.atob(audioBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `${username}_gitune.wav`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center py-8 font-sans">
      
      <div className="w-full max-w-4xl px-4 border border-gray-700 rounded-xl bg-gray-800/50 shadow-2xl overflow-hidden pb-8">
        
        <div className="border-b border-gray-700 py-6 mb-6 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-green-400">gitune</h1>
          <p className="text-gray-400 mt-2 font-medium tracking-wide">"your github, as music"</p>
        </div>

        <div className="flex flex-col items-center space-y-6">
          <div className="flex space-x-2 w-full max-w-md">
            <input 
              type="text" 
              placeholder="github username..." 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchGraph()}
              className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-colors"
            />
            <button 
              onClick={fetchGraph} 
              disabled={loading}
              className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center min-w-[80px]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : 'Fetch'}
            </button>
          </div>

          {error && <div className="text-red-400 bg-red-900/30 px-4 py-2 rounded-lg">{error}</div>}

          <div className="w-full overflow-x-auto bg-gray-900 rounded-xl border border-gray-700 p-4">
            <ContributionGrid contributions={contributions} playingWeekIndex={playingWeekIndex} />
          </div>

          <WaveformVisualizer analyser={analyser} />

          {audioBase64 && (
            <div className="flex flex-col items-center space-y-4 w-full">
              <div className="flex space-x-4">
                <button 
                  onClick={playAudio}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform transform hover:scale-105 active:scale-95 flex items-center space-x-2"
                >
                  <span>{isPlaying ? '⏸ Stop' : '▶ Play'}</span>
                </button>
                <button 
                  onClick={downloadWav}
                  className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-transform transform hover:scale-105 active:scale-95 flex items-center space-x-2"
                >
                  <span>⬇ Download WAV</span>
                </button>
              </div>
              
              <div className="h-6 text-gray-400 font-mono text-sm">
                {isPlaying && playingWeekIndex >= 0 && (
                  <span>playing week {Math.min(playingWeekIndex + 1, 52)}/52...</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}

export default App;
