import express from 'express';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Server } from 'socket.io';
import leoProfanity from 'leo-profanity';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: true } });
const port = process.env.PORT || 3001;
const root = path.dirname(fileURLToPath(import.meta.url));
const starters = [
  { id: 'main-chat', name: 'Main Chat', topic: 'The shared class hangout.' },
  { id: 'chatroom-1', name: 'Chatroom 1', topic: 'Ask a question or compare notes.' },
  { id: 'chatroom-2', name: 'Chatroom 2', topic: 'Make a study group and learn together.' },
];

const rooms = new Map(starters.map((room) => [room.id, { ...room, messages: [] }]));
const people = new Map();
const reservedNames = new Map();
const blockedNames = new Set(['admin', 'anonymous', 'guest', 'nobody', 'someone', 'test', 'user', 'asdf', 'qwerty', 'poop', 'butt', 'peepee', 'blah']);
const namePattern = /^[\p{L}][\p{L}\p{M}' -]{1,23}$/u;

function safeRoom(room) {
  return { id: room.id, name: room.name, topic: room.topic };
}

function roomPeople(roomId) {
  return [...people.values()]
    .filter((person) => person.roomId === roomId)
    .map(({ name, color }) => ({ name, color }));
}

function sendRoomState(roomId) {
  io.to(roomId).emit('people', roomPeople(roomId));
}

function addMessage(roomId, message) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.messages.push(message);
  if (room.messages.length > 150) room.messages.shift();
  io.to(roomId).emit('message', message);
}

function validateName(input) {
  if (typeof input !== 'string') return 'Add a name to join.';
  const name = input.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 24) return 'Names need 2 to 24 characters.';
  if (!namePattern.test(name) || /\s{2}|--|''/.test(name)) {
    return 'Use letters, spaces, apostrophes, or hyphens only.';
  }
  if (leoProfanity.check(name) || blockedNames.has(name.toLocaleLowerCase())) {
    return 'That name is not allowed. Try your real name or a nickname.';
  }
  const key = name.toLocaleLowerCase();
  if (reservedNames.has(key)) return 'Someone is already using that name. Try another one.';
  return { name, key };
}

io.on('connection', (socket) => {
  socket.emit('rooms', [...rooms.values()].map(safeRoom));

  socket.on('join', (payload, reply = () => {}) => {
    const result = validateName(payload?.name);
    if (typeof result === 'string') return reply({ ok: false, error: result });

    const { name, key } = result;
    const color = ['#e7ff76', '#ff9d79', '#91e6d0', '#b9a2ff', '#ffd166'][people.size % 5];
    const person = { name, key, color, roomId: 'main-chat' };
    people.set(socket.id, person);
    reservedNames.set(key, socket.id);
    socket.join('main-chat');
    reply({ ok: true, name, roomId: 'main-chat', rooms: [...rooms.values()].map(safeRoom) });
    socket.emit('history', rooms.get('main-chat').messages);
    addMessage('main-chat', {
      id: `${Date.now()}-${socket.id}`,
      kind: 'system',
      text: `${name} just joined the room`,
      at: new Date().toISOString(),
    });
    sendRoomState('main-chat');
  });

  socket.on('switch-room', (roomId, reply = () => {}) => {
    const person = people.get(socket.id);
    const nextRoom = rooms.get(roomId);
    if (!person || !nextRoom) return reply({ ok: false, error: 'That room could not be found.' });
    if (person.roomId === roomId) return reply({ ok: true });

    const previousRoomId = person.roomId;
    socket.leave(previousRoomId);
    person.roomId = roomId;
    socket.join(roomId);
    socket.emit('history', nextRoom.messages);
    addMessage(previousRoomId, {
      id: `${Date.now()}-${socket.id}`,
      kind: 'system',
      text: `${person.name} left the room`,
      at: new Date().toISOString(),
    });
    addMessage(roomId, {
      id: `${Date.now()}-${socket.id}-join`,
      kind: 'system',
      text: `${person.name} joined the room`,
      at: new Date().toISOString(),
    });
    sendRoomState(previousRoomId);
    sendRoomState(roomId);
    reply({ ok: true });
  });

  socket.on('create-room', (payload, reply = () => {}) => {
    const person = people.get(socket.id);
    if (!person) return reply({ ok: false, error: 'Join the chat before creating a room.' });
    const name = typeof payload?.name === 'string' ? payload.name.trim().replace(/\s+/g, ' ') : '';
    if (name.length < 2 || name.length > 28 || !/^[\p{L}\p{N}][\p{L}\p{N} -]{1,27}$/u.test(name)) {
      return reply({ ok: false, error: 'Room names need 2 to 28 letters or numbers.' });
    }
    if (leoProfanity.check(name)) return reply({ ok: false, error: 'Please choose a different room name.' });
    if ([...rooms.values()].some((room) => room.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      return reply({ ok: false, error: 'A room with that name already exists.' });
    }
    const id = `room-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const room = { id, name, topic: `A new corner started by ${person.name}.`, messages: [] };
    rooms.set(id, room);
    io.emit('rooms', [...rooms.values()].map(safeRoom));
    reply({ ok: true, room: safeRoom(room) });
  });

  socket.on('send-message', (payload, reply = () => {}) => {
    const person = people.get(socket.id);
    const text = typeof payload?.text === 'string' ? payload.text.trim() : '';
    if (!person) return reply({ ok: false, error: 'Join the chat to send a message.' });
    if (!text || text.length > 1000) return reply({ ok: false, error: 'Messages must be 1 to 1000 characters.' });
    if (leoProfanity.check(text)) return reply({ ok: false, error: 'Please keep the conversation kind.' });
    addMessage(person.roomId, {
      id: `${Date.now()}-${socket.id}`,
      kind: 'chat',
      name: person.name,
      color: person.color,
      text,
      at: new Date().toISOString(),
    });
    reply({ ok: true });
  });

  socket.on('disconnect', () => {
    const person = people.get(socket.id);
    if (!person) return;
    people.delete(socket.id);
    reservedNames.delete(person.key);
    addMessage(person.roomId, {
      id: `${Date.now()}-${socket.id}`,
      kind: 'system',
      text: `${person.name} left the chat`,
      at: new Date().toISOString(),
    });
    sendRoomState(person.roomId);
  });
});

const clientDist = path.resolve(root, '../dist');

if (process.env.NODE_ENV === 'production' || existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((_request, response) => response.sendFile(path.join(clientDist, 'index.html')));
}

httpServer.listen(port, () => console.log(`Goodchat server listening on http://localhost:${port}`));