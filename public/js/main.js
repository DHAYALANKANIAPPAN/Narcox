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

// 4. Tell our poll() tool to run updateDashboard every 5 seconds!
poll(updateDashboard, 5000);
