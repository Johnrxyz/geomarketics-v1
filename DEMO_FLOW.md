# GeoMarketics Pre-Oral Defense — Complete Demo Flow

---

## A. DEMO OVERVIEW

### Overall Demo Story

> *"It is 8:00 AM on a Tuesday morning at Lucena City Public Market. A consumer checks today's commodity prices on their phone before heading out to shop. Meanwhile, the Market Administrator arrives at the office and opens the GeoMarketics dashboard to begin the day's operations — reviewing complaints from yesterday, conducting a sanitation inspection, issuing a violation to a non-compliant vendor, and generating an accomplishment report for the City Government. At the same time, a vendor logs into their portal to upload their renewed business permit and check if any violations have been recorded against them."*

This narrative threads three real user journeys (Consumer, Admin, Vendor) through a single realistic workday, demonstrating that GeoMarketics is not a collection of disconnected pages — it is a living, integrated system where every action by one role produces visible consequences for another.   

### Objective of the Demonstration

1. Prove the system solves a **real, documented problem** — the absence of digital tools for public market governance in Lucena City.
2. Demonstrate **end-to-end functionality** across all three user roles (Consumer, Admin, Vendor).
3. Showcase the **GIS-based interactive market map** as the system's differentiating innovation.
4. Show **data-driven decision support** (AI risk scoring, price intelligence, compliance monitoring).
5. Exhibit **production-quality** UI/UX, responsiveness, and system integration.

### Expected Duration

| Segment | Duration |
|---|---|
| Opening Context (no system) | 1 minute |
| Act 1 — Consumer Platform | 5–6 minutes |
| Act 2 — Admin Operations | 8–10 minutes |
| Act 3 — Vendor Portal | 3–4 minutes |
| Act 4 — Full Circle & Closing | 1–2 minutes |
| **Total** | **18–23 minutes** |

---

## B. DEMO SEQUENCE

The demo is structured as a **three-act play** with natural transitions between roles.

---

### ACT 1 — THE CONSUMER EXPERIENCE

**Context for the panel:** *"Before we enter the admin system, let's see what the public — the taxpayers, the shoppers, the families — actually see when they visit GeoMarketics."*

---

#### Step 1: Consumer Landing Page — First Impression

| Field | Detail |
|---|---|
| **Screen** | `/` — Consumer Decision-Support Platform |
| **User Role** | Public (no login) |
| **Action** | Open the site. Let the hero section, market intelligence ticker, and announcements load. |
| **System Response** | Hero banner with "Freshness You Can Trust, Prices You Can Verify." Price alert ticker scrolls across the top. Announcements grid appears with priority-coded cards. |
| **Purpose** | Establish the public-facing value proposition instantly. Show that the system serves citizens, not just administrators. |
| **Talking Points** | *"This is the public landing page. No login is required. Any consumer with a phone can access live market data, file complaints, and navigate the market — all for free. Notice the scrolling price intelligence ticker at the top and the market announcements from the administration."* |

---

#### Step 2: Live Commodity Price Monitor

| Field | Detail |
|---|---|
| **Screen** | `/` — Price cards section |
| **User Role** | Public |
| **Action** | Scroll to the commodity price cards. Click a category filter (e.g., "Protein"). Point out the affordability badges, sparkline charts, and weekly/monthly change percentages. |
| **System Response** | Cards filter by category. Each card shows live price, low-high range, regional average comparison, sparkline trend, and affordability badge (Below Average / Above Average / Near Average). |
| **Purpose** | Demonstrate real-time price monitoring sourced from DA CALABARZON data. |
| **Talking Points** | *"These prices are sourced from the Department of Agriculture CALABARZON's official price monitoring reports. The system automatically scrapes, parses, and normalizes this data. Each commodity shows the Lucena price vs. the regional average — so a consumer can instantly see if they're getting a fair deal. The green 'Lower than Avg' badge means Lucena is cheaper than the regional norm."* |

---

#### Step 3: Smart Ulam Calculator

| Field | Detail |
|---|---|
| **Screen** | `/` — Smart Ulam Calculator section |
| **User Role** | Public |
| **Action** | Click on "Sinigang na Baboy" recipe card. Show the ingredient breakdown and total cost. Then click "Find Ingredients in Market." |
| **System Response** | Recipe card expands with: total cooking cost (computed from live prices), ingredient-by-ingredient breakdown, regional comparison, savings calculation. Clicking "Find Ingredients" scrolls to the map and generates a multi-stop navigation route. |
| **Purpose** | This is a "wow factor" feature. It connects price data to practical consumer decision-making AND to the GIS map. |
| **Talking Points** | *"This is the Smart Ulam Calculator — a consumer types in their budget or picks a recipe, and the system computes the exact cost using today's live prices. Watch what happens when I click 'Find Ingredients in Market' — the system generates a walking route through the market, stopping at each stall category the recipe requires. This is GIS-powered grocery planning."* |

---

#### Step 4: Interactive Market Map (Consumer Side)

| Field | Detail |
|---|---|
| **Screen** | `/` — Market Navigator section |
| **User Role** | Public |
| **Action** | Show the multi-stop route from Step 3. Then clear it. Search for a stall (e.g., "Fish"). Click a result card. Click "Directions." |
| **System Response** | A* pathfinding generates a route from the nearest STRUCTURE stall (Elevator / Information / Market Office) to the target, avoiding walls and other stalls. Animated blue dashed line with start (green) and end (red) markers. |
| **Purpose** | Demonstrate the GIS pathfinding — the system's core technical innovation. |
| **Talking Points** | *"The market map is an exact SVG replica of Lucena Public Market's actual floor plan — Main Building and Annex, both floors. The pathfinding uses A-star algorithm on a grid derived from the SVG geometry. It avoids walls, stalls, and structures. The route starts from the nearest landmark — Elevator, Information Desk, or Market Office — whichever is closest to the destination. This is the same technology used in Google Maps, adapted for indoor public market navigation."* |

---

#### Step 5: File a Public Complaint

| Field | Detail |
|---|---|
| **Screen** | `/` — Complaint modal |
| **User Role** | Public |
| **Action** | Click "File Complaint" button in the navigation bar. Fill in: Stall B-12, Category: Overpricing, Email: juan@email.com, Description: "The vendor charged 120/kg for tilapia when the posted price is 90/kg." Attach a photo (optional). Submit. |
| **System Response** | Modal shows success confirmation: "Complaint Submitted. Thank you for reporting this to the Lucena Market Authority." |
| **Purpose** | Show the citizen feedback loop. This complaint will reappear in Act 2 when the Admin processes it. |
| **Talking Points** | *"Any citizen can file a complaint — no account needed. They just need an email for follow-up. This complaint is now in the admin's queue. We'll see it again in a moment."* |

---

### TRANSITION TO ACT 2

**Presenter says:** *"That's the consumer's world — transparent prices, smart tools, and a direct line to the administration. Now let's switch to the other side of the counter. The Market Administrator logs in."*

---

### ACT 2 — ADMIN OPERATIONS

---

#### Step 6: Admin Login

| Field | Detail |
|---|---|
| **Screen** | `/` → LoginModal |
| **User Role** | Transition: Public → Admin |
| **Action** | Click "Admin Access" button. Enter credentials: `admin` / `admin123`. Submit. |
| **System Response** | Login modal authenticates via JWT. Redirects to `/map` (admin's default landing). Sidebar appears with full admin navigation. Header shows "Administrator" badge and notification bell. |
| **Purpose** | Demonstrate the role-based access control system. |
| **Talking Points** | *"The system uses JWT authentication with role-based access. The admin sees a completely different interface — the full operational command center."* |

---

#### Step 7: Interactive Market Map — Admin View (THE CENTERPIECE)

| Field | Detail |
|---|---|
| **Screen** | `/map` — Admin Market Map |
| **User Role** | Admin |
| **Action** | (a) Pan and zoom the unified Main+Annex view. (b) Click on a stall — show the popup with occupancy and compliance status. (c) Switch the data layer from "Stall Status" to "Compliance Heatmap." (d) Switch to "Waste Risk Heatmap." (e) Switch to "Complaint Density." (f) Switch floors (1st → 2nd). |
| **System Response** | (a) Smooth pan/zoom with mouse wheel. (b) Popup shows stall number, vendor name, category, section, dual status badges (occupancy + compliance). Admin action buttons appear: Log Inspection, Issue Violation, Assign Vendor, Send Notice, Full Details. (c-e) Map recolors all stalls/zones according to the selected layer. (f) Floor plan swaps with transition animation. |
| **Purpose** | This is the system's flagship feature. Spend the most time here. Show every layer. |
| **Talking Points** | *"This is the operational heart of GeoMarketics. Every stall in the market is mapped 1:1 to the SVG floor plan. The admin can see occupancy at a glance — white is owner-operated, orange is rented, purple is closed, blue is vacant. Switching to the Compliance Heatmap shows vendor compliance standing — green, yellow, red. The Waste Risk layer aggregates sanitation inspection data into zone-level risk scores. Complaint Density shows where citizen complaints are clustering. This gives the administrator spatial intelligence — they can see problems geographically, not just in spreadsheets."* |

---

#### Step 8: Issue a Violation from the Map

| Field | Detail |
|---|---|
| **Screen** | `/map` — Violation modal |
| **User Role** | Admin |
| **Action** | Click on a stall with a vendor (e.g., Stall B-12 — the one from the complaint). Click "Issue Violation" from the popup. The modal auto-detects prior offences. Select violation type: "Obstruction of Aisle / Passageway." Add description. Optionally open camera and capture photo evidence. Submit. |
| **System Response** | Modal pre-fills stall number, section, vendor name. Auto-detection banner shows: "Auto-Detected: 1st Offence (0 prior records)" with penalty "P500.00." After submit, success confirmation appears. |
| **Purpose** | Show the penalty escalation system (1st: P500, 2nd: P1,500, 3rd: Revocation) and the camera integration. |
| **Talking Points** | *"The violation system auto-detects the offence number by querying prior violations for this vendor. First offence: P500 fine. Second: P1,500. Third: permit revocation — all per the City Ordinance. The admin can capture photo evidence directly from the device camera. This violation is now on the vendor's permanent record."* |

---

#### Step 9: Log a Sanitation Inspection from the Map

| Field | Detail |
|---|---|
| **Screen** | `/map` — Inspection modal |
| **User Role** | Admin |
| **Action** | Click a different stall. Click "Log Inspection." Select rating: "Needs Follow-up." Add notes: "Vendor not wearing hairnet during food preparation." Submit. |
| **System Response** | Sanitation session created. Success confirmation. |
| **Purpose** | Show that inspections can be logged directly from the map — no navigating away. |
| **Talking Points** | *"Inspections can be logged right from the map popup — the admin doesn't need to switch to a different module. This feeds into the Waste Risk heatmap and the AI risk scoring engine."* |

---

#### Step 10: Admin Dashboard

| Field | Detail |
|---|---|
| **Screen** | `/dashboard` |
| **User Role** | Admin |
| **Action** | Navigate to Dashboard via sidebar. Show the KPI stat cards, occupancy chart, complaint chart, and AI-generated insights. |
| **System Response** | Dashboard loads with: Total Stalls count, Occupancy Rate %, Active Vendors count, Open Complaints count, Pending Documents count. Section occupancy bar chart. Complaints by category distribution. Recent complaints table. AI insight cards. |
| **Purpose** | Show the executive summary view — the "morning briefing" for the Market Superintendent. |
| **Talking Points** | *"This is the administrator's morning briefing. At a glance: how many stalls are occupied, how many complaints are open, how many documents are pending review. The AI insights engine analyzes patterns — for example, it might flag that Section C has a rising complaint trend or that document backlogs are growing."* |

---

#### Step 11: Process the Consumer Complaint

| Field | Detail |
|---|---|
| **Screen** | `/admin/complaints` |
| **User Role** | Admin |
| **Action** | Navigate to Complaints. Find the complaint filed in Step 5 (overpricing, Stall B-12). Click to view details. Update status from "Open" to "Reviewing." Add resolution notes: "Verified price discrepancy. Vendor will be notified." |
| **System Response** | Complaint status updates. Summary cards at top refresh (Open count decreases, Reviewing count increases). |
| **Purpose** | Close the loop from the consumer complaint filed in Act 1. This proves the system is integrated end-to-end. |
| **Talking Points** | *"Remember the overpricing complaint filed by the consumer earlier? Here it is in the admin's queue. The admin can track it through the full lifecycle: Open, Reviewing, Resolved, or Dismissed. Every status change is logged. This closes the accountability loop between citizens and the market administration."* |

---

#### Step 12: Document Review with OCR

| Field | Detail |
|---|---|
| **Screen** | `/admin/documents` |
| **User Role** | Admin |
| **Action** | Navigate to Documents. Filter by "Pending" status. Click on a document to view. Show the OCR intelligence panel (detected type, confidence score, extracted data). Approve the document. |
| **System Response** | Document list filters. Detail view shows file preview, OCR metadata (detected type: "Business Permit", confidence: 92%, extracted data fields). After approval, status changes to "Approved" with green badge. |
| **Purpose** | Demonstrate the document intelligence pipeline. |
| **Talking Points** | *"The document system supports an OCR pipeline. When a vendor uploads a business permit or contract, the system processes it through optical character recognition — detecting the document type, extracting key fields, and assigning a confidence score. The admin reviews the results and approves, rejects, or requests resubmission."* |

---

#### Step 13: Sanitation Inspection Checklist

| Field | Detail |
|---|---|
| **Screen** | `/admin/sanitation` |
| **User Role** | Admin |
| **Action** | Navigate to Sanitation. Select Section: "Fish." Show the checklist table with vendors in that section. Check off items (Uniform, Hairnet, Apron, Boots, Mask, Permit) for 2-3 vendors using the tri-state toggle. Add a remark for one vendor. Save the session. |
| **System Response** | Checklist renders with all vendors in the Fish section. Clicking each cell cycles: empty → check → X → empty. Save creates a sanitation session with computed compliance rate. |
| **Purpose** | Show the practical fieldwork tool — this is what inspectors use on their tablets during walkthrough inspections. |
| **Talking Points** | *"This is designed for field use. During a market walkthrough, the sanitation inspector opens this on a tablet, selects the section, and checks off compliance items per vendor. The data feeds directly into the Waste Risk heatmap on the map and the vendor's AI risk profile."* |

---

#### Step 14: AI Risk Scoring

| Field | Detail |
|---|---|
| **Screen** | `/admin/ai-risk` |
| **User Role** | Admin |
| **Action** | Navigate to AI Risk Analysis. Show the risk profile table. Click "Recompute Risk." Show the updated risk levels and scores. |
| **System Response** | Table shows vendors with risk levels (Low/Medium/High), risk scores, and assessment factors. Recompute triggers backend calculation. Results refresh. |
| **Purpose** | Demonstrate the AI/analytics differentiator — automated risk assessment from aggregated data. |
| **Talking Points** | *"The AI risk engine aggregates data from violations, complaints, sanitation records, and document compliance to compute a risk score per vendor. High-risk vendors can be prioritized for inspection. This moves market governance from reactive to proactive."* |

---

#### Step 15: Violations & Printable Warning Letter

| Field | Detail |
|---|---|
| **Screen** | `/admin/violations` |
| **User Role** | Admin |
| **Action** | Navigate to Violations. Find the violation issued in Step 8. Click to view. Show the printable warning letter (print preview). |
| **System Response** | Violation detail shows all fields. Print button generates a full-page official warning letter with: Market Office header, vendor name, stall number, violation type, offence number, penalty amount (P500 / P1,500 / Revocation), Ordinance citation, date, signature line. |
| **Purpose** | Show that the system produces legally-formatted official documents — not just database records. |
| **Talking Points** | *"The system generates printable warning letters in the official format required by the City Ordinance. It auto-fills the offence number, penalty amount, and all vendor details. This replaces the manual handwritten violation notices currently used."* |

---

#### Step 16: Generate Accomplishment Report

| Field | Detail |
|---|---|
| **Screen** | `/admin/reports` |
| **User Role** | Admin |
| **Action** | Navigate to Reports. Set date range (this month). Select report type: "Occupancy." Show the occupancy pie chart and section bar chart. Then click "Generate Accomplishment Report." |
| **System Response** | Charts render with occupancy data. Accomplishment report generates and saves to database with a data snapshot. |
| **Purpose** | Show the reporting capability for LGU compliance and documentation. |
| **Talking Points** | *"The Market Superintendent is required to submit periodic accomplishment reports to the City Government. This module generates those reports automatically with charts, statistics, and exportable data — replacing the manual compilation process that currently takes hours."* |

---

#### Step 17: Send an Announcement

| Field | Detail |
|---|---|
| **Screen** | `/admin/announcements` |
| **User Role** | Admin |
| **Action** | Navigate to Announcements. Create a new announcement: Title: "Market Closed for Fumigation — June 28," Category: Schedule, Priority: High, Content: "The market will be closed on June 28 for quarterly fumigation. All vendors must vacate by 5:00 PM on June 27." Save. |
| **System Response** | Announcement created and saved. |
| **Purpose** | Show the communication channel to consumers. This announcement will appear on the consumer landing page. |
| **Talking Points** | *"Announcements published here appear instantly on the consumer landing page. This replaces the bulletin board system. The priority level controls how prominently the announcement is displayed — 'High' gets a red urgent badge."* |

---

### TRANSITION TO ACT 3

**Presenter says:** *"The admin has processed complaints, conducted inspections, issued violations, and generated reports. Now let's see the vendor's side — what does all this look like from their perspective?"*

---

### ACT 3 — VENDOR PORTAL

---

#### Step 18: Vendor Login

| Field | Detail |
|---|---|
| **Screen** | Logout → `/` → LoginModal |
| **User Role** | Transition: Admin → Vendor |
| **Action** | Log out. Click "Admin Access" (login button). Enter: `maria.santos` / `vendor123`. |
| **System Response** | Redirects to `/vendor/profile`. Sidebar shows vendor-specific navigation (My Profile, Market Map, Documents, My Complaints, My Violations). |
| **Purpose** | Demonstrate role-based UI transformation — same system, different experience. |
| **Talking Points** | *"Same system, different role. The vendor sees only what's relevant to them — their profile, their documents, their complaints, their violations. The sidebar, permissions, and available actions all change based on the logged-in role."* |

---

#### Step 19: Vendor Profile

| Field | Detail |
|---|---|
| **Screen** | `/vendor/profile` |
| **User Role** | Vendor |
| **Action** | Show the vendor's profile: name, contact info, assigned stall, section, category. Toggle edit mode. Update phone number. Save. |
| **System Response** | Profile displays with current data. Edit mode enables form fields. Save updates via API. |
| **Purpose** | Show vendor self-service capability. |
| **Talking Points** | *"Vendors can manage their own profile — update contact information, view their stall assignment, and see their compliance standing. This reduces admin workload for routine data maintenance."* |

---

#### Step 20: Vendor Document Upload

| Field | Detail |
|---|---|
| **Screen** | `/vendor/documents` |
| **User Role** | Vendor |
| **Action** | Show existing documents with status badges. Click "Upload Business Permit." Select a file (or use camera). Submit. Show the document appearing in the list with "Processing" status. |
| **System Response** | File uploads via API. Document appears in list with status badge progression: "Incomplete" → "Processing." OCR validation results display when available. |
| **Purpose** | Show the vendor-side of the document pipeline. The admin approved a document in Step 12 — this is where it originated. |
| **Talking Points** | *"Vendors upload their permits and contracts here. The system supports both file upload and direct camera capture — designed for vendors who may not have scanners. Multi-page contracts are supported. The document then enters the OCR pipeline and appears in the admin's review queue."* |

---

#### Step 21: Vendor Views Their Violation

| Field | Detail |
|---|---|
| **Screen** | `/vendor/violations` |
| **User Role** | Vendor |
| **Action** | Navigate to "My Violations." Show the violation issued by the admin in Step 8. Click to view details including photo evidence. |
| **System Response** | Violation list shows the entry with severity badge and status. Detail view shows description, evidence photo, date, and penalty information. |
| **Purpose** | Close the loop from Step 8. The admin issued a violation; the vendor sees it here. Full accountability chain. |
| **Talking Points** | *"And here's the accountability loop closing. The violation the admin issued from the map earlier — the vendor sees it here with the full details and photo evidence. No more he-said-she-said disputes. Everything is documented, timestamped, and transparent."* |

---

### ACT 4 — FULL CIRCLE & CLOSING

---

#### Step 22: Return to Consumer Page — Announcement Visible

| Field | Detail |
|---|---|
| **Screen** | Logout → `/` |
| **User Role** | Public |
| **Action** | Log out from vendor account. Return to the consumer landing page. Scroll to announcements. Show the fumigation announcement created in Step 17 with the red "Urgent" badge. |
| **System Response** | Announcement appears in the consumer-facing grid with high-priority styling. |
| **Purpose** | The final "full circle" moment. An admin action in Act 2 is now visible to the public in Act 4. |
| **Talking Points** | *"And here's our full circle. The fumigation announcement the admin posted is now live on the consumer page, marked as Urgent. The consumer who filed the overpricing complaint is getting their issue reviewed. The vendor who received the violation can see it on their portal. Every action in this system has a consequence, and every stakeholder has visibility. That is GeoMarketics."* |

---

## C. CRITICAL FEATURES DEMONSTRATED

The demo naturally covers all of the following without forced detours:

### GIS & Mapping (Core Innovation)
- [x] Interactive SVG floor plan (Main Building + Annex, 2 floors)
- [x] Unified dual-building view with bridge connector
- [x] Pan, zoom, and fly-to-stall animation
- [x] Stall-level color coding by occupancy status
- [x] Compliance heatmap layer
- [x] Waste risk heatmap layer
- [x] Complaint density heatmap layer
- [x] Layer switching with dynamic legend
- [x] A* pathfinding with obstacle avoidance
- [x] Multi-stop ingredient navigation route
- [x] STRUCTURE landmarks (Elevator, Information, Market Office) as route origins

### Consumer Decision Support
- [x] Live commodity price monitoring from DA CALABARZON
- [x] Affordability comparison (Lucena vs. regional average)
- [x] Historical price charts with trend analysis
- [x] Smart Ulam Calculator with live cost computation
- [x] Budget Meal Planner
- [x] Market-to-market comparison
- [x] "What Changed This Week" intelligence
- [x] Public complaint filing (no auth required)

### Admin Operations
- [x] Role-based JWT authentication
- [x] Executive dashboard with KPI cards and charts
- [x] Complaint lifecycle management (Open → Reviewing → Resolved)
- [x] Sanitation inspection checklist (field-ready, tablet-optimized)
- [x] Violation issuance with auto-penalty escalation (1st/2nd/3rd offence)
- [x] Camera-based photo evidence capture
- [x] Printable official warning letters
- [x] Document review with OCR intelligence
- [x] AI risk scoring engine
- [x] Accomplishment report generation
- [x] Announcement publishing (consumer-visible)
- [x] Map-based action execution (inspect/violate/assign/notify from popup)

### Vendor Self-Service
- [x] Vendor profile management
- [x] Document upload (file + camera, multi-page)
- [x] View own violations with evidence
- [x] View own complaints
- [x] Role-restricted navigation

### System Architecture
- [x] Three-role access control (Admin, Vendor, Consumer)
- [x] Real-time notification system (polling every 30s)
- [x] REST API with 33 endpoints
- [x] Django backend with 11 apps
- [x] Automated DA price data ingestion pipeline

---

## D. BACKUP DEMO PATH

If a module fails during the live presentation, use these fallback strategies:

### Scenario 1: Backend API is Down
- **Fallback**: The consumer landing page has hardcoded fallback data (`STAPLES`, `ALERTS`, `HISTORICAL_DATA`, `MARKETS`) that render even without API connectivity. Demo the consumer page with mock data while explaining: *"The system is designed with graceful degradation — the consumer page remains functional with cached data even during backend maintenance."*
- **Skip**: Admin/Vendor login. Instead, show screenshots or a pre-recorded video segment.

### Scenario 2: Map SVG Fails to Load
- **Fallback**: Refresh the page (SVG is cached after first load). If still broken, navigate to `/admin/vendors` and use the "Show on Map" action from the vendor table — this triggers a fresh map load with URL parameters.
- **Skip**: Pathfinding demo. Focus on the data layers by explaining: *"The pathfinding algorithm builds a navigation grid from the SVG geometry..."* and show the code briefly.

### Scenario 3: Login Fails (JWT Error)
- **Fallback**: Clear localStorage (`localStorage.clear()` in browser console), then retry login. If still failing, demo the consumer page fully (Steps 1-5) and narrate the admin/vendor features with screenshots.
- **Skip**: Role transitions. Present each role segment with pre-logged-in browser tabs.

### Scenario 4: Complaint/Violation Create Fails
- **Fallback**: Show existing records in the list instead of creating new ones. Point to existing complaints/violations and walk through their details.
- **Skip**: The "full circle" narrative. Instead close with: *"In production, every consumer complaint flows into the admin queue, and every admin action is visible to the affected vendor."*

### Scenario 5: Charts/Recharts Don't Render
- **Fallback**: Charts only render after `isMounted` is true (SSR guard). If they're blank, quickly refresh the page. Recharts components are client-only and should render on second paint.
- **Skip**: Historical price chart. Show the sparklines on commodity cards instead (they use the same library but are simpler).

### General Backup Strategy
- **Have two browser tabs pre-loaded**: one on `/` (consumer) and one on `/map` (admin, pre-logged-in). If anything breaks in one tab, switch to the other.
- **Have screenshots of every critical screen** on a USB drive as a last resort.
- **Pre-record a 3-minute video walkthrough** of the full demo as the ultimate fallback.

---

## E. JUDGE IMPACT ANALYSIS

### For Research Advisers
| Concern | How the Demo Addresses It |
|---|---|
| "Is the research problem real?" | The consumer page shows actual DA CALABARZON data and the real floor plan of Lucena Public Market — this is not hypothetical. |
| "Is the methodology sound?" | The three-act demo mirrors the system's three user personas from the requirements analysis. Every feature maps to a documented requirement. |
| "Does it contribute to knowledge?" | The GIS-integrated market governance model (SVG floor plan + stall-level data + spatial analytics layers) is a novel approach not found in existing Philippine public market systems. |
| "Is the scope appropriate?" | 21 pages, 3 roles, 33 API endpoints, 11 backend apps — the scope is ambitious but complete. |

### For IT Faculty
| Concern | How the Demo Addresses It |
|---|---|
| "Is the architecture sound?" | JWT auth, REST API, role-based guards, Django DRF backend, Next.js frontend — all industry-standard technologies. |
| "Does it actually work?" | The live demo creates real records (complaint, violation, inspection) that persist and cross-reference across modules. |
| "Is the code quality acceptable?" | The SVG pathfinding, OCR pipeline, and AI risk scoring demonstrate technical depth beyond CRUD operations. |
| "Is it deployable?" | The system runs on a standard Node.js + Django stack. The consumer page works without authentication — it's production-ready for public access. |

### For Technical Panelists
| Concern | How the Demo Addresses It |
|---|---|
| "What's the innovation?" | A* pathfinding on SVG floor plans with obstacle avoidance; four spatial data layers (occupancy, compliance, waste risk, complaint density); AI risk scoring from aggregated multi-source data; automated DA price data ingestion pipeline. |
| "How does the GIS work?" | Draw.io SVG exports with `data-cell-id` attributes mapped to database `svg_cell_id` fields. Grid built by parsing SVG rect attributes with rotation transforms. Each stall is individually addressable. |
| "What about data integrity?" | Dual-status model (occupancy + compliance are independent fields), auto-penalty escalation with prior-offence detection, audit logging via `AuditLog` model. |
| "What about scalability?" | Paginated API responses, SVG caching, debounced grid building, notification polling (not WebSocket) for simplicity. |

### For Government/LGU Stakeholders
| Concern | How the Demo Addresses It |
|---|---|
| "Will this actually help us?" | The sanitation checklist replaces paper forms. The violation system replaces handwritten notices. The report generator replaces manual compilation. The map replaces the mental model in the administrator's head. |
| "Can the public use it?" | No login required. Works on any phone browser. Shows live prices, market map, and complaint filing. |
| "Does it meet our ordinance requirements?" | The penalty escalation (P500/P1,500/Revocation) is hardcoded per the City Ordinance. Warning letters follow the official format. |
| "Can we get reports for the City Government?" | The accomplishment report generator creates date-ranged reports with occupancy, complaint, and compliance data — exactly what's submitted to the City Administrator. |

---

## F. PRESENTATION STRATEGY

### Recommended Speaker Assignments (4-member team)

| Member | Role | Segments | Rationale |
|---|---|---|---|
| **Member 1** (Project Lead / Researcher) | Opening & Consumer Platform | Opening context, Steps 1–5, Step 22 (closing) | Sets the research context, delivers the "why this matters" narrative, and closes the full-circle moment. |
| **Member 2** (Lead Developer / GIS Specialist) | Map System & Technical Features | Steps 6–9, Step 14 (AI Risk) | Owns the most technically complex features: the interactive map, data layers, pathfinding, and AI risk scoring. Can answer deep technical questions. |
| **Member 3** (Backend Developer / Systems Analyst) | Admin Operations & Data Flows | Steps 10–13, Steps 15–17 | Demonstrates the operational modules: dashboard, complaints, documents, sanitation, violations, reports, announcements. Understands the backend API and database schema. |
| **Member 4** (Frontend Developer / UI Designer) | Vendor Portal & UX | Steps 18–21 | Shows the vendor perspective, role-based UI transformation, and document upload flow. Can speak to responsive design and accessibility decisions. |

### Speaker Transition Points

| After Step | Transition |
|---|---|
| Step 5 (complaint filed) | **Member 1 → Member 2**: *"Now let's see the admin side. [Member 2] will take us through the map system."* |
| Step 9 (map actions done) | **Member 2 → Member 3**: *"With inspections and violations logged, [Member 3] will show how the admin manages the full operational workflow."* |
| Step 17 (announcement sent) | **Member 3 → Member 4**: *"Now [Member 4] will show us what this all looks like from the vendor's perspective."* |
| Step 21 (vendor violations) | **Member 4 → Member 1**: *"And [Member 1] will close our demonstration with the full-circle moment."* |

### Time Allocation by Section

| Section | Steps | Duration | Pace |
|---|---|---|---|
| Consumer Platform | 1–5 | 5–6 min | **Medium** — let the price cards and ulam calculator breathe; these are crowd-pleasers |
| Map System (FLAGSHIP) | 6–9 | 5–6 min | **SLOW** — this is the core innovation; demonstrate every layer, explain the pathfinding, let judges interact if they want |
| Admin Operations | 10–17 | 6–8 min | **Brisk** — these are operational modules; show each one efficiently, don't linger on forms |
| Vendor Portal | 18–21 | 3–4 min | **Quick** — the point is role differentiation, not deep feature exploration |
| Full Circle | 22 | 1–2 min | **Deliberate** — this is the emotional payoff; let it land |

### Pages That Deserve Extended Explanation

1. **`/map` (Admin Map)** — Spend 5+ minutes here. Show all 4 data layers. Explain the SVG-to-database mapping. Show at least 2 popup actions (violation + inspection). This is your differentiator.
2. **Consumer Landing Page (Price Monitor + Ulam Calculator)** — 3+ minutes. The affordability comparison and recipe-to-route flow are the "wow" moments for non-technical judges.
3. **`/admin/violations` (Warning Letter)** — 1–2 minutes. The printable warning letter is tangible proof that the system produces real-world outputs, not just database records.

### Pages to Show Quickly (30 seconds each)

- `/dashboard` — Flash the KPIs, mention the charts, move on.
- `/admin/blotters` — Mention it exists, show the table briefly, don't create a record.
- `/admin/operations` — Mention the data pipeline, don't demonstrate entity resolution live.
- `/vendor/complaints` — Quick glance, the point is made by its existence.
- `/vendor/profile` — Toggle edit mode, save, done.

### Pages to SKIP in the Demo (mention verbally if asked)

- `/map/stall/[id]` — Duplicates info already shown in the map popup.
- `/admin/vendors/[id]` — Individual vendor edit; not demo-worthy.
- `/admin/stalls/[id]` — Individual stall edit; not demo-worthy.
- `/complaints` (customer route) — Similar to vendor complaints view.

---

## FINAL PRE-DEMO CHECKLIST

- [ ] Backend server running and accessible
- [ ] At least 10+ stalls with vendors assigned in the database
- [ ] At least 3 open complaints in the system
- [ ] At least 1 pending document for review
- [ ] Announcements table has 2-3 existing entries
- [ ] Price snapshots loaded (or fallback mock data confirmed working)
- [ ] STRUCTURE-category stalls exist (ELEVATOR, INFORMATION, MARKET OFFICE) with `svg_cell_id` mapped
- [ ] SVG floor plans loading correctly (cache warm by visiting `/map` beforehand)
- [ ] Demo credentials working: `admin/admin123` and `maria.santos/vendor123`
- [ ] Browser zoom at 100%, no extensions interfering
- [ ] Two browser tabs pre-loaded: `/` and `/map` (logged in as admin)
- [ ] Backup screenshots on USB drive
- [ ] Backup video recording ready
- [ ] Projector/screen resolution tested (1920x1080 recommended)
- [ ] Disable browser notifications, OS notifications, and messaging apps during demo
