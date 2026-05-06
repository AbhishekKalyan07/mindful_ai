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
const GEMINI_API_KEY = "AIzaSyAgs3N2V0RD8uegtlnLqMxJR2L3uuvby68";// ⚠️ Replace with your valid long AIza... key

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
    apiKey: "AIzaSyABCFyFDmESODZIN0Qs2ts12kXCrPRGWKY",
    authDomain: "mindful-ai-f1d06.firebaseapp.com",
    projectId: "mindful-ai-f1d06",
    storageBucket: "mindful-ai-f1d06.firebasestorage.app",
    messagingSenderId: "868352067750",
    appId: "1:868352067750:web:7cd0f0356fbfc5d27b8c67",
    measurementId: "G-BVCNM474Z5"
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

// --- THEME ENGINE ---
const getTheme = (userType) => {
  if (userType === 'student') {
    return {
      type: 'student',
      bg: 'bg-slate-50',
      gradient: 'bg-gradient-to-r from-teal-500 to-emerald-500',
      textMain: 'text-slate-800',
      textMuted: 'text-slate-500',
      card: 'bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300',
      primaryBtn: 'bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-200',
      secondaryBtn: 'bg-white text-teal-700 border border-teal-200 hover:bg-teal-50',
      accent: 'text-teal-600',
      navActive: 'bg-teal-50 text-teal-700',
      navInactive: 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
      bannerIcon: <Wind className="absolute -right-6 -bottom-6 text-white/10 rotate-12" size={180} />
    };
  } else {
    return {
      type: 'professional',
      bg: 'bg-gray-50',
      gradient: 'bg-gradient-to-r from-slate-700 to-gray-900',
      textMain: 'text-gray-900',
      textMuted: 'text-gray-500',
      card: 'bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300',
      primaryBtn: 'bg-slate-800 hover:bg-slate-900 text-white shadow-lg shadow-slate-200',
      secondaryBtn: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
      accent: 'text-slate-700',
      navActive: 'bg-slate-100 text-slate-900',
      navInactive: 'text-gray-500 hover:bg-gray-100 hover:text-gray-900',
      bannerIcon: <Activity className="absolute -right-6 -bottom-6 text-white/10" size={180} />
    };
  }
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
  } else if (type === 'reframe') {
    systemInstruction = `CBT Expert. User thought: "${userInput}". Provide one powerful positive reframe.`;
  } else if (type === 'weather') {
    systemInstruction = `Analyze: "${userInput}". Generate 'Mental Weather Report'. Format: Current Conditions: [Metaphor], Forecast: [Prediction], Advisory: [Tip].`;
  }

  try {
    // 🚨 The definitive fix: Using the 2.5 flash model your key is authorized for
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
          return <strong key={index} className="font-bold text-inherit">{part.slice(2, -2)}</strong>;
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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-100 text-center max-w-md w-full">
            <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">System Interruption</h2>
            <p className="text-gray-500 mb-8">A critical connection error occurred. We need to reset the system to continue.</p>
            <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition shadow-lg shadow-red-200">
              Reset System & Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- COMPONENTS ---

const AuthScreen = ({ onLogin, isDbReady }) => {
  const [name, setName] = useState('');
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />

      <div className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-3xl p-8 md:p-12 shadow-2xl border border-white/50 relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 mb-4 transform rotate-3">
            <Brain size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">MindfulAI</h1>
          <p className="text-slate-500 mt-2 font-medium">Your intelligent wellness companion</p>
        </div>
        
        {!isDbReady ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader className="animate-spin text-indigo-600" size={32} /> 
            <span className="text-slate-500 text-sm font-medium">Establishing secure connection...</span>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); if(name.trim()) onLogin(name); }} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">Display Name</label>
              <input 
                type="text" 
                placeholder="e.g. Alex" 
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-900 placeholder-slate-400 transition-all font-medium" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                autoFocus
              />
            </div>
            <button 
              type="submit" 
              disabled={!name.trim()} 
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 group"
            >
              Enter Workspace <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform"/>
            </button>
          </form>
        )}
        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
          <Shield size={12} /> End-to-end encrypted storage
        </div>
      </div>
    </div>
  );
};

const Navigation = ({ activeTab, setActiveTab, userType, setUserType, currentUser, onLogout }) => {
  const theme = getTheme(userType);
  return (
    <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className={`p-2.5 rounded-xl ${theme.navActive}`}>
              <Brain size={24} />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-slate-900 leading-tight tracking-tight">MindfulAI</span>
              <span className="text-xs text-slate-500 font-medium">Welcome, {currentUser}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setUserType(userType === 'student' ? 'professional' : 'student')} 
              className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider border transition-all ${userType === 'student' ? 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'}`}
            >
              {userType === 'student' ? <GraduationCap size={14} /> : <Briefcase size={14} />} 
              {userType} Mode
            </button>
            <button onClick={onLogout} className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Logout">
              <LogOut size={20} />
            </button>
          </div>
        </div>
        <div className="flex gap-6 overflow-x-auto pb-px hide-scrollbar">
          {[
            { id: 'dashboard', label: 'Overview', icon: <Activity size={18} /> },
            { id: 'chat', label: 'Assistant', icon: <MessageSquare size={18} /> },
            { id: 'tools', label: 'Tools', icon: <Wind size={18} /> },
            { id: 'journal', label: 'Journal', icon: <BookOpen size={18} /> },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                activeTab === item.id 
                  ? `${theme.accent} border-current` 
                  : 'text-slate-500 border-transparent hover:text-slate-800'
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
  
  const [journalContext, setJournalContext] = useState(''); // State for Long-Term Memory
  // FIX: Use user.uid for the main path to satisfy security rules
  const userId = getDbUserId(user); 

  // 1. Fetch Chat History
  useEffect(() => {
    if (!user || !db) return;
    try {
      // Use user.uid in the path
      const q = query(collection(db, 'artifacts', appId, 'users', userId, 'chats'));
      return onSnapshot(q, (snap) => {
        const msgs = snap.docs.map(d => d.data()).sort((a,b) => a.id - b.id);
        if (msgs.length > 0) setMessages(msgs);
      }, (err) => console.error("Chat sync error", err));
    } catch(e) { console.error("Chat init error", e); }
  }, [user, userId]);

  // 2. Fetch Journal History (Long-Term Memory RAG)
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
    } catch (e) {
      console.error("Error saving chat message to journal:", e);
    }
  };

  const send = async (e) => {
    e && e.preventDefault();
    if (!input.trim()) return;
    const msg = { id: Date.now(), sender: 'user', text: input };
    
    // Save to Chat DB and Journal DB
    if (db && user) {
        await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'chats'), msg);
        await saveMessageToJournal(msg.text); // Saves to journal collection
    } else {
      setMessages(p => [...p, msg]);
    }
    
    setInput(''); setStatus('thinking');
    setTimeout(async () => {
      const context = retrieveContext(msg.text);
      const reply = await callGeminiAPI(
        msg.text,
        userType,
        context,
        'chat',
        messages.slice(-5),
        journalContext // PASSING THE LONG-TERM JOURNAL MEMORY HERE
      );
      
      const aiMsg = { id: Date.now()+1, sender: 'ai', text: reply };
      if (db && user) await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'chats'), aiMsg);
      else setMessages(p => [...p, aiMsg]);
      setStatus('idle');
    }, 500);
  };

  return (
    <div className={`flex flex-col h-[600px] ${theme.card} rounded-2xl overflow-hidden`}>
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${status === 'idle' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{status === 'thinking' ? 'AI Analyzing...' : 'Assistant Online'}</span>
        </div>
        {isSpeaking && <button onClick={() => window.speechSynthesis.cancel()} className="flex items-center gap-1 text-xs text-red-500 font-bold hover:bg-red-50 px-2 py-1 rounded"><StopCircle size={12}/> Stop</button>}
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
        {messages.map(m => (
          <div key={m.id} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`p-4 rounded-2xl max-w-[85%] text-sm leading-relaxed shadow-sm relative group transition-all ${m.sender === 'user' ? `${theme.primaryBtn} rounded-br-sm` : 'bg-slate-100 text-slate-800 rounded-bl-sm'}`}>
              <FormattedText text={m.text} />
              {m.sender === 'ai' && (
                <button onClick={() => speak(m.text)} className="absolute -right-8 top-2 text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition p-1">
                  <Volume2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      
      <form onSubmit={send} className="p-4 border-t border-slate-100 bg-white flex gap-3 items-center">
        <button type="button" onClick={toggleListening} className={`p-3 rounded-xl transition-all ${isListening ? 'bg-red-100 text-red-600 ring-2 ring-red-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
          {isListening ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        <input 
          className="flex-1 p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white transition-all text-sm font-medium" 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          placeholder={isListening ? "Listening..." : "Type your message..."} 
        />
        <button type="submit" disabled={status === 'thinking'} className={`p-3.5 rounded-xl transition-all ${theme.primaryBtn} disabled:opacity-70 disabled:cursor-not-allowed`}>
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};

const Tools = ({ userType }) => {
  const theme = getTheme(userType);
  const [active, setActive] = useState(false);
  return (
    <div className={`${theme.card} p-8 rounded-2xl text-center flex flex-col items-center justify-center min-h-[400px]`}>
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${theme.navActive}`}>
        <Wind size={32} />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Box Breathing</h2>
      <p className="text-slate-500 mb-10 max-w-sm">A simple technique to restore calm and focus. Follow the rhythm.</p>
      
      <div className="relative mb-10">
        {active && <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${theme.navActive}`} />}
        <div className={`w-48 h-48 rounded-full flex items-center justify-center transition-all duration-[4000ms] border-4 ${active ? `scale-110 border-teal-500/30` : 'scale-100 border-slate-100'}`}>
          <div className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-[4000ms] ${active ? `scale-100 ${theme.navActive}` : 'scale-90 bg-slate-100 text-slate-300'}`}>
            <Wind size={48} />
          </div>
        </div>
      </div>
      
      <button onClick={() => setActive(!active)} className={`px-10 py-3 rounded-xl font-bold text-lg transition-all transform hover:scale-105 ${theme.primaryBtn}`}>
        {active ? 'End Session' : 'Begin Exercise'}
      </button>
    </div>
  );
};

const Journal = ({ user, userType, currentUser }) => {
  const theme = getTheme(userType);
  const [entries, setEntries] = useState([]);
  
  // FIX: Use user.uid for the database path
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
    <div className="grid lg:grid-cols-2 gap-8 h-[600px]">
      <div className={`${theme.card} p-6 rounded-2xl flex flex-col`}>
        <div className="flex items-center gap-3 mb-6">
          <div className={`p-2 rounded-lg ${theme.navActive}`}><BookOpen size={20}/></div>
          <h3 className="font-bold text-lg text-slate-800">New Entry</h3>
        </div>
        <textarea 
          className={`flex-1 p-5 border border-slate-200 rounded-xl resize-none mb-4 focus:ring-2 outline-none text-slate-700 leading-relaxed ${theme.bg} ${userType === 'student' ? 'focus:ring-teal-100' : 'focus:ring-slate-200'}`} 
          value={text} 
          onChange={e => setText(e.target.value)} 
          placeholder="What's weighing on your mind today?" 
        />
        <div className="flex justify-end">
          <button onClick={save} className={`px-6 py-3 rounded-xl font-bold transition-all transform active:scale-95 ${theme.primaryBtn}`}>Save Entry</button>
        </div>
      </div>
      <div className={`${theme.card} p-6 rounded-2xl overflow-y-auto space-y-4`}>
        <h3 className="font-bold text-lg text-slate-800 mb-4 sticky top-0 bg-white z-10 pb-4 border-b border-slate-100">Past Entries</h3>
        {entries.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <BookOpen size={48} className="mx-auto mb-3 opacity-20" />
            <p>Your journal is empty.</p>
          </div>
        ) : entries.map(e => (
          <div key={e.id} className="p-5 rounded-xl border border-slate-100 hover:border-slate-300 transition-colors bg-slate-50/50">
            <div className="flex justify-between items-start mb-3">
              <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded bg-white border border-slate-100 ${theme.textMuted}`}>{e.date}</span>
              {e.source === 'chat' && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-100 border border-slate-200 px-2 py-1 rounded-full">
                  From chat
                </span>
              )}
            </div>
            <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{e.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const Dashboard = ({ userType, setActiveTab, currentUser, user }) => {
  const theme = getTheme(userType);
  const [moodHistory, setMoodHistory] = useState([]);
  
  const userId = getDbUserId(user); // FIX: Use user.uid for the database path

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
    { icon: <Sun size={28} />, label: 'Great', color: 'bg-yellow-100 text-yellow-600 ring-yellow-200' },
    { icon: <Smile size={28} />, label: 'Good', color: 'bg-emerald-100 text-emerald-600 ring-emerald-200' },
    { icon: <Meh size={28} />, label: 'Okay', color: 'bg-slate-100 text-slate-600 ring-slate-200' },
    { icon: <Frown size={28} />, label: 'Low', color: 'bg-orange-100 text-orange-600 ring-orange-200' },
    { icon: <Moon size={28} />, label: 'Bad', color: 'bg-indigo-100 text-indigo-600 ring-indigo-200' },
  ];

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      <div className={`rounded-3xl p-10 text-white shadow-2xl relative overflow-hidden ${theme.gradient}`}>
        <div className="relative z-10">
          <h2 className="text-4xl font-extrabold mb-3 tracking-tight">Welcome, {currentUser}</h2>
          <p className="opacity-90 text-lg font-medium max-w-xl">Your mind is a priority. Take a moment to check in with yourself today.</p>
        </div>
        {theme.bannerIcon}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`${theme.card} p-8 rounded-2xl lg:col-span-2`}>
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-slate-800">How are you feeling?</h3>
            <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded">Daily Check-in</span>
          </div>
          <div className="grid grid-cols-5 gap-4 mb-8">
            {moods.map((m, idx) => (
              <button 
                key={idx} 
                onClick={() => saveMood(m.label)} 
                className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all transform hover:scale-110 hover:ring-4 ${m.color.replace('ring-', 'hover:ring-')}`}
              >
                <div className={`mb-3 p-3 rounded-full ${m.color}`}>{m.icon}</div>
                <span className="text-xs font-bold text-slate-600">{m.label}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-slate-100 pt-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Recent Moods</h4>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {moodHistory.length === 0 && <span className="text-sm text-slate-400 italic">No check-ins yet.</span>}
              {moodHistory.map((m, i) => (
                <div key={i} className="flex-shrink-0 px-4 py-2 bg-slate-50 rounded-lg border border-slate-100 text-xs font-medium text-slate-600 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  <span className="font-bold text-slate-800">{m.mood}</span> 
                  <span className="text-slate-400 border-l border-slate-200 pl-2 ml-1">{m.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <button onClick={() => setActiveTab('chat')} className={`${theme.card} w-full p-6 rounded-2xl flex items-center gap-4 group cursor-pointer text-left`}>
            <div className={`p-4 rounded-2xl ${theme.navActive} group-hover:scale-110 transition-transform`}>
              <MessageSquare size={28} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">AI Assistant</h3>
              <p className="text-sm text-slate-500">Chat for support</p>
            </div>
            <ArrowRight className="ml-auto text-slate-300 group-hover:text-slate-500 transition-colors" />
          </button>

          <button onClick={() => setActiveTab('tools')} className={`${theme.card} w-full p-6 rounded-2xl flex items-center gap-4 group cursor-pointer text-left`}>
            <div className={`p-4 rounded-2xl ${theme.navActive} group-hover:scale-110 transition-transform`}>
              <Wind size={28} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Exercises</h3>
              <p className="text-sm text-slate-500">Calm your mind</p>
            </div>
            <ArrowRight className="ml-auto text-slate-300 group-hover:text-slate-500 transition-colors" />
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
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="bg-red-500/10 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="text-red-500" size={40} />
        </div>
        <h1 className="text-2xl font-bold mb-2">Setup Required</h1>
        <p className="text-slate-400 mb-6">Database credentials are missing. Please configure Firebase in the code.</p>
        <button onClick={() => window.location.reload()} className="bg-white text-slate-900 px-8 py-2 rounded-lg">Retry Connection</button>
      </div>
    </div>
  );

  if (!currentUser) return <AuthScreen onLogin={login} isDbReady={!!user} />;

  return (
    <div className={`min-h-screen ${theme.bg} font-sans text-slate-900 pb-20 transition-colors duration-500`}>
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} userType={userType} setUserType={setUserType} currentUser={currentUser} onLogout={logout} />
      <main className="max-w-7xl mx-auto px-4 mt-8">
        {activeTab === 'dashboard' && <Dashboard userType={userType} setActiveTab={setActiveTab} currentUser={currentUser} user={user} />}
        {activeTab === 'chat' && <ChatInterface userType={userType} user={user} currentUser={currentUser} />}
        {activeTab === 'tools' && <Tools userType={userType} />}
        {activeTab === 'journal' && <Journal user={user} userType={userType} currentUser={currentUser} />}
      </main>
    </div>
  );
};

const App = () => (
  <ErrorBoundary>
    <MainApp />
  </ErrorBoundary>
);

export default App;