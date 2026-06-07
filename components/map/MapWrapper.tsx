"use client";

import dynamic from "next/dynamic";

const CalabarzonMap = dynamic(() => import("./CalabarzonMap"), {
  ssr: false,
  loading: () => (
    <div style={{ height: "400px", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6", borderRadius: "var(--radius-lg)" }}>
      Loading Map...
    </div>
  ),
});

export default CalabarzonMap;
