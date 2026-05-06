# MindfulAI

MindfulAI is a modern mental health and wellness assistant built with React, Firebase, and generative AI (Gemini). It supports journaling, chat with AI, and mood tracking—all with secure storage.

## Features

- Chat with a supportive AI assistant.
- Secure, user-specific data via Firebase.
- Reflective journaling module.
- Mood check-ins and insights.
- Modern, mobile-friendly UI.

## Tech Stack

- React (Vite)
- Firebase (Firestore, Auth)
- Gemini API
- Tailwind CSS (optional/if used)
- Deployed: [Add link]

## Getting Started

### 1. Clone and Install
```bash
git clone https://github.com/AbhishekKalyan07/mindful_ai.git
cd mindful_ai
npm install
```

### 2. Setup Environment

Copy `.env.example` to `.env` and fill in your credentials:

```
cp .env.example .env
```

Edit `.env`:
```
VITE_GEMINI_API_KEY=...
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

### 3. Start the App

```bash
npm run dev
```

The app will run at `http://localhost:5173/`.

### 4. Build for Production

```bash
npm run build
npm run preview
```

## Deployment

- Best deployed on [Vercel](https://vercel.com/), [Netlify](https://www.netlify.com/) or Firebase Hosting.
- Set environment variables in your deployment platform using the `.env.example` as reference.

## Firebase Security

Ensure you use secure Firestore rules! See example below.

## Contributing

PRs and issues welcome.
