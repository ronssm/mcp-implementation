import { Test, TestingModule } from "@nestjs/testing";
import { ToolsService } from "./tools.service";
import * as fs from "fs";
import * as path from "path";
import { Tool } from "../interfaces/model-context.interface";
import { jest } from "@jest/globals";

// Mock fs and path modules
jest.mock("fs");
jest.mock("path");

describe("ToolsService", () => {
  let service: ToolsService;
  const mockFs = jest.mocked(fs);
  const mockPath = jest.mocked(path);

  // Create a complete mock Dirent class that extends fs.Dirent
  class MockDirent extends fs.Dirent {
    constructor(name: string, isDirectory: boolean) {
      super();
      Object.defineProperty(this, "name", {
        get: () => name,
        enumerable: true,
        configurable: true,
      });
      this._isDirectory = isDirectory;
    }

    private _isDirectory: boolean;

    isDirectory(): boolean {
      return this._isDirectory;
    }

    isFile(): boolean {
      return !this._isDirectory;
    }

    isBlockDevice(): boolean {
      return false;
    }

    isCharacterDevice(): boolean {
      return false;
    }

    isSymbolicLink(): boolean {
      return false;
    }

    isFIFO(): boolean {
      return false;
    }

    isSocket(): boolean {
      return false;
    }
  }

  const createMockDirent = (name: string, isDirectory: boolean): fs.Dirent => {
    return new MockDirent(name, isDirectory);
  };

  // Simplified mock Stats
  const createMockStats = (isDirectory = false): fs.Stats => ({
    size: 100,
    birthtime: new Date(),
    mtime: new Date(),
    isDirectory: () => isDirectory,
    isFile: () => !isDirectory,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isSymbolicLink: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    dev: 0,
    ino: 0,
    mode: 0,
    nlink: 1,
    uid: 0,
    gid: 0,
    rdev: 0,
    blksize: 4096,
    blocks: 1,
    atimeMs: 0,
    mtimeMs: 0,
    ctimeMs: 0,
    birthtimeMs: 0,
    atime: new Date(),
    ctime: new Date(),
  });

  const createMockTool = (name: string): Tool => ({
    name,
    description: "Test tool",
    parameters: {
      type: "object",
      properties: {},
    },
  });

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ToolsService],
    }).compile();

    service = module.get<ToolsService>(ToolsService);
  });

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup default mock implementations for fs.promises
    const mockPromises = {
      access: jest.fn(() => Promise.reject(new Error("ENOENT"))),
      writeFile: jest.fn(() => Promise.resolve(undefined)),
      readFile: jest.fn(() => Promise.resolve("test content")),
      stat: jest.fn(() => Promise.resolve(createMockStats())),
      readdir: jest.fn(() => Promise.resolve([
        createMockDirent("file1.txt", false),
        createMockDirent("dir1", true),
      ])),
      mkdir: jest.fn(() => Promise.resolve(undefined)),
    };

    Object.assign(mockFs.promises, mockPromises);

    mockPath.dirname.mockReturnValue("test/dir");
    mockPath.join.mockImplementation((...args) => args.join("/"));
    mockPath.extname.mockReturnValue(".txt");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createFile", () => {
    it("should create a new file successfully", async () => {
      const result = await service.executeTool(
        createMockTool("createFile"),
        {
          filePath: "test.txt",
          content: "test content",
        }
      );

      expect(result).toEqual(expect.objectContaining({
        success: true,
        message: expect.stringContaining("created successfully"),
      }));
      expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
        "test.txt",
        "test content",
        "utf-8"
      );
    });

    it("should create parent directories if they do not exist", async () => {
      mockPath.dirname.mockReturnValue("test/dir");

      await service.executeTool(
        createMockTool("createFile"),
        {
          filePath: "test/dir/file.txt",
          content: "test content",
        }
      );

      expect(mockFs.promises.mkdir).toHaveBeenCalledWith("test/dir", {
        recursive: true,
      });
    });

    it("should throw error if file already exists", async () => {
      mockFs.promises.access.mockResolvedValueOnce(undefined);

      await expect(
        service.executeTool(
          createMockTool("createFile"),
          {
            filePath: "existing.txt",
            content: "test content",
          }
        )
      ).rejects.toThrow("File existing.txt already exists");
    });

    it("should throw error if permission denied", async () => {
      mockFs.promises.access.mockRejectedValueOnce(new Error("EACCES"));

      await expect(
        service.executeTool(
          createMockTool("createFile"),
          {
            filePath: "test.txt",
            content: "test content",
          }
        )
      ).rejects.toThrow("Permission denied");
    });
  });

  describe("editFile", () => {
    it("should edit an existing file successfully", async () => {
      mockFs.promises.access.mockResolvedValueOnce(undefined);
      mockFs.promises.readFile.mockResolvedValueOnce("old content");

      const result = await service.executeTool(
        createMockTool("editFile"),
        {
          filePath: "test.txt",
          changes: "new content",
        }
      );

      expect(result).toEqual(expect.objectContaining({
        success: true,
        message: expect.stringContaining("updated successfully"),
      }));
      expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
        "test.txt",
        "new content",
        "utf-8"
      );
    });

    it("should throw error if file does not exist", async () => {
      mockFs.promises.access.mockRejectedValueOnce(new Error("ENOENT"));

      await expect(
        service.executeTool(
          createMockTool("editFile"),
          {
            filePath: "nonexistent.txt",
            changes: "new content",
          }
        )
      ).rejects.toThrow("File nonexistent.txt does not exist");
    });

    it("should throw error if permission denied", async () => {
      mockFs.promises.access.mockRejectedValueOnce(new Error("EACCES"));

      await expect(
        service.executeTool(
          createMockTool("editFile"),
          {
            filePath: "test.txt",
            changes: "new content",
          }
        )
      ).rejects.toThrow("Permission denied");
    });
  });

  describe("listFiles", () => {
    it("should list files in directory successfully", async () => {
      const mockFiles = [
        createMockDirent("file1.txt", false),
        createMockDirent("dir1", true),
      ];

      mockFs.promises.readdir.mockResolvedValueOnce(mockFiles);
      mockFs.promises.stat.mockImplementation((filePath: fs.PathLike) =>
        Promise.resolve(createMockStats(filePath.toString().endsWith("dir1")))
      );

      const result = await service.executeTool(
        createMockTool("listFiles"),
        {
          path: "test/dir",
        }
      );

      expect(result).toEqual(expect.objectContaining({
        directory: "test/dir",
        totalFiles: expect.any(Number),
        files: expect.arrayContaining([
          expect.objectContaining({
            path: expect.any(String),
            type: expect.any(String),
            size: expect.any(Number),
            lastModified: expect.any(Date),
          }),
        ]),
        timestamp: expect.any(String),
      }));
    });

    it("should throw error if directory does not exist", async () => {
      mockFs.promises.readdir.mockRejectedValueOnce(new Error("ENOENT"));

      await expect(
        service.executeTool(
          createMockTool("listFiles"),
          {
            path: "nonexistent/dir",
          }
        )
      ).rejects.toThrow("Directory nonexistent/dir does not exist");
    });
  });
});
