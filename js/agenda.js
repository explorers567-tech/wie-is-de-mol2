// ============================================================
//  AGENDA.JS — Dagplanning voor het leiding-gedeelte
//  Sluit aan op de bestaande app.js: gebruikt dezelfde render(),
//  topbar(), esc() en sGet()/sSet() (Firebase Realtime Database)
//  functies, dus die moeten vóór dit bestand geladen zijn.
// ============================================================

// De planning wordt in Firebase opgeslagen onder "agenda" (array van dagdeel-blokken).
// Bij de allereerste keer openen (nog niets in de database) wordt hij automatisch
// gevuld met onderstaande standaardplanning, overgenomen uit Programma.xlsx.
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
    "kosten": "0",
    "begeleiding": "Mathijs",
    "dagverantwoordelijke": ""
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
    "kosten": "0",
    "begeleiding": "NVT",
    "dagverantwoordelijke": ""
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
    "kosten": "0",
    "begeleiding": "Menno",
    "dagverantwoordelijke": ""
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
    "kosten": "1",
    "begeleiding": "Diewertje",
    "dagverantwoordelijke": "Ruben"
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
    "kosten": "0",
    "begeleiding": "Menno",
    "dagverantwoordelijke": "Ruben"
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
    "kosten": "0",
    "begeleiding": "Gerwin",
    "dagverantwoordelijke": "Ruben"
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
    "kosten": "",
    "begeleiding": "Gerwin",
    "dagverantwoordelijke": "Sietse"
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
    "kosten": "",
    "begeleiding": "NVT",
    "dagverantwoordelijke": "Sietse"
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
    "kosten": "1",
    "begeleiding": "Mathijs",
    "dagverantwoordelijke": "Sietse"
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
    "kosten": "0",
    "begeleiding": "Diewertje",
    "dagverantwoordelijke": "Jaimy"
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
    "kosten": "0",
    "begeleiding": "Menno",
    "dagverantwoordelijke": "Jaimy"
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
    "kosten": "1",
    "begeleiding": "Mathijs",
    "dagverantwoordelijke": "Jaimy"
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
    "kosten": "0",
    "begeleiding": "Mathijs",
    "dagverantwoordelijke": "Lianne"
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
    "kosten": "0",
    "begeleiding": "NVT",
    "dagverantwoordelijke": "Lianne"
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
    "kosten": "1",
    "begeleiding": "Diewertje",
    "dagverantwoordelijke": "Lianne"
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
    "kosten": "0",
    "begeleiding": "Menno",
    "dagverantwoordelijke": "Ruben"
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
    "kosten": "0",
    "begeleiding": "Mathijs",
    "dagverantwoordelijke": "Ruben"
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
    "kosten": "0",
    "begeleiding": "Begeleiding",
    "dagverantwoordelijke": "Ruben"
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
    "kosten": "0",
    "begeleiding": "Gerwin",
    "dagverantwoordelijke": "Sietse"
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
    "kosten": "0",
    "begeleiding": "Menno",
    "dagverantwoordelijke": "Sietse"
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
    "kosten": "0",
    "begeleiding": "Gerwin",
    "dagverantwoordelijke": "Sietse"
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
    "kosten": "0",
    "begeleiding": "Begeleiding",
    "dagverantwoordelijke": ""
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
    "kosten": "0",
    "begeleiding": "Mathijs",
    "dagverantwoordelijke": ""
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
    "kosten": "0",
    "begeleiding": "Begeleiding",
    "dagverantwoordelijke": ""
  }
];

// ---------- DATA TOEGANG ----------
async function getAgenda(){
  const raw = await sGet("agenda");
  let items = toArr(raw);
  if(items.length === 0){
    // Nog geen planning in de database: eenmalig vullen met de standaardplanning.
    items = DEFAULT_AGENDA.map(x=>({...x}));
    await sSet("agenda", items);
  }
  return items;
}
async function setAgenda(items){
  return await sSet("agenda", items);
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

// ---------- WEERGAVE: DAGPLANNING (LEIDING) ----------
async function showAgenda(){
  render(`<div class="loading">Dagplanning laden...</div>`);
  const items = await getAgenda();
  window._agendaCache = items; // tijdelijk in het geheugen, zodat velden bij opslaan opgehaald kunnen worden
  renderAgendaView(items);
}

function renderAgendaView(items){
  const {dates, groups} = groupAgendaByDate(items);

  let html = `
    ${topbar("Dagplanning", "showAdminHome")}
    <div class="card">
      <h2>🗓️ Dagplanning van het kamp</h2>
      <p class="small">Hier staat het volledige programma per dagdeel: activiteit, programmamakers, bijzonderheden, kosten en wie welke dag begeleidt of verantwoordelijk is. Wijzig gerust een veld en druk daarna op "Wijzigingen opslaan" onderaan.</p>
    </div>
  `;

  dates.forEach(dateKey=>{
    const dayItems = groups[dateKey];
    html += `<div class="card">
      <h2>${esc(agendaDayLabel(dateKey))}</h2>`;

    dayItems.forEach(it=>{
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
          <div class="row">
            <div style="width:100px"><label>Kosten</label><input type="text" id="ag_kosten_${it.id}" value="${esc(it.kosten)}"></div>
            <div style="flex:1"><label>Begeleiding</label><input type="text" id="ag_begeleiding_${it.id}" value="${esc(it.begeleiding)}"></div>
            <div style="flex:1"><label>Dagverantwoordelijke</label><input type="text" id="ag_dagverantwoordelijke_${it.id}" value="${esc(it.dagverantwoordelijke)}"></div>
          </div>
          <button class="danger" style="margin-top:8px" onclick="removeAgendaItem('${esc(it.id)}')">Verwijder dit blok</button>
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
      <button class="full" onclick="saveAgendaChanges()">💾 Wijzigingen opslaan</button>
      <button class="secondary full" onclick="showResetAgenda()">↻ Terugzetten naar standaardplanning</button>
    </div>
  `;

  render(html);
}

// ---------- BEWERKEN ----------
async function saveAgendaChanges(){
  const items = (window._agendaCache || []).map(it=>{
    const get = (field)=>{
      const el = document.getElementById(`ag_${field}_${it.id}`);
      return el ? el.value.trim() : it[field];
    };
    return {
      ...it,
      dagdeel: get("dagdeel"),
      datum: get("datum"),
      activiteit: get("activiteit"),
      maker1: get("maker1"),
      maker2: get("maker2"),
      bijzonderheden: get("bijzonderheden"),
      kosten: get("kosten"),
      begeleiding: get("begeleiding"),
      dagverantwoordelijke: get("dagverantwoordelijke")
    };
  });
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
    kosten: "0",
    begeleiding: "",
    dagverantwoordelijke: ""
  });
  window._agendaCache = items;
  renderAgendaView(items);
}

async function removeAgendaItem(id){
  if(!confirm("Dit dagdeel-blok verwijderen uit de planning?")) return;
  const items = (window._agendaCache || []).filter(it=>it.id !== id);
  window._agendaCache = items;
  renderAgendaView(items);
}

async function showResetAgenda(){
  render(`
    ${topbar("Dagplanning", "showAgenda")}
    <div class="card" style="border-color:var(--red);">
      <h2 style="border-color:var(--red);color:#e08a72;">⚠️ Terugzetten naar standaardplanning?</h2>
      <p>Dit vervangt de huidige dagplanning door de oorspronkelijke planning uit Programma.xlsx. Eigen wijzigingen gaan hiermee verloren.</p>
      <button class="full danger" onclick="confirmResetAgenda()">Ja, zet terug naar standaard</button>
      <button class="secondary full" onclick="showAgenda()">Annuleer</button>
    </div>
  `);
}
async function confirmResetAgenda(){
  render(`<div class="loading">Standaardplanning terugzetten...</div>`);
  const items = DEFAULT_AGENDA.map(x=>({...x}));
  await setAgenda(items);
  window._agendaCache = items;
  renderAgendaView(items);
}