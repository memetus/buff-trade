import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Cron } from '@nestjs/schedule';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: '/token', cors: { origin: '*' } })
export class TokenGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    try {
      console.log('client has connected: token', client.id);

      client.conn.on('connection_error', (err) => {
        console.log(err.req); // the request object
        console.log(err.code); // the error code, for example 1
        console.log(err.message); // the error message, for example "Session ID unknown"
        console.log(err.context); // some additional error context
      });
    } catch (error) {
      console.error(`Connection error: ${error.message}`, error.stack);
      client.emit('error', 'Connection error');
    }
  }

  handleDisconnect(client: Socket) {
    console.log('client has disconnected: token', client.id);
  }

  @Cron('*/10 * * * * *')
  async handleCron() {
    this.server.emit('tokens', 'test');
  }

  broadcastTokens(tokens: any) {
    this.server.emit('token', tokens);
  }
}
