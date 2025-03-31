import { Module } from "@nestjs/common";
import { ContextModule } from "./context/context.module";
import { LlmService } from "./services/llm.service";
import { LlmController } from "./controllers/llm.controller";
import { ToolsService } from "./services/tools.service";

@Module({
  imports: [ContextModule],
  controllers: [LlmController],
  providers: [LlmService, ToolsService],
  exports: [LlmService],
})
export class McpModule {}
