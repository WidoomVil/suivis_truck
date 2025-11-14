import React, { useEffect, useState, useMemo, useRef } from "react";
import ScheduleView from "./ScheduleView";
import { mapRow, parseScheduleText, buildStatusSections, formatDateTime } from "./utils";
import "./TruckTable.css";

export default function TruckTable() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [scheduleParsed, setScheduleParsed] = useState({ title: "", rows: {} });
  const [index, setIndex] = useState(0);
  const timerRef = useRef(null);
  const pausedRef = useRef(false);

  // Charger truck_status.csv
 useEffect(() => {
  async function loadStatus() {
    try {
      const timestamp = Date.now();
      const res = await fetch(`https://raw.githubusercontent.com/WidoomVil/suivis_truck/main/truck_status.csv?t=${timestamp}`, {
        cache: "no-store",
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });
      
      const text = await res.text();
      const lm = res.headers.get("Last-Modified");
      setLastUpdated(lm ? new Date(lm) : new Date());

      const clean = text.replace(/^\uFEFF/, "");
      const lines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (!lines.length) return;

      const headers = lines[0].split(";").map(h => h.trim());
      const data = lines.slice(1).map(line => {
        const cells = line.split(";");
        const obj = {};
        headers.forEach((h, i) => obj[h] = (cells[i] ?? "").trim());
        return obj;
      });

      const mapped = data.map(mapRow)
        .filter(r => Object.values(r).some(v => (v ?? "").toString().trim() !== ""));
      setRows(mapped);
    } catch (e) {
      setError("Impossible de charger le CSV statut");
      console.error(e);
    }
  }
  loadStatus();
}, []);

  // Charger schedule.csv
useEffect(() => {
  async function loadSchedule() {
    try {
      const timestamp = Date.now();
      const res = await fetch(`https://raw.githubusercontent.com/WidoomVil/suivis_truck/main/schedule.csv?t=${timestamp}`, {
        cache: "no-store",
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });
      
      if (!res.ok) return;
      const text = await res.text();
      const parsed = parseScheduleText(text);
      setScheduleParsed(parsed);
    } catch (e) {
      console.error("Impossible de charger schedule.csv", e);
    }
  }
  loadSchedule();
}, []);

  // Auto-refresh toutes les 30 secondes
useEffect(() => {
  const loadData = async () => {
    try {
      const timestamp = Date.now();
      
      // Reload truck_status
      const resStatus = await fetch(`https://raw.githubusercontent.com/WidoomVil/suivis_truck/main/truck_status.csv?t=${timestamp}`, {
        cache: "no-store",
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });
      
      const textStatus = await resStatus.text();
      setLastUpdated(new Date());
      
      const clean = textStatus.replace(/^\uFEFF/, "");
      const lines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length) {
        const headers = lines[0].split(";").map(h => h.trim());
        const data = lines.slice(1).map(line => {
          const cells = line.split(";");
          const obj = {};
          headers.forEach((h, i) => obj[h] = (cells[i] ?? "").trim());
          return obj;
        });
        const mapped = data.map(mapRow)
          .filter(r => Object.values(r).some(v => (v ?? "").toString().trim() !== ""));
        setRows(mapped);
      }
      
      // Reload schedule
      const resSchedule = await fetch(`https://raw.githubusercontent.com/WidoomVil/suivis_truck/main/schedule.csv?t=${timestamp}`, {
        cache: "no-store",
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });
      
      if (resSchedule.ok) {
        const textSchedule = await resSchedule.text();
        const parsed = parseScheduleText(textSchedule);
        setScheduleParsed(parsed);
      }
      
      console.log('🔄 Données rechargées:', new Date().toLocaleTimeString());
    } catch (e) {
      console.error('Erreur refresh:', e);
    }
  };
  
  const interval = setInterval(loadData, 30000); // 30 secondes
  
  return () => clearInterval(interval);
}, []);

  const statusSections = useMemo(() => buildStatusSections(rows), [rows]);
  const hasSchedule =
    scheduleParsed.title?.trim().length > 0 ||
    Object.keys(scheduleParsed.rows).length > 0;

  const sections = useMemo(() => {
    const s = [];
    if (statusSections.length > 0) s.push(...statusSections);
    if (hasSchedule) s.push({ name: "Planification atelier", type: "schedule", rows: [] });
    return s;
  }, [statusSections, hasSchedule]);

  const current = sections[index] || sections[0] || { type: "status", rows: [] };

  // Auto-slide 15s
  useEffect(() => {
    console.log('=== TIMER START ===', sections.length, new Date().toLocaleTimeString());
    
    if (!sections.length) {
      console.log('Pas de sections, pas de timer');
      return;
    }
    
    clearInterval(timerRef.current);
    
    if (!pausedRef.current) {
      console.log('Démarrage du timer 15s');
      timerRef.current = setInterval(() => {
        console.log('🔄 Timer tick:', new Date().toLocaleTimeString());
        console.log('💾 Memory:', performance.memory?.usedJSHeapSize || 'N/A');
        
        setIndex((s) => {
          const next = (s + 1) % sections.length;
          console.log(`📊 Slide ${s} -> ${next} (total: ${sections.length})`);
          return next;
        });
      }, 15000);
    } else {
      console.log('Timer en pause');
    }
    
    return () => {
      console.log('🧹 CLEANUP TIMER');
      clearInterval(timerRef.current);
      pausedRef.current = false;
    };
  }, [sections.length]);

  const onMouseEnter = () => {
    console.log('🖱️ Mouse enter - pause timer');
    pausedRef.current = true;
    clearInterval(timerRef.current);
  };
  
  const onMouseLeave = () => {
    console.log('🖱️ Mouse leave - resume timer');
    pausedRef.current = false;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      console.log('🔄 Timer tick (after resume):', new Date().toLocaleTimeString());
      setIndex((s) => {
        const next = (s + 1) % sections.length;
        console.log(`📊 Slide ${s} -> ${next} (total: ${sections.length})`);
        return next;
      });
    }, 15000);
  };

  const prev = () => setIndex((s) => (s === 0 ? Math.max(0, sections.length - 1) : s - 1));
  const next = () => setIndex((s) => (s + 1) % sections.length);

  return (
    <div className="truck-container" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <div className="slider-bar">
        <button onClick={prev} disabled={!sections.length} aria-label="Section précédente">Précédent</button>
        <h2 className="truck-title">{current.name || "Tableau"}</h2>
        <button onClick={next} disabled={!sections.length} aria-label="Section suivante">Suivant</button>
        <div className="slider-info">Défilement auto: 15s</div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {current.type === "schedule" ? (
        <ScheduleView parsed={scheduleParsed} />
      ) : (
        <>
          <table className="truck-table">
            <thead>
              <tr>
                <th className="col-Unité">Unité</th>
                <th className="col-DATE">DATE</th>
                <th className="col-Plainte">PLAINTE</th>
                <th className="col-Date-Réparation">DATE RÉPARATION</th>
                <th className="col-Garage">GARAGE</th>
                <th className="col-Complétée">COMPLÉTÉE</th>
                <th className="col-Prochain-Rendez-vous">PROCHAIN RENDEZ-VOUS</th>
                <th className="col-Disponible">DISPONIBLE</th>
                <th className="col-Note">NOTE</th>
              </tr>
            </thead>
            <tbody>
              {current.rows.map((r, idx) => {
                const baseAlt = idx % 2 ? "row-alt" : "";
                const rowUnavailable = r.disponible === false ? "row-unavailable" : "";
                const rowClass = `${baseAlt} ${rowUnavailable}`.trim();
                const dispoClass =
                  r.disponible === null ? "" : r.disponible ? "disponible-oui" : "disponible-non";

                return (
                  <tr key={`${r.unite}-${idx}`} className={rowClass}>
                    <td className="col-Unité">{r.unite}</td>
                    <td className="col-DATE">{r.date}</td>
                    <td className="col-Plainte">{r.plainte}</td>
                    <td className="col-Date-Réparation">{r.dateReparation}</td>
                    <td className="col-Garage">{r.garage}</td>
                    <td className="col-Complétée">{r.completee}</td>
                    <td className="col-Prochain-Rendez-vous">{r.prochainRdv}</td>
                    <td className={`col-Disponible ${dispoClass}`}>
                      {r.disponible === null ? "" : r.disponible ? "oui" : "non"}
                    </td>
                    <td className="col-Note">{r.note}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {lastUpdated && (
            <div className="footer-bar">
              <div className="last-updated">
                Dernière mise à jour: {formatDateTime(lastUpdated)}
              </div>
            </div>
          )}
        </>
      )}

      {sections.length > 0 && <div className="pager">{index + 1} / {sections.length}</div>}
    </div>
  );
}
