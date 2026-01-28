document.addEventListener('DOMContentLoaded', async () => {
    const historyContainer = document.getElementById('history-container');
    let allHistoryItems = []; // Store all fetched items for filtering

    // Check auth and fetch data
    setTimeout(async () => {
        const status = window.AppUtils?.authState || await window.AppUtils?.checkAuthStatus();
        if (!status?.isLoggedIn) {
            window.location.href = '/login';
            return;
        }

        fetchHistory();
    }, 100);

    // Setup Event Listeners for Filters
    document.getElementById('dateFilter').addEventListener('change', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);

    async function fetchHistory() {
        try {
            const response = await fetch('/verification-history');
            if (response.ok) {
                allHistoryItems = await response.json();
                applyFilters(); // Render with current filters (default: all)
            } else {
                throw new Error('Failed to fetch history');
            }
        } catch (error) {
            console.error('History Error:', error);
            historyContainer.innerHTML = `
                <div class="history-empty">
                    <i class="fas fa-exclamation-circle" style="color: var(--error-color)"></i>
                    <h3>Failed to load history</h3>
                    <p>Please try refreshing the page</p>
                </div>
            `;
        }
    }

    // Filter Logic
    function applyFilters() {
        const dateValue = document.getElementById('dateFilter').value;
        const statusValue = document.getElementById('statusFilter').value;

        let filteredItems = allHistoryItems;

        // Filter by Date
        if (dateValue) {
            const filterDate = new Date(dateValue).toDateString();
            filteredItems = filteredItems.filter(item => {
                const itemDate = new Date(item.timestamp || item.createdAt).toDateString();
                return itemDate === filterDate;
            });
        }

        // Filter by Status
        if (statusValue !== 'all') {
            filteredItems = filteredItems.filter(item => {
                const isGenuine = item.label.toLowerCase().includes('genuine');
                if (statusValue === 'genuine') return isGenuine;
                if (statusValue === 'forged') return !isGenuine;
                return true;
            });
        }

        renderHistory(filteredItems);
    }

    // Expose reset function
    window.resetFilters = () => {
        document.getElementById('dateFilter').value = '';
        document.getElementById('statusFilter').value = 'all';
        applyFilters();
    };

    function renderHistory(items) {
        if (!items || items.length === 0) {
            historyContainer.innerHTML = `
                <div class="history-empty">
                    <i class="fas fa-folder-open"></i>
                    <h3>No Records Found</h3>
                    <p>Try adjusting your filters or verify a signature to see it here.</p>
                </div>
            `;
            return;
        }

        historyContainer.innerHTML = items.map(item => {
            const isGenuine = item.label.toLowerCase().includes('genuine');
            const statusClass = isGenuine ? 'status-valid' : 'status-invalid';
            const statusIcon = isGenuine ? 'fa-check-circle' : 'fa-times-circle';
            const dateObj = new Date(item.timestamp || item.createdAt);
            const date = dateObj.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
            const time = dateObj.toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit'
            });

            // Use imagePath if available, else standard icon
            // Debugging: We add a title attribute to hover and see the path if it fails
            const imageHtml = item.imagePath
                ? `<div class="history-image-container">
                     <span class="image-label">Uploaded Signature</span>
                     <div class="history-thumb" onclick="openImageModal('${item.imagePath}', 'Verified for: ${escapeHtml(item.verifiedFor)}')" title="Click to expand">
                        <img src="${item.imagePath}" alt="Signature" loading="lazy" 
                            onerror="console.error('Failed to load image at: ${item.imagePath}'); this.parentElement.classList.add('placeholder'); this.parentElement.innerHTML='<i class=\\'fas fa-image\\'></i>';">
                     </div>
                   </div>`
                : `<div class="history-image-container">
                     <span class="image-label">No Image</span>
                     <div class="history-thumb placeholder"><i class="fas fa-file-signature"></i></div>
                   </div>`;

            return `
                <div class="history-card" id="card-${item._id}">
                    ${imageHtml}
                    <div class="history-content">
                        <div class="history-info">
                            <div class="history-title">
                                Verified against: <span class="highlight">${escapeHtml(item.verifiedFor || 'Unknown')}</span>
                            </div>
                            <div class="history-meta">
                                <span><i class="fas fa-calendar"></i> ${date}</span>
                                <span><i class="fas fa-clock"></i> ${time}</span>
                            </div>
                         
                        </div>
                        
                        <div class="history-status">
                             <div class="status-badge ${statusClass}">
                                <i class="fas ${statusIcon}"></i>
                                ${escapeHtml(item.label)}
                            </div>
                            <div class="confidence-score">
                                ${item.confidence.toFixed(2)}% Confidence
                            </div>
                        </div>

                         <button class="delete-btn" onclick="deleteHistory('${item._id}')" aria-label="Delete Record" title="Delete record">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Modal Handling
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("modalImage");
    const captionText = document.getElementById("modalCaption");
    const closeBtn = document.querySelector(".close-modal-btn");

    window.openImageModal = (src, caption) => {
        if (!modal) return;

        modal.style.display = "flex";

        // Small delay for CSS transition to trigger opacity change
        setTimeout(() => {
            modal.classList.add("show");
        }, 10);

        modalImg.src = src;
        captionText.innerHTML = caption;
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    };

    function closeModal() {
        if (!modal) return;

        modal.classList.remove("show");
        setTimeout(() => {
            modal.style.display = "none";
            document.body.style.overflow = 'auto'; // Restore scrolling
            modalImg.src = "";
        }, 300); // Wait for transition
    }

    // Close events
    if (closeBtn) {
        closeBtn.onclick = closeModal;
    }

    if (modal) {
        modal.onclick = (e) => {
            if (e.target === modal) {
                closeModal();
            }
        };
    }

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            closeModal();
        }
    });

    // Expose delete function to global scope
    window.deleteHistory = async (id) => {
        const confirmed = await window.AppUtils?.showConfirmModal(
            'Delete Record?',
            'Are you sure you want to delete this verification record? This action cannot be undone.',
            'Delete',
            'danger'
        );

        if (!confirmed) return;

        const card = document.getElementById(`card-${id}`);
        if (card) {
            card.style.opacity = '0.5';
            card.style.pointerEvents = 'none';
        }

        try {
            const res = await fetch(`/api/history/${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                // Remove element smoothy
                if (card) {
                    card.style.transform = 'translateX(20px)';
                    card.style.opacity = '0';
                    setTimeout(() => {
                        card.remove();
                        // If no items left, show empty state (reload for simplicity)
                        if (document.querySelectorAll('.history-card').length === 0) {
                            window.location.reload();
                        }
                    }, 300);
                }

                // Show notification
                window.AppUtils?.showToast && window.AppUtils.showToast('Record deleted', 'success');

            } else {
                throw new Error('Failed to delete');
            }
        } catch (error) {
            console.error('Delete error:', error);
            window.AppUtils?.showToast && window.AppUtils.showToast('Failed to delete record', 'error');
            if (card) {
                card.style.opacity = '1';
                card.style.pointerEvents = 'auto';
            }
        }
    }

    function escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});
