import { WebSocket } from 'ws';
import { WebSocketMessage } from '../types';

export class WebSocketManager {
  private clients: Set<WebSocket> = new Set();

  addClient(ws: WebSocket): void {
    this.clients.add(ws);
    console.log(`WebSocket client connected. Total clients: ${this.clients.size}`);

    ws.on('close', () => {
      this.clients.delete(ws);
      console.log(`WebSocket client disconnected. Total clients: ${this.clients.size}`);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.clients.delete(ws);
    });
  }

  broadcast(message: WebSocketMessage): void {
    const payload = JSON.stringify(message);
    
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });

    console.log(`Broadcasted message to ${this.clients.size} clients:`, message);
  }

  getClientCount(): number {
    return this.clients.size;
  }
}
