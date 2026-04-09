import express from "express";
import cors from "cors";
import { readFile, writeFile, mkdir, rename, copyFile, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT = resolve(__dirname, "..");
const DATA_FILE = resolve(ROOT, "data", "commands.json");
const PORT = Number(process.env.PORT) || 3001;

type Importance = "critical" | "high" | "medium" | "low";

interface Tool {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  order: number;
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
}

interface Database {
  tools: Tool[];
  commands: Command[];
}

// --- Persistence helpers ------------------------------------------------

async function ensureDataFile(): Promise<void> {
  if (!existsSync(DATA_FILE)) {
    await mkdir(dirname(DATA_FILE), { recursive: true });
    const empty: Database = { tools: [], commands: [] };
    await writeFile(DATA_FILE, JSON.stringify(empty, null, 2), "utf8");
  }
}

async function readDb(): Promise<Database> {
  await ensureDataFile();
  const raw = await readFile(DATA_FILE, "utf8");
  const parsed = JSON.parse(raw) as Database;
  parsed.tools ??= [];
  parsed.commands ??= [];
  return parsed;
}

// Atomic write: temp file + rename to avoid corruption mid-save.
// On Windows, rename to an existing file throws EPERM, so fall back to copyFile + unlink.
async function writeDb(db: Database): Promise<void> {
  const tmp = `${DATA_FILE}.tmp`;
  await writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  try {
    await rename(tmp, DATA_FILE);
  } catch {
    await copyFile(tmp, DATA_FILE);
    await unlink(tmp).catch(() => undefined);
  }
}

// Serialize writes so concurrent requests don't clobber each other.
// fn is only passed as the fulfillment handler so failures don't bypass the queue.
let writeQueue: Promise<unknown> = Promise.resolve();
function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(() => fn());
  writeQueue = next.catch(() => undefined);
  return next;
}

// --- Validation ---------------------------------------------------------

const VALID_IMPORTANCE: Importance[] = ["critical", "high", "medium", "low"];

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
  };
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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
      const db = await readDb();
      const base = normalizeTool(req.body);
      if (!base.name.trim()) throw new Error("Name is required");
      const tool: Tool = {
        ...base,
        id: base.id || newId("tool"),
        slug: base.slug || base.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        order: db.tools.length,
      };
      db.tools.push(tool);
      await writeDb(db);
      return tool;
    });
    res.status(201).json(result);
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
      const db = await readDb();
      const byId = new Map(db.tools.map((t) => [t.id, t] as const));
      for (const u of updates) {
        const tool = byId.get(u.id);
        if (tool && typeof u.order === "number") {
          tool.order = u.order;
        }
      }
      db.tools.sort((a, b) => a.order - b.order);
      await writeDb(db);
    });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.put("/api/tools/:id", async (req, res) => {
  try {
    const result = await withWriteLock(async () => {
      const db = await readDb();
      const idx = db.tools.findIndex((t) => t.id === req.params.id);
      if (idx === -1) return null;
      const updated = normalizeTool({ ...req.body, id: db.tools[idx].id }, db.tools[idx]);
      db.tools[idx] = updated;
      await writeDb(db);
      return updated;
    });
    if (!result) return res.status(404).json({ error: "Tool not found" });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.delete("/api/tools/:id", async (req, res) => {
  try {
    const removed = await withWriteLock(async () => {
      const db = await readDb();
      const idx = db.tools.findIndex((t) => t.id === req.params.id);
      if (idx === -1) return false;
      db.tools.splice(idx, 1);
      // cascade delete commands belonging to this tool
      db.commands = db.commands.filter((c) => c.toolId !== req.params.id);
      await writeDb(db);
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
      const db = await readDb();
      const base = normalizeCommand(req.body);
      if (!base.name.trim()) throw new Error("Name is required");
      if (!base.toolId || !db.tools.some((t) => t.id === base.toolId)) {
        throw new Error("Valid toolId is required");
      }
      const toolCommands = db.commands.filter((c) => c.toolId === base.toolId);
      const cmd: Command = {
        ...base,
        id: base.id || newId("cmd"),
        order: toolCommands.length,
      };
      db.commands.push(cmd);
      await writeDb(db);
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
      const db = await readDb();
      const idx = db.commands.findIndex((c) => c.id === req.params.id);
      if (idx === -1) return null;
      const updated = normalizeCommand(
        { ...req.body, id: db.commands[idx].id },
        db.commands[idx],
      );
      db.commands[idx] = updated;
      await writeDb(db);
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
      const db = await readDb();
      const idx = db.commands.findIndex((c) => c.id === req.params.id);
      if (idx === -1) return false;
      db.commands.splice(idx, 1);
      await writeDb(db);
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
      const db = await readDb();
      const byId = new Map(db.commands.map((c) => [c.id, c] as const));
      for (const u of updates) {
        const cmd = byId.get(u.id);
        if (cmd && typeof u.order === "number") {
          cmd.order = u.order;
        }
      }
      await writeDb(db);
    });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
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

app.listen(PORT, () => {
  console.log(`[server] commands-viewer API running on http://localhost:${PORT}`);
  console.log(`[server] data file: ${DATA_FILE}`);
});
