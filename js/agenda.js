// ============================================================
//  AGENDA.JS — Dagplanning voor het leiding-gedeelte
//  Sluit aan op de bestaande app.js: gebruikt dezelfde render(),
//  topbar(), esc() en sGet()/sSet() (Firebase Realtime Database)
//  functies, dus die moeten vóór dit bestand geladen zijn.
// ============================================================

// De planning wordt in Firebase opgeslagen onder "agenda" (array van dagdeel-blokken)
// en "agendaDayStatus" (per datum: is deze dag afgerond?). Bij de allereerste keer
// openen wordt "agenda" automatisch gevuld met onderstaande standaardplanning,
// overgenomen uit Programma.xlsx.
const DEFAULT_AGENDA = [
  {
    "id": "d1",
    "sort": 1,
    "dagdeel": "Zaterdag \noverdag",
    "datum": "2026-08-22",
    "activiteit": "Heenreis, 8:20 weg kerk, 9:96 weg Bad Bentheim",
    "maker1": "",
    "maker2": "",
    "bijzonderheden": "Tickets DK in dropbox, tickets DE nog kopen. Traject DE via link",
    "begeleiding": "Mathijs",
    "dagverantwoordelijke": "",
    "kostenBoekingen": []
  },
  {
    "id": "d2",
    "sort": 2,
    "dagdeel": "NVT",
    "datum": "2026-08-22",
    "activiteit": "NVT",
    "maker1": "",
    "maker2": "NVT",
    "bijzonderheden": "NVT",
    "begeleiding": "NVT",
    "dagverantwoordelijke": "",
    "kostenBoekingen": []
  },
  {
    "id": "d3",
    "sort": 3,
    "dagdeel": "Zaterdag \nAvond",
    "datum": "2026-08-22",
    "activiteit": "Tenten opzetten & introductie thema & 1e spel & 1e test",
    "maker1": "Lianne",
    "maker2": "Jaël",
    "bijzonderheden": "Nog geen programma ideeën, waren er niet tijdens deze opkomst.",
    "begeleiding": "Menno",
    "dagverantwoordelijke": "",
    "kostenBoekingen": []
  },
  {
    "id": "d4",
    "sort": 4,
    "dagdeel": "Zondag \nOchtend",
    "datum": "2026-08-23",
    "activiteit": "Opbouwen terrein & 2e spel",
    "maker1": "Merel",
    "maker2": "Mirre",
    "bijzonderheden": "Viking morning ritual (yoga) daarna een eigen wapen maken en daarmee op doel gooien.",
    "begeleiding": "Diewertje",
    "dagverantwoordelijke": "Ruben",
    "kostenBoekingen": []
  },
  {
    "id": "d5",
    "sort": 5,
    "dagdeel": "Zondag  Middag",
    "datum": "2026-08-23",
    "activiteit": "Adventure activiteit op terrein",
    "maker1": "Ruben",
    "maker2": "-",
    "bijzonderheden": "Nog geen programma ideeën, waren er niet tijdens deze opkomst.",
    "begeleiding": "Menno",
    "dagverantwoordelijke": "Ruben",
    "kostenBoekingen": []
  },
  {
    "id": "d6",
    "sort": 6,
    "dagdeel": "Zondag \nAvond",
    "datum": "2026-08-23",
    "activiteit": "3e spel & 2e test",
    "maker1": "Jaël",
    "maker2": "Dominic",
    "bijzonderheden": "Nog geen programma ideeën, waren er niet tijdens deze opkomst.",
    "begeleiding": "Gerwin",
    "dagverantwoordelijke": "Ruben",
    "kostenBoekingen": []
  },
  {
    "id": "d7",
    "sort": 7,
    "dagdeel": "Maandag \noverdag",
    "datum": "2026-08-24",
    "activiteit": "Staddag Kölding",
    "maker1": "Sietse",
    "maker2": "-",
    "bijzonderheden": "",
    "begeleiding": "Gerwin",
    "dagverantwoordelijke": "Sietse",
    "kostenBoekingen": []
  },
  {
    "id": "d8",
    "sort": 8,
    "dagdeel": "NVT",
    "datum": "2026-08-24",
    "activiteit": "NVT",
    "maker1": "NVT",
    "maker2": "NVT",
    "bijzonderheden": "NVT",
    "begeleiding": "NVT",
    "dagverantwoordelijke": "Sietse",
    "kostenBoekingen": []
  },
  {
    "id": "d9",
    "sort": 9,
    "dagdeel": "Maandag \nAvond",
    "datum": "2026-08-24",
    "activiteit": "4e spel & 3e test",
    "maker1": "Dominic",
    "maker2": "Tijn R.",
    "bijzonderheden": "Spelshows (lingo, taskmaster e.d. )",
    "begeleiding": "Mathijs",
    "dagverantwoordelijke": "Sietse",
    "kostenBoekingen": []
  },
  {
    "id": "d10",
    "sort": 10,
    "dagdeel": "Dinsdag \noverdag",
    "datum": "2026-08-25",
    "activiteit": "Daghike",
    "maker1": "Ruben",
    "maker2": "Sylvan",
    "bijzonderheden": "",
    "begeleiding": "Diewertje",
    "dagverantwoordelijke": "Jaimy",
    "kostenBoekingen": []
  },
  {
    "id": "d11",
    "sort": 11,
    "dagdeel": "NVT",
    "datum": "2026-08-25",
    "activiteit": "NVT",
    "maker1": "NVT",
    "maker2": "NVT",
    "bijzonderheden": "NVT",
    "begeleiding": "Menno",
    "dagverantwoordelijke": "Jaimy",
    "kostenBoekingen": []
  },
  {
    "id": "d12",
    "sort": 12,
    "dagdeel": "Dinsdag \nAvond",
    "datum": "2026-08-25",
    "activiteit": "5e spel & 4e test",
    "maker1": "Jaimy",
    "maker2": "Milo",
    "bijzonderheden": "Vlagveroveren, en een eigen Viking vlag maken",
    "begeleiding": "Mathijs",
    "dagverantwoordelijke": "Jaimy",
    "kostenBoekingen": []
  },
  {
    "id": "d13",
    "sort": 13,
    "dagdeel": "Woensdag  \noverdag",
    "datum": "2026-08-26",
    "activiteit": "Legoland",
    "maker1": "Lianne",
    "maker2": "-",
    "bijzonderheden": "",
    "begeleiding": "Mathijs",
    "dagverantwoordelijke": "Lianne",
    "kostenBoekingen": []
  },
  {
    "id": "d14",
    "sort": 14,
    "dagdeel": "NVT",
    "datum": "2026-08-26",
    "activiteit": "NVT",
    "maker1": "NVT",
    "maker2": "NVT",
    "bijzonderheden": "NVT",
    "begeleiding": "NVT",
    "dagverantwoordelijke": "Lianne",
    "kostenBoekingen": []
  },
  {
    "id": "d15",
    "sort": 15,
    "dagdeel": "Woensdag  \nAvond",
    "datum": "2026-08-26",
    "activiteit": "7e spel & 5e test",
    "maker1": "Tijn R.",
    "maker2": "Sietse",
    "bijzonderheden": "Net niet bob roskomst",
    "begeleiding": "Diewertje",
    "dagverantwoordelijke": "Lianne",
    "kostenBoekingen": []
  },
  {
    "id": "d16",
    "sort": 16,
    "dagdeel": "Donderdag  \nOchtend",
    "datum": "2026-08-27",
    "activiteit": "6e spel",
    "maker1": "Merel",
    "maker2": "Thomas",
    "bijzonderheden": "Posten spel, 5 posten samen kleuren verzamelen en uiteindelijk doel is een zwaard kleuren",
    "begeleiding": "Menno",
    "dagverantwoordelijke": "Ruben",
    "kostenBoekingen": []
  },
  {
    "id": "d17",
    "sort": 17,
    "dagdeel": "Donderdag   Middag",
    "datum": "2026-08-27",
    "activiteit": "Zwemmen",
    "maker1": "Jaimy",
    "maker2": "-",
    "bijzonderheden": "",
    "begeleiding": "Mathijs",
    "dagverantwoordelijke": "Ruben",
    "kostenBoekingen": []
  },
  {
    "id": "d18",
    "sort": 18,
    "dagdeel": "Donderdag  \nAvond",
    "datum": "2026-08-27",
    "activiteit": "10e spel & 7e test",
    "maker1": "Begeleiding",
    "maker2": "",
    "bijzonderheden": "Bordspel?",
    "begeleiding": "Begeleiding",
    "dagverantwoordelijke": "Ruben",
    "kostenBoekingen": []
  },
  {
    "id": "d19",
    "sort": 19,
    "dagdeel": "Vrijdag \nOchtend",
    "datum": "2026-08-28",
    "activiteit": "9e spel",
    "maker1": "Tijn S.",
    "maker2": "Thom",
    "bijzonderheden": "Levend schaken",
    "begeleiding": "Gerwin",
    "dagverantwoordelijke": "Sietse",
    "kostenBoekingen": []
  },
  {
    "id": "d20",
    "sort": 20,
    "dagdeel": "Vrijdag  Middag",
    "datum": "2026-08-28",
    "activiteit": "Adventure activiteit op terrein \n& terrein afbreken",
    "maker1": "Ruben",
    "maker2": "-",
    "bijzonderheden": "Adventure op het terrein & afbreken",
    "begeleiding": "Menno",
    "dagverantwoordelijke": "Sietse",
    "kostenBoekingen": []
  },
  {
    "id": "d21",
    "sort": 21,
    "dagdeel": "Vrijdag \nAvond",
    "datum": "2026-08-28",
    "activiteit": "8e spel & 6e test",
    "maker1": "Siem",
    "maker2": "Tijn S.",
    "bijzonderheden": "Viking spellen, sport en spel (highland games achtig)",
    "begeleiding": "Gerwin",
    "dagverantwoordelijke": "Sietse",
    "kostenBoekingen": []
  },
  {
    "id": "d27",
    "sort": 27,
    "dagdeel": "Zaterdag\nvroeg",
    "datum": "2026-08-29",
    "activiteit": "Opruimen, afbreken",
    "maker1": "",
    "maker2": "",
    "bijzonderheden": "",
    "begeleiding": "Begeleiding",
    "dagverantwoordelijke": "",
    "kostenBoekingen": []
  },
  {
    "id": "d28",
    "sort": 28,
    "dagdeel": "Zaterdag\noverdag",
    "datum": "2026-08-29",
    "activiteit": "Terugreis",
    "maker1": "",
    "maker2": "",
    "bijzonderheden": "Tickets DK in dropbox, tickets DE nog kopen. Traject DE via link",
    "begeleiding": "Mathijs",
    "dagverantwoordelijke": "",
    "kostenBoekingen": []
  },
  {
    "id": "d29",
    "sort": 29,
    "dagdeel": "Zaterdag\nAvond",
    "datum": "2026-08-29",
    "activiteit": "Terugreis & afsluiting",
    "maker1": "",
    "maker2": "",
    "bijzonderheden": "",
    "begeleiding": "Begeleiding",
    "dagverantwoordelijke": "",
    "kostenBoekingen": []
  }
];

// ---------- DATA TOEGANG ----------
async function getAgenda(){
  const raw = await sGet("agenda");
  let items = toArr(raw);
  if(items.length === 0){
    // Nog geen planning in de database: eenmalig vullen met de standaardplanning.
    items = DEFAULT_AGENDA.map(x=>({...x, kostenBoekingen: (x.kostenBoekingen||[]).map(b=>({...b}))}));
    await sSet("agenda", items);
  }
  // Backward-compatibel: oudere planningen hadden één "kosten"-veld per dagdeel in
  // plaats van losse boekingen. Zet die hier automatisch om naar één boeking, zodat
  // niemand oude bedragen kwijtraakt.
  items = items.map(it=>{
    if(!it.kostenBoekingen){
      const legacy = parseFloat(String(it.kosten||"0").replace(",", "."));
      const boekingen = (legacy && legacy !== 0)
        ? [{id: uid(), omschrijving:"", bedrag: String(legacy)}]
        : [];
      return {...it, kostenBoekingen: boekingen};
    }
    return {...it, kostenBoekingen: toArr(it.kostenBoekingen)};
  });
  return items;
}
async function setAgenda(items){
  return await sSet("agenda", items);
}

// Per kampdag (datum) houden we bij of hij is afgerond, zodat die dag kan inklappen.
async function getDayStatuses(){
  const raw = await sGet("agendaDayStatus");
  return (raw && typeof raw === "object") ? raw : {};
}
async function setDayStatus(dateKey, afgerond){
  return await sSet("agendaDayStatus/" + dateKey, afgerond);
}

function agendaDayLabel(datum){
  if(!datum) return "Datum onbekend";
  const d = new Date(datum + "T00:00:00");
  if(isNaN(d)) return datum;
  const label = d.toLocaleDateString("nl-NL", {weekday:"long", day:"numeric", month:"long"});
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function groupAgendaByDate(items){
  const groups = {};
  items.forEach(it=>{
    const key = it.datum || "onbekend";
    if(!groups[key]) groups[key] = [];
    groups[key].push(it);
  });
  const dates = Object.keys(groups).sort();
  dates.forEach(d=> groups[d].sort((a,b)=> (a.sort||0) - (b.sort||0)));
  return {dates, groups};
}

function parseAgendaAmount(v){
  if(typeof v === "number") return v;
  if(!v) return 0;
  const n = parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? 0 : n;
}
function itemKostenTotal(it){
  return (it.kostenBoekingen||[]).reduce((s,b)=> s + parseAgendaAmount(b.bedrag), 0);
}
function fmtKr(n){
  return (Math.round(n*100)/100).toLocaleString("da-DK", {minimumFractionDigits:2, maximumFractionDigits:2}) + " kr.";
}

// ---------- WEERGAVE: DAGPLANNING (LEIDING) ----------
async function showAgenda(){
  render(`<div class="loading">Dagplanning laden...</div>`);
  const items = await getAgenda();
  const dayStatus = await getDayStatuses();
  window._agendaCache = items;
  window._agendaDayStatus = dayStatus;
  if(!window._agendaExpanded) window._agendaExpanded = {};
  renderAgendaView(items);
}

function renderAgendaView(items){
  const {dates, groups} = groupAgendaByDate(items);
  const dayStatus = window._agendaDayStatus || {};
  if(!window._agendaExpanded) window._agendaExpanded = {};

  // Voor elke dag die nog geen expand/collapse-status heeft: standaard ingeklapt als
  // de dag al is afgevinkt als afgerond, anders standaard uitgeklapt.
  dates.forEach(dateKey=>{
    if(window._agendaExpanded[dateKey] === undefined){
      window._agendaExpanded[dateKey] = !dayStatus[dateKey];
    }
  });

  let html = `
    ${topbar("Dagplanning", "showAdminHome")}
    <div class="card">
      <h2>🗓️ Dagplanning van het kamp</h2>
      <p class="small">Hier staat het volledige programma per dagdeel: activiteit, programmamakers, bijzonderheden, kostenboekingen en wie welke dag begeleidt of verantwoordelijk is. Wijzig gerust een veld en druk daarna op "💾 Dit blok opslaan" bij dat dagdeel. Vink een dag af als "afgerond" om hem in te klappen.</p>
    </div>
  `;

  dates.forEach(dateKey=>{
    const dayItems = groups[dateKey];
    const afgerond = !!dayStatus[dateKey];
    const expanded = window._agendaExpanded[dateKey];
    const dayTotal = dayItems.reduce((s,it)=> s + itemKostenTotal(it), 0);

    if(!expanded){
      html += `
        <div class="card">
          <div class="flex-between" style="cursor:pointer" onclick="toggleDayExpanded('${esc(dateKey)}')">
            <h2 style="margin:0">${afgerond ? "✅ " : ""}${esc(agendaDayLabel(dateKey))}</h2>
            <span class="small">${dayItems.length} dagdeel(en) — ${fmtKr(dayTotal)} &nbsp;▸</span>
          </div>
          <label style="font-weight:normal;display:flex;gap:8px;align-items:center;margin-top:10px">
            <input type="checkbox" ${afgerond?"checked":""} onclick="event.stopPropagation();toggleDayAfgerond('${esc(dateKey)}', this.checked)"> Dag afgerond
          </label>
        </div>`;
      return;
    }

    html += `<div class="card">
      <div class="flex-between">
        <h2 style="margin:0;cursor:pointer" onclick="toggleDayExpanded('${esc(dateKey)}')">▾ ${esc(agendaDayLabel(dateKey))}</h2>
        <label class="small" style="font-weight:normal;display:flex;gap:6px;align-items:center">
          <input type="checkbox" ${afgerond?"checked":""} onchange="toggleDayAfgerond('${esc(dateKey)}', this.checked)"> Dag afgerond
        </label>
      </div>`;

    dayItems.forEach(it=>{
      const boekingen = it.kostenBoekingen || [];
      const itemTotal = itemKostenTotal(it);

      let boekingenHtml = boekingen.map(b => `
        <div class="row" style="margin-top:4px;align-items:center">
          <input type="text" id="ag_kb_oms_${it.id}_${b.id}" value="${esc(b.omschrijving)}" placeholder="Omschrijving, bijv. boodschappen supermarkt" style="flex:1">
          <input type="text" inputmode="decimal" id="ag_kb_bedrag_${it.id}_${b.id}" value="${esc(b.bedrag)}" placeholder="bedrag" style="width:90px">
          <span class="small">kr.</span>
          <button class="danger" onclick="removeKostenBoeking('${esc(it.id)}','${esc(b.id)}')">✕</button>
        </div>`).join("");
      if(!boekingenHtml){
        boekingenHtml = `<p class="small">Nog geen kostenboekingen bij dit dagdeel.</p>`;
      }

      html += `
        <div class="qlist-item" data-agenda-id="${esc(it.id)}">
          <div class="row">
            <div style="flex:1">
              <label>Dagdeel</label>
              <input type="text" id="ag_dagdeel_${it.id}" value="${esc(it.dagdeel)}" placeholder="Bijv. Zaterdag Avond">
            </div>
            <div style="width:120px">
              <label>Datum</label>
              <input type="date" id="ag_datum_${it.id}" value="${esc(it.datum)}">
            </div>
          </div>
          <label>Activiteit</label>
          <textarea id="ag_activiteit_${it.id}" placeholder="Wat gaan we doen?">${esc(it.activiteit)}</textarea>
          <div class="row">
            <div style="flex:1"><label>1e programmamaker</label><input type="text" id="ag_maker1_${it.id}" value="${esc(it.maker1)}"></div>
            <div style="flex:1"><label>2e programmamaker</label><input type="text" id="ag_maker2_${it.id}" value="${esc(it.maker2)}"></div>
          </div>
          <label>Bijzonderheden</label>
          <textarea id="ag_bijzonderheden_${it.id}" placeholder="Aandachtspunten, materialen, etc.">${esc(it.bijzonderheden)}</textarea>

          <label style="margin-top:6px">Kostenboekingen (in DKK)</label>
          <p class="small" style="margin-top:-4px">Let op: bedragen in Deense kroon (DKK), niet in euro's — het budgetoverzicht rekent dit automatisch om.</p>
          <div id="ag_boekingen_${it.id}">${boekingenHtml}</div>
          <button class="secondary" style="margin-top:6px" onclick="addKostenBoeking('${esc(it.id)}')">+ Boeking toevoegen</button>
          <p class="small" style="margin-top:6px">Totaal dit dagdeel: <strong>${fmtKr(itemTotal)}</strong></p>

          <div class="row">
            <div style="flex:1"><label>Begeleiding</label><input type="text" id="ag_begeleiding_${it.id}" value="${esc(it.begeleiding)}"></div>
            <div style="flex:1"><label>Dagverantwoordelijke</label><input type="text" id="ag_dagverantwoordelijke_${it.id}" value="${esc(it.dagverantwoordelijke)}"></div>
          </div>

          <div class="row flex-between" style="margin-top:8px;align-items:center">
            <div class="row" style="gap:8px">
              <button onclick="saveAgendaItem('${esc(it.id)}')">💾 Dit blok opslaan</button>
              <button class="danger" onclick="removeAgendaItem('${esc(it.id)}')">Verwijder dit blok</button>
            </div>
            <span class="small" id="ag_status_${it.id}"></span>
          </div>
        </div>
      `;
    });

    html += `
      <button class="secondary full" style="margin-top:8px" onclick="addAgendaItem('${esc(dateKey)}')">+ Nieuw dagdeel toevoegen op ${esc(agendaDayLabel(dateKey))}</button>
    </div>`;
  });

  html += `
    <div class="card">
      <h2>Nieuwe dag toevoegen</h2>
      <label>Datum</label>
      <div class="row">
        <input type="date" id="ag_newDate" style="flex:1">
        <button onclick="addAgendaItem(document.getElementById('ag_newDate').value)">+ Toevoegen</button>
      </div>
    </div>
    <div class="card center">
      <p class="small">Losse blokken sla je op met de "💾 Dit blok opslaan"-knop bij dat dagdeel. Deze knop hieronder slaat alles in één keer op — handig na het toevoegen of verwijderen van blokken.</p>
      <button class="full" onclick="saveAgendaChanges()">💾 Alles in één keer opslaan</button>
      <button class="secondary full" onclick="showResetAgenda()">↻ Terugzetten naar standaardplanning</button>
    </div>
  `;

  render(html);
}

// ---------- IN-/UITKLAPPEN & AFGEROND ----------
async function toggleDayAfgerond(dateKey, checked){
  window._agendaDayStatus = window._agendaDayStatus || {};
  window._agendaDayStatus[dateKey] = checked;
  window._agendaExpanded = window._agendaExpanded || {};
  window._agendaExpanded[dateKey] = !checked; // afvinken klapt automatisch in, uitvinken klapt weer open
  await setDayStatus(dateKey, checked);
  renderAgendaView(window._agendaCache || []);
}
function toggleDayExpanded(dateKey){
  window._agendaExpanded = window._agendaExpanded || {};
  window._agendaExpanded[dateKey] = !window._agendaExpanded[dateKey];
  renderAgendaView(window._agendaCache || []);
}

// ---------- BEWERKEN ----------
function readAgendaItemFromForm(it){
  const get = (field)=>{
    const el = document.getElementById(`ag_${field}_${it.id}`);
    return el ? el.value.trim() : it[field];
  };
  const kostenBoekingen = (it.kostenBoekingen || []).map(b=>{
    const omsEl = document.getElementById(`ag_kb_oms_${it.id}_${b.id}`);
    const bedragEl = document.getElementById(`ag_kb_bedrag_${it.id}_${b.id}`);
    return {
      id: b.id,
      omschrijving: omsEl ? omsEl.value.trim() : b.omschrijving,
      bedrag: bedragEl ? bedragEl.value.trim() : b.bedrag
    };
  });
  return {
    ...it,
    dagdeel: get("dagdeel"),
    datum: get("datum"),
    activiteit: get("activiteit"),
    maker1: get("maker1"),
    maker2: get("maker2"),
    bijzonderheden: get("bijzonderheden"),
    begeleiding: get("begeleiding"),
    dagverantwoordelijke: get("dagverantwoordelijke"),
    kostenBoekingen
  };
}

// Slaat één dagdeel-blok direct op, zonder het hele scherm opnieuw te tekenen —
// zo blijf je gewoon op je scrollpositie staan.
async function saveAgendaItem(id){
  const items = window._agendaCache || [];
  const idx = items.findIndex(it => it.id === id);
  if(idx === -1) return;

  const statusEl = document.getElementById(`ag_status_${id}`);
  if(statusEl) statusEl.textContent = "Opslaan...";

  const updated = readAgendaItemFromForm(items[idx]);
  items[idx] = updated;
  window._agendaCache = items;

  const ok = await setAgenda(items);
  if(statusEl){
    statusEl.textContent = ok ? "✓ Opgeslagen" : "⚠ Opslaan mislukt";
    statusEl.style.color = ok ? "var(--gold-light)" : "var(--red)";
    setTimeout(()=>{ if(statusEl) statusEl.textContent = ""; }, 2500);
  }
  if(!ok){
    alert("Opslaan is helaas mislukt. Controleer de internetverbinding en probeer opnieuw.");
  }
}

// Slaat alle blokken tegelijk op (handig na het toevoegen/verwijderen van dagdelen
// of nieuwe dagen, of als je liever in één keer alles wegschrijft).
async function saveAgendaChanges(){
  const items = (window._agendaCache || []).map(it => readAgendaItemFromForm(it));
  render(`<div class="loading">Planning opslaan...</div>`);
  const ok = await setAgenda(items);
  if(!ok){
    alert("Opslaan is helaas mislukt. Controleer de internetverbinding en probeer opnieuw.");
    renderAgendaView(items);
    return;
  }
  window._agendaCache = items;
  renderAgendaView(items);
}

async function addAgendaItem(datum){
  const items = window._agendaCache || await getAgenda();
  const maxSort = items.reduce((m,it)=>Math.max(m, it.sort||0), 0);
  items.push({
    id: uid(),
    sort: maxSort + 1,
    dagdeel: "",
    datum: datum || "",
    activiteit: "",
    maker1: "",
    maker2: "",
    bijzonderheden: "",
    begeleiding: "",
    dagverantwoordelijke: "",
    kostenBoekingen: []
  });
  window._agendaCache = items;
  if(datum) window._agendaExpanded = {...(window._agendaExpanded||{}), [datum]: true};
  renderAgendaView(items);
}

async function removeAgendaItem(id){
  if(!confirm("Dit dagdeel-blok verwijderen uit de planning?")) return;
  const items = (window._agendaCache || []).filter(it=>it.id !== id);
  window._agendaCache = items;
  renderAgendaView(items);
}

// ---------- KOSTENBOEKINGEN TOEVOEGEN/VERWIJDEREN ----------
async function addKostenBoeking(itemId){
  const items = window._agendaCache || [];
  const idx = items.findIndex(it=>it.id===itemId);
  if(idx===-1) return;
  // eerst de rest van dit blok bewaren zoals de gebruiker het nu heeft ingevuld
  const updated = readAgendaItemFromForm(items[idx]);
  updated.kostenBoekingen = [...(updated.kostenBoekingen||[]), {id: uid(), omschrijving:"", bedrag:"0"}];
  items[idx] = updated;
  window._agendaCache = items;
  renderAgendaView(items);
}
async function removeKostenBoeking(itemId, bookingId){
  const items = window._agendaCache || [];
  const idx = items.findIndex(it=>it.id===itemId);
  if(idx===-1) return;
  const updated = readAgendaItemFromForm(items[idx]);
  updated.kostenBoekingen = (updated.kostenBoekingen||[]).filter(b=>b.id!==bookingId);
  items[idx] = updated;
  window._agendaCache = items;
  renderAgendaView(items);
}

// ---------- TERUGZETTEN NAAR STANDAARD ----------
async function showResetAgenda(){
  render(`
    ${topbar("Dagplanning", "showAgenda")}
    <div class="card" style="border-color:var(--red);">
      <h2 style="border-color:var(--red);color:#e08a72;">⚠️ Terugzetten naar standaardplanning?</h2>
      <p>Dit vervangt de huidige dagplanning door de oorspronkelijke planning uit Programma.xlsx. Eigen wijzigingen (incl. kostenboekingen en afgeronde dagen) gaan hiermee verloren.</p>
      <button class="full danger" onclick="confirmResetAgenda()">Ja, zet terug naar standaard</button>
      <button class="secondary full" onclick="showAgenda()">Annuleer</button>
    </div>
  `);
}
async function confirmResetAgenda(){
  render(`<div class="loading">Standaardplanning terugzetten...</div>`);
  const items = DEFAULT_AGENDA.map(x=>({...x, kostenBoekingen: (x.kostenBoekingen||[]).map(b=>({...b}))}));
  await setAgenda(items);
  window._agendaCache = items;
  window._agendaExpanded = {};
  renderAgendaView(items);
}