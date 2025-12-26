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

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ======================================================
// 2. KONFIGURACJA TERMINALA
// ======================================================
const serverIP = "Ferajnav3.aternos.me:25921"; 
const serverStartDate = new Date("2025-12-30");
const adminUID = "UD97Gi8bGAhwh0QLXZMrx6VGPVe2"; 

let lastPlayerList = [];
let isSystemCrashing = false;
let currentUser = null; 

// ======================================================
// 3. SYNCHRONIZACJA DANYCH
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
        if (m.type === "JOIN") clr = "text-green-400 font-bold";
        if (m.type === "ALARM") clr = "text-red-500 font-bold";
        if (m.type === "EVENT") clr = "text-yellow-400 font-bold";
        return `<div class="mb-2 border-b border-white/5 pb-1"><span class="${clr}">[${m.type}]</span> <span class="text-[9px] text-gray-700 font-mono">${m.time}</span><br><span class="uppercase">${m.msg}</span></div>`;
    }).join('');
    container.scrollTop = container.scrollHeight;
});

// Bounty - System Zintegrowany (Kontrastowy)
db.ref('bounties').on('value', (snapshot) => {
    const data = snapshot.val();
    const container = document.getElementById("bounty-list");
    if (!container) return;
    if (!data) { container.innerHTML = `<p class="text-[9px] text-gray-700 italic text-center uppercase opacity-50">Brak kontraktów...</p>`; updateTicker([]); return; }

    const bounties = Object.keys(data).map(key => ({ id: key, ...data[key] }));
    
    container.innerHTML = bounties.map(b => {
        const isCreator = currentUser && b.creatorUID === currentUser.uid;
        const isAdmin = currentUser && currentUser.uid === adminUID;
        const isSolver = currentUser && b.solverUID === currentUser.uid;

        let statusLabel = "OCZEKIWANIE NA ZATWIERDZENIE ADMINA";
        let statusClass = "border-zinc-800 opacity-40 bg-zinc-900/20"; 

        if (b.status === 'APPROVED') { 
            statusLabel = "AKTYWNE - POSZUKIWANY"; 
            statusClass = "border-blue-500 bg-blue-900/20 shadow-[0_0_15px_rgba(59,130,246,0.3)] opacity-100"; 
        }
        else if (b.status === 'EXECUTED') { 
            statusLabel = "WYKONANE - WERYFIKACJA DOWODU"; 
            statusClass = "border-orange-500 bg-orange-900/30 shadow-[0_0_15px_rgba(249,115,22,0.4)] opacity-100 animate-pulse"; 
        }
        else if (b.status === 'FINISHED') { 
            statusLabel = "KONTRAKT ZAKOŃCZONY"; 
            statusClass = "border-green-500 bg-green-900/10 opacity-100"; 
        }

        const isItem = b.target.startsWith("ITEM:");
        const avatarUrl = isItem ? "https://static.wikia.nocookie.net/minecraft_gamepedia/images/c/c8/Chest_JE2_BE2.png" : `https://minotar.net/avatar/${b.target}/32`;

        return `
            <div class="bounty-card p-3 border-2 ${statusClass} relative mb-3 transition-all">
                <div class="flex items-center gap-4">
                    <img src="${avatarUrl}" class="border-2 border-black w-10 h-10 ${isItem ? 'object-contain' : ''}">
                    <div class="text-[11px] flex-1">
                        <div class="flex justify-between items-start font-black uppercase mb-1">
                            <span class="${b.status === 'FINISHED' ? 'line-through text-gray-500' : 'text-white text-sm'} tracking-tighter">${b.target}</span>
                            <span class="text-[8px] font-bold px-1 bg-black/50">${statusLabel}</span>
                        </div>
                        <p class="text-yellow-400 font-black text-xs">NAGRODA: ${b.reward}</p>
                        <p class="text-gray-400 mt-1 italic text-[10px]">"${b.reason}"</p>

                        <div class="mt-3 flex flex-wrap gap-2">
                            ${b.status === 'APPROVED' && !isCreator ? 
                                `<button onclick="userSubmitEvidence('${b.id}')" class="text-[9px] bg-blue-600 text-white px-3 py-1 font-black uppercase hover:bg-blue-400 transition-colors">Wgraj dowód</button>` : ''}

                            ${b.evidence && (isAdmin || isCreator || isSolver) ? 
                                `<a href="${b.evidence}" target="_blank" class="text-[9px] bg-green-600 text-white px-3 py-1 font-black uppercase">ZOBACZ DOWÓD</a>` : 
                                (b.evidence ? `<span class="text-[8px] text-zinc-500 italic uppercase bg-black/40 px-2 py-1">Dowód utajniony (Tylko dla stron)</span>` : '')}

                            ${isCreator && b.status === 'EXECUTED' ? `
                                <div class="flex gap-1 w-full mt-2">
                                    <button onclick="creatorDecision('${b.id}', true)" class="flex-1 bg-green-500 text-black font-black text-[10px] py-1.5 uppercase shadow-lg">POTWIERDZAM ZABÓJSTWO</button>
                                    <button onclick="creatorDecision('${b.id}', false)" class="flex-1 bg-red-600 text-white font-black text-[10px] py-1.5 uppercase opacity-80">FAŁSZYWY DOWÓD</button>
                                </div>` : ''}

                            ${b.status === 'FINISHED' && (isCreator || isSolver) ? 
                                `<button onclick="openBountyChat('${b.id}')" class="text-[9px] bg-white text-black px-3 py-1 font-black animate-pulse uppercase">Ustal Odbiór Nagrody</button>` : ''}

                            ${isAdmin ? `<button onclick="adminManageBounty('${b.id}')" class="text-[8px] text-zinc-400 border border-zinc-700 px-2 py-1 hover:text-white uppercase font-bold">Admin: ${b.status === 'WAITING' ? 'ZATWIERDŹ' : 'USUŃ'}</button>` : ''}
                        </div>
                    </div>
                </div>
                <div id="chat-${b.id}" class="hidden mt-3 border-t border-green-500/30 pt-3 space-y-2 max-h-40 overflow-y-auto font-mono text-[9px] bg-black/40 p-2"></div>
            </div>
        `;
    }).join('');
    updateTicker(bounties);
});

// --- FUNKCJE BOUNTY & CHAT ---
function submitBounty() {
    if (!currentUser) return;
    const target = document.getElementById("b-target").value.trim();
    const reward = document.getElementById("b-reward").value.trim();
    const reason = document.getElementById("b-reason").value.trim();
    if (!target || !reward || !reason) return;
    db.ref('bounties').push({
        target: target.toUpperCase(), reward: reward.toUpperCase(), reason,
        creatorUID: currentUser.uid, status: 'WAITING',
        date: new Date().toLocaleDateString(), evidence: null, solverUID: null, solverName: null
    });
    document.getElementById("b-target").value = ""; 
    document.getElementById("b-reward").value = ""; 
    document.getElementById("b-reason").value = "";
    toggleBountyForm();
    addSystemLog(`NOWE ZGŁOSZENIE: ${target}`, "INFO");
}

function userSubmitEvidence(id) {
    if (!currentUser) return;
    const proof = prompt("WKLEJ LINK DO DOWODU (IMGUR/DISCORD):");
    if (!proof || !proof.startsWith("http")) return;
    db.ref('bounties/' + id).update({
        status: 'EXECUTED', evidence: proof,
        solverUID: currentUser.uid,
        solverName: currentUser.email.split('@')[0].toUpperCase()
    });
    addSystemLog(`DOWÓD PRZESŁANY DO KONTRAKTU.`, "EVENT");
}

function creatorDecision(id, isConfirmed) {
    if (isConfirmed) {
        db.ref('bounties/' + id).update({ status: 'FINISHED' });
        addSystemLog("ZLECENIE ZWERYFIKOWANE I ZAMKNIĘTE.", "INFO");
    } else {
        db.ref('bounties/' + id).update({ 
            status: 'APPROVED', evidence: null, solverUID: null, solverName: null 
        });
        addSystemLog("DOWÓD ODRZUCONY PRZEZ TWÓRCĘ.", "ALARM");
    }
}

function openBountyChat(id) {
    const chatDiv = document.getElementById(`chat-${id}`);
    chatDiv.classList.toggle("hidden");
    db.ref(`bounties/${id}/messages`).on('value', (snap) => {
        const msgs = snap.val();
        if (!msgs) { chatDiv.innerHTML = `<p class="opacity-50 italic text-green-500">SYSTEM: Połączono. Ustalcie punkt odbioru...</p><button onclick="sendBountyMessage('${id}')" class="text-white underline mt-2 uppercase font-black">Wyślij wiadomość</button>`; }
        else {
            chatDiv.innerHTML = Object.values(msgs).map(m => `<div class="border-l-2 border-green-500 pl-2 py-1 bg-green-500/5"><span class="text-green-400 font-black">[${m.user}]</span> <span class="text-zinc-200">${m.text}</span></div>`).join('') + `<button onclick="sendBountyMessage('${id}')" class="text-white underline mt-2 uppercase font-black">Wyślij wiadomość</button>`;
        }
        chatDiv.scrollTop = chatDiv.scrollHeight;
    });
}

function sendBountyMessage(id) {
    const text = prompt("TREŚĆ KOMUNIKATU PRYWATNEGO:");
    if (!text) return;
    const user = currentUser.email.split('@')[0].toUpperCase();
    db.ref(`bounties/${id}/messages`).push({ user, text, time: Date.now() });
}

function adminManageBounty(id) {
    if (!currentUser || currentUser.uid !== adminUID) return;
    db.ref('bounties/' + id).once('value', snap => {
        const b = snap.val();
        if (b.status === 'WAITING') {
            db.ref('bounties/' + id).update({ status: 'APPROVED' });
            addSystemLog("ADMIN: KONTRAKT ZATWIERDZONY.", "EVENT");
        } else {
            if(confirm("USUNĄĆ KONTRAKT NA STAŁE?")) db.ref('bounties/' + id).remove();
        }
    });
}

// ======================================================
// 4. ADMIN TOOLS
// ======================================================
function adminQuickResetRadio() {
    if (!currentUser || currentUser.uid !== adminUID) { alert("ADMIN UID ERROR"); return; }
    if (confirm("WYCZYŚCIĆ WSZYSTKIE LOGI RADIOWE?")) {
        db.ref('logs').remove();
        addSystemLog("RADIOLOG ZRESETOWANY.", "ALARM");
    }
}

function adminQuickUpdateBulletin() {
    if (!currentUser || currentUser.uid !== adminUID) { alert("ADMIN UID ERROR"); return; }
    const name = prompt("TYTUŁ OPERACJI:");
    const phase = prompt("STATUS:");
    const percent = prompt("POSTĘP (%):", "0");
    const note = prompt("BRIEFING:");
    const items = [
        { name: prompt("Zadanie 1:"), status: "W TOKU" },
        { name: prompt("Zadanie 2:"), status: "OCZEKIWANIE" }
    ];
    db.ref('objective').set({ name: name.toUpperCase(), phase: phase.toUpperCase(), percent, note, items });
    addSystemLog("BIULETYN ZAKTUALIZOWANY.", "EVENT");
}

function addSystemLog(msg, type = "INFO") {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    db.ref('logs').push({ msg, type, time });
}

// ======================================================
// 5. BIOS & POWER
// ======================================================
const bootLines = ["F3-OS (tm) BIOS v1.0.4", "CPU: TERMINAL CORE... OK", "MEMORY: 64GB... OK", "ENCRYPTION ACTIVE.", "MANDATORY LOGIN REQUIRED."];

async function runBootSequence() {
    const loader = document.getElementById("boot-loader");
    const textTarget = document.getElementById("boot-text");
    loader.classList.remove("hidden"); textTarget.innerHTML = "";
    for(let line of bootLines) {
        textTarget.innerHTML += `> ${line}<br>`;
        await new Promise(r => setTimeout(r, 60)); 
    }
    document.getElementById("login-box").classList.remove("hidden");
    document.getElementById("login-user").focus();
    return new Promise((resolve) => {
        const handleLogin = async (e) => {
            if (e.key === "Enter") {
                const user = document.getElementById("login-user").value.toLowerCase();
                const email = user.includes("@") ? user : user + "@f3.pl";
                const pass = document.getElementById("login-pass").value;
                try {
                    const cred = await firebase.auth().signInWithEmailAndPassword(email, pass);
                    currentUser = cred.user;
                    window.removeEventListener("keydown", handleLogin);
                    document.getElementById("login-box").classList.add("hidden");
                    resolve(true);
                } catch (error) { textTarget.innerHTML += `<br><span class="text-red-500 font-bold">AUTH_FAILED</span>`; }
            }
        };
        window.addEventListener("keydown", handleLogin);
    });
}

async function finishBoot(user) {
   const textTarget = document.getElementById("boot-text");
   const name = user.email.split('@')[0].toUpperCase();
   textTarget.innerHTML += `<br>> WITAJ, ${name}.<br>> DOSTĘP PRZYZNANY.<br>> SYSTEM READY.`;
   await new Promise(r => setTimeout(r, 600));
   document.getElementById("boot-loader").classList.add("hidden");
   if (user.uid === adminUID) {
       document.getElementById("admin-tools-panel").classList.remove("hidden");
       addSystemLog("ADMIN SESSION STARTED.", "EVENT");
   }
}

async function togglePower() {
    if (isSystemCrashing) return;
    const body = document.body;
    if (body.classList.contains("power-on")) {
        body.classList.remove("power-on"); document.getElementById("powerBtn").innerText = "Power: OFF";
        document.getElementById("powerSound").pause(); document.getElementById("humSound").pause();
        currentUser = null; return;
    }
    isSystemCrashing = true; body.classList.add("crashing");
    await new Promise(r => setTimeout(r, 1000)); body.classList.remove("crashing");
    const success = await runBootSequence();
    if (success) {
        await finishBoot(currentUser);
        body.classList.add("power-on"); document.getElementById("powerBtn").innerText = "Power: ON";
        document.getElementById("powerSound").play().catch(()=>{}); document.getElementById("humSound").play().catch(()=>{});
        isSystemCrashing = false;
    } else { isSystemCrashing = false; body.classList.add("crashing"); setTimeout(()=>body.classList.remove("crashing"), 500); }
}

// ======================================================
// 6. STATUS & TICKER
// ======================================================
async function refreshStatus() {
    const mainS = document.getElementById("server-status-main");
    const pList = document.getElementById("player-list");
    const pCount = document.getElementById("player-count");

    try {
        const timestamp = new Date().getTime();
        const res = await fetch(`https://api.mcstatus.io/v2/status/java/${serverIP}?t=${timestamp}`, {
            cache: "no-store"
        });
        
        if (!res.ok) throw new Error("API_UNREACHABLE");
        const data = await res.json();

        // WERYFIKACJA TOŻSAMOŚCI SERWERA
        // Sprawdzamy, czy w opisie (MOTD) znajduje się nazwa Twojego serwera
        const motd = data.motd ? (data.motd.clean || data.motd.raw || "").toUpperCase() : "";
        const isOurServer = motd.includes("FERAJNAV3");

        // Jeśli API mówi offline LUB to nie jest nasz serwer (mimo że port odpowiada)
        if (!data.online || !isOurServer) {
            mainS.innerText = "OFFLINE"; 
            mainS.className = "text-2xl font-bold text-red-600 italic font-black";
            pCount.innerText = "SURVIVORS: 0/0"; 
            pList.innerHTML = "<div class='text-zinc-800 text-[10px] uppercase font-bold text-center py-4'>Scanning Sector... No signal found.</div>";
            lastPlayerList = []; 
            return;
        }

        // Jeśli serwer jest online i to faktycznie FERAJNAV3
        mainS.innerText = "ONLINE"; 
        mainS.className = "text-2xl font-bold text-green-400 animate-pulse font-black";
        pCount.innerText = `SURVIVORS: ${data.players.online}/${data.players.max}`;
        
        const current = data.players.list ? data.players.list.map(p => p.name_clean) : [];
        
        // Logowanie wejść/wyjść
        current.forEach(p => { 
            if (!lastPlayerList.includes(p)) addSystemLog(`SIGNAL_FOUND: ${p.toUpperCase()}.`, "JOIN"); 
        });
        lastPlayerList.forEach(p => { 
            if (!current.includes(p)) addSystemLog(`SIGNAL_LOST: ${p.toUpperCase()}.`, "ALARM"); 
        });
        
        lastPlayerList = current;

        if (current.length > 0) {
            pList.innerHTML = current.map(p => `
                <div class="flex items-center gap-3 border-b border-white/5 pb-1">
                    <img src="https://minotar.net/helm/${p}/20" class="border border-green-900 shadow-sm">
                    <span class="text-green-400 text-xs font-bold uppercase font-mono">${p}</span>
                </div>`).join('');
        } else {
            pList.innerHTML = "<div class='text-zinc-700 text-[10px] uppercase font-bold text-center py-2'>Dead Zone... No signs of life.</div>";
        }

    } catch (e) { 
        console.error("Critical link failure:", e);
        mainS.innerText = "LINK_ERROR";
        mainS.className = "text-2xl font-bold text-yellow-600 italic";
    }
}

const tick = () => {
    const now = new Date();
    const diff = Math.floor((now - serverStartDate) / (1000 * 60 * 60 * 24));
    document.getElementById("days").innerText = diff > 0 ? diff : 0;
    document.getElementById('cctv-time').innerText = now.toLocaleTimeString();
    if (document.body.classList.contains('power-on')) document.getElementById('grid-load').innerText = (2.1 + Math.random() * 0.5).toFixed(1) + "kW";
};

function toggleBountyForm() { if (!currentUser) return; document.getElementById("bounty-form").classList.toggle("hidden"); }
function copyIP() { navigator.clipboard.writeText("ferajnav3.aternos.me"); alert("IP COPIED."); }

function updateTicker(bounties) {
    const approved = bounties.filter(b => b.status === "APPROVED");
    let html = `SYSTEM: Infection wave approaching... &nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp; WARNING: Water contamination...`;
    approved.forEach(b => { html += ` &nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp; <span class="text-white bg-red-600 px-2 font-black">POSZUKIWANY: ${b.target}</span> (NAGRODA: ${b.reward})`; });
    document.getElementById("ticker-text").innerHTML = html;
}

tick(); setInterval(tick, 1000); setInterval(refreshStatus, 30000); refreshStatus();