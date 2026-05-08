# ⚡ chatter-box

> A real-time full-stack chat application built with React, Node.js, and Socket.io — featuring WhatsApp-style messaging, emoji reactions, reply threads, image sharing, and 32 switchable themes.

[![Deployed on Render](https://img.shields.io/badge/Deployed%20on-Render-46E3B7?style=flat-square&logo=render&logoColor=white)](https://render.com)
[![Node.js](https://img.shields.io/badge/Node.js-v24-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101?style=flat-square&logo=socket.io)](https://socket.io)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

---

## 📸 Preview

> **Live Demo:** [https://fullstack-chat-app-XXXX.onrender.com](https://render.com)

| Chat View | Context Menu | Mobile View |
|-----------|-------------|-------------|
| ![chat]() | ![menu]() | ![mobile]() |

---

## ✨ Features

- 🔴🟢 **Real-time online/offline presence** — see who's active the moment they log in
- 💬 **Instant messaging** — messages delivered in milliseconds via Socket.io, no polling
- 🖱️ **WhatsApp-style context menu** — right-click any message for emoji reactions, reply, copy, delete
- ↩️ **Reply threads** — reply to a specific message with a quoted preview embedded in the bubble
- 🗑️ **Live message deletion** — deleted messages vanish from both sides instantly via socket events
- 😊 **Emoji picker** — 6 categorized tabs (Smileys, Gestures, Hearts, Activities, Food, Nature) with cursor-position-aware insertion
- 🖼️ **Image attachments** — upload and send images via Cloudinary with a client-side preview before sending
- 📱 **Fully mobile responsive** — single-panel layout on phone, full two-panel on desktop with a back button
- 🔍 **New Chat search** — find any registered user by name and start a conversation (sidebar only shows existing chats)
- 🎨 **32 switchable themes** — DaisyUI-powered theme grid in Settings, persisted across sessions
- 🔐 **JWT authentication** — HTTP-only cookie-based sessions with protected API routes
- 👤 **Profile management** — update display name and upload a profile picture (stored on Cloudinary)

---

## 🛠 Tech Stack

### Frontend
| Tool | Purpose |
|------|---------|
| React 19 | UI framework |
| Vite 8 | Build tool & dev server |
| Tailwind CSS v4 | Utility-first styling |
| DaisyUI v5 | Component library + 32 themes |
| Zustand | Lightweight global state management |
| Socket.io-client | Real-time event handling |
| React Router v7 | Client-side routing |
| Axios | HTTP client with interceptors |
| Lucide React | Icon set |
| React Hot Toast | Toast notifications |

### Backend
| Tool | Purpose |
|------|---------|
| Node.js v24 | Runtime |
| Express 5 | HTTP server + API routing |
| Socket.io | WebSocket server |
| Mongoose | MongoDB ODM |
| bcryptjs | Password hashing |
| jsonwebtoken | JWT generation & verification |
| Cloudinary | Image storage |
| cookie-parser | HTTP-only cookie handling |
| dotenv | Environment variable management |

### Infrastructure
| Service | Role |
|---------|------|
| MongoDB Atlas | Cloud database |
| Cloudinary | Media CDN |
| Render | Full-stack deployment (frontend + backend on single service) |

---

## 📦 Installation

### Prerequisites

- Node.js >= 18
- MongoDB Atlas account
- Cloudinary account

### Clone the repository

```bash
git clone https://github.com/UTKARSHH20/fullstack-chat-app.git
cd fullstack-chat-app
```

### Install dependencies

```bash
# Backend
npm install --prefix backend

# Frontend
npm install --prefix frontend
```

---

## ⚙️ Environment Variables

Create a `.env` file inside the `backend/` directory:

```env
MONGODB_URL=your_mongodb_atlas_connection_string
PORT=5001
NODE_ENV=development

JWT_SECRETKEY=your_super_secret_key

CLOUDINAR_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINAR_API_KEY=your_cloudinary_api_key
CLOUDINAR_API_SECRET=your_cloudinary_api_secret
```

> ⚠️ Never commit `.env` to version control. It is already listed in `.gitignore`.

---

## ▶️ Running the Project

### Development

Open two terminals:

```bash
# Terminal 1 — Backend (runs on port 5001)
cd backend
npm run dev

# Terminal 2 — Frontend (runs on port 5173)
cd frontend
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173)

### Production Build

```bash
# From the project root
npm run build   # installs deps + builds React app
npm start       # starts Express which serves the built frontend
```

---

## 🌐 Deployment

This app is deployed as a **single service on Render** — the Express backend serves the compiled React frontend in production.

### Render Configuration

| Setting | Value |
|---------|-------|
| **Build Command** | `npm install --prefix backend && npm install --prefix frontend && npm run build --prefix frontend` |
| **Start Command** | `npm run start --prefix backend` |
| **Environment** | Set all variables from the `.env` section above |
| **Node Version** | 24 |

> The backend uses `express.static` to serve `frontend/dist` and a catch-all `app.use()` handler for SPA routing. Note: `app.get("*")` is intentionally avoided due to Express 5 + path-to-regexp v8 incompatibility.

---

## 📁 Folder Structure

```
fullstack-chat-app/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   └── message.controller.js
│   │   ├── lib/
│   │   │   ├── cloudinary.js
│   │   │   ├── db.js
│   │   │   ├── socket.js
│   │   │   └── utils.js
│   │   ├── middleware/
│   │   │   └── auth.middleware.js
│   │   ├── models/
│   │   │   ├── message.model.js
│   │   │   └── user.model.js
│   │   ├── routes/
│   │   │   ├── auth.route.js
│   │   │   └── message.route.js
│   │   └── index.js
│   └── package.json
├── frontend/
│   ├── components/
│   │   └── Navbar.jsx
│   ├── lib/
│   │   ├── axios.js
│   │   └── socket.js
│   ├── pages/
│   │   ├── ChatPage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── ProfilePage.jsx
│   │   ├── SettingsPage.jsx
│   │   └── SignUpPage.jsx
│   ├── src/
│   │   ├── store/
│   │   │   ├── useAuthStore.js
│   │   │   ├── useChatStore.js
│   │   │   └── useThemeStore.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   │   └── favicon.png
│   ├── index.html
│   └── package.json
├── .gitignore
└── package.json
```

---

## 🔐 Authentication

Authentication is handled with **JWT stored in HTTP-only cookies**, making it immune to XSS attacks.

1. User signs up → password is hashed with `bcryptjs` (10 salt rounds)
2. On login, a JWT is signed with a 15-day expiry and set as a `Secure`, `SameSite=Strict` cookie
3. All protected API routes verify the token via `auth.middleware.js`
4. On page refresh, `checkAuth()` re-validates the session and reconnects the socket
5. On logout, the cookie is cleared and the socket connection is terminated

---

## 🧠 Key Highlights

**Real-time architecture** — Express and Socket.io share a single HTTP server instance. A `userId → socketId` map in memory enables direct message routing to specific clients without broadcasting to everyone.

**Reply threading** — Replied messages store a `replyTo` snapshot (sender name + message text) directly on the message document, so the thread context is always preserved even if the original message is later deleted.

**Express 5 wildcard fix** — `path-to-regexp` v8 (used by Express 5) rejects bare `"*"` route patterns at startup. The SPA fallback uses `app.use()` instead, which bypasses the regex engine entirely.

**Sidebar design** — Instead of listing all users (which would expose your user base), the sidebar only shows people you've already messaged. A dedicated search endpoint (`GET /api/messages/search?q=`) powers the "New Chat" modal.

**Mobile layout** — No CSS framework tricks needed — a simple `hidden md:flex` toggle on the sidebar and chat panel gives a native-feeling single-panel experience on mobile with a proper back navigation.

---

## 🤝 Contributing

Contributions are welcome. To get started:

```bash
# Fork the repo, then:
git checkout -b feature/your-feature-name
git commit -m "feat: describe your change"
git push origin feature/your-feature-name
# Open a Pull Request
```

Please keep PRs focused and avoid mixing unrelated changes.

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">Built with ☕ and way too many Stack Overflow tabs</p>
