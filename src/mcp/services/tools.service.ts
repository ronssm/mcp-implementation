import { Injectable } from "@nestjs/common";
import { Tool } from "../interfaces/model-context.interface";
import * as fs from "fs";
import * as path from "path";

interface FileOperationResult {
  success: boolean;
  message: string;
  fileSize: number;
  timestamp: string;
  created?: Date;
  lastModified?: Date;
}

interface FileListResult {
  directory: string;
  totalFiles: number;
  files: Array<{
    path: string;
    type: string;
    size: number;
    lastModified: Date;
  }>;
  timestamp: string;
}

interface FileReadResult {
  content: string;
  path: string;
  size: number;
  lastModified: Date;
  encoding: string;
  timestamp: string;
}

type ToolResult = FileOperationResult | FileListResult | FileReadResult;

interface FileError extends Error {
  code?: string;
}

@Injectable()
export class ToolsService {
  async executeTool(
    tool: Tool,
    parameters: Record<string, unknown>,
  ): Promise<ToolResult> {
    switch (tool.name) {
      case "createFile":
        return this.createFile(
          parameters.filePath as string,
          parameters.content as string,
        );
      case "editFile":
        return this.editFile(
          parameters.filePath as string,
          parameters.changes as string,
        );
      case "listFiles":
        return this.listFiles(parameters.path as string);
      case "readFile":
        return this.readFile(parameters.filePath as string);
      default:
        throw new Error(`Tool ${tool.name} not implemented`);
    }
  }

  private async createFile(
    filePath: string,
    content: string,
  ): Promise<FileOperationResult> {
    try {
      // Check if file already exists
      try {
        await fs.promises.access(filePath);
        throw new Error(`File ${filePath} already exists`);
      } catch (error) {
        const fileError = error as FileError;
        if (fileError.code !== "ENOENT") {
          throw new Error(fileError.message || "Unknown error occurred");
        }
      }

      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (dir !== ".") {
        await fs.promises.mkdir(dir, { recursive: true });
      }

      // Create and write file
      await fs.promises.writeFile(filePath, content, "utf-8");

      const stats = await fs.promises.stat(filePath);

      return {
        success: true,
        message: `File ${filePath} created successfully`,
        fileSize: content.length,
        created: stats.birthtime,
        lastModified: stats.mtime,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const fileError = error as FileError;
      if (fileError.code === "EACCES") {
        throw new Error(`Permission denied: Cannot create file at ${filePath}`);
      }
      throw new Error(fileError.message || "Failed to create file");
    }
  }

  private async editFile(
    filePath: string,
    changes: string,
  ): Promise<FileOperationResult> {
    try {
      // Check if file exists and is writable
      await fs.promises.access(filePath, fs.constants.W_OK);

      // Write new content
      await fs.promises.writeFile(filePath, changes, "utf-8");

      return {
        success: true,
        message: `File ${filePath} updated successfully`,
        fileSize: changes.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const fileError = error as FileError;
      if (fileError.code === "ENOENT") {
        throw new Error(`File ${filePath} does not exist`);
      }
      if (fileError.code === "EACCES") {
        throw new Error(`Permission denied: Cannot write to ${filePath}`);
      }
      throw new Error(fileError.message || "Failed to edit file");
    }
  }

  private async listFiles(dirPath = "."): Promise<FileListResult> {
    try {
      const files = await this.getAllFiles(dirPath);
      const fileStats = await Promise.all(
        files.map(async (file) => {
          const stats = await fs.promises.stat(file);
          return {
            path: file,
            type: path.extname(file) || "directory",
            size: stats.size,
            lastModified: stats.mtime,
          };
        }),
      );

      return {
        directory: dirPath,
        totalFiles: files.length,
        files: fileStats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const fileError = error as FileError;
      if (fileError.code === "ENOENT") {
        throw new Error(`Directory ${dirPath} does not exist`);
      }
      if (fileError.code === "EACCES") {
        throw new Error(`Permission denied: Cannot access ${dirPath}`);
      }
      throw new Error(fileError.message || "Failed to list files");
    }
  }

  private async readFile(filePath: string): Promise<FileReadResult> {
    try {
      // Check if file exists and is readable
      await fs.promises.access(filePath, fs.constants.R_OK);

      const content = await fs.promises.readFile(filePath, "utf-8");
      const stats = await fs.promises.stat(filePath);

      return {
        content,
        path: filePath,
        size: stats.size,
        lastModified: stats.mtime,
        encoding: "utf-8",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const fileError = error as FileError;
      if (fileError.code === "ENOENT") {
        throw new Error(`File ${filePath} does not exist`);
      }
      if (fileError.code === "EACCES") {
        throw new Error(`Permission denied: Cannot read ${filePath}`);
      }
      throw new Error(fileError.message || "Failed to read file");
    }
  }

  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
          files.push(...(await this.getAllFiles(fullPath)));
        }
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }
}
