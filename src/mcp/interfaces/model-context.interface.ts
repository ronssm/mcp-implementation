export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

export interface ToolExecution {
  tool: string;
  parameters: Record<string, unknown>;
  result: unknown;
  timestamp: Date;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  model: string; // e.g., "gpt-4", "claude-3"
  tools: Tool[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ModelContext {
  id: string;
  modelId: string;
  state: {
    agent?: Agent;
    conversationHistory?: Message[];
    toolExecutions?: ToolExecution[];
    variables?: Record<string, unknown>;
    status?: "idle" | "running" | "error";
    error?: string;
  };
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    version: number;
  };
}

export interface ModelContextUpdate {
  modelId?: string;
  state?: Partial<ModelContext["state"]>;
  version: number;
}

export interface ModelContextEvent {
  type: "created" | "updated" | "deleted" | "tool_executed" | "message_added";
  contextId: string;
  data: Partial<ModelContext>;
  timestamp: Date;
}
