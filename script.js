// --- KONFIGURACJA ---
let lastPlayerList = [];
let adminCounter = 0;
const serverIP = "ferajnav3.aternos.me";
const serverStartDate = new Date("2025-12-30");

const objectiveData = {
    name: "MOBILIZACJA",
    phase: "0/4",
    percent: 0,
    items: [
        { name: "Plecaki Ucieczkowe", status: "GOTOWE", priority: "WYSOKI" },
        { name: "Zapasy Medyczne", status: "0/20", priority: "KRYTYCZNY" },
        { name: "Mapa Sektora", status: "ANALIZA", priority: "ŚREDNI" }
    ],
    note: "OCZEKIWANIE NA START SERWERA. SPRAWDZIĆ MODPACKI. CEL: PRZEŻYĆ PIERWSZĄ NOC."
};

// --- RADIO LOGS ---
function addSystemLog(msg, type = "INFO") {
    const saved = JSON.parse(localStorage.getItem('f3logs') || '[]');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    saved.push({ msg, type, time });
    if (saved.length > 25) saved.shift();
    localStorage.setItem('f3logs', JSON.stringify(saved));
    renderRadio();
}

function renderRadio() {
    const saved = JSON.parse(localStorage.getItem('f3logs') || '[]');
    const logContainer = document.getElementById("radioLog");
    if(!logContainer) return;
    
    logContainer.innerHTML = saved.map(m => {
        let style = "text-gray-500";
        let pre = "[LOG]";
        if (m.type === "JOIN") { style = "text-green-500"; pre = "[SYGNAŁ]"; }
        if (m.type === "ALARM") { style = "text-red-500 font-bold"; pre = "[ALARM]"; }
        if (m.type === "AMBIENT") { style = "text-blue-400 opacity-50"; pre = "[SZUM]"; }

        return `<div class="mb-2 border-b border-white/5 pb-1">
            <span class="${style}">${pre}</span> <span class="text-[9px] text-gray-700">${m.time}</span><br>
            <span class="text-[10px] uppercase text-gray-300">${m.msg}</span>
        </div>`;
    }).join('');
    logContainer.scrollTop = logContainer.scrollHeight;
}

// --- SERWER ---
async function refreshServerStatus() {
    const mainStatus = document.getElementById("server-status-main");
    const sideStatus = document.getElementById("server-status-text");
    const pList = document.getElementById("player-list");
    const pCount = document.getElementById("player-count");

    try {
        const res = await fetch(`https://api.mcsrvstat.us/2/${serverIP}`);
        const data = await res.json();

        if (data.online) {
            mainStatus.innerText = "ONLINE";
            mainStatus.className = "text-2xl font-bold text-green-400";
            sideStatus.innerText = "POŁĄCZENIE STABILNE";
            sideStatus.className = "text-lg font-bold text-green-400";

            const players = data.players.list || [];
            players.forEach(p => {
                if (!lastPlayerList.includes(p)) addSystemLog(`OCALAŁY ${p} POŁĄCZONY.`, "JOIN");
            });
            lastPlayerList.forEach(p => {
                if (!players.includes(p)) addSystemLog(`UTRACONO TĘTNO: ${p}.`, "ALARM");
            });
            lastPlayerList = players;

            pList.innerHTML = players.map(p => `
                <div class="flex items-center gap-2">
                    <img src="https://minotar.net/helm/${p}/16" class="border border-green-900">
                    <span class="text-green-500 uppercase text-xs">${p}</span>
                </div>
            `).join('');
            pCount.innerText = `AKTYWNI: ${data.players.online}/${data.players.max}`;
        } else {
            mainStatus.innerText = "OFFLINE";
            mainStatus.className = "text-2xl font-bold text-red-600";
            sideStatus.innerText = "BRAK SYGNAŁU";
            sideStatus.className = "text-lg font-bold text-red-600";
            pList.innerHTML = "<p class='text-gray-700 italic text-xs'>Skanowanie pustki...</p>";
            pCount.innerText = "SERWER NIEAKTYWNY";
        }
    } catch (e) { mainStatus.innerText = "BŁĄD"; }
}

// --- ADMIN ---
function updateObjectiveUI() {
    document.getElementById('op-name').innerText = objectiveData.name;
    document.getElementById('op-phase').innerText = objectiveData.phase;
    document.getElementById('op-percent-text').innerText = objectiveData.percent + "%";
    document.getElementById('op-bar').style.width = objectiveData.percent + "%";
    document.getElementById('op-intel-note').innerText = objectiveData.note;

    const list = document.getElementById('op-items-list');
    list.innerHTML = objectiveData.items.map(item => `
        <div class="grid grid-cols-3 text-gray-400 py-0.5 border-b border-zinc-900/30 text-center">
            <span>▸ ${item.name}</span>
            <span class="text-yellow-600">${item.status}</span>
            <span class="text-[8px] ${item.priority === 'KRYTYCZNY' ? 'text-red-500' : 'text-gray-600'}">${item.priority}</span>
        </div>
    `).join('');
}

function adminClick() {
    adminCounter++;
    if (adminCounter >= 3) {
        const pass = prompt("AUTORYZACJA:");
        if (pass === "ferajna") {
            objectiveData.name = prompt("OPERACJA:", objectiveData.name) || objectiveData.name;
            objectiveData.phase = prompt("FAZA:", objectiveData.phase) || objectiveData.phase;
            objectiveData.percent = prompt("PROCENT:", objectiveData.percent) || objectiveData.percent;
            objectiveData.note = prompt("NOTATKA:", objectiveData.note) || objectiveData.note;
            updateObjectiveUI();
        }
        adminCounter = 0;
    }
}

// --- ZASILANIE ---
function togglePower() {
    const isPwr = document.body.classList.toggle("power-on");
    const btn = document.getElementById("powerBtn");
    const audioGen = document.getElementById("powerSound");
    const audioHum = document.getElementById("humSound");
    
    btn.innerText = isPwr ? "ZASILANIE: ON" : "ZASILANIE: OFF";
    
    if (isPwr) { 
        btn.classList.add("bg-green-600", "text-black"); 
        audioGen.play().catch(() => {});
        if(audioHum) {
            audioHum.volume = 0.15;
            audioHum.play().catch(() => {});
        }
    } else { 
        btn.classList.remove("bg-green-600", "text-black"); 
        audioGen.pause(); 
        if(audioHum) audioHum.pause();
    }
}

// --- INNE ---
function copyIP() {
    navigator.clipboard.writeText(serverIP);
    alert("Współrzędne skopiowane do schowka.");
}

function changeCamera() {
    const img = document.getElementById('cctv-img');
    img.style.opacity = "0.1";
    setTimeout(() => { img.style.opacity = "0.4"; }, 150);
}

function glitchRadioText() {
    const radioItems = document.querySelectorAll('#radioLog div span:last-child');
    if (radioItems.length === 0) return;
    const target = radioItems[Math.floor(Math.random() * radioItems.length)];
    const originalText = target.innerText;
    const chars = "!@#$%^&*()_+";
    let glitchedText = originalText.split('').map(char => Math.random() > 0.8 ? chars[Math.floor(Math.random() * chars.length)] : char).join('');
    target.innerText = glitchedText;
    target.style.color = "#ff0000";
    setTimeout(() => { target.innerText = originalText; target.style.color = ""; }, 150);
}

const updateAll = () => {
    const now = new Date();
    const diff = Math.floor((now - serverStartDate) / (1000 * 60 * 60 * 24));
    document.getElementById("days").innerText = diff > 0 ? diff : 0;
    document.getElementById('cctv-time').innerText = now.toLocaleTimeString();
};

updateAll();
setInterval(updateAll, 1000);
setInterval(refreshServerStatus, 30000);
setInterval(() => { if (document.body.classList.contains('power-on')) glitchRadioText(); }, 5000);
refreshServerStatus();
renderRadio();
updateObjectiveUI();