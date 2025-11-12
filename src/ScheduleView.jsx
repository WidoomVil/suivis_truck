import React, { useEffect, useRef } from "react";

// Helpers
const getDayClass = (jour) => {
  if (!jour) return "";
  const j = jour.toLowerCase().trim();
  if (j.includes("lundi")) return "day-lundi";
  if (j.includes("mardi")) return "day-mardi";
  if (j.includes("mercredi")) return "day-mercredi";
  if (j.includes("jeudi")) return "day-jeudi";
  if (j.includes("vendredi")) return "day-vendredi";
  return "";
};

const isCurrentDay = (jour) => {
  if (!jour) return false;
  const today = new Date();
  const dayNames = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
  const currentDayName = dayNames[today.getDay()];
  return jour.toLowerCase().includes(currentDayName);
};

export default function ScheduleView({ parsed }) {
  const containerRef = useRef(null);

  // Scroll auto
  useEffect(() => {
    if (!containerRef.current) return;

    let scrollPos = 0;
    const scrollStep = 1;
    const delay = 50;
    const pause = 5000;
    let interval;

    const startScroll = () => {
      interval = setInterval(() => {
        if (!containerRef.current) return;
        scrollPos += scrollStep;
        if (scrollPos >= containerRef.current.scrollHeight - containerRef.current.clientHeight) {
          clearInterval(interval);
          setTimeout(() => {
            scrollPos = 0;
            if (containerRef.current) containerRef.current.scrollTop = 0;
            startScroll();
          }, pause);
        } else {
          containerRef.current.scrollTop = scrollPos;
        }
      }, delay);
    };

    startScroll();
    return () => clearInterval(interval);
  }, [parsed]);

  if (!parsed || !parsed.rows) return null;

  const suppliers = Object.keys(parsed.rows);
  const maxUnits = Math.max(
    ...suppliers.flatMap(s => parsed.rows[s].map(r => r.units.length)),
    1
  );

  return (
    <div className="schedule-container" ref={containerRef}>
      <div className="schedule-header">{parsed.title || "PLANIFICATION ATELIER"}</div>
      <table className="schedule-table">
        <thead>
          <tr>
            <th className="col-Fournisseur">Fournisseur</th>
            <th className="schedule-col-label">Jour</th>
            {Array.from({ length: maxUnits }, (_, i) => (
              <th key={i} className="schedule-col-unit">Unité {i + 1}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {suppliers.map((supplier, supplierIdx) =>
            parsed.rows[supplier].map((r, idx) => {
              const isFirstRow = idx === 0;
              const dayClass = getDayClass(r.jour);
              const isEvenSupplier = supplierIdx % 2 === 0;
              const isTodayRow = isCurrentDay(r.jour);

              return (
                <tr
                  key={`${supplier}-${idx}`}
                  className={`
                    ${isFirstRow ? "supplier-first-row" : ""}
                    ${isEvenSupplier ? "supplier-group-even" : ""}
                    ${isTodayRow ? "current-day-row" : ""}
                  `.trim()}
                >
                  <td className="col-Fournisseur">{isFirstRow ? supplier : ""}</td>
                  <td className={`schedule-col-label ${dayClass} ${isTodayRow ? "current-day" : ""}`}>
                    {r.jour}
                  </td>
                  {Array.from({ length: maxUnits }, (_, i) => (
                    <td key={i} className="schedule-col-unit">{r.units[i] || ""}</td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
