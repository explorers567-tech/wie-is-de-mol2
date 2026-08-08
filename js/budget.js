// ============================================================
//  BUDGET.JS — Budgetoverzicht (leiding-gedeelte)
//  Sluit aan op app.js (render(), topbar(), esc(), sGet()/sSet())
//  en op agenda.js (getAgenda(), groupAgendaByDate(), agendaDayLabel()).
//  Moet dus NA app.js én NA agenda.js geladen worden.
// ============================================================

// Denemarken zit vast aan de euro via ERM II, dus de koers schommelt maar heel weinig
// (doorgaans tussen de 7,44 en 7,47). Dit is puur een startwaarde — pas 'm aan of haal
// de actuele koers op met de knop in het scherm.
const DEFAULT_EXCHANGE_RATE_DKK_PER_EUR = 7.46;

// ---------- DATA TOEGANG ----------
async function getBudgetSettings(){
  const raw = await sGet("budget");
  if(!raw || typeof raw !== "object"){
    return {budgetEur: 0, exchangeRate: DEFAULT_EXCHANGE_RATE_DKK_PER_EUR};
  }
  return {
    budgetEur: (typeof raw.budgetEur === "number") ? raw.budgetEur : parseFloat(raw.budgetEur) || 0,
    exchangeRate: (typeof raw.exchangeRate === "number" && raw.exchangeRate > 0) ? raw.exchangeRate : DEFAULT_EXCHANGE_RATE_DKK_PER_EUR
  };
}
async function setBudgetSettings(settings){
  return await sSet("budget", settings);
}

// Nederlandse/Deense invoer kan een komma als decimaalteken gebruiken; dit maakt er
// altijd een bruikbaar getal van (en NaN/lege velden tellen gewoon als 0).
function parseAmount(v){
  if(typeof v === "number") return v;
  if(!v) return 0;
  const n = parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? 0 : n;
}

function formatEUR(n){
  return "€ " + n.toLocaleString("nl-NL", {minimumFractionDigits:2, maximumFractionDigits:2});
}
function formatDKK(n){
  return n.toLocaleString("da-DK", {minimumFractionDigits:2, maximumFractionDigits:2}) + " kr.";
}

// ---------- KOSTEN OPHALEN UIT DE DAGPLANNING (agenda.js) ----------
// Elk dagdeel-blok uit de dagplanning heeft nu 0 of meer losse kostenboekingen
// (omschrijving + bedrag in DKK). Hier tellen we die allemaal bij elkaar op, en
// geven we ook de uitsplitsing per dagdeel/boeking terug voor het overzicht.
async function getCostBreakdown(){
  const items = await getAgenda();
  let totalDkk = 0;
  const breakdown = items.map(it => {
    const boekingen = (it.kostenBoekingen || []).map(b => {
      const bedrag = parseAmount(b.bedrag);
      totalDkk += bedrag;
      return {...b, bedrag};
    });
    const itemTotalDkk = boekingen.reduce((s,b)=> s + b.bedrag, 0);
    return {...it, boekingen, itemTotalDkk};
  });
  return {breakdown, totalDkk};
}

// ---------- WEERGAVE: BUDGETOVERZICHT ----------
async function showBudget(){
  render(`<div class="loading">Budget laden...</div>`);
  const settings = await getBudgetSettings();
  const {breakdown, totalDkk} = await getCostBreakdown();
  renderBudgetView(settings, breakdown, totalDkk);
}

function renderBudgetView(settings, breakdown, totalDkk){
  const rate = settings.exchangeRate;
  const totalEur = totalDkk / rate;
  const budgetEur = settings.budgetEur;
  const budgetDkk = budgetEur * rate;
  const restEur = budgetEur - totalEur;
  const restDkk = budgetDkk - totalDkk;
  const isNegative = restEur < 0;

  const {dates, groups} = groupAgendaByDate(breakdown);
  let breakdownHtml = "";
  dates.forEach(dateKey=>{
    const dayItems = groups[dateKey];
    const dayTotalDkk = dayItems.reduce((s,it)=>s+it.itemTotalDkk, 0);
    breakdownHtml += `<div class="qlist-item">
      <div class="flex-between"><strong>${esc(agendaDayLabel(dateKey))}</strong><span class="small">${formatDKK(dayTotalDkk)} (≈ ${formatEUR(dayTotalDkk/rate)})</span></div>`;
    dayItems.forEach(it=>{
      if(it.boekingen.length === 0) return;
      breakdownHtml += `<div class="small" style="padding:6px 0;border-top:1px solid rgba(255,255,255,0.08)">
        <div class="flex-between"><strong>${esc(it.dagdeel)} — ${esc(it.activiteit || "(geen omschrijving)")}</strong><span>${formatDKK(it.itemTotalDkk)}</span></div>`;
      it.boekingen.forEach(b=>{
        breakdownHtml += `<div class="flex-between" style="padding-left:14px;color:var(--parchment-dark)">
          <span>${esc(b.omschrijving || "(geen omschrijving)")}</span><span>${formatDKK(b.bedrag)}</span>
        </div>`;
      });
      breakdownHtml += `</div>`;
    });
    breakdownHtml += `</div>`;
  });
  if(!breakdownHtml){
    breakdownHtml = "<p class='small'>Nog geen dagdelen in de planning. Vul eerst de dagplanning in.</p>";
  }

  render(`
    ${topbar("Budget", "showAdminHome")}

    <div class="card">
      <h2>💶 Budget instellen</h2>
      <label>Totaal budget (in euro's)</label>
      <input type="number" step="0.01" min="0" id="bg_budgetEur" value="${budgetEur}">
      <label style="margin-top:8px">Wisselkoers (DKK per 1 euro)</label>
      <div class="row">
        <input type="number" step="0.0001" min="0.0001" id="bg_rate" value="${rate}" style="flex:1">
        <button class="secondary" onclick="fetchLiveRate()">🔄 Actuele koers ophalen</button>
      </div>
      <p class="small" id="bg_rateInfo">Standaard staat hier een indicatieve koers klaar; Denemarken hangt de kroon vast aan de euro, dus de koers verandert nauwelijks.</p>
      <button class="full" style="margin-top:10px" onclick="saveBudgetSettings()">Opslaan</button>
    </div>

    <div class="card center">
      <h2>📊 Overzicht</h2>
      <div class="row">
        <div style="flex:1">
          <p class="small">Budget</p>
          <p style="font-size:20px"><strong>${formatEUR(budgetEur)}</strong></p>
          <p class="small">≈ ${formatDKK(budgetDkk)}</p>
        </div>
        <div style="flex:1">
          <p class="small">Gemaakte kosten</p>
          <p style="font-size:20px"><strong>${formatDKK(totalDkk)}</strong></p>
          <p class="small">≈ ${formatEUR(totalEur)}</p>
        </div>
      </div>
      <hr style="margin:14px 0;border-color:rgba(255,255,255,0.15)">
      <p class="small">${isNegative ? "Budget overschreden met" : "Nog te besteden"}</p>
      <p style="font-size:28px;color:${isNegative ? "var(--red)" : "inherit"}"><strong>${formatEUR(Math.abs(restEur))}</strong></p>
      <p class="small" style="color:${isNegative ? "var(--red)" : "inherit"}">≈ ${formatDKK(Math.abs(restDkk))}</p>
    </div>

    <div class="card">
      <h2>🧾 Kosten per dag</h2>
      <p class="small">Kostenboekingen worden per dagdeel toegevoegd bij de <a href="#" onclick="showAgenda();return false;" style="color:var(--gold-light)">Dagplanning</a> (met omschrijving en bedrag). Hier zie je ze automatisch per boeking en per dag opgeteld.</p>
      ${breakdownHtml}
    </div>
  `);
}

// ---------- OPSLAAN ----------
async function saveBudgetSettings(){
  const budgetEur = parseAmount(document.getElementById("bg_budgetEur").value);
  const rateInput = parseFloat(document.getElementById("bg_rate").value);
  const exchangeRate = (rateInput && rateInput > 0) ? rateInput : DEFAULT_EXCHANGE_RATE_DKK_PER_EUR;
  render(`<div class="loading">Budget opslaan...</div>`);
  const ok = await setBudgetSettings({budgetEur, exchangeRate});
  if(!ok){
    alert("Opslaan is helaas mislukt. Controleer de internetverbinding en probeer opnieuw.");
  }
  showBudget();
}

// ---------- LIVE WISSELKOERS OPHALEN (optioneel, vereist internet) ----------
// Gebruikt de gratis, sleutelloze API van Frankfurter.app (gebaseerd op ECB-koersen).
// Werkt niet? Dan blijft gewoon de handmatig ingevulde koers gelden — geen probleem
// op een kampterrein met wisselend bereik.
async function fetchLiveRate(){
  const info = document.getElementById("bg_rateInfo");
  if(info) info.textContent = "Actuele koers ophalen...";
  try{
    const r = await fetch("https://api.frankfurter.app/latest?from=EUR&to=DKK");
    if(!r.ok) throw new Error("request failed");
    const data = await r.json();
    const rate = data && data.rates && data.rates.DKK;
    if(!rate) throw new Error("geen koers in antwoord");
    document.getElementById("bg_rate").value = rate;
    if(info) info.textContent = "Actuele koers opgehaald: 1 euro = " + rate + " DKK (bron: Frankfurter.app / ECB). Vergeet niet op 'Opslaan' te drukken.";
  } catch(e){
    console.error("live koers ophalen mislukt", e);
    if(info) info.textContent = "Kon geen actuele koers ophalen (geen internet?). Vul de koers handmatig in.";
  }
}