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