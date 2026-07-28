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