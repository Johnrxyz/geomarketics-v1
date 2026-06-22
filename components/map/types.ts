// ─── Map System Central Types ─────────────────────────────────────────────────
// All map-related types are defined here to avoid circular imports and
// keep the data model consistent across all layers and pages.

// ─── Building & Floor ─────────────────────────────────────────────────────────

export type BuildingId = 'main' | 'annex' | 'combined';
export type FloorId = '1' | '2';

// ─── Dual-Status Model ────────────────────────────────────────────────────────
// Occupancy and Compliance are INDEPENDENT fields.
// A stall can be occupied AND high_risk simultaneously.

/** Stall occupancy/usage status — matches the client's actual categories */
export type OccupancyStatus =
  | 'owner'
  | 'rented'
  | 'storage'
  | 'surrendered_bolante'
  | 'vacant'
  | 'closed';

/** The vendor's regulatory/compliance standing. null = no vendor (vacant/maintenance) */
export type ComplianceStatus = 'compliant' | 'warning' | 'high_risk';

// ─── Stall ────────────────────────────────────────────────────────────────────

export interface MarketStall {
  id: string;
  number: string;
  section: string;
  vendor: string;
  category: string;
  area_sqm?: number | null;

  /** Physical occupancy of the stall space */
  occupancy_status: OccupancyStatus;

  /** Vendor compliance standing — null for vacant/maintenance stalls */
  compliance_status: ComplianceStatus | null;

  /** SVG coordinate X (matches the floor plan SVG's coordinate space) */
  svg_x: number;

  /** SVG coordinate Y (matches the floor plan SVG's coordinate space) */
  svg_y: number;

  /** Optional JSON polygon data for precise stall boundary overlay */
  polygon_data?: string;

  /** draw.io data-cell-id from the SVG floor plan */
  svg_cell_id?: string;

  building: BuildingId;
  floor: FloorId;

  // Navigation
  streetViewImages?: string[];
}

// ─── Map Layer System ─────────────────────────────────────────────────────────

export type MapLayerId =
  | 'stall_status'
  | 'compliance'
  | 'waste_risk'
  | 'complaint_density';

export interface MapLayer {
  id: MapLayerId;
  label: string;
  icon: string;
  description: string;
  /** If true, this layer is hidden from the public/consumer role */
  adminOnly: boolean;
}

export const MAP_LAYERS: MapLayer[] = [
  {
    id: 'stall_status',
    label: 'Stall Status',
    icon: '🏪',
    description: 'Shows each stall colored by occupancy (Occupied, Vacant, Reserved, Maintenance)',
    adminOnly: false,
  },
  {
    id: 'compliance',
    label: 'Compliance Heatmap',
    icon: '📋',
    description: 'Shows each stall colored by compliance standing (Compliant, Warning, High Risk)',
    adminOnly: true,
  },
  {
    id: 'waste_risk',
    label: 'Waste Risk Heatmap',
    icon: '🗑️',
    description: 'Zone-level waste risk derived from sanitation inspection records',
    adminOnly: true,
  },
  {
    id: 'complaint_density',
    label: 'Complaint Density',
    icon: '📣',
    description: 'Zone-level complaint concentration from filed complaints',
    adminOnly: true,
  },
];

// ─── Status Color Palettes ────────────────────────────────────────────────────

export const OCCUPANCY_CONFIG: Record<OccupancyStatus, {
  label: string; color: string; border: string; text: string; dot: string;
}> = {
  closed:               { label: 'Closed / No Operation',   color: '#8B5CF6', border: '#7C3AED', text: '#FFFFFF', dot: '#A78BFA' },
  rented:               { label: 'With Renter',             color: '#F97316', border: '#EA580C', text: '#FFFFFF', dot: '#FB923C' },
  storage:              { label: 'Bodega',                  color: '#84CC16', border: '#65A30D', text: '#FFFFFF', dot: '#A3E635' },
  surrendered_bolante:  { label: 'Surrendered w/ Bolante',  color: '#FBBF24', border: '#D97706', text: '#000000', dot: '#FCD34D' },
  vacant:               { label: 'Surrendered / Vacant',    color: '#38BDF8', border: '#0284C7', text: '#FFFFFF', dot: '#7DD3FC' },
  owner:                { label: 'Managed by the Owner',    color: '#FFFFFF', border: '#374151', text: '#000000', dot: '#E5E7EB' },
};

export const COMPLIANCE_CONFIG: Record<ComplianceStatus, {
  label: string; color: string; border: string; text: string; dot: string;
}> = {
  compliant: { label: 'Compliant',  color: '#16A34A', border: '#15803D', text: '#FFFFFF', dot: '#4ADE80' },
  warning:   { label: 'Warning',    color: '#F59E0B', border: '#D97706', text: '#FFFFFF', dot: '#FCD34D' },
  high_risk: { label: 'High Risk',  color: '#DC2626', border: '#B91C1C', text: '#FFFFFF', dot: '#F87171' },
};

// ─── Zone Heat Data (for Waste Risk & Complaint Density layers) ───────────────

export interface ZoneHeatData {
  /** Matches the stall's section_code */
  zone_id: string;
  /** Raw score: complaint count, waste risk score, etc. */
  value: number;
  /** Human-readable zone name */
  label: string;
  /** Approximate SVG center of the zone for label rendering */
  center_x?: number;
  center_y?: number;
}

// ─── SVG Map Configuration ────────────────────────────────────────────────────
// All dimensions sourced directly from each SVG's width/height attributes.

export interface MapConfig {
  src: string;
  width: number;
  height: number;
  label: string;
}

export const MAP_CONFIGS: Record<BuildingId, Record<FloorId, MapConfig>> = {
  main: {
    '1': { src: '/MAIN_First_Floor.svg',   width: 4324, height: 2949, label: 'Main Building — 1st Floor' },
    '2': { src: '/MAIN_Second_Floor.svg',  width: 4709, height: 2947, label: 'Main Building — 2nd Floor' },
  },
  annex: {
    '1': { src: '/ANNEX_First_Floor.svg',  width: 4281, height: 1176, label: 'Annex — 1st Floor' },
    '2': { src: '/ANNEX_Second_Floor.svg', width: 4258, height: 1339, label: 'Annex — 2nd Floor' },
  },
  // Combined view uses the Main config dimensions — Annex is rendered separately below
  combined: {
    '1': { src: '/MAIN_First_Floor.svg',   width: 4324, height: 2949, label: '1st Floor' },
    '2': { src: '/MAIN_Second_Floor.svg',  width: 4709, height: 2947, label: '2nd Floor' },
  },
};

/** Annex configs — used only in combined (unified floor) view */
export const ANNEX_CONFIGS: Record<FloorId, MapConfig> = {
  '1': { src: '/ANNEX_First_Floor.svg',  width: 4281, height: 1176, label: 'Annex — 1st Floor' },
  '2': { src: '/ANNEX_Second_Floor.svg', width: 4258, height: 1339, label: 'Annex — 2nd Floor' },
};

/** Vertical gap (px in SVG space) between Main and Annex in the combined view */
export const COMBINED_BRIDGE_GAP = 200;

// ─── Legacy Status Remapping ──────────────────────────────────────────────────
// Maps old single-field `status` from the backend API to the new dual fields.
// Used as a fallback until the backend migrates to occupancy_status + compliance_status.

export const LEGACY_TO_OCCUPANCY: Record<string, OccupancyStatus> = {
  occupied:    'owner',
  owner:       'owner',
  rented:      'rented',
  storage:     'storage',
  ambulant:    'surrendered_bolante',
  vacant:      'vacant',
  reserved:    'vacant',
  closed:      'closed',
  flagged:     'closed',
};

export const LEGACY_TO_COMPLIANCE: Record<string, ComplianceStatus | null> = {
  occupied:    'compliant',
  owner:       'compliant',
  rented:      'compliant',
  storage:     'warning',
  ambulant:    'warning',
  vacant:      null,
  reserved:    null,
  closed:      null,
  flagged:     'high_risk',
};
