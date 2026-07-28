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
