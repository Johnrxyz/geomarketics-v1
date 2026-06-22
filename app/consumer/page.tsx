"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, Minus, Activity, ShoppingBag, MapPin, Search, 
  AlertCircle, Info, ChevronRight, ChevronLeft, BarChart2, Star, Calculator, Bookmark, Bell, X, Send,
  ChefHat, Utensils, CheckCircle, ArrowDown, ArrowUp, Map, Calendar, Clock, Megaphone, AlertTriangle, Shield
} from "lucide-react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceDot } from "recharts";
import { complaintsApi, stallsApi } from "@/lib/api";
import MarketMap, { MarketStall, OCCUPANCY_CONFIG } from "@/components/map/MarketMap";
import { LEGACY_TO_OCCUPANCY, LEGACY_TO_COMPLIANCE } from "@/components/map/types";
import { getLegendEntries } from "@/components/map/MapLegend";
import { RECIPES, Recipe } from "../../data/recipes";

// --- MOCK DATA STRATEGY (FALLBACK FOR THESIS DEMO) ---
const STAPLES = [
  { id: 'rice', name: 'Rice (Well-milled)', price: 52, lowPrice: 50, highPrice: 54, regionalAvg: 54, weeklyChange: -2.1, monthlyChange: 1.0, sparkline: [54, 54, 53, 53, 52, 52, 52], status: 'below', type: 'staple' },
  { id: 'tomato', name: 'Tomato', price: 88, lowPrice: 85, highPrice: 90, regionalAvg: 75, weeklyChange: 12.4, monthlyChange: 22.0, sparkline: [75, 78, 80, 82, 85, 88, 88], status: 'above', type: 'vegetable' },
  { id: 'garlic', name: 'Garlic', price: 145, lowPrice: 140, highPrice: 150, regionalAvg: 155, weeklyChange: -5.2, monthlyChange: 3.5, sparkline: [155, 150, 148, 148, 145, 145, 145], status: 'below', type: 'vegetable' },
  { id: 'tilapia', name: 'Tilapia', price: 185, lowPrice: 180, highPrice: 190, regionalAvg: 200, weeklyChange: -4.8, monthlyChange: -2.0, sparkline: [195, 195, 190, 190, 185, 185, 185], status: 'below', type: 'protein' },
  { id: 'pork', name: 'Pork Belly', price: 340, lowPrice: 330, highPrice: 350, regionalAvg: 335, weeklyChange: 3.1, monthlyChange: 5.0, sparkline: [320, 325, 330, 330, 335, 340, 340], status: 'near', type: 'protein' },
  { id: 'onion', name: 'Red Onion', price: 110, lowPrice: 100, highPrice: 120, regionalAvg: 112, weeklyChange: 0.5, monthlyChange: -4.2, sparkline: [112, 110, 108, 108, 110, 110, 110], status: 'near', type: 'vegetable' },
];

const ALERTS = [
  { icon: <TrendingUp size={16} color="#DC2626" />, text: "Tomato prices increased by 12.4% this week." },
  { icon: <TrendingDown size={16} color="#16A34A" />, text: "Tilapia dropped by 4.8% compared to the last survey." },
  { icon: <Minus size={16} color="#4B5563" />, text: "Rice remains stable across 4 consecutive surveys." },
  { icon: <AlertCircle size={16} color="#DC2626" />, text: "Pork Belly reached its highest price this month." }
];

const HISTORICAL_DATA = [
  { date: 'May 24', price: 70 }, { date: 'May 25', price: 72 },
  { date: 'May 26', price: 70 }, { date: 'May 27', price: 75 },
  { date: 'May 28', price: 80 }, { date: 'May 29', price: 95 }, // Spike
  { date: 'May 30', price: 90 }, { date: 'May 31', price: 85 },
  { date: 'Jun 1', price: 82 }, { date: 'Jun 2', price: 85 },
  { date: 'Jun 3', price: 88 }, { date: 'Today', price: 88 }
];

const MARKETS = [
  { id: 'tanza', name: 'Tanza Public Market' },
  { id: 'lipa', name: 'Lipa City Public Market' },
  { id: 'tanay', name: 'Tanay Public Market' },
  { id: 'imus', name: 'Imus Public Market' }
];

export default function LucenaDecisionSupport() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // --- MOCK DATA STRATEGY (FALLBACK FOR THESIS DEMO) ---
  const [staples, setStaples] = useState<any[]>(STAPLES);
  const [marketsData, setMarketsData] = useState<any[]>(MARKETS);
  const [isLoading, setIsLoading] = useState(true);

  // State for Categories
  const [categories, setCategories] = useState<string[]>(['All']);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setCurrentPage(1);
  };

  // State for Smart Ulam Calculator
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);

  // State for Comparisons
  const [compareTarget, setCompareTarget] = useState('tanza');

  // State for Budget Planner
  const [budget, setBudget] = useState<string>("500");
  const [budgetResult, setBudgetResult] = useState<any>(null);

  // State for Announcements
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [activeAnnouncementIndex, setActiveAnnouncementIndex] = useState(0);
  const [expandedAnnouncement, setExpandedAnnouncement] = useState<number | null>(null);
  const announcementIntervalRef = useRef<any>(null);

  // State for Complaint Modal
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [stallsList, setStallsList] = useState<any[]>([]);
  const [complaintSubmitted, setComplaintSubmitted] = useState(false);
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);
  const [complaintForm, setComplaintForm] = useState<{
    stall: string;
    category: string;
    email: string;
    description: string;
    file: File | null;
  }>({
    stall: "", category: "sanitation", email: "", description: "", file: null
  });

  // State for Market Navigator
  const [mapStalls, setMapStalls] = useState<MarketStall[]>([]);
  const [mapSearch, setMapSearch] = useState("");
  const [selectedMapStallId, setSelectedMapStallId] = useState<string | null>(null);
  const [highlightedMapStallIds, setHighlightedMapStallIds] = useState<string[]>([]);
  const [navigationRoute, setNavigationRoute] = useState<{ points: {x: number, y: number, label: string}[], totalDistanceMeters: number } | null>(null);
  const [isMobilePanelExpanded, setIsMobilePanelExpanded] = useState(false);

  useEffect(() => {
    async function loadStalls() {
      try {
        const data = await stallsApi.list({ page_size: "1000" }) as any;
        const items = data.results || data;
        setStallsList(items);

        const STALL_W = 200;
        const STALL_H = 120;
        const COLS    = 12;
        const SEC_PAD = 400;

        const sectionIndex: Record<string, number> = {};
        const sectionCounter: Record<string, number> = {};
        let secOrder = 0;

        items.forEach((s: any) => {
          const sec = String(s.section_code ?? "?");
          if (!(sec in sectionIndex)) { sectionIndex[sec] = secOrder++; sectionCounter[sec] = 0; }
        });

        const mapped: MarketStall[] = items.map((s: any) => {
          const rawX = s.svg_x as number | null;
          const rawY = s.svg_y as number | null;
          const hasCoords = rawX != null && rawY != null && (rawX !== 0 || rawY !== 0);

          let svg_x: number, svg_y: number;
          if (hasCoords) {
            svg_x = rawX!; svg_y = rawY!;
          } else {
            const sec = String(s.section_code ?? "?");
            const idx = sectionCounter[sec]++;
            const col = idx % COLS;
            const row = Math.floor(idx / COLS);
            const secRow = sectionIndex[sec];
            svg_x = 300 + col * (STALL_W + 40);
            svg_y = 200 + secRow * (SEC_PAD + Math.ceil(Object.keys(sectionIndex).length) * 20) + row * (STALL_H + 30);
          }

          const legacyStatus = String(s.status ?? "vacant");

          return {
            id: `stall-${String(s.stall_number).toLowerCase().replace(/-/g, "")}`,
            number: s.stall_number as string,
            section: `Section ${s.section_code}`,
            vendor: (s.vendor_name as string) || "—",
            category: s.category as string,
            occupancy_status: s.occupancy_status ?? LEGACY_TO_OCCUPANCY[legacyStatus] ?? "vacant",
            compliance_status: s.compliance_status ?? LEGACY_TO_COMPLIANCE[legacyStatus] ?? null,
            svg_x,
            svg_y,
            polygon_data: s.polygon_data ?? undefined,
            svg_cell_id: (s.svg_cell_id as string) || "",
            area_sqm: (s.area_sqm as number | null) ?? null,
            building: s.building ?? "main",
            floor: s.floor ?? "1",
          };
        });

        setMapStalls(mapped);
      } catch (err) {
        console.error("Failed to load map stalls:", err);
      }
    }
    loadStalls();
  }, []);

  const handleComplaintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintForm.email || !complaintForm.description) return;
    
    setIsSubmittingComplaint(true);
    try {
      const formData = new FormData();
      if (complaintForm.stall) {
        const found = stallsList.find(s => s.stall_number.toLowerCase() === complaintForm.stall.toLowerCase());
        if (found) {
          formData.append('stall', found.id.toString());
        } else {
          formData.append('description', `[Reported Stall: ${complaintForm.stall}]\n\n${complaintForm.description}`);
        }
      }
      formData.append('category', complaintForm.category);
      formData.append('description', complaintForm.description);
      formData.append('complainant_contact', complaintForm.email);
      formData.append('subject', `Public Complaint regarding ${complaintForm.category}`);
      if (complaintForm.file) {
        formData.append('evidence_file', complaintForm.file);
      }

      await complaintsApi.createWithFile(formData);
      setComplaintSubmitted(true);
      setComplaintForm({ stall: "", category: "sanitation", email: "", description: "", file: null });
    } catch (err: any) {
      alert(err?.detail || err?.message || "Failed to submit complaint. Please try again.");
    } finally {
      setIsSubmittingComplaint(false);
    }
  };

  // State for Historical Explorer
  const [activeCommodity, setActiveCommodity] = useState(STAPLES[1]); // Default Tomato

  // State for Alert Carousel
  const [activeAlertIndex, setActiveAlertIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveAlertIndex(prev => (prev + 1) % ALERTS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const { marketsApi, pricesApi, announcementsApi } = await import('@/lib/api');
        
        // Fetch Announcements
        try {
          const apiAnnouncementsRes: any = await announcementsApi.list({ is_active: 'true' });
          const apiAnnouncements = apiAnnouncementsRes.results || apiAnnouncementsRes;
          setAnnouncements(apiAnnouncements);
        } catch (e) {
          console.error("Failed to load announcements", e);
        }

        // Fetch Markets
        const apiMarketsRes: any = await marketsApi.list();
        const apiMarkets = apiMarketsRes.results || apiMarketsRes;
        
        // Fetch Snapshots (fetch a good chunk to ensure we have recent data)
        const apiSnapshotsRes: any = await pricesApi.snapshots({ page_size: '1000' });
        const apiSnapshots = apiSnapshotsRes.results || apiSnapshotsRes;

        if (apiMarkets.length > 0 && apiSnapshots.length > 0) {
          const lucenaMarket = apiMarkets.find((m: any) => m.name.toLowerCase().includes('lucena'));
          const commodities = Array.from(new Set(apiSnapshots.map((s: any) => s.commodity_name)));
          
          const liveStaples = commodities.map((cName: any) => {
            const commoditySnaps = apiSnapshots.filter((s: any) => s.commodity_name === cName);
            
            const lucenaSnaps = lucenaMarket 
              ? commoditySnaps.filter((s: any) => s.market === lucenaMarket.id).sort((a:any, b:any) => new Date(b.survey_date).getTime() - new Date(a.survey_date).getTime())
              : [];
              
            const currentLucena = lucenaSnaps.length > 0 ? parseFloat(lucenaSnaps[0].prevailing_price) : 0;
            const currentLow = lucenaSnaps.length > 0 ? parseFloat(lucenaSnaps[0].price_min) : 0;
            const currentHigh = lucenaSnaps.length > 0 ? parseFloat(lucenaSnaps[0].price_max) : 0;
            const previousLucena = lucenaSnaps.length > 1 ? parseFloat(lucenaSnaps[1].prevailing_price) : currentLucena;
            
            const regionalSnaps = commoditySnaps.filter((s: any) => s.survey_date === (lucenaSnaps[0]?.survey_date || commoditySnaps[0].survey_date));
            const regionalAvg = regionalSnaps.length > 0 ? regionalSnaps.reduce((acc: number, s: any) => acc + (parseFloat(s.prevailing_price) || 0), 0) / regionalSnaps.length : 0;
            
            const weeklyChange = previousLucena > 0 ? ((currentLucena - previousLucena) / previousLucena) * 100 : 0;
            const status = currentLucena < regionalAvg ? 'below' : currentLucena > regionalAvg ? 'above' : 'near';
            
            const sparkline = lucenaSnaps.slice(0, 7).map((s: any) => parseFloat(s.prevailing_price)).reverse();
            if (sparkline.length === 0) sparkline.push(parseFloat(currentLucena as any) || 0);
            while(sparkline.length < 7 && sparkline.length > 0) sparkline.unshift(sparkline[0]);
            const oldestLucena = lucenaSnaps.length > 1 ? parseFloat(lucenaSnaps[lucenaSnaps.length - 1].prevailing_price) : currentLucena;
            const monthlyChange = oldestLucena > 0 ? ((currentLucena - oldestLucena) / oldestLucena) * 100 : 0;

            return {
              id: cName.toLowerCase().replace(/\s+/g, '-'),
              name: cName,
              price: currentLucena,
              lowPrice: currentLow,
              highPrice: currentHigh,
              regionalAvg: regionalAvg,
              weeklyChange: parseFloat(weeklyChange.toFixed(1)),
              monthlyChange: parseFloat(monthlyChange.toFixed(1)), 
              sparkline: sparkline,
              status: status,
              type: commoditySnaps[0].category_name?.toLowerCase() || 'staple',
              category: commoditySnaps[0].category_name || 'Uncategorized'
            };
          }).filter((s: any) => s.price > 0);

          if (liveStaples.length > 0) {
            setStaples(liveStaples);
            setActiveCommodity(liveStaples[0]);
            
            // Extract unique categories
            const fetchedCategories = Array.from(new Set(liveStaples.map(s => s.category)));
            setCategories(['All', ...fetchedCategories]);
            
            // Initialize active recipe
            setActiveRecipe(RECIPES[0]);
          }

          const liveMarkets = apiMarkets
            .filter((m: any) => !m.name.toLowerCase().includes('lucena') && !m.name.toLowerCase().includes('calabarzon'))
            .map((m: any) => ({ id: m.id.toString(), name: m.name }));
            
          setMarketsData(liveMarkets);
          if (liveMarkets.length > 0) {
            setCompareTarget(liveMarkets[0].id);
          }
        }
      } catch (error) {
        console.error("Failed to load live data, falling back to mock:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // --- DERIVED INTELLIGENCE ---

  // Calculate Ulam Costs
  const getRecipeCost = (recipe: Recipe | null) => {
    let lucenaTotal = 0;
    let compareTotal = 0;
    const mockCompareFactor = compareTarget === 'regional' ? 1 : compareTarget === 'tanza' ? 0.95 : 1.05;

    if (!recipe) return { lucenaTotal: 0, compareTotal: 0, savings: 0, breakdown: [] };

    const breakdown = recipe.ingredients.map(ing => {
      let lucenaPrice = 0;
      let regionalPrice = 0;
      
      if (ing.isPantryStaple) {
        lucenaPrice = ing.fixedCost || 0;
        regionalPrice = ing.fixedCost || 0;
      } else {
        const commodity = staples.find(s => s.name.toLowerCase().includes(ing.commodityName.toLowerCase()) || ing.commodityName.toLowerCase().includes(s.name.toLowerCase()));
        if (commodity) {
          lucenaPrice = commodity.price * ing.quantity;
          regionalPrice = (commodity.regionalAvg * mockCompareFactor) * ing.quantity;
        } else {
          // Fallback if commodity not found
          lucenaPrice = (ing.fixedCost || 50) * ing.quantity;
          regionalPrice = lucenaPrice;
        }
      }
      
      lucenaTotal += lucenaPrice;
      compareTotal += regionalPrice;

      return {
        ...ing,
        lucenaPrice,
        regionalPrice
      };
    });

    return { lucenaTotal, compareTotal, savings: compareTotal - lucenaTotal, breakdown };
  };

  const activeRecipeCost = getRecipeCost(activeRecipe);

  // Generate Comparison Insight
  const generateComparisonInsight = () => {
    if (compareTarget === 'tanza') return "Tanza currently offers cheaper vegetables and pork. Lucena remains competitive on fish and rice. Overall advantage leans slightly to Tanza.";
    return "Lucena outperforms this market heavily in staples and protein. Overall consumer advantage: Lucena.";
  };

  // Generate Budget Plan
  const calculateBudget = () => {
    const b = parseFloat(budget);
    if (isNaN(b) || b < 50) return;
    
    // Recommend recipes that fit budget
    const affordable = RECIPES.map(r => {
      const cost = getRecipeCost(r).lucenaTotal;
      return { recipe: r, cost };
    }).filter(r => r.cost <= b).sort((a,b) => b.cost - a.cost);

    if (affordable.length > 0) {
      setBudgetResult({
        affordable: affordable.slice(0, 3),
        remaining: b - affordable[0].cost,
        message: `With ₱${b}, you can cook ${affordable.length > 1 ? 'meals like ' : ''}${affordable.slice(0, 2).map(a => a.recipe.name).join(' or ')}.`
      });
    } else {
      setBudgetResult({
        affordable: [],
        remaining: b,
        message: `Your budget is a bit low for a full meal. Consider adding ₱${(getRecipeCost(RECIPES[0]).lucenaTotal - b).toFixed(2)}.`
      });
    }
  };

  // Get Today's Sulit Ulam Rankings
  const ulamRankings = RECIPES.map(r => {
    const cost = getRecipeCost(r);
    return { recipe: r, ...cost };
  }).sort((a, b) => a.lucenaTotal - b.lucenaTotal);
  
  const cheapestUlam = ulamRankings[0];
  const expensiveUlam = ulamRankings[ulamRankings.length - 1];
  const bestValueUlam = ulamRankings.slice().sort((a, b) => b.savings - a.savings)[0];

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "var(--font-sans)", color: "var(--text-primary)" }}>
      {/* Premium Navigation */}
      <header style={{ background: "white", borderBottom: "1px solid #E5E7EB", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "12px var(--space-6)", minHeight: 70, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "var(--space-4)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <div style={{ width: 36, height: 36, background: "var(--color-primary)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "var(--color-accent)", fontSize: "var(--text-lg)" }}>
              L
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "var(--text-xl)", color: "var(--color-accent)", letterSpacing: "-0.5px", lineHeight: 1 }}>GeoMarketics</div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>Lucena Consumer Platform</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", background: "#EFF6FF", color: "#1D4ED8", padding: "6px 14px", borderRadius: "var(--radius-full)", fontWeight: 600, fontSize: "var(--text-sm)" }}>
              <MapPin size={16} /> Market: Lucena City
            </div>
            <button onClick={() => setIsComplaintModalOpen(true)} style={{ border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", background: "#DC2626", color: "white", padding: "6px 14px", borderRadius: "var(--radius-full)", fontWeight: 700, fontSize: "var(--text-sm)", textDecoration: "none", transition: "opacity 0.2s" }} onMouseOver={e => e.currentTarget.style.opacity = '0.9'} onMouseOut={e => e.currentTarget.style.opacity = '1'}>
              <AlertCircle size={16} /> File Complaint
            </button>
            <Link href="/login" className="btn btn-ghost btn-sm">Admin Access</Link>
          </div>
        </div>
      </header>

      {/* Section 3: Price Alert Feed (Automated Horizontal Carousel) */}
      <div style={{ background: "#0A1B4A", color: "white", padding: "var(--space-2) 0", overflow: "hidden" }}>
        <style>{`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .marquee-content:hover {
            animation-play-state: paused;
          }
          .ticker-wrapper {
            display: flex;
            gap: var(--space-8);
            align-items: center;
          }
          @media (max-width: 640px) {
            .ticker-wrapper {
              flex-direction: column;
              align-items: flex-start;
              gap: var(--space-2);
            }
          }
        `}</style>
        <div className="ticker-wrapper" style={{ maxWidth: 1400, margin: "0 auto", padding: "0 var(--space-6)" }}>
          <span style={{ fontWeight: 800, color: "var(--color-primary)", textTransform: "uppercase", fontSize: "11px", letterSpacing: "1px", display: "flex", alignItems: "center", whiteSpace: "nowrap", zIndex: 1, background: "#0A1B4A", paddingRight: "var(--space-4)" }}>
            <Bell size={12} style={{ marginRight: 4 }} /> Market Intelligence
          </span>
          <div style={{ flex: 1, position: "relative", height: "20px", overflow: "hidden", display: "flex", alignItems: "center", maskImage: "linear-gradient(to right, transparent, black 10px, black calc(100% - 10px), transparent)", WebkitMaskImage: "-webkit-linear-gradient(left, transparent, black 10px, black calc(100% - 10px), transparent)", width: "100%" }}>
            <div className="marquee-content" style={{ display: "flex", gap: "var(--space-10)", animation: "marquee 30s linear infinite", whiteSpace: "nowrap", paddingLeft: "var(--space-4)" }}>
              {ALERTS.map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)", opacity: 0.9 }}>
                  {a.icon} <span>{a.text}</span>
                </div>
              ))}
              {/* Duplicate for seamless loop */}
              {ALERTS.map((a, i) => (
                <div key={`dup-${i}`} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)", opacity: 0.9 }}>
                  {a.icon} <span>{a.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div style={{
        position: "relative",
        height: "400px",
        width: "100%",
        backgroundImage: "url('/images/lucena_market_hero.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        textAlign: "center",
        overflow: "hidden"
      }}>
        {/* Gradient Overlay for Branding */}
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "linear-gradient(135deg, rgba(17, 41, 107, 0.85) 0%, rgba(255, 203, 5, 0.4) 100%)",
          zIndex: 1
        }}></div>
        
        <div style={{ position: "relative", zIndex: 2, padding: "0 var(--space-6)", maxWidth: "800px" }}>
          <div style={{ 
            display: "inline-block", 
            background: "rgba(255, 203, 5, 0.2)", 
            backdropFilter: "blur(4px)", 
            padding: "6px 16px", 
            borderRadius: "var(--radius-full)", 
            border: "1px solid rgba(255, 203, 5, 0.5)",
            color: "var(--color-primary)", 
            fontWeight: 800, 
            fontSize: "12px", 
            textTransform: "uppercase", 
            letterSpacing: "1px",
            marginBottom: "var(--space-4)"
          }}>
            Welcome to Lucena Public Market
          </div>
          <h1 style={{ color: "white", fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 900, lineHeight: 1.1, marginBottom: "var(--space-4)", letterSpacing: "-1px", textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}>
            Freshness You Can Trust,<br/>Prices You Can Verify.
          </h1>
          <p style={{ color: "white", fontSize: "clamp(16px, 2vw, 20px)", opacity: 0.9, marginBottom: "var(--space-6)", fontWeight: 500, textShadow: "0 1px 4px rgba(0,0,0,0.2)" }}>
            Explore today's best deals, navigate stalls instantly, and ensure fair pricing.
          </p>
          
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <button 
              onClick={() => document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth' })}
              style={{ background: "var(--color-primary)", color: "var(--color-accent)", padding: "14px 28px", borderRadius: "var(--radius-full)", fontWeight: 800, fontSize: "16px", transition: "transform 0.2s, box-shadow 0.2s", boxShadow: "0 4px 15px rgba(255, 203, 5, 0.4)" }}
              onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              Shop Today's Deals
            </button>
            <button 
              onClick={() => document.getElementById('market-navigator')?.scrollIntoView({ behavior: 'smooth' })}
              style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)", color: "white", border: "1px solid rgba(255,255,255,0.3)", padding: "14px 28px", borderRadius: "var(--radius-full)", fontWeight: 800, fontSize: "16px", transition: "background 0.2s" }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              Open Market Map
            </button>
          </div>
        </div>
      </div>

      <main style={{ maxWidth: 1400, margin: "0 auto", padding: "var(--space-8) var(--space-6)" }}>
        
        {/* ANNOUNCEMENTS: All at Once Grid */}
        {announcements.length > 0 && (() => {
          const priorityConfig: Record<string, { bg: string; border: string; badge: string; icon: any; label: string }> = {
            high: { bg: 'linear-gradient(135deg, #FEF2F2 0%, #FFF7ED 100%)', border: '#F87171', badge: '#DC2626', icon: AlertTriangle, label: 'Urgent' },
            medium: { bg: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)', border: '#FBBF24', badge: '#D97706', icon: Bell, label: 'Notice' },
            low: { bg: 'linear-gradient(135deg, #EFF6FF 0%, #E0F2FE 100%)', border: '#60A5FA', badge: '#2563EB', icon: Info, label: 'Info' },
          };
          const categoryIcons: Record<string, any> = {
            schedule: Calendar, holiday: Star, inspection: Shield, advisory: AlertCircle, general: Megaphone
          };

          return (
            <div style={{ marginBottom: 'var(--space-8)' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--color-accent)', margin: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Bell size={20} color="var(--color-primary)" />
                  Market Announcements
                  <span style={{ background: '#DC2626', color: 'white', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '999px', marginLeft: 4 }}>
                    {announcements.length}
                  </span>
                </h2>
              </div>

              {/* Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
                {announcements.map((ann: any) => {
                  const cfg = priorityConfig[ann?.priority ?? 'low'] ?? priorityConfig.low;
                  const AnnIcon = categoryIcons[ann?.category] ?? Megaphone;
                  return (
                    <div key={ann.id}
                      style={{ position: 'relative', background: cfg.bg, borderRadius: 16, border: `1.5px solid ${cfg.border}`, padding: '20px 24px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                      onClick={() => setExpandedAnnouncement(expandedAnnouncement === ann.id ? null : ann.id)}
                      onMouseOver={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; }}
                      onMouseOut={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'; }}
                    >
                      {/* Decorative glow */}
                      <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: `${cfg.border}20`, pointerEvents: 'none' }} />

                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, position: 'relative' }}>
                        {/* Icon */}
                        <div style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 12, background: cfg.badge, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 10px ${cfg.badge}44` }}>
                          <AnnIcon size={20} color="white" />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Badges */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                            <span style={{ background: cfg.badge, color: 'white', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{cfg.label}</span>
                            <span style={{ background: 'rgba(0,0,0,0.07)', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', textTransform: 'capitalize' }}>{ann.category}</span>
                            {ann.start_date && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                                <Clock size={10} /> {new Date(ann.start_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>

                          {/* Title */}
                          <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)', marginBottom: 5, lineHeight: 1.3 }}>{ann.title}</div>

                          {/* Content — expandable */}
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, overflow: 'hidden', maxHeight: expandedAnnouncement === ann.id ? '300px' : '38px', transition: 'max-height 0.4s ease' }}>
                            {ann.content}
                          </div>

                          <div style={{ marginTop: 8, fontSize: '12px', fontWeight: 700, color: cfg.badge }}>
                            {expandedAnnouncement === ann.id ? 'Show less ▲' : 'Read more ▼'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        
        {/* Section 1: Today's Lucena Market Snapshot */}
        <div style={{ marginBottom: "var(--space-10)" }}>
          <div style={{ marginBottom: "var(--space-4)" }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
              <h2 style={{ fontSize: "var(--text-2xl)", fontWeight: 800, color: "var(--color-accent)", margin: 0 }}>Today's Lucena Market</h2>
              <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", fontWeight: 600 }}>Live Affordability Indicators</span>
            </div>
            
            {/* Visual Category Navigation */}
            <div id="categories" style={{ position: "relative", display: "flex", alignItems: "center", margin: "0 -8px", padding: "0 8px", marginBottom: "var(--space-6)" }}>
              <button 
                onClick={() => document.getElementById('category-scroll')?.scrollBy({ left: -300, behavior: 'smooth' })} 
                style={{ position: "absolute", left: -8, zIndex: 10, background: "white", border: "1px solid #E5E7EB", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}
              >
                <ChevronLeft size={20} color="var(--text-secondary)" />
              </button>

              <div id="category-scroll" className="category-scroll-container" style={{ 
                display: "flex", 
                gap: "var(--space-4)", 
                padding: "8px 20px",
                overflowX: "auto",
                scrollbarWidth: "none",
                WebkitOverflowScrolling: "touch",
                width: "100%"
              }}>
                <style>{`.category-scroll-container::-webkit-scrollbar { display: none; }`}</style>
                {categories.map(cat => {
                  let bgImage = "url('/images/lucena_market_hero.png')";
                  if (cat.toLowerCase().includes('protein') || cat.toLowerCase().includes('meat') || cat.toLowerCase().includes('fish') || cat.toLowerCase().includes('pork')) bgImage = "url('/images/cat_protein.png')";
                  else if (cat.toLowerCase().includes('vegetable')) bgImage = "url('/images/cat_vegetable.png')";
                  else if (cat.toLowerCase().includes('staple') || cat.toLowerCase().includes('rice') || cat.toLowerCase().includes('corn') || cat.toLowerCase().includes('grain')) bgImage = "url('/images/cat_staple.png')";

                  return (
                    <button 
                      key={cat} 
                      onClick={() => handleCategoryChange(cat)}
                      style={{ 
                        position: "relative",
                        width: "160px",
                        height: "100px",
                        borderRadius: "var(--radius-lg)",
                        overflow: "hidden",
                        border: activeCategory === cat ? "3px solid var(--color-primary)" : "none",
                        boxShadow: activeCategory === cat ? "0 4px 15px rgba(255, 203, 5, 0.4)" : "0 2px 8px rgba(0,0,0,0.1)",
                        cursor: "pointer",
                        flexShrink: 0,
                        transition: "transform 0.2s, box-shadow 0.2s"
                      }}
                      onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundImage: bgImage, backgroundSize: "cover", backgroundPosition: "center", filter: activeCategory === cat ? "brightness(0.9)" : "brightness(0.6)", transition: "filter 0.2s" }}></div>
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: activeCategory === cat ? "linear-gradient(to top, rgba(17, 41, 107, 0.9), transparent)" : "linear-gradient(to top, rgba(0,0,0,0.8), transparent)" }}></div>
                      <span style={{ position: "absolute", bottom: "12px", left: "12px", color: "white", fontWeight: 800, fontSize: "16px", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>{cat}</span>
                    </button>
                  );
                })}
              </div>

              <button 
                onClick={() => document.getElementById('category-scroll')?.scrollBy({ left: 300, behavior: 'smooth' })} 
                style={{ position: "absolute", right: -8, zIndex: 10, background: "white", border: "1px solid #E5E7EB", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}
              >
                <ChevronRight size={20} color="var(--text-secondary)" />
              </button>
            </div>
          </div>
          
          <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
            {(() => {
              const filteredStaples = activeCategory === 'All' ? staples : staples.filter(s => s.category === activeCategory || s.type === activeCategory.toLowerCase());
              const totalPages = Math.ceil(filteredStaples.length / itemsPerPage);
              const paginatedStaples = filteredStaples.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
              return (
                <>
                  {paginatedStaples.map(item => (
              <div key={item.id} className="card" style={{ padding: "var(--space-5)", display: "flex", flexDirection: "column", borderTop: `4px solid ${item.price === 0 ? '#9CA3AF' : item.status === 'below' ? '#16A34A' : item.status === 'above' ? '#DC2626' : '#EAB308'}`, width: "200px", flexShrink: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-2)" }}>
                  <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--text-secondary)" }}>{item.name}</div>
                  <Bookmark size={16} color="var(--text-muted)" style={{ cursor: "pointer" }} />
                </div>
                
                <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)", marginBottom: "var(--space-1)", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "var(--text-4xl)", fontWeight: 900, color: "var(--color-accent)", letterSpacing: "-1.5px" }}>{item.price > 0 ? `₱${item.price}` : "N/A"}</span>
                  {(item.lowPrice > 0 && item.highPrice > 0 && item.lowPrice !== item.highPrice) && (
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 700 }}>
                      (₱{item.lowPrice} - ₱{item.highPrice})
                    </span>
                  )}
                </div>
                
                {/* Affordability Badge */}
                {item.price > 0 ? (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: item.status === 'below' ? '#F0FDF4' : item.status === 'above' ? '#FEF2F2' : '#FEFCE8', color: item.status === 'below' ? '#166534' : item.status === 'above' ? '#7F1D1D' : '#854D0E', padding: "4px 8px", borderRadius: 4, fontSize: "11px", fontWeight: 700, textTransform: "uppercase", marginBottom: "var(--space-4)", alignSelf: "flex-start" }}>
                    <div style={{ width: 6, height: 6, borderRadius: 3, background: item.status === 'below' ? '#16A34A' : item.status === 'above' ? '#DC2626' : '#EAB308' }} />
                    {item.status === 'below' ? 'Lower than Avg' : item.status === 'above' ? 'Higher than Avg' : 'Near Average'}
                  </div>
                ) : (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: '#F3F4F6', color: '#4B5563', padding: "4px 8px", borderRadius: 4, fontSize: "11px", fontWeight: 700, textTransform: "uppercase", marginBottom: "var(--space-4)", alignSelf: "flex-start" }}>
                    <div style={{ width: 6, height: 6, borderRadius: 3, background: '#9CA3AF' }} />
                    No Data Today
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-muted)", marginBottom: "var(--space-2)" }}>
                  <span>1W: <span style={{ color: item.weeklyChange > 0 ? '#DC2626' : '#16A34A' }}>{item.weeklyChange > 0 ? '+' : ''}{item.weeklyChange}%</span></span>
                  <span>1M: <span style={{ color: item.monthlyChange > 0 ? '#DC2626' : '#16A34A' }}>{item.monthlyChange > 0 ? '+' : ''}{item.monthlyChange}%</span></span>
                </div>

                <div style={{ height: 40, width: "100%", marginTop: "auto" }}>
                  {isMounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={item.sparkline.map((v: number, i: number) => ({ val: v, idx: i }))}>
                      <Line type="monotone" dataKey="val" stroke={item.status === 'above' ? '#DC2626' : item.status === 'below' ? '#16A34A' : '#EAB308'} strokeWidth={2} dot={false} isAnimationActive={false} />
                      <YAxis domain={['dataMin - 5', 'dataMax + 5']} hide />
                    </LineChart>
                  </ResponsiveContainer>
                  ) : <div style={{ height: "100%", width: "100%" }} />}
                </div>

                <button 
                  style={{ marginTop: "var(--space-3)", width: "100%", padding: "8px", background: "#F3F4F6", color: "var(--text-primary)", border: "none", borderRadius: "6px", fontWeight: 700, fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                  onClick={() => {
                    const catMatches = mapStalls.filter(s => s.category.toLowerCase().includes(item.type.toLowerCase()) || s.category.toLowerCase().includes(item.category.toLowerCase()));
                    setMapSearch(item.name);
                    if (catMatches.length > 0) {
                      setSelectedMapStallId(catMatches[0].id);
                    } else {
                      setSelectedMapStallId(null);
                    }
                    setHighlightedMapStallIds([]);
                    setNavigationRoute(null);
                    document.getElementById('market-navigator')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <MapPin size={14} /> Find in Market
                </button>
              </div>
                  ))}
                </>
              );
            })()}
          </div>

          {/* Pagination Controls */}
          {(() => {
            const filteredStaples = activeCategory === 'All' ? staples : staples.filter(s => s.category === activeCategory || s.type === activeCategory.toLowerCase());
            const totalPages = Math.ceil(filteredStaples.length / itemsPerPage);
            if (totalPages > 1) {
              return (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "var(--space-2)", marginTop: "var(--space-6)", flexWrap: "wrap" }}>
                  <button 
                    disabled={currentPage === 1} 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    style={{ padding: "8px 16px", borderRadius: "var(--radius-md)", border: "1px solid #E2E8F0", background: currentPage === 1 ? "#F3F4F6" : "white", color: currentPage === 1 ? "#9CA3AF" : "var(--text-primary)", cursor: currentPage === 1 ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "var(--text-sm)", transition: "all 0.2s" }}
                  >
                    Prev
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      style={{
                        width: 36,
                        height: 36,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid",
                        borderColor: currentPage === page ? "var(--color-primary)" : "#E2E8F0",
                        background: currentPage === page ? "var(--color-primary)" : "white",
                        color: currentPage === page ? "var(--color-accent)" : "var(--text-primary)",
                        fontWeight: 700,
                        fontSize: "var(--text-sm)",
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      {page}
                    </button>
                  ))}

                  <button 
                    disabled={currentPage === totalPages} 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    style={{ padding: "8px 16px", borderRadius: "var(--radius-md)", border: "1px solid #E2E8F0", background: currentPage === totalPages ? "#F3F4F6" : "white", color: currentPage === totalPages ? "#9CA3AF" : "var(--text-primary)", cursor: currentPage === totalPages ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "var(--text-sm)", transition: "all 0.2s" }}
                  >
                    Next
                  </button>
                </div>
              );
            }
            return null;
          })()}
        </div>
        {/* NEW SECTION: Market Navigator */}
        <div id="market-navigator" style={{ marginBottom: "var(--space-10)" }}>
          <h2 style={{ fontSize: "var(--text-2xl)", fontWeight: 800, color: "var(--color-accent)", margin: "0 0 var(--space-4) 0", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <Map size={24} color="var(--color-primary)" /> Market Navigator
          </h2>
          <style>{`
            .market-nav-grid {
              display: grid;
              grid-template-columns: 280px 1fr;
              gap: var(--space-6);
              height: 650px;
            }
            .mobile-close-btn { display: none; }
            .market-nav-left-panel { height: 100%; min-height: 0; }
            
            @media (max-width: 900px) {
              .market-nav-grid {
                display: flex;
                flex-direction: column;
                height: 700px;
              }
              .market-nav-left-panel {
                height: auto !important;
                max-height: ${isMobilePanelExpanded ? "450px" : "80px"} !important;
                transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: ${isMobilePanelExpanded ? "0 10px 25px rgba(0,0,0,0.1)" : "none"};
              }
              .mobile-close-btn { 
                display: ${isMobilePanelExpanded ? "flex" : "none"} !important; 
              }
            }
          `}</style>
          <div className="market-nav-grid">
            {/* Left Panel: Intelligence Cards & Routing */}
            <div className="card market-nav-left-panel" style={{ padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-4)", overflow: "hidden", zIndex: 2, background: "white" }}>
              <div style={{ position: "relative" }}>
                <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input 
                  type="text" 
                  placeholder="Search product, vendor, or stall..." 
                  value={mapSearch}
                  onChange={(e) => setMapSearch(e.target.value)}
                  onFocus={() => setIsMobilePanelExpanded(true)}
                  style={{ width: "100%", padding: "10px 36px 10px 36px", borderRadius: "var(--radius-md)", border: "1px solid #E2E8F0", fontSize: "14px" }}
                />
                <button 
                  className="mobile-close-btn"
                  onClick={(e) => { e.stopPropagation(); setIsMobilePanelExpanded(false); }}
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", alignItems: "center", justifyContent: "center", padding: 4 }}
                >
                  <X size={16} />
                </button>
              </div>

              {navigationRoute && (
                <div style={{ background: "#F0FDF4", padding: "var(--space-4)", borderRadius: "var(--radius-md)", border: "1px solid #BBF7D0", flexShrink: 0 }}>
                  <div style={{ fontSize: "11px", fontWeight: 800, color: "#166534", textTransform: "uppercase", marginBottom: "8px" }}>Recommended Route</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", fontWeight: 600, color: "#14532D" }}>
                    {navigationRoute.points.map((p, i) => (
                      <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: 8, height: 8, borderRadius: 4, background: i === 0 ? "#10B981" : "#EF4444" }} />
                          {p.label}
                        </div>
                        {i < navigationRoute.points.length - 1 && (
                          <div style={{ paddingLeft: 3, margin: "2px 0", color: "#86EFAC" }}>↓</div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: "12px", paddingTop: "8px", borderTop: "1px dashed #BBF7D0", fontSize: "12px", fontWeight: 700, color: "#166534" }}>
                    Est. Walking Distance: ~{navigationRoute.totalDistanceMeters}m
                  </div>
                </div>
              )}

              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "var(--space-3)", paddingRight: 4 }}>
                {(() => {
                  const query = mapSearch.toLowerCase();
                  const results = query 
                    ? mapStalls.filter(s => s.vendor.toLowerCase().includes(query) || s.category.toLowerCase().includes(query) || s.number.toLowerCase().includes(query))
                    : mapStalls.slice(0, 10); // Show some defaults
                  
                  if (results.length === 0) return <div style={{ fontSize: "14px", color: "var(--text-muted)", textAlign: "center", padding: "20px" }}>No stalls found.</div>;
                  
                  return results.map(stall => (
                    <div key={stall.id} style={{ padding: "var(--space-4)", background: "white", borderRadius: "var(--radius-md)", border: selectedMapStallId === stall.id ? "2px solid var(--color-primary)" : "1px solid #E2E8F0", cursor: "pointer", flexShrink: 0 }} onClick={() => setSelectedMapStallId(stall.id)}>
                      <div style={{ fontSize: "12px", fontWeight: 800, color: "var(--color-primary)", marginBottom: 4 }}>STALL {stall.number}</div>
                      <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>{stall.vendor !== "—" ? stall.vendor : "Vacant Stall"}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: 4 }}><span style={{ fontWeight: 700 }}>Category:</span> {stall.category}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: 12 }}><span style={{ fontWeight: 700 }}>Products:</span> Assorted {stall.category.toLowerCase()}</div>
                      <button className="btn btn-ghost" style={{ width: "100%", padding: "6px", fontSize: "12px", background: "#F1F5F9" }} onClick={(e) => { e.stopPropagation(); setSelectedMapStallId(stall.id); }}>
                        View on Map
                      </button>
                    </div>
                  ));
                })()}
              </div>

              {/* Map Legend */}
              <div style={{ flexShrink: 0, borderTop: "1px solid #E2E8F0", paddingTop: "var(--space-3)" }}>
                <div style={{ fontSize: "10px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "var(--space-2)", display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: 2, background: "var(--color-primary)" }} />
                  Map Legend
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px" }}>
                  {getLegendEntries("stall_status").map((entry) => (
                    <div key={entry.key} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, flexShrink: 0, background: entry.color, border: `2px solid ${entry.border}` }} />
                      <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-secondary)", lineHeight: 1.2 }}>{entry.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Panel: Interactive Map */}
            <div style={{ borderRadius: "var(--radius-lg)", overflow: "hidden", border: "1px solid #E2E8F0", background: "white", minHeight: 0, height: "100%", display: "flex" }}>
              <div style={{ flex: 1, width: "100%", height: "100%" }}>
                <MarketMap 
                stalls={mapStalls} 
                selectedStallId={selectedMapStallId} 
                highlightedStallIds={highlightedMapStallIds}
                navigationRoute={navigationRoute}
                onStallSelect={(s) => setSelectedMapStallId(s ? s.id : null)}
                onGetDirections={(stall) => {
                  setNavigationRoute({
                    points: [
                      { x: 3900, y: 4900, label: "Entrance" },
                      { x: stall.svg_x, y: stall.svg_y, label: `Stall ${stall.number} (${stall.vendor})` }
                    ],
                    totalDistanceMeters: Math.floor(Math.sqrt(Math.pow(stall.svg_x - 3900, 2) + Math.pow(stall.svg_y - 4900, 2)) / 50)
                  });
                }}
                showAdminLayers={false}
                hideFloatingControls={true}
                unifiedFloorView={true}
                padding={{ top: 20, right: 20, bottom: 20, left: 20 }}
              />
              </div>
            </div>
          </div>
        </div>


        {/* Multi-Column Layout for Middle Sections */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 400px), 1fr))", gap: "var(--space-8)", marginBottom: "var(--space-10)" }}>
          
          {/* Left Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
            
            {/* Section 4: Lucena Price Fairness Index™ & Best Deals */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 350px), 1fr))", gap: "var(--space-6)", marginBottom: "var(--space-8)" }}>
          
          <div className="card" style={{ padding: "var(--space-6)", background: "linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)", border: "1px solid #E2E8F0", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", fontWeight: 800, color: "var(--text-muted)", letterSpacing: "1px", marginBottom: "var(--space-4)" }}>
              Signature Metric
            </div>
            <div style={{ marginBottom: "var(--space-2)" }}>
              <span style={{ fontSize: "64px", fontWeight: 900, color: "var(--color-accent)", lineHeight: 1, letterSpacing: "-2px" }}>87</span>
              <span style={{ fontSize: "var(--text-xl)", color: "var(--text-muted)", fontWeight: 700 }}>/100</span>
            </div>
            <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 800, color: "#16A34A", margin: "0 0 var(--space-1) 0" }}>Fair Market Pricing</h2>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
              Lucena Prices Index™ indicates generally affordable staple goods and stable protein prices compared to the regional average, despite some volatility in vegetables.
            </p>
          </div>

          <div className="card" style={{ padding: "var(--space-6)" }}>
            <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 800, color: "var(--color-accent)", margin: "0 0 var(--space-4) 0", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <Star size={18} color="var(--color-primary)" fill="var(--color-primary)" /> Best Deals Today (Lucena Rank)
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)" }}>
              <div style={{ padding: "var(--space-4)", background: "#F0FDF4", borderRadius: "var(--radius-md)", borderLeft: "4px solid #16A34A" }}>
                <div style={{ fontSize: "var(--text-xs)", color: "#166534", fontWeight: 700, textTransform: "uppercase" }}>🏆 #1 Cheapest</div>
                <div style={{ fontSize: "var(--text-xl)", fontWeight: 800, color: "#166534", marginTop: 4 }}>Tilapia</div>
                <div style={{ fontSize: "var(--text-sm)", color: "#15803D", marginTop: 2 }}>in the Region</div>
              </div>
              <div style={{ padding: "var(--space-4)", background: "#EFF6FF", borderRadius: "var(--radius-md)", borderLeft: "4px solid #2563EB" }}>
                <div style={{ fontSize: "var(--text-xs)", color: "#1E3A8A", fontWeight: 700, textTransform: "uppercase" }}>🏆 #2 Cheapest</div>
                <div style={{ fontSize: "var(--text-xl)", fontWeight: 800, color: "#1E3A8A", marginTop: 4 }}>Garlic</div>
                <div style={{ fontSize: "var(--text-sm)", color: "#1D4ED8", marginTop: 2 }}>in the Region</div>
              </div>
              <div style={{ padding: "var(--space-4)", background: "#FDF4FF", borderRadius: "var(--radius-md)", borderLeft: "4px solid #C026D3" }}>
                <div style={{ fontSize: "var(--text-xs)", color: "#86198F", fontWeight: 700, textTransform: "uppercase" }}>🏆 #3 Cheapest</div>
                <div style={{ fontSize: "var(--text-xl)", fontWeight: 800, color: "#86198F", marginTop: 4 }}>Rice</div>
                <div style={{ fontSize: "var(--text-sm)", color: "#A21CAF", marginTop: 2 }}>in the Region</div>
              </div>
            </div>
          </div>

        </div>

        {/* NEW SECTION: What Changed This Week? */}
        <div style={{ marginBottom: "var(--space-10)" }}>
          <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 800, color: "var(--color-accent)", margin: "0 0 var(--space-4) 0", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <Activity size={20} color="var(--color-primary)" /> What Changed This Week?
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)" }}>
            {(() => {
              if (!staples.length) return null;
              const increases = staples.filter(s => s.weeklyChange > 0).sort((a, b) => b.weeklyChange - a.weeklyChange);
              const decreases = staples.filter(s => s.weeklyChange < 0).sort((a, b) => a.weeklyChange - b.weeklyChange);
              
              const biggestIncrease = increases.length > 0 ? increases[0] : null;
              const biggestDecrease = decreases.length > 0 ? decreases[0] : null;
              
              const sortedByVolatility = [...staples].filter(s => Math.abs(s.weeklyChange) > 0).sort((a, b) => Math.abs(b.weeklyChange) - Math.abs(a.weeklyChange));
              const mostVolatile = sortedByVolatility.length > 0 ? sortedByVolatility[0] : null;
              
              const sortedByStability = [...staples].sort((a, b) => Math.abs(a.weeklyChange) - Math.abs(b.weeklyChange));
              const mostStable = sortedByStability[0];

              const formatName = (item: any) => {
                if (!item || !item.name) return '';
                if (!item.category) return item.name;
                
                const catLower = item.category.toLowerCase();
                if (catLower.includes('imported commercial rice')) return `${item.name} (Imported Rice)`;
                if (catLower.includes('local commercial rice')) return `${item.name} (Local Rice)`;
                return item.name;
              };

              return (
                <>
                  <div style={{ padding: "var(--space-4)", background: "white", borderRadius: "var(--radius-md)", border: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#FEE2E2", color: "#DC2626", display: "flex", alignItems: "center", justifyContent: "center" }}><TrendingUp size={20} /></div>
                    <div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>Biggest Increase</div>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{biggestIncrease ? `${formatName(biggestIncrease)} (+${biggestIncrease.weeklyChange}%)` : 'No increases'}</div>
                    </div>
                  </div>
                  <div style={{ padding: "var(--space-4)", background: "white", borderRadius: "var(--radius-md)", border: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#DCFCE7", color: "#16A34A", display: "flex", alignItems: "center", justifyContent: "center" }}><TrendingDown size={20} /></div>
                    <div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>Biggest Decrease</div>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{biggestDecrease ? `${formatName(biggestDecrease)} (${biggestDecrease.weeklyChange}%)` : 'No decreases'}</div>
                    </div>
                  </div>
                  <div style={{ padding: "var(--space-4)", background: "white", borderRadius: "var(--radius-md)", border: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#F3F4F6", color: "#4B5563", display: "flex", alignItems: "center", justifyContent: "center" }}><Minus size={20} /></div>
                    <div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>Most Stable</div>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{mostStable.weeklyChange === 0 ? `${formatName(mostStable)} (Unchanged)` : formatName(mostStable)}</div>
                    </div>
                  </div>
                  <div style={{ padding: "var(--space-4)", background: "white", borderRadius: "var(--radius-md)", border: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#FEF3C7", color: "#D97706", display: "flex", alignItems: "center", justifyContent: "center" }}><Activity size={20} /></div>
                    <div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>High Volatility</div>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{mostVolatile ? formatName(mostVolatile) : 'Stable Market'}</div>
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        </div>

        {/* Section 2: Smart Ulam Calculator */}
            <div className="card" style={{ border: "1px solid var(--color-primary)" }}>
              <div className="card-header" style={{ background: "var(--color-primary-pale)", borderBottom: "1px solid #FDE047", padding: "var(--space-4) var(--space-5)" }}>
                <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 800, color: "var(--color-accent)", margin: 0, display: "flex", alignItems: "center", gap: "var(--space-2)" }}><ChefHat size={18} /> Smart Ulam Calculator</h3>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--color-accent)", opacity: 0.8, marginTop: 2 }}>Select a dish to see cooking cost using today's prices</div>
              </div>
              <div className="card-body" style={{ padding: "var(--space-5)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-2)", marginBottom: "var(--space-6)" }}>
                  {RECIPES.map(recipe => (
                    <button 
                      key={recipe.id}
                      onClick={() => setActiveRecipe(recipe)}
                      style={{
                        padding: "8px", 
                        background: activeRecipe?.id === recipe.id ? "var(--color-primary)" : "#F8FAFC", 
                        border: activeRecipe?.id === recipe.id ? "2px solid var(--color-accent)" : "1px solid #E2E8F0",
                        borderRadius: "var(--radius-md)",
                        cursor: "pointer",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
                        transition: "all 0.2s"
                      }}
                    >
                      <span style={{ fontSize: "24px" }}>{recipe.image}</span>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: activeRecipe?.id === recipe.id ? "var(--color-accent)" : "var(--text-secondary)", textAlign: "center", lineHeight: 1.2 }}>{recipe.name}</span>
                    </button>
                  ))}
                </div>

                {activeRecipe && (
                  <div style={{ background: "#F8FAFC", padding: "var(--space-5)", borderRadius: "var(--radius-md)", border: "1px solid #E2E8F0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E2E8F0", paddingBottom: "var(--space-3)", marginBottom: "var(--space-3)" }}>
                      <h4 style={{ margin: 0, fontSize: "var(--text-md)", fontWeight: 800, color: "var(--text-primary)" }}>{activeRecipe.name}</h4>
                      <div style={{ fontSize: "var(--text-xl)", fontWeight: 900, color: "var(--color-primary)" }}>₱{activeRecipeCost.lucenaTotal.toFixed(2)}</div>
                    </div>
                    
                    <div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginBottom: "var(--space-4)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span>Regional Average Cost:</span>
                        <span style={{ fontWeight: 600 }}>₱{activeRecipeCost.compareTotal.toFixed(2)}</span>
                      </div>
                      {activeRecipeCost.savings > 0 ? (
                        <div style={{ color: "#166534", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                          <CheckCircle size={14} /> You save ₱{activeRecipeCost.savings.toFixed(2)} in Lucena
                        </div>
                      ) : activeRecipeCost.savings < 0 ? (
                        <div style={{ color: "#DC2626", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                          <AlertCircle size={14} /> ₱{Math.abs(activeRecipeCost.savings).toFixed(2)} more expensive
                        </div>
                      ) : (
                        <div style={{ color: "var(--text-muted)", fontWeight: 700 }}>Matches regional average</div>
                      )}
                    </div>

                    <div>
                      <div style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 800, color: "var(--text-muted)", marginBottom: 8 }}>Ingredient Breakdown</div>
                      {activeRecipeCost.breakdown.map((ing, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "4px 0", borderBottom: "1px dashed #E2E8F0" }}>
                          <span style={{ color: "var(--text-primary)" }}>{ing.quantity} {ing.unit} {ing.commodityName}</span>
                          <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>₱{ing.lucenaPrice.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <button 
                      style={{ marginTop: "var(--space-4)", width: "100%", padding: "10px", background: "var(--color-primary)", color: "var(--color-accent)", border: "none", borderRadius: "6px", fontWeight: 800, fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                      onClick={() => {
                        const ENTRANCE = { x: 3900, y: 4900, label: "Entrance" };
                        let currentPos: { x: number, y: number } = ENTRANCE;
                        let dist = 0;
                        const routePoints = [ENTRANCE];
                        const highlighted: string[] = [];

                        activeRecipeCost.breakdown.forEach(ing => {
                          const query = ing.commodityName.toLowerCase();
                          // Find stalls that match this ingredient's category
                          const matches = mapStalls.filter(s => s.category.toLowerCase().includes(query) || s.vendor.toLowerCase().includes(query));
                          if (matches.length > 0) {
                            // Find nearest matching stall to currentPos
                            const nearest = matches.reduce((prev, curr) => {
                              const dPrev = Math.sqrt(Math.pow(prev.svg_x - currentPos.x, 2) + Math.pow(prev.svg_y - currentPos.y, 2));
                              const dCurr = Math.sqrt(Math.pow(curr.svg_x - currentPos.x, 2) + Math.pow(curr.svg_y - currentPos.y, 2));
                              return dCurr < dPrev ? curr : prev;
                            });

                            dist += Math.floor(Math.sqrt(Math.pow(nearest.svg_x - currentPos.x, 2) + Math.pow(nearest.svg_y - currentPos.y, 2)) / 50);
                            routePoints.push({ x: nearest.svg_x, y: nearest.svg_y, label: `${ing.commodityName} (Stall ${nearest.number})` });
                            highlighted.push(nearest.id);
                            currentPos = { x: nearest.svg_x, y: nearest.svg_y };
                          }
                        });

                        setNavigationRoute({ points: routePoints, totalDistanceMeters: dist });
                        setHighlightedMapStallIds(highlighted);
                        setMapSearch(""); // Clear search to show the route instructions
                        setSelectedMapStallId(null);
                        document.getElementById('market-navigator')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      <MapPin size={16} /> Find Ingredients in Market
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* WOW Feature: Today's Sulit Ulam & Budget Planner */}
            <div className="card">
              <div className="card-header" style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid #E5E7EB" }}>
                <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 800, color: "var(--color-accent)", margin: 0, display: "flex", alignItems: "center", gap: "var(--space-2)" }}><Utensils size={18} /> Today's Sulit Ulam</h3>
              </div>
              <div className="card-body" style={{ padding: "var(--space-5)" }}>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
                  <div style={{ background: "#F0FDF4", padding: "12px", borderRadius: "8px", border: "1px solid #DCFCE7" }}>
                    <div style={{ fontSize: "11px", color: "#166534", fontWeight: 800, textTransform: "uppercase", marginBottom: 4 }}>🟢 Cheapest Dish</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#14532D" }}>{cheapestUlam?.recipe.name}</div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#16A34A", marginTop: 2 }}>₱{cheapestUlam?.lucenaTotal.toFixed(2)}</div>
                  </div>
                  <div style={{ background: "#EFF6FF", padding: "12px", borderRadius: "8px", border: "1px solid #BFDBFE" }}>
                    <div style={{ fontSize: "11px", color: "#1D4ED8", fontWeight: 800, textTransform: "uppercase", marginBottom: 4 }}>🟡 Best Value</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#1E3A8A" }}>{bestValueUlam?.recipe.name}</div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#2563EB", marginTop: 2 }}>Saves ₱{bestValueUlam?.savings.toFixed(2)}</div>
                  </div>
                  <div style={{ background: "#FEF2F2", padding: "12px", borderRadius: "8px", border: "1px solid #FECACA", gridColumn: "span 2" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: "11px", color: "#DC2626", fontWeight: 800, textTransform: "uppercase", marginBottom: 4 }}>🔴 Most Expensive</div>
                        <div style={{ fontSize: "16px", fontWeight: 800, color: "#991B1B" }}>{expensiveUlam?.recipe.name}</div>
                      </div>
                      <div style={{ fontSize: "20px", fontWeight: 800, color: "#DC2626" }}>₱{expensiveUlam?.lucenaTotal.toFixed(2)}</div>
                    </div>
                  </div>
                </div>

                {/* Grocery Budget Planner (Enhanced) */}
                <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: "var(--space-5)" }}>
                  <h4 style={{ fontSize: "14px", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 12px 0", display: "flex", alignItems: "center", gap: "8px" }}><Calculator size={16} /> Budget Meal Planner</h4>
                  <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
                    <div style={{ display: "flex", alignItems: "center", background: "#F3F4F6", borderRadius: "var(--radius-md)", padding: "0 var(--space-3)", flex: 1 }}>
                      <span style={{ fontWeight: 800, color: "var(--text-muted)", marginRight: 8 }}>₱</span>
                      <input type="number" value={budget} onChange={e => setBudget(e.target.value)} style={{ border: "none", background: "transparent", outline: "none", width: "100%", padding: "10px 0", fontWeight: 700, fontSize: "16px" }} />
                    </div>
                    <button className="btn btn-primary" onClick={calculateBudget}>Plan</button>
                  </div>
                  {budgetResult && (
                    <div style={{ background: "#F8FAFC", padding: "var(--space-4)", borderRadius: "var(--radius-md)", border: "1px solid #E2E8F0" }}>
                      <div style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 600, marginBottom: "12px", lineHeight: 1.5 }}>
                        {budgetResult.message}
                      </div>
                      {budgetResult.affordable && budgetResult.affordable.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {budgetResult.affordable.map((a: any, i: number) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "white", padding: "8px 12px", borderRadius: "6px", border: "1px solid #E5E7EB" }}>
                              <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-secondary)" }}>{a.recipe.image} {a.recipe.name}</span>
                              <span style={{ fontSize: "14px", fontWeight: 800, color: "var(--text-primary)" }}>₱{a.cost.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {budgetResult.affordable && budgetResult.affordable.length > 0 && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed #CBD5E1", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: 600 }}>Estimated Change</span>
                          <span style={{ fontSize: "16px", color: "#16A34A", fontWeight: 800 }}>₱{budgetResult.remaining.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>
            </div>

          </div>

          {/* Right Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
            
            {/* Section 7: Historical Price Intelligence */}
            <div className="card" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div className="card-header" style={{ padding: "var(--space-5)", borderBottom: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 800, color: "var(--color-accent)", margin: 0, display: "flex", alignItems: "center", gap: "var(--space-2)" }}><BarChart2 size={18} /> Historical Price Intelligence</h3>
                  <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: 2 }}>Interactive explorer with forecasting</div>
                </div>
                <select className="form-select" style={{ width: 150, fontSize: "var(--text-sm)", fontWeight: 700 }} value={activeCommodity.id} onChange={(e) => setActiveCommodity(staples.find(s=>s.id===e.target.value)!)}>
                  {staples.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="card-body" style={{ padding: "var(--space-5)", flex: 1, display: "flex", flexDirection: "column" }}>
                
                {/* Chart Header Stats */}
                <div style={{ display: "flex", gap: "var(--space-6)", marginBottom: "var(--space-6)" }}>
                  <div>
                    <div style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", fontWeight: 700, color: "var(--text-muted)" }}>Current Price</div>
                    <div style={{ fontSize: "var(--text-2xl)", fontWeight: 900, color: "var(--text-primary)" }}>₱{activeCommodity.price}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", fontWeight: 700, color: "var(--text-muted)" }}>30-Day High</div>
                    <div style={{ fontSize: "var(--text-2xl)", fontWeight: 900, color: "#DC2626" }}>₱95</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", fontWeight: 700, color: "var(--text-muted)" }}>30-Day Low</div>
                    <div style={{ fontSize: "var(--text-2xl)", fontWeight: 900, color: "#16A34A" }}>₱70</div>
                  </div>
                </div>

                {/* Interactive Area Chart */}
                <div style={{ height: 250, width: "100%", marginBottom: "var(--space-4)" }}>
                  {isMounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activeCommodity.id === 'tomato' ? HISTORICAL_DATA : HISTORICAL_DATA.map(d => ({ ...d, price: d.price * (activeCommodity.price/88) }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D1D5DB" />
                      <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#4B5563", fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: "#4B5563", fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <RechartsTooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                      <Area type="monotone" dataKey="price" stroke="var(--color-accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorPrice)" />
                      {activeCommodity.id === 'tomato' && <ReferenceDot x="May 29" y={95} r={5} fill="#DC2626" stroke="white" strokeWidth={2} />}
                    </AreaChart>
                  </ResponsiveContainer>
                  ) : <div style={{ height: "100%", width: "100%" }} />}
                </div>

                {/* Annotations & WOW Forecast */}
                <div style={{ background: "#F3F4F6", padding: "var(--space-4)", borderRadius: "var(--radius-md)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {activeCommodity.id === 'tomato' && (
                    <div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <Info size={16} color="#DC2626" style={{ marginTop: 2, flexShrink: 0 }} />
                      <span><strong>Historical Insight:</strong> Price spike occurred on May 29 due to regional supply constraints.</span>
                    </div>
                  )}
                  <div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <Activity size={16} color="#8B5CF6" style={{ marginTop: 2, flexShrink: 0 }} />
                    <span>
                      <strong style={{ color: "#8B5CF6" }}>Experimental Forecast:</strong> If current trend continues, {activeCommodity.name} may {activeCommodity.weeklyChange > 0 ? 'increase by 4–6%' : 'decrease by 2–3%'} next week.
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* Section 8: Lucena vs Another Market (Insight Based) */}
            <div className="card">
              <div className="card-header" style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 800, color: "var(--color-accent)", margin: 0 }}>Lucena vs</h3>
                <select className="form-select" value={compareTarget} onChange={e => setCompareTarget(e.target.value)} style={{ width: 220, fontSize: "var(--text-sm)", fontWeight: 700 }}>
                  {marketsData.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="card-body" style={{ padding: "var(--space-5)" }}>
                <div style={{ fontSize: "var(--text-lg)", fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.6 }}>
                  {generateComparisonInsight()}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Section 6: Commodity Movers */}
        <div>
          <h2 style={{ fontSize: "var(--text-2xl)", fontWeight: 800, color: "var(--color-accent)", margin: "0 0 var(--space-4) 0" }}>Lucena Commodity Movers</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "var(--space-4)" }}>
            
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "var(--space-3) var(--space-4)", background: "#FEF2F2", color: "#991B1B", fontWeight: 800, fontSize: "var(--text-sm)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Biggest Price Increases
              </div>
              <div style={{ padding: "var(--space-2) 0" }}>
                {staples.filter(s => s.weeklyChange > 0).sort((a,b) => b.weeklyChange - a.weeklyChange).map(s => (
                  <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px var(--space-4)", borderBottom: "1px solid #F3F4F6", fontSize: "var(--text-sm)" }}>
                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                    <span style={{ color: "#DC2626", fontWeight: 800 }}>+{s.weeklyChange}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "var(--space-3) var(--space-4)", background: "#F0FDF4", color: "#166534", fontWeight: 800, fontSize: "var(--text-sm)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Biggest Price Drops
              </div>
              <div style={{ padding: "var(--space-2) 0" }}>
                {staples.filter(s => s.weeklyChange < 0).sort((a,b) => a.weeklyChange - b.weeklyChange).map(s => (
                  <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px var(--space-4)", borderBottom: "1px solid #F3F4F6", fontSize: "var(--text-sm)" }}>
                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                    <span style={{ color: "#16A34A", fontWeight: 800 }}>{s.weeklyChange}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "var(--space-3) var(--space-4)", background: "#FFFBEB", color: "#B45309", fontWeight: 800, fontSize: "var(--text-sm)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Most Volatile
              </div>
              <div style={{ padding: "var(--space-2) 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px var(--space-4)", borderBottom: "1px solid #F3F4F6", fontSize: "var(--text-sm)" }}>
                  <span style={{ fontWeight: 600 }}>Tomato</span><span style={{ color: "#B45309", fontWeight: 800 }}>High Risk</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px var(--space-4)", borderBottom: "1px solid #F3F4F6", fontSize: "var(--text-sm)" }}>
                  <span style={{ fontWeight: 600 }}>Cabbage</span><span style={{ color: "#B45309", fontWeight: 800 }}>High Risk</span>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "var(--space-3) var(--space-4)", background: "#F3F4F6", color: "#4B5563", fontWeight: 800, fontSize: "var(--text-sm)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Most Stable
              </div>
              <div style={{ padding: "var(--space-2) 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px var(--space-4)", borderBottom: "1px solid #F3F4F6", fontSize: "var(--text-sm)" }}>
                  <span style={{ fontWeight: 600 }}>Rice (Well-milled)</span><span style={{ color: "#6B7280", fontWeight: 800 }}>Safe</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px var(--space-4)", borderBottom: "1px solid #F3F4F6", fontSize: "var(--text-sm)" }}>
                  <span style={{ fontWeight: 600 }}>Chicken (Whole)</span><span style={{ color: "#6B7280", fontWeight: 800 }}>Safe</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </main>
      
      {/* Footer */}
      <footer style={{ background: "white", borderTop: "1px solid #E5E7EB", padding: "var(--space-10) var(--space-6)", textAlign: "center", marginTop: "auto" }}>
        <div style={{ fontWeight: 800, color: "var(--color-primary)", fontSize: "var(--text-2xl)", letterSpacing: "-1px" }}>GeoMarketics</div>
        <div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginTop: "var(--space-2)", fontWeight: 500 }}>Consumer Decision-Support Platform • Lucena City Public Market</div>
      </footer>

      {/* Complaint Modal */}
      {isComplaintModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-4)" }}>
          <div style={{ background: "white", width: "100%", maxWidth: 500, borderRadius: "8px", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid #E5E7EB" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>Report a Market Issue</h2>
              <button onClick={() => { setIsComplaintModalOpen(false); setComplaintSubmitted(false); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
              {complaintSubmitted ? (
                <div style={{ textAlign: "center", padding: "32px 0" }}>
                  <div style={{ width: 64, height: 64, background: "#16A34A", color: "white", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                    <Send size={32} />
                  </div>
                  <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#166534", margin: "0 0 8px" }}>Report Submitted</h3>
                  <p style={{ color: "#15803D", margin: "0 0 24px" }}>Thank you. We've received your report and will look into it.</p>
                  <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => { setIsComplaintModalOpen(false); setComplaintSubmitted(false); }}>Close</button>
                </div>
              ) : (
                <form onSubmit={handleComplaintSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>Stall Number (if known)</label>
                    <input type="text" list="stalls-list" placeholder="Search stall or vendor (e.g. B-12)" style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #D1D5DB" }}
                      value={complaintForm.stall} onChange={e => setComplaintForm({...complaintForm, stall: e.target.value})} />
                    <datalist id="stalls-list">
                      {stallsList.map(s => (
                        <option key={s.id} value={s.stall_number}>{s.vendor_name ? s.vendor_name : 'Vacant'}</option>
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>Issue Category</label>
                    <select className="form-select" style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #D1D5DB", appearance: "auto" }}
                      value={complaintForm.category} onChange={e => setComplaintForm({...complaintForm, category: e.target.value})}>
                      <option value="sanitation">Sanitation</option>
                      <option value="overpricing">Overpricing</option>
                      <option value="safety">Safety Hazard</option>
                      <option value="food_safety">Food Safety</option>
                      <option value="permit">Permit Violation</option>
                      <option value="display">Display Violation</option>
                      <option value="noise">Noise/Disturbance</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>Your Email <span style={{color: "#DC2626"}}>*</span></label>
                    <input type="email" required placeholder="For updates regarding your complaint..." style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #D1D5DB" }}
                      value={complaintForm.email} onChange={e => setComplaintForm({...complaintForm, email: e.target.value})} />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>Describe the Issue <span style={{color: "#DC2626"}}>*</span></label>
                    <textarea rows={4} required placeholder="What did you observe? Be as specific as possible..." style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #D1D5DB", resize: "vertical" }}
                      value={complaintForm.description} onChange={e => setComplaintForm({...complaintForm, description: e.target.value})} />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>Upload Image (Optional)</label>
                    <input type="file" accept="image/*" style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #D1D5DB", fontSize: "14px", background: "white" }}
                      onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          setComplaintForm({...complaintForm, file: e.target.files[0]});
                        }
                      }} />
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>Attach a photo to help us better understand the issue.</div>
                  </div>
                  
                  <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "16px" }}>
                    <button type="button" onClick={() => setIsComplaintModalOpen(false)} style={{ padding: "10px 20px", background: "white", border: "1px solid #D1D5DB", borderRadius: "6px", fontWeight: 600, color: "var(--text-primary)", cursor: "pointer" }}>Cancel</button>
                    <button type="submit" disabled={isSubmittingComplaint} style={{ padding: "10px 20px", background: "#F28C8C", border: "none", borderRadius: "6px", fontWeight: 700, color: "white", cursor: isSubmittingComplaint ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                      <Send size={16} /> {isSubmittingComplaint ? "Submitting..." : "Submit Report"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
