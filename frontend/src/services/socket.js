import { io } from 'socket.io-client';
import { API_BASE_URL } from '../config';

export const socket = io(API_BASE_URL, {
  transports: ['polling', 'websocket'],
  withCredentials: true,
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
});