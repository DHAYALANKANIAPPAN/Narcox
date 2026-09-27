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
        
        if (detections.length === 0) {
            tbody.innerHTML = `<tr id="empty-state"><td colspan="5" class="py-6 text-center text-muted-foreground font-medium">No active alerts</td></tr>`;
            return;
        }

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
        
        if (detections.length === 0) {
            tbody.innerHTML = `<tr id="empty-state"><td colspan="5" class="py-6 text-center text-muted-foreground font-medium">No active alerts</td></tr>`;
            return;
        }

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

async function updateEvidence() {
    const evidence = await API.get('/api/evidence');
    const container = document.getElementById('evidence-container');
    if (!evidence || !container) return;
    
    container.innerHTML = '';
    
    if (evidence.length === 0) {
        container.innerHTML = `<div id="empty-state" class="py-6 text-center text-muted-foreground font-medium">No forensic packages available</div>`;
        return;
    }

    evidence.forEach(ev => {
        const verifiedBadge = ev.verified 
            ? `<span class="hash-verified text-sm px-3 py-1 bg-green-500/10 border border-green-500/30 rounded">✓ HASH VERIFIED</span>`
            : `<span class="text-sm px-3 py-1 bg-red-500/10 border border-red-500/30 text-red-500 rounded">✗ TAMPERED</span>`;
            
        const custodyHtml = ev.custody.map(c => 
            `<div class="flex justify-between text-xs text-muted-foreground"><span class="font-mono">${c.action} by ${c.by}</span> <span>${new Date(c.at).toLocaleString()}</span></div>`
        ).join('');
        
        container.innerHTML += `
            <div class="stat-card p-6 rounded-lg border-l-4 ${ev.verified ? 'border-green-500' : 'border-red-500'}">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="font-mono text-lg text-primary">CASE #${ev.detectionId}</h3>
                        <p class="text-xs text-muted-foreground mt-1">Package Hash: <span class="font-mono text-[10px] bg-muted/30 p-1 rounded break-all">${ev.packageHash}</span></p>
                    </div>
                    ${verifiedBadge}
                </div>
                <div class="bg-black/50 p-3 rounded mb-4 font-mono text-xs border border-border">
                    <div class="text-blue-400 mb-2">RAW CONTENT:</div>
                    ${JSON.stringify(ev.content, null, 2)}
                </div>
                <div class="space-y-2 mb-4">
                    <div class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Custody Chain</div>
                    ${custodyHtml}
                </div>
                <button onclick="alert('Downloading forensic package for ${ev.detectionId}')" class="text-xs bg-primary hover:bg-red-700 text-white px-4 py-2 rounded transition-colors flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    Download Forensic JSON
                </button>
            </div>
        `;
    });
}

let networkInitialized = false;
async function updateNetwork() {
    // Only init the physics network once so it doesn't reset every 5 seconds
    if (networkInitialized) return;
    
    const data = await API.get('/api/network');
    const container = document.getElementById('network-map-container');
    if (!data || !container || !window.vis) return;
    
    networkInitialized = true;
    
    // Map data for vis-network
    const nodes = new vis.DataSet(data.nodes.map(n => {
        let color = '#3b82f6'; // account blue
        if (n.type === 'group') color = '#a855f7'; // group purple
        if (n.type === 'phones') color = '#22c55e'; // phone green
        if (n.risk >= 8) color = '#ef4444'; // high risk red
        
        return {
            id: n.id,
            label: n.label + (n.role ? `\n(${n.role})` : ''),
            value: n.risk * n.degree, // Size based on risk and connections
            color: { background: color, border: '#111' },
            font: { color: '#fff', face: 'monospace', size: 12 }
        };
    }));
    
    const edges = new vis.DataSet(data.edges.map(e => ({
        from: e.from,
        to: e.to,
        label: e.kind,
        color: { color: '#404040' },
        font: { color: '#a3a3a3', size: 10, align: 'middle' },
        arrows: 'to'
    })));

    const options = {
        nodes: { shape: 'dot', scaling: { min: 10, max: 30 } },
        physics: {
            forceAtlas2Based: { gravitationalConstant: -50, centralGravity: 0.01, springLength: 100, springConstant: 0.08 },
            maxVelocity: 50,
            solver: 'forceAtlas2Based',
            timestep: 0.35,
            stabilization: { iterations: 150 }
        }
    };
    
    new vis.Network(container, { nodes, edges }, options);
}

function runAllUpdates() {
    updateDashboard();
    updateAlerts();
    updateTelegram();
    updateInstagram();
    updateEvidence();
    updateNetwork();
}

// Tell our poll() tool to run everything every 5 seconds!
poll(runAllUpdates, 5000);


async function updateCharts() {
    const stats = await API.get('/api/stats');
    if (!stats) return;

    const trendContainer = document.getElementById('chart-trends');
    if (trendContainer && Array.isArray(stats.trend)) {
        const maxCount = Math.max(1, ...stats.trend.map(d => d.count));
        trendContainer.innerHTML = stats.trend.length === 0
            ? '<div class="text-center text-muted-foreground text-sm w-full">No data in the last 7 days</div>'
            : stats.trend.map(d => {
                const heightPct = Math.round((d.count / maxCount) * 100);
                const day = new Date(d._id).toLocaleDateString(undefined, { weekday: 'short' });
                return `
                    <div class="flex flex-col items-center flex-1">
                        <div class="w-full bg-primary rounded-t" style="height:${Math.max(heightPct, 4)}%"></div>
                        <div class="text-[10px] text-muted-foreground mt-2">${day}</div>
                        <div class="text-[10px] text-muted-foreground">${d.count}</div>
                    </div>
                `;
            }).join('');
    }

    const mediaContainer = document.getElementById('chart-media');
    if (mediaContainer && stats.byType) {
        const entries = Object.entries(stats.byType);
        const total = entries.reduce((sum, [, count]) => sum + count, 0) || 1;
        mediaContainer.innerHTML = entries.length === 0
            ? '<div class="text-center text-muted-foreground text-sm">No data available</div>'
            : entries.map(([type, count]) => {
                const pct = Math.round((count / total) * 100);
                return `
                    <div>
                        <div class="flex justify-between text-xs mb-1">
                            <span class="text-muted-foreground capitalize">${type}</span>
                            <span class="text-primary font-medium">${count}</span>
                        </div>
                        <div class="w-full bg-muted/30 rounded-full h-2">
                            <div class="bg-primary h-2 rounded-full" style="width:${pct}%"></div>
                        </div>
                    </div>
                `;
            }).join('');
    }
}

if (typeof updateDashboard === 'function') {
    const _origUpdateDashboard = updateDashboard;
    updateDashboard = async function() {
        await _origUpdateDashboard();
        await updateCharts();
    };
} else {
    setInterval(updateCharts, 5000);
    updateCharts();
}

function reportQueryString(extra = {}) {
    const params = new URLSearchParams({ report: 1, ...extra });
    const from = document.getElementById('report-from')?.value;
    const to = document.getElementById('report-to')?.value;
    const platform = document.getElementById('report-platform')?.value;
    const minRisk = document.getElementById('report-minrisk')?.value;
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (platform) params.set('platform', platform);
    if (minRisk) params.set('minRisk', minRisk);
    return params.toString();
}

async function updateReports() {
    const data = await API.get(`/api/stats?${reportQueryString()}`);
    if (!data) return;

    document.getElementById('report-total').innerText = data.summary.totalDetections;
    document.getElementById('report-high').innerText = data.summary.highRisk;
    document.getElementById('report-medium').innerText = data.summary.mediumRisk;
    document.getElementById('report-low').innerText = data.summary.lowRisk;

    const kwBody = document.getElementById('report-keywords-tbody');
    kwBody.innerHTML = data.topKeywords.length
        ? data.topKeywords.map(k => `
            <tr class="border-b border-border">
                <td class="py-2">${esc(k.term)}</td>
                <td class="py-2 text-right text-muted-foreground">${k.count}</td>
            </tr>`).join('')
        : `<tr><td class="py-2 text-muted-foreground">No data</td></tr>`;

    const acctBody = document.getElementById('report-accounts-tbody');
    acctBody.innerHTML = data.topAccounts.length
        ? data.topAccounts.map(a => `
            <tr class="border-b border-border">
                <td class="py-2">${esc(a.account)}</td>
                <td class="py-2 text-right text-muted-foreground">${a.count}</td>
            </tr>`).join('')
        : `<tr><td class="py-2 text-muted-foreground">No data</td></tr>`;
}

function downloadReportCsv() {
    window.open(`/api/stats?${reportQueryString({ format: 'csv' })}`, '_blank');
}
