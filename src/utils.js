/* ===== Helpers pour TruckTable et ScheduleView ===== */

// Convertit "oui"/"non"/"true"/"false" en booléen
export function toBoolOuiNon(val) {
  const v = (val || "").toString().trim().toLowerCase();
  if (v === "oui" || v === "yes" || v === "true") return true;
  if (v === "non" || v === "no" || v === "false") return false;
  return null;
}

// Mappe une ligne CSV truck_status en objet
export function mapRow(obj) {
  return {
    unite: obj["Unité"]?.trim() || "",
    date: obj["DATE"]?.trim() || "",
    plainte: obj["PLAINTE"]?.trim() || "",
    dateReparation: obj["DATE RÉPARATION"]?.trim() || "",
    garage: obj["GARAGE"]?.trim() || "",
    completee: obj["COMPLÉTÉE"]?.trim() || "",
    prochainRdv:
      obj["PROCHAINE DATE DE RÉPARATION"]?.trim() ||
      obj["PROCHAIN RENDEZ-VOUS"]?.trim() ||
      "",
    disponible: toBoolOuiNon(
      obj["DISPONIBLE"] ?? obj["Disponible"] ?? obj["APTE À ROULER"]
    ),
    note: obj["NOTE"]?.trim() || "",
  };
}

// Catégorise les unités
export function categorize(unite) {
  const u = (unite || "").trim().toUpperCase();
  if (u.startsWith("RO")) return "ROLL-OFF";
  if (u.startsWith("CA")) return "CHARGEMENT AVANT";
  if (u.startsWith("LA")) return "CHARGEMENT LATÉRAL";
  return "Autres camions";
}

// Crée les sections de statut pour TruckTable
export function buildStatusSections(rows) {
  const order = ["ROLL-OFF", "CHARGEMENT AVANT", "CHARGEMENT LATÉRAL", "Autres camions"];
  const buckets = Object.fromEntries(order.map(k => [k, []]));
  for (const r of rows) buckets[categorize(r.unite)].push(r);
  return order.map(name => ({ name, type: "status", rows: buckets[name] }));
}

// Formate date pour affichage
export function formatDateTime(d) {
  try {
    return new Intl.DateTimeFormat("fr-CA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
}

// Parsing du schedule.csv
export function parseScheduleText(text) {
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split(/\r?\n/).filter(l => l.trim().length > 0);

  if (!lines.length) return { title: "", rows: {} };

  const title = lines[0].split(";").filter(c => c.trim().length > 0).join(" ");

  const grouped = {};
  let currentSupplier = "";

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cells = line.split(";").map(c => c.trim());
    const supplier = cells[0] || currentSupplier;
    currentSupplier = supplier || currentSupplier;

    const jour = cells[1] || "";
    const units = cells.slice(2).map(u => u.toUpperCase()).filter(Boolean);

    if (!grouped[currentSupplier]) grouped[currentSupplier] = [];
    grouped[currentSupplier].push({ supplier: currentSupplier, jour, units });
  }

  return { title, rows: grouped };
}

// ===== ScheduleView helpers =====
export function getDayClass(jour) {
  const j = (jour || "").toLowerCase().trim();
  if (j.includes("lundi")) return "day-lundi";
  if (j.includes("mardi")) return "day-mardi";
  if (j.includes("mercredi")) return "day-mercredi";
  if (j.includes("jeudi")) return "day-jeudi";
  if (j.includes("vendredi")) return "day-vendredi";
  return "";
}

export function isCurrentDay(jour) {
  const today = new Date();
  const dayNames = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
  const currentDayName = dayNames[today.getDay()];
  const j = (jour || "").toLowerCase().trim();
  return j.includes(currentDayName);
}
