import type { Command, Database, Domain, DomainEmail, Tool, ToolResource } from "../types";

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${body ? ` — ${body}` : ""}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  getAll: () => request<Database>("/data"),

  createTool: (tool: Partial<Tool>) =>
    request<Tool>("/tools", { method: "POST", body: JSON.stringify(tool) }),
  updateTool: (id: string, tool: Partial<Tool>) =>
    request<Tool>(`/tools/${id}`, { method: "PUT", body: JSON.stringify(tool) }),
  deleteTool: (id: string) =>
    request<void>(`/tools/${id}`, { method: "DELETE" }),
  reorderTools: (updates: Array<{ id: string; order: number }>) =>
    request<void>("/tools/reorder", {
      method: "PATCH",
      body: JSON.stringify({ updates }),
    }),

  createCommand: (command: Partial<Command>) =>
    request<Command>("/commands", { method: "POST", body: JSON.stringify(command) }),
  updateCommand: (id: string, command: Partial<Command>) =>
    request<Command>(`/commands/${id}`, { method: "PUT", body: JSON.stringify(command) }),
  deleteCommand: (id: string) =>
    request<void>(`/commands/${id}`, { method: "DELETE" }),
  createResource: (resource: Partial<ToolResource>) =>
    request<ToolResource>("/resources", { method: "POST", body: JSON.stringify(resource) }),
  updateResource: (id: string, resource: Partial<ToolResource>) =>
    request<ToolResource>(`/resources/${id}`, {
      method: "PUT",
      body: JSON.stringify(resource),
    }),
  deleteResource: (id: string) =>
    request<void>(`/resources/${id}`, { method: "DELETE" }),
  openLocalPath: (path: string) =>
    request<void>("/open-path", {
      method: "POST",
      body: JSON.stringify({ path }),
    }),

  reorderCommands: (updates: Array<{ id: string; order: number }>) =>
    request<void>("/commands/reorder", {
      method: "PATCH",
      body: JSON.stringify({ updates }),
    }),

  // Domains
  getDomains: () => request<Domain[]>("/domains"),
  createDomain: (domain: Partial<Domain>) =>
    request<Domain>("/domains", { method: "POST", body: JSON.stringify(domain) }),
  updateDomain: (id: string, domain: Partial<Domain>) =>
    request<Domain>(`/domains/${id}`, { method: "PUT", body: JSON.stringify(domain) }),
  deleteDomain: (id: string) =>
    request<void>(`/domains/${id}`, { method: "DELETE" }),
  reorderDomains: (updates: Array<{ id: string; order: number }>) =>
    request<void>("/domains/reorder", {
      method: "PATCH",
      body: JSON.stringify({ updates }),
    }),

  // Emails
  getEmails: (domainId?: string) =>
    request<DomainEmail[]>(`/emails${domainId ? `?domainId=${domainId}` : ""}`),
  createEmail: (email: Partial<DomainEmail>) =>
    request<DomainEmail>("/emails", { method: "POST", body: JSON.stringify(email) }),
  updateEmail: (id: string, email: Partial<DomainEmail>) =>
    request<DomainEmail>(`/emails/${id}`, { method: "PUT", body: JSON.stringify(email) }),
  deleteEmail: (id: string) =>
    request<void>(`/emails/${id}`, { method: "DELETE" }),
  reorderEmails: (updates: Array<{ id: string; order: number }>) =>
    request<void>("/emails/reorder", {
      method: "PATCH",
      body: JSON.stringify({ updates }),
    }),
};
