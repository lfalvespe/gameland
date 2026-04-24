# GameLand Portal 🎮

GameLand Portal is a comprehensive, real-time social gaming platform built with modern web technologies. It allows players to compete in classic games like Hangman, Checkers, Ludo, and TicTacToe, while engaging with the community through real-time chat, global rankings, and profile customization.

## ✨ Features

- **🏆 Real-time Multiplayer Games:**
  - **Hangman:** Stylized with a prisoner-themed figure and profile picture integration.
  - **Checkers:** Classic board game with smooth drag-and-drop mechanics.
  - **Ludo:** Social board game for up to 4 players.
  - **TicTacToe:** Quick and competitive matches.
- **💬 Community Tools:**
  - **Global & Game-specific Chat:** Real-time communication using Socket.io.
  - **Match History:** Track your wins, losses, and performance over time.
  - **Rankings:** Compete for the top spot on global leaderboards.
- **👤 Profile Management:**
  - **Customization:** Upload profile pictures and update personal information.
  - **Authentication:** Secure login and registration powered by Firebase Auth.
- **📱 Responsive Design:** Fully optimized for both desktop and mobile devices.
- **🌗 Theme Support:** Dark and Light mode options for a personalized experience.

## 🚀 Tech Stack

- **Frontend:**
  - [React 19](https://react.dev/) - UI Library
  - [Vite](https://vitejs.dev/) - Build Tool
  - [Tailwind CSS 4](https://tailwindcss.com/) - Styling
  - [Framer Motion](https://www.framer.com/motion/) - Animations
  - [Socket.io-client](https://socket.io/) - Real-time communication
  - [Lucide React](https://lucide.dev/) - Icons
- **Backend:**
  - [Node.js](https://nodejs.org/) - Runtime environment
  - [Express](https://expressjs.com/) - Web framework
  - [Socket.io](https://socket.io/) - Real-time server
- **Database & Services:**
  - [Firebase Firestore](https://firebase.google.com/docs/firestore) - NoSQL Database
  - [Firebase Auth](https://firebase.google.com/docs/auth) - Authentication
  - [Google Gemini API](https://ai.google.dev/) - AI-powered enhancements (where applicable)

## 🛠️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/gameland-portal.git
   cd gameland-portal
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   - Create a `.env` file in the root directory (see `.env.example`).
   ```env
   GEMINI_API_KEY="your_gemini_key"
   APP_URL="http://localhost:3000"
   ```
   - **Firebase:** This project uses `firebase-applet-config.json` for Firebase configuration. Create this file in the root directory with your Firebase project details:
   ```json
   {
     "apiKey": "...",
     "authDomain": "...",
     "projectId": "...",
     "storageBucket": "...",
     "messagingSenderId": "...",
     "appId": "...",
     "firestoreDatabaseId": "(default)"
   }
   ```
   - **Authorized Domains:** Remember to add `localhost` to the Authorized Domains list in your Firebase Console (Authentication > Settings > Authorized domains).

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to see the app.

## 📜 Scripts

- `npm run dev`: Starts the Express + Vite development server using `tsx`.
- `npm run build`: Compiles the application for production (produces static files in `dist/`).
- `npm run lint`: Runs TypeScript type checking (`tsc --noEmit`).
- `npm run lint:rules`: Runs ESLint against `firestore.rules`.
- `npm run clean`: Removes the `dist` directory.

## 🎨 Visual Identity

The interface is built with a focus on dark mode aesthetics, featuring:
- High-contrast typography using **Inter**.
- Smooth transitions powered by **Framer Motion (motion/react)**.
- Custom game assets and components (like the "Prisoner" themed Hangman).

## 🔒 Security

This project implements **Zero-Trust Firestore Security Rules**. Access is restricted based on:
- User authentication status.
- Document ownership.
- Validated state transitions.

## 🤖 Built with AI

GameLand Portal was developed with the assistance of **Google AI Studio Build**, leveraging advanced AI models to accelerate feature implementation, design crafting, and code optimization.

## 📄 License

This project is licensed under the MIT License.

---

Built with ❤️ by the GameLand Portal Team.

<br> Fernando Alves
