/**
 * ============================================
 * HISTORY PAGE - Signature Verification History
 * ============================================
 * CSP-compliant, no inline event handlers
 */

// ============================================
// STATE MANAGEMENT
// ============================================
const HistoryState = {
    items: [],
    currentPage: 1,
    itemsPerPage: 12,
    hasMore: true,
    isLoading: false,
    filters: {
        search: '',
        date: '',
        status: 'all'
    },
    viewMode: 'grid',
    summary: { total: 0, genuine: 0, forged: 0 }
};

// DOM Cache
const DOM = {};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    cacheDOMElements();
    
    // Check auth
    const auth = await window.AppUtils?.checkAuthStatus?.();
    if (!auth?.isLoggedIn) {
        window.location.href = '/login?next=/history';
        return;
    }
    
    setupEventListeners();
    await fetchHistory(1, true);
    initAnimations();
});

function cacheDOMElements() {
    DOM.container = document.getElementById('history-container');
    DOM.statsTotal = document.getElementById('stat-total');
    DOM.statsGenuine = document.getElementById('stat-genuine');
    DOM.statsForged = document.getElementById('stat-forged');
    DOM.statsSuccessRate = document.getElementById('stat-success-rate');
    DOM.loadMoreBtn = document.getElementById('loadMoreBtn');
    DOM.loadMoreContainer = document.getElementById('loadMoreContainer');
    DOM.modal = document.getElementById('imageModal');
    DOM.modalImg = document.getElementById('modalImage');
    DOM.modalCaption = document.getElementById('modalCaption');
    DOM.searchInput = document.getElementById('historySearch');
    DOM.dateFilter = document.getElementById('dateFilter');
    DOM.statusFilter = document.getElementById('statusFilter');
    DOM.refreshBtn = document.querySelector('.btn-refresh');
    DOM.resetBtn = document.querySelector('[data-action="reset-filters"]');
    DOM.exportBtn = document.querySelector('[data-action="export"]');
}

function setupEventListeners() {
    // Filter changes
    DOM.dateFilter?.addEventListener('change', () => fetchHistory(1, true));
    DOM.statusFilter?.addEventListener('change', () => fetchHistory(1, true));
    
    // Debounced search
    let searchTimeout;
    DOM.searchInput?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        HistoryState.filters.search = e.target.value;
        searchTimeout = setTimeout(() => fetchHistory(1, true), 400);
    });
    
    // Load more
    DOM.loadMoreBtn?.addEventListener('click', () => {
        if (HistoryState.hasMore && !HistoryState.isLoading) {
            fetchHistory(HistoryState.currentPage + 1, false);
        }
    });
    
    // Modal close
    document.querySelector('.close-modal-btn')?.addEventListener('click', closeModal);
    DOM.modal?.addEventListener('click', (e) => {
        if (e.target === DOM.modal) closeModal();
    });
    
    // Keyboard
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && DOM.modal?.classList.contains('show')) closeModal();
    });
    
    // View mode buttons
    document.querySelectorAll('.view-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => setViewMode(btn.dataset.mode));
    });
    
    // Refresh button
    DOM.refreshBtn?.addEventListener('click', () => {
        fetchHistory(1, true);
        window.AppUtils?.showToast?.('History refreshed', 'info');
    });
    
    // Reset filters button
    document.querySelectorAll('.btn-ghost').forEach(btn => {
        if (btn.querySelector('.fa-undo')) {
            btn.addEventListener('click', resetFilters);
        }
    });
    
    // Export button
    document.querySelectorAll('.btn-export').forEach(btn => {
        btn.addEventListener('click', exportHistoryCSV);
    });
    
    // Event delegation for history container
    DOM.container?.addEventListener('click', handleContainerClick);
}

// ============================================
// EVENT DELEGATION
// ============================================
function handleContainerClick(e) {
    const target = e.target;
    
    // View button clicked
    const viewBtn = target.closest('.view-btn');
    if (viewBtn && !viewBtn.disabled) {
        const card = viewBtn.closest('.history-card, .timeline-item');
        if (card) {
            const id = card.dataset.id || card.id.replace('card-', '');
            const item = HistoryState.items.find(i => i._id === id);
            if (item?.imagePath) {
                openImageModal(item.imagePath, item.verifiedFor);
            } else {
                window.AppUtils?.showToast?.('Image not available', 'warning');
            }
        }
        return;
    }
    
    // Delete button clicked
    const deleteBtn = target.closest('.delete-btn');
    if (deleteBtn) {
        const card = deleteBtn.closest('.history-card, .timeline-item');
        if (card) {
            const id = card.dataset.id || card.id.replace('card-', '');
            deleteHistory(id);
        }
        return;
    }
    
    // Timeline view/delete links
    const btnLink = target.closest('.btn-link');
    if (btnLink) {
        const card = btnLink.closest('.timeline-item');
        if (card) {
            const id = card.id.replace('card-', '');
            const item = HistoryState.items.find(i => i._id === id);
            
            if (btnLink.classList.contains('danger')) {
                deleteHistory(id);
            } else if (item?.imagePath) {
                openImageModal(item.imagePath, item.verifiedFor);
            } else {
                window.AppUtils?.showToast?.('Image not available', 'warning');
            }
        }
        return;
    }
    
    // Image thumbnail clicked
    const thumb = target.closest('.history-thumb');
    if (thumb && !thumb.classList.contains('placeholder')) {
        const card = thumb.closest('.history-card');
        if (card) {
            const id = card.dataset.id;
            const item = HistoryState.items.find(i => i._id === id);
            if (item?.imagePath) {
                openImageModal(item.imagePath, item.verifiedFor);
            }
        }
        return;
    }
}

// ============================================
// DATA FETCHING
// ============================================
async function fetchHistory(page = 1, isNewSearch = false) {
    if (HistoryState.isLoading) return;
    
    try {
        HistoryState.isLoading = true;
        
        if (isNewSearch) {
            HistoryState.currentPage = 1;
            HistoryState.items = [];
            showLoadingState();
        }
        
        const url = new URL('/api/verify/history', window.location.origin);
        url.searchParams.set('page', page);
        url.searchParams.set('limit', HistoryState.itemsPerPage);
        
        if (HistoryState.filters.search) url.searchParams.set('search', HistoryState.filters.search);
        if (DOM.dateFilter?.value) url.searchParams.set('date', DOM.dateFilter.value);
        if (DOM.statusFilter?.value && DOM.statusFilter.value !== 'all') {
            url.searchParams.set('status', DOM.statusFilter.value);
        }
        
        const response = await fetch(url, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch');
        
        const data = await response.json();
        
        HistoryState.items = isNewSearch ? data.records : [...HistoryState.items, ...data.records];
        HistoryState.currentPage = page;
        HistoryState.hasMore = HistoryState.items.length < data.total;
        
        if (data.summary) {
            HistoryState.summary = data.summary;
            updateStatsDisplay(data.summary);
        }
        
        renderHistory();
        updateLoadMoreButton();
        
    } catch (error) {
        console.error('History fetch error:', error);
        showErrorState();
    } finally {
        HistoryState.isLoading = false;
    }
}

// ============================================
// RENDERING
// ============================================
function renderHistory() {
    if (!DOM.container) return;
    
    if (HistoryState.items.length === 0) {
        showEmptyState();
        return;
    }
    
    DOM.container.className = `history-${HistoryState.viewMode}`;
    
    if (HistoryState.viewMode === 'timeline') {
        renderTimelineView();
    } else {
        DOM.container.innerHTML = HistoryState.items.map(item => createHistoryCard(item)).join('');
    }
    
    // Handle image errors after render
    DOM.container.querySelectorAll('.history-thumb img').forEach(img => {
        img.addEventListener('error', function() {
            this.parentElement.classList.add('placeholder');
            this.parentElement.innerHTML = '<i class="fas fa-image"></i>';
        });
    });
}

function createHistoryCard(item) {
    const isGenuine = item.label?.toLowerCase().includes('genuine');
    const statusClass = isGenuine ? 'status-valid' : 'status-invalid';
    const statusIcon = isGenuine ? 'fa-check-circle' : 'fa-times-circle';
    const { date, time } = formatDateTime(item.timestamp || item.createdAt);
    const confidence = item.confidence || 0;
    const confColor = isGenuine ? '#10b981' : '#ef4444';
    
    const imageHtml = item.imagePath
        ? `<div class="history-thumb" title="Click to preview">
             <img src="${esc(item.imagePath)}" alt="Signature" loading="lazy">
           </div>`
        : `<div class="history-thumb placeholder"><i class="fas fa-file-signature"></i></div>`;
    
    return `
        <div class="history-card" id="card-${item._id}" data-id="${item._id}">
            <div class="history-image-container">${imageHtml}</div>
            
            <div class="history-content">
                <div class="history-info">
                    <span class="history-label">Verified For</span>
                    <h3 class="verified-name">${esc(item.verifiedFor || 'Unknown')}</h3>
                    <div class="history-meta">
                        <span><i class="fas fa-calendar"></i> ${date}</span>
                        <span><i class="fas fa-clock"></i> ${time}</span>
                    </div>
                </div>
                
                <div class="history-result">
                    <div class="status-badge ${statusClass}">
                        <i class="fas ${statusIcon}"></i>
                        <span>${esc(item.label)}</span>
                    </div>
                    <div class="confidence-wrapper">
                        <div class="confidence-info">
                            <span>Confidence</span>
                            <span class="confidence-value">${confidence.toFixed(1)}%</span>
                        </div>
                        <div class="confidence-bar-bg">
                            <div class="confidence-bar-fill" style="width: ${confidence}%; background: ${confColor}"></div>
                        </div>
                    </div>
                </div>
                
                <div class="card-actions">
                    <button class="action-btn view-btn" title="View signature" ${!item.imagePath ? 'disabled' : ''}>
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn delete-btn" title="Delete">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderTimelineView() {
    const grouped = {};
    HistoryState.items.forEach(item => {
        const { date } = formatDateTime(item.timestamp || item.createdAt);
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(item);
    });
    
    let html = '';
    for (const [date, items] of Object.entries(grouped)) {
        html += `
            <div class="timeline-group">
                <div class="timeline-date"><i class="fas fa-calendar-day"></i> ${date}</div>
                <div class="timeline-items">
                    ${items.map(item => {
                        const isGenuine = item.label?.toLowerCase().includes('genuine');
                        const { time } = formatDateTime(item.timestamp || item.createdAt);
                        return `
                            <div class="timeline-item ${isGenuine ? 'genuine' : 'forged'}" id="card-${item._id}" data-id="${item._id}">
                                <div class="timeline-marker"><i class="fas ${isGenuine ? 'fa-check' : 'fa-times'}"></i></div>
                                <div class="timeline-content">
                                    <div class="timeline-header">
                                        <strong>${esc(item.verifiedFor || 'Unknown')}</strong>
                                        <span class="timeline-time">${time}</span>
                                    </div>
                                    <div class="timeline-body">
                                        <span class="status-pill ${isGenuine ? 'genuine' : 'forged'}">${esc(item.label)}</span>
                                        <span class="confidence-pill">${(item.confidence || 0).toFixed(1)}%</span>
                                    </div>
                                    <div class="timeline-actions">
                                        <button class="btn-link view-btn" ${!item.imagePath ? 'disabled' : ''}>
                                            <i class="fas fa-image"></i> View
                                        </button>
                                        <button class="btn-link danger delete-btn">
                                            <i class="fas fa-trash"></i> Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
    DOM.container.innerHTML = html;
}

// ============================================
// STATS DISPLAY
// ============================================
function updateStatsDisplay(summary) {
    animateStatValue(DOM.statsTotal, summary.total || 0);
    animateStatValue(DOM.statsGenuine, summary.genuine || 0);
    animateStatValue(DOM.statsForged, summary.forged || 0);
    
    if (DOM.statsSuccessRate) {
        const rate = summary.total > 0 
            ? ((summary.genuine / summary.total) * 100).toFixed(1) 
            : 0;
        DOM.statsSuccessRate.textContent = `${rate}%`;
    }
}

function animateStatValue(el, target) {
    if (!el) return;
    const start = parseInt(el.textContent) || 0;
    const duration = 600;
    const startTime = performance.now();
    
    const animate = (now) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(start + (target - start) * ease);
        if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
}

// ============================================
// ACTIONS
// ============================================
async function deleteHistory(id) {
    const confirmed = await window.AppUtils?.showConfirmModal?.(
        'Delete Record?',
        'This will permanently delete this verification record.',
        'Delete', 'danger'
    );
    if (!confirmed) return;
    
    const card = document.getElementById(`card-${id}`);
    card?.classList.add('deleting');
    
    try {
        const res = await fetch(`/api/verify/history/${id}`, { 
            method: 'DELETE', 
            credentials: 'include' 
        });
        if (!res.ok) throw new Error('Delete failed');
        
        // Update local state
        HistoryState.items = HistoryState.items.filter(i => i._id !== id);
        
        // Update summary
        if (HistoryState.summary.total > 0) {
            HistoryState.summary.total--;
        }
        
        // Animate and remove card
        if (card) {
            card.style.transform = 'scale(0.9) translateX(30px)';
            card.style.opacity = '0';
            setTimeout(() => {
                card.remove();
                if (HistoryState.items.length === 0) {
                    showEmptyState();
                }
                updateStatsDisplay(HistoryState.summary);
            }, 300);
        }
        
        window.AppUtils?.showToast?.('Record deleted successfully', 'success');
        
    } catch (e) {
        console.error(e);
        window.AppUtils?.showToast?.('Failed to delete record', 'error');
        card?.classList.remove('deleting');
    }
}

function exportHistoryCSV() {
    const items = HistoryState.items;
    
    if (!items.length) {
        window.AppUtils?.showToast?.('No records to export', 'warning');
        return;
    }
    
    const headers = ['Date', 'Time', 'Verified For', 'Result', 'Confidence (%)'];
    const rows = items.map(item => {
        const { date, time } = formatDateTime(item.timestamp || item.createdAt);
        return [
            date, 
            time, 
            `"${(item.verifiedFor || '').replace(/"/g, '""')}"`, 
            item.label, 
            item.confidence?.toFixed(2) || 0
        ].join(',');
    });
    
    const csv = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `SignatureVerify_History_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    window.AppUtils?.showToast?.(`Exported ${items.length} records`, 'success');
}

function resetFilters() {
    if (DOM.searchInput) DOM.searchInput.value = '';
    if (DOM.dateFilter) DOM.dateFilter.value = '';
    if (DOM.statusFilter) DOM.statusFilter.value = 'all';
    HistoryState.filters = { search: '', date: '', status: 'all' };
    fetchHistory(1, true);
    window.AppUtils?.showToast?.('Filters reset', 'info');
}

// ============================================
// VIEW MODE
// ============================================
function setViewMode(mode) {
    HistoryState.viewMode = mode;
    document.querySelectorAll('.view-mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    renderHistory();
    localStorage.setItem('historyViewMode', mode);
}

// ============================================
// MODAL
// ============================================
function openImageModal(src, name) {
    if (!src) {
        window.AppUtils?.showToast?.('Image not available', 'warning');
        return;
    }
    if (!DOM.modal) return;
    
    DOM.modal.style.display = 'flex';
    requestAnimationFrame(() => DOM.modal.classList.add('show'));
    
    if (DOM.modalImg) {
        DOM.modalImg.style.display = 'block';
        DOM.modalImg.src = src;
    }
    if (DOM.modalCaption) {
        DOM.modalCaption.innerHTML = `<strong>Verified For:</strong> ${esc(name || 'Unknown')}`;
    }
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    if (!DOM.modal) return;
    DOM.modal.classList.remove('show');
    setTimeout(() => {
        DOM.modal.style.display = 'none';
        document.body.style.overflow = '';
        if (DOM.modalImg) DOM.modalImg.src = '';
    }, 300);
}

// ============================================
// UI STATES
// ============================================
function showLoadingState() {
    if (DOM.container) {
        DOM.container.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading history...</p>
            </div>
        `;
    }
}

function showEmptyState() {
    if (DOM.container) {
        DOM.container.innerHTML = `
            <div class="history-empty">
                <div class="empty-icon"><i class="fas fa-folder-open"></i></div>
                <h3>No Records Found</h3>
                <p>Verify signatures to see your history here.</p>
                <a href="/verify" class="btn btn-primary"><i class="fas fa-pen-nib"></i> Verify Signature</a>
            </div>
        `;
    }
}

function showErrorState() {
    if (DOM.container) {
        DOM.container.innerHTML = `
            <div class="history-empty error">
                <div class="empty-icon"><i class="fas fa-exclamation-triangle"></i></div>
                <h3>Failed to Load</h3>
                <p>Could not load verification history.</p>
                <button class="btn btn-primary retry-btn"><i class="fas fa-sync"></i> Retry</button>
            </div>
        `;
        // Add retry listener
        DOM.container.querySelector('.retry-btn')?.addEventListener('click', () => fetchHistory(1, true));
    }
}

function updateLoadMoreButton() {
    if (DOM.loadMoreContainer) {
        DOM.loadMoreContainer.style.display = HistoryState.hasMore ? 'flex' : 'none';
    }
}

// ============================================
// UTILITIES
// ============================================
function formatDateTime(ts) {
    const d = new Date(ts);
    return {
        date: d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
        time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    };
}

function esc(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function initAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(e => e.isIntersecting && e.target.classList.add('in-view'));
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
    
    // Load saved view mode
    const saved = localStorage.getItem('historyViewMode');
    if (saved) setViewMode(saved);
}
