// public/js/main.js

async function updateDashboard() {
    // 1. Fetch our data! (This will read from mock.json for now)
    const stats = await API.get('/api/stats');
    
    if (stats) {
        // 2. Update the 4 top cards using the IDs we added earlier
        document.getElementById('stat-total-alerts').innerText = stats.totalAlerts;
        document.getElementById('stat-evidence').innerText = stats.evidencePackages;
        document.getElementById('stat-entities').innerText = stats.highRiskEntities;
        document.getElementById('stat-detections').innerText = stats.detections30d;
        
        // 3. Update the Recent Alerts Table
        const tbody = document.getElementById('recent-alerts-tbody');
        tbody.innerHTML = ''; // clear the old dummy rows
        
        // Loop over the new recent alerts and create HTML for them
        stats.recent.forEach(alert => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-border hover:bg-muted/50';
            
            tr.innerHTML = `
                <td class="py-3 px-4 font-mono text-sm">#${esc(alert._id.substring(0,6))}</td>
                <td class="py-3 px-4 capitalize">${esc(alert.platform)}</td>
                <td class="py-3 px-4">${esc(alert.username)}</td>
                <td class="py-3 px-4">${riskBadge(alert.risk)}</td>
                <td class="py-3 px-4 text-muted-foreground truncate max-w-[200px]">${esc(alert.text)}</td>
            `;
            tbody.appendChild(tr);
        });
    }
}

let lastAlertsId = null;

async function updateAlerts() {
    const alerts = await API.get('/api/alerts');
    if (alerts && alerts.length > 0) {
        // Detect if there is a new alert we haven't seen yet!
        const newestId = alerts[0]._id;
        if (lastAlertsId !== null && newestId !== lastAlertsId) {
            // PLAY A BEEP SOUND
            const beep = new Audio('data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq');
            beep.play().catch(e => {}); // Ignore error if browser blocks autoplay
        }
        lastAlertsId = newestId;

        const tbody = document.getElementById('alerts-page-tbody');
        if(!tbody) return;
        tbody.innerHTML = '';
        
        alerts.forEach(alert => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-border hover:bg-muted/50';
            
            const timeStr = new Date(alert.ts).toLocaleTimeString();
            
            tr.innerHTML = `
                <td class="py-3 px-4 text-sm text-muted-foreground">${timeStr}</td>
                <td class="py-3 px-4 capitalize">${esc(alert.platform)}</td>
                <td class="py-3 px-4">${esc(alert.username)}</td>
                <td class="py-3 px-4">${riskBadge(alert.risk)}</td>
                <td class="py-3 px-4 text-muted-foreground">${esc(alert.text)}</td>
                <td class="py-3 px-4">
                    <button onclick="createEvidence('${alert._id}')" class="px-3 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 text-xs font-medium transition-colors">
                        Create Evidence
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
}

window.createEvidence = async (id) => {
    alert("Packaging evidence for Case #" + id.substring(0,6) + "...");
    await API.post('/api/evidence', { detectionId: id, officer: 'Det. John Doe' });
    alert("Evidence securely packaged and cryptographically signed!");
};

function runAllUpdates() {
    updateDashboard();
    updateAlerts();
}

// Tell our poll() tool to run everything every 5 seconds!
poll(runAllUpdates, 5000);
