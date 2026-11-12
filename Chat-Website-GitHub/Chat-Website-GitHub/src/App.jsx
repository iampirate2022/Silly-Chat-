import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import {
  ArrowDown, ArrowUpRight, Check, ChevronDown, CircleHelp, GraduationCap, Hash,
  Headphones, Heart, Menu, MessageCircle, Orbit, Plus, Radio, Send, Settings2,
  Smile, Sparkles, Users, X,
} from 'lucide-react';

const starterRooms = [
  { id: 'main-chat', name: 'Main Chat', topic: 'The shared class hangout.' },
  { id: 'chatroom-1', name: 'Chatroom 1', topic: 'Ask a question or compare notes.' },
  { id: 'chatroom-2', name: 'Chatroom 2', topic: 'Make a study group and learn together.' },
];

function initials(name = '?') {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

export default function App() {
  const [socket, setSocket] = useState(null);
  const [name, setName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [roomId, setRoomId] = useState('main-chat');
  const [rooms, setRooms] = useState(starterRooms);
  const [people, setPeople] = useState([]);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [nameError, setNameError] = useState('');
  const [messageError, setMessageError] = useState('');
  const [roomModal, setRoomModal] = useState(false);
  const [roomInput, setRoomInput] = useState('');
  const [roomError, setRoomError] = useState('');
  const [connected, setConnected] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messageEnd = useRef(null);
  const inputRef = useRef(null);
  const currentRoom = rooms.find((room) => room.id === roomId) || rooms[0];
  const onlineCount = people.length;

  useEffect(() => {
    if (!socket) return undefined;
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.disconnect();
    };
  }, [socket]);

  useEffect(() => {
    messageEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  function joinChat(event) {
    event.preventDefault();
    setNameError('');
    const connection = io({ autoConnect: false });
    connection.on('rooms', (nextRooms) => setRooms(nextRooms));
    connection.on('history', (history) => setMessages(history));
    connection.on('message', (message) => setMessages((current) => [...current, message]));
    connection.on('people', (nextPeople) => setPeople(nextPeople));
    connection.connect();
    connection.once('connect', () => {
      connection.emit('join', { name: nameInput }, (result) => {
        if (!result?.ok) {
          setNameError(result?.error || 'Could not join right now. Try again.');
          connection.disconnect();
          return;
        }
        setName(result.name);
        setRoomId(result.roomId);
        setRooms(result.rooms);
        setConnected(true);
        setSocket(connection);
      });
    });
    connection.once('connect_error', () => {
      setNameError('Could not reach the chat server. Is it running?');
      connection.disconnect();
    });
  }

  function changeRoom(nextId) {
    if (!socket || nextId === roomId) return;
    socket.emit('switch-room', nextId, (result) => {
      if (result?.ok) {
        setRoomId(nextId);
        setSidebarOpen(false);
      }
    });
  }

  function sendMessage(event) {
    event.preventDefault();
    if (!draft.trim() || !socket) return;
    setMessageError('');
    socket.emit('send-message', { text: draft }, (result) => {
      if (result?.ok) setDraft('');
      else setMessageError(result?.error || 'Your message could not be sent.');
    });
  }

  function createRoom(event) {
    event.preventDefault();
    setRoomError('');
    socket?.emit('create-room', { name: roomInput }, (result) => {
      if (!result?.ok) {
        setRoomError(result?.error || 'Could not create that room.');
        return;
      }
      setRoomInput('');
      setRoomModal(false);
      changeRoom(result.room.id);
    });
  }

  const joined = Boolean(name && socket);

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="mobile-menu icon-button" aria-label="Open rooms" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
        <a className="brand" href="#home" aria-label="Silly Chat home">
          <span className="brand-mark"><span className="brand-sun">☀️</span></span>
          <span>silly<span className="brand-period">chat</span></span>
        </a>
        <div className="topbar-center"><span className="pulse-dot" /> Sunshine & rainbow vibes</div>
        <div className="topbar-right">
          <button className="top-link" type="button"><CircleHelp size={16} /><span>Community</span></button>
          {joined ? (
            <button className="profile-chip" type="button" title="Your profile">
              <span className="avatar avatar-small" style={{ '--avatar': '#ffd857' }}>{initials(name)}</span>
              <span className="profile-name">{name}</span><ChevronDown size={14} />
            </button>
          ) : <span className="safe-note"><Heart size={14} /> Happy vibes</span>}
        </div>
      </header>

      <div className={`workspace ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <aside className="sidebar">
          <div className="sidebar-scroll">
            <div className="sidebar-kicker">SUNNY ROOMS <span className="tiny-spark">✦</span></div>
            <div className="room-list">
              {rooms.map((room, index) => (
                <button key={room.id} type="button" className={`room-link ${room.id === roomId ? 'active' : ''}`} onClick={() => changeRoom(room.id)}>
                  <span className={`room-hash hash-${index % 4}`}><Hash size={16} strokeWidth={2.4} /></span>
                  <span className="room-link-name">{room.name}</span>
                  {room.id === roomId && <span className="room-active-dot" />}
                </button>
              ))}
            </div>
            <button className="add-room" type="button" onClick={() => { setRoomError(''); setRoomModal(true); }}>
              <span><Plus size={15} /></span> Make a room
            </button>

            <div className="sidebar-divider" />
            <div className="sidebar-kicker people-kicker">IN THIS ROOM <span className="count-pill">{onlineCount}</span></div>
            {joined ? (
              <div className="people-list">
                {people.map((person) => (
                  <div className="person-row" key={person.name}>
                    <span className="avatar" style={{ '--avatar': person.color }}>{initials(person.name)}</span>
                    <span className="person-name">{person.name}{person.name === name && <span className="you-tag">you</span>}</span>
                    <span className="online-indicator" />
                  </div>
                ))}
                {!people.length && <span className="empty-people">Just a moment...</span>}
              </div>
            ) : (
              <div className="people-preview">
                <span className="preview-dot dot-mint" /><span className="preview-dot dot-coral" /><span className="preview-dot dot-yellow" />
                <span>Classmates are here</span>
              </div>
            )}
          </div>
          <div className="sidebar-footer">
            <div className="footer-note"><span className="footer-heart"><Heart size={14} fill="currentColor" /></span><span>Good vibes and goofy giggles only.</span></div>
            <button className="settings-link" type="button"><GraduationCap size={16} /><span>Happy rules</span><ArrowUpRight size={13} /></button>
          </div>
        </aside>

        <section className="chat-panel">
          <div className="room-header">
            <div className="room-heading">
              <div className="room-title-line"><span className="title-hash"><Hash size={22} strokeWidth={2.4} /></span><h1>{currentRoom?.name || 'Main Chat'}</h1><span className="live-badge"><span /> LIVE</span></div>
              <p>{currentRoom?.topic || 'The shared class hangout.'}</p>
            </div>
            <div className="room-header-right"><span className="room-presence"><Users size={15} /> {onlineCount}<span>here now</span></span><button className="icon-button room-options" type="button" aria-label="Room settings"><Settings2 size={18} /></button></div>
          </div>

          <div className="chat-scroll">
            <div className="welcome-block">
              <span className="welcome-illustration"><Sparkles size={20} /><span>✦</span></span>
              <div className="welcome-copy"><span className="eyebrow">YOUR CLASSROOM IS OPEN</span><h2>Welcome to {currentRoom?.name || 'Main Chat'}.</h2><p>{currentRoom?.topic || 'The shared class hangout.'}</p></div>
            </div>
            {messages.length > 0 && <div className="day-divider"><span>THE CONVERSATION</span></div>}
            <div className="messages">
              {messages.map((message) => message.kind === 'system' ? (
                <div className="system-message" key={message.id}><span className="system-line" /><span>{message.text}</span><span className="system-line" /></div>
              ) : (
                <article className="message" key={message.id}>
                  <span className="avatar message-avatar" style={{ '--avatar': message.color }}>{initials(message.name)}</span>
                  <div className="message-body">
                    <div className="message-meta"><strong>{message.name}</strong><time>{formatTime(message.at)}</time></div>
                    <p>{message.text}</p>
                  </div>
                </article>
              ))}
              <div ref={messageEnd} />
            </div>
            {!messages.length && <div className="first-message-hint"><span className="hint-arrow"><ArrowDown size={15} /></span><span>Make yourself at home. Say the first hello.</span></div>}
          </div>

          <div className="composer-wrap">
            {messageError && <p className="inline-error">{messageError}</p>}
            <form className="composer" onSubmit={sendMessage}>
              <button type="button" className="composer-tool" aria-label="Add an emoji" onClick={() => setDraft((current) => `${current}${current ? ' ' : ''}🙂`)}><Smile size={19} /></button>
              <input ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={joined ? `Message ${currentRoom?.name || 'the room'}...` : 'Join the room to start chatting...'} maxLength={1000} disabled={!joined} aria-label="Message" />
              <span className="composer-shortcut">↵</span>
              <button className="send-button" type="submit" disabled={!joined || !draft.trim()} aria-label="Send message"><Send size={17} /></button>
            </form>
            <div className="composer-caption"><span><span className="caption-dot" /> Conversations are better when everyone feels welcome.</span><span>{draft.length ? `${draft.length}/1000` : <><Headphones size={13} /> Take a breath, take your time</>}</span></div>
          </div>
        </section>

      </div>

      {!joined && (
        <div className="join-overlay">
          <section className="join-card" aria-labelledby="join-title">
            <button className="join-close" type="button" aria-label="Close" onClick={() => setNameError('A name is needed to join the conversation.')}><X size={17} /></button>
            <div className="join-burst"><span className="burst-face">☀️</span><span className="burst-dot" /></div>
            <span className="eyebrow">WELCOME TO SUNNY CHAT</span>
            <h2 id="join-title">What should<br />your silly name be?</h2>
            <p className="join-copy">Pick a fun, friendly name so everyone knows who is bringing the happy energy.</p>
            <form onSubmit={joinChat} className="join-form">
              <label htmlFor="display-name">YOUR SUNNY NAME</label>
              <input id="display-name" value={nameInput} onChange={(event) => { setNameInput(event.target.value); setNameError(''); }} autoComplete="nickname" maxLength={24} placeholder="e.g. Rainbow Panda" autoFocus />
              {nameError && <p className="form-error">{nameError}</p>}
              {!nameError && <p className="name-note"><Check size={13} /> One goofy name per person. Keep it cheerful.</p>}
              <button className="join-button" type="submit">Enter the fun <ArrowUpRight size={17} /></button>
            </form>
            <div className="join-privacy"><span className="privacy-mark"><Heart size={13} fill="currentColor" /></span> No account needed. Just be kind and silly.</div>
          </section>
        </div>
      )}

      {roomModal && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setRoomModal(false); }}>
          <section className="room-modal" aria-labelledby="room-modal-title">
            <button className="join-close" type="button" aria-label="Close" onClick={() => setRoomModal(false)}><X size={17} /></button>
            <span className="eyebrow">OPEN A SUNNY ROOM</span><h2 id="room-modal-title">Start a new happy chat.</h2>
            <p>Give your room a bright name and invite the giggles in.</p>
            <form onSubmit={createRoom}>
              <label htmlFor="room-name">ROOM NAME</label>
              <input id="room-name" autoFocus value={roomInput} onChange={(event) => { setRoomInput(event.target.value); setRoomError(''); }} maxLength={28} placeholder="e.g. Rainbow Cafe" />
              {roomError && <p className="form-error">{roomError}</p>}
              <div className="modal-actions"><button className="cancel-button" type="button" onClick={() => setRoomModal(false)}>Cancel</button><button className="join-button" type="submit">Create chatroom <Plus size={17} /></button></div>
            </form>
          </section>
        </div>
      )}
      <div className="connection-state" aria-live="polite">{joined && !connected && <><span /> Reconnecting...</>}</div>
    </main>
  );
}