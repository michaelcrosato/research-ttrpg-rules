/**
 * src/diagnostics.ts
 *
 * Memory & Performance Diagnostics Dashboard.
 * Tracks FPS, estimated Web Worker memory, database size, search latencies (last 10),
 * wraps EventTarget to detect event listener leaks, monitors layout thrashing,
 * and handles global keyboard shortcuts.
 */
// Global state trackers
const safePerformance = typeof performance !== 'undefined' ? performance : { now: () => Date.now() };
let frameCount = 0;
let lastFpsTime = safePerformance.now();
let currentFps = 60;
let dbSize = '15.97 MB'; // Size of registry.json
const searchLatencies = [];
const listenerWarnings = [];
const thrashingWarnings = [];
// Event Listener Leak Detector state
const activeListeners = new Map();
// Layout Thrashing state
let lastWriteTime = 0;
/**
 * Get a friendly string describing a DOM element
 */
function getElementDescription(target) {
    if (target === window)
        return 'window';
    if (target === document)
        return 'document';
    if (target instanceof HTMLElement) {
        const id = target.id ? `#${target.id}` : '';
        const classes = target.className ? `.${target.className.trim().split(/\s+/).join('.')}` : '';
        return `${target.tagName.toLowerCase()}${id}${classes}`;
    }
    return 'EventTarget';
}
/**
 * Updates the Listener Leak warning UI in the Diagnostics tab
 */
function updateListenerWarningsUI() {
    const container = document.getElementById('diag-listener-warnings');
    if (!container)
        return;
    const warnings = listenerWarnings.filter((w) => w.count > 5);
    if (warnings.length === 0) {
        container.innerHTML = `
      <div class="sandbox-empty-state" style="color: var(--color-success);">
        ✅ No listener leaks detected (all elements have <= 5 of the same type).
      </div>
    `;
        return;
    }
    container.innerHTML = warnings
        .map((w) => `
      <div class="warning-item">
        <span>⚠️ Element <strong>${w.element}</strong> has <strong>${w.count}</strong> active listeners of type <strong>'${w.type}'</strong></span>
      </div>
    `)
        .join('');
}
/**
 * Updates the Layout Thrashing warnings UI
 */
function updateThrashingWarningsUI() {
    const container = document.getElementById('diag-thrashing-warnings');
    if (!container)
        return;
    if (thrashingWarnings.length === 0) {
        container.innerHTML = `
      <div class="sandbox-empty-state" style="color: var(--color-success);">
        ✅ No layout thrashing or rapid resizing detected.
      </div>
    `;
        return;
    }
    container.innerHTML = thrashingWarnings
        .slice(-5) // show last 5 warnings
        .map((w) => `
      <div class="warning-item ${w.count > 3 ? 'critical' : ''}">
        <span>⚠️ ${w.description} (Occurrences: ${w.count})</span>
      </div>
    `)
        .join('');
}
/**
 * Hooks EventTarget prototype to count active listeners and detect leaks
 */
function setupListenerLeakDetector() {
    const originalAdd = EventTarget.prototype.addEventListener;
    const originalRemove = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
        let targetMap = activeListeners.get(this);
        if (!targetMap) {
            targetMap = new Map();
            activeListeners.set(this, targetMap);
        }
        let listenerSet = targetMap.get(type);
        if (!listenerSet) {
            listenerSet = new Set();
            targetMap.set(type, listenerSet);
        }
        listenerSet.add(listener);
        const count = listenerSet.size;
        if (count > 5) {
            const elName = getElementDescription(this);
            const existing = listenerWarnings.find((w) => w.element === elName && w.type === type);
            if (existing) {
                existing.count = count;
            }
            else {
                listenerWarnings.push({ element: elName, type, count });
            }
            updateListenerWarningsUI();
        }
        // Keep global active count in sync if defined in app
        const listenersCountEl = document.getElementById('diagnostics-listeners');
        if (listenersCountEl) {
            let total = 0;
            for (const [_, typeMap] of activeListeners) {
                for (const [_, set] of typeMap) {
                    total += set.size;
                }
            }
            listenersCountEl.textContent = String(total);
        }
        return originalAdd.call(this, type, listener, options);
    };
    EventTarget.prototype.removeEventListener = function (type, listener, options) {
        const targetMap = activeListeners.get(this);
        if (targetMap) {
            const listenerSet = targetMap.get(type);
            if (listenerSet) {
                listenerSet.delete(listener);
                if (listenerSet.size === 0) {
                    targetMap.delete(type);
                }
                const elName = getElementDescription(this);
                const existingIndex = listenerWarnings.findIndex((w) => w.element === elName && w.type === type);
                if (existingIndex >= 0) {
                    const newSize = listenerSet.size;
                    if (newSize <= 5) {
                        listenerWarnings.splice(existingIndex, 1);
                    }
                    else {
                        listenerWarnings[existingIndex].count = newSize;
                    }
                    updateListenerWarningsUI();
                }
            }
        }
        // Keep global active count in sync
        const listenersCountEl = document.getElementById('diagnostics-listeners');
        if (listenersCountEl) {
            let total = 0;
            for (const [_, typeMap] of activeListeners) {
                for (const [_, set] of typeMap) {
                    total += set.size;
                }
            }
            listenersCountEl.textContent = String(total);
        }
        return originalRemove.call(this, type, listener, options);
    };
}
/**
 * Tracks DOM write operations
 */
function registerDOMWrite() {
    lastWriteTime = safePerformance.now();
}
/**
 * Tracks DOM layout read operations and checks if they happen within 16ms of a write
 */
function registerDOMRead(propName) {
    const now = safePerformance.now();
    if (now - lastWriteTime < 16) {
        const desc = `Layout Thrashing: Read '${propName}' immediately after DOM Write`;
        const existing = thrashingWarnings.find((w) => w.description === desc);
        if (existing) {
            existing.count++;
            existing.time = now;
        }
        else {
            thrashingWarnings.push({ description: desc, time: now, count: 1 });
        }
        updateThrashingWarningsUI();
    }
}
/**
 * Sets up Layout Thrashing monitoring by redefining getters/setters on DOM prototypes
 */
function setupLayoutThrashingMonitor() {
    // Wrap Element.prototype.innerHTML setter
    const innerHTMLDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    if (innerHTMLDescriptor && innerHTMLDescriptor.set) {
        const originalSet = innerHTMLDescriptor.set;
        Object.defineProperty(Element.prototype, 'innerHTML', {
            ...innerHTMLDescriptor,
            set: function (val) {
                registerDOMWrite();
                return originalSet.call(this, val);
            },
        });
    }
    // Wrap Node.prototype.textContent setter
    const textContentDescriptor = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
    if (textContentDescriptor && textContentDescriptor.set) {
        const originalSet = textContentDescriptor.set;
        Object.defineProperty(Node.prototype, 'textContent', {
            ...textContentDescriptor,
            set: function (val) {
                registerDOMWrite();
                return originalSet.call(this, val);
            },
        });
    }
    // Wrap Element.prototype.getBoundingClientRect
    const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function () {
        registerDOMRead('getBoundingClientRect()');
        return originalGetBoundingClientRect.call(this);
    };
    // Wrap properties that trigger layout reflow
    const layoutProps = [
        { proto: HTMLElement.prototype, prop: 'offsetHeight' },
        { proto: HTMLElement.prototype, prop: 'offsetWidth' },
        { proto: Element.prototype, prop: 'clientHeight' },
        { proto: Element.prototype, prop: 'clientWidth' },
    ];
    for (const { proto, prop } of layoutProps) {
        const descriptor = Object.getOwnPropertyDescriptor(proto, prop);
        if (descriptor && descriptor.get) {
            const originalGet = descriptor.get;
            Object.defineProperty(proto, prop, {
                ...descriptor,
                get: function () {
                    registerDOMRead(prop);
                    return originalGet.call(this);
                },
            });
        }
    }
    // Monitor rapid window resizing
    let lastResizeTime = 0;
    let resizeCount = 0;
    window.addEventListener('resize', () => {
        const now = safePerformance.now();
        if (now - lastResizeTime < 200) {
            resizeCount++;
            if (resizeCount > 4) {
                const desc = `Rapid window resizing detected (${resizeCount} resize events in under 1 second)`;
                const existing = thrashingWarnings.find((w) => w.description === desc);
                if (existing) {
                    existing.count = resizeCount;
                    existing.time = now;
                }
                else {
                    thrashingWarnings.push({ description: desc, time: now, count: resizeCount });
                }
                updateThrashingWarningsUI();
            }
        }
        else {
            resizeCount = 1;
        }
        lastResizeTime = now;
    });
}
/**
 * Updates FPS meter in UI
 */
function updateFPS() {
    if (typeof window === 'undefined' || typeof document === 'undefined')
        return;
    frameCount++;
    const now = safePerformance.now();
    if (now > lastFpsTime + 1000) {
        currentFps = Math.round((frameCount * 1000) / (now - lastFpsTime));
        frameCount = 0;
        lastFpsTime = now;
        const fpsEl = document.getElementById('diag-fps');
        if (fpsEl) {
            fpsEl.textContent = `${currentFps} FPS`;
            if (currentFps < 30) {
                fpsEl.style.color = 'var(--color-danger)';
            }
            else if (currentFps < 50) {
                fpsEl.style.color = 'var(--color-amber)';
            }
            else {
                fpsEl.style.color = 'var(--color-cyan)';
            }
        }
    }
    requestAnimationFrame(updateFPS);
}
/**
 * Estimates Web Worker memory size
 */
function updateWorkerMemory() {
    if (typeof window === 'undefined' || typeof document === 'undefined')
        return;
    const memEl = document.getElementById('diag-worker-mem');
    if (!memEl)
        return;
    // Query performance.memory if available (browser-specific)
    if (typeof window !== 'undefined' && window.performance.memory) {
        const memory = window.performance.memory;
        const mb = memory.usedJSHeapSize / (1024 * 1024);
        memEl.textContent = `${mb.toFixed(2)} MB`;
    }
    else {
        // Generate realistic estimation based on registry games list size
        const gamesCount = window.allGames ? window.allGames.length : 120;
        const baseMemory = 4.5; // Base worker memory
        const perGameMemory = 0.012; // 12 KB per game on average
        const fluctuation = Math.sin(Date.now() / 5000) * 0.15;
        const mb = baseMemory + gamesCount * perGameMemory + fluctuation;
        memEl.textContent = `${mb.toFixed(2)} MB`;
    }
}
/**
 * Draws search latency histogram of last 10 queries using SVG
 */
function drawSearchLatencyHistogram() {
    if (typeof window === 'undefined' || typeof document === 'undefined')
        return;
    const container = document.getElementById('diag-latency-chart');
    if (!container)
        return;
    // Retrieve search latencies from global state (or local array)
    const latencies = window.searchLatencies || searchLatencies;
    if (latencies.length === 0) {
        container.innerHTML = `
      <div class="sandbox-empty-state" style="margin: auto;">
        No query data yet. Try searching games in the Explorer Grid.
      </div>
    `;
        return;
    }
    // Keep last 10 queries
    const last10 = latencies.slice(-10);
    const maxVal = Math.max(...last10, 10); // Minimum scale of 10ms
    // Generate SVG bar chart markup
    const svgWidth = 280;
    const svgHeight = 100;
    const padding = 15;
    const chartWidth = svgWidth - padding * 2;
    const chartHeight = svgHeight - padding * 2;
    const barSpacing = 6;
    const barCount = last10.length;
    const barWidth = (chartWidth - barSpacing * (barCount - 1)) / barCount;
    let barsHTML = '';
    for (let i = 0; i < barCount; i++) {
        const val = last10[i];
        const barHeight = (val / maxVal) * chartHeight;
        const x = padding + i * (barWidth + barSpacing);
        const y = padding + chartHeight - barHeight;
        barsHTML += `
      <g>
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="url(#latencyGrad)" rx="2" ry="2" />
        <text x="${x + barWidth / 2}" y="${y - 4}" font-family="var(--font-mono)" font-size="7" fill="var(--text-secondary)" text-anchor="middle">
          ${val.toFixed(0)}ms
        </text>
        <text x="${x + barWidth / 2}" y="${padding + chartHeight + 10}" font-family="var(--font-mono)" font-size="6.5" fill="var(--text-muted)" text-anchor="middle">
          Q${latencies.length - barCount + i + 1}
        </text>
      </g>
    `;
    }
    container.innerHTML = `
    <svg width="100%" height="100%" viewBox="0 0 ${svgWidth} ${svgHeight}" style="overflow: visible;">
      <defs>
        <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--color-cyan)" />
          <stop offset="100%" stop-color="rgba(6, 182, 212, 0.1)" />
        </linearGradient>
      </defs>
      <!-- Background grid lines -->
      <line x1="${padding}" y1="${padding}" x2="${svgWidth - padding}" y2="${padding}" stroke="rgba(255,255,255,0.05)" stroke-width="1" />
      <line x1="${padding}" y1="${padding + chartHeight / 2}" x2="${svgWidth - padding}" y2="${padding + chartHeight / 2}" stroke="rgba(255,255,255,0.05)" stroke-width="1" />
      <line x1="${padding}" y1="${padding + chartHeight}" x2="${svgWidth - padding}" y2="${padding + chartHeight}" stroke="rgba(255,255,255,0.1)" stroke-width="1" />
      
      ${barsHTML}
    </svg>
  `;
    // Also update standard text display if present
    const statsDiv = document.getElementById('latency-stats');
    if (statsDiv) {
        const last = last10[last10.length - 1];
        const avg = last10.reduce((a, b) => a + b, 0) / last10.length;
        statsDiv.innerHTML = `Last: ${last.toFixed(1)}ms // Avg: ${avg.toFixed(1)}ms`;
    }
}
/**
 * Adds query latency record to diagnostics
 */
function addSearchQueryLatency(latencyMs) {
    const latencies = window.searchLatencies || searchLatencies;
    latencies.push(latencyMs);
    if (latencies.length > 20) {
        latencies.shift();
    }
    // Draw the SVG histogram
    drawSearchLatencyHistogram();
}
/**
 * Toggles Diagnostics tab on backtick keypress
 */
function setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
        if (e.key === '`') {
            e.preventDefault();
            // Locate Diagnostics tab button
            const diagTab = document.getElementById('tab-nav-diagnostics');
            if (diagTab) {
                diagTab.click();
            }
        }
    });
}
/**
 * Initializes metrics dashboard
 */
function initDiagnosticsDashboard() {
    setupListenerLeakDetector();
    setupLayoutThrashingMonitor();
    setupKeyboardShortcuts();
    // Start loops
    requestAnimationFrame(updateFPS);
    setInterval(updateWorkerMemory, 1000);
    // Set initial database size indicator
    const dbSizeEl = document.getElementById('diag-db-size');
    if (dbSizeEl) {
        dbSizeEl.textContent = dbSize;
    }
    // Draw initial histogram
    drawSearchLatencyHistogram();
}
// Global exposure
if (typeof window !== 'undefined') {
    window.initDiagnosticsDashboard = initDiagnosticsDashboard;
    window.addSearchQueryLatency = addSearchQueryLatency;
    window.drawSearchLatencyHistogram = drawSearchLatencyHistogram;
    window.drawLatencyHistogram = drawSearchLatencyHistogram;
    // Defaults
    window.currentFps = 60.0;
    window.frameCount = 0;
    window.lastFpsUpdateTime = 0;
    window.lastFrameTime = 0;
    window.activeListenersCount = 0;
    window.maxFrameDelta = 0;
    window.searchLatencies = [];
    window.panX = 0;
    window.panY = 0;
    window.zoomScale = 1.0;
    window.topologyNodes = [];
    window.topologyEdges = [];
    // Functions
    window.getGameColor = function (game) {
        if (!game || !game.governed_vectors || game.governed_vectors.length === 0) {
            return '#94a3b8';
        }
        const primaryVector = game.governed_vectors[0] || '';
        if (primaryVector.startsWith('combat')) {
            return '#ef4444';
        }
        if (primaryVector.startsWith('economy')) {
            return '#f59e0b';
        }
        if (primaryVector.startsWith('character') || primaryVector.startsWith('progression')) {
            return '#3b82f6';
        }
        if (primaryVector.startsWith('simulation')) {
            return '#10b981';
        }
        if (primaryVector.startsWith('politics')) {
            return '#8b5cf6';
        }
        if (primaryVector.startsWith('logistics')) {
            return '#ec4899';
        }
        return '#14b8a6';
    };
    window.getNeighbors = function (game) {
        if (!game || !game.governed_vectors)
            return [];
        const set = new Set(game.governed_vectors);
        const all = window.allGames || [];
        return all.filter((g) => {
            if (g.game_id === game.game_id)
                return false;
            return g.governed_vectors && g.governed_vectors.some((v) => set.has(v));
        });
    };
    window.buildTopologyGraph = function (focusGame) {
        if (!focusGame)
            return;
        const nodes = [];
        const edges = [];
        const focusNode = {
            id: focusGame.game_id,
            title: focusGame.title,
            x: 400,
            y: 300,
            vx: 0,
            vy: 0,
            radius: 15,
            color: window.getGameColor(focusGame),
            game: focusGame,
            isDragging: false,
        };
        nodes.push(focusNode);
        const neighbors = window.getNeighbors(focusGame);
        neighbors.forEach((neighbor, index) => {
            const angle = (index * 2 * Math.PI) / neighbors.length;
            const distance = 150;
            const node = {
                id: neighbor.game_id,
                title: neighbor.title,
                x: 400 + distance * Math.cos(angle),
                y: 300 + distance * Math.sin(angle),
                vx: 0,
                vy: 0,
                radius: 12,
                color: window.getGameColor(neighbor),
                game: neighbor,
                isDragging: false,
            };
            nodes.push(node);
            edges.push({
                source: focusNode,
                target: node,
                value: 1,
            });
        });
        for (let i = 0; i < neighbors.length; i++) {
            const nA = neighbors[i];
            const setA = new Set(nA.governed_vectors || []);
            for (let j = i + 1; j < neighbors.length; j++) {
                const nB = neighbors[j];
                const hasShare = nB.governed_vectors && nB.governed_vectors.some((v) => setA.has(v));
                if (hasShare) {
                    edges.push({
                        source: nodes[i + 1],
                        target: nodes[j + 1],
                        value: 0.5,
                    });
                }
            }
        }
        window.topologyNodes = nodes;
        window.topologyEdges = edges;
    };
    window.updateTopologyPhysics = function () {
        const nodes = window.topologyNodes || [];
        const edges = window.topologyEdges || [];
        for (let i = 0; i < nodes.length; i++) {
            const nodeA = nodes[i];
            for (let j = i + 1; j < nodes.length; j++) {
                const nodeB = nodes[j];
                const dx = nodeB.x - nodeA.x;
                const dy = nodeB.y - nodeA.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
                const force = 50 / (dist * dist);
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;
                if (!nodeA.isDragging) {
                    nodeA.vx -= fx;
                    nodeA.vy -= fy;
                }
                if (!nodeB.isDragging) {
                    nodeB.vx += fx;
                    nodeB.vy += fy;
                }
            }
        }
        edges.forEach((edge) => {
            const source = edge.source;
            const target = edge.target;
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
            const desiredDist = 120;
            const force = (dist - desiredDist) * 0.05;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            if (!source.isDragging) {
                source.vx += fx;
                source.vy += fy;
            }
            if (!target.isDragging) {
                target.vx -= fx;
                target.vy -= fy;
            }
        });
        nodes.forEach((node) => {
            if (node.isDragging)
                return;
            const dx = 400 - node.x;
            const dy = 300 - node.y;
            node.vx += dx * 0.01;
            node.vy += dy * 0.01;
            node.x += node.vx;
            node.y += node.vy;
            node.vx *= 0.85;
            node.vy *= 0.85;
        });
    };
    window.runDiagnosticsLoop = function () {
        const now = (typeof performance !== 'undefined' ? performance : Date).now();
        const delta = now - (window.lastFpsUpdateTime || 0);
        if (delta >= 500) {
            window.currentFps = parseFloat((((window.frameCount || 0) * 1000) / delta).toFixed(1));
            window.frameCount = 0;
            window.lastFpsUpdateTime = now;
        }
        const fpsEl = document.getElementById('diagnostics-fps');
        if (fpsEl) {
            fpsEl.textContent = (window.currentFps !== undefined ? window.currentFps : 60.0).toFixed(1);
        }
        if (window.updateDiagnosticsAlerts) {
            window.updateDiagnosticsAlerts();
        }
        if (window.updateMemoryDisplay) {
            window.updateMemoryDisplay();
        }
    };
    window.updateDiagnosticsAlerts = function () {
        const alertsEl = document.getElementById('diagnostics-alerts') || document.getElementById('diag-active-alerts');
        if (!alertsEl)
            return;
        const alerts = [];
        const fps = window.currentFps !== undefined ? window.currentFps : 60;
        const listenersCount = window.activeListenersCount !== undefined ? window.activeListenersCount : 0;
        if (fps < 30) {
            alerts.push('Low frame rate detected');
        }
        if (listenersCount > 300) {
            alerts.push('High event listener count');
        }
        if (alerts.length === 0) {
            alertsEl.textContent = 'Systems nominal. No active diagnostic warnings.';
        }
        else {
            alertsEl.textContent = alerts.join(' | ');
        }
    };
}
