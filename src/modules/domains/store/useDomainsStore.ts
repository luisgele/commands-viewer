import { create } from "zustand";
import type { Domain, DomainEmail, DomainStatus } from "../../../types";
import { api } from "../../../lib/api";

interface DomainFilters {
  search: string;
  status: Set<DomainStatus>;
  expiresInDays: number | null;
}

interface DomainsState {
  domains: Domain[];
  emails: DomainEmail[];
  loading: boolean;
  error: string | null;
  filters: DomainFilters;
  selectedDomainId: string | null;

  load: () => Promise<void>;
  addDomain: (domain: Partial<Domain>) => Promise<Domain>;
  updateDomain: (id: string, patch: Partial<Domain>) => Promise<void>;
  deleteDomain: (id: string) => Promise<void>;
  addEmail: (email: Partial<DomainEmail>) => Promise<DomainEmail>;
  updateEmail: (id: string, patch: Partial<DomainEmail>) => Promise<void>;
  deleteEmail: (id: string) => Promise<void>;

  setFilter: <K extends keyof DomainFilters>(key: K, value: DomainFilters[K]) => void;
  toggleStatusFilter: (status: DomainStatus) => void;
  resetFilters: () => void;
  activeFilterCount: () => number;
  setSelectedDomain: (id: string | null) => void;
  getEmailsByDomain: (domainId: string) => DomainEmail[];
}

const initialFilters: DomainFilters = {
  search: "",
  status: new Set<DomainStatus>(),
  expiresInDays: null,
};

export const useDomainsStore = create<DomainsState>()((set, get) => ({
  domains: [],
  emails: [],
  loading: false,
  error: null,
  filters: initialFilters,
  selectedDomainId: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [domains, emails] = await Promise.all([
        api.getDomains(),
        api.getEmails(),
      ]);
      set({ domains, emails, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  addDomain: async (domain) => {
    const created = await api.createDomain(domain);
    set({ domains: [...get().domains, created] });
    return created;
  },

  updateDomain: async (id, patch) => {
    const updated = await api.updateDomain(id, patch);
    set({
      domains: get().domains.map((d) => (d.id === id ? updated : d)),
    });
  },

  deleteDomain: async (id) => {
    await api.deleteDomain(id);
    set({
      domains: get().domains.filter((d) => d.id !== id),
      emails: get().emails.filter((e) => e.domainId !== id),
      selectedDomainId: get().selectedDomainId === id ? null : get().selectedDomainId,
    });
  },

  addEmail: async (email) => {
    const created = await api.createEmail(email);
    set({ emails: [...get().emails, created] });
    return created;
  },

  updateEmail: async (id, patch) => {
    const updated = await api.updateEmail(id, patch);
    set({
      emails: get().emails.map((e) => (e.id === id ? updated : e)),
    });
  },

  deleteEmail: async (id) => {
    await api.deleteEmail(id);
    set({ emails: get().emails.filter((e) => e.id !== id) });
  },

  setFilter: (key, value) =>
    set({ filters: { ...get().filters, [key]: value } }),

  toggleStatusFilter: (status) => {
    const current = new Set(get().filters.status);
    if (current.has(status)) current.delete(status);
    else current.add(status);
    set({ filters: { ...get().filters, status: current } });
  },

  resetFilters: () =>
    set({
      filters: { ...initialFilters, status: new Set<DomainStatus>() },
    }),

  activeFilterCount: () => {
    const f = get().filters;
    let n = 0;
    if (f.search.trim()) n++;
    if (f.status.size > 0) n++;
    if (f.expiresInDays !== null) n++;
    return n;
  },

  setSelectedDomain: (id) => set({ selectedDomainId: id }),

  getEmailsByDomain: (domainId) =>
    get().emails.filter((e) => e.domainId === domainId),
}));
