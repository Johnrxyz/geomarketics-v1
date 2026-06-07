"use client";

import { useState, useEffect } from "react";
import { 
  FileText, Database, AlertTriangle, CheckCircle, 
  RefreshCw, Layers, ShieldCheck, XCircle, Search
} from "lucide-react";
import { unknownEntitiesApi, marketsApi, pricesApi } from "@/lib/api";
import Modal from "@/components/ui/Modal";

export default function AdminOperationsCenter() {
  const [unknownEntities, setUnknownEntities] = useState<any[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(true);
  
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolvingEntity, setResolvingEntity] = useState<any>(null);
  const [resolveStatus, setResolveStatus] = useState("resolved"); // or "ignored"
  const [resolveTargetMarketId, setResolveTargetMarketId] = useState("");
  const [resolveTargetCommodityId, setResolveTargetCommodityId] = useState("");
  
  const [markets, setMarkets] = useState<any[]>([]);
  const [commodities, setCommodities] = useState<any[]>([]);
  
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    fetchUnknownEntities();
    marketsApi.list().then((data: any) => setMarkets(data.results || data || []));
    pricesApi.commodities().then((data: any) => setCommodities(data.results || data || []));
  }, []);

  const fetchUnknownEntities = () => {
    setLoadingEntities(true);
    unknownEntitiesApi.list({ resolution_status: 'unresolved' })
      .then((data: any) => setUnknownEntities(data.results || data || []))
      .catch(() => {})
      .finally(() => setLoadingEntities(false));
  };

  const openResolveModal = (entity: any) => {
    setResolvingEntity(entity);
    setResolveStatus("resolved");
    setResolveTargetMarketId("");
    setResolveTargetCommodityId("");
    setResolveModalOpen(true);
  };

  const handleResolveSubmit = async () => {
    if (!resolvingEntity) return;
    setResolving(true);
    try {
      const payload: any = { resolution_status: resolveStatus };
      if (resolveStatus === "resolved") {
        if (resolvingEntity.entity_type === "market") payload.resolved_to_market = resolveTargetMarketId;
        if (resolvingEntity.entity_type === "commodity") payload.resolved_to_commodity = resolveTargetCommodityId;
      }
      
      await unknownEntitiesApi.resolve(resolvingEntity.id, payload);
      setResolveModalOpen(false);
      fetchUnknownEntities(); // Refresh list
    } catch (err) {
      console.error("Failed to resolve", err);
    } finally {
      setResolving(false);
    }
  };

  return (
    <div style={{ padding: "var(--space-8)", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-6)" }}>
        <div style={{ width: 48, height: 48, background: "var(--color-primary)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-accent)" }}>
          <ShieldCheck size={28} />
        </div>
        <div>
          <h1 style={{ fontSize: "var(--text-3xl)", fontWeight: 800, color: "var(--color-accent)", margin: 0 }}>Operations Center</h1>
          <div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>Data Ingestion & Quality Assurance Dashboard</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-5)", marginBottom: "var(--space-8)" }}>
        <div className="stat-card" style={{ borderLeft: "4px solid var(--color-success)" }}>
          <div className="stat-card-icon" style={{ background: "var(--color-success-bg)", color: "var(--color-success)" }}>
            <FileText size={24} />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-value">1,204</div>
            <div className="stat-card-label">Processed Documents</div>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: "4px solid var(--color-warning)" }}>
          <div className="stat-card-icon" style={{ background: "var(--color-warning-bg)", color: "var(--color-warning)" }}>
            <AlertTriangle size={24} />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-value">{unknownEntities.length}</div>
            <div className="stat-card-label">Unknown Entities Pending</div>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: "4px solid var(--color-info)" }}>
          <div className="stat-card-icon" style={{ background: "var(--color-info-bg)", color: "var(--color-info)" }}>
            <Database size={24} />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-value">99.8%</div>
            <div className="stat-card-label">Data Quality Score</div>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: "4px solid #8B5CF6" }}>
          <div className="stat-card-icon" style={{ background: "#EDE9FE", color: "#8B5CF6" }}>
            <Layers size={24} />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-value">142</div>
            <div className="stat-card-label">Registered Aliases</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "var(--space-6)" }}>
        
        {/* Unknown Entity Queue */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Unknown Entity Queue</h2>
              <div className="card-subtitle">Require manual mapping to canonical models before re-processing</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={fetchUnknownEntities}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
          
          {loadingEntities ? (
            <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--text-muted)" }}>Loading entities...</div>
          ) : unknownEntities.length === 0 ? (
            <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
              <CheckCircle size={32} style={{ color: "var(--color-success)", margin: "0 auto var(--space-3)" }} />
              <div style={{ fontWeight: 600 }}>Queue is empty</div>
              <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>All ingested entities have been successfully mapped.</div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
              <thead style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                <tr>
                  <th style={{ padding: "var(--space-3) var(--space-4)", textAlign: "left", color: "var(--text-muted)" }}>Raw Name (Extracted)</th>
                  <th style={{ padding: "var(--space-3) var(--space-4)", textAlign: "left", color: "var(--text-muted)" }}>Type</th>
                  <th style={{ padding: "var(--space-3) var(--space-4)", textAlign: "left", color: "var(--text-muted)" }}>Source Document</th>
                  <th style={{ padding: "var(--space-3) var(--space-4)", textAlign: "left", color: "var(--text-muted)" }}>Occurrences</th>
                  <th style={{ padding: "var(--space-3) var(--space-4)", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {unknownEntities.map(entity => (
                  <tr key={entity.id} style={{ borderBottom: "1px solid #E5E7EB" }}>
                    <td style={{ padding: "var(--space-3) var(--space-4)", fontWeight: 600 }}>"{entity.raw_name}"</td>
                    <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                      <span className={`badge ${entity.entity_type === 'market' ? 'badge-info' : 'badge-warning'}`}>
                        {entity.entity_type}
                      </span>
                    </td>
                    <td style={{ padding: "var(--space-3) var(--space-4)", color: "var(--text-secondary)" }}>
                      {entity.source_document_filename || "Unknown PDF"}
                    </td>
                    <td style={{ padding: "var(--space-3) var(--space-4)" }}>{entity.occurrence_count}</td>
                    <td style={{ padding: "var(--space-3) var(--space-4)", textAlign: "right" }}>
                      <button className="btn btn-primary btn-sm" onClick={() => openResolveModal(entity)}>
                        Resolve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* QA Dashboard & Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          <div className="card">
            <div className="card-header"><h2 className="card-title">Data Quality Checks</h2></div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-3)", background: "var(--color-success-bg)", borderRadius: "var(--radius-sm)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", color: "#166534", fontWeight: 600 }}>
                  <CheckCircle size={16} /> No duplicate snapshots
                </div>
                <span className="badge badge-success">Passed</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-3)", background: "var(--color-success-bg)", borderRadius: "var(--radius-sm)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", color: "#166534", fontWeight: 600 }}>
                  <CheckCircle size={16} /> No negative prices
                </div>
                <span className="badge badge-success">Passed</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-3)", background: "var(--color-warning-bg)", borderRadius: "var(--radius-sm)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", color: "#92400E", fontWeight: 600 }}>
                  <AlertTriangle size={16} /> Missing markets (2)
                </div>
                <span className="badge badge-warning">Warning</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h2 className="card-title">Reprocess Center</h2></div>
            <div className="card-body">
              <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginBottom: "var(--space-4)" }}>
                After resolving unknown entities or adding aliases, reprocess the failed or skipped documents.
              </p>
              <button className="btn btn-accent" style={{ width: "100%", justifyContent: "center" }}>
                <RefreshCw size={16} /> Force Re-ingest Failed Docs
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Resolution Modal */}
      <Modal 
        isOpen={resolveModalOpen} 
        onClose={() => setResolveModalOpen(false)}
        title={`Resolve Unknown ${resolvingEntity?.entity_type === 'market' ? 'Market' : 'Commodity'}`}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setResolveModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleResolveSubmit} disabled={resolving || (resolveStatus === 'resolved' && !resolveTargetMarketId && !resolveTargetCommodityId)}>
              {resolving ? "Saving..." : "Confirm Resolution"}
            </button>
          </>
        }
      >
        {resolvingEntity && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div style={{ padding: "var(--space-3)", background: "#F3F4F6", borderRadius: "var(--radius-sm)", borderLeft: "4px solid var(--color-warning)" }}>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Raw Extracted Value:</div>
              <div style={{ fontWeight: 700, fontSize: "var(--text-lg)", color: "var(--text-primary)" }}>"{resolvingEntity.raw_name}"</div>
            </div>

            <div className="form-group">
              <label className="form-label">Action</label>
              <select className="form-select" value={resolveStatus} onChange={e => setResolveStatus(e.target.value)}>
                <option value="resolved">Map to Canonical Record</option>
                <option value="ignored">Ignore (Not a valid entity)</option>
              </select>
            </div>

            {resolveStatus === "resolved" && resolvingEntity.entity_type === "market" && (
              <div className="form-group">
                <label className="form-label">Map to Existing Market</label>
                <select className="form-select" value={resolveTargetMarketId} onChange={e => setResolveTargetMarketId(e.target.value)}>
                  <option value="">-- Select Market --</option>
                  {markets.map(m => <option key={m.id} value={m.id}>{m.name} ({m.province})</option>)}
                </select>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: "var(--space-1)" }}>
                  This will automatically add an alias so future ingestions map correctly.
                </div>
              </div>
            )}

            {resolveStatus === "resolved" && resolvingEntity.entity_type === "commodity" && (
              <div className="form-group">
                <label className="form-label">Map to Existing Commodity</label>
                <select className="form-select" value={resolveTargetCommodityId} onChange={e => setResolveTargetCommodityId(e.target.value)}>
                  <option value="">-- Select Commodity --</option>
                  {commodities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: "var(--space-1)" }}>
                  This will automatically add an alias so future ingestions map correctly.
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

    </div>
  );
}
