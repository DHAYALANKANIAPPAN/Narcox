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

async function updateTelegram() {
    // 1. Update webhook status
    const status = await API.get('/api/telegram/status');
    if (status) {
        document.getElementById('telegram-webhook-status').innerText = status.connected ? 'Active: ' + status.webhook : 'Disconnected';
    }

    // 2. Fetch detections table
    const minRisk = document.getElementById('tg-min-risk').value;
    const days = document.getElementById('tg-days').value;
    const detections = await API.get(`/api/detections?platform=telegram&minRisk=${minRisk}&days=${days}`);
    
    if (detections) {
        const tbody = document.getElementById('telegram-page-tbody');
        if(!tbody) return;
        tbody.innerHTML = '';
        
        detections.forEach(det => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-border hover:bg-muted/50';
            const timeStr = new Date(det.ts).toLocaleTimeString();
            
            // Format explanations nicely
            const reasonsHtml = (det.reasons || []).map(r => `<li>- ${esc(r)}</li>`).join('');
            const idents = det.identifiers || {};
            const phonesHtml = (idents.phones || []).map(p => `<li>📞 ${esc(p)}</li>`).join('');
            
            tr.innerHTML = `
                <td class="py-3 px-4 text-sm text-muted-foreground">${timeStr}</td>
                <td class="py-3 px-4">${esc(det.chatTitle)}</td>
                <td class="py-3 px-4">${esc(det.username)}</td>
                <td class="py-3 px-4">${riskBadge(det.risk)}</td>
                <td class="py-3 px-4">
                    <div>${esc(det.text)}</div>
                    <details class="mt-2 text-xs text-muted-foreground bg-muted/20 p-2 rounded">
                        <summary class="cursor-pointer text-blue-400 font-medium">Why flagged?</summary>
                        <ul class="mt-1 space-y-1">
                            ${reasonsHtml}
                            ${phonesHtml}
                        </ul>
                    </details>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
}

async function updateInstagram() {
    // We can hardcode the query params for now like we did for Telegram
    const minRisk = 4;
    const days = 30;
    const detections = await API.get(`/api/detections?platform=instagram&minRisk=${minRisk}&days=${days}`);
    
    if (detections) {
        const tbody = document.getElementById('instagram-page-tbody');
        if(!tbody) return;
        tbody.innerHTML = '';
        
        detections.forEach(det => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-border hover:bg-muted/50';
            const timeStr = new Date(det.ts).toLocaleTimeString();
            
            const simulatedTag = det.simulated ? `<span class="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-500 text-[10px] rounded uppercase">Simulated</span>` : '';
            
            tr.innerHTML = `
                <td class="py-3 px-4 text-sm text-muted-foreground">${timeStr}</td>
                <td class="py-3 px-4">${esc(det.chatTitle)}</td>
                <td class="py-3 px-4">${esc(det.username)}</td>
                <td class="py-3 px-4">${riskBadge(det.risk)}</td>
                <td class="py-3 px-4">${esc(det.text)} ${simulatedTag}</td>
            `;
            tbody.appendChild(tr);
        });
    }
}

function runAllUpdates() {
    updateDashboard();
    updateAlerts();
    updateTelegram();
    updateInstagram();
}

// Tell our poll() tool to run everything every 5 seconds!
poll(runAllUpdates, 5000);
