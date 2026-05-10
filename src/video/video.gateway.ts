import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

const origenesPermitidos = process.env.NODE_ENV === 'production'
  ? ['https://flexstudio.com', 'https://www.flexstudio.com'] 
  : ['http://localhost:5173'];    

@WebSocketGateway({ 
  cors: { 
    origin: origenesPermitidos,
    credentials: true 
  } 
}) 
export class VideoGateway implements OnGatewayConnection, OnGatewayDisconnect {
  
  @WebSocketServer()
  server!: Server;
 
  handleConnection(client: Socket) {
    console.log(`Panel conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Panel desconectado: ${client.id}`);
  }

  notificarVideoActualizado(videoData: any) {
    this.server.emit('videoActualizado', videoData);
  }
}