import { io } from 'socket.io-client';
import { API_BASE_URL } from './api';

export const socket = io(API_BASE_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
});