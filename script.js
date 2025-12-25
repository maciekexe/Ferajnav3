// --- KONFIGURACJA ---
const serverIP = "ferajnav3.aternos.me";
const serverStartDate = new Date("2025-12-30");
let lastPlayerList = [];
let adminCounter = 0;
let radioResetCounter = 0;
let isSystemCrashing = false;

const objectiveData = {
    name: "DZIEŃ ZERO: MOBILIZACJA",
    phase: "PRZYGOTOWANIA",
    percent: 10,
    items: [
        { name: "Spotkanie w bazie", status: "W OCZEKIWANIU" },
        { name: "Zbieranie zapasów", status: "NIE ROZPOCZĘTE" },
        { name: "Weryfikacja modów", status: "W TOKU" }
    ],
    note: "SYSTEM PRAWNY USZKODZONY. REJESTR ZASAD NIEODNALEZIONY. PRZETRWAJ ZA WSZELKĄ CENĘ."
};

// --- RADIO LOGS ---
function addSystemLog(msg, type = "INFO") {
    const logs = JSON.parse(localStorage.getItem('f3logs_v2') || '[]');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    logs.push({ msg, type, time });
    if (logs.length > 20) logs.shift();
    localStorage.setItem('f3logs_v2', JSON.stringify(logs));
    renderRadio();
}

function renderRadio() {
    const logs = JSON.parse(localStorage.getItem('f3logs_v2') || '[]');
    const container = document.getElementById("radioLog");
    if (!container) return;
    container.innerHTML = logs.map(m => {
        let clr = "text-gray-500";
        if (m.type === "JOIN") clr = "text-green-500 font-bold";
        if (m.type === "ALARM") clr = "text-red-600 font-bold";
        if (m.type === "EVENT") clr = "text-yellow-500 font-bold";
        return `<div class="mb-2 border-b border-white/5 pb-1"><span class="${clr}">[${m.type}]</span> <span class="text-[9px] text-gray-700 font-bold">${m.time}</span><br><span class="uppercase tracking-tighter opacity-90">${m.msg}</span></div>`;
    }).join('');
    container.scrollTop = container.scrollHeight;
}

function adminResetRadio() {
    radioResetCounter++;
    if (radioResetCounter >= 3) {
        const pass = prompt("PODAJ KOD RESETU RADIA:");
        if (pass === "ferajna") {
            localStorage.removeItem('f3logs_v2');
            renderRadio();
            addSystemLog("SYSTEM LOGÓW WYCZYSZCZONY PRZEZ ADMINA.", "EVENT");
            alert("RADIO ZRESETOWANE.");
        }
        radioResetCounter = 0;
    }
}

// --- BOUNTY SYSTEM ---
function toggleBountyForm() { document.getElementById("bounty-form").classList.toggle("hidden"); }

function submitBounty() {
    const target = document.getElementById("b-target").value;
    const reward = document.getElementById("b-reward").value;
    const reason = document.getElementById("b-reason").value;
    if (!target || !reward || !reason) { alert("WYPEŁNIJ WSZYSTKIE POLA!"); return; }

    const bounties = JSON.parse(localStorage.getItem('f3bounties_v2') || '[]');
    bounties.push({ 
        id: Date.now(), 
        target: target.toUpperCase(), 
        reward: reward.toUpperCase(), 
        reason, 
        status: 'OCZEKIWANE', 
        date: new Date().toLocaleDateString(),
        completedAt: null 
    });
    localStorage.setItem('f3bounties_v2', JSON.stringify(bounties));
    document.getElementById("b-target").value = ""; document.getElementById("b-reward").value = ""; document.getElementById("b-reason").value = "";
    toggleBountyForm(); renderBounties();
    addSystemLog(`Zgłoszono nowe zlecenie: ${target}`, "INFO");
}

function renderBounties() {
    let bounties = JSON.parse(localStorage.getItem('f3bounties_v2') || '[]');
    const container = document.getElementById("bounty-list");
    if (!container) return;

    // Usuwanie po 2 dniach (48h)
    const now = Date.now();
    const expiryTime = 2 * 24 * 60 * 60 * 1000;
    bounties = bounties.filter(b => {
        if (b.status === "ZREALIZOWANE" && b.completedAt && (now - b.completedAt > expiryTime)) return false;
        return true;
    });
    localStorage.setItem('f3bounties_v2', JSON.stringify(bounties));

    if (bounties.length === 0) { container.innerHTML = `<p class="text-[9px] text-gray-700 italic text-center uppercase">Brak zleceń...</p>`; updateTicker(); return; }

    container.innerHTML = bounties.map(b => `
        <div class="bounty-card p-2 relative ${b.status === 'ZATWIERDZONE' ? 'approved' : ''} ${b.status === 'ZREALIZOWANE' ? 'completed' : ''}" onclick="adminManageBounty(${b.id})">
            <div class="flex items-center gap-3">
                <img src="https://minotar.net/avatar/${b.target}/32" class="border border-zinc-800">
                <div class="text-[10px] flex-1">
                    <div class="flex justify-between items-start"><span class="target-name font-bold tracking-widest font-mono">${b.target}</span><span class="text-[8px] text-gray-600">${b.date}</span></div>
                    <p class="${b.status === 'ZREALIZOWANE' ? 'text-green-700' : 'text-yellow-600'} font-bold">NAGRODA: ${b.reward}</p>
                    <p class="text-gray-500 mt-1 italic leading-tight uppercase text-[9px] font-light">"${b.reason}"</p>
                </div>
            </div>
            <div class="status-label absolute top-1 right-1 text-[7px] font-black uppercase ${b.status === 'ZREALIZOWANE' ? 'text-green-500' : 'text-red-900'}">
                ${b.status === 'ZREALIZOWANE' ? '[EXECUTED]' : b.status}
            </div>
        </div>
    `).join('');
    updateTicker();
}

function adminManageBounty(id) {
    const pass = prompt("KOD AUTORYZACJI:");
    if (pass !== "ferajna") return;
    const bounties = JSON.parse(localStorage.getItem('f3bounties_v2') || '[]');
    const bIdx = bounties.findIndex(b => b.id === id);
    const choice = prompt("WYBIERZ AKCJĘ:\n1 - ZATWIERDŹ (Publiczne)\n2 - ZREALIZOWANE (Zielone, 48h do zniknięcia)\n3 - USUŃ (Trwałe)");

    if (choice === "1") { bounties[bIdx].status = "ZATWIERDZONE"; addSystemLog(`Zatwierdzono list gończy: ${bounties[bIdx].target}`, "EVENT"); }
    else if (choice === "2") { bounties[bIdx].status = "ZREALIZOWANE"; bounties[bIdx].completedAt = Date.now(); addSystemLog(`Zlecenie wykonane: ${bounties[bIdx].target}`, "EVENT"); }
    else if (choice === "3") { addSystemLog(`Zlecenie usunięte: ${bounties[bIdx].target}`, "INFO"); bounties.splice(bIdx, 1); }
    localStorage.setItem('f3bounties_v2', JSON.stringify(bounties)); renderBounties();
}

// --- NEWS TICKER ---
function updateTicker() {
    const bounties = JSON.parse(localStorage.getItem('f3bounties_v2') || '[]');
    const approved = bounties.filter(b => b.status === "ZATWIERDZONE");
    let html = `SYSTEM: Zbliża się fala infekcji... &nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp; OSTRZEŻENIE: Brak czystej wody... &nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp; STATUS: Mobilizacja... &nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp; UWAGA: DATABASE_LOSS...`;
    approved.forEach(b => { html += ` &nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp; <span class="text-white bg-red-600 px-1 font-mono">WANTED: ${b.target}</span> (REWARD: ${b.reward})`; });
    document.getElementById("ticker-text").innerHTML = html;
}

// --- SERWER ---
async function refreshStatus() {
    const mainS = document.getElementById("server-status-main");
    const pList = document.getElementById("player-list");
    try {
        const res = await fetch(`https://api.mcsrvstat.us/2/${serverIP}`);
        const data = await res.json();
        if (data.online) {
            mainS.innerText = "ONLINE"; mainS.className = "text-2xl font-bold text-green-400 animate-pulse font-mono";
            const players = data.players.list || [];
            players.forEach(p => { if (!lastPlayerList.includes(p)) addSystemLog(`Sygnał życia: ${p}.`, "JOIN"); });
            lastPlayerList.forEach(p => { if (!players.includes(p)) addSystemLog(`Zanik sygnału: ${p}.`, "ALARM"); });
            lastPlayerList = players;
            pList.innerHTML = players.map(p => `<div class="flex items-center gap-3 border-b border-white/5 pb-1"><img src="https://minotar.net/helm/${p}/20" class="border border-green-900 shadow-sm"><span class="text-green-400 text-xs font-bold uppercase tracking-widest font-mono">${p}</span><span class="text-[8px] text-gray-600 ml-auto italic">LIVE</span></div>`).join('');
            document.getElementById("player-count").innerText = `OCALAŁYCH: ${data.players.online}/${data.players.max}`;
            document.getElementById("server-status-text").innerText = "ŁĄCZNOŚĆ STABILNA";
            document.getElementById("server-status-text").className = "text-sm font-bold text-green-400 uppercase italic";
        } else {
            mainS.innerText = "OFFLINE"; mainS.className = "text-2xl font-bold text-red-600 italic font-mono";
            pList.innerHTML = "<div class='text-gray-800 text-xs italic uppercase tracking-tighter'>Skanowanie martwej strefy...</div>";
            document.getElementById("server-status-text").innerText = "POZA ZASIĘGIEM";
            document.getElementById("server-status-text").className = "text-sm font-bold text-red-600 uppercase italic";
        }
    } catch (e) { mainS.innerText = "BŁĄD"; }
}

// --- ADMIN & ZASILANIE ---
function updateUI() {
    document.getElementById('op-name').innerText = objectiveData.name;
    document.getElementById('op-phase').innerText = objectiveData.phase;
    document.getElementById('op-bar').style.width = objectiveData.percent + "%";
    document.getElementById('op-intel-note').innerText = `"${objectiveData.note}"`;
    const list = document.getElementById('op-items-list');
    list.innerHTML = objectiveData.items.map(i => `<div class="flex justify-between border-b border-zinc-900/50 pb-1"><span class="text-gray-400 font-bold uppercase text-[10px]">▸ ${i.name}</span><span class="text-yellow-600 font-bold uppercase text-[10px]">${i.status || 'AKTYWNE'}</span></div>`).join('');
}

function adminClick() {
    adminCounter++;
    if (adminCounter >= 3) {
        const pass = prompt("KOD ADMINA:");
        if (pass === "ferajna") {
            objectiveData.name = prompt("CEL:", objectiveData.name);
            objectiveData.phase = prompt("STATUS:", objectiveData.phase);
            objectiveData.percent = prompt("PROCENT:", objectiveData.percent);
            objectiveData.note = prompt("NOTATKA:", objectiveData.note);
            updateUI();
        }
        adminCounter = 0;
    }
}

function togglePower() {
    if (isSystemCrashing) return;
    const body = document.body; const btn = document.getElementById("powerBtn");
    const errorScr = document.getElementById("error-screen");
    const audioGen = document.getElementById("powerSound"); const audioHum = document.getElementById("humSound");

    if (body.classList.contains("power-on")) {
        body.classList.remove("power-on"); btn.innerText = "Zasilanie: OFF"; btn.classList.remove("bg-green-600", "text-black");
        audioGen.pause(); audioHum.pause(); return;
    }

    isSystemCrashing = true; const isSuccess = Math.random() > 0.5;
    if (isSuccess) {
        btn.innerText = "BOOTING..."; body.classList.add("crashing");
        setTimeout(() => {
            body.classList.remove("crashing"); body.classList.add("power-on"); btn.innerText = "Zasilanie: ON";
            btn.classList.add("bg-green-600", "text-black"); audioGen.play().catch(()=>{}); audioHum.play().catch(()=>{}); audioHum.volume = 0.12;
            isSystemCrashing = false; addSystemLog("Zasilanie przywrócone.", "INFO");
        }, 1200);
    } else {
        btn.innerText = "SYSTEM ERROR"; btn.classList.add("bg-red-900", "text-white"); body.classList.add("crashing");
        setTimeout(() => { errorScr.classList.remove("hidden"); }, 1400);
        setTimeout(() => {
            body.classList.remove("crashing"); errorScr.classList.add("hidden"); btn.innerText = "Zasilanie: OFF";
            btn.classList.remove("bg-red-900", "text-white"); isSystemCrashing = false;
            addSystemLog("BŁĄD ZASILANIA: SPIĘCIE RDZENIA.", "ALARM");
            alert("ALARM: Przeciążenie sieci. Spróbuj ponownie.");
        }, 4500);
    }
}

// --- UTILS ---
function copyIP() { navigator.clipboard.writeText(serverIP); alert("IP skopiowane."); }
function changeCamera() {
    const img = document.getElementById('cctv-img');
    const coords = [`X: ${Math.floor(Math.random()*1500)} Z: ${Math.floor(Math.random()*1500)}`, `X: -320 Z: 890`, `X: 0 Z: 0` ];
    document.getElementById('cctv-coords').innerText = coords[Math.floor(Math.random()*coords.length)];
    img.style.opacity = "0.1"; setTimeout(() => { img.style.opacity = "0.4"; }, 150);
}

const tick = () => {
    const now = new Date();
    const diff = Math.floor((now - serverStartDate) / (1000 * 60 * 60 * 24));
    document.getElementById("days").innerText = diff > 0 ? diff : 0;
    document.getElementById('cctv-time').innerText = now.toLocaleTimeString();
};

tick(); setInterval(tick, 1000); setInterval(refreshStatus, 30000);
setInterval(() => { 
    if (document.body.classList.contains('power-on')) { 
        const logs = document.querySelectorAll('#radioLog div span:last-child');
        if (logs.length > 0) {
            const t = logs[Math.floor(Math.random() * logs.length)];
            const o = t.innerText;
            t.innerText = o.split('').map(c => Math.random() > 0.8 ? "!@#$%^&"[Math.floor(Math.random()*7)] : c).join('');
            t.style.color = "#ff0000";
            setTimeout(() => { t.innerText = o; t.style.color = ""; }, 150);
        }
    }
}, 5000);
refreshStatus(); renderRadio(); updateUI(); renderBounties();