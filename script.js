// ======================================================
// 1. KONFIGURACJA FIREBASE 
// ======================================================
const firebaseConfig = {
    apiKey: "AIzaSyCg6FV9e7mWRaDMsW47dZ0ABvkicQ5PrI0",
    authDomain: "ferajnaterminal.firebaseapp.com",
    databaseURL: "https://ferajnaterminal-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "ferajnaterminal",
    storageBucket: "ferajnaterminal.firebasestorage.app",
    messagingSenderId: "1066859573398",
    appId: "1:1066859573398:web:331d0754c4142d29f552b7",
    measurementId: "G-HR1JL5X6CR"
};

// Inicjalizacja
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ======================================================
// 2. KONFIGURACJA TERMINALA
// ======================================================
const serverIP = "ferajnav3.aternos.me";
const serverStartDate = new Date("2025-12-30");
let lastPlayerList = [];
let isSystemCrashing = false;
let currentUser = null; 

// ======================================================
// 3. SYNCHRONIZACJA DANYCH W CZASIE RZECZYWISTYM
// ======================================================

// Biuletyn
db.ref('objective').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
        document.getElementById('op-name').innerText = data.name;
        document.getElementById('op-phase').innerText = data.phase;
        document.getElementById('op-bar').style.width = data.percent + "%";
        document.getElementById('op-intel-note').innerText = data.note;
        
        const list = document.getElementById('op-items-list');
        if (data.items) {
            list.innerHTML = data.items.map(i => `
                <div class="flex justify-between border-b border-zinc-900/50 pb-1">
                    <span class="text-gray-400 font-bold uppercase text-[10px]">▸ ${i.name}</span>
                    <span class="text-yellow-600 font-bold uppercase text-[10px]">${i.status}</span>
                </div>
            `).join('');
        }
    }
});

// Radio
db.ref('logs').limitToLast(25).on('value', (snapshot) => {
    const logs = snapshot.val();
    const container = document.getElementById("radioLog");
    if (!container || !logs) return;
    
    container.innerHTML = Object.values(logs).map(m => {
        let clr = "text-gray-500";
        if (m.type === "JOIN") clr = "text-green-500 font-bold";
        if (m.type === "ALARM") clr = "text-red-600 font-bold";
        if (m.type === "EVENT") clr = "text-yellow-500 font-bold";
        return `<div class="mb-2 border-b border-white/5 pb-1"><span class="${clr}">[${m.type}]</span> <span class="text-[9px] text-gray-700 font-bold font-mono">${m.time}</span><br><span class="uppercase font-medium">${m.msg}</span></div>`;
    }).join('');
    container.scrollTop = container.scrollHeight;
});

// Bounty
db.ref('bounties').on('value', (snapshot) => {
    const data = snapshot.val();
    const container = document.getElementById("bounty-list");
    if (!container) return;
    if (!data) { container.innerHTML = `<p class="text-[9px] text-gray-700 italic text-center uppercase tracking-widest opacity-50">No active contracts...</p>`; updateTicker([]); return; }

    const bounties = Object.keys(data).map(key => ({ id: key, ...data[key] }));
    const now = Date.now();

    container.innerHTML = bounties.map(b => `
        <div class="bounty-card p-2 relative ${b.status === 'APPROVED' ? 'approved' : ''} ${b.status === 'EXECUTED' ? 'completed' : ''}" onclick="adminManageBounty('${b.id}')">
            <div class="flex items-center gap-3">
                <img src="https://minotar.net/avatar/${b.target}/32" class="border border-zinc-900 shadow-sm">
                <div class="text-[10px] flex-1">
                    <div class="flex justify-between items-start font-black uppercase"><span class="target-name tracking-widest">${b.target}</span><span class="text-[8px] text-gray-600">${b.date}</span></div>
                    <p class="${b.status === 'EXECUTED' ? 'text-green-500 font-black' : 'text-yellow-600 font-bold'}">REWARD: ${b.reward}</p>
                    <p class="text-gray-500 mt-1 italic leading-tight uppercase text-[9px] font-medium">"${b.reason}"</p>
                </div>
            </div>
        </div>
    `).join('');
    updateTicker(bounties);
});

// ======================================================
// 4. BIOS & LOGIN (FIREBASE)
// ======================================================

const adminUID = "UD97Gi8bGAhwh0QLXZMrx6VGPVe2"; 

const bootLines = [
    "F3-OS (tm) BIOS v1.0.4 - RELEASE 2025",
    "CPU: AMD RYZEN TERMINAL CORE... OK",
    "MEMORY: 64GB DDR4 VCR-RAM... OK",
    "SYSTEM STATUS: [LOCKED]",
    "---------------------------------------",
    "SECURITY ALERT: ENCRYPTION DETECTED.",
    "MANDATORY LOGIN REQUIRED."
];

async function runBootSequence() {
    const loader = document.getElementById("boot-loader");
    const textTarget = document.getElementById("boot-text");
    const loginBox = document.getElementById("login-box");
    
    loader.classList.remove("hidden");
    textTarget.innerHTML = "";
    currentUser = null;

    for(let line of bootLines) {
        textTarget.innerHTML += `> ${line}<br>`;
        await new Promise(r => setTimeout(r, 60)); 
    }

    loginBox.classList.remove("hidden");
    document.getElementById("login-user").value = "";
    document.getElementById("login-pass").value = "";
    document.getElementById("login-user").focus();

    return new Promise((resolve) => {
        const handleLogin = async (e) => {
            if (e.key === "Enter") {
                const userInput = document.getElementById("login-user").value.toLowerCase();
                const email = userInput.includes("@") ? userInput : userInput + "@f3.pl";
                const pass = document.getElementById("login-pass").value;

                try {
                    const userCredential = await firebase.auth().signInWithEmailAndPassword(email, pass);
                    currentUser = userCredential.user;
                    
                    window.removeEventListener("keydown", handleLogin);
                    loginBox.classList.add("hidden");
                    resolve(true);
                } catch (error) {
                    textTarget.innerHTML += `<br><span class="text-red-600 font-bold italic">AUTHENTICATION_FAILED: INVALID_CREDENTIALS</span>`;
                    document.getElementById("login-user").value = "";
                    document.getElementById("login-pass").value = "";
                    document.getElementById("login-user").focus();
                }
            }
        };
        window.addEventListener("keydown", handleLogin);
    });
}

async function finishBoot(user) {
   const textTarget = document.getElementById("boot-text");
   const displayName = user.email.split('@')[0].toUpperCase();

    const postLoginLines = [
        "---------------------------------------",
        `WITAJ, ${displayName}.`, 
        "DOSTĘP DO TERMINALA PRZYZNANY.",
        "---------------------------------------",
        "INITIALIZING SURVIVAL PROTOCOL...",
        "SYSTEM READY."
    ];

    for(let line of postLoginLines) {
        textTarget.innerHTML += `> ${line}<br>`;
        await new Promise(r => setTimeout(r, 80)); 
    }
    
    await new Promise(r => setTimeout(r, 400));
    document.getElementById("boot-loader").classList.add("hidden");
    
    // WIDGET DLA ADMINA: Sprawdzamy UID 
    if (user.uid === adminUID) {
        document.getElementById("admin-tools-panel").classList.remove("hidden");
        addSystemLog("ADMIN SESSION INITIALIZED.", "EVENT");
    } else {
        addSystemLog(`USER SESSION: ${displayName}`, "INFO");
    }
}

// ======================================================
// 5. ADMIN TOOLS (ZAPIS DO CHMURY)
// ======================================================

function addSystemLog(msg, type = "INFO") {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    db.ref('logs').push({ msg, type, time });
}

function adminQuickResetRadio() {
    if (currentUser !== 'admin') return;
    if (confirm("CZY NA PEWNO WYCZYŚCIĆ WSZYSTKIE LOGI?")) {
        db.ref('logs').remove();
        addSystemLog("SYSTEM RADIOWY ZRESETOWANY.", "EVENT");
    }
}

function adminQuickUpdateBulletin() {
    if (currentUser !== 'admin') return;
    const name = prompt("NAME:", "DZIEŃ ZERO: MOBILIZACJA");
    const phase = prompt("STATUS:", "PRZYGOTOWANIA");
    const percent = prompt("PROGRESS:", "10");
    const note = prompt("BRIEFING:", "PRZETRWAJ ZA WSZELKĄ CENĘ.");
    
    const items = [
        { name: "Spotkanie w bazie", status: "OCZEKIWANIE" },
        { name: "Zbieranie zapasów", status: "NOT_STARTED" },
        { name: "Weryfikacja modów", status: "W TOKU" }
    ];

    db.ref('objective').set({ name, phase, percent, note, items });
    addSystemLog("BIULETYN ZAKTUALIZOWANY.", "INFO");
}

function submitBounty() {
    if (!currentUser) { alert("ZALOGUJ SIĘ!"); return; }
    const target = document.getElementById("b-target").value;
    const reward = document.getElementById("b-reward").value;
    const reason = document.getElementById("b-reason").value;
    if (!target || !reward || !reason) return;

    db.ref('bounties').push({
        target: target.toUpperCase(),
        reward: reward.toUpperCase(),
        reason,
        status: 'WAITING',
        date: new Date().toLocaleDateString(),
        completedAt: null
    });

    document.getElementById("b-target").value = ""; 
    document.getElementById("b-reward").value = ""; 
    document.getElementById("b-reason").value = "";
    toggleBountyForm();
    addSystemLog(`NEW CONTRACT: ${target}`, "INFO");
}

function adminManageBounty(id) {
    if (currentUser !== 'admin') { alert("TYLKO ADMIN."); return; }
    const choice = prompt("1-APPROVED, 2-EXECUTED, 3-DELETE");
    if (choice === "1") db.ref('bounties/' + id).update({ status: 'APPROVED' });
    else if (choice === "2") db.ref('bounties/' + id).update({ status: 'EXECUTED', completedAt: Date.now() });
    else if (choice === "3") db.ref('bounties/' + id).remove();
}

// ======================================================
// 6. ZASILANIE I INNE
// ======================================================

async function togglePower() {
    if (isSystemCrashing) return;
    const body = document.body; const btn = document.getElementById("powerBtn");
    const errorScr = document.getElementById("error-screen");
    const audioGen = document.getElementById("powerSound"); const audioHum = document.getElementById("humSound");
    const gridWidget = document.getElementById("grid-status");
    const adminPanel = document.getElementById("admin-tools-panel");

    if (body.classList.contains("power-on")) {
        body.classList.remove("power-on"); gridWidget.classList.add("hidden"); adminPanel.classList.add("hidden");
        btn.innerText = "Power: OFF"; btn.classList.remove("bg-green-600", "text-black");
        audioGen.pause(); audioHum.pause(); currentUser = null; return;
    }

    isSystemCrashing = true; const isSuccess = Math.random() > 0.5;
    if (isSuccess) {
        btn.innerText = "BOOTING..."; body.classList.add("crashing");
        await new Promise(r => setTimeout(r, 1000));
        body.classList.remove("crashing");
        
        const loginSuccess = await runBootSequence();
        if (loginSuccess) {
            await finishBoot(currentUser);
            body.classList.add("power-on"); gridWidget.classList.remove("hidden");
            btn.innerText = "Power: ON"; btn.classList.add("bg-green-600", "text-black");
            audioGen.play().catch(()=>{}); audioHum.play().catch(()=>{}); audioHum.volume = 0.12;
            isSystemCrashing = false; addSystemLog("System Online.", "INFO");
        } else {
            const t = document.getElementById("boot-text");
            t.innerHTML += `<br><span class="text-red-600 font-black uppercase animate-pulse">Access Denied. Anti-tamper active.</span>`;
            await new Promise(r => setTimeout(r, 1500));
            body.classList.add("crashing");
            setTimeout(() => {
                document.getElementById("boot-loader").classList.add("hidden");
                document.getElementById("login-box").classList.add("hidden");
                body.classList.remove("crashing"); btn.innerText = "Power: OFF"; isSystemCrashing = false;
            }, 1000);
        }
    } else {
        btn.innerText = "SYSTEM ERROR"; btn.classList.add("bg-red-900", "text-white"); body.classList.add("crashing");
        setTimeout(() => { errorScr.classList.remove("hidden"); }, 1400);
        setTimeout(() => {
            body.classList.remove("crashing"); errorScr.classList.add("hidden"); btn.innerText = "Power: OFF";
            btn.classList.remove("bg-red-900", "text-white"); isSystemCrashing = false;
        }, 4000);
    }
}

// ======================================================
// 7. UTILS & SYSTEM LOOP
// ======================================================

function toggleBountyForm() {
    if (!currentUser) { alert("ZALOGUJ SIĘ W BIOS."); return; }
    document.getElementById("bounty-form").classList.toggle("hidden");
}

function copyIP() { navigator.clipboard.writeText(serverIP); alert("IP COPIED."); }
function changeCamera() {
    const img = document.getElementById('cctv-img');
    img.style.opacity = "0.1"; setTimeout(() => { img.style.opacity = "0.4"; }, 150);
}

function updateTicker(bounties) {
    const approved = bounties.filter(b => b.status === "APPROVED");
    let html = `SYSTEM: Infection wave approaching... &nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp; WARNING: Water contamination... &nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp; DATABASE_LOSS...`;
    approved.forEach(b => { html += ` &nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp; <span class="text-white bg-red-600 px-1 font-mono font-bold">WANTED: ${b.target}</span> (REWARD: ${b.reward})`; });
    document.getElementById("ticker-text").innerHTML = html;
}

async function refreshStatus() {
    const mainS = document.getElementById("server-status-main");
    const pList = document.getElementById("player-list");
    try {
        const res = await fetch(`https://api.mcsrvstat.us/2/${serverIP}`);
        const data = await res.json();
        if (data.online) {
            mainS.innerText = "ONLINE"; mainS.className = "text-2xl font-bold text-green-400 animate-pulse font-mono font-black";
            const players = data.players.list || [];
            players.forEach(p => { if (!lastPlayerList.includes(p)) addSystemLog(`Signal found: ${p}.`, "JOIN"); });
            lastPlayerList.forEach(p => { if (!players.includes(p)) addSystemLog(`Signal lost: ${p}.`, "ALARM"); });
            lastPlayerList = players;
            pList.innerHTML = players.map(p => `<div class="flex items-center gap-3 border-b border-white/5 pb-1"><img src="https://minotar.net/helm/${p}/20" class="border border-green-900 shadow-sm"><span class="text-green-400 text-xs font-bold uppercase tracking-widest font-mono">${p}</span><span class="text-[8px] text-gray-600 ml-auto italic font-bold">LIVE</span></div>`).join('');
            document.getElementById("player-count").innerText = `SURVIVORS: ${data.players.online}/${data.players.max}`;
            document.getElementById("server-status-text").innerText = "STABLE LINK";
            document.getElementById("server-status-text").className = "text-sm font-bold text-green-400 uppercase italic";
        } else {
            mainS.innerText = "OFFLINE"; mainS.className = "text-2xl font-bold text-red-600 italic font-mono";
            pList.innerHTML = "<div class='text-gray-800 text-xs italic uppercase tracking-tighter'>Scanning dead zone...</div>";
            document.getElementById("server-status-text").innerText = "OUT OF RANGE";
            document.getElementById("server-status-text").className = "text-sm font-bold text-red-600 uppercase italic";
        }
    } catch (e) {}
}

const tick = () => {
    const now = new Date();
    const diff = Math.floor((now - serverStartDate) / (1000 * 60 * 60 * 24));
    document.getElementById("days").innerText = diff > 0 ? diff : 0;
    document.getElementById('cctv-time').innerText = now.toLocaleTimeString();
    if (document.body.classList.contains('power-on')) {
        document.getElementById('grid-load').innerText = (2.1 + Math.random() * 0.5).toFixed(1) + "kW";
    }
};

tick(); setInterval(tick, 1000); setInterval(refreshStatus, 30000);
refreshStatus();