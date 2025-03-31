import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { LlmService } from "../services/llm.service";
import {
  Agent,
  Message,
  ToolExecution,
} from "../interfaces/model-context.interface";

interface ErrorWithMessage {
  message: string;
}

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as Record<string, unknown>).message === "string"
  );
}

function getErrorMessage(error: unknown): string {
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  return "An unexpected error occurred";
}

@Controller("llm/agents")
export class LlmController {
  constructor(private readonly llmService: LlmService) {}

  @Post()
  async createAgent(
    @Body()
    body: {
      modelId: string;
      agent: Omit<Agent, "id">;
      systemPrompt?: string;
    },
  ): Promise<Agent> {
    try {
      return await this.llmService.createAgent(
        body.modelId,
        body.agent,
        body.systemPrompt,
      );
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  @Post(":contextId/messages")
  async addMessage(
    @Param("contextId") contextId: string,
    @Body() body: { role: "user" | "assistant"; content: string },
  ): Promise<Message> {
    try {
      return await this.llmService.addMessage(
        contextId,
        body.role,
        body.content,
      );
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  @Post(":contextId/tools/:tool")
  async executeTool(
    @Param("contextId") contextId: string,
    @Param("tool") tool: string,
    @Body() parameters: Record<string, unknown>,
  ): Promise<ToolExecution> {
    try {
      return await this.llmService.executeTool(contextId, tool, parameters);
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  @Get(":contextId/conversation")
  async getConversationHistory(
    @Param("contextId") contextId: string,
  ): Promise<Message[]> {
    try {
      return await this.llmService.getConversationHistory(contextId);
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }

  @Get(":contextId/tools")
  async getToolExecutions(
    @Param("contextId") contextId: string,
  ): Promise<ToolExecution[]> {
    try {
      return await this.llmService.getToolExecutions(contextId);
    } catch (error) {
      throw new HttpException(getErrorMessage(error), HttpStatus.BAD_REQUEST);
    }
  }
}
