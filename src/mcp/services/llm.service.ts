import { Injectable, NotFoundException } from "@nestjs/common";
import {
  Agent,
  Message,
  ToolExecution,
} from "../interfaces/model-context.interface";
import { ContextService } from "../context/context.service";
import { ToolsService } from "./tools.service";

@Injectable()
export class LlmService {
  constructor(
    private readonly contextService: ContextService,
    private readonly toolsService: ToolsService,
  ) {}

  async createAgent(
    modelId: string,
    agent: Omit<Agent, "id">,
    systemPrompt?: string,
  ): Promise<Agent> {
    const newAgent: Agent = {
      ...agent,
      id: `agent-${Date.now()}`,
    };

    const context = await this.contextService.createContext(modelId, {
      agent: newAgent,
      conversationHistory: systemPrompt
        ? [
            {
              role: "system",
              content: systemPrompt,
              timestamp: new Date(),
            },
          ]
        : [],
      toolExecutions: [],
      status: "idle",
    });

    if (!context) {
      throw new Error("Failed to create agent context");
    }

    return newAgent;
  }

  async addMessage(
    contextId: string,
    role: "user" | "assistant",
    content: string,
  ): Promise<Message> {
    const context = await this.contextService.getContext(contextId);
    if (!context) {
      throw new NotFoundException(`Context with ID ${contextId} not found`);
    }

    const newMessage: Message = {
      role,
      content,
      timestamp: new Date(),
    };

    const updatedState = {
      ...context.state,
      conversationHistory: [
        ...(context.state.conversationHistory || []),
        newMessage,
      ],
    };

    const updatedContext = await this.contextService.updateContext(contextId, {
      state: updatedState,
      version: context.metadata.version,
    });

    if (!updatedContext) {
      throw new Error("Failed to update context");
    }

    return newMessage;
  }

  async executeTool(
    contextId: string,
    tool: string,
    parameters: Record<string, unknown>,
  ): Promise<ToolExecution> {
    const context = await this.contextService.getContext(contextId);
    if (!context) {
      throw new NotFoundException(`Context with ID ${contextId} not found`);
    }

    if (!context.state.agent) {
      throw new Error("No agent found in context");
    }

    const toolConfig = context.state.agent.tools.find((t) => t.name === tool);
    if (!toolConfig) {
      throw new Error(`Tool ${tool} not found in agent configuration`);
    }

    const toolResult = await this.toolsService.executeTool(
      toolConfig,
      parameters,
    );

    const newExecution: ToolExecution = {
      tool,
      parameters,
      result: toolResult,
      timestamp: new Date(),
    };

    const updatedState = {
      ...context.state,
      toolExecutions: [...(context.state.toolExecutions || []), newExecution],
    };

    const updatedContext = await this.contextService.updateContext(contextId, {
      state: updatedState,
      version: context.metadata.version,
    });

    if (!updatedContext) {
      throw new Error("Failed to update context");
    }

    return newExecution;
  }

  async getConversationHistory(contextId: string): Promise<Message[]> {
    const context = await this.contextService.getContext(contextId);
    if (!context) {
      throw new NotFoundException(`Context with ID ${contextId} not found`);
    }

    return context.state.conversationHistory || [];
  }

  async getToolExecutions(contextId: string): Promise<ToolExecution[]> {
    const context = await this.contextService.getContext(contextId);
    if (!context) {
      throw new NotFoundException(`Context with ID ${contextId} not found`);
    }

    return context.state.toolExecutions || [];
  }
}
