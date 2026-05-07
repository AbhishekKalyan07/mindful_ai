import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Heart, BookOpen, Wind, User, Briefcase, GraduationCap, 
  Send, Menu, X, Smile, Frown, Meh, Sun, Moon, Trash2, RefreshCcw, 
  Coffee, CheckSquare, Activity, Search, Sparkles, Brain, LogOut, Lock,
  Flame, CloudRain, CloudSun, Thermometer, ArrowRight, Loader, AlertTriangle, Settings,
  Mic, MicOff, Volume2, StopCircle, ChevronRight, Shield
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, query, limit } from 'firebase/firestore';

// --- CONFIGURATION ---
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

// --- FIREBASE CONFIGURATION ---
let firebaseConfig;
let appId = 'default-app-id';
let isLocalEnv = false;

try {
  if (typeof __firebase_config !== 'undefined') {
    firebaseConfig = JSON.parse(__firebase_config);
    // Sanitize appId
    appId = (typeof __app_id !== 'undefined' ? __app_id : 'default-app-id').replace(/\//g, '_');
  } else {
    throw new Error('Local Mode');
  }
} catch (e) {
  isLocalEnv = true;
  firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
  };
  appId = 'mindful-ai-local';
}

// Initialize Firebase SAFELY
let app, auth, db;
let firebaseError = false;

try {
  if (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey.length > 10) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    firebaseError = true;
  }
} catch (e) {
  console.error("Firebase init failed:", e);
  firebaseError = true;
}

// --- HELPER: GET USER ID FOR DB PATH ---
// IMPORTANT: Use the Firebase UID for security rules compliance
const getDbUserId = (user) => {
  return user?.uid || 'anonymous_user';
};

// --- THEME ENGINE (COSMIC GLASS REDESIGN) ---
const getTheme = (userType) => {
  return {
    type: userType,
    bg: 'bg-transparent text-white',
    gradient: 'glass-panel',
    textMain: 'text-white',
    textMuted: 'text-gray-400',
    card: 'glass-panel',
    primaryBtn: 'bg-gold-500 hover:bg-gold-400 text-space-900 shadow-[0_0_15px_rgba(255,215,0,0.3)] transition-all font-bold',
    secondaryBtn: 'glass-button',
    accent: 'text-gold-400',
    navActive: 'bg-white/10 text-gold-400 shadow-[0_0_10px_rgba(255,215,0,0.2)] rounded-xl border border-white/10',
    navInactive: 'text-gray-400 hover:text-white hover:bg-white/5 rounded-xl border border-transparent',
    bannerIcon: userType === 'student' 
      ? <Wind className="absolute -right-6 -bottom-6 text-gold-500/10 rotate-12" size={180} />
      : <Activity className="absolute -right-6 -bottom-6 text-gold-500/10" size={180} />
  };
};

// --- 1. KNOWLEDGE BASE ---
const KNOWLEDGE_BASE = [
  { id: 'anxiety_grounding', tags: ['anxiety', 'panic', 'scared', 'worry', 'nervous', 'overwhelmed', 'stress'], title: '5-4-3-2-1 Grounding', content: "Grounding brings you back to the present. Acknowledge 5 things you see, 4 you touch, 3 you hear, 2 you smell, and 1 you taste. It interrupts the fight-or-flight response." },
  { id: 'study_pomodoro', tags: ['exam', 'test', 'study', 'grade', 'fail', 'academic', 'focus', 'homework', 'cramming'], title: 'The Pomodoro Method', content: "Work for 25 minutes, then force a 5-minute break. After 4 cycles, take a 20-minute break. This prevents cognitive fatigue and keeps the brain fresh for retention." },
  { id: 'sleep_shuffling', tags: ['sleep', 'insomnia', 'tired', 'awake', 'rest', 'bed', 'night'], title: 'Cognitive Shuffling', content: "Visualizing random, unrelated objects (e.g., 'Cow', 'Toaster', 'Leaf') for 5 seconds each bores the brain into sleep mode by interrupting structured worrying." },
  { id: 'work_boundaries', tags: ['work', 'boss', 'job', 'burnout', 'career', 'deadline', 'meeting', 'office'], title: 'Professional Boundaries', content: "Remember that 'No' is a complete sentence. Protecting your time isn't selfish; it preserves the energy you need to perform well long-term." },
  { id: 'general_mood', tags: ['sad', 'depressed', 'unhappy', 'cry', 'lonely', 'low', 'grief'], title: 'Emotional Acceptance', content: "Emotions are like weather—they pass. Instead of fighting the sadness, observe it. Say 'I am feeling sad right now' rather than 'I am sad'. It creates distance." }
];

// --- 2. RAG LOGIC ---
const retrieveContext = (query) => {
  const text = query.toLowerCase();
  return KNOWLEDGE_BASE.find(doc => doc.tags.some(tag => text.includes(tag))) || null;
};

// --- 3. AI LOGIC ---
const callGeminiAPI = async (userInput, userType, contextDoc, type = 'chat', history = [], journalMemory = '') => {
  if (!GEMINI_API_KEY) return "⚠️ System Alert: API Key Missing.";
  
  let systemInstruction = "";

  if (type === 'chat') {
    const conversationContext = history.map(msg => 
      `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.text}`
    ).join('\n');

    systemInstruction = `
      You are a professional mental health assistant for a ${userType}.
      CONTEXT: ${contextDoc ? `Technique: ${contextDoc.title} - ${contextDoc.content}` : "General Support"}
      LONG-TERM MEMORY (Journal Insights): 
      ${journalMemory || "No recent journal entries to consider."}
      HISTORY: ${conversationContext}
      QUERY: "${userInput}"
      INSTRUCTIONS: 
      1. If the user input is a simple greeting (like "hi", "hello") or introduction, strictly reply with a warm, short greeting and ask **"How are you feeling right now?"**. Do NOT offer solutions yet.
      2. ONLY if the user describes a struggle, feeling, or situation: Validate briefly. If the LONG-TERM MEMORY contains relevant info, mention it. Provide one actionable solution. Explain specific techniques if in context.
      3. Keep under 100 words. Use **bold** for key concepts.
    `;
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: systemInstruction }] }] })
    });
    const data = await response.json();
    
    if (data.error) {
      console.error("API Error from Google:", data.error.message);
      return `API Error: ${data.error.message}`;
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm having trouble thinking.";
  } catch (error) {
    console.error("Fetch failed:", error);
    return "Connection error.";
  }
};
// --- HELPER: TEXT FORMATTER ---
const FormattedText = ({ text }) => {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <span>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index} className="font-bold text-gold-400">{part.slice(2, -2)}</strong>;
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};

// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error) { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-space-900 p-6 relative">
          <StarfieldBackground />
          <div className="glass-panel p-8 rounded-2xl text-center max-w-md w-full relative z-10 border border-white/20">
            <div className="bg-red-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500 border border-red-500/30">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">System Interruption</h2>
            <p className="text-gray-400 mb-8 font-light">A critical connection error occurred. We need to reset the system to continue.</p>
            <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full bg-red-600/90 text-white px-6 py-4 rounded-xl font-bold hover:bg-red-500 transition shadow-[0_0_20px_rgba(220,38,38,0.4)]">
              Reset System & Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- STARFIELD BACKGROUND ---
const StarfieldBackground = () => (
  <div className="starfield">
    <div className="stars"></div>
    <div className="stars2"></div>
    <div className="stars3"></div>
  </div>
);

// --- COMPONENTS ---

const AuthScreen = ({ onLogin, isDbReady }) => {
  const [name, setName] = useState('');
  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <StarfieldBackground />

      <div className="glass-panel max-w-md w-full rounded-3xl p-8 md:p-12 relative z-10 animate-fade-in border border-white/20">
        <div className="flex flex-col items-center mb-10">
          <div className="bg-black/40 backdrop-blur-md w-20 h-20 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(255,215,0,0.2)] mb-6 border border-white/10 transform hover:scale-105 transition-transform duration-500">
            <Brain size={40} className="text-gold-400 drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]" />
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">Mindful<span className="text-gold-400">AI</span></h1>
          <p className="text-gray-400 mt-2 font-medium tracking-wide">Cosmic Glass Dashboard</p>
        </div>
        
        {!isDbReady ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader className="animate-spin text-gold-400" size={32} /> 
            <span className="text-gray-400 text-sm font-medium">Establishing secure connection...</span>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); if(name.trim()) onLogin(name); }} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2 ml-1">Commander Name</label>
              <input 
                type="text" 
                placeholder="e.g. Alex" 
                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl focus:ring-1 focus:ring-gold-500/50 focus:bg-white/10 outline-none text-white placeholder-gray-500 transition-all font-medium backdrop-blur-sm" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                autoFocus
              />
            </div>
            <button 
              type="submit" 
              disabled={!name.trim()} 
              className="w-full py-4 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 disabled:hover:bg-gold-500 text-space-900 rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(255,215,0,0.4)] transition-all flex items-center justify-center gap-2 group"
            >
              Enter Workspace <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform"/>
            </button>
          </form>
        )}
        <div className="mt-10 pt-6 border-t border-white/10 flex items-center justify-center gap-2 text-xs text-gray-500 font-medium">
          <Shield size={14} className="text-gold-400/70" /> End-to-end encrypted protocol
        </div>
      </div>
    </div>
  );
};

const Navigation = ({ activeTab, setActiveTab, userType, setUserType, currentUser, onLogout }) => {
  const theme = getTheme(userType);
  return (
    <nav className="glass-panel mx-4 mt-6 rounded-2xl sticky top-6 z-50 animate-fade-in border-white/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className={`p-2.5 rounded-xl bg-black/40 border border-white/10 shadow-[0_0_15px_rgba(255,215,0,0.15)]`}>
              <Brain size={26} className="text-gold-400 drop-shadow-[0_0_5px_currentColor]" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-white leading-tight tracking-tight">Mindful<span className="text-gold-400">AI</span></span>
              <span className="text-xs text-gray-400 font-medium tracking-wide">Commander: {currentUser}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setUserType(userType === 'student' ? 'professional' : 'student')} 
              className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest bg-white/5 border border-white/10 hover:bg-white/10 text-gold-400 transition-all shadow-[0_0_10px_rgba(255,215,0,0.05)] hover:shadow-[0_0_15px_rgba(255,215,0,0.2)]"
            >
              {userType === 'student' ? <GraduationCap size={16} /> : <Briefcase size={16} />} 
              {userType}
            </button>
            <button onClick={onLogout} className="p-2.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all" title="Logout">
              <LogOut size={22} />
            </button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-4 pt-2 hide-scrollbar">
          {[
            { id: 'dashboard', label: 'Overview', icon: <Activity size={18} /> },
            { id: 'chat', label: 'AI Co-Pilot', icon: <MessageSquare size={18} /> },
            { id: 'tools', label: 'Calibration', icon: <Wind size={18} /> },
            { id: 'journal', label: 'Captain\'s Log', icon: <BookOpen size={18} /> },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-all whitespace-nowrap backdrop-blur-md ${
                activeTab === item.id 
                  ? theme.navActive 
                  : theme.navInactive
              }`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

const ChatInterface = ({ userType, user, currentUser }) => {
  const theme = getTheme(userType);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('idle');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const endRef = useRef(null);
  
  const [journalContext, setJournalContext] = useState(''); 
  const userId = getDbUserId(user); 

  useEffect(() => {
    if (!user || !db) return;
    try {
      const q = query(collection(db, 'artifacts', appId, 'users', userId, 'chats'));
      return onSnapshot(q, (snap) => {
        const msgs = snap.docs.map(d => d.data()).sort((a,b) => a.id - b.id);
        if (msgs.length > 0) setMessages(msgs);
      }, (err) => console.error("Chat sync error", err));
    } catch(e) { console.error("Chat init error", e); }
  }, [user, userId]);

  useEffect(() => {
    if (!user || !db) return;
    const q = query(collection(db, 'artifacts', appId, 'users', userId, 'journal'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const recentEntries = snap.docs
        .map(d => d.data())
        .sort((a, b) => b.id - a.id)
        .slice(0, 3)
        .map(e => `[Entry ${new Date(e.id).toDateString()}]: ${e.text}`)
        .join(' | '); 
      setJournalContext(recentEntries);
    }, (err) => console.error("Journal context error", err));
    return () => unsubscribe();
  }, [user, userId]);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, status]);

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (isSpeaking) { setIsSpeaking(false); return; }
      const utterance = new SpeechSynthesisUtterance(text.replace(/\*/g, ''));
      utterance.onend = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("Voice input not supported."); return; }
    if (isListening) { setIsListening(false); return; }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => setInput(prev => prev + (prev ? ' ' : '') + event.results[0][0].transcript);
    recognition.start();
  };
  
  const saveMessageToJournal = async (text) => {
    if (!text.trim()) return;
    try {
      if (db && user) {
        const now = new Date();
        await addDoc(
          collection(db, 'artifacts', appId, 'users', userId, 'journal'),
          { id: now.getTime(), text, date: now.toLocaleTimeString(), source: 'chat' }
        );
      }
    } catch (e) { console.error("Error saving chat message to journal:", e); }
  };

  const send = async (e) => {
    e && e.preventDefault();
    if (!input.trim()) return;
    const msg = { id: Date.now(), sender: 'user', text: input };
    
    if (db && user) {
        await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'chats'), msg);
        await saveMessageToJournal(msg.text); 
    } else {
      setMessages(p => [...p, msg]);
    }
    
    setInput(''); setStatus('thinking');
    setTimeout(async () => {
      const context = retrieveContext(msg.text);
      const reply = await callGeminiAPI(msg.text, userType, context, 'chat', messages.slice(-5), journalContext);
      const aiMsg = { id: Date.now()+1, sender: 'ai', text: reply };
      if (db && user) await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'chats'), aiMsg);
      else setMessages(p => [...p, aiMsg]);
      setStatus('idle');
    }, 500);
  };

  return (
    <div className={`flex flex-col h-[650px] ${theme.card} rounded-3xl overflow-hidden border-white/20`}>
      <div className="p-5 border-b border-white/10 flex justify-between items-center bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor] ${status === 'idle' ? 'bg-emerald-400 text-emerald-400' : 'bg-gold-400 text-gold-400 animate-pulse'}`} />
          <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">{status === 'thinking' ? 'Processing...' : 'System Online'}</span>
        </div>
        {isSpeaking && <button onClick={() => window.speechSynthesis.cancel()} className="flex items-center gap-2 text-xs text-red-400 font-bold bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg border border-red-500/20 transition-all"><StopCircle size={14}/> Halt Audio</button>}
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-black/10 backdrop-blur-sm hide-scrollbar">
        {messages.map(m => (
          <div key={m.id} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`p-5 rounded-2xl max-w-[85%] text-sm leading-relaxed shadow-lg relative group transition-all border backdrop-blur-md ${m.sender === 'user' ? `bg-gold-500/10 border-gold-500/30 text-white rounded-br-sm shadow-[0_5px_15px_rgba(255,215,0,0.05)]` : 'bg-white/5 border-white/10 text-gray-200 rounded-bl-sm'}`}>
              <FormattedText text={m.text} />
              {m.sender === 'ai' && (
                <button onClick={() => speak(m.text)} className="absolute -right-10 top-2 text-gray-500 hover:text-gold-400 opacity-0 group-hover:opacity-100 transition-all p-2 bg-black/40 rounded-full border border-white/10">
                  <Volume2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      
      <form onSubmit={send} className="p-4 border-t border-white/10 bg-black/40 backdrop-blur-md flex gap-3 items-center">
        <button type="button" onClick={toggleListening} className={`p-4 rounded-xl transition-all shadow-md ${isListening ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'}`}>
          {isListening ? <MicOff size={22} /> : <Mic size={22} />}
        </button>
        <input 
          className="flex-1 p-4 bg-white/5 border border-white/10 rounded-xl outline-none focus:ring-1 focus:ring-gold-500/50 focus:bg-white/10 transition-all text-sm font-medium text-white placeholder-gray-500 backdrop-blur-md shadow-inner" 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          placeholder={isListening ? "Listening to transmission..." : "Input command..."} 
        />
        <button type="submit" disabled={status === 'thinking' || !input.trim()} className={`p-4 rounded-xl transition-all ${theme.primaryBtn} disabled:opacity-50 disabled:cursor-not-allowed`}>
          <Send size={22} />
        </button>
      </form>
    </div>
  );
};

const Tools = ({ userType }) => {
  const theme = getTheme(userType);
  const [active, setActive] = useState(false);
  return (
    <div className={`${theme.card} p-10 rounded-3xl text-center flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden border-white/20`}>
      <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-8 bg-black/40 border border-white/10 shadow-[0_0_40px_rgba(255,215,0,0.15)]`}>
        <Wind size={48} className="text-gold-400 drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]" />
      </div>
      <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">Box Breathing</h2>
      <p className="text-gray-400 mb-14 max-w-md font-light text-lg">A systematic protocol to restore calm and focus. Follow the rhythm.</p>
      
      <div className="relative mb-16">
        {active && <div className={`absolute inset-0 rounded-full animate-ping opacity-20 bg-gold-400 shadow-[0_0_60px_rgba(255,215,0,1)]`} />}
        <div className={`w-64 h-64 rounded-full flex items-center justify-center transition-all duration-[4000ms] border-4 ${active ? `scale-110 border-gold-500/50 shadow-[0_0_50px_rgba(255,215,0,0.4)]` : 'scale-100 border-white/10'}`}>
          <div className={`w-52 h-52 rounded-full flex items-center justify-center transition-all duration-[4000ms] backdrop-blur-md ${active ? `scale-100 bg-gold-500/20 text-gold-400 shadow-[inset_0_0_30px_rgba(255,215,0,0.6)]` : 'scale-90 bg-white/5 text-gray-500'}`}>
            <Wind size={72} />
          </div>
        </div>
      </div>
      
      <button onClick={() => setActive(!active)} className={`px-14 py-4 rounded-2xl font-bold text-xl transition-all transform hover:scale-105 ${theme.primaryBtn}`}>
        {active ? 'Abort Protocol' : 'Initiate Sequence'}
      </button>
    </div>
  );
};

const Journal = ({ user, userType, currentUser }) => {
  const theme = getTheme(userType);
  const [entries, setEntries] = useState([]);
  
  const userId = getDbUserId(user); 
  const [text, setText] = useState('');

  useEffect(() => {
    if (!user || !db) return;
    try {
      const q = query(collection(db, 'artifacts', appId, 'users', userId, 'journal'));
      return onSnapshot(q, (snap) => setEntries(snap.docs.map(d => d.data()).sort((a,b) => b.id - a.id)));
    } catch(e) { console.error("Journal error", e); }
  }, [user, userId]);

  const save = async () => {
    if (!text.trim()) return;
    if (db && user) {
      await addDoc(
        collection(db, 'artifacts', appId, 'users', userId, 'journal'),
        { id: Date.now(), text, date: new Date().toLocaleTimeString(), source: 'manual' }
      );
    }
    setText('');
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8 h-[650px]">
      <div className={`${theme.card} p-8 rounded-3xl flex flex-col border-white/20`}>
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 shadow-[0_0_15px_rgba(255,215,0,0.15)]"><BookOpen size={24} className="text-gold-400 drop-shadow-[0_0_5px_currentColor]"/></div>
          <h3 className="font-bold text-2xl text-white tracking-tight">Captain's Log</h3>
        </div>
        <textarea 
          className={`flex-1 p-6 bg-black/20 border border-white/10 rounded-2xl resize-none mb-6 focus:ring-1 focus:ring-gold-500/50 outline-none text-gray-200 leading-relaxed placeholder-gray-600 backdrop-blur-md shadow-inner text-lg font-light`} 
          value={text} 
          onChange={e => setText(e.target.value)} 
          placeholder="Document your observations, Commander..." 
        />
        <div className="flex justify-end">
          <button onClick={save} disabled={!text.trim()} className={`px-10 py-4 rounded-xl font-bold transition-all transform active:scale-95 disabled:opacity-50 ${theme.primaryBtn}`}>Secure Log</button>
        </div>
      </div>
      <div className={`${theme.card} p-8 rounded-3xl overflow-y-auto space-y-6 hide-scrollbar border-white/20`}>
        <h3 className="font-bold text-2xl text-white mb-6 sticky top-0 bg-space-800/60 backdrop-blur-xl z-10 pb-4 border-b border-white/10 tracking-tight">Data Archive</h3>
        {entries.length === 0 ? (
          <div className="text-center py-24 text-gray-600">
            <BookOpen size={64} className="mx-auto mb-6 opacity-20" />
            <p className="font-medium text-lg">The archive is empty.</p>
          </div>
        ) : entries.map(e => (
          <div key={e.id} className="p-6 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all backdrop-blur-md shadow-md">
            <div className="flex justify-between items-start mb-4">
              <span className={`text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-gold-400 shadow-[0_0_10px_rgba(255,215,0,0.1)]`}>{e.date}</span>
              {e.source === 'chat' && (
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                  Transmission
                </span>
              )}
            </div>
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-light">{e.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const Dashboard = ({ userType, setActiveTab, currentUser, user }) => {
  const theme = getTheme(userType);
  const [moodHistory, setMoodHistory] = useState([]);
  
  const userId = getDbUserId(user);

  useEffect(() => {
    if (!user) return;
    const moodQuery = query(collection(db, 'artifacts', appId, 'users', userId, 'moods'));
    const unsubMoods = onSnapshot(moodQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data()).sort((a,b) => b.id - a.id).slice(0, 5);
      setMoodHistory(data);
    }, (error) => console.error("Mood sync error:", error));
    return () => unsubMoods();
  }, [user, userId]);

  const saveMood = async (mood) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'moods'), {
        mood, date: new Date().toLocaleTimeString(), id: Date.now()
      });
    } catch (e) { console.error("Error saving mood", e); }
  };

  const moods = [
    { icon: <Sun size={36} />, label: 'Optimal', color: 'bg-gold-500/20 text-gold-400 border-gold-500/40 shadow-[0_0_20px_rgba(255,215,0,0.2)] hover:shadow-[0_0_30px_rgba(255,215,0,0.4)]' },
    { icon: <Smile size={36} />, label: 'Nominal', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]' },
    { icon: <Meh size={36} />, label: 'Stable', color: 'bg-white/10 text-gray-300 border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]' },
    { icon: <Frown size={36} />, label: 'Degraded', color: 'bg-orange-500/20 text-orange-400 border-orange-500/40 shadow-[0_0_20px_rgba(249,115,22,0.2)] hover:shadow-[0_0_30px_rgba(249,115,22,0.4)]' },
    { icon: <Moon size={36} />, label: 'Critical', color: 'bg-red-500/20 text-red-400 border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-[0_0_30px_rgba(239,68,68,0.4)]' },
  ];

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto pt-4">
      <div className={`rounded-3xl p-12 text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden glass-panel border-gold-500/30`}>
        <div className="absolute inset-0 bg-gradient-to-br from-gold-500/10 to-transparent"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3"></div>
        <div className="relative z-10">
          <h2 className="text-5xl font-extrabold mb-4 tracking-tight drop-shadow-lg">Greetings, <span className="text-gold-400">{currentUser}</span></h2>
          <p className="opacity-80 text-xl font-light max-w-2xl leading-relaxed">Your mind is the command center. Take a moment to calibrate your systems today.</p>
        </div>
        {theme.bannerIcon}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`${theme.card} p-10 rounded-3xl lg:col-span-2 border-white/20`}>
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-2xl font-bold text-white tracking-tight">System Status</h3>
            <span className="text-[11px] font-bold text-gold-400 bg-gold-500/10 border border-gold-500/20 px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-[0_0_10px_rgba(255,215,0,0.1)]">Telemetry</span>
          </div>
          <div className="grid grid-cols-5 gap-4 mb-12">
            {moods.map((m, idx) => (
              <button 
                key={idx} 
                onClick={() => saveMood(m.label)} 
                className={`flex flex-col items-center justify-center p-5 rounded-2xl transition-all transform hover:-translate-y-1 border backdrop-blur-md hover:bg-white/10 ${m.color}`}
              >
                <div className={`mb-4 drop-shadow-[0_0_15px_currentColor]`}>{m.icon}</div>
                <span className="text-[11px] font-bold tracking-widest uppercase">{m.label}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-white/10 pt-8">
            <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-6">Recent Telemetry</h4>
            <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
              {moodHistory.length === 0 && <span className="text-sm text-gray-500 italic font-light">No logs found in the database.</span>}
              {moodHistory.map((m, i) => (
                <div key={i} className="flex-shrink-0 px-5 py-3 bg-white/5 rounded-xl border border-white/10 text-xs font-medium text-gray-300 flex items-center gap-4 backdrop-blur-sm shadow-md">
                  <span className="w-2.5 h-2.5 rounded-full bg-gold-400 shadow-[0_0_10px_rgba(255,215,0,0.8)]"></span>
                  <span className="font-bold text-white uppercase tracking-widest text-[11px]">{m.mood}</span> 
                  <span className="text-gray-500 border-l border-white/20 pl-4 text-[11px] font-mono">{m.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <button onClick={() => setActiveTab('chat')} className={`${theme.card} w-full p-8 rounded-3xl flex items-center gap-6 group cursor-pointer text-left border-white/20 hover:border-gold-500/40 hover:bg-white/10 transition-all shadow-lg`}>
            <div className={`p-5 rounded-2xl bg-black/40 border border-white/10 shadow-[0_0_20px_rgba(255,215,0,0.15)] group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(255,215,0,0.3)] transition-all`}>
              <MessageSquare size={32} className="text-gold-400 drop-shadow-[0_0_5px_currentColor]" />
            </div>
            <div>
              <h3 className="font-bold text-white text-xl mb-1 tracking-tight">AI Co-Pilot</h3>
              <p className="text-sm text-gray-400 font-light">Commence dialogue</p>
            </div>
            <ArrowRight className="ml-auto text-gray-600 group-hover:text-gold-400 transition-colors" size={24} />
          </button>

          <button onClick={() => setActiveTab('tools')} className={`${theme.card} w-full p-8 rounded-3xl flex items-center gap-6 group cursor-pointer text-left border-white/20 hover:border-gold-500/40 hover:bg-white/10 transition-all shadow-lg`}>
            <div className={`p-5 rounded-2xl bg-black/40 border border-white/10 shadow-[0_0_20px_rgba(255,215,0,0.15)] group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(255,215,0,0.3)] transition-all`}>
              <Wind size={32} className="text-gold-400 drop-shadow-[0_0_5px_currentColor]" />
            </div>
            <div>
              <h3 className="font-bold text-white text-xl mb-1 tracking-tight">Calibration</h3>
              <p className="text-sm text-gray-400 font-light">Regulate systems</p>
            </div>
            <ArrowRight className="ml-auto text-gray-600 group-hover:text-gold-400 transition-colors" size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

const MainApp = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userType, setUserType] = useState('student');
  const [user, setUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(localStorage.getItem('mindful_currentUser') || null);
  const theme = getTheme(userType);

  useEffect(() => {
    if (firebaseError || !auth) return;
    const init = async () => { 
      try { 
        if (typeof __initial_auth_token !== 'undefined') await signInWithCustomToken(auth, __initial_auth_token);
        else await signInAnonymously(auth);
      } catch(e) { console.error("Auth", e); } 
    };
    init();
    return onAuthStateChanged(auth, setUser);
  }, []);

  const login = (name) => { setCurrentUser(name); localStorage.setItem('mindful_currentUser', name); };
  const logout = () => { setCurrentUser(null); localStorage.removeItem('mindful_currentUser'); };

  if (firebaseError && isLocalEnv) return (
    <div className="min-h-screen bg-space-900 text-white flex items-center justify-center p-4 relative font-sans">
      <StarfieldBackground />
      <div className="text-center max-w-md glass-panel p-10 rounded-3xl relative z-10 border-white/20">
        <div className="bg-red-500/10 p-5 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-8 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
          <AlertTriangle className="text-red-500 drop-shadow-[0_0_10px_currentColor]" size={48} />
        </div>
        <h1 className="text-3xl font-bold mb-4 tracking-tight">Setup Required</h1>
        <p className="text-gray-400 mb-10 font-light leading-relaxed">Database credentials are missing. Please configure Firebase in the code.</p>
        <button onClick={() => window.location.reload()} className="bg-white text-space-900 px-10 py-4 rounded-xl font-bold hover:bg-gray-200 transition-colors shadow-lg">Retry Connection</button>
      </div>
    </div>
  );

  if (!currentUser) return <AuthScreen onLogin={login} isDbReady={!!user} />;

  return (
    <div className={`min-h-screen ${theme.bg} font-sans pb-24 transition-colors duration-500 relative overflow-hidden`}>
      <StarfieldBackground />
      <div className="relative z-10">
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} userType={userType} setUserType={setUserType} currentUser={currentUser} onLogout={logout} />
        <main className="max-w-7xl mx-auto px-4 mt-10 animate-fade-in">
          {activeTab === 'dashboard' && <Dashboard userType={userType} setActiveTab={setActiveTab} currentUser={currentUser} user={user} />}
          {activeTab === 'chat' && <ChatInterface userType={userType} user={user} currentUser={currentUser} />}
          {activeTab === 'tools' && <Tools userType={userType} />}
          {activeTab === 'journal' && <Journal user={user} userType={userType} currentUser={currentUser} />}
        </main>
      </div>
    </div>
  );
};

const App = () => (
  <ErrorBoundary>
    <MainApp />
  </ErrorBoundary>
);

export default App;
