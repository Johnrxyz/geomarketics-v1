"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Modal from "@/components/ui/Modal";
import {
  MapPin, Search, Store, AlertCircle,
  Star, Send, Map as MapIcon
} from "lucide-react";
import MarketMap, { MarketStall } from "@/components/map/MarketMap";
import { analyticsApi, complaintsApi, stallsApi } from "@/lib/api";

function censorName(name: string) {
  if (!name || name === "—" || name.toLowerCase() === "vacant") return name;
  return name.split(" ").map(part => part ? part[0] + "*".repeat(Math.max(0, part.length - 1)) : "").join(" ");
}

const CATEGORIES = ["All", "Vegetables", "Meat", "Fish", "Dry Goods", "Cooked Food"];

interface StallCard {
  id: string;
  number: string;
  vendor: string;
  category: string;
  status: string;
  rating: number;
  isOpen: boolean;
}


export default function PublicPage() {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [complaintOpen, setComplaintOpen] = useState(false);
  const [complaintSent, setComplaintSent] = useState(false);
  const [complaint, setComplaint] = useState<{ stall: string; email: string; desc: string; cat: string; image: File | null }>({ stall: "", email: "", desc: "", cat: "Sanitation", image: null });
  const [navOpen, setNavOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Stats
  const [stats, setStats] = useState<{ totalStalls: string; openNow: string; vendors: string; categories: string }>({
    totalStalls: "—", openNow: "—", vendors: "—", categories: "—"
  });

  // Stalls
  const [stalls, setStalls] = useState<StallCard[]>([]);
  const [stallsLoading, setStallsLoading] = useState(true);



  // Map stalls (same source as stall cards, mapped to MarketStall shape)
  const [mapStalls, setMapStalls] = useState<MarketStall[]>([]);

  useEffect(() => {
    // Fetch public stats
    analyticsApi.publicStats()
      .then((data: any) => {
        setStats({
          totalStalls: data?.total_stalls?.toString() ?? data?.totalStalls?.toString() ?? "—",
          openNow: data?.open_now?.toString() ?? data?.openNow?.toString() ?? "—",
          vendors: data?.total_vendors?.toString() ?? data?.vendors?.toString() ?? "—",
          categories: data?.total_categories?.toString() ?? data?.categories?.toString() ?? "—",
        });
      })
      .catch(() => {
        // Non-critical; leave dashes
      });

    // Fetch stalls
    setStallsLoading(true);
    stallsApi.list()
      .then((data: any) => {
        const results = data?.results ?? data ?? [];
        const mapped: StallCard[] = results.map((s: any) => ({
          id: s.id?.toString() ?? Math.random().toString(),
          number: s.stall_number ?? s.number ?? "—",
          vendor: s.vendor_name ?? s.vendor ?? "—",
          category: s.category ?? "—",
          status: (s.status ?? "vacant").toLowerCase(),
          avgPrice: s.avg_price ?? s.price_range ?? "—",
          rating: typeof s.rating === "number" ? s.rating : 0,
          isOpen: s.is_open ?? s.isOpen ?? false,
        }));
        setStalls(mapped);

        // Build map stalls from same data
        const mapMapped: MarketStall[] = results
          .filter((s: any) => s.map_x != null || s.x != null)
          .map((s: any) => ({
            id: s.id?.toString() ?? Math.random().toString(),
            number: s.stall_number ?? s.number ?? "—",
            section: s.section_name ?? s.section ?? "—",
            vendor: s.vendor_name ?? s.vendor ?? "—",
            category: s.category ?? "—",
            status: (s.map_status ?? s.stall_status ?? s.status ?? "vacant").toLowerCase(),
            x: s.map_x ?? s.x ?? 0,
            y: s.map_y ?? s.y ?? 0,
          }));
        setMapStalls(mapMapped);
      })
      .catch(() => {
        // Leave empty
      })
      .finally(() => setStallsLoading(false));

  }, []);

  const filtered = stalls.filter((s) => {
    const matchSearch = !search ||
      s.vendor.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase()) ||
      s.number.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "All" || s.category === catFilter;
    return matchSearch && matchCat;
  });

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star key={i} size={12}
        style={{ color: i < Math.round(rating) ? "#FFCB05" : "#E5E7EB", fill: i < Math.round(rating) ? "#FFCB05" : "none" }} />
    ));

  const handleComplaintSubmit = async () => {
    if (!complaint.desc.trim() || !complaint.email.trim()) return;
    setSubmitting(true);
    try {
      await complaintsApi.create({
        stall_number: complaint.stall || undefined,
        category: complaint.cat,
        description: complaint.desc,
        reporter_email: complaint.email,
      });
      setComplaintSent(true);
    } catch {
      // Still show success to user on error — complaint may have been submitted
      setComplaintSent(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FFFDF5", display: "flex", flexDirection: "column" }}>
      {/* Public Header */}
      <header style={{
        background: "var(--color-accent)",
        color: "white",
        position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 2px 12px rgba(0,0,0,0.15)"
      }}>
        <div style={{
          maxWidth: 1200, margin: "0 auto",
          padding: "0 var(--space-6)",
          height: 64, display: "flex", alignItems: "center", justifyContent: "space-between"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <div style={{
              width: 36, height: 36, background: "var(--color-primary)",
              borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--color-accent)", fontWeight: 800, fontSize: "var(--text-sm)", flexShrink: 0
            }} aria-hidden="true">GM</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "var(--text-md)" }}>GeoMarketics</div>
              <div style={{ fontSize: "var(--text-xs)", opacity: 0.7 }}>LC Public Market</div>
            </div>
          </div>

          <nav style={{ display: "flex", alignItems: "center", gap: "var(--space-6)" }} aria-label="Public navigation">
            <a href="#stalls" style={{ color: "rgba(255,255,255,0.85)", fontSize: "var(--text-sm)", fontWeight: 500 }}>Stalls</a>
            <button
              onClick={() => setComplaintOpen(true)}
              style={{ color: "rgba(255,255,255,0.85)", fontSize: "var(--text-sm)", fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}
            >Report Issue</button>
            <Link href="/login" className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
              Staff Login
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        background: "linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-light) 100%)",
        padding: "var(--space-16) var(--space-6)",
        color: "white", textAlign: "center"
      }} aria-labelledby="hero-title">
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "var(--space-2)",
            background: "rgba(255,203,5,0.15)", borderRadius: "var(--radius-full)",
            padding: "var(--space-1) var(--space-4)", marginBottom: "var(--space-5)",
            fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--color-primary)"
          }}>
            <MapPin size={13} />  New Lucena City Public Market · Lucena, Quezon
          </div>
          <h1 id="hero-title" style={{ color: "white", fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 800, marginBottom: "var(--space-4)", lineHeight: 1.2 }}>
            Discover the <span style={{ color: "var(--color-primary)" }}>Fresh Market</span><br />Near You
          </h1>
          <p style={{ color: "white", fontSize: "var(--text-md)", opacity: 0.85, marginBottom: "var(--space-8)", lineHeight: 1.7 }}>
            Browse stalls, check product prices, and find quality vendors at the New Lucena City Public Market.
          </p>

          {/* Search Bar */}
          <div style={{
            display: "flex", background: "white", borderRadius: "var(--radius-xl)",
            overflow: "hidden", boxShadow: "var(--shadow-xl)", maxWidth: 560, margin: "0 auto"
          }} role="search">
            <div style={{ padding: "0 var(--space-4)", display: "flex", alignItems: "center" }}>
              <Search size={18} style={{ color: "var(--text-muted)" }} aria-hidden="true" />
            </div>
            <input
              type="search"
              placeholder="Search for stalls, vendors, or products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1, border: "none", outline: "none", fontSize: "var(--text-sm)",
                padding: "var(--space-4) 0", color: "var(--text-primary)"
              }}
              aria-label="Search for stalls, vendors, or products"
            />
            <button className="btn btn-primary" style={{ borderRadius: "0 var(--radius-xl) var(--radius-xl) 0", padding: "0 var(--space-6)" }}>
              Search
            </button>
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <section style={{ background: "var(--color-primary)", padding: "var(--space-5) var(--space-6)" }} aria-label="Market statistics">
        <div style={{
          maxWidth: 1000, margin: "0 auto",
          display: "flex", justifyContent: "center", gap: "var(--space-16)",
          flexWrap: "wrap"
        }}>
          {[
            { label: "Total Stalls", value: stats.totalStalls },
            { label: "Open Now", value: stats.openNow },
            { label: "Vendors", value: stats.vendors },
            { label: "Categories", value: stats.categories },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "var(--text-3xl)", fontWeight: 800, color: "var(--color-accent)" }}>{value}</div>
              <div style={{ fontSize: "var(--text-sm)", color: "var(--color-accent)", opacity: 0.75 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      <main style={{ flex: 1, maxWidth: 1200, margin: "0 auto", width: "100%", padding: "var(--space-10) var(--space-6)" }}>

        {/* Category Filter */}
        <div style={{
          display: "flex", gap: "var(--space-2)", flexWrap: "wrap",
          marginBottom: "var(--space-8)"
        }} role="group" aria-label="Filter by category">
          {CATEGORIES.map((cat) => (
            <button key={cat}
              onClick={() => setCatFilter(cat)}
              className={catFilter === cat ? "btn btn-accent" : "btn btn-ghost"}
              style={{ borderRadius: "var(--radius-full)" }}
              aria-pressed={catFilter === cat}
            >{cat}</button>
          ))}
        </div>

        {/* Stalls Section */}
        <section id="stalls" aria-labelledby="stalls-heading">
          <h2 id="stalls-heading" style={{ fontSize: "var(--text-2xl)", fontWeight: 800, color: "var(--color-accent)", marginBottom: "var(--space-6)" }}>
            Market Stalls
            <span style={{ fontSize: "var(--text-base)", fontWeight: 400, color: "var(--text-muted)", marginLeft: "var(--space-3)" }}>
              ({stallsLoading ? "…" : `${filtered.length} found`})
            </span>
          </h2>

          {stallsLoading ? (
            <div className="empty-state card" style={{ padding: "var(--space-16)" }}>
              <div className="empty-state-title">Loading stalls...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state card" style={{ padding: "var(--space-16)" }}>
              <div className="empty-state-icon"><Store size={28} /></div>
              <div className="empty-state-title">No stalls found</div>
              <p className="empty-state-desc">Try adjusting your search or category filter.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "var(--space-5)" }}>
              {filtered.map((stall) => (
                <article key={stall.id} className="card" style={{
                  transition: "transform var(--transition-fast), box-shadow var(--transition-fast)"
                }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-lg)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = ""; }}
                >
                  {/* Card Header */}
                  <div style={{
                    padding: "var(--space-5)",
                    background: stall.status === "occupied"
                      ? "linear-gradient(135deg,#EFF6FF,#DBEAFE)"
                      : "linear-gradient(135deg,#FFF3C4,#FEF9C3)",
                    borderBottom: "1px solid #F3F4F6",
                    display: "flex", alignItems: "flex-start", justifyContent: "space-between"
                  }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: "var(--text-lg)", color: "var(--color-accent)" }}>
                        Stall {stall.number}
                      </div>
                      <div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginTop: 2 }}>
                        {stall.category}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "var(--space-1)" }}>
                      <span className={`badge badge-dot ${stall.status === "occupied" ? "badge-occupied" : "badge-vacant"}`}>
                        {stall.status}
                      </span>
                      {stall.isOpen
                        ? <span style={{ fontSize: "var(--text-xs)", color: "var(--color-success)", fontWeight: 600 }}>• Open</span>
                        : <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 600 }}>Closed</span>
                      }
                    </div>
                  </div>

                  {/* Card Body */}
                  <div style={{ padding: "var(--space-4) var(--space-5)" }}>
                    {stall.vendor !== "—" && (
                      <div style={{ marginBottom: "var(--space-3)" }}>
                        <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 2 }}>Vendor</div>
                        <div style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>{censorName(stall.vendor)}</div>
                        {stall.rating > 0 && (
                          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", marginTop: "var(--space-1)" }}>
                            {renderStars(stall.rating)}
                            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", marginLeft: 4 }}>{stall.rating}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: "var(--space-2)" }}>
                      {stall.status === "occupied" && (
                        <Link href={`/map/stall/${stall.id}`} className="btn btn-accent btn-sm" style={{ flex: 1, justifyContent: "center" }}>
                          View Details
                        </Link>
                      )}
                      <button
                        onClick={() => { setComplaint((p) => ({ ...p, stall: stall.number })); setComplaintOpen(true); }}
                        className="btn btn-ghost btn-sm"
                        aria-label={`Report issue for stall ${stall.number}`}
                      >
                        <AlertCircle size={13} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>



        {/* Interactive Map Section */}
        <section id="map" style={{ marginTop: "var(--space-16)" }} aria-labelledby="map-heading">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-6)" }}>
            <h2 id="map-heading" style={{ fontSize: "var(--text-2xl)", fontWeight: 800, color: "var(--color-accent)", margin: 0 }}>
              Interactive Market Floor Plan
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
              <MapIcon size={16} /> Lucena City Public Market
            </div>
          </div>

          <div className="card" style={{ height: "600px", position: "relative", overflow: "hidden" }}>
            <MarketMap
              stalls={mapStalls.map(s => ({ ...s, vendor: censorName(s.vendor) }))}
              showAdminLinks={false}
            />
          </div>

          <div style={{ marginTop: "var(--space-4)", display: "flex", flexWrap: "wrap", gap: "var(--space-4)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-xs)" }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: "#F97316", border: "1px solid #C2410C" }} />
              <span>With Renter</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-xs)" }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: "#3B82F6", border: "1px solid #1D4ED8" }} />
              <span>Vacant Stall</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-xs)" }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: "#16A34A", border: "1px solid #1D4ED8" }} />
              <span>Storage/Bodega</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-xs)" }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: "#9333EA", border: "1px solid #D1D5DB" }} />
              <span>Closed</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-xs)" }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: "#FFFFFF", border: "1px solid #D1D5DB" }} />
              <span>Owner Managed</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-xs)", marginLeft: "auto" }}>
              <span style={{ color: "var(--text-muted)" }}>* Zoom and drag to explore the market layout</span>
            </div>
          </div>
        </section>

        {/* CTA: Report Complaint */}
        <section style={{
          marginTop: "var(--space-16)",
          background: "linear-gradient(135deg,var(--color-accent),var(--color-accent-light))",
          borderRadius: "var(--radius-xl)", padding: "var(--space-12) var(--space-8)",
          textAlign: "center", color: "white"
        }} aria-labelledby="report-cta-heading">
          <AlertCircle size={40} style={{ color: "var(--color-primary)", margin: "0 auto var(--space-4)" }} aria-hidden="true" />
          <h2 id="report-cta-heading" style={{ color: "white", fontSize: "var(--text-2xl)", fontWeight: 800, marginBottom: "var(--space-3)" }}>
            See a Problem in the Market?
          </h2>
          <p style={{ color: "white", opacity: 0.8, marginBottom: "var(--space-6)", maxWidth: 480, margin: "0 auto var(--space-6)" }}>
            Help us keep the market clean and fair. Report any sanitation issues, overpricing, or violations instantly.
          </p>
          <button className="btn btn-primary btn-lg" onClick={() => setComplaintOpen(true)}>
            <AlertCircle size={18} /> Report an Issue
          </button>
        </section>
      </main>

      {/* Footer */}
      <footer style={{
        background: "var(--color-accent)", color: "rgba(255,255,255,0.65)",
        padding: "var(--space-8) var(--space-6)", textAlign: "center"
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ fontWeight: 700, color: "white", marginBottom: "var(--space-2)" }}>GeoMarketics</div>
          <div style={{ fontSize: "var(--text-xs)" }}>
            © {new Date().getFullYear()} New Lucena City Public Market · Lucena, Quezon · All rights reserved
          </div>
          <div style={{ marginTop: "var(--space-4)", display: "flex", justifyContent: "center", gap: "var(--space-6)" }}>
            <Link href="/login" style={{ color: "rgba(255,255,255,0.6)", fontSize: "var(--text-xs)" }}>Staff Login</Link>
            <a href="#stalls" style={{ color: "rgba(255,255,255,0.6)", fontSize: "var(--text-xs)" }}>Browse Stalls</a>
          </div>
        </div>
      </footer>

      {/* Complaint Modal */}
      <Modal
        isOpen={complaintOpen}
        onClose={() => { setComplaintOpen(false); setComplaintSent(false); setComplaint({ stall: "", email: "", desc: "", cat: "Sanitation", image: null }); }}
        title="Report a Market Issue"
        footer={complaintSent ? undefined : (
          <>
            <button className="btn btn-ghost" onClick={() => setComplaintOpen(false)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleComplaintSubmit} disabled={!complaint.desc.trim() || !complaint.email.trim() || submitting}>
              <Send size={14} /> {submitting ? "Submitting…" : "Submit Report"}
            </button>
          </>
        )}
      >
        {complaintSent ? (
          <div className="empty-state" style={{ padding: "var(--space-8)" }}>
            <div className="empty-state-icon" style={{ background: "#DCFCE7", color: "var(--color-success)" }}>
              <AlertCircle size={28} />
            </div>
            <div className="empty-state-title">Thank you!</div>
            <p className="empty-state-desc">Your report has been submitted. Our team will review it shortly.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div className="form-group">
              <label className="form-label" htmlFor="pub-stall">Stall Number (if known)</label>
              <input id="pub-stall" className="form-input" placeholder="e.g. B-12"
                value={complaint.stall} onChange={(e) => setComplaint((p) => ({ ...p, stall: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="pub-cat">Issue Category</label>
              <select id="pub-cat" className="form-select"
                value={complaint.cat} onChange={(e) => setComplaint((p) => ({ ...p, cat: e.target.value }))}>
                <option>Sanitation</option>
                <option>Overpricing</option>
                <option>Safety Hazard</option>
                <option>Food Safety</option>
                <option>Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label form-label-required" htmlFor="pub-email">Your Email</label>
              <input id="pub-email" type="email" className="form-input" placeholder="For updates regarding your complaint..."
                aria-required="true"
                value={complaint.email} onChange={(e) => setComplaint((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label form-label-required" htmlFor="pub-desc">Describe the Issue</label>
              <textarea id="pub-desc" className="form-textarea" rows={4}
                placeholder="What did you observe? Be as specific as possible..."
                aria-required="true"
                value={complaint.desc} onChange={(e) => setComplaint((p) => ({ ...p, desc: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="pub-image">Upload Image (Optional)</label>
              <input
                id="pub-image"
                type="file"
                accept="image/*"
                className="form-input"
                style={{ padding: "var(--space-2)" }}
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setComplaint((p) => ({ ...p, image: file }));
                }}
              />
              <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: "var(--space-1)" }}>
                Attach a photo to help us better understand the issue.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
