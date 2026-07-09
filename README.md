# QuizGen 🧠

**AI-Powered Quiz Platform** — Learn Smarter, In Any Language

QuizGen is a modern, full-stack quiz application that leverages Google Gemini AI to generate unique, contextual quizzes. With support for 15+ languages, text-to-speech, live multiplayer, and daily challenges, QuizGen makes learning engaging and accessible for everyone.

---

## ✨ Features

### 🤖 AI-Powered Quiz Generation
- **Google Gemini AI** generates unique, accurate questions for any topic in seconds
- Choose from 50+ categories or enter your own custom topic
- Multi-layer validation ensures question quality and accuracy

### 🌍 Multilingual Support
- Create and take quizzes in **15+ languages** including Hindi, German, Spanish, French, Japanese, and more
- AI generates content directly in your chosen language

### 🔊 Text-to-Speech (TTS)
- Listen to questions and options read aloud
- Automatic voice selection based on quiz language
- Perfect for accessibility and language learning

### 👥 Live Multiplayer
- Host real-time quiz battles with friends, classmates, or colleagues
- Live leaderboards and score tracking
- Join games using a simple code

### 🔥 Daily 3 Challenge
Three unique brain games refreshed daily:
- **Lightning Quiz** — Answer rapid-fire questions against the clock
- **Scrambled Words** — Unscramble jumbled letters to form words
- **Two Truths One Lie** — Spot the false statement among three

### 📊 3 Quiz Modes
- **Time-Based** — Paced learning with a countdown timer
- **Fast-Paced** — Adrenaline-fueled speed quizzing
- **Learning Mode** — No timers, no pressure, learn at your own pace

### 📚 5000+ Pre-Built Quizzes
- Vast library spanning 50+ categories
- Academic, Entertainment, General Knowledge, and more
- Ready to play instantly

### 🏆 Additional Features
- XP and leveling system
- Global and weekly leaderboards
- Progress tracking and analytics
- User authentication (Email/Password + Google OAuth)
- Profile customization with avatar support

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, Vite, TypeScript, TailwindCSS, shadcn/ui, React Router |
| **Backend** | Django 4.x, Django REST Framework, PostgreSQL |
| **AI** | Google Gemini API |
| **Auth** | JWT, Google OAuth 2.0 |
| **Email** | SMTP (Gmail) |

---

## 📋 Prerequisites

Before you begin, ensure you have:
- **Python** 3.10 or higher
- **Node.js** 18.x or higher
- **PostgreSQL** (or access to a PostgreSQL database)
- **Git**

---

## 🚀 Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/Quiz-Gen.git
cd Quiz-Gen
```

---

### 2. Frontend Setup (`engage-hub`)

#### 2.1 Navigate to Frontend Directory

```bash
cd engage-hub
```

#### 2.2 Install Dependencies

```bash
npm install
```

#### 2.3 Create Environment File

Create a `.env` file in the `engage-hub` directory:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:8000/api

# Session
VITE_SESSION_TIMEOUT=1440

# Environment
VITE_ENV=development

# Google OAuth (use same Client ID as backend)
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

#### 2.4 Start Development Server

```bash
npm run dev
```

Frontend will be available at `http://localhost:5173`

---

### 3. Backend Setup (`quizgen`)

#### 3.1 Navigate to Backend Directory

```bash
cd quizgen
```

#### 3.2 Create and Activate Virtual Environment

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**macOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

#### 3.3 Install Dependencies

```bash
pip install -r requirements.txt
```

#### 3.4 Create Environment File

Create a `.env` file in the `quizgen` directory:

```env
# Django Settings
DEBUG=True
SECRET_KEY=your-super-secret-key-change-in-production
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (PostgreSQL)
DATABASE_URL=postgresql://username:password@localhost:5432/quizgen_db

# CORS (Frontend URLs)
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Session Configuration
SESSION_COOKIE_AGE=1209600
SESSION_COOKIE_SECURE=False
SESSION_COOKIE_HTTPONLY=True
SESSION_COOKIE_SAMESITE=Lax

# Email Configuration (Gmail SMTP)
EMAIL_USE_SMTP=True
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-gmail-app-password
DEFAULT_FROM_EMAIL=your-email@gmail.com

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Google Gemini AI
GEMINI_API_KEY=your-gemini-api-key
```

> **📝 Notes:**
> - Generate a secure `SECRET_KEY` for production
> - For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833)
> - Get Google Client ID from [Google Cloud Console](https://console.cloud.google.com/)
> - Get Gemini API Key from [Google AI Studio](https://aistudio.google.com/app/apikey)

#### 3.5 Run Database Migrations

```bash
python manage.py migrate
```

#### 3.6 Create Superuser (Optional)

```bash
python manage.py createsuperuser
```

#### 3.7 Start Development Server

```bash
python manage.py runserver
```

Backend will be available at `http://localhost:8000`

---

## 🏃 Running Both Servers

**Terminal 1 (Backend):**
```bash
cd quizgen
venv\Scripts\activate   # Windows
# source venv/bin/activate  # macOS/Linux
python manage.py runserver
```

**Terminal 2 (Frontend):**
```bash
cd engage-hub
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 📁 Project Structure

```
Quiz-Gen/
├── engage-hub/           # React Frontend
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── contexts/     # React context providers
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # API & utilities
│   │   └── assets/       # Static assets
│   ├── public/           # Public assets
│   └── package.json
│
├── quizgen/              # Django Backend
│   ├── auth_app/         # Authentication & user management
│   ├── quiz_app/         # Quiz logic, activities, leaderboards
│   ├── core/             # Django project settings
│   ├── dataset/          # Pre-built quiz CSV files
│   └── requirements.txt
│
└── README.md
```

---

## 🔧 Troubleshooting

### Backend Issues

| Issue | Solution |
|-------|----------|
| Database connection error | Verify `DATABASE_URL` and ensure PostgreSQL is running |
| Email not sending | Check Gmail App Password and `EMAIL_USE_TLS=True` |
| CORS errors | Verify `CORS_ALLOWED_ORIGINS` includes frontend URL |

### Frontend Issues

| Issue | Solution |
|-------|----------|
| API calls failing | Ensure backend is running on port 8000 |
| Hot reload broken | Delete `node_modules` and reinstall |

---

## 🔒 Security

⚠️ **Never commit `.env` files to version control!**

These files are already in `.gitignore`:
```
.env
.env.local
*.env
```

---

## 📄 License

MIT

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

**Made with ❤️ by the QuizGen Team**
