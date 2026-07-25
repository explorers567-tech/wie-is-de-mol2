async function sha256Hex(str){
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

// ---------- VIKING-ILLUSTRATIES (episch fantasy-artwork, aangeleverd door de organisatie) ----------
// "win" = gouden/triomfantelijke sfeer voor het groene scherm & dagwinnaar
// "lose" = donkere/sombere sfeer voor het rode scherm & dag-verliezer
const VIKING_IMG = {
  win: "assets/images/Winner.png",
  lose: "assets/images/Loser.png",
  start: "assets/images/Basic.png"
};

const POINTS_PER_Q = 10;
let NUM_DAYS = 6;
function getDays(){ return Array.from({length: NUM_DAYS}, (_,i)=>i+1); }
async function loadNumDays(){
  const n = await sGet("config/numDays");
  NUM_DAYS = (typeof n === "number" && n >= 1 && n <= 10) ? n : 6;
}
let me = null;
let isAdmin = false;
let quizState = null;

// ---------- FIREBASE CONFIG (vast ingesteld) ----------
const FIREBASE_URL_DEFAULT = "https://wie-is-de-mol-2026-default-rtdb.europe-west1.firebasedatabase.app";
let FIREBASE_URL = localStorage.getItem("mol_firebase_url") || FIREBASE_URL_DEFAULT;

async function sGet(path){
  if(!FIREBASE_URL) return null;
  try{
    const r = await fetch(FIREBASE_URL.replace(/\/$/,"") + "/" + path + ".json");
    if(!r.ok) return null;
    const data = await r.json();
    return data === null ? null : data;
  } catch(e){ console.error("firebase get failed", path, e); return null; }
}
async function sSet(path, val){
  if(!FIREBASE_URL){ console.error("Geen database-URL ingesteld."); return false; }
  try{
    const r = await fetch(FIREBASE_URL.replace(/\/$/,"") + "/" + path + ".json", {
      method: "PUT",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(val)
    });
    if(!r.ok){
      const t = await r.text().catch(()=> "");
      console.error("firebase set niet ok", path, r.status, t);
    }
    return r.ok;
  } catch(e){ console.error("firebase set failed", path, e); return false; }
}

function uid(){ return "p" + Math.random().toString(36).slice(2,9); }
function esc(s){ return (s||"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

function toArr(v){
  if(!v) return [];
  return Array.isArray(v) ? v.filter(Boolean) : Object.values(v).filter(Boolean);
}
async function getPlayers(){
  const d = await sGet("players");
  return toArr(d);
}
async function getBank(){
  const d = await sGet("bank");
  return toArr(d).map(q => ({
    id: q.id,
    text: q.text || "",
    options: toArr(q.options),
    correctIndex: (typeof q.correctIndex === "number") ? q.correctIndex : 0,
    category: q.category || null,
    targetPlayerId: q.targetPlayerId || null
  }));
}
// FIX: getDay gebruikte eerder een getal als sleutel — Firebase slaat dit op als array-index.
// Door de sleutel als string "day_N" op te slaan, werkt dag 1 correct.
// Daarnaast normaliseren we questionIds/dayQuestions altijd naar een echte array: Firebase
// geeft lijsten soms terug als object (bijv. na verwijderingen), en zonder deze fix liep
// het laden van de test dan vast zonder foutmelding.
async function getDay(n){
  const d = await sGet("days/day_"+n);
  if(!d) return {questionIds:[], dayQuestions:[], molId:null, open:false, votingOpen:false, closed:false, molCategories:[]};
  return {
    ...d,
    questionIds: toArr(d.questionIds),
    molCategories: toArr(d.molCategories),
    dayQuestions: toArr(d.dayQuestions).map(q => ({
      text: (q && q.text) || "",
      options: toArr(q && q.options),
      correctIndex: (q && typeof q.correctIndex === "number") ? q.correctIndex : 0
    }))
  };
}
async function setDay(n, val){ return await sSet("days/day_"+n, val); }
async function getAnswer(day, playerId){ return await sGet("answers/day_"+day+"/"+playerId); }
async function setAnswer(day, playerId, val){ return await sSet("answers/day_"+day+"/"+playerId, val); }
async function getProfile(playerId){ return (await sGet("profiles/"+playerId)) || {}; }
async function saveProfile(playerId, data){ return await sSet("profiles/"+playerId, data); }

// ---------- MOLLICITATIE VRAGEN ----------
const FIXED_QUESTIONS = [
  {key:"eten",       label:"Wat is jouw favoriete eten",                           molQ:"Van welk voedsel houdt onze dag Mol het meest?"},
  {key:"muziek",     label:"Wat is jouw favoriete muziek / artiest",               molQ:"Naar welke muziek luistert onze dag Mol het liefst?"},
  {key:"film",       label:"Wat is jouw favoriete film of serie",                  molQ:"Wat is de favoriete film of serie van onze dag Mol?"},
  {key:"huisdier",   label:"Welke huisdieren heb jij",                             molQ:"Welk huisdier (of huisdieren) heeft onze dag Mol?"},
  {key:"hobby",      label:"Wat is jouw hobby naast scouting",                     molQ:"Wat doet onze dag Mol het liefst in zijn of haar vrije tijd?"},
  {key:"vak",        label:"Wat is jouw lievelingsvak op school",                  molQ:"Wat is het lievelingsvak van onze dag Mol op school?"},
  {key:"vakantie",   label:"Wat is jouw droomvakantiebestemming",                  molQ:"Waar wil onze dag Mol het allerliefst naartoe op vakantie?"},
  {key:"bijnaam",    label:"Wat is jouw bijnaam",                                  molQ:"Welke bijnaam heeft onze dag Mol?"},
  {key:"minstvak",   label:"Wat is jouw minst favoriete vak",                      molQ:"Waar heeft onze dag Mol een hekel aan op school?"},
  {key:"genant",     label:"Welke gênante situatie heb je meegemaakt",             molQ:"Wat is er ooit gênants gebeurd bij onze dag Mol?"},
  {key:"jeugd",      label:"Welke goede jeugdherinnering heb jij",                 molQ:"Wat is een jeugdherinnering van onze dag Mol?"},
  {key:"superkracht",label:"Welke superkracht zou je graag willen",                molQ:"Welke superkracht zou onze dag Mol kiezen?"},
  {key:"goedin",     label:"Waar ben je stiekem goed in",                          molQ:"Waar is onze dag Mol stiekem heel goed in?"},
  {key:"droom",      label:"Wat is jouw grootste droom of ambitie",                molQ:"Wat is de grote droom of ambitie van onze dag Mol?"},
  {key:"gewoonte",   label:"Welke typische eigenaardigheid heb jij",               molQ:"Welke typische gewoonte heeft onze dag Mol?"},
  {key:"bang",       label:"Waar was je vroeger bang voor, maar nu niet meer",     molQ:"Waar was onze dag Mol vroeger bang voor?"},
  {key:"trots",      label:"Waar ben jij het meest trots op",                      molQ:"Waar is onze dag Mol het meest trots op?"},
  {key:"Schoenmaat", label:"Welke schoonmaat heb je",                              molQ:"Wat is de schoenmaat van onze dag Mol?"},
  {key:"Lengte",     label:"Hoe lang ben je (in centimeters)",                     molQ:"Hoe lang is onze dag Mol?"},
  {key:"Ogen",       label:"Welke kleur ogen heb je",                              molQ:"Welke kleur ogen heeft onze dag Mol?"},
  {key:"Merk",       label:"Wat is je favourite merk",                             molQ:"Wat ishet favourite merk van onze dag Mol?"},
  {key:"Broer",      label:"Hoeveel broers en of zussen heb je",                   molQ:"Hoeveel broers en of zussen heeft onze dag Mol?"},
  {key:"Drankje",    label:"Wat is je favourite drankje",                          molQ:"Wat is het favourite drankje van onze dag Mol?"},
  {key:"Dier",       label:"Als je een dier zou mogen worden, welk dier zou je dan kiezen", molQ:"In welk dier zou onze dag Mol willen veranderen?"},
  {key:"Zwemdiploma",label:"Welke zwemdiploma's heb je",                           molQ:"Welke zwemdiploa's heeft onze dag Mol?"},
  {key:"Haarkleur",  label:"Wat is je haarkleur",                                  molQ:"Wat is de haarkleur van onze dag Mol?"},
  {key:"Scouting",   label:"Hoe lang zit je al op scouting (in jaren)",            molQ:"Hoeveel jaar zit onze dag Mol al op scouting?"},
  {key:"onzichtbaar",label:"Wat zou je doen als je 1 dag onzichtbaar was",         molQ:"Wat zou onze dag Mol doen als hij of zij 1 dag onzichtbaar was?"}
];

function render(html){ document.getElementById("content").innerHTML = html; }

function topbar(title, backFn){
  return `<div class="topbar">
    <button class="secondary" onclick="(${backFn})()">&larr; Terug</button>
    <strong style="color:var(--wood-dark)">${esc(title)}</strong>
    <span></span>
  </div>`;
}

// ---------- START ----------
async function showStart(){
  await loadNumDays();
  isAdmin = false; me = null;
  render(`
    <div class="card center">
      <img class="hero-banner" src="${VIKING_IMG.start}" alt="Vikingheer en Vikingdame">
      <h2>Welkom, Viking</h2>
      <p>Ben je een dappere strijder die de test gaat doen, of een van de wijze en super toffe Begeleidings die alles regelt?</p>
      <button class="full" onclick="showPlayerLogin()">Ik ben speler</button>
      <button class="full secondary" onclick="showAdminLogin()">Ik ben een Super toffe Begeleiding</button>
    </div>
    <p class="center small" style="color:var(--parchment-dark)"><a href="#" onclick="showSetup();return false;" style="color:var(--gold-light)">database-koppeling wijzigen</a></p>
  `);
}

// ---------- PLAYER LOGIN ----------
async function showPlayerLogin(){
  render(`
    <div class="card">
      <h2>Wie ben jij?</h2>
      <p>Typ hier gewoon jouw eigen voor en achter naam in. Is dit de eerste keer dat je meedoet? Dan word je automatisch aangemeld!</p>
      <label>Jouw voor en achter naam</label>
      <input type="text" id="playerNameInput" placeholder="Voer je voor en achter naam in..." autocomplete="off">
      <div id="loginError" style="color:var(--red);font-size:13px;margin-top:6px;display:none;"></div>
      <button class="full" style="margin-top:14px" onclick="confirmPlayer()">Verder</button>
      <button class="secondary full" onclick="showStart()">&larr; Terug</button>
    </div>
  `);
  // Enter-toets werkt ook
  setTimeout(()=>{
    const inp = document.getElementById("playerNameInput");
    if(inp) inp.addEventListener("keydown", e=>{ if(e.key==="Enter") confirmPlayer(); });
  }, 50);
}

async function confirmPlayer(){
  const input = document.getElementById("playerNameInput").value.trim();
  if(!input){
    document.getElementById("loginError").textContent = "Vul je naam in.";
    document.getElementById("loginError").style.display = "block";
    return;
  }
  render(`<div class="loading">Naam controleren...</div>`);
  const players = await getPlayers();
  // Hoofdletterongevoelige vergelijking zodat "menno" en "Menno" beide werken
  const found = players.find(p => p.name.trim().toLowerCase() === input.toLowerCase());
  if(found){
    me = found;
    const profile = await getProfile(me.id);
    if(!profile || !profile.completed){
      showProfileIntake(profile || {});
    } else {
      showPlayerHome();
    }
    return;
  }
  // Naam nog niet bekend: vraag om bevestiging en meld de speler dan zelf aan.
  render(`
    <div class="card">
      <h2>Nieuw hier?</h2>
      <p>We kennen de voor en achter naam <strong>${esc(input)}</strong> nog niet. Klopt de spelling? Dan word je hiermee aangemeld als nieuwe Viking-Wie-Is-De-Mol-strijder.</p>
      <div class="row">
        <button onclick="createAndLoginPlayer('${esc(input).replace(/'/g,"\\'")}')">✓ Ja, dit ben ik — meld mij aan</button>
        <button class="secondary" onclick="showPlayerLogin()">Nee, ik typ het opnieuw</button>
      </div>
    </div>
  `);
}

async function createAndLoginPlayer(name){
  render(`<div class="loading">Je wordt aangemeld...</div>`);
  const players = await getPlayers();
  // Dubbele check (voor het geval iemand tegelijk inlogt)
  const existing = players.find(p => p.name.trim().toLowerCase() === name.toLowerCase());
  if(existing){
    me = existing;
  } else {
    const newPlayer = {id: uid(), name};
    players.push(newPlayer);
    const ok = await sSet("players", players);
    if(!ok){
      render(`<div class="card center"><p style="color:var(--red)">Aanmelden is helaas mislukt. Controleer de internetverbinding en probeer opnieuw.</p><button onclick="showPlayerLogin()">Terug</button></div>`);
      return;
    }
    me = newPlayer;
  }
  const profile = await getProfile(me.id);
  if(!profile || !profile.completed){
    showProfileIntake(profile || {});
  } else {
    showPlayerHome();
  }
}

// ---------- MOLLICITATIE BIJ EERSTE LOGIN ----------
function showProfileIntake(existingProfile){
  let html = `
    <div class="card">
      <h2>Welkom bij Wie is de Mol, ${esc(me.name)}!</h2>
      <p>Voordat je begint, vul je eerst jouw <strong>mollicitatie</strong> in. Jouw antwoorden worden gebruikt om vragen over jou te maken voor de andere spelers. Niemand anders ziet jouw antwoorden — alleen de organisatie. Probeer de vragen zo eerlijk mogelijk in te vullen.</p>
    </div>
    <div class="card">
      <h2>Jouw mollicitatie</h2>
  `;
  FIXED_QUESTIONS.forEach(fq=>{
    html += `<label>${esc(fq.label)}</label><textarea id="intake_${fq.key}" placeholder="Jouw antwoord...">${esc((existingProfile && existingProfile[fq.key])||"")}</textarea>`;
  });
  html += `
      <button class="full" style="margin-top:16px" onclick="submitProfileIntake()">✓ Klaar — ga naar de testen</button>
    </div>
  `;
  render(html);
}

async function submitProfileIntake(){
  const data = {completed: true};
  FIXED_QUESTIONS.forEach(fq=>{
    const el = document.getElementById("intake_"+fq.key);
    if(el){
      const v = el.value.trim();
      if(v) data[fq.key] = v;
    }
  });
  render(`<div class="loading">Antwoorden opslaan...</div>`);
  const ok = await saveProfile(me.id, data);
  if(!ok){ alert("Opslaan is mislukt. Controleer je internetverbinding en probeer opnieuw."); showProfileIntake(data); return; }
  showPlayerHome();
}

// ---------- PLAYER HOME ----------
async function showPlayerHome(){
  render(`<div class="loading">Overzicht laden...</div>`);
  let rows = "";
  for(const d of getDays()){
    const day = await getDay(d);
    const ans = await getAnswer(d, me.id);
    let status, action;
    if(!day.open){
      status = `<span class="small">nog niet geopend</span>`;
      action = `<button disabled class="secondary">Gesloten</button>`;
    } else if(ans && ans.submitted){
      status = `<span class="small">ingeleverd ✓</span>`;
      action = `<button class="secondary" disabled>Gedaan</button>`;
    } else {
      status = `<span class="small">klaar om te spelen!</span>`;
      action = `<button onclick="startQuiz(${d})">Start test</button>`;
    }
    rows += `<div class="qlist-item flex-between"><div><strong>Dag ${d}</strong><br>${status}</div>${action}</div>`;
  }
  
const beadsInfo = await getBeadsTotals();
  
  render(`
    ${topbar("Speler: "+me.name, "showStart")}
    <div class="card">
      <h2>Dagtesten</h2>
      ${rows}
    </div>
    <div class="card">
      <p class="small">De uitslag wordt geheim gehouden en vanavond onthuld door de Super toffe Begeleiding tijdens de test en executie. Veel succes, Viking!</p>
    </div>
  `);
  // day.beads = [{name, max, won}, ...]
}

async function getBeadsTotals(){
  let maxTotal = 0, wonTotal = 0;
  for(const d of getDays()){
    const day = await getDay(d);
    (day.beads||[]).forEach(b=>{ maxTotal += (b.max||0); wonTotal += (b.won||0); });
  }
  return {maxTotal, wonTotal};
}
// ---------- QUIZ FLOW ----------
// ---------- MOL-VRAGEN DYNAMISCH OPBOUWEN ----------
// Voor elke door de begeleiding gekozen categorie (bijv. "Haarkleur") wordt één vraag gemaakt
// over de geheime dag-Mol. De opties zijn de daadwerkelijke antwoorden van ALLE spelers voor
// die categorie, waarbij identieke antwoorden (ongeacht hoofdletters/spaties) worden
// samengevoegd tot 1 optie — er wordt dus nooit een naam getoond, alleen de waarde zelf.
async function buildMolQuestions(day, players){
  if(!day.molId) return [];

  const profiles = {};
  for(const p of players){
    profiles[p.id] = await getProfile(p.id);
  }

  const molProfile = profiles[day.molId];
  if(!molProfile) return [];

  // Alle categorieën waar de Mol iets heeft ingevuld
  const available = FIXED_QUESTIONS.filter(f=>{
    return (molProfile[f.key] || "").trim() !== "";
  });

  // Maximaal 12 willekeurige categorieën
  const selected = [...available]
    .sort(()=>Math.random()-0.5)
    .slice(0,12);

  const questions = [];

  for(const fq of selected){

    const key = fq.key;
    const molAnswer = (molProfile[key] || "").trim();

    const uniqueAnswers = [];
    const seen = new Set();

    for(const p of players){

      const profile = profiles[p.id];
      if(!profile) continue;

      const value = (profile[key] || "").trim();
      if(!value) continue;

      const lower = value.toLowerCase();

      if(seen.has(lower)) continue;

      seen.add(lower);
      uniqueAnswers.push(value);
    }

    if(uniqueAnswers.length < 2) continue;

    const others = uniqueAnswers.filter(
      v=>v.toLowerCase()!=molAnswer.toLowerCase()
    );

    if(others.length===0) continue;

    const distractors =
      [...others]
      .sort(()=>Math.random()-0.5)
      .slice(0,3);

    const options = [
      molAnswer,
      ...distractors
    ];

    // Willekeurig schudden
    options.sort(()=>Math.random()-0.5);

    const correctIndex =
      options.findIndex(
        o=>o.toLowerCase()==molAnswer.toLowerCase()
      );

    questions.push({
      text:fq.molQ,
      options,
      correctIndex,
      category:key,
      isMolQuestion:true
    });

  }

  return questions;
}
async function startQuiz(dayNum){
  render(`<div class="loading">Test laden...</div>`);
  try{
    const day = await getDay(dayNum);
    const bank = await getBank();
    const players = await getPlayers();
    const bankQs = day.questionIds.map(id=>bank.find(b=>b.id===id)).filter(Boolean);
    const dayQs = day.dayQuestions || [];
    const molQs = await buildMolQuestions(day, players);
    let allQs = [...molQs, ...bankQs, ...dayQs].map(q=>({...q}));
    allQs.sort(()=>Math.random()-0.5);
    // Vragen zonder (genoeg) opties overslaan, zodat één kapotte vraag niet de hele test blokkeert
    allQs = allQs.filter(q => Array.isArray(q.options) && q.options.length >= 2);
    // Eventuele oudere, over een met-naam-genoemde speler gaande vragen overslaan als die
    // toevallig over jezelf gaan (komt bij nieuwe Mol-vragen niet meer voor, want die noemen
    // nooit een naam — dit is puur nog voor eventuele oude vragenbank-items).
    allQs = allQs.filter(q => q.targetPlayerId !== me.id);
    if(allQs.length===0){
      render(`<div class="card center"><p>Deze dag heeft nog geen (geldige) vragen. Wacht rustig af tot de Super Toffe Begeleiding deze online zet.</p><button onclick="showPlayerHome()">Terug</button></div>`);
      return;
    }
    quizState = {
      dayNum, questions: allQs, idx: 0,
      answers: new Array(allQs.length).fill(null),
      qStart: Date.now(), totalStart: Date.now(),
      times: new Array(allQs.length).fill(0),
      molGuess: null, players
    };
    renderQuizQuestion();
  } catch(e){
    console.error("startQuiz mislukt", e);
    render(`
      <div class="card center">
        <p style="color:#e08a72">Er ging iets mis bij het laden van deze test. Probeer het opnieuw, of laat de Super toffe Begeleiding de vragen van deze dag controleren.</p>
        <button class="full" onclick="startQuiz(${dayNum})">Opnieuw proberen</button>
        <button class="secondary full" onclick="showPlayerHome()">Terug naar overzicht</button>
      </div>
    `);
  }
}

function renderQuizQuestion(){
  const qs = quizState;
  if(qs.idx >= qs.questions.length){
    renderMolGuess();
    return;
  }
  const q = qs.questions[qs.idx];
  const pct = Math.round((qs.idx/(qs.questions.length+1))*100);
  const opts = q.options.map((o,i)=>`<button class="option-btn" onclick="answerQuestion(${i})">${esc(o)}</button>`).join("");
  render(`
    <div class="card">
      <div class="small">Vraag ${qs.idx+1} van ${qs.questions.length}</div>
      <div class="progress-wrap"><div class="progress-bar" style="width:${pct}%"></div></div>
      <h3>${esc(q.text)}</h3>
      ${opts}
    </div>
  `);
  qs.qStart = Date.now();
}

function answerQuestion(i){
  const qs = quizState;
  qs.answers[qs.idx] = i;
  qs.times[qs.idx] = Date.now() - qs.qStart;
  qs.idx++;
  renderQuizQuestion();
}

async function renderMolGuess(){
  const qs = quizState;
  const others = qs.players.filter(p=>p.id!==me.id);
  const opts = others.map(p=>`<button class="option-btn" onclick="answerMolGuess('${p.id}')">${esc(p.name)}</button>`).join("");
  render(`
    <div class="card">
      <h3>Laatste vraag — helemaal geheim...</h3>
      <p>Wie denk jij dat <strong>vandaag</strong> de Mol is?</p>
      ${opts}
    </div>
  `);
}

async function answerMolGuess(playerId){
  quizState.molGuess = playerId;
  await finishQuiz();
}

async function finishQuiz(){
  const qs = quizState;
  render(`<div class="loading">Resultaten opslaan...</div>`);
  const day = await getDay(qs.dayNum);
  // Belangrijk: hier de vragenlijst gebruiken die de speler ook echt te zien kreeg
  // (qs.questions, al gefilterd op geldigheid en op "niet over jezelf") — niet opnieuw
  // opbouwen uit de dag-instellingen, anders lopen antwoorden en vragen uit elkaar.
  const allQs = qs.questions;

  // Als er vragen met een categorie bij zitten (uit de mollicitatie-generator), en er is een
  // geheime Mol voor deze dag, dan telt een antwoord ook goed als het letterlijk hetzelfde is
  // als het antwoord van de Mol op diezelfde categorie — ook al stond dat niet als de
  // "officiële" juiste optie.
  let molProfile = null;
  if(day.molId && allQs.some(q => q && q.category)){
    molProfile = await getProfile(day.molId);
  }

  let correct = 0;
  qs.answers.forEach((a,i)=>{
    const q = allQs[i];
    if(!q) return;
    if(a === q.correctIndex){ correct++; return; }
    if(q.category && molProfile && a !== null && Array.isArray(q.options)){
      const chosenText = (q.options[a] || "").trim().toLowerCase();
      const molAnswer = (molProfile[q.category] || "").trim().toLowerCase();
      if(chosenText && molAnswer && chosenText === molAnswer) correct++;
    }
  });

  const score = correct * POINTS_PER_Q;
  const totalTimeMs = Date.now() - qs.totalStart;
  const record = {
    answers: qs.answers, times: qs.times, totalTimeMs,
    correct, score, molGuess: qs.molGuess, submitted: true, submittedAt: Date.now()
  };
  await setAnswer(qs.dayNum, me.id, record);
  render(`
    <div class="card center">
      <h2>Test ingeleverd!</h2>
      <p>Bedankt, Viking! Je antwoorden zijn opgeslagen.</p>
      <p class="small">De uitslag wordt geheim gehouden en later onthuld door de Super toffe Begeleiding.</p>
      <button class="full" onclick="showPlayerHome()">Terug naar overzicht</button>
    </div>
  `);
}

// ---------- SCOREBOARD ----------
async function computeScoreboard(){
  const players = await getPlayers();
  const totals = {};
  players.forEach(p=>totals[p.id]={id:p.id, name:p.name, points:0, time:0, molDays:[], dayScores:{}});

  for(const d of getDays()){
    const day = await getDay(d);
    const dayScores = {};
    let maxForDay = 0;
    for(const p of players){
      const ans = await getAnswer(d, p.id);
      dayScores[p.id] = (ans && ans.submitted) ? {score: ans.score, time: ans.totalTimeMs||0} : {score:0, time:0};
      // Het aantal vragen kan per dag variëren (dynamische Mol-vragen), dus we bepalen het
      // maximum aan de hand van de langste ingeleverde antwoordenlijst van die dag.
      if(ans && ans.submitted && Array.isArray(ans.answers)){
        maxForDay = Math.max(maxForDay, ans.answers.length * POINTS_PER_Q);
      }
    }
    if(day.molId && day.closed && dayScores[day.molId]){
      let wrongGuessers=0, totalGuessers=0;
      for(const p of players){
        if(p.id===day.molId) continue;
        const ans = await getAnswer(d, p.id);
        if(ans && ans.submitted && ans.molGuess){
          totalGuessers++;
          if(ans.molGuess!==day.molId) wrongGuessers++;
        }
      }
      const bonus = wrongGuessers * POINTS_PER_Q;
      const uncapped = dayScores[day.molId].score + bonus;
      const capped = maxForDay>0 ? Math.min(uncapped, maxForDay) : uncapped;
      totals[day.molId].molDays.push({day:d, bonus, wrongGuessers, totalGuessers, capped: uncapped>capped});
      dayScores[day.molId].score = capped;
    }
    for(const p of players){
      totals[p.id].points += dayScores[p.id].score;
      totals[p.id].time += dayScores[p.id].time;
      totals[p.id].dayScores[d] = dayScores[p.id].score;
    }
  }
  return Object.values(totals).sort((a,b)=> b.points-a.points || a.time-b.time);
}

async function computeDayResults(d){
  // Geeft {winnerId, loserId} exclusief Mol
  const day = await getDay(d);
  if(!day.closed || !day.molId) return null;
  const players = await getPlayers();
  const eligible = players.filter(p=>p.id!==day.molId);
  const scores = [];
  for(const p of eligible){
    const ans = await getAnswer(d, p.id);
    if(ans && ans.submitted){
      scores.push({id:p.id, name:p.name, score:ans.score, time:ans.totalTimeMs||0});
    }
  }
  if(scores.length===0) return null;
  scores.sort((a,b)=>b.score-a.score||a.time-b.time);
  return {winner: scores[0], loser: scores[scores.length-1], all: scores};
}

async function renderScoreboard(targetId, showDayResults){
  const el = document.getElementById(targetId);
  if(!el) return;
  const ranking = await computeScoreboard();
  const rows = ranking.map((r,i)=>`
    <tr class="${i===0?'rank-1':i===ranking.length-1?'rank-last':''}">
      <td>${i===0?'🥇':i===ranking.length-1?'💀':i+1}</td>
      <td>${esc(r.name)}</td>
      <td>${r.points}</td>
      <td class="small">${(r.time/1000).toFixed(1)}s</td>
    </tr>`).join("");
  let html = `
    <table>
      <tr><th>#</th><th>Speler</th><th>Punten</th><th>Tijd</th></tr>
      ${rows}
    </table>
  `;
  el.innerHTML = html;
}

// ---------- ADMIN ----------
async function showAdminLogin(){
  render(`
    <div class="card center">
      <h2>Super toffe Begeleiding</h2>
      <label>Voer de geheime PIN in</label>
      <input type="password" id="pinInput" placeholder="PIN">
      <button class="full" style="margin-top:14px" onclick="checkPin()">Inloggen</button>
      <button class="secondary full" onclick="showStart()">&larr; Terug</button>
    </div>
  `);
  setTimeout(()=>{
    const inp = document.getElementById("pinInput");
    if(inp){ inp.focus(); inp.addEventListener("keydown", e=>{ if(e.key==="Enter") checkPin(); }); }
  }, 50);
}

async function checkPin() {
  const v = document.getElementById("pinInput").value;

  const enteredHash = await sha256Hex(v);
  const storedHash = await sGet("admin/pinHash");

  console.log("PIN ingevoerd:", v);
  console.log("Hash ingevoerd:", enteredHash);
  console.log("Hash opgeslagen:", storedHash);
  console.log("Type opgeslagen:", typeof storedHash);
  console.log("Vergelijking:", enteredHash === storedHash);

  if (storedHash && enteredHash === storedHash) {
    isAdmin = true;
    showAdminHome();
  } else {
    alert("Onjuiste PIN.");
  }
}

async function showAdminHome(){
  const beadsInfo = await getBeadsTotals();
  render(`
    ${topbar("Super toffe Begeleiding", "showStart")}
    <div class="card">
      <h2>Beheer</h2>
      <button class="full" onclick="showDaySettings()">📆 Aantal speeldagen instellen</button>
      <button class="full" onclick="showManagePlayers()">👥 Spelers beheren</button>
      <button class="full" onclick="showManageProfiles()">📝 Mollicitatie-antwoorden bekijken</button>
      <button class="full" onclick="showManageBank()">📚 Vragenbank (handmatig)</button>
      <button class="full" onclick="showManageDays()">📅 Dagen instellen (Mol + vragen)</button>
      <button class="full" onclick="showAdminScoreboard()">🏆 Scorebord & uitslag</button>
      <button class="full" style="background:linear-gradient(180deg,#4a9e4a,#2d6e2d);color:#fff;border-color:#1a4d1a;" onclick="showRevealScreen()">🟢🔴 Rood/Groen onthulscherm</button>
    </div>
    <div class="card" style="border-color:var(--red);">
      <h2 style="border-color:var(--red);color:#e08a72;">⚠️ Gevarenzone</h2>
      <p class="small">Wil je met een nieuwe groep opnieuw beginnen? Reset hieronder de hele database in één keer.</p>
      <button class="full danger" onclick="showResetDatabase()">🗑️ Database volledig resetten</button>
    </div>
    <div class="card center">
  <h2>🔵 Kralen van het kamp</h2>
  <p style="font-size:22px"><strong>${beadsInfo.wonTotal}</strong> / ${beadsInfo.maxTotal}</p>
  <p class="small">Gewonnen tijdens de spellen tot nu toe</p>
</div>
  `);
}

async function confirmSeedTestData(){
  render(`<div class="loading">Testomgeving wordt aangemaakt (15 spelers, 6 dagen)...</div>`);

  // 1) Spelers aanmaken
  const players = TEST_PLAYER_NAMES.map(name => ({id: uid(), name}));
  await sSet("players", players);

  // 2) Mollicitatie-profielen invullen
  const profiles = {};
  players.forEach((p, i) => {
    const profile = {completed: true};
    Object.keys(TEST_PROFILE_DATA).forEach(key => {
      profile[key] = TEST_PROFILE_DATA[key][i % TEST_PROFILE_DATA[key].length];
    });
    profiles[p.id] = profile;
  });
  await sSet("profiles", profiles);

  // 3) Welke onderwerpen gebruiken we als Mol-vragen? Gewoon alle onderwerpen waar we
  //    testdata voor hebben ingevuld — de vragen zelf worden dynamisch gebouwd per dag/Mol,
  //    dus hier hoeft geen vragenbank meer gegenereerd te worden.
  const molCategories = Object.keys(TEST_PROFILE_DATA);

  // 4) Dagvragen (over de "spellen van vandaag") — elke dag krijgt een eigen set
  function makeDayQuestions(){
    return TEST_DAY_GAMES.map(game => {
      const shuffled = [...players].sort(() => Math.random() - 0.5).slice(0, 4);
      const correctIndex = Math.floor(Math.random() * 4);
      return {
        text: `Wie heeft vanmorgen ${game} gewonnen?`,
        options: shuffled.map(p => p.name),
        correctIndex
      };
    });
  }

  // 5) Elke dag opbouwen: eigen Mol, eigen dagvragen, eigen Mol-vragen, én gesimuleerde
  //    resultaten van alle 15 spelers
  const molNames = [];
  
  for(const d of getDays()){

    const dayQuestions = makeDayQuestions();
    const molPlayer = players[(d - 1) % players.length];
    molNames.push(`Dag ${d}: ${molPlayer.name}`);

    const dayObj = {
      questionIds: [],
      dayQuestions,
      molCategories,
      molId: molPlayer.id,
      open: true,
      votingOpen: false,
      closed: true
    };
    await setDay(d, dayObj);

    const molQuestions = await buildMolQuestions(await getDay(d), players);
    const allQsDay = [...molQuestions, ...dayQuestions];
    const answers = {};
    players.forEach(p => {
      const correctRatio = 0.4 + Math.random() * 0.5; // tussen 40% en 90% goed
      const answerArr = allQsDay.map(q => {
        if(Math.random() < correctRatio) return q.correctIndex;
        let wrong = Math.floor(Math.random() * q.options.length);
        if(wrong === q.correctIndex) wrong = (wrong + 1) % q.options.length;
        return wrong;
      });
      const correct = answerArr.filter((a,i) => a === allQsDay[i].correctIndex).length;
      const times = allQsDay.map(() => 3000 + Math.floor(Math.random()*9000));
      const totalTimeMs = times.reduce((a,b)=>a+b, 0);
      const others = players.filter(o => o.id !== p.id);
      const molGuess = others[Math.floor(Math.random()*others.length)].id;
      answers[p.id] = {
        answers: answerArr, times, totalTimeMs,
        correct, score: correct*POINTS_PER_Q,
        molGuess, submitted: true, submittedAt: Date.now()
      };
    });
    await sSet("answers/day_"+d, answers);
  }

  render(`
    <div class="card center">
      <h2>✅ Testomgeving klaar!</h2>
      <p>Er zijn 15 spelers aangemaakt: <strong>${TEST_PLAYER_NAMES.join(", ")}</strong>.</p>
      <p class="small">Alle 6 dagen zijn afgerond met resultaten van alle 15 spelers en een eigen geheime Mol per dag. Bekijk het scorebord of test het onthulscherm meteen op elke dag.</p>
      <p class="small" style="color:var(--parchment-dark)">(Geheim, alleen voor jou als begeleiding: ${molNames.join(" — ")})</p>
      <button class="full" onclick="showAdminHome()">Terug naar beheer</button>
    </div>
  `);
}


// ---------- DATABASE RESET ----------
async function showResetDatabase(){
  render(`
    ${topbar("Database resetten", "showAdminHome")}
    <div class="card" style="border-color:var(--red);">
      <h2 style="border-color:var(--red);color:#e08a72;">⚠️ Weet je het zeker?</h2>
      <p>Dit verwijdert <strong>alles</strong> uit de database, inclusief:</p>
      <ul class="small" style="line-height:1.7;">
        <li>Alle spelers</li>
        <li>Alle mollicitatie-antwoorden</li>
        <li>De hele vragenbank</li>
        <li>Alle dag-instellingen (Mol, geopend/gesloten, dagvragen)</li>
        <li>Alle ingeleverde testantwoorden en scores</li>
      </ul>
      <p class="small" style="color:#e08a72;">Dit kan niet ongedaan worden gemaakt! Typ hieronder <strong>RESET</strong> om te bevestigen.</p>
      <input type="text" id="resetConfirmInput" placeholder="Typ RESET" autocomplete="off">
      <button class="full danger" style="margin-top:14px" onclick="confirmResetDatabase()">🗑️ Ja, verwijder alles definitief</button>
      <button class="secondary full" onclick="showAdminHome()">Annuleer</button>
    </div>
  `);
  setTimeout(()=>{
    const inp = document.getElementById("resetConfirmInput");
    if(inp) inp.addEventListener("keydown", e=>{ if(e.key==="Enter") confirmResetDatabase(); });
  }, 50);
}

async function confirmResetDatabase(){
  const input = document.getElementById("resetConfirmInput").value.trim();
  if(input !== "RESET"){
    alert('Typ precies "RESET" (hoofdletters) om te bevestigen.');
    return;
  }
  render(`<div class="loading">Database wordt volledig geleegd...</div>`);
  // Elke hoofdtak in de database expliciet naar null zetten, zodat er
  // niets van spelers, antwoorden, dagen, profielen of de vragenbank achterblijft.
  const branches = ["players", "bank", "days", "answers", "profiles"];
  let allOk = true;
  for(const branch of branches){
    const ok = await sSet(branch, null);
    if(!ok) allOk = false;
  }
  if(!allOk){
    render(`
      ${topbar("Database resetten", "showAdminHome")}
      <div class="card" style="border-color:var(--red);">
        <p style="color:#e08a72;">Er ging iets mis bij het resetten. Controleer de internetverbinding en de Firebase-regels, en probeer het opnieuw.</p>
        <button class="full" onclick="showResetDatabase()">Opnieuw proberen</button>
      </div>
    `);
    return;
  }
  render(`
    <div class="card center">
      <h2>✅ Database is leeg</h2>
      <p>Alle spelers, antwoorden, dagen en vragen zijn verwijderd. Je kunt nu fris beginnen met een nieuwe groep.</p>
      <button class="full" onclick="showAdminHome()">Terug naar beheer</button>
    </div>
  `);
}

// ---------- ROOD / GROEN ONTHULSCHERM ----------
// function showIntroReveal(color, playerName){

//     const img = color === "green"
//         ? VIKING_IMG.win2
//         : VIKING_IMG.lose2;

//     const div = document.createElement("div");
//     div.className = "reveal-screen " + color;

//     div.innerHTML = `
//         <img class="reveal-portrait"
//              src="${img}"
//              alt=""
//              style="width:100vw;height:100vh;object-fit:cover;">
//     `;

//     document.body.appendChild(div);

//     setTimeout(() => {
//         div.remove();
//         showReveal(color, playerName);
//     }, 3000);
// }

async function showRevealScreen(){
  render(`
    ${topbar("Onthulscherm", "showAdminHome")}
    <div class="card">
      <h2>🟢🔴 Uitslagronde</h2>
      <label>Kies dag</label>

<select id="revealDay">
  ${getDays().map(day => `<option value="${day}">${day}</option>`).join("")}
</select>

<p class="small">
Kies van welke dag je de uitslag wilt tonen.
</p>
      <p class="small">Kies hoe je de uitslag wilt onthullen aan de Vikingen.</p>
      <div class="qlist-item">
        <strong>Optie 1 — Naam intypen, automatische uitslag</strong>
        <p class="small">Typ de naam van een speler in. Op basis van de testresultaten van de laatst afgesloten dag verschijnt automatisch een groen scherm (door naar volgende dag) of een rood scherm (minste vragen goed).</p>
        <button class="full"
        onclick="showAutoRevealScreen(document.getElementById('revealDay').value)">
        Kies optie 1
        </button>
      </div>
      <div class="qlist-item">
        <strong>Optie 2 — Snelle versie</strong>
        <p class="small">Geen naam intypen nodig: de site berekent zelf, op basis van de testresultaten, wie er die dag heeft verloren, en toont met één druk op de knop het rode scherm voor dat kind.</p>
        <button class="full"
        onclick="showManualLoserScreen(document.getElementById('revealDay').value)">
        Kies optie 2
        </button>
      </div>
    </div>
  `);
}

async function showAutoRevealScreen(day){
  render(`
    ${topbar("Onthulscherm — Optie 1", "showRevealScreen")}
    <div class="card">
      <h2>🟢🔴 Automatische uitslag</h2>
      <p class="small">Typ de naam van de speler in. Op basis van de laatst afgesloten dag wordt automatisch bepaald of het scherm rood of groen wordt.</p>
      <label>Naam speler</label>
      <input type="text" id="revealNameInput" placeholder="Bijv. Jan">

      <button class="full" style="margin-top:16px" onclick="checkPlayerResult('${day}')">
        Toon uitslag
      </button>
    </div>
  `);
  setTimeout(()=>{
    const inp = document.getElementById("revealNameInput");
    if(inp) inp.addEventListener("keydown", e=>{ if(e.key==="Enter") checkPlayerResult(day); });
  }, 50);
}

async function checkPlayerResult(day){

  const input = document.getElementById("revealNameInput").value.trim().toLowerCase();

  if(!input){
    alert("Voer een naam in.");
    return;
  }

  const players = await getPlayers();
  const player = players.find(p => p.name.toLowerCase() === input);

  if(!player){
    alert("Speler niet gevonden.");
    return;
  }

  // Use the selected day
  const d = day;

  // Check whether this day has been closed

  const result = await computeDayResults(d);

  if(!result){
    alert("Nog geen uitslag beschikbaar.");
    return;
  }

  if(player.id === result.loser.id){
    showReveal("red", player.name);
  }else{
    showReveal("green", player.name);
  }
}

// ---------- OPTIE 2: SNELLE VERSIE — SITE BEREKENT ZELF WIE ER HEEFT VERLOREN ----------
async function showManualLoserScreen(day){
  render(`<div class="loading">Uitslag berekenen...</div>`);

  // Zoek de laatst afgesloten (bevestigde) dag
const d = day;
const dayInfo = await getDay(d);

if(!dayInfo.closed){
    render(`
      ${topbar("Onthulscherm — Optie 2", "showRevealScreen")}
      <div class="card">
        <p>Dag ${d} is nog niet afgesloten.</p>
      </div>
    `);
    return;
}

  if(!d){
    render(`
      ${topbar("Onthulscherm — Optie 2", "showRevealScreen")}
      <div class="card"><p class="small">Er is nog geen dag afgesloten. Bevestig eerst de Mol-uitslag van een dag bij "Dagen instellen", dan kan de site berekenen wie er heeft verloren.</p></div>
    `);
    return;
  }

  const result = await computeDayResults(d);
  if(!result){
    render(`
      ${topbar("Onthulscherm — Optie 2", "showRevealScreen")}
      <div class="card"><p class="small">Voor dag ${d} zijn nog geen (geldige) inzendingen om een uitslag op te baseren.</p></div>
    `);
    return;
  }

  render(`
    ${topbar("Onthulscherm — Optie 2", "showRevealScreen")}
    <div class="card center">
      <h2>🔴 Snelle uitslag — automatisch berekend</h2>
      <p class="small">Op basis van de testresultaten van dag ${d} heeft de site berekend wie er verloren heeft:</p>
      <p style="font-size:22px;color:var(--red)"><strong>${esc(result.loser.name)}</strong></p>
      <p class="small">${result.loser.score} punten — ${(result.loser.time/1000).toFixed(1)}s</p>
      <button class="full danger" onclick="showReveal('red','${esc(result.loser.name).replace(/'/g,"\\'")}')">Toon rood scherm</button>
      <button class="secondary full" onclick="showManualLoserScreen('${d}')">↻ Opnieuw berekenen</button>
    </div>
  `);
}

function showReveal(color, nameOverride){
  const isGreen = color === "green";
  const imgUrl = isGreen ? VIKING_IMG.win : VIKING_IMG.lose;

  const div = document.createElement("div");
  div.className = "reveal-screen " + color;
  div.style.setProperty("--reveal-bg", `url('${imgUrl}')`);

  div.innerHTML = `
    <img class="reveal-portrait" src="${imgUrl}" alt="Viking">

    <div class="reveal-name">${esc(nameOverride)}</div>

    <div class="reveal-msg">
      ${
        isGreen
        ? "🎉 Jij bent door naar de volgende dag!"
        : "Je hebt helaas de minste vragen over de Mol goed, probeer het morgen nog een keer!"
      }
    </div>

    <div class="reveal-sub">
      ${
        isGreen
        ? "De vikingen vieren jouw overwinning!"
        : "Morgen krijg je een nieuwe kans!"
      }
    </div>

    <button class="reveal-close" onclick="this.parentElement.remove()">✕ Sluiten</button>
  `;

  document.body.appendChild(div);
}
// ---------- SPELERS ----------
async function showManagePlayers(){
  render(`<div class="loading">Laden...</div>`);
  const players = await getPlayers();
  let rows = "";
  for(const p of players){
    const profile = await getProfile(p.id);
    const status = profile.completed
      ? `<span class="pill pill-green">mollicitatie ingevuld ✓</span>`
      : `<span class="small" style="color:var(--red)">nog niet ingevuld</span>`;
    rows += `
      <div class="qlist-item flex-between">
        <div><strong>${esc(p.name)}</strong><br>${status}</div>
        <button class="danger" onclick="removePlayer('${p.id}')">Verwijder</button>
      </div>`;
  }
  rows = rows || "<p class='small'>Nog geen spelers toegevoegd.</p>";
  render(`
    ${topbar("Spelers", "showAdminHome")}
    <div class="card">
      <h2>Spelers (${players.length})</h2>
      <p class="small">Spelers melden zichzelf meestal aan door hun naam in te typen op het inlogscherm. Hier kun je spelers ook handmatig toevoegen of verwijderen.</p>
      ${rows}
      <label>Nieuwe speler toevoegen</label>
      <div class="row">
        <input type="text" id="newPlayerName" placeholder="Naam" style="flex:1">
        <button onclick="addPlayer()">Toevoegen</button>
      </div>
    </div>
  `);
}
async function addPlayer(){
  const name = document.getElementById("newPlayerName").value.trim();
  if(!name) return;
  const players = await getPlayers();
  players.push({id: uid(), name});
  const ok = await sSet("players", players);
  if(!ok){ alert("Opslaan is mislukt. Controleer of de Firebase-regels lezen/schrijven toestaan."); return; }
  showManagePlayers();
}
async function removePlayer(id){
  if(!confirm("Deze speler verwijderen?")) return;
  let players = await getPlayers();
  players = players.filter(p=>p.id!==id);
  await sSet("players", players);
  showManagePlayers();
}

// ---------- MOLLICITATIE PROFIELEN (ADMIN) ----------
async function showManageProfiles(){
  render(`<div class="loading">Laden...</div>`);
  const players = await getPlayers();
  if(players.length===0){
    render(`${topbar("Mollicitatie-antwoorden","showAdminHome")}<div class="card"><p class="small">Voeg eerst spelers toe.</p></div>`);
    return;
  }
  const opts = players.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join("");
  render(`
    ${topbar("Mollicitatie-antwoorden", "showAdminHome")}
    <div class="card">
      <p class="small">Hier kun je de antwoorden van elke speler bekijken en handmatig aanpassen (bijv. als iemand het papieren formulier heeft ingevuld).</p>
      <label>Kies speler</label>
      <select id="profilePlayerSelect" onchange="loadProfileForm()">${opts}</select>
      <div id="profileForm" style="margin-top:14px"></div>
    </div>
  `);
  loadProfileForm();
}
async function loadProfileForm(){
  const playerId = document.getElementById("profilePlayerSelect").value;
  const profile = await getProfile(playerId);
  let html = "";
  FIXED_QUESTIONS.forEach(fq=>{
    html += `<label>${esc(fq.label)}</label><textarea id="pf_${fq.key}">${esc(profile[fq.key]||"")}</textarea>`;
  });
  html += `<button class="full" style="margin-top:10px" onclick="saveProfileForm()">Opslaan</button>`;
  document.getElementById("profileForm").innerHTML = html;
}
async function saveProfileForm(){
  const playerId = document.getElementById("profilePlayerSelect").value;
  const data = {completed: true};
  FIXED_QUESTIONS.forEach(fq=>{
    const v = document.getElementById("pf_"+fq.key).value.trim();
    if(v) data[fq.key] = v;
  });
  const ok = await saveProfile(playerId, data);
  if(!ok){ alert("Opslaan is mislukt, controleer de databasekoppeling."); return; }
  alert("Antwoorden opgeslagen!");
}

// ---------- VRAGENBANK (HANDMATIG) ----------
async function showManageBank(){
  render(`<div class="loading">Laden...</div>`);
  const bank = await getBank();
  const rows = bank.map(q=>`
    <div class="qlist-item">
      <div class="flex-between">
        <strong>${esc(q.text)}</strong>
        <button class="danger" onclick="removeBankQ('${q.id}')">Verwijder</button>
      </div>
      <div class="small">Opties: ${q.options.map((o,i)=>(i===q.correctIndex?"<b>"+esc(o)+"</b>":esc(o))).join(" | ")}</div>
    </div>`).join("") || "<p class='small'>Nog geen vragen in de bank.</p>";
  render(`
    ${topbar("Vragenbank", "showAdminHome")}
    <div class="card">
      <h2>Vragen (${bank.length})</h2>
      ${rows}
    </div>
    <div class="card">
      <h2>Nieuwe vraag (handmatig)</h2>
      <label>Vraagtekst</label>
      <textarea id="bq_text" placeholder="Bijv. Wie heeft een hekel aan wiskunde?"></textarea>
      ${[0,1,2,3].map(i=>`
        <div class="row" style="margin-top:6px">
          <input type="radio" name="bq_correct" value="${i}" ${i===0?"checked":""}>
          <input type="text" id="bq_opt${i}" placeholder="Optie ${i+1}" style="flex:1">
        </div>`).join("")}
      <button class="full" style="margin-top:10px" onclick="addBankQ()">Vraag toevoegen</button>
    </div>
  `);
}
async function addBankQ(){
  const text = document.getElementById("bq_text").value.trim();
  const opts = [0,1,2,3].map(i=>document.getElementById("bq_opt"+i).value.trim());
  if(!text || opts.some(o=>!o)){ alert("Vul de vraag en alle 4 opties in."); return; }
  const correctIndex = parseInt(document.querySelector('input[name="bq_correct"]:checked').value);
  const bank = await getBank();
  bank.push({id: uid(), text, options: opts, correctIndex});
  await sSet("bank", bank);
  showManageBank();
}
async function removeBankQ(id){
  let bank = await getBank();
  bank = bank.filter(q=>q.id!==id);
  await sSet("bank", bank);
  showManageBank();
}

// ---------- DAGEN ----------
async function showManageDays(){
  render(`<div class="loading">Laden...</div>`);
  let btns = getDays().map(d=>`<button onclick="showManageDay(${d})">Dag ${d}</button>`).join("");
  render(`
    ${topbar("Dagen", "showAdminHome")}
    <div class="card">
      <h2>Kies een dag om in te stellen</h2>
      <div class="row">${btns}</div>
    </div>
  `);
}

async function showFinalWinner(){
  const ranking = await computeScoreboard();
  const winner = ranking[0];
  render(`
    ${topbar("Eindwinnaar", "showAdminScoreboard")}
    <div class="card center">
      <h2>🏆 All-time winnaar van het kamp</h2>
      <div class="winner-box">
        <div class="trophy"><img src="${VIKING_IMG.win}"></div>
        <strong style="font-size:22px">${esc(winner.name)}</strong><br>
        <span class="small">${winner.points} punten in totaal</span>
      </div>
    </div>
  `);
}  

async function showManageBeads(d){
  const day = await getDay(d);
  const beads = day.beads || [];
  let rowsHtml = "";
  for(let i=0;i<4;i++){
    const b = beads[i] || {name:"", max:0, won:0};
    rowsHtml += `
      <div class="qlist-item">
        <label>Spel ${i+1}</label>
        <input type="text" id="bead_name_${i}" value="${esc(b.name)}" placeholder="Naam van het spel">
        <div class="row" style="margin-top:6px">
          <div style="flex:1"><label>Max. te winnen</label><input type="number" min="0" id="bead_max_${i}" value="${b.max}"></div>
          <div style="flex:1"><label>Daadwerkelijk gewonnen</label><input type="number" min="0" id="bead_won_${i}" value="${b.won}"></div>
        </div>
      </div>`;
  }
  render(`
    ${topbar("Kralen dag "+d, "showManageDays")}
    <div class="card">
      <h2>🔵 Kralen — dag ${d}</h2>
      ${rowsHtml}
      <button class="full" style="margin-top:10px" onclick="saveBeads(${d})">Opslaan</button>
    </div>
  `);
}
async function saveBeads(d){
  const day = await getDay(d);
  const beads = [];
  for(let i=0;i<4;i++){
    const name = document.getElementById("bead_name_"+i).value.trim();
    if(!name) continue;
    beads.push({
      name,
      max: parseInt(document.getElementById("bead_max_"+i).value)||0,
      won: parseInt(document.getElementById("bead_won_"+i).value)||0
    });
  }
  day.beads = beads;
  await setDay(d, day);
  showManageDay(d);
}
  
  async function showDaySettings(){
  await loadNumDays();
  render(`
    ${topbar("Aantal speeldagen", "showAdminHome")}
    <div class="card">
      <h2>Hoeveel dagen spelen jullie dit kamp?</h2>
      <select id="numDaysSelect">
        ${[4,5,6].map(n=>`<option value="${n}" ${NUM_DAYS===n?"selected":""}>${n} dagen</option>`).join("")}
      </select>
      <button class="full" style="margin-top:12px" onclick="saveNumDays()">Opslaan</button>
    </div>
  `);
}
async function saveNumDays(){
  const n = parseInt(document.getElementById("numDaysSelect").value);
  await sSet("config/numDays", n);
  NUM_DAYS = n;
  showAdminHome();
}

  
async function showManageDay(d){
  render(`<div class="loading">Dag ${d} laden...</div>`);
  const day = await getDay(d);
  const players = await getPlayers();
  const bank = await getBank();

  // FIX: zorg dat er altijd een lege optie is als er geen spelers zijn
  const playerOpts = players.length
    ? players.map(p=>`<option value="${p.id}" ${day.molId===p.id?"selected":""}>${esc(p.name)}</option>`).join("")
    : `<option value="">— Voeg eerst spelers toe —</option>`;

  const bankChecks = bank.map(q=>`
    <label style="font-weight:normal;display:flex;gap:8px;align-items:flex-start;">
      <input type="checkbox" class="bankPick" value="${q.id}" ${(day.questionIds||[]).includes(q.id)?"checked":""} style="margin-top:4px">
      <span>${esc(q.text)}</span>
    </label>`).join("");

  const molCats = day.molCategories || [];
  const molCategoryChecks = FIXED_QUESTIONS.map(fq=>`
    <label style="font-weight:normal;display:flex;gap:8px;align-items:center;margin:4px 0;">
      <input type="checkbox" class="molCatPick" value="${fq.key}" ${molCats.includes(fq.key)?"checked":""}> ${esc(fq.label)}
    </label>`).join("");

  const dq = day.dayQuestions && day.dayQuestions.length ? day.dayQuestions : [];
  let dayQHtml = "";
  for(let i=0;i<8;i++){
    const q = dq[i] || {text:"", options:["","","",""], correctIndex:0};
    dayQHtml += `
      <div class="qlist-item">
        <label>Dagvraag ${i+1}</label>
        <input type="text" id="dq_text_${i}" value="${esc(q.text)}" placeholder="Vraagtekst over het spel van vandaag">
        ${[0,1,2,3].map(j=>`
          <div class="row" style="margin-top:4px">
            <input type="radio" name="dq_correct_${i}" value="${j}" ${q.correctIndex===j?"checked":""}>
            <input type="text" id="dq_opt_${i}_${j}" value="${esc(q.options[j]||'')}" placeholder="Optie ${j+1}" style="flex:1">
          </div>`).join("")}
      </div>`;
  }

  const statusTxt = day.closed ? "✅ Gesloten / afgerond" : day.open ? "🟢 Geopend voor spelers" : "🔴 Nog niet geopend";

  render(`
    ${topbar("Dag "+d, "showManageDays")}
    <div class="card">
      <h2>Status dag ${d}</h2>
      <p class="small">${statusTxt}</p>
      <div class="row">
        <button onclick="setDayOpen(${d}, true)">Open voor spelers</button>
        <button class="secondary" onclick="setDayOpen(${d}, false)">Sluit test</button>
        <button class="danger" onclick="closeDayScoring(${d})">Bevestig Mol-uitslag</button>
        <button class="full" onclick="showManageBeads(${d})">🔵 Kralen invullen</button>
      </div>
      <p class="small">"Bevestig Mol-uitslag" pas indrukken als iedereen heeft gespeeld — daarna telt de Mol-bonus mee en verschijnen de dag-uitslag en ranglijst.</p>
    </div>
    <div class="card">
      <h2>Wie is de Mol op dag ${d}?</h2>
      <p class="small">Geheim! Alleen jij als Super toffe Begeleiding ziet dit.</p>
      <select id="molSelect">${playerOpts}</select>
      <button style="margin-top:8px" onclick="saveMol(${d})">Mol opslaan</button>
    </div>
    <div class="card">
      <h2>🕵️ Mol-vragen voor deze dag</h2>
      <p class="small">Kies over welke onderwerpen de spelers moeten raden. De vraag noemt <strong>nooit een naam</strong> — spelers kiezen bijvoorbeeld een haarkleur, en raden zo (zonder het met zoveel woorden te zeggen) wie zij denken dat de Mol is. Antwoorden die meerdere spelers gemeen hebben, tellen als 1 optie.</p>
      ${molCategoryChecks}
      <button class="full" style="margin-top:10px" onclick="saveMolCategories(${d})">Mol-vragen opslaan</button>
    </div>
    <div class="card">
      <h2>Extra vragen uit de vragenbank (optioneel)</h2>
      <p class="small">Handmatig toegevoegde algemene vragen (bijv. over het scoutingkamp zelf) — geen namen, dat bepaal je zelf bij het invullen.</p>
      <p class="small">Geselecteerd: <span id="bankCount">${(day.questionIds||[]).length}</span></p>
      <div id="bankPicker">${bankChecks || "<p class='small'>Nog geen vragen in de vragenbank.</p>"}</div>
      <button style="margin-top:10px" onclick="saveBankPicks(${d})">Selectie opslaan</button>
    </div>
    <div class="card">
      <h2>8 dagvragen (over de spellen van vandaag)</h2>
      ${dayQHtml}
      <button class="full" style="margin-top:10px" onclick="saveDayQuestions(${d})">Dagvragen opslaan</button>
    </div>
  `);
}

async function setDayOpen(d, openVal){
  const day = await getDay(d);
  day.open = openVal;
  await setDay(d, day);
  showManageDay(d);
}
async function closeDayScoring(d){
  if(!confirm("Mol-uitslag van dag "+d+" definitief bevestigen? Doe dit pas als iedereen heeft gespeeld.")) return;
  const day = await getDay(d);
  day.closed = true;
  await setDay(d, day);
  showManageDay(d);
}
async function saveMol(d){
  const sel = document.getElementById("molSelect");
  if(!sel || !sel.value){ alert("Kies eerst een speler als Mol."); return; }
  const day = await getDay(d);
  day.molId = sel.value;
  await setDay(d, day);
  alert("Mol voor dag "+d+" opgeslagen.");
}
async function saveMolCategories(d){
  const keys = Array.from(document.querySelectorAll(".molCatPick:checked")).map(el=>el.value);
  const day = await getDay(d);
  // day.molCategories = keys;
  await setDay(d, day);
  alert("Mol-vragen voor dag "+d+" opgeslagen ("+keys.length+" onderwerpen).");
}
async function saveBankPicks(d){
  const ids = Array.from(document.querySelectorAll(".bankPick:checked")).map(el=>el.value);
  const day = await getDay(d);
  day.questionIds = ids;
  await setDay(d, day);
  document.getElementById("bankCount").textContent = ids.length;
  alert("Geselecteerd: "+ids.length+" vragen opgeslagen.");
}
async function saveDayQuestions(d){
  const day = await getDay(d);
  const qs = [];
  for(let i=0;i<8;i++){
    const text = document.getElementById("dq_text_"+i).value.trim();
    const opts = [0,1,2,3].map(j=>document.getElementById("dq_opt_"+i+"_"+j).value.trim());
    const correctRadio = document.querySelector('input[name="dq_correct_'+i+'"]:checked');
    if(text && opts.every(o=>o)){
      qs.push({text, options: opts, correctIndex: parseInt(correctRadio.value)});
    }
  }
  day.dayQuestions = qs;
  await setDay(d, day);
  alert("Dagvragen opgeslagen ("+qs.length+" van 8 ingevuld).");
}

// ---------- ADMIN SCOREBORD ----------
async function showAdminScoreboard(){
  render(`<div class="loading">Scorebord laden...</div>`);
  render(`
    ${topbar("Scorebord & uitslag", "showAdminHome")}
    <div class="card">
      <h2>🏆 Totaal ranglijst (heel kamp)</h2>
      <div id="scoreboardHolder2">laden...</div>
    </div>
    <div class="card">
      <h2>📅 Dag-uitslagen</h2>
      <div id="dayResultsHolder">laden...</div>
    </div>
    <div class="card">
      <h3>Mol-bonus per dag</h3>
      <div id="molInfoHolder">laden...</div>
    </div>
  `);
  renderScoreboard("scoreboardHolder2", true);
  renderDayResults("dayResultsHolder");
  renderMolInfo("molInfoHolder");
}

async function renderDayResults(targetId){
  let html = "";
  for(const d of getDays()){

    const day = await getDay(d);
    if(!day.closed || !day.molId){
      html += `<div class="qlist-item"><strong>Dag ${d}</strong> <span class="small">— nog niet afgerond</span></div>`;
      continue;
    }
    const result = await computeDayResults(d);
    if(!result){
      html += `<div class="qlist-item"><strong>Dag ${d}</strong> <span class="small">— nog geen inzendingen</span></div>`;
      continue;
    }
    html += `
      <div class="qlist-item">
        <strong>Dag ${d}</strong>
        <div class="winner-box" style="margin-top:8px">
          <div class="trophy"><img src="${VIKING_IMG.win}" alt="Dagwinnaar"></div>
          <strong>Dagwinnaar: ${esc(result.winner.name)}</strong><br>
          <span class="small">${result.winner.score} punten — ${(result.winner.time/1000).toFixed(1)}s</span>
        </div>
        <div class="loser-box">
          <div class="trophy"><img src="${VIKING_IMG.lose}" alt="Dag-verliezer"></div>
          <strong>Dag-verliezer: ${esc(result.loser.name)}</strong><br>
          <span class="small">${result.loser.score} punten — ${(result.loser.time/1000).toFixed(1)}s</span>
        </div>
      </div>`;
  }
  const el = document.getElementById(targetId);
  if(el) el.innerHTML = html || "<p class='small'>Nog geen dagen afgerond.</p>";
}

async function renderMolInfo(targetId){
  const ranking = await computeScoreboard();
  let html = "";
  for(const r of ranking){
    if(r.molDays && r.molDays.length){
      for(const md of r.molDays){
        html += `<div class="qlist-item">
          <strong>${esc(r.name)}</strong> was de Mol op dag ${md.day}.<br>
          <span class="small">${md.wrongGuessers} van ${md.totalGuessers} spelers hadden het mis → bonus ${md.bonus} punten${md.capped?" (afgetopt op maximum)":""}.</span>
        </div>`;
      }
    }
  }
  const el = document.getElementById(targetId);
  if(el) el.innerHTML = html || "<p class='small'>Nog geen dagen afgerond.</p>";
}

// ---------- DATABASE SETUP ----------
function showSetup(){
  render(`
    <div class="card">
      <h2>Database-koppeling</h2>
      <p>De Firebase URL is al ingesteld. Je kunt hem hier wijzigen als dat nodig is.</p>
      <label>Firebase Realtime Database URL</label>
      <input type="text" id="fbUrl" value="${esc(FIREBASE_URL)}" placeholder="https://...firebasedatabase.app">
      <button class="full" style="margin-top:14px" onclick="saveSetup()">Opslaan en verder</button>
      <button class="secondary full" onclick="showStart()">Annuleer</button>
    </div>
  `);
}
function saveSetup(){
  const v = document.getElementById("fbUrl").value.trim();
  if(!v.startsWith("https://")){ alert("Dat lijkt geen geldige URL."); return; }
  FIREBASE_URL = v;
  localStorage.setItem("mol_firebase_url", v);
  showStart();
}

// ---------- START APP ----------
showStart();