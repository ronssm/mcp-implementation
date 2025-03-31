import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { ContextService } from "./context.service";
import { ModelContextEvent } from "../interfaces/model-context.interface";

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class ContextGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly contextService: ContextService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage("subscribe")
  handleSubscribe(client: Socket) {
    const unsubscribe = this.contextService.subscribe(
      (event: ModelContextEvent) => {
        client.emit("contextEvent", event);
      },
    );

    client.on("disconnect", () => {
      unsubscribe();
    });

    return { status: "subscribed" };
  }
}
