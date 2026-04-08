// Global State Pattern
let appState = {
    projects: [
        { id: 1, name: "Sample Line 1", taktTime: 45, processes: 3 }
    ],
    processes: [],
    elements: []
};

// UI Elements
const navLinks = document.querySelectorAll('.nav-link');
const pages = document.querySelectorAll('.page-container');
const btnSync = document.getElementById('btn-sync');
const syncText = document.getElementById('sync-text');
const syncSpinner = document.getElementById('sync-spinner');
const syncStatus = document.getElementById('sync-status');
const projectList = document.getElementById('project-list');

// Routing Logic
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetPage = link.getAttribute('data-page');
        
        // Reset styles active
        navLinks.forEach(l => {
            l.classList.remove('bg-gray-800', 'text-blue-400');
            l.classList.add('text-gray-300');
        });
        
        // Formulate active style
        link.classList.add('bg-gray-800', 'text-blue-400');
        link.classList.remove('text-gray-300');
        
        // Hide all pages, show target
        pages.forEach(p => p.classList.add('hidden'));
        document.getElementById(`page-${targetPage}`).classList.remove('hidden');
        
        if(targetPage === 'dashboard') renderDashboard();
        if(targetPage === 'yamazumi') renderYamazumi();
    });
});

// Render Dashboard
function renderDashboard() {
    projectList.innerHTML = '';
    appState.projects.forEach(p => {
        const card = document.createElement('div');
        card.className = "bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow transition-shadow";
        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <h3 class="font-semibold text-lg text-gray-800">${p.name}</h3>
                <span class="text-xs bg-green-100 text-green-800 px-2.5 py-1 rounded-full font-medium">Aktif</span>
            </div>
            <div class="space-y-2 text-sm">
                <div class="flex justify-between"><span class="text-gray-500">Takt Time:</span><span class="font-medium">${p.taktTime} sec</span></div>
                <div class="flex justify-between"><span class="text-gray-500">Process Count:</span><span class="font-medium">${p.processes}</span></div>
            </div>
        `;
        projectList.appendChild(card);
    });
}

// Render Yamazumi Mock
let yamazumiChartInstance = null;
function renderYamazumi() {
    const ctx = document.getElementById('yamazumiCanvas').getContext('2d');
    if(yamazumiChartInstance) yamazumiChartInstance.destroy();
    
    yamazumiChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Station 1', 'Station 2', 'Station 3'],
            datasets: [
                { label: 'Value Added', data: [12, 19, 3], backgroundColor: '#3B82F6', stack: 'Stack 0'},
                { label: 'Non-Value Added', data: [2, 3, 20], backgroundColor: '#EF4444', stack: 'Stack 0' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { x: { stacked: true }, y: { stacked: true } }
        }
    });
}

// API Server Calls
async function fetchState() {
    syncStatus.innerText = "Memuat data...";
    try {
        const res = await fetch('api/state.php');
        if(!res.ok) throw new Error("Gagal mengambil api/state.php");
        const data = await res.json();
        
        if(data && data.state) {
            appState = data.state;
            syncStatus.innerText = "Sinkronisasi berhasil";
            if(appState.projects.length === 0){
                appState.projects = [{ id: 1, name: "Sample Line (Server Data)", taktTime: 60, processes: 5 }];
            }
        }
    } catch(err) {
        console.warn("API Server tidak tersedia, menggunakan LocalStorage fallback", err);
        const ldata = localStorage.getItem('lean_sw_state');
        if(ldata) appState = JSON.parse(ldata);
        syncStatus.innerText = "Mode Lokal (Offline)";
    }
    renderDashboard();
}

async function saveState() {
    syncSpinner.classList.remove('hidden');
    syncText.innerText = "Menyimpan...";
    try {
        const res = await fetch('api/state.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state: appState })
        });
        const data = await res.json();
        if(data.ok) {
            syncStatus.innerText = "Tersimpan: " + new Date().toLocaleTimeString();
        }
    } catch(err) {
        // Fallback local
        localStorage.setItem('lean_sw_state', JSON.stringify(appState));
        syncStatus.innerText = "Tersimpan Lokal: " + new Date().toLocaleTimeString();
    }
    setTimeout(() => {
        syncSpinner.classList.add('hidden');
        syncText.innerText = "Simpan ke Server";
    }, 500);
}

// Init Flow
document.getElementById('btn-add-project').addEventListener('click', () => {
    appState.projects.push({ id: Date.now(), name: `Proyek Lini ${appState.projects.length + 1}`, taktTime: 40, processes: 0 });
    renderDashboard();
    saveState();
});

btnSync.addEventListener('click', () => {
    saveState();
});

// Load on start
document.addEventListener("DOMContentLoaded", () => {
    fetchState();
});
