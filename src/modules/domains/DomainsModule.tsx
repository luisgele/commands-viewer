import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useDomainsStore } from "./store/useDomainsStore";
import { DomainFilterBar } from "./components/DomainFilterBar";
import { DomainTable } from "./components/DomainTable";
import { DomainModal, type DomainFormValues } from "./components/DomainModal";

export function DomainsModule() {
  const load = useDomainsStore((s) => s.load);
  const loading = useDomainsStore((s) => s.loading);
  const domains = useDomainsStore((s) => s.domains);
  const addDomain = useDomainsStore((s) => s.addDomain);

  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (values: DomainFormValues) => {
    await addDomain(values);
    setShowModal(false);
  };

  return (
    <div className="flex flex-col">
      <DomainFilterBar />
      <div className="mx-auto w-full max-w-[1400px] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-mono text-lg font-bold text-[color:var(--color-text-bright)]">
              Dominios
            </h2>
            <p className="font-mono text-xs text-[color:var(--color-text-muted)]">
              {domains.length} dominio(s) registrado(s)
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-lg border border-[color:var(--color-accent-cyan)]/40 bg-[color:var(--color-accent-cyan)]/10 px-4 py-2 font-mono text-xs text-[color:var(--color-accent-cyan)] transition hover:bg-[color:var(--color-accent-cyan)]/20"
          >
            <Plus size={14} />
            Añadir dominio
          </button>
        </div>
      </div>

      {loading && domains.length === 0 ? (
        <div className="mx-auto max-w-[1400px] px-6 py-16 text-center font-mono text-sm text-[color:var(--color-text-muted)]">
          Cargando dominios...
        </div>
      ) : (
        <DomainTable />
      )}

      {showModal && (
        <DomainModal
          domain={null}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
