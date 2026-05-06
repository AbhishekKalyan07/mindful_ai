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
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY; // Use environment variable

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

// ...rest of the file stays the same...
// For brevity, please copy the remaining portion of your file below this line from your original code. All other logic remains unchanged (the main fix is using env vars above).

// Keep the rest of your App.jsx as-is...
