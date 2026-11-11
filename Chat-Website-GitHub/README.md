# Silly Chat

A real-time, cheerful multi-room chat app with a sunny rainbow vibe, built with React, Vite, Express, and Socket.IO.

## Run locally

Install Node.js 18 or newer, then run:

```bash
npm install
npm run dev
```

Open the Vite URL printed in the terminal (usually `http://localhost:5173`). The development server starts the chat server alongside it.

For a production build, run `npm run build`, then `npm start`. The server serves the built website and hosts the Socket.IO connection on the same port.

## Deploy to the web

This app is not a static GitHub Pages site because it uses a Node.js backend and Socket.IO. The best simple option is Render.

1. Push this folder to a GitHub repository.
2. In Render, choose New > Web Service.
3. Connect the GitHub repo.
4. Use the settings:
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
5. Keep the default Node environment and deploy.

A ready-to-use [render.yaml](render.yaml) file is included in this project.

## Names and chatrooms

The starter rooms are Main Chat, Chatroom 1, and Chatroom 2. Active display names are unique without regard to capitalization and are reserved across every room. Names must be 2–24 characters and use letters, spaces, apostrophes, or hyphens. Profanity and common placeholder names are blocked. The server validates names, room names, and messages; clients cannot bypass those checks. People can switch rooms or create new ones.

The app does not set an arbitrary connection limit. Real capacity depends on the machine and hosting environment. Rooms and message history are held in server memory, so they reset when the server restarts; use a shared database and Socket.IO adapter before scaling to multiple server instances.