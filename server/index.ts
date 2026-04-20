import express from "express";
import cors from "cors";
import {
  readFile,
  writeFile,
  mkdir,
  rename,
  copyFile,
  unlink,
  access,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT = resolve(__dirname, "..");
const INDEX_FILE = resolve(ROOT, "data", "index.json");
const COMMANDS_DIR = resolve(ROOT, "data", "commands");
const LEGACY_DATA_FILE = resolve(ROOT, "data", "commands.json");
const PORT = Number(process.env.PORT) || 3001;

type Importance = "critical" | "high" | "medium" | "low";
type ToolResourceType = "skill" | "agent" | "plugin" | "hook";
type ToolResourceScope = "global" | "project";
type SkillSource = "bundled-slash-skill" | "markdown-file";

interface Tool {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  order: number;
  docUrl?: string;
  dataFile?: string;
}

interface Modifier {
  flag: string;
  description: string;
  example?: string;
}

interface Command {
  id: string;
  toolId: string;
  section: string;
  name: string;
  description: string;
  hint: string;
  importance: Importance;
  frequency: number;
  tags: string[];
  notes: string;
  favorite: boolean;
  order: number;
  modifiers: Modifier[];
  docUrl?: string;
}

interface ToolResource {
  id: string;
  toolId: string;
  type: ToolResourceType;
  name: string;
  identifier: string;
  publisher: string;
  active: boolean;
  utility: string;
  scope: ToolResourceScope;
  projectName: string;
  installedAt: string;
  securityAudited: boolean;
  path: string;
  source?: SkillSource;
}

interface Database {
  tools: Tool[];
  commands: Command[];
  resources: ToolResource[];
}

interface ToolDataFile {
  commands: Command[];
  resources: ToolResource[];
}

// --- Persistence helpers ------------------------------------------------

/** Strips the internal dataFile field before sending a tool to the client. */
function stripInternal(tool: Tool): Omit<Tool, "dataFile"> {
  const rest = { ...tool };
  delete rest.dataFile;
  return rest;
}

/** Returns the absolute path to a tool's commands file given its dataFile field. */
function getToolCommandsFile(tool: Tool): string {
  return resolve(ROOT, "data", tool.dataFile!);
}

function emptyToolData(): ToolDataFile {
  return { commands: [], resources: [] };
}

/** Migrates from the old monolithic commands.json to the new split-file format. */
async function migrateFromMonolith(): Promise<void> {
  if (!existsSync(LEGACY_DATA_FILE)) return;

  console.log("[migration] Starting migration from monolithic commands.json...");
  const raw = await readFile(LEGACY_DATA_FILE, "utf8");
  const parsed = JSON.parse(raw) as Database;
  const tools: Tool[] = (parsed.tools ?? []).map((t) => ({
    ...t,
    dataFile: `commands/${t.slug}.json`,
  }));
  const allCommands: Command[] = parsed.commands ?? [];
  const allResources: ToolResource[] = parsed.resources ?? [];

  // Write index.json
  await writeFile(INDEX_FILE, JSON.stringify({ tools }, null, 2), "utf8");

  // Write each tool's commands file
  for (const tool of tools) {
    const toolCommands = allCommands.filter((c) => c.toolId === tool.id);
    const toolResources = allResources.filter((resource) => resource.toolId === tool.id);
    const cmdFile = getToolCommandsFile(tool);
    await writeFile(
      cmdFile,
      JSON.stringify({ commands: toolCommands, resources: toolResources }, null, 2),
      "utf8",
    );
  }

  // Rename the old commands.json to commands.json.bak
  const backupFile = `${LEGACY_DATA_FILE}.bak`;
  try {
    await rename(LEGACY_DATA_FILE, backupFile);
  } catch {
    await copyFile(LEGACY_DATA_FILE, backupFile);
    await unlink(LEGACY_DATA_FILE).catch(() => undefined);
  }

  console.log("[migration] Migrated from monolithic commands.json to split files");
}

/** Creates data/ and data/commands/ directories if they don't exist. Runs migration if needed. */
async function ensureDataDirs(): Promise<void> {
  await mkdir(COMMANDS_DIR, { recursive: true });
  if (!existsSync(INDEX_FILE)) {
    await migrateFromMonolith();
  }
  if (!existsSync(INDEX_FILE)) {
    await writeFile(INDEX_FILE, JSON.stringify({ tools: [] }, null, 2), "utf8");
  }
}

/** Reads data/index.json. Returns { tools: [] } if the file doesn't exist. */
async function readIndex(): Promise<{ tools: Tool[] }> {
  if (!existsSync(INDEX_FILE)) return { tools: [] };
  const raw = await readFile(INDEX_FILE, "utf8");
  const parsed = JSON.parse(raw) as { tools: Tool[] };
  parsed.tools ??= [];
  return parsed;
}

/** Atomic write to data/index.json. */
async function writeIndex(data: { tools: Tool[] }): Promise<void> {
  const tmp = `${INDEX_FILE}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  try {
    await rename(tmp, INDEX_FILE);
  } catch {
    await copyFile(tmp, INDEX_FILE);
    await unlink(tmp).catch(() => undefined);
  }
}

/**
 * Reads the full data payload from a tool's data file.
 * @param dataFile - relative path like "commands/claude-code.json"
 * Returns empty arrays if the file doesn't exist.
 */
async function readToolDataFile(dataFile: string): Promise<ToolDataFile> {
  const filePath = resolve(ROOT, "data", dataFile);
  if (!existsSync(filePath)) return emptyToolData();
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as Partial<ToolDataFile>;
  return {
    commands: parsed.commands ?? [],
    resources: parsed.resources ?? [],
  };
}

/** Atomic write to the given tool data file. */
async function writeToolDataFile(dataFile: string, data: ToolDataFile): Promise<void> {
  const filePath = resolve(ROOT, "data", dataFile);
  const tmp = `${filePath}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  try {
    await rename(tmp, filePath);
  } catch {
    await copyFile(tmp, filePath);
    await unlink(tmp).catch(() => undefined);
  }
}

async function readCommandsFile(dataFile: string): Promise<Command[]> {
  return (await readToolDataFile(dataFile)).commands;
}

async function writeCommandsFile(dataFile: string, commands: Command[]): Promise<void> {
  const data = await readToolDataFile(dataFile);
  data.commands = commands;
  await writeToolDataFile(dataFile, data);
}

async function readResourcesFile(dataFile: string): Promise<ToolResource[]> {
  return (await readToolDataFile(dataFile)).resources;
}

async function writeResourcesFile(dataFile: string, resources: ToolResource[]): Promise<void> {
  const data = await readToolDataFile(dataFile);
  data.resources = resources;
  await writeToolDataFile(dataFile, data);
}

/**
 * Merges tools from index.json with all their commands.
 * Strips dataFile from tools before returning (it's internal).
 */
async function readDb(): Promise<Database> {
  await ensureDataDirs();
  const { tools } = await readIndex();
  const allCommands: Command[] = [];
  const allResources: ToolResource[] = [];
  for (const tool of tools) {
    if (tool.dataFile) {
      const data = await readToolDataFile(tool.dataFile);
      allCommands.push(...data.commands);
      allResources.push(...data.resources);
    }
  }
  return {
    tools: tools.map(stripInternal) as Tool[],
    commands: allCommands,
    resources: allResources,
  };
}

/** Helper: finds a command across all tool files, returns command + tool. */
async function findCommandInDb(
  id: string,
): Promise<{ command: Command; tool: Tool } | null> {
  const { tools } = await readIndex();
  for (const tool of tools) {
    if (!tool.dataFile) continue;
    const cmds = await readCommandsFile(tool.dataFile);
    const cmd = cmds.find((c) => c.id === id);
    if (cmd) return { command: cmd, tool };
  }
  return null;
}

async function findResourceInDb(
  id: string,
): Promise<{ resource: ToolResource; tool: Tool } | null> {
  const { tools } = await readIndex();
  for (const tool of tools) {
    if (!tool.dataFile) continue;
    const resources = await readResourcesFile(tool.dataFile);
    const resource = resources.find((entry) => entry.id === id);
    if (resource) return { resource, tool };
  }
  return null;
}

// Serialize writes so concurrent requests don't clobber each other.
let writeQueue: Promise<unknown> = Promise.resolve();
function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(() => fn());
  writeQueue = next.catch(() => undefined);
  return next;
}

// --- Validation ---------------------------------------------------------

const VALID_IMPORTANCE: Importance[] = ["critical", "high", "medium", "low"];
const VALID_RESOURCE_TYPES: ToolResourceType[] = ["skill", "agent", "plugin", "hook"];
const VALID_RESOURCE_SCOPES: ToolResourceScope[] = ["global", "project"];
const VALID_SKILL_SOURCES: SkillSource[] = ["bundled-slash-skill", "markdown-file"];

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function asModifierArray(v: unknown): Modifier[] {
  if (!Array.isArray(v)) return [];
  const out: Modifier[] = [];
  for (const item of v) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const flag = typeof o.flag === "string" ? o.flag.trim() : "";
    if (!flag) continue;
    const description = typeof o.description === "string" ? o.description : "";
    const example = typeof o.example === "string" && o.example.trim() ? o.example : undefined;
    out.push(example !== undefined ? { flag, description, example } : { flag, description });
  }
  return out;
}

function normalizeTool(input: unknown, existing?: Tool): Tool {
  const o = (input ?? {}) as Record<string, unknown>;
  return {
    id: asString(o.id, existing?.id ?? ""),
    name: asString(o.name, existing?.name ?? "Unnamed"),
    slug: asString(o.slug, existing?.slug ?? ""),
    icon: asString(o.icon, existing?.icon ?? "◆"),
    color: asString(o.color, existing?.color ?? "#ff6b35"),
    order: typeof o.order === "number" ? o.order : (existing?.order ?? 0),
    docUrl: (typeof o.docUrl === "string" && o.docUrl.trim()) ? o.docUrl.trim() : (existing?.docUrl ?? ""),
    dataFile: asString(o.dataFile, existing?.dataFile ?? ""),
  };
}

function normalizeCommand(input: unknown, existing?: Command): Command {
  const o = (input ?? {}) as Record<string, unknown>;
  const importance = VALID_IMPORTANCE.includes(o.importance as Importance)
    ? (o.importance as Importance)
    : (existing?.importance ?? "medium");
  const freq = typeof o.frequency === "number" ? o.frequency : (existing?.frequency ?? 3);
  return {
    id: asString(o.id, existing?.id ?? ""),
    toolId: asString(o.toolId, existing?.toolId ?? ""),
    section: asString(o.section, existing?.section ?? "General"),
    name: asString(o.name, existing?.name ?? "unnamed"),
    description: asString(o.description, existing?.description ?? ""),
    hint: asString(o.hint, existing?.hint ?? ""),
    importance,
    frequency: Math.min(5, Math.max(1, Math.round(freq))),
    tags: ((): string[] => { const t = asStringArray(o.tags); return t.length ? t : (existing?.tags ?? []); })(),
    notes: asString(o.notes, existing?.notes ?? ""),
    favorite: typeof o.favorite === "boolean" ? o.favorite : (existing?.favorite ?? false),
    order: typeof o.order === "number" ? o.order : (existing?.order ?? 0),
    modifiers: "modifiers" in o ? asModifierArray(o.modifiers) : (existing?.modifiers ?? []),
    docUrl: (typeof o.docUrl === "string" && o.docUrl.trim()) ? o.docUrl.trim() : (existing?.docUrl ?? ""),
  };
}

function normalizeResource(input: unknown, existing?: ToolResource): ToolResource {
  const o = (input ?? {}) as Record<string, unknown>;
  const type = VALID_RESOURCE_TYPES.includes(o.type as ToolResourceType)
    ? (o.type as ToolResourceType)
    : (existing?.type ?? "skill");
  const scope = VALID_RESOURCE_SCOPES.includes(o.scope as ToolResourceScope)
    ? (o.scope as ToolResourceScope)
    : (existing?.scope ?? "global");
  const source = type === "skill" && VALID_SKILL_SOURCES.includes(o.source as SkillSource)
    ? (o.source as SkillSource)
    : (type === "skill" ? existing?.source ?? "markdown-file" : undefined);
  return {
    id: asString(o.id, existing?.id ?? ""),
    toolId: asString(o.toolId, existing?.toolId ?? ""),
    type,
    name: asString(o.name, existing?.name ?? "Unnamed"),
    identifier: asString(o.identifier, existing?.identifier ?? ""),
    publisher: asString(o.publisher, existing?.publisher ?? ""),
    active: typeof o.active === "boolean" ? o.active : (existing?.active ?? true),
    utility: asString(o.utility, existing?.utility ?? ""),
    scope,
    projectName: scope === "project"
      ? asString(o.projectName, existing?.projectName ?? "")
      : "",
    installedAt: asString(o.installedAt, existing?.installedAt ?? ""),
    securityAudited:
      typeof o.securityAudited === "boolean"
        ? o.securityAudited
        : (existing?.securityAudited ?? false),
    path: asString(o.path, existing?.path ?? ""),
    source,
  };
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function resolveLocalPath(inputPath: string): string {
  return isAbsolute(inputPath) ? inputPath : resolve(ROOT, inputPath);
}

async function openLocalPath(targetPath: string): Promise<void> {
  await new Promise<void>((resolveOpen, rejectOpen) => {
    const child = process.platform === "win32"
      ? spawn("cmd", ["/c", "start", "", targetPath], {
          detached: true,
          stdio: "ignore",
          windowsHide: true,
        })
      : spawn(process.platform === "darwin" ? "open" : "xdg-open", [targetPath], {
          detached: true,
          stdio: "ignore",
        });
    child.once("error", rejectOpen);
    child.unref();
    resolveOpen();
  });
}

// --- App ----------------------------------------------------------------

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Request logger (minimal, dev only)
app.use((req, _res, next) => {
  if (req.path.startsWith("/api")) {
    console.log(`[api] ${req.method} ${req.path}`);
  }
  next();
});

// --- Routes: data dump --------------------------------------------------

app.get("/api/data", async (_req, res) => {
  try {
    const db = await readDb();
    res.json(db);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to read data" });
  }
});

// --- Routes: tools ------------------------------------------------------

app.post("/api/tools", async (req, res) => {
  try {
    const result = await withWriteLock(async () => {
      const { tools } = await readIndex();
      const base = normalizeTool(req.body);
      if (!base.name.trim()) throw new Error("Name is required");
      const slug = base.slug || base.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const dataFile = `commands/${slug}.json`;
      const tool: Tool = {
        ...base,
        id: base.id || newId("tool"),
        slug,
        dataFile,
        order: tools.length,
      };
      // Create the empty tool data file first
      await writeToolDataFile(dataFile, emptyToolData());
      // Then add tool to index
      tools.push(tool);
      await writeIndex({ tools });
      return tool;
    });
    res.status(201).json(stripInternal(result));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// Bulk reorder tools: [{id, order}, ...]
app.patch("/api/tools/reorder", async (req, res) => {
  try {
    const updates = (req.body?.updates ?? req.body) as Array<{ id: string; order: number }>;
    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: "Body must be an array of {id, order}" });
    }
    await withWriteLock(async () => {
      const { tools } = await readIndex();
      const byId = new Map(tools.map((t) => [t.id, t] as const));
      for (const u of updates) {
        const tool = byId.get(u.id);
        if (tool && typeof u.order === "number") {
          tool.order = u.order;
        }
      }
      tools.sort((a, b) => a.order - b.order);
      await writeIndex({ tools });
    });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.put("/api/tools/:id", async (req, res) => {
  try {
    const result = await withWriteLock(async () => {
      const { tools } = await readIndex();
      const idx = tools.findIndex((t) => t.id === req.params.id);
      if (idx === -1) return null;
      const existing = tools[idx];
      // Merge but preserve existing dataFile — client doesn't send it
      const updated = normalizeTool({ ...req.body, id: existing.id }, existing);
      // If slug changed, rename the commands file first
      if (updated.slug !== existing.slug && existing.dataFile) {
        const newDataFile = `commands/${updated.slug}.json`;
        const oldPath = resolve(ROOT, "data", existing.dataFile);
        const newPath = resolve(ROOT, "data", newDataFile);
        try {
          await rename(oldPath, newPath);
        } catch {
          // Fallback: copyFile + unlink (Windows EPERM on existing dest)
          await copyFile(oldPath, newPath);
          await unlink(oldPath);
        }
        updated.dataFile = newDataFile;
      } else {
        // Keep existing dataFile
        updated.dataFile = existing.dataFile;
      }
      tools[idx] = updated;
      await writeIndex({ tools });
      return updated;
    });
    if (!result) return res.status(404).json({ error: "Tool not found" });
    res.json(stripInternal(result));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.delete("/api/tools/:id", async (req, res) => {
  try {
    const removed = await withWriteLock(async () => {
      const { tools } = await readIndex();
      const idx = tools.findIndex((t) => t.id === req.params.id);
      if (idx === -1) return false;
      const tool = tools[idx];
      // Delete commands file first (cascade). If it fails, continue.
      if (tool.dataFile) {
        const cmdFile = resolve(ROOT, "data", tool.dataFile);
        await unlink(cmdFile).catch(() => undefined);
      }
      tools.splice(idx, 1);
      await writeIndex({ tools });
      return true;
    });
    if (!removed) return res.status(404).json({ error: "Tool not found" });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// --- Routes: commands ---------------------------------------------------

app.post("/api/commands", async (req, res) => {
  try {
    const result = await withWriteLock(async () => {
      const { tools } = await readIndex();
      const base = normalizeCommand(req.body);
      if (!base.name.trim()) throw new Error("Name is required");
      const tool = tools.find((t) => t.id === base.toolId);
      if (!tool) throw new Error("Valid toolId is required");
      if (!tool.dataFile) throw new Error("Tool has no dataFile");
      const toolCommands = await readCommandsFile(tool.dataFile);
      const cmd: Command = {
        ...base,
        id: base.id || newId("cmd"),
        order: toolCommands.length,
      };
      toolCommands.push(cmd);
      await writeCommandsFile(tool.dataFile, toolCommands);
      return cmd;
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.put("/api/commands/:id", async (req, res) => {
  try {
    const result = await withWriteLock(async () => {
      const found = await findCommandInDb(req.params.id);
      if (!found) return null;
      const { command: existing, tool } = found;
      const updated = normalizeCommand({ ...req.body, id: existing.id }, existing);
      const cmds = await readCommandsFile(tool.dataFile!);
      const idx = cmds.findIndex((c) => c.id === req.params.id);
      if (idx === -1) return null;
      cmds[idx] = updated;
      await writeCommandsFile(tool.dataFile!, cmds);
      return updated;
    });
    if (!result) return res.status(404).json({ error: "Command not found" });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.delete("/api/commands/:id", async (req, res) => {
  try {
    const removed = await withWriteLock(async () => {
      const found = await findCommandInDb(req.params.id);
      if (!found) return false;
      const { tool } = found;
      const cmds = await readCommandsFile(tool.dataFile!);
      const idx = cmds.findIndex((c) => c.id === req.params.id);
      if (idx === -1) return false;
      cmds.splice(idx, 1);
      await writeCommandsFile(tool.dataFile!, cmds);
      return true;
    });
    if (!removed) return res.status(404).json({ error: "Command not found" });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Bulk reorder: [{id, order}, ...] — applied within a single write lock
app.patch("/api/commands/reorder", async (req, res) => {
  try {
    const updates = (req.body?.updates ?? req.body) as Array<{ id: string; order: number }>;
    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: "Body must be an array of {id, order}" });
    }
    await withWriteLock(async () => {
      // Read the full db to find which tool each command belongs to
      const { tools } = await readIndex();
      // Build a map: toolId -> { tool, commands }
      const toolCommandsMap = new Map<string, { tool: Tool; cmds: Command[] }>();
      for (const tool of tools) {
        if (tool.dataFile) {
          const cmds = await readCommandsFile(tool.dataFile);
          toolCommandsMap.set(tool.id, { tool, cmds });
        }
      }
      // Build lookup: commandId -> toolId
      const cmdToTool = new Map<string, string>();
      for (const [toolId, { cmds }] of toolCommandsMap) {
        for (const cmd of cmds) {
          cmdToTool.set(cmd.id, toolId);
        }
      }
      // Apply updates
      const affectedToolIds = new Set<string>();
      for (const u of updates) {
        const toolId = cmdToTool.get(u.id);
        if (!toolId) continue;
        const entry = toolCommandsMap.get(toolId);
        if (!entry) continue;
        const cmd = entry.cmds.find((c) => c.id === u.id);
        if (cmd && typeof u.order === "number") {
          cmd.order = u.order;
          affectedToolIds.add(toolId);
        }
      }
      // Write back only affected files
      for (const toolId of affectedToolIds) {
        const entry = toolCommandsMap.get(toolId);
        if (entry?.tool.dataFile) {
          await writeCommandsFile(entry.tool.dataFile, entry.cmds);
        }
      }
    });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// --- Routes: resources --------------------------------------------------

app.post("/api/resources", async (req, res) => {
  try {
    const result = await withWriteLock(async () => {
      const { tools } = await readIndex();
      const base = normalizeResource(req.body);
      if (!base.name.trim()) throw new Error("Name is required");
      if (!base.identifier.trim()) throw new Error("Identifier is required");
      if (!base.path.trim()) throw new Error("Path is required");
      if (base.scope === "project" && !base.projectName.trim()) {
        throw new Error("Project name is required for project-scoped resources");
      }
      const tool = tools.find((t) => t.id === base.toolId);
      if (!tool) throw new Error("Valid toolId is required");
      if (!tool.dataFile) throw new Error("Tool has no dataFile");
      const resources = await readResourcesFile(tool.dataFile);
      const resource: ToolResource = {
        ...base,
        id: base.id || newId("resource"),
      };
      resources.push(resource);
      await writeResourcesFile(tool.dataFile, resources);
      return resource;
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.put("/api/resources/:id", async (req, res) => {
  try {
    const result = await withWriteLock(async () => {
      const found = await findResourceInDb(req.params.id);
      if (!found) return null;
      const { resource: existing, tool } = found;
      const updated = normalizeResource(
        { ...req.body, id: existing.id, toolId: existing.toolId },
        existing,
      );
      if (!updated.name.trim()) throw new Error("Name is required");
      if (!updated.identifier.trim()) throw new Error("Identifier is required");
      if (!updated.path.trim()) throw new Error("Path is required");
      if (updated.scope === "project" && !updated.projectName.trim()) {
        throw new Error("Project name is required for project-scoped resources");
      }
      const resources = await readResourcesFile(tool.dataFile!);
      const idx = resources.findIndex((resource) => resource.id === req.params.id);
      if (idx === -1) return null;
      resources[idx] = updated;
      await writeResourcesFile(tool.dataFile!, resources);
      return updated;
    });
    if (!result) return res.status(404).json({ error: "Resource not found" });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.delete("/api/resources/:id", async (req, res) => {
  try {
    const removed = await withWriteLock(async () => {
      const found = await findResourceInDb(req.params.id);
      if (!found) return false;
      const { tool } = found;
      const resources = await readResourcesFile(tool.dataFile!);
      const idx = resources.findIndex((resource) => resource.id === req.params.id);
      if (idx === -1) return false;
      resources.splice(idx, 1);
      await writeResourcesFile(tool.dataFile!, resources);
      return true;
    });
    if (!removed) return res.status(404).json({ error: "Resource not found" });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// --- Routes: local path opening ----------------------------------------

app.post("/api/open-path", async (req, res) => {
  try {
    const pathInput = asString(req.body?.path).trim();
    if (!pathInput) {
      return res.status(400).json({ error: "Path is required" });
    }
    const resolvedPath = resolveLocalPath(pathInput);
    await access(resolvedPath);
    await openLocalPath(resolvedPath);
    res.status(204).end();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to open path";
    res.status(400).json({ error: message });
  }
});

// --- Serve static build (production) -----------------------------------

const DIST = resolve(ROOT, "dist");
if (existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(resolve(DIST, "index.html"));
  });
}

// --- Boot ---------------------------------------------------------------

app.listen(PORT, async () => {
  await ensureDataDirs();
  console.log(`[server] commands-viewer API running on http://localhost:${PORT}`);
  console.log(`[server] index file: ${INDEX_FILE}`);
  console.log(`[server] commands dir: ${COMMANDS_DIR}`);
});
