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

const getDbUserId = (user) => user?.uid || 'anonymous_user';

// --- THEME ENGINE ---
const getTheme = (userType) => ({
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
});

// --- 1. EMPATHETIC KNOWLEDGE BASE ---
const KNOWLEDGE_BASE = [
  {
    id: 'anxiety_grounding',
    tags: ['anxiety', 'panic', 'scared', 'worry', 'nervous', 'overwhelmed', 'stress', 'heart racing', 'cant breathe', 'spiraling', 'dread', 'tense'],
    title: '5-4-3-2-1 Grounding',
    content: `It makes complete sense that you're feeling overwhelmed right now — your mind is working overtime trying to keep you safe. One of the most gentle ways to come back to yourself is grounding. 

Try this when you're ready: Notice **5 things you can see** around you, **4 things you can physically touch**, **3 sounds** you can hear, **2 things you can smell**, and **1 thing you can taste**. 

This isn't about fixing anything — it's just an invitation to let your nervous system know you're safe, right here, right now. Take it at your own pace.`
  },
  {
    id: 'study_pressure',
    tags: ['exam', 'test', 'study', 'grade', 'fail', 'academic', 'focus', 'homework', 'cramming', 'assignment', 'deadline', 'pressure', 'marks', 'score', 'college'],
    title: 'Gentle Study Rhythm',
    content: `It's exhausting carrying the weight of academic pressure — and it's okay to feel that way. Your worth is not defined by a grade.

When you're ready to study, try working in **25-minute focused blocks** followed by a genuine **5-minute rest** (not doom-scrolling — actually rest). After 4 blocks, give yourself a real **20-minute break**. 

This isn't about grinding harder — it's about working *with* your brain, not against it. Your mind needs recovery just like your body does.`
  },
  {
    id: 'sleep_difficulty',
    tags: ['sleep', 'insomnia', 'tired', 'awake', 'rest', 'bed', 'night', 'cant sleep', 'exhausted', 'fatigue', 'restless', 'lying awake'],
    title: 'Falling Asleep with Kindness',
    content: `Not being able to sleep when you desperately need rest is genuinely frustrating. Your mind isn't broken — it's just stuck in "on" mode.

One technique that helps is **cognitive shuffling**: picture a completely random word (like "umbrella"), then gently visualize each letter as a simple image for about 5 seconds. Move through random words. It sounds strange, but it works by giving your brain something harmless to follow instead of your worries.

Be patient with yourself tonight. Rest, even without sleep, still helps.`
  },
  {
    id: 'work_stress',
    tags: ['work', 'boss', 'job', 'burnout', 'career', 'deadline', 'meeting', 'office', 'colleagues', 'toxic', 'fired', 'pressure', 'workload', 'overworked', 'promotion'],
    title: 'Work Stress & Boundaries',
    content: `Workplace stress can feel relentless, especially when it bleeds into every corner of your life. What you're feeling is valid — it's a lot to carry.

One thing worth remembering: **protecting your time and energy isn't selfish** — it's what makes sustainable performance possible. "No" is a complete sentence, and using it thoughtfully is a form of self-respect.

If burnout is creeping in, even small acts of recovery matter: a walk, a meal without screens, a conversation with someone safe. You don't have to solve everything today.`
  },
  {
    id: 'low_mood',
    tags: ['sad', 'depressed', 'unhappy', 'cry', 'lonely', 'low', 'grief', 'hopeless', 'empty', 'numb', 'lost', 'worthless', 'down', 'melancholy', 'heartbroken'],
    title: 'Being with Difficult Emotions',
    content: `Feeling sad, empty, or low isn't a weakness — it's part of being human. And it can feel so isolating, especially when you don't know why it's there.

One gentle shift: instead of saying "I *am* depressed," try "I *am feeling* depressed right now." That small distance reminds us that emotions move through us — they aren't us.

You don't need to fix this feeling right now. Just being honest about it, even with yourself, takes real courage. I'm here to listen as long as you need.`
  },
  {
    id: 'anger_frustration',
    tags: ['angry', 'anger', 'frustrated', 'rage', 'irritated', 'furious', 'mad', 'annoyed', 'explode', 'snap', 'short temper'],
    title: 'Working Through Anger',
    content: `Anger is often a signal — it usually means something important to you has been threatened or hurt. It's not a flaw; it's information.

When you notice anger rising, try **box breathing**: breathe in for 4 counts, hold for 4, breathe out for 4, hold for 4. It activates your parasympathetic nervous system and creates just enough space between feeling and reacting.

Once the intensity softens, it can help to ask: *What's underneath this anger? Is it fear? Hurt? Disappointment?* That's usually where the real conversation begins.`
  },
  {
    id: 'relationship_issues',
    tags: ['relationship', 'breakup', 'partner', 'friend', 'family', 'fight', 'conflict', 'betrayal', 'trust', 'toxic', 'missing someone', 'rejection', 'divorce', 'separation'],
    title: 'Navigating Relationship Pain',
    content: `Relationship pain — whether it's a breakup, a conflict, or feeling disconnected — can feel like the ground has shifted beneath you. That kind of hurt is real and deserves to be acknowledged.

It's okay to grieve what was, or what you hoped for. Healing isn't linear, and you don't have to "get over it" on any particular timeline.

Be gentle with yourself. Leaning on people you trust, journaling your feelings, or even just giving yourself permission to feel it — all of that counts as healing.`
  },
  {
    id: 'self_doubt',
    tags: ['confidence', 'self doubt', 'impostor', 'not good enough', 'failure', 'stupid', 'worthless', 'comparing', 'insecure', 'hate myself', 'ugly', 'useless'],
    title: 'Meeting Self-Doubt with Compassion',
    content: `That inner critic can be so loud sometimes — and its words can feel like facts, even when they're not.

Here's something worth sitting with: **you would never speak to a friend the way you speak to yourself**. The harshness we reserve for ourselves often comes from fear, not truth.

Self-compassion isn't about toxic positivity or pretending everything is fine. It's about speaking to yourself with the same warmth you'd offer someone you love who is struggling. You deserve that too.`
  }
];

// --- 2. IMPROVED RAG LOGIC ---
const retrieveContext = (query) => {
  const text = query.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  for (const doc of KNOWLEDGE_BASE) {
    const score = doc.tags.filter(tag => text.includes(tag)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = doc;
    }
  }

  return bestScore > 0 ? bestMatch : null;
};

// --- 3. EMPATHETIC AI PROMPT ---
const callGeminiAPI = async (userInput, userType, contextDoc, type = 'chat', history = [], journalMemory = '') => {
  if (!GEMINI_API_KEY) return "⚠️ System Alert: API Key Missing.";

  let systemInstruction = "";

  if (type === 'chat') {
    const conversationContext = history
      .map(msg => `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
      .join('\n');

    systemInstruction = `
You are a warm, compassionate mental wellness companion. You are NOT a therapist, but you are deeply human, empathetic, and present.

YOUR CORE PRINCIPLES:
- Always acknowledge feelings BEFORE offering any advice or techniques
- Never rush to fix. Humans need to feel heard first
- Use gentle, natural language — never clinical or robotic
- Keep responses under 120 words
- Use **bold** only for key technique names, not for emphasis
- If the person seems in crisis (mentions self-harm, suicide, harming others), gently encourage them to reach a professional or crisis helpline

CONTEXT ABOUT THE USER:
- They are a ${userType}
- Recent journal entries: ${journalMemory || 'None available'}

RELEVANT TECHNIQUE (use only if it fits naturally, after emotional validation):
${contextDoc ? `"${contextDoc.title}": ${contextDoc.content}` : 'No specific technique — offer general compassionate support'}

RECENT CONVERSATION:
${conversationContext || 'This is the start of the conversation'}

CURRENT MESSAGE: "${userInput}"

RESPONSE RULES:
1. If this is a greeting or neutral opener → Reply warmly and ask "How are you feeling right now?" — nothing else.
2. If the user shares a struggle → First, validate their feeling genuinely (1-2 sentences). Reference journal memory if relevant. Then, if appropriate, gently introduce a technique. Never make them feel like they're being given homework.
3. Never list multiple techniques. One gentle suggestion at most.
4. End with an open, caring question or quiet presence — not a sales pitch for the app.
5. Write as a human friend who happens to know about mental wellness, not as a bot.
    `.trim();
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: systemInstruction }] }] })
      }
    );
    const data = await response.json();

    if (data.error) {
      console.error("API Error:", data.error.message);
      return `API Error: ${data.error.message}`;
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm here with you. Can you tell me more about what's going on?";
  } catch (error) {
    console.error("Fetch failed:", error);
    return "I'm having trouble connecting right now. Please try again in a moment.";
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
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-space-900 p-6 relative">
          <StarfieldBackground />
          <div className="glass-panel p-8 rounded-2xl text-center max-w-md w-full relative z-10 border border-white/20">
            <div className="bg-red-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500 border border-red-500/30">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Something went wrong</h2>
            <p className="text-gray-400 mb-8 font-light">A connection error occurred. Let's reset and try again.</p>
            <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full bg-red-600/90 text-white px-6 py-4 rounded-xl font-bold hover:bg-red-500 transition shadow-[0_0_20px_rgba(220,38,38,0.4)]">
              Reset & Reload
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

// --- AUTH SCREEN ---
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
          <p className="text-gray-400 mt-2 font-medium tracking-wide">Your compassionate wellness companion</p>
        </div>

        {!isDbReady ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader className="animate-spin text-gold-400" size={32} />
            <span className="text-gray-400 text-sm font-medium">Establishing secure connection...</span>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) onLogin(name); }} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2 ml-1">Your Name</label>
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
              Enter Your Space <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        )}
        <div className="mt-10 pt-6 border-t border-white/10 flex items-center justify-center gap-2 text-xs text-gray-500 font-medium">
          <Shield size={14} className="text-gold-400/70" /> Your data is private and encrypted
        </div>
      </div>
    </div>
  );
};

// --- NAVIGATION ---
const Navigation = ({ activeTab, setActiveTab, userType, setUserType, currentUser, onLogout }) => {
  const theme = getTheme(userType);
  return (
    <nav className="glass-panel mx-4 mt-6 rounded-2xl sticky top-6 z-50 animate-fade-in border-white/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 shadow-[0_0_15px_rgba(255,215,0,0.15)]">
              <Brain size={26} className="text-gold-400 drop-shadow-[0_0_5px_currentColor]" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-white leading-tight tracking-tight">Mindful<span className="text-gold-400">AI</span></span>
              <span className="text-xs text-gray-400 font-medium tracking-wide">Hi, {currentUser}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setUserType(userType === 'student' ? 'professional' : 'student')}
              className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest bg-white/5 border border-white/10 hover:bg-white/10 text-gold-400 transition-all"
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
            { id: 'chat', label: 'AI Companion', icon: <MessageSquare size={18} /> },
            { id: 'tools', label: 'Breathe', icon: <Wind size={18} /> },
            { id: 'journal', label: 'Journal', icon: <BookOpen size={18} /> },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-all whitespace-nowrap backdrop-blur-md ${activeTab === item.id ? theme.navActive : theme.navInactive}`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

// --- CHAT INTERFACE ---
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

  // NO orderBy — sort in JavaScript after fetch
  useEffect(() => {
    if (!user || !db) return;
    try {
      const q = query(
        collection(db, 'artifacts', appId, 'users', userId, 'chats'),
        limit(50)
      );
      return onSnapshot(q, (snap) => {
        const msgs = snap.docs
          .map(d => ({ docId: d.id, ...d.data() }))
          .sort((a, b) => a.id - b.id); // ascending — oldest first
        setMessages(msgs);
      }, (err) => console.error("Chat sync error:", err));
    } catch (e) { console.error("Chat init error:", e); }
  }, [user, userId]);

  // NO orderBy — sort in JavaScript after fetch
  useEffect(() => {
    if (!user || !db) return;
    try {
      const q = query(
        collection(db, 'artifacts', appId, 'users', userId, 'journal'),
        limit(10)
      );
      return onSnapshot(q, (snap) => {
        const recentEntries = snap.docs
          .map(d => d.data())
          .sort((a, b) => b.id - a.id) // descending — most recent first
          .slice(0, 3)
          .map(e => `[${new Date(e.id).toDateString()}]: ${e.text}`)
          .join(' | ');
        setJournalContext(recentEntries);
      }, (err) => console.error("Journal context error:", err));
    } catch (e) { console.error("Journal context init error:", e); }
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
    if (!SpeechRecognition) { alert("Voice input not supported in this browser."); return; }
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

  const send = async (e) => {
    e && e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { id: Date.now(), sender: 'user', text: input };
    const currentInput = input;
    setInput('');
    setStatus('thinking');

    if (db && user) {
      try {
        await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'chats'), userMsg);
      } catch (err) {
        console.error("Failed to save user message:", err);
        setMessages(p => [...p, userMsg]);
      }
    } else {
      setMessages(p => [...p, userMsg]);
    }

    const context = retrieveContext(currentInput);
    const reply = await callGeminiAPI(currentInput, userType, context, 'chat', messages.slice(-6), journalContext);
    const aiMsg = { id: Date.now() + 1, sender: 'ai', text: reply };

    if (db && user) {
      try {
        await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'chats'), aiMsg);
      } catch (err) {
        console.error("Failed to save AI message:", err);
        setMessages(p => [...p, aiMsg]);
      }
    } else {
      setMessages(p => [...p, aiMsg]);
    }

    setStatus('idle');
  };

  return (
    <div className={`flex flex-col h-[650px] ${theme.card} rounded-3xl overflow-hidden border-white/20`}>
      <div className="p-5 border-b border-white/10 flex justify-between items-center bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor] ${status === 'idle' ? 'bg-emerald-400 text-emerald-400' : 'bg-gold-400 text-gold-400 animate-pulse'}`} />
          <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">
            {status === 'thinking' ? 'Thinking...' : 'Here with you'}
          </span>
        </div>
        {isSpeaking && (
          <button onClick={() => window.speechSynthesis.cancel()} className="flex items-center gap-2 text-xs text-red-400 font-bold bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg border border-red-500/20 transition-all">
            <StopCircle size={14} /> Stop Audio
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-black/10 backdrop-blur-sm hide-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-start">
            <div className="p-5 rounded-2xl max-w-[85%] text-sm leading-relaxed bg-white/5 border border-white/10 text-gray-200 rounded-bl-sm backdrop-blur-md">
              <FormattedText text={`Hi ${currentUser} 👋 I'm glad you're here. How are you feeling right now?`} />
            </div>
          </div>
        )}
        {messages.map(m => (
          <div key={m.docId || m.id} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`p-5 rounded-2xl max-w-[85%] text-sm leading-relaxed shadow-lg relative group transition-all border backdrop-blur-md ${m.sender === 'user'
              ? 'bg-gold-500/10 border-gold-500/30 text-white rounded-br-sm shadow-[0_5px_15px_rgba(255,215,0,0.05)]'
              : 'bg-white/5 border-white/10 text-gray-200 rounded-bl-sm'}`}
            >
              <FormattedText text={m.text} />
              {m.sender === 'ai' && (
                <button onClick={() => speak(m.text)} className="absolute -right-10 top-2 text-gray-500 hover:text-gold-400 opacity-0 group-hover:opacity-100 transition-all p-2 bg-black/40 rounded-full border border-white/10">
                  <Volume2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
        {status === 'thinking' && (
          <div className="flex items-start">
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 text-gray-400 text-sm backdrop-blur-md flex items-center gap-2">
              <Loader size={16} className="animate-spin text-gold-400" />
              <span>Composing a thoughtful response...</span>
            </div>
          </div>
        )}
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
          placeholder={isListening ? "Listening..." : "Share what's on your mind..."}
        />
        <button type="submit" disabled={status === 'thinking' || !input.trim()} className={`p-4 rounded-xl transition-all ${theme.primaryBtn} disabled:opacity-50 disabled:cursor-not-allowed`}>
          <Send size={22} />
        </button>
      </form>
    </div>
  );
};

// --- TOOLS / BREATHING ---
const Tools = ({ userType }) => {
  const theme = getTheme(userType);
  const [active, setActive] = useState(false);
  return (
    <div className={`${theme.card} p-10 rounded-3xl text-center flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden border-white/20`}>
      <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-8 bg-black/40 border border-white/10 shadow-[0_0_40px_rgba(255,215,0,0.15)]">
        <Wind size={48} className="text-gold-400 drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]" />
      </div>
      <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">Box Breathing</h2>
      <p className="text-gray-400 mb-14 max-w-md font-light text-lg">A gentle rhythm to bring you back to yourself. Follow the pulse, breathe slowly.</p>

      <div className="relative mb-16">
        {active && <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-gold-400 shadow-[0_0_60px_rgba(255,215,0,1)]" />}
        <div className={`w-64 h-64 rounded-full flex items-center justify-center transition-all duration-[4000ms] border-4 ${active ? 'scale-110 border-gold-500/50 shadow-[0_0_50px_rgba(255,215,0,0.4)]' : 'scale-100 border-white/10'}`}>
          <div className={`w-52 h-52 rounded-full flex items-center justify-center transition-all duration-[4000ms] backdrop-blur-md ${active ? 'scale-100 bg-gold-500/20 text-gold-400 shadow-[inset_0_0_30px_rgba(255,215,0,0.6)]' : 'scale-90 bg-white/5 text-gray-500'}`}>
            <Wind size={72} />
          </div>
        </div>
      </div>

      <button onClick={() => setActive(!active)} className={`px-14 py-4 rounded-2xl font-bold text-xl transition-all transform hover:scale-105 ${theme.primaryBtn}`}>
        {active ? 'Stop' : 'Begin Breathing'}
      </button>
    </div>
  );
};

// --- JOURNAL ---
const Journal = ({ user, userType, currentUser }) => {
  const theme = getTheme(userType);
  const [entries, setEntries] = useState([]);
  const userId = getDbUserId(user);
  const [text, setText] = useState('');

  // NO orderBy — sort in JavaScript after fetch
  useEffect(() => {
    if (!user || !db) return;
    try {
      const q = query(
        collection(db, 'artifacts', appId, 'users', userId, 'journal'),
        limit(30)
      );
      return onSnapshot(q, (snap) => {
        setEntries(
          snap.docs
            .map(d => ({ docId: d.id, ...d.data() }))
            .sort((a, b) => b.id - a.id) // descending — newest first
        );
      }, (err) => console.error("Journal load error:", err));
    } catch (e) { console.error("Journal init error:", e); }
  }, [user, userId]);

  const save = async () => {
    if (!text.trim()) return;
    const entry = { id: Date.now(), text, date: new Date().toLocaleString(), source: 'manual' };
    if (db && user) {
      try {
        await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'journal'), entry);
      } catch (err) {
        console.error("Failed to save journal entry:", err);
      }
    }
    setText('');
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8 h-[650px]">
      <div className={`${theme.card} p-8 rounded-3xl flex flex-col border-white/20`}>
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 shadow-[0_0_15px_rgba(255,215,0,0.15)]">
            <BookOpen size={24} className="text-gold-400 drop-shadow-[0_0_5px_currentColor]" />
          </div>
          <div>
            <h3 className="font-bold text-2xl text-white tracking-tight">Your Journal</h3>
            <p className="text-xs text-gray-500 mt-0.5">Private thoughts, no judgment</p>
          </div>
        </div>
        <textarea
          className="flex-1 p-6 bg-black/20 border border-white/10 rounded-2xl resize-none mb-6 focus:ring-1 focus:ring-gold-500/50 outline-none text-gray-200 leading-relaxed placeholder-gray-600 backdrop-blur-md shadow-inner text-base font-light"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="What's on your mind today? This is just for you..."
        />
        <div className="flex justify-end">
          <button onClick={save} disabled={!text.trim()} className={`px-10 py-4 rounded-xl font-bold transition-all transform active:scale-95 disabled:opacity-50 ${theme.primaryBtn}`}>
            Save Entry
          </button>
        </div>
      </div>

      <div className={`${theme.card} p-8 rounded-3xl overflow-y-auto space-y-6 hide-scrollbar border-white/20`}>
        <h3 className="font-bold text-2xl text-white mb-6 sticky top-0 bg-space-800/60 backdrop-blur-xl z-10 pb-4 border-b border-white/10 tracking-tight">
          Past Entries
        </h3>
        {entries.length === 0 ? (
          <div className="text-center py-24 text-gray-600">
            <BookOpen size={64} className="mx-auto mb-6 opacity-20" />
            <p className="font-medium text-lg">No entries yet.</p>
            <p className="text-sm mt-2 font-light">Write something — even a few words count.</p>
          </div>
        ) : entries.map(e => (
          <div key={e.docId || e.id} className="p-6 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all backdrop-blur-md shadow-md">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-gold-400">
                {e.date}
              </span>
              {e.source === 'chat' && (
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                  From Chat
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

// --- DASHBOARD ---
const Dashboard = ({ userType, setActiveTab, currentUser, user }) => {
  const theme = getTheme(userType);
  const [moodHistory, setMoodHistory] = useState([]);
  const userId = getDbUserId(user);

  // NO orderBy — sort in JavaScript after fetch
  useEffect(() => {
    if (!user || !db) return;
    const q = query(
      collection(db, 'artifacts', appId, 'users', userId, 'moods'),
      limit(20) // fetch more, then slice after JS sort
    );
    return onSnapshot(q, (snapshot) => {
      setMoodHistory(
        snapshot.docs
          .map(doc => ({ docId: doc.id, ...doc.data() }))
          .sort((a, b) => b.id - a.id) // descending — most recent first
          .slice(0, 5) // keep only latest 5
      );
    }, (error) => console.error("Mood sync error:", error));
  }, [user, userId]);

  const saveMood = async (mood) => {
    if (!user || !db) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'moods'), {
        mood, date: new Date().toLocaleTimeString(), id: Date.now()
      });
    } catch (e) { console.error("Error saving mood:", e); }
  };

  const moods = [
    { icon: <Sun size={36} />, label: 'Great', color: 'bg-gold-500/20 text-gold-400 border-gold-500/40 shadow-[0_0_20px_rgba(255,215,0,0.2)] hover:shadow-[0_0_30px_rgba(255,215,0,0.4)]' },
    { icon: <Smile size={36} />, label: 'Good', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]' },
    { icon: <Meh size={36} />, label: 'Okay', color: 'bg-white/10 text-gray-300 border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]' },
    { icon: <Frown size={36} />, label: 'Low', color: 'bg-orange-500/20 text-orange-400 border-orange-500/40 shadow-[0_0_20px_rgba(249,115,22,0.2)] hover:shadow-[0_0_30px_rgba(249,115,22,0.4)]' },
    { icon: <Moon size={36} />, label: 'Struggling', color: 'bg-red-500/20 text-red-400 border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-[0_0_30px_rgba(239,68,68,0.4)]' },
  ];

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto pt-4">
      <div className="rounded-3xl p-12 text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden glass-panel border-gold-500/30">
        <div className="absolute inset-0 bg-gradient-to-br from-gold-500/10 to-transparent"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3"></div>
        <div className="relative z-10">
          <h2 className="text-5xl font-extrabold mb-4 tracking-tight drop-shadow-lg">
            Welcome, <span className="text-gold-400">{currentUser}</span>
          </h2>
          <p className="opacity-80 text-xl font-light max-w-2xl leading-relaxed">
            Take a breath. You're in a safe space. How are you feeling today?
          </p>
        </div>
        {theme.bannerIcon}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`${theme.card} p-10 rounded-3xl lg:col-span-2 border-white/20`}>
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-2xl font-bold text-white tracking-tight">How are you feeling?</h3>
            <span className="text-[11px] font-bold text-gold-400 bg-gold-500/10 border border-gold-500/20 px-3 py-1.5 rounded-lg uppercase tracking-widest">
              Mood Check-In
            </span>
          </div>
          <div className="grid grid-cols-5 gap-4 mb-12">
            {moods.map((m, idx) => (
              <button
                key={idx}
                onClick={() => saveMood(m.label)}
                className={`flex flex-col items-center justify-center p-5 rounded-2xl transition-all transform hover:-translate-y-1 border backdrop-blur-md hover:bg-white/10 ${m.color}`}
              >
                <div className="mb-4 drop-shadow-[0_0_15px_currentColor]">{m.icon}</div>
                <span className="text-[11px] font-bold tracking-widest uppercase">{m.label}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-white/10 pt-8">
            <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-6">Recent Check-ins</h4>
            <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
              {moodHistory.length === 0 && (
                <span className="text-sm text-gray-500 italic font-light">No mood logs yet — tap one above to start.</span>
              )}
              {moodHistory.map((m, i) => (
                <div key={m.docId || i} className="flex-shrink-0 px-5 py-3 bg-white/5 rounded-xl border border-white/10 text-xs font-medium text-gray-300 flex items-center gap-4 backdrop-blur-sm shadow-md">
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
            <div className="p-5 rounded-2xl bg-black/40 border border-white/10 shadow-[0_0_20px_rgba(255,215,0,0.15)] group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(255,215,0,0.3)] transition-all">
              <MessageSquare size={32} className="text-gold-400 drop-shadow-[0_0_5px_currentColor]" />
            </div>
            <div>
              <h3 className="font-bold text-white text-xl mb-1 tracking-tight">AI Companion</h3>
              <p className="text-sm text-gray-400 font-light">Talk it through</p>
            </div>
            <ArrowRight className="ml-auto text-gray-600 group-hover:text-gold-400 transition-colors" size={24} />
          </button>

          <button onClick={() => setActiveTab('tools')} className={`${theme.card} w-full p-8 rounded-3xl flex items-center gap-6 group cursor-pointer text-left border-white/20 hover:border-gold-500/40 hover:bg-white/10 transition-all shadow-lg`}>
            <div className="p-5 rounded-2xl bg-black/40 border border-white/10 shadow-[0_0_20px_rgba(255,215,0,0.15)] group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(255,215,0,0.3)] transition-all">
              <Wind size={32} className="text-gold-400 drop-shadow-[0_0_5px_currentColor]" />
            </div>
            <div>
              <h3 className="font-bold text-white text-xl mb-1 tracking-tight">Breathe</h3>
              <p className="text-sm text-gray-400 font-light">Take a moment</p>
            </div>
            <ArrowRight className="ml-auto text-gray-600 group-hover:text-gold-400 transition-colors" size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP ---
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
      } catch (e) { console.error("Auth error:", e); }
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
        <div className="bg-red-500/10 p-5 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-8 border border-red-500/20">
          <AlertTriangle className="text-red-500" size={48} />
        </div>
        <h1 className="text-3xl font-bold mb-4 tracking-tight">Setup Required</h1>
        <p className="text-gray-400 mb-10 font-light leading-relaxed">Firebase credentials are missing. Please configure your .env file.</p>
        <button onClick={() => window.location.reload()} className="bg-white text-space-900 px-10 py-4 rounded-xl font-bold hover:bg-gray-200 transition-colors shadow-lg">
          Retry Connection
        </button>
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
