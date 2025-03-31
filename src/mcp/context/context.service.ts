import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import {
  ModelContext,
  ModelContextUpdate,
  ModelContextEvent,
} from "../interfaces/model-context.interface";
import { ModelContextEntity } from "../entities/model-context.entity";

@Injectable()
export class ContextService {
  private eventListeners: ((event: ModelContextEvent) => void)[] = [];

  constructor(
    @InjectRepository(ModelContextEntity)
    private contextRepository: Repository<ModelContextEntity>,
  ) {}

  async createContext(
    modelId: string,
    initialState: Record<string, any> = {},
  ): Promise<ModelContext> {
    const entity = this.contextRepository.create({
      id: uuidv4(),
      modelId,
      state: initialState,
      version: 1,
    });

    const savedEntity = await this.contextRepository.save(entity);
    const context = this.entityToModelContext(savedEntity);

    this.emitEvent({
      type: "created",
      contextId: context.id,
      data: context,
      timestamp: new Date(),
    });

    return context;
  }

  async getContext(contextId: string): Promise<ModelContext | undefined> {
    const entity = await this.contextRepository.findOne({
      where: { id: contextId },
    });
    return entity ? this.entityToModelContext(entity) : undefined;
  }

  async getAllContexts(): Promise<ModelContext[]> {
    const entities = await this.contextRepository.find();
    return entities.map((entity) => this.entityToModelContext(entity));
  }

  async updateContext(
    contextId: string,
    update: ModelContextUpdate,
  ): Promise<ModelContext | undefined> {
    const entity = await this.contextRepository.findOne({
      where: { id: contextId },
    });
    if (!entity) return undefined;

    if (entity.version !== update.version) {
      throw new Error("Version mismatch");
    }

    entity.state = { ...entity.state, ...update.state };
    entity.version += 1;

    const savedEntity = await this.contextRepository.save(entity);
    const context = this.entityToModelContext(savedEntity);

    this.emitEvent({
      type: "updated",
      contextId,
      data: context,
      timestamp: new Date(),
    });

    return context;
  }

  async deleteContext(contextId: string): Promise<boolean> {
    const result = await this.contextRepository.delete(contextId);
    if (result.affected && result.affected > 0) {
      this.emitEvent({
        type: "deleted",
        contextId,
        data: { id: contextId },
        timestamp: new Date(),
      });
      return true;
    }
    return false;
  }

  subscribe(listener: (event: ModelContextEvent) => void): () => void {
    this.eventListeners.push(listener);
    return () => {
      this.eventListeners = this.eventListeners.filter((l) => l !== listener);
    };
  }

  private emitEvent(event: ModelContextEvent): void {
    this.eventListeners.forEach((listener) => listener(event));
  }

  private entityToModelContext(entity: ModelContextEntity): ModelContext {
    return {
      id: entity.id,
      modelId: entity.modelId,
      state: entity.state,
      metadata: {
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
        version: entity.version,
      },
    };
  }
}
