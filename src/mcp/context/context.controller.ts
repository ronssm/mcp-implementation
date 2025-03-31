import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { ContextService } from "./context.service";
import {
  ModelContext,
  ModelContextUpdate,
} from "../interfaces/model-context.interface";

@Controller("contexts")
export class ContextController {
  constructor(private readonly contextService: ContextService) {}

  @Get()
  async getAllContexts(): Promise<ModelContext[]> {
    return await this.contextService.getAllContexts();
  }

  @Post()
  async createContext(
    @Body("modelId") modelId: string,
    @Body("initialState") initialState: Record<string, any> = {},
  ): Promise<ModelContext> {
    return await this.contextService.createContext(modelId, initialState);
  }

  @Get(":id")
  async getContext(@Param("id") id: string): Promise<ModelContext> {
    const context = await this.contextService.getContext(id);
    if (!context) {
      throw new HttpException("Context not found", HttpStatus.NOT_FOUND);
    }
    return context;
  }

  @Put(":id")
  async updateContext(
    @Param("id") id: string,
    @Body() update: ModelContextUpdate,
  ): Promise<ModelContext> {
    try {
      const context = await this.contextService.updateContext(id, update);
      if (!context) {
        throw new HttpException("Context not found", HttpStatus.NOT_FOUND);
      }
      return context;
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        error.message === "Version mismatch"
      ) {
        throw new HttpException("Version mismatch", HttpStatus.CONFLICT);
      }
      throw error;
    }
  }

  @Delete(":id")
  async deleteContext(@Param("id") id: string): Promise<{ success: boolean }> {
    const deleted = await this.contextService.deleteContext(id);
    if (!deleted) {
      throw new HttpException("Context not found", HttpStatus.NOT_FOUND);
    }
    return { success: true };
  }
}
