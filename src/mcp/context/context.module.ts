import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ContextService } from "./context.service";
import { ContextController } from "./context.controller";
import { ContextGateway } from "./context.gateway";
import { ModelContextEntity } from "../entities/model-context.entity";

@Module({
  imports: [TypeOrmModule.forFeature([ModelContextEntity])],
  controllers: [ContextController],
  providers: [ContextService, ContextGateway],
  exports: [ContextService],
})
export class ContextModule {}
