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

  // Charger truck_status.csv depuis public/
  const loadStatus = async () => {
    try {
      const res = await fetch("/truck_status.csv", { cache: "no-store" });
      if (!res.ok) throw new Error("Impossible de charger truck_status.csv");

      const text = await res.text();
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
      setError("");
      setLastUpdated(new Date());
    } catch (e) {
      setError("Impossible de charger le CSV statut");
      console.error(e);
    }
  };

  // Charger schedule.csv depuis public/
  const loadSchedule = async () => {
    try {
      const res = await fetch("/schedule.csv", { cache: "no-store" });
      if (!res.ok) throw new Error("Impossible de charger schedule.csv");

      const text = await res.text();
      const parsed = parseScheduleText(text);
      setScheduleParsed(parsed);
    } catch (e) {
      console.error("Impossible de charger schedule.csv", e);
    }
  };

  // Charger initialement les CSV
  useEffect(() => {
    loadStatus();
    loadSchedule();
  }, []);

  // Auto-refresh toutes les 30 secondes
  useEffect(() => {
    const interval = setInterval(() => {
      loadStatus();
      loadSchedule();
      console.log("🔄 Données rechargées:", new Date().toLocaleTimeString());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Sections et affichage
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

  // Auto-slide toutes les 15s
  useEffect(() => {
    if (!sections.length) return;
    clearInterval(timerRef.current);

    if (!pausedRef.current) {
      timerRef.current = setInterval(() => {
        setIndex((s) => (s + 1) % sections.length);
      }, 15000);
    }

    return () => clearInterval(timerRef.current);
  }, [sections.length]);

  const onMouseEnter = () => {
    pausedRef.current = true;
    clearInterval(timerRef.current);
  };

  const onMouseLeave = () => {
    pausedRef.current = false;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setIndex((s) => (s + 1) % sections.length);
    }, 15000);
  };

  const prev = () => setIndex((s) => (s === 0 ? Math.max(0, sections.length - 1) : s - 1));
  const next = () => setIndex((s) => (s + 1) % sections.length);

  return (
    <div className="truck-container" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <div className="slider-bar">
        <button onClick={prev} disabled={!sections.length}>Précédent</button>
        <h2 className="truck-title">{current.name || "Tableau"}</h2>
        <button onClick={next} disabled={!sections.length}>Suivant</button>
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
                const dispoClass = r.disponible === null ? "" : r.disponible ? "disponible-oui" : "disponible-non";

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

