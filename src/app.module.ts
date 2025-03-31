import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ContextModule } from "./mcp/context/context.module";
import { ModelContextEntity } from "./mcp/entities/model-context.entity";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "sqlite",
      database: "mcp.db",
      entities: [ModelContextEntity],
      synchronize: true, // Set to false in production
    }),
    ContextModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
