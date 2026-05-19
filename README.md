# chatter-box

A real-time full-stack chat application with instant messaging, voice notes, emoji reactions, and Google authentication.

## Features

- **Real-time messaging** — instant delivery via Socket.io
- **Google OAuth** — sign in with your Google account
- **Voice notes** — record and send audio messages
- **Reply threads** — reply to specific messages with quoted previews
- **Emoji reactions** — react to messages
- **Image sharing** — upload images via Cloudinary
- **Typing indicators** — see when someone is typing
- **Read receipts** — sent, delivered, and seen status
- **Online presence** — real-time online/offline status with last seen
- **Video & audio calls** — WebRTC-based calling
- **Web push notifications** — native OS notifications via Service Workers
- **32 themes** — DaisyUI theme switcher with live preview
- **Mobile responsive** — single-panel on mobile, dual-panel on desktop

## Tech Stack

**Frontend:** React 19, Vite, Tailwind CSS v4, DaisyUI v5, Zustand, Socket.io Client, React Router v7

**Backend:** Node.js, Express 5, MongoDB (Mongoose), Socket.io, JWT, Cloudinary, Web Push (VAPID)

## Getting Started

### Prerequisites

- Node.js >= 18
- MongoDB Atlas account
- Cloudinary account
- Google Cloud Console project (for OAuth)

### Installation

```bash
git clone https://github.com/UTKARSHH20/fullstack-chat-app.git
cd fullstack-chat-app
npm install --prefix backend
npm install --prefix frontend
```

### Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in your values.

Create `frontend/.env`:
```
VITE_VAPID_PUBLIC_KEY=your_vapid_public_key
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

### Development

```bash
# Terminal 1 — Backend (port 5001)
cd backend && npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend && npm run dev
```

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
backend/
  src/
    controllers/    # Route handlers
    lib/            # DB, Cloudinary, Socket.io, utils
    middleware/     # Auth & validation
    models/         # Mongoose schemas
    routes/         # Express routes

frontend/
  components/
    chat/           # Chat UI components (decomposed)
  hooks/            # Custom React hooks
  pages/            # Route pages
  src/store/        # Zustand stores
  lib/              # Axios & Socket.io client
```

## Deployment

Deploys as a single service on Render. The Express backend serves the compiled React frontend in production.

| Setting | Value |
|---------|-------|
| Build Command | `npm install --prefix backend && npm install --prefix frontend && npm run build --prefix frontend` |
| Start Command | `npm run start --prefix backend` |

## License

MIT
