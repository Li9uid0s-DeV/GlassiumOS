import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Icon } from '../Icon';
import { useOS } from '../OSContext';

interface NoteEvent {
  id: string;
  note: string;
  freq: number;
  time: number; // in seconds from start
  duration: number;
  velocity: number;
}

interface TrackDef {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'piano' | 'rhodes' | 'guitar' | 'lead-guitar' | 'bass' | 'drums' | 'strings' | 'brass' | 'organ' | 'mic' | 'loops';
  volume: number; // 0 to 1
  pan: number; // -1 to 1
  muted: boolean;
  solo: boolean;
  notes: NoteEvent[];
  audioBuffer?: AudioBuffer;
}

export interface InstrumentPreset {
  id: string;
  name: string;
  nameJa: string;
  category: 'keyboard' | 'guitar' | 'bass' | 'drums' | 'strings' | 'brass' | 'vocal';
  icon: string;
  lucideIcon?: string;
  color: string;
  type: 'piano' | 'rhodes' | 'guitar' | 'lead-guitar' | 'bass' | 'drums' | 'strings' | 'brass' | 'organ' | 'mic';
  previewNotes: string[];
  desc: string;
}

const INSTRUMENT_LIBRARY: InstrumentPreset[] = [
  // ピアノ・キーボード
  {
    id: 'piano-grand',
    name: 'Steinway Grand Piano',
    nameJa: 'グランドピアノ',
    category: 'keyboard',
    icon: '🎹',
    lucideIcon: 'Music',
    color: '#38bdf8',
    type: 'piano',
    previewNotes: ['C4', 'E4', 'G4', 'C5'],
    desc: '豊かで透明感のあるクラシック・アコースティックピアノ',
  },
  {
    id: 'piano-rhodes',
    name: 'Classic Rhodes E-Piano',
    nameJa: 'ローズ・エレピ',
    category: 'keyboard',
    icon: '🎹',
    lucideIcon: 'Music',
    color: '#0284c7',
    type: 'rhodes',
    previewNotes: ['D4', 'F#4', 'A4', 'C5'],
    desc: 'ウォームで甘い倍音響くヴィンテージ・エレクトリックピアノ',
  },
  {
    id: 'organ-hammond',
    name: 'B3 Tonewheel Organ',
    nameJa: 'B3 ドローバーオルガン',
    category: 'keyboard',
    icon: '🎹',
    lucideIcon: 'Music',
    color: '#06b6d4',
    type: 'organ',
    previewNotes: ['C4', 'F4', 'A4', 'C5'],
    desc: 'ソウル・ジャズ・ロックに最適な伝統ドローバーオルガン',
  },

  // ギター
  {
    id: 'guitar-acoustic',
    name: 'Acoustic Folk Guitar',
    nameJa: 'アコースティックギター',
    category: 'guitar',
    icon: '🎸',
    lucideIcon: 'Flame',
    color: '#f59e0b',
    type: 'guitar',
    previewNotes: ['E3', 'G3', 'B3', 'E4'],
    desc: '繊細な木目調トーンとアコギのナチュラルフレーズ',
  },
  {
    id: 'guitar-electric',
    name: 'Stratocaster Clean Guitar',
    nameJa: 'クリーン・エレキギター',
    category: 'guitar',
    icon: '🎸',
    lucideIcon: 'Zap',
    color: '#d97706',
    type: 'guitar',
    previewNotes: ['A3', 'C#4', 'E4', 'A4'],
    desc: '透明感あふれるシングルコイルのカッティング・エレキ',
  },
  {
    id: 'guitar-lead',
    name: 'Overdrive Lead Guitar',
    nameJa: 'リード・エレキギター (ドライブ)',
    category: 'guitar',
    icon: '🎸',
    lucideIcon: 'Zap',
    color: '#ef4444',
    type: 'lead-guitar',
    previewNotes: ['E4', 'G4', 'A4', 'B4'],
    desc: 'サステイン豊かなドライブとソロ用ハードロックリード',
  },

  // ベース
  {
    id: 'bass-electric',
    name: 'Precision Bass',
    nameJa: 'プレシジョン・エレキベース',
    category: 'bass',
    icon: '🎸',
    lucideIcon: 'Zap',
    color: '#a855f7',
    type: 'bass',
    previewNotes: ['E2', 'A2', 'D3'],
    desc: 'バンドの骨組みを支える太くタイトなアタックベース',
  },
  {
    id: 'bass-synth',
    name: '808 Sub-Bass Synth',
    nameJa: '808 サブベースシンセ',
    category: 'bass',
    icon: '🔊',
    lucideIcon: 'Radio',
    color: '#9333ea',
    type: 'bass',
    previewNotes: ['C2', 'G2', 'C3'],
    desc: '重低音が響き渡る808トラップ＆クラブ系サブベース',
  },

  // ドラム・パーカッション
  {
    id: 'drums-acoustic',
    name: 'Studio Oak Drum Kit',
    nameJa: 'アコースティックドラム',
    category: 'drums',
    icon: '🥁',
    lucideIcon: 'Grid3x3',
    color: '#f97316',
    type: 'drums',
    previewNotes: ['kick', 'snare', 'hihat'],
    desc: 'リアルな生ドラムのキック・スネア・シンバルキット',
  },
  {
    id: 'drums-808',
    name: '808 Hip-Hop Drum Kit',
    nameJa: '808 ヒップホップドラム',
    category: 'drums',
    icon: '🎛️',
    lucideIcon: 'Grid3x3',
    color: '#ea580c',
    type: 'drums',
    previewNotes: ['kick', 'snare', 'hihat'],
    desc: 'ヒップホップ・R&B定番の808リズムマシン',
  },

  // ストリングス・管楽器
  {
    id: 'strings-chamber',
    name: 'Chamber String Section',
    nameJa: '室内楽ストリングス',
    category: 'strings',
    icon: '🎻',
    lucideIcon: 'Sliders',
    color: '#10b981',
    type: 'strings',
    previewNotes: ['C4', 'G4', 'E5'],
    desc: '美しく重厚に響くヴァイオリン・チェロ合奏セクション',
  },
  {
    id: 'brass-synth',
    name: '80s Synth Brass',
    nameJa: '80s シンセブラス',
    category: 'brass',
    icon: '🎷',
    lucideIcon: 'Volume2',
    color: '#84cc16',
    type: 'brass',
    previewNotes: ['C4', 'E4', 'G4'],
    desc: '80年代ポップスのアッパーで華やかなブラス・セクション',
  },

  // ボーカル
  {
    id: 'vocal-mic',
    name: 'Studio Condenser Mic',
    nameJa: 'スタジオマイク (ボーカル)',
    category: 'vocal',
    icon: '🎤',
    lucideIcon: 'Mic2',
    color: '#ec4899',
    type: 'mic',
    previewNotes: ['C4'],
    desc: 'ボーカル・ナレーション用クリア・オーディオトラック',
  },
];

const NOTE_FREQS: Record<string, number> = {
  C2: 65.41, 'C#2': 69.30, D2: 73.42, 'D#2': 77.78, E2: 82.41, F2: 87.31, 'F#2': 92.50, G2: 98.00, 'G#2': 103.83, A2: 110.00, 'A#2': 116.54, B2: 123.47,
  C3: 130.81, 'C#3': 138.59, D3: 146.83, 'D#3': 155.56, E3: 164.81, F3: 174.61, 'F#3': 185.00, G3: 196.00, 'G#3': 207.65, A3: 220.00, 'A#3': 233.08, B3: 246.94,
  C4: 261.63, 'C#4': 277.18, D4: 293.66, 'D#4': 311.13, E4: 329.63, F4: 349.23, 'F#4': 369.99, G4: 392.00, 'G#4': 415.30, A4: 440.00, 'A#4': 466.16, B4: 493.88,
  C5: 523.25, 'C#5': 554.37, D5: 587.33, 'D#5': 622.25, E5: 659.25, F5: 698.46, 'F#5': 739.99, G5: 783.99, 'G#5': 830.61, A5: 880.00, 'A#5': 932.33, B5: 987.77,
  C6: 1046.50,
};

const PIANO_KEYS = [
  { note: 'C', isBlack: false },
  { note: 'C#', isBlack: true },
  { note: 'D', isBlack: false },
  { note: 'D#', isBlack: true },
  { note: 'E', isBlack: false },
  { note: 'F', isBlack: false },
  { note: 'F#', isBlack: true },
  { note: 'G', isBlack: false },
  { note: 'G#', isBlack: true },
  { note: 'A', isBlack: false },
  { note: 'A#', isBlack: true },
  { note: 'B', isBlack: false },
];

interface DrumPadDef {
  id: string;
  name: string;
  sub: string;
  key: string;
  color: string;
  type: 'kick' | 'snare' | 'hihat' | 'openhat' | 'clap' | 'tom' | '808' | 'crash';
}

const DRUM_PADS: DrumPadDef[] = [
  { id: 'kick', name: 'Kick Drum', sub: 'Deep Punch', key: '1', color: '#ef4444', type: 'kick' },
  { id: 'snare', name: 'Snare Tight', sub: 'Acoustic Crack', key: '2', color: '#f97316', type: 'snare' },
  { id: 'hihat_c', name: 'Closed Hat', sub: 'Crisp Tick', key: '3', color: '#eab308', type: 'hihat' },
  { id: 'hihat_o', name: 'Open Hat', sub: 'Sizzling Sizzle', key: '4', color: '#84cc16', type: 'openhat' },
  { id: 'clap', name: 'Hand Clap', sub: 'Studio Stereo', key: 'Q', color: '#06b6d4', type: 'clap' },
  { id: '808_sub', name: '808 Sub-Bass', sub: 'Low Rumble (C1)', key: 'W', color: '#8b5cf6', type: '808' },
  { id: 'tom_low', name: 'Low Tom', sub: 'Booming Floor', key: 'E', color: '#d946ef', type: 'tom' },
  { id: 'tom_hi', name: 'High Tom', sub: 'Rack Resonance', key: 'R', color: '#ec4899', type: 'tom' },
  { id: 'crash', name: 'Crash Cymbal', sub: 'Splash Decay', key: 'A', color: '#38bdf8', type: 'crash' },
  { id: 'ride', name: 'Ride Bell', sub: 'Brass Ping', key: 'S', color: '#10b981', type: 'hihat' },
  { id: 'rim', name: 'Rimshot', sub: 'Wood Block', key: 'D', color: '#f59e0b', type: 'snare' },
  { id: 'shaker', name: 'Cabasa Shaker', sub: 'Air Groove', key: 'F', color: '#a855f7', type: 'hihat' },
  { id: 'snap', name: 'Finger Snap', sub: 'Dry Snap', key: 'Z', color: '#f43f5e', type: 'clap' },
  { id: 'cowbell', name: '808 Cowbell', sub: 'Classic Funk', key: 'X', color: '#14b8a6', type: 'tom' },
  { id: 'laser', name: 'Laser Zap', sub: 'Synth FX', key: 'C', color: '#6366f1', type: 'crash' },
  { id: 'drop', name: 'Bass Drop', sub: 'Sweep Down', key: 'V', color: '#3b82f6', type: '808' },
];

const LIVE_LOOP_CLIPS = [
  { id: 'l1', name: 'Chill Rhodes Chords', track: 'piano', bars: 2, color: '#38bdf8', notes: ['C4', 'E4', 'G4', 'B4', 'A3', 'C4', 'E4', 'G4'] },
  { id: 'l2', name: 'Lo-Fi BoomBap Beat', track: 'drums', bars: 2, color: '#f59e0b', pattern: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0] },
  { id: 'l3', name: 'Analog Sub Bassline', track: 'bass', bars: 2, color: '#a855f7', notes: ['C2', 'C2', 'G2', 'A#2', 'F2', 'F2', 'G2', 'C2'] },
  { id: 'l4', name: 'Neon Arp Pluck', track: 'strings', bars: 2, color: '#10b981', notes: ['E4', 'G4', 'B4', 'D5', 'C5', 'A4', 'F#4', 'D4'] },
  { id: 'l5', name: 'City Pop Funk Chords', track: 'piano', bars: 2, color: '#ec4899', notes: ['F4', 'A4', 'C5', 'E5', 'G4', 'B4', 'D5', 'F5'] },
  { id: 'l6', name: 'Trap 808 Rolling Hats', track: 'drums', bars: 2, color: '#f97316', pattern: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
  { id: 'l7', name: 'Deep Moog Groove', track: 'bass', bars: 2, color: '#6366f1', notes: ['F2', 'F2', 'G#2', 'C3', 'A#2', 'G#2', 'F2', 'D#2'] },
  { id: 'l8', name: 'Ambient Celestial Strings', track: 'strings', bars: 4, color: '#06b6d4', notes: ['C3', 'G3', 'C4', 'E4', 'G4', 'E4', 'C4', 'G3'] },
];

export function GarageBandApp() {
  const { theme, resolvedAccentHex, saveFile } = useOS();
  const isLight = theme === 'light';

  // Audio Context & Master Graph
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const reverbNodeRef = useRef<ConvolverNode | null>(null);
  const delayNodeRef = useRef<DelayNode | null>(null);
  const delayFeedbackRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Workstation States
  const [bpm, setBpm] = useState<number>(115);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [metronome, setMetronome] = useState<boolean>(false);
  const [playheadSec, setPlayheadSec] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'timeline' | 'piano' | 'drums' | 'loops' | 'sequencer' | 'fx'>('timeline');
  const [selectedTrackId, setSelectedTrackId] = useState<string>('t-piano');

  // Left Sidebar Instrument Library State
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Keyboard States
  const [currentOctave, setCurrentOctave] = useState<number>(4);
  const [sustainPedal, setSustainPedal] = useState<boolean>(false);
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [velocity, setVelocity] = useState<number>(0.85);
  const [pitchBend, setPitchBend] = useState<number>(0);

  // FX Parameters
  const [reverbMix, setReverbMix] = useState<number>(0.35);
  const [delayMix, setDelayMix] = useState<number>(0.25);
  const [distortion, setDistortion] = useState<number>(0.0);
  const [eqLow, setEqLow] = useState<number>(1.5);
  const [eqMid, setEqMid] = useState<number>(0.0);
  const [eqHigh, setEqHigh] = useState<number>(2.0);
  const [masterVolume, setMasterVolume] = useState<number>(0.85);

  // Active Loops Trigger State
  const [activeLoopIds, setActiveLoopIds] = useState<Set<string>>(new Set());

  // Step Sequencer State (16 steps x 4 drum tracks)
  const [stepMatrix, setStepMatrix] = useState<Record<string, boolean[]>>({
    kick: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
    snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
    hihat: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
    clap: [false, false, false, false, false, false, false, true, false, false, false, false, false, false, true, false],
  });
  const [currentStep, setCurrentStep] = useState<number>(0);

  // Tracks Definition
  const [tracks, setTracks] = useState<TrackDef[]>([
    {
      id: 't-piano',
      name: 'Grand Piano',
      icon: 'Music',
      color: '#38bdf8',
      type: 'piano',
      volume: 0.85,
      pan: -0.15,
      muted: false,
      solo: false,
      notes: [
        { id: 'n1', note: 'C4', freq: 261.63, time: 0, duration: 1.2, velocity: 0.85 },
        { id: 'n2', note: 'E4', freq: 329.63, time: 0, duration: 1.2, velocity: 0.8 },
        { id: 'n3', note: 'G4', freq: 392.00, time: 0, duration: 1.2, velocity: 0.85 },
        { id: 'n4', note: 'B4', freq: 493.88, time: 0, duration: 1.2, velocity: 0.75 },
        { id: 'n5', note: 'A3', freq: 220.00, time: 2.0, duration: 1.4, velocity: 0.85 },
        { id: 'n6', note: 'C4', freq: 261.63, time: 2.0, duration: 1.4, velocity: 0.8 },
        { id: 'n7', note: 'E4', freq: 329.63, time: 2.0, duration: 1.4, velocity: 0.8 },
      ],
    },
    {
      id: 't-guitar',
      name: 'Acoustic Guitar',
      icon: 'Flame',
      color: '#f59e0b',
      type: 'guitar',
      volume: 0.85,
      pan: 0.1,
      muted: false,
      solo: false,
      notes: [
        { id: 'g1', note: 'E3', freq: 164.81, time: 0, duration: 1.5, velocity: 0.8 },
        { id: 'g2', note: 'G3', freq: 196.00, time: 0, duration: 1.5, velocity: 0.75 },
        { id: 'g3', note: 'B3', freq: 246.94, time: 0, duration: 1.5, velocity: 0.75 },
      ],
    },
    {
      id: 't-drums',
      name: '808 Drum Machine',
      icon: 'Grid3x3',
      color: '#f97316',
      type: 'drums',
      volume: 0.9,
      pan: 0,
      muted: false,
      solo: false,
      notes: [],
    },
    {
      id: 't-bass',
      name: 'Analog Sub-Bass',
      icon: 'Zap',
      color: '#a855f7',
      type: 'bass',
      volume: 0.85,
      pan: 0,
      muted: false,
      solo: false,
      notes: [
        { id: 'b1', note: 'C2', freq: 65.41, time: 0, duration: 1.8, velocity: 0.9 },
        { id: 'b2', note: 'G2', freq: 98.00, time: 2.0, duration: 1.8, velocity: 0.85 },
      ],
    },
    {
      id: 't-strings',
      name: 'Ambient Strings',
      icon: 'Sliders',
      color: '#10b981',
      type: 'strings',
      volume: 0.75,
      pan: 0.25,
      muted: false,
      solo: false,
      notes: [
        { id: 's1', note: 'E4', freq: 329.63, time: 0.5, duration: 3.0, velocity: 0.65 },
        { id: 's2', note: 'G4', freq: 392.00, time: 0.5, duration: 3.0, velocity: 0.65 },
      ],
    },
    {
      id: 't-mic',
      name: 'Vocal / Audio In',
      icon: 'Mic2',
      color: '#ec4899',
      type: 'mic',
      volume: 0.8,
      pan: 0,
      muted: false,
      solo: false,
      notes: [],
    },
  ]);

  // Audio Context Initialization
  const ensureAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtxClass();
      audioCtxRef.current = ctx;

      const master = ctx.createGain();
      master.gain.value = masterVolume;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;

      // Reverb Convolver impulse
      const convolver = ctx.createConvolver();
      const rate = ctx.sampleRate;
      const length = rate * 2.2;
      const impulse = ctx.createBuffer(2, length, rate);
      for (let ch = 0; ch < 2; ch++) {
        const channelData = impulse.getChannelData(ch);
        for (let i = 0; i < length; i++) {
          channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
        }
      }
      convolver.buffer = impulse;

      // Delay
      const delay = ctx.createDelay();
      delay.delayTime.value = 0.25;
      const delayFeedback = ctx.createGain();
      delayFeedback.gain.value = 0.35;
      delay.connect(delayFeedback);
      delayFeedback.connect(delay);

      master.connect(analyser);
      analyser.connect(ctx.destination);

      masterGainRef.current = master;
      reverbNodeRef.current = convolver;
      delayNodeRef.current = delay;
      delayFeedbackRef.current = delayFeedback;
      analyserRef.current = analyser;
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, [masterVolume]);

  // Real-Time Sound Synthesis for Instruments
  const playSynthesizerNote = useCallback(
    (freq: number, instrumentType: string, vel = 0.85, dur = 0.8) => {
      const ctx = ensureAudioCtx();
      const master = masterGainRef.current;
      if (!ctx || !master) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Pitch bend factor
      const bentFreq = freq * Math.pow(2, pitchBend / 12);
      osc.frequency.setValueAtTime(bentFreq, now);

      if (instrumentType === 'piano') {
        osc.type = 'triangle';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(bentFreq * 5, now);
        filter.frequency.exponentialRampToValueAtTime(bentFreq * 1.5, now + dur);

        // Acoustic Piano Envelope
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(vel * 0.9, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(vel * 0.35, now + 0.25);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + (sustainPedal ? Math.max(dur, 2.4) : dur));
      } else if (instrumentType === 'rhodes') {
        osc.type = 'sine';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(bentFreq * 3, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(vel * 0.85, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      } else if (instrumentType === 'guitar') {
        osc.type = 'sawtooth';
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(bentFreq * 2.5, now);
        filter.Q.value = 3.0;

        // Plucked String Attack & Exponential Decay
        gain.gain.setValueAtTime(vel * 0.9, now);
        gain.gain.exponentialRampToValueAtTime(vel * 0.2, now + 0.12);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + dur * 0.9);
      } else if (instrumentType === 'lead-guitar') {
        osc.type = 'sawtooth';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(bentFreq * 6, now);
        filter.Q.value = 4.5;

        // Drive / Overdrive envelope
        gain.gain.setValueAtTime(vel * 0.95, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + dur * 1.1);
      } else if (instrumentType === 'bass') {
        osc.type = 'sawtooth';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(bentFreq * 4, now);
        filter.frequency.exponentialRampToValueAtTime(80, now + dur);
        filter.Q.value = 4.0;

        gain.gain.setValueAtTime(vel, now);
        gain.gain.exponentialRampToValueAtTime(vel * 0.4, now + dur * 0.4);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      } else if (instrumentType === 'strings') {
        osc.type = 'sawtooth';
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(bentFreq * 2.2, now);
        filter.Q.value = 2.0;

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(vel * 0.55, now + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + dur + 0.6);
      } else if (instrumentType === 'brass') {
        osc.type = 'square';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(bentFreq * 8, now);
        filter.frequency.exponentialRampToValueAtTime(bentFreq * 2, now + 0.15);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(vel * 0.85, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      } else if (instrumentType === 'organ') {
        osc.type = 'sine';
        filter.type = 'lowpass';
        filter.frequency.value = bentFreq * 5;
        gain.gain.setValueAtTime(vel * 0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      } else {
        osc.type = 'sine';
        gain.gain.setValueAtTime(vel, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      }

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(master);

      osc.start(now);
      osc.stop(now + (sustainPedal ? Math.max(dur, 2.4) : dur) + 0.1);
    },
    [ensureAudioCtx, pitchBend, sustainPedal]
  );

  // Drum Synthesizer Voice
  const playDrumVoice = useCallback(
    (type: DrumPadDef['type'], vel = 0.9) => {
      const ctx = ensureAudioCtx();
      const master = masterGainRef.current;
      if (!ctx || !master) return;
      const now = ctx.currentTime;

      if (type === 'kick') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(145, now);
        osc.frequency.exponentialRampToValueAtTime(38, now + 0.12);
        gain.gain.setValueAtTime(vel * 1.2, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
        osc.connect(gain);
        gain.connect(master);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'snare') {
        // Noise buffer + body tone
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.frequency.setValueAtTime(185, now);
        oscGain.gain.setValueAtTime(vel * 0.7, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(oscGain);
        oscGain.connect(master);
        osc.start(now);
        osc.stop(now + 0.15);

        const bufferSize = ctx.sampleRate * 0.18;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1200;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(vel * 0.8, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(master);
        noise.start(now);
      } else if (type === 'hihat' || type === 'openhat') {
        const dur = type === 'openhat' ? 0.35 : 0.06;
        const bufferSize = Math.floor(ctx.sampleRate * dur);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 8500;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(vel * 0.65, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(master);
        noise.start(now);
      } else if (type === 'clap') {
        const bufferSize = ctx.sampleRate * 0.22;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1400;
        filter.Q.value = 2.5;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(vel * 0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(master);
        noise.start(now);
      } else if (type === '808') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(68, now);
        osc.frequency.exponentialRampToValueAtTime(32, now + 0.8);
        gain.gain.setValueAtTime(vel * 1.3, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
        osc.connect(gain);
        gain.connect(master);
        osc.start(now);
        osc.stop(now + 0.85);
      } else {
        // Crash / Tom / Splash
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);
        gain.gain.setValueAtTime(vel * 0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
        osc.connect(gain);
        gain.connect(master);
        osc.start(now);
        osc.stop(now + 0.35);
      }
    },
    [ensureAudioCtx]
  );

  // Preview sound motif for an instrument preset from sidebar
  const handlePreviewInstrument = useCallback(
    (preset: InstrumentPreset) => {
      ensureAudioCtx();
      if (preset.type === 'drums') {
        playDrumVoice('kick', 0.9);
        setTimeout(() => playDrumVoice('snare', 0.85), 180);
        setTimeout(() => playDrumVoice('hihat', 0.75), 360);
      } else {
        preset.previewNotes.forEach((noteStr, idx) => {
          setTimeout(() => {
            const freq = NOTE_FREQS[noteStr] || 261.63;
            playSynthesizerNote(freq, preset.type, 0.85, 0.6);
          }, idx * 160);
        });
      }
    },
    [ensureAudioCtx, playDrumVoice, playSynthesizerNote]
  );

  // Select or Add Track from Left Sidebar Instrument List
  const handleSelectOrAddTrack = useCallback(
    (preset: InstrumentPreset) => {
      handlePreviewInstrument(preset);

      // Check if a track of this type already exists in timeline
      const existing = tracks.find((t) => t.type === preset.type);
      if (existing) {
        setSelectedTrackId(existing.id);
      } else {
        const newTrack: TrackDef = {
          id: `t-${Date.now()}`,
          name: preset.nameJa,
          icon: preset.lucideIcon || 'Music',
          color: preset.color,
          type: preset.type,
          volume: 0.85,
          pan: 0,
          muted: false,
          solo: false,
          notes: [],
        };
        setTracks((prev) => [...prev, newTrack]);
        setSelectedTrackId(newTrack.id);
      }

      // Auto switch workspace view mode based on instrument category
      if (preset.category === 'drums') {
        setActiveTab('drums');
      } else if (preset.category === 'keyboard') {
        setActiveTab('piano');
      } else {
        setActiveTab('timeline');
      }
    },
    [handlePreviewInstrument, tracks]
  );

  // Filtered Instrument Library List
  const filteredInstruments = useMemo(() => {
    return INSTRUMENT_LIBRARY.filter((inst) => {
      const matchCat = selectedCategory === 'all' || inst.category === selectedCategory;
      const q = searchFilter.trim().toLowerCase();
      const matchSearch =
        !q ||
        inst.name.toLowerCase().includes(q) ||
        inst.nameJa.toLowerCase().includes(q) ||
        inst.desc.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [selectedCategory, searchFilter]);

  // Playhead & Sequencer Loop Timer
  useEffect(() => {
    if (!isPlaying) return;
    const intervalMs = 25;
    const stepDuration = (60 / bpm) / 4; // 16th note in seconds

    const timer = setInterval(() => {
      setPlayheadSec((prev) => {
        const totalDuration = 8 * (60 / bpm) * 4; // 8 bars
        let next = prev + intervalMs / 1000;
        if (next >= totalDuration) {
          next = isLooping ? 0 : totalDuration;
          if (!isLooping) setIsPlaying(false);
        }

        // Advance 16-step sequencer step
        const step = Math.floor((next / stepDuration) % 16);
        setCurrentStep((prevStep) => {
          if (prevStep !== step) {
            // Trigger 16-step drum sounds on step change
            if (stepMatrix.kick[step]) playDrumVoice('kick', 0.95);
            if (stepMatrix.snare[step]) playDrumVoice('snare', 0.85);
            if (stepMatrix.hihat[step]) playDrumVoice('hihat', 0.7);
            if (stepMatrix.clap[step]) playDrumVoice('clap', 0.8);

            // Metronome Click on beat
            if (metronome && step % 4 === 0) {
              const ctx = audioCtxRef.current;
              if (ctx) {
                const now = ctx.currentTime;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.frequency.value = step === 0 ? 1200 : 800;
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.04);
              }
            }
          }
          return step;
        });

        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, bpm, isLooping, metronome, stepMatrix, playDrumVoice]);

  // Handle Note Trigger from Keyboard or Mouse
  const triggerNoteOn = useCallback(
    (noteStr: string) => {
      const freq = NOTE_FREQS[noteStr];
      if (!freq) return;

      setActiveNotes((prev) => new Set(prev).add(noteStr));
      const currentTrack = tracks.find((t) => t.id === selectedTrackId);
      const instrumentType = currentTrack?.type || 'piano';
      playSynthesizerNote(freq, instrumentType, velocity, 0.75);

      // If recording, append to track
      if (isRecording) {
        const newEvent: NoteEvent = {
          id: `note-${Date.now()}-${Math.random()}`,
          note: noteStr,
          freq,
          time: Math.max(0, playheadSec),
          duration: 0.5,
          velocity,
        };
        setTracks((prev) =>
          prev.map((t) => (t.id === selectedTrackId ? { ...t, notes: [...t.notes, newEvent] } : t))
        );
      }
    },
    [isRecording, playheadSec, playSynthesizerNote, selectedTrackId, tracks, velocity]
  );

  const triggerNoteOff = useCallback((noteStr: string) => {
    setActiveNotes((prev) => {
      const next = new Set(prev);
      next.delete(noteStr);
      return next;
    });
  }, []);

  // Keyboard shortcut binding (QWERTY piano keys)
  useEffect(() => {
    const keyMap: Record<string, string> = {
      a: `C${currentOctave}`,
      w: `C#${currentOctave}`,
      s: `D${currentOctave}`,
      e: `D#${currentOctave}`,
      d: `E${currentOctave}`,
      f: `F${currentOctave}`,
      t: `F#${currentOctave}`,
      g: `G${currentOctave}`,
      y: `G#${currentOctave}`,
      h: `A${currentOctave}`,
      u: `A#${currentOctave}`,
      j: `B${currentOctave}`,
      k: `C${currentOctave + 1}`,
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const k = e.key.toLowerCase();
      if (keyMap[k] && !activeNotes.has(keyMap[k])) {
        triggerNoteOn(keyMap[k]);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const k = e.key.toLowerCase();
      if (keyMap[k]) {
        triggerNoteOff(keyMap[k]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [currentOctave, activeNotes, triggerNoteOn, triggerNoteOff]);

  // Export Track to Audio WAV File
  const handleExportWav = useCallback(() => {
    const ctx = ensureAudioCtx();
    if (!ctx) return;

    // Build uncompressed standard 44.1kHz WAV container
    const sampleRate = 44100;
    const durationSec = 8 * (60 / bpm) * 4;
    const numSamples = Math.floor(sampleRate * Math.min(durationSec, 30));
    const buffer = new ArrayBuffer(44 + numSamples * 2 * 2);
    const view = new DataView(buffer);

    // Write WAV Header
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 4, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 2, true); // Stereo
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 4, true);
    view.setUint16(32, 4, true);
    view.setUint16(34, 16, true); // 16-bit
    writeString(36, 'data');
    view.setUint32(40, numSamples * 4, true);

    // Synthesize gentle ambient chords + beat into WAV buffer
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const beat = (t * (bpm / 60)) % 1;
      const kick = Math.exp(-beat * 24) * Math.sin(t * 120 * Math.PI);
      const chord = (Math.sin(t * 261.63 * Math.PI * 2) + Math.sin(t * 329.63 * Math.PI * 2) + Math.sin(t * 392.00 * Math.PI * 2)) * 0.15;
      const sample = Math.max(-1, Math.min(1, (kick * 0.4 + chord * 0.6) * 0.8));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      view.setInt16(offset + 2, intSample, true);
      offset += 4;
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GarageBand_Project_${Date.now()}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  }, [bpm, ensureAudioCtx]);

  // Save Project to FileSystem
  const handleSaveProject = useCallback(() => {
    const projectData = {
      name: 'GarageBand Song 1',
      bpm,
      tracks,
      stepMatrix,
      savedAt: new Date().toISOString(),
      version: '5.0 u4',
    };
    saveFile(['Music', 'GarageBand'], `project_${Date.now()}.gbproj`, JSON.stringify(projectData, null, 2));
    alert('プロジェクトを「/Music/GarageBand/」へ保存しました！');
  }, [bpm, tracks, stepMatrix, saveFile]);

  // Song Templates
  const loadSongTemplate = useCallback((template: 'lofi' | 'cyberpunk' | 'citypop') => {
    if (template === 'lofi') {
      setBpm(84);
      setStepMatrix({
        kick: [true, false, false, false, false, false, true, false, true, false, false, false, false, false, true, false],
        snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
        hihat: [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
        clap: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      });
    } else if (template === 'cyberpunk') {
      setBpm(132);
      setStepMatrix({
        kick: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
        snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
        hihat: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
        clap: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      });
    } else {
      setBpm(118);
      setStepMatrix({
        kick: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
        snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
        hihat: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
        clap: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      });
    }
    setPlayheadSec(0);
    setIsPlaying(true);
  }, []);

  return (
    <div className={`h-full flex flex-col overflow-hidden select-none font-sans ${isLight ? 'bg-slate-100 text-slate-900' : 'bg-[#18181b] text-white'}`}>
      {/* 1. TOP TRANSPORT BAR (GarageBand Style Classic Aluminum & LED Display) */}
      <div className={`h-14 px-4 border-b flex items-center justify-between shrink-0 ${isLight ? 'bg-white border-slate-300' : 'bg-[#27272a] border-black/40'} shadow-md`}>
        {/* Left: Project Branding & Tools */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-amber-600 via-orange-500 to-red-500 flex items-center justify-center text-white shadow-md">
              <Icon name="Music" size={17} />
            </div>
            <div>
              <div className="text-xs font-bold tracking-tight">GarageBand Studio</div>
              <div className="text-[10px] text-white/50">GlassiumOS 5 DAW</div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1.5 ml-4">
            <button
              onClick={() => loadSongTemplate('lofi')}
              className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-[11px] font-medium transition"
            >
              ☕ Lo-Fi Chill
            </button>
            <button
              onClick={() => loadSongTemplate('cyberpunk')}
              className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-[11px] font-medium transition"
            >
              ⚡ Cyberpunk 132
            </button>
            <button
              onClick={() => loadSongTemplate('citypop')}
              className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-[11px] font-medium transition"
            >
              🌴 City Pop Funk
            </button>
          </div>
        </div>

        {/* Center: LCD Display & Transport Controls */}
        <div className="flex items-center gap-4">
          {/* Rewind */}
          <button
            onClick={() => setPlayheadSec(0)}
            className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition"
            title="先頭へ戻る"
          >
            <Icon name="SkipBack" size={16} />
          </button>

          {/* Play / Pause */}
          <button
            onClick={() => {
              ensureAudioCtx();
              setIsPlaying((v) => !v);
            }}
            className={`h-10 w-10 rounded-full flex items-center justify-center shadow-lg transition active:scale-95 ${
              isPlaying ? 'bg-amber-500 text-black' : 'bg-emerald-500 hover:bg-emerald-400 text-black'
            }`}
          >
            <Icon name={isPlaying ? 'Pause' : 'Play'} size={18} />
          </button>

          {/* Record */}
          <button
            onClick={() => {
              ensureAudioCtx();
              setIsRecording((v) => !v);
              if (!isPlaying) setIsPlaying(true);
            }}
            className={`h-9 w-9 rounded-full flex items-center justify-center border transition ${
              isRecording
                ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
                : 'bg-white/10 text-rose-400 border-white/20 hover:bg-rose-600/30'
            }`}
            title="録音 (トラックへ音符を記録)"
          >
            <span className="h-3.5 w-3.5 rounded-full bg-rose-500" />
          </button>

          {/* Loop Toggle */}
          <button
            onClick={() => setIsLooping((v) => !v)}
            className={`p-2 rounded-full transition ${isLooping ? 'text-amber-400 bg-amber-400/15' : 'text-white/40 hover:text-white'}`}
            title="サイクル再生 (ループ)"
          >
            <Icon name="Repeat" size={16} />
          </button>

          {/* LCD Status Screen */}
          <div className="hidden sm:flex items-center gap-4 bg-black/80 border border-white/15 px-4 py-1.5 rounded-lg text-emerald-400 font-mono shadow-inner">
            <div className="text-center">
              <div className="text-[9px] uppercase tracking-wider text-emerald-400/60 font-sans">Bars</div>
              <div className="text-xs font-bold">
                {String(Math.floor(playheadSec / ((60 / bpm) * 4)) + 1).padStart(2, '0')}.
                {String(Math.floor((playheadSec % ((60 / bpm) * 4)) / (60 / bpm)) + 1)}.
                {String(Math.floor((playheadSec % (60 / bpm)) * 16)).padStart(2, '0')}
              </div>
            </div>

            <div className="h-6 w-px bg-emerald-500/20" />

            <div className="text-center">
              <div className="text-[9px] uppercase tracking-wider text-emerald-400/60 font-sans">Tempo</div>
              <div className="flex items-center gap-1 text-xs font-bold">
                <span>{bpm}</span>
                <span className="text-[9px] text-emerald-400/70">BPM</span>
              </div>
            </div>

            <div className="h-6 w-px bg-emerald-500/20" />

            <div className="text-center">
              <div className="text-[9px] uppercase tracking-wider text-emerald-400/60 font-sans">Key / Sig</div>
              <div className="text-xs font-bold">C Maj · 4/4</div>
            </div>
          </div>
        </div>

        {/* Right: Metronome, Export & Save */}
        <div className="flex items-center gap-2">
          {/* Metronome */}
          <button
            onClick={() => setMetronome((v) => !v)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition ${
              metronome ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-white/5 border-white/15 text-white/60 hover:text-white'
            }`}
            title="メトロノーム"
          >
            <Icon name="Clock" size={13} />
            <span className="hidden md:inline">メトロノーム</span>
          </button>

          {/* Export WAV */}
          <button
            onClick={handleExportWav}
            style={{ backgroundColor: resolvedAccentHex }}
            className="px-3 py-1.5 rounded-lg text-slate-950 font-bold text-xs flex items-center gap-1.5 hover:brightness-110 shadow-md transition"
          >
            <Icon name="Download" size={13} />
            <span className="hidden sm:inline">WAV書き出し</span>
          </button>

          {/* Save Project */}
          <button
            onClick={handleSaveProject}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
            title="プロジェクト保存"
          >
            <Icon name="Save" size={15} />
          </button>
        </div>
      </div>

      {/* 2. SECONDARY TOOLBAR: View Tabs, Sidebar Toggle & Tempo Slider */}
      <div className={`h-10 px-4 border-b flex items-center justify-between text-xs shrink-0 ${isLight ? 'bg-slate-200 border-slate-300' : 'bg-[#1f1f23] border-white/10'}`}>
        <div className="flex items-center gap-1">
          {/* Left Sidebar Toggle Button */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className={`px-2.5 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition ${
              sidebarOpen ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-white/10 text-white/70 hover:text-white'
            }`}
            title="左側 楽器ライブラリ サイドバーの表示 / 非表示"
          >
            <span className="text-sm">📚</span>
            <span className="hidden sm:inline">楽器ライブラリ</span>
          </button>

          <div className="h-4 w-px bg-white/15 mx-1" />

          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-3 py-1.5 rounded-md font-semibold transition ${activeTab === 'timeline' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}`}
          >
            🎼 マルチトラック
          </button>
          <button
            onClick={() => setActiveTab('piano')}
            className={`px-3 py-1.5 rounded-md font-semibold transition ${activeTab === 'piano' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}`}
          >
            🎹 ピアノ鍵盤
          </button>
          <button
            onClick={() => setActiveTab('drums')}
            className={`px-3 py-1.5 rounded-md font-semibold transition ${activeTab === 'drums' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}`}
          >
            🥁 ドラムパッド (MPC)
          </button>
          <button
            onClick={() => setActiveTab('sequencer')}
            className={`px-3 py-1.5 rounded-md font-semibold transition ${activeTab === 'sequencer' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}`}
          >
            🎛️ 16ステップ
          </button>
          <button
            onClick={() => setActiveTab('loops')}
            className={`px-3 py-1.5 rounded-md font-semibold transition ${activeTab === 'loops' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}`}
          >
            🔄 ライブループ
          </button>
          <button
            onClick={() => setActiveTab('fx')}
            className={`px-3 py-1.5 rounded-md font-semibold transition ${activeTab === 'fx' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}`}
          >
            🎚️ スタジオEQ・FX
          </button>
        </div>

        {/* BPM Quick Slider */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/50">テンポ:</span>
          <input
            type="range"
            min={60}
            max={200}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="w-20 cursor-pointer"
          />
          <span className="font-mono font-bold w-12 text-right">{bpm} BPM</span>
        </div>
      </div>

      {/* 3. MAIN WORKSTATION CANVAS (With Left Instrument Selection Sidebar) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT SIDEBAR: GARAGEBAND INSTRUMENT SELECTION LIBRARY */}
        {sidebarOpen && (
          <div className="w-64 shrink-0 h-full bg-[#1c1c1f] border-r border-white/10 flex flex-col select-none overflow-hidden z-10 shadow-2xl transition-all">
            {/* Sidebar Header */}
            <div className="p-3 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-2">
                <span className="text-base">📚</span>
                <div>
                  <div className="text-xs font-bold text-white tracking-wide">楽器ライブラリ</div>
                  <div className="text-[9px] text-white/40">Apple GarageBand Presets</div>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 text-white/50 hover:text-white rounded hover:bg-white/10"
                title="サイドバーを隠す"
              >
                <Icon name="X" size={14} />
              </button>
            </div>

            {/* Instrument Search Filter Input */}
            <div className="p-2 border-b border-white/5">
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs">
                <Icon name="Search" size={13} className="text-white/40" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="ピアノ, ギター, ドラムを検索..."
                  className="w-full bg-transparent outline-none text-[11px] text-white placeholder-white/40"
                />
                {searchFilter && (
                  <button onClick={() => setSearchFilter('')} className="text-white/40 hover:text-white text-xs">
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Pills (ピアノ, ギター, ドラム, ベース, etc.) */}
            <div className="px-2 py-2 flex items-center gap-1 overflow-x-auto border-b border-white/10 shrink-0 scrollbar-none">
              {[
                { id: 'all', label: 'すべて' },
                { id: 'keyboard', label: '🎹ピアノ' },
                { id: 'guitar', label: '🎸ギター' },
                { id: 'bass', label: '🎸ベース' },
                { id: 'drums', label: '🥁ドラム' },
                { id: 'strings', label: '🎻弦楽器' },
                { id: 'brass', label: '🎷ブラス' },
                { id: 'vocal', label: '🎤マイク' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap transition ${
                    selectedCategory === cat.id
                      ? 'bg-amber-500 text-black font-bold'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Instrument List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {filteredInstruments.map((preset) => {
                const activeTrack = tracks.find((t) => t.type === preset.type);
                const isSelected = activeTrack && activeTrack.id === selectedTrackId;

                return (
                  <div
                    key={preset.id}
                    className={`p-2.5 rounded-xl border transition flex flex-col gap-1.5 relative group ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/60 shadow-lg shadow-amber-500/10'
                        : 'bg-black/30 border-white/10 hover:bg-white/5 hover:border-white/20'
                    }`}
                  >
                    {/* Top Row: Icon, Name & Category Badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-7 w-7 rounded-lg flex items-center justify-center text-sm shadow-md shrink-0"
                          style={{ backgroundColor: preset.color + '33', border: `1px solid ${preset.color}` }}
                        >
                          <span>{preset.icon}</span>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white leading-tight">{preset.nameJa}</div>
                          <div className="text-[9px] text-white/40">{preset.name}</div>
                        </div>
                      </div>

                      {isSelected && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500 text-black shrink-0">
                          選択中
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <div className="text-[10px] text-white/55 line-clamp-2 leading-snug">{preset.desc}</div>

                    {/* Action Buttons: Preview Sound & Add/Select Track */}
                    <div className="flex items-center gap-1.5 mt-1 pt-1.5 border-t border-white/5">
                      <button
                        onClick={() => handlePreviewInstrument(preset)}
                        className="flex-1 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-semibold text-white/90 flex items-center justify-center gap-1 transition"
                        title="サウンド試聴 (音階フレーズを再生)"
                      >
                        <Icon name="Play" size={10} className="text-amber-400" />
                        <span>試聴</span>
                      </button>

                      <button
                        onClick={() => handleSelectOrAddTrack(preset)}
                        style={isSelected ? { backgroundColor: preset.color, color: '#000' } : undefined}
                        className={`flex-1 py-1 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition ${
                          isSelected
                            ? 'shadow-md'
                            : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30'
                        }`}
                      >
                        <Icon name={activeTrack ? 'Check' : 'Plus'} size={10} />
                        <span>{activeTrack ? 'トラック選択' : 'トラック追加'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredInstruments.length === 0 && (
                <div className="p-4 text-center text-xs text-white/40">
                  該当する楽器が見つかりませんでした
                </div>
              )}
            </div>

            {/* Sidebar Footer info */}
            <div className="p-2.5 border-t border-white/10 bg-black/40 text-[10px] text-white/40 text-center">
              アイコンタップで試聴 ＆ DAWトラックへ即時追加
            </div>
          </div>
        )}

        {/* WORKSTATION CONTENT AREA */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* TAB 1: MULTITRACK TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Timeline Ruler */}
              <div className="h-6 bg-black/40 border-b border-white/10 flex items-center text-[10px] text-white/50 px-4 select-none">
                <div className="w-56 shrink-0 font-bold uppercase tracking-wider text-white/40">Track Header</div>
                <div className="flex-1 flex items-center justify-between px-2 font-mono">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <span key={i} className="border-l border-white/15 pl-1">
                      0{i + 1}
                    </span>
                  ))}
                </div>
              </div>

              {/* Track Rows */}
              <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                {tracks.map((track) => {
                  const isSelected = track.id === selectedTrackId;
                  return (
                    <div
                      key={track.id}
                      onClick={() => setSelectedTrackId(track.id)}
                      className={`h-20 flex items-center cursor-pointer transition ${
                        isSelected ? 'bg-white/10' : 'hover:bg-white/5'
                      }`}
                    >
                      {/* Track Control Column */}
                      <div className="w-56 shrink-0 h-full p-2.5 border-r border-white/10 flex flex-col justify-between bg-black/25">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: track.color }} />
                            <span className="text-xs font-bold truncate max-w-[110px]">{track.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setTracks((prev) =>
                                  prev.map((t) => (t.id === track.id ? { ...t, muted: !t.muted } : t))
                                );
                              }}
                              className={`h-5 w-5 rounded text-[10px] font-bold flex items-center justify-center ${
                                track.muted ? 'bg-amber-500 text-black' : 'bg-white/10 text-white/60 hover:text-white'
                              }`}
                            >
                              M
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setTracks((prev) =>
                                  prev.map((t) => (t.id === track.id ? { ...t, solo: !t.solo } : t))
                                );
                              }}
                              className={`h-5 w-5 rounded text-[10px] font-bold flex items-center justify-center ${
                                track.solo ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white/60 hover:text-white'
                              }`}
                            >
                              S
                            </button>
                          </div>
                        </div>

                        {/* Volume & Pan Slider */}
                        <div className="flex items-center gap-2">
                          <Icon name="Volume2" size={12} className="text-white/40 shrink-0" />
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={track.volume}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              setTracks((prev) =>
                                prev.map((t) => (t.id === track.id ? { ...t, volume: v } : t))
                              );
                            }}
                            className="flex-1 h-1.5 cursor-pointer accent-amber-400"
                          />
                          <span className="text-[10px] font-mono w-6 text-right text-white/60">
                            {Math.round(track.volume * 100)}
                          </span>
                        </div>
                      </div>

                      {/* Timeline Notes Lane */}
                      <div className="flex-1 h-full relative overflow-hidden bg-black/40 p-2">
                        {/* Grid bar ticks */}
                        <div className="absolute inset-0 flex justify-between pointer-events-none opacity-10">
                          {Array.from({ length: 16 }).map((_, i) => (
                            <div key={i} className="h-full w-px bg-white" />
                          ))}
                        </div>

                        {/* Rendered Notes / Audio Blocks */}
                        {track.notes.map((note) => {
                          const leftPct = (note.time / (8 * (60 / bpm) * 4)) * 100;
                          const widthPct = Math.max(3, (note.duration / (8 * (60 / bpm) * 4)) * 100);
                          return (
                            <div
                              key={note.id}
                              style={{
                                left: `${leftPct}%`,
                                width: `${widthPct}%`,
                                backgroundColor: track.color,
                              }}
                              className="absolute top-3 h-8 rounded-md shadow-md text-[10px] font-bold text-black px-1.5 flex items-center truncate opacity-90 border border-white/30"
                            >
                              {note.note}
                            </div>
                          );
                        })}

                        {/* Moving Playhead Cursor */}
                        <div
                          style={{
                            left: `${(playheadSec / (8 * (60 / bpm) * 4)) * 100}%`,
                          }}
                          className="absolute top-0 bottom-0 w-0.5 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] pointer-events-none z-10"
                        >
                          <div className="h-2 w-2 -ml-[3px] rounded-full bg-rose-500" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: INTERACTIVE PIANO KEYBOARD */}
          {activeTab === 'piano' && (
            <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
              {/* Keyboard Control Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-black/40 p-3 rounded-2xl border border-white/10">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/60">オクターブ:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentOctave((o) => Math.max(2, o - 1))}
                      className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 font-bold text-xs"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold px-3">C{currentOctave}</span>
                    <button
                      onClick={() => setCurrentOctave((o) => Math.min(5, o + 1))}
                      className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 font-bold text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Pitch Bend & Sustain */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSustainPedal((v) => !v)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition ${
                      sustainPedal ? 'bg-amber-500 text-black border-amber-400' : 'bg-white/5 border-white/15 text-white/70'
                    }`}
                  >
                    サステインペダル: {sustainPedal ? 'ON' : 'OFF'}
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/60">ピッチベンド:</span>
                    <input
                      type="range"
                      min={-2}
                      max={2}
                      step={0.1}
                      value={pitchBend}
                      onChange={(e) => setPitchBend(Number(e.target.value))}
                      onMouseUp={() => setPitchBend(0)}
                      onTouchEnd={() => setPitchBend(0)}
                      className="w-24 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Velocity */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/60">ベロシティ:</span>
                  <input
                    type="range"
                    min={0.2}
                    max={1.0}
                    step={0.05}
                    value={velocity}
                    onChange={(e) => setVelocity(Number(e.target.value))}
                    className="w-24 cursor-pointer"
                  />
                </div>
              </div>

              {/* Playable Piano Surface (2 Full Octaves) */}
              <div className="relative flex justify-center h-64 select-none px-4 py-2 bg-zinc-900 rounded-3xl border border-white/10 shadow-2xl overflow-x-auto">
                {[currentOctave, currentOctave + 1].map((oct) => (
                  <div key={oct} className="relative flex">
                    {PIANO_KEYS.map((k) => {
                      const fullNote = `${k.note}${oct}`;
                      const isPressed = activeNotes.has(fullNote);

                      if (k.isBlack) {
                        return (
                          <div
                            key={fullNote}
                            onPointerDown={(e) => {
                              e.preventDefault();
                              triggerNoteOn(fullNote);
                            }}
                            onPointerUp={() => triggerNoteOff(fullNote)}
                            onPointerLeave={() => triggerNoteOff(fullNote)}
                            style={{
                              left: k.note === 'C#' ? '26px' : k.note === 'D#' ? '70px' : k.note === 'F#' ? '154px' : k.note === 'G#' ? '198px' : '242px',
                            }}
                            className={`absolute top-0 w-8 h-36 rounded-b-lg z-20 cursor-pointer shadow-lg transition-transform ${
                              isPressed ? 'bg-cyan-500 scale-95 shadow-cyan-500/50' : 'bg-black hover:bg-zinc-800'
                            }`}
                          >
                            <span className="absolute bottom-2 inset-x-0 text-center text-[9px] text-white/40 pointer-events-none">
                              {k.note}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={fullNote}
                          onPointerDown={(e) => {
                            e.preventDefault();
                            triggerNoteOn(fullNote);
                          }}
                          onPointerUp={() => triggerNoteOff(fullNote)}
                          onPointerLeave={() => triggerNoteOff(fullNote)}
                          className={`w-11 h-60 rounded-b-xl border border-zinc-700 cursor-pointer transition-transform flex flex-col justify-end pb-3 items-center ${
                            isPressed ? 'bg-cyan-300 scale-98 shadow-inner' : 'bg-white hover:bg-slate-100 text-slate-800'
                          }`}
                        >
                          <span className="text-[11px] font-bold opacity-60 pointer-events-none">{fullNote}</span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="text-center text-xs text-white/40">
                PCキーボードの [A, W, S, E, D, F, T, G, Y, H, U, J, K] キーでも演奏できます
              </div>
            </div>
          )}

          {/* TAB 3: MPC DRUM PADS */}
          {activeTab === 'drums' && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4 overflow-y-auto">
              <div className="grid grid-cols-4 gap-3.5 max-w-xl w-full">
                {DRUM_PADS.map((pad) => (
                  <button
                    key={pad.id}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      playDrumVoice(pad.type, 0.95);
                    }}
                    style={{ borderColor: pad.color }}
                    className="h-28 rounded-2xl bg-zinc-900 border-2 p-3 flex flex-col justify-between items-start text-left shadow-lg transition active:scale-90 hover:brightness-125 cursor-pointer relative overflow-hidden group"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-white group-hover:text-cyan-300">{pad.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/60">
                        {pad.key}
                      </span>
                    </div>
                    <div className="text-[10px] text-white/50">{pad.sub}</div>
                    <div
                      className="absolute bottom-0 inset-x-0 h-1 transition-all group-active:h-full opacity-30 pointer-events-none"
                      style={{ backgroundColor: pad.color }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: 16-STEP SEQUENCER */}
          {activeTab === 'sequencer' && (
            <div className="flex-1 flex flex-col p-6 gap-5 overflow-y-auto">
              <div className="text-xs text-white/60">
                ドラムのビートグリッドをタップしてパターンを作成。ループ再生と同期して自動演奏されます。
              </div>

              <div className="space-y-3 max-w-3xl">
                {(['kick', 'snare', 'hihat', 'clap'] as const).map((soundKey) => (
                  <div key={soundKey} className="flex items-center gap-3 bg-black/40 p-3 rounded-2xl border border-white/10">
                    <div className="w-24 font-bold text-xs capitalize shrink-0">{soundKey}</div>
                    <div className="flex-1 grid grid-cols-16 gap-1.5">
                      {stepMatrix[soundKey].map((active, stepIdx) => {
                        const isCurrent = currentStep === stepIdx && isPlaying;
                        return (
                          <button
                            key={stepIdx}
                            onClick={() => {
                              setStepMatrix((prev) => ({
                                ...prev,
                                [soundKey]: prev[soundKey].map((v, i) => (i === stepIdx ? !v : v)),
                              }));
                            }}
                            className={`h-11 rounded-lg border transition ${
                              active
                                ? soundKey === 'kick'
                                  ? 'bg-red-500 border-red-400'
                                  : soundKey === 'snare'
                                  ? 'bg-amber-500 border-amber-400'
                                  : soundKey === 'hihat'
                                  ? 'bg-cyan-500 border-cyan-400'
                                  : 'bg-purple-500 border-purple-400'
                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                            } ${isCurrent ? 'ring-2 ring-white scale-105' : ''}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: LIVE LOOPS */}
          {activeTab === 'loops' && (
            <div className="flex-1 p-6 grid grid-cols-2 md:grid-cols-4 gap-4 overflow-y-auto">
              {LIVE_LOOP_CLIPS.map((loop) => {
                const isTriggered = activeLoopIds.has(loop.id);
                return (
                  <div
                    key={loop.id}
                    onClick={() => {
                      ensureAudioCtx();
                      setActiveLoopIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(loop.id)) next.delete(loop.id);
                        else next.add(loop.id);
                        return next;
                      });
                      if (!isPlaying) setIsPlaying(true);
                    }}
                    style={{ borderColor: loop.color }}
                    className={`h-36 rounded-2xl p-4 border-2 flex flex-col justify-between cursor-pointer transition active:scale-95 ${
                      isTriggered
                        ? 'bg-gradient-to-tr from-cyan-950 to-slate-900 shadow-lg shadow-cyan-500/20'
                        : 'bg-zinc-900 hover:bg-zinc-850'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{loop.name}</span>
                      <span
                        className={`h-3 w-3 rounded-full ${
                          isTriggered ? 'bg-emerald-400 animate-ping' : 'bg-white/20'
                        }`}
                      />
                    </div>
                    <div className="text-[11px] text-white/50">{loop.bars} Bars · {loop.track}</div>
                    <div className="text-[10px] font-semibold text-emerald-400">
                      {isTriggered ? '▶ 再生中 (BPM同期)' : 'タップでループ開始'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 6: STUDIO FX & MASTER MIXER */}
          {activeTab === 'fx' && (
            <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto">
              {/* 3-Band Equalizer */}
              <div className="bg-black/40 p-5 rounded-3xl border border-white/10 space-y-4">
                <div className="font-bold text-sm">3バンド スタジオEQ</div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Low (低音)</span>
                    <span>{eqLow.toFixed(1)} dB</span>
                  </div>
                  <input
                    type="range"
                    min={-12}
                    max={12}
                    step={0.5}
                    value={eqLow}
                    onChange={(e) => setEqLow(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Mid (中音)</span>
                    <span>{eqMid.toFixed(1)} dB</span>
                  </div>
                  <input
                    type="range"
                    min={-12}
                    max={12}
                    step={0.5}
                    value={eqMid}
                    onChange={(e) => setEqMid(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>High (高音)</span>
                    <span>{eqHigh.toFixed(1)} dB</span>
                  </div>
                  <input
                    type="range"
                    min={-12}
                    max={12}
                    step={0.5}
                    value={eqHigh}
                    onChange={(e) => setEqHigh(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Reverb & Delay */}
              <div className="bg-black/40 p-5 rounded-3xl border border-white/10 space-y-4">
                <div className="font-bold text-sm">空間エフェクト (残響 & ディレイ)</div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Studio Reverb (残響)</span>
                    <span>{Math.round(reverbMix * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={reverbMix}
                    onChange={(e) => setReverbMix(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Ping-Pong Delay (反響)</span>
                    <span>{Math.round(delayMix * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={delayMix}
                    onChange={(e) => setDelayMix(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Tube Distortion (真空管歪み)</span>
                    <span>{Math.round(distortion * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={distortion}
                    onChange={(e) => setDistortion(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Master Limiter */}
              <div className="bg-black/40 p-5 rounded-3xl border border-white/10 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="font-bold text-sm mb-4">マスター出力 & VUメーター</div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="text-xs mb-1">マスターフェーダー</div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={masterVolume}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setMasterVolume(v);
                          if (masterGainRef.current) masterGainRef.current.gain.value = v;
                        }}
                        className="w-full h-2 accent-emerald-400 cursor-pointer"
                      />
                    </div>
                    <div className="text-sm font-mono font-bold">{Math.round(masterVolume * 100)}%</div>
                  </div>
                </div>

                {/* Animated VU Meter LED Bars */}
                <div className="space-y-2">
                  <div className="h-3 rounded-full bg-zinc-800 overflow-hidden flex">
                    <div
                      style={{ width: isPlaying ? '78%' : '4%' }}
                      className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 transition-all duration-75"
                    />
                  </div>
                  <div className="h-3 rounded-full bg-zinc-800 overflow-hidden flex">
                    <div
                      style={{ width: isPlaying ? '74%' : '4%' }}
                      className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 transition-all duration-75"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
