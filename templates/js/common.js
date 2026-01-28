/**
 * ============================================
 * COMMON JAVASCRIPT - Shared across all pages
 * ============================================
 * Handles authentication, UI interactions, and animations
 */

// ============================================
// AUTH STATE MANAGEMENT
// ============================================
let authState = {
    isLoggedIn: false,
    user: null
};

/**
 * Check authentication status from the server
 */
const checkAuthStatus = async () => {
    try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        authState = data;
        updateNavbar();
        return data;
    } catch (error) {
        console.error('Auth check failed:', error);
        return { isLoggedIn: false };
    }
};

/**
 * Update the navigation bar based on auth state
 */
const updateNavbar = () => {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;

    const currentPath = window.location.pathname;

    const isActive = (path) => {
        if (path === '/' || path === '/index.html') {
            return currentPath === '/' || currentPath.includes('index');
        }
        return currentPath.includes(path.replace('.html', '').replace('/', ''));
    };

    if (authState.isLoggedIn) {
        navLinks.innerHTML = `
            <li><a href="/" class="${isActive('/') ? 'active' : ''}">Home</a></li>
            <li><a href="/verify" class="${isActive('/verify') ? 'active' : ''}">Verify</a></li>
            <li><a href="/history" class="${isActive('/history') ? 'active' : ''}">History</a></li>
            <li><a href="/profile" class="${isActive('/profile') ? 'active' : ''}">Profile</a></li>
            <li>
                <a href="/api/auth/logout" class="nav-logout">
                     Logout
                </a>
            </li>
        `;
    } else {
        navLinks.innerHTML = `
            <li><a href="/" class="${isActive('/') ? 'active' : ''}">Home</a></li>
            <li><a href="/#features">Features</a></li>
            <li><a href="/login" class="${isActive('/login') ? 'active' : ''}">Login</a></li>
            <li><a href="/signup" class="${isActive('/signup') ? 'active' : ''}">Sign Up</a></li>
        `;
    }

    const menuToggle = document.querySelector('.menu-toggle');
    if (menuToggle && window.innerWidth <= 768) {
        const links = navLinks.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                menuToggle.classList.remove('active');
            });
        });
    }
};

// ============================================
// MOBILE MENU
// ============================================
const initMobileMenu = () => {
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navLinks.classList.toggle('active');
            menuToggle.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (navLinks.classList.contains('active') &&
                !navLinks.contains(e.target) &&
                !menuToggle.contains(e.target)) {
                navLinks.classList.remove('active');
                menuToggle.classList.remove('active');
            }
        });
    }
};

// ============================================
// UI INTERACTIONS & ANIMATIONS
// ============================================

const initScrollAnimations = () => {
    const observerOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const selector = '.use-case-card, .step-item, .hero-text, .hero-image, .cta-content, .profile-card, .verify-card, .section-header, .stat-item, .prototype-container';
    const animatedElements = document.querySelectorAll(selector);

    animatedElements.forEach((el, index) => {
        el.classList.add('animate-on-scroll');
        if (el.classList.contains('use-case-card') || el.classList.contains('step-item')) {
            const siblings = Array.from(el.parentNode.children);
            const relativeIndex = siblings.indexOf(el);
            el.style.transitionDelay = `${relativeIndex * 0.1}s`;
        }
        observer.observe(el);
    });
};

const initNavbarScroll = () => {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
};

const initSmoothScroll = () => {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const headerOffset = 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth"
                });
            }
        });
    });
};

/**
 * Fetch global verification stats
 */
const updateGlobalStats = async () => {
    const statsEl = document.getElementById('total-analyses-done');
    if (!statsEl) return;

    try {
        const response = await fetch('/api/stats');
        const data = await response.json();

        // Animate counter
        const total = data.totalVerifications || 0;
        const currentNum = parseInt(statsEl.textContent) || 0;

        if (total > 0) {
            statsEl.textContent = total.toLocaleString() + '+';
        }
    } catch (error) {
        console.error('Failed to fetch stats:', error);
    }
};

// ============================================
// HELPERS
// ============================================

const showToast = (message, type = 'info') => {
    document.querySelectorAll('.toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">
                ${type === 'success' ? '<i class="fas fa-check"></i>' :
            type === 'error' ? '<i class="fas fa-times"></i>' :
                '<i class="fas fa-info"></i>'}
            </span>
            <span class="toast-message">${message}</span>
        </div>
    `;

    if (!document.getElementById('toast-styles')) {
        const styles = document.createElement('style');
        styles.id = 'toast-styles';
        styles.textContent = `
            .toast {
                position: fixed;
                bottom: 24px;
                right: 24px;
                background: white;
                color: #1e293b;
                padding: 16px 20px;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.15);
                z-index: 10000;
                animation: slideInToast 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                border-left: 4px solid;
                max-width: 350px;
            }
            .toast-content {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .toast-icon {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                font-size: 12px;
            }
            .toast-success { border-color: #22c55e; }
            .toast-success .toast-icon { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
            .toast-error { border-color: #ef4444; }
            .toast-error .toast-icon { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
            .toast-info { border-color: #6366f1; }
            .toast-info .toast-icon { background: rgba(99, 102, 241, 0.1); color: #6366f1; }
            @keyframes slideInToast {
                from { opacity: 0; transform: translateY(20px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes fadeOutToast {
                to { opacity: 0; transform: translateY(10px) scale(0.95); }
            }
        `;
        document.head.appendChild(styles);
    }

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOutToast 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
};

const setLoading = (button, isLoading) => {
    if (!button) return;

    if (isLoading) {
        button.dataset.originalContent = button.innerHTML;
        button.innerHTML = `<span class="spinner"></span> Processing...`;
        button.disabled = true;
        button.style.opacity = '0.8';
        button.style.cursor = 'wait';
    } else {
        button.innerHTML = button.dataset.originalContent || button.innerHTML;
        button.disabled = false;
        button.style.opacity = '';
        button.style.cursor = '';
    }
};

/**
 * Fetch and animate global stats
 */
const initStats = async () => {
    const statsEl = document.getElementById('total-analyses-done');
    if (!statsEl) return;

    try {
        const response = await fetch('/api/stats');
        const data = await response.json();

        if (data && typeof data.totalVerifications === 'number') {
            const finalValue = data.totalVerifications;
            animateValue(statsEl, 0, finalValue, 1500);
        }
    } catch (error) {
        console.error('Failed to fetch stats:', error);
        statsEl.textContent = '250k+'; // Fallback
    }
};

/**
 * Animate numeric value change
 */
const animateValue = (obj, start, end, duration) => {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const value = Math.floor(progress * (end - start) + start);
        obj.innerHTML = value.toLocaleString();
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
};

// ============================================
// MODALS
// ============================================

const showConfirmModal = (title, message, confirmText = 'Confirm', type = 'danger') => {
    return new Promise((resolve) => {
        const existing = document.getElementById('confirm-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'confirm-modal';
        modal.className = 'confirm-modal';

        const btnClass = type === 'danger' ? 'btn-danger' : 'btn-primary';

        modal.innerHTML = `
            <div class="confirm-card">
                <div class="confirm-icon ${type}">
                    <i class="fas ${type === 'danger' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
                </div>
                <h3>${title}</h3>
                <p>${message}</p>
                <div class="confirm-actions">
                    <button class="btn btn-secondary" id="confirm-cancel">Cancel</button>
                    <button class="btn ${btnClass}" id="confirm-ok">${confirmText}</button>
                </div>
            </div>
        `;

        if (!document.getElementById('confirm-styles')) {
            const styles = document.createElement('style');
            styles.id = 'confirm-styles';
            styles.textContent = `
                .confirm-modal {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.6);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    opacity: 0;
                    animation: fadeInModal 0.2s forwards;
                }
                .confirm-card {
                    background: #fff;
                    border-radius: 20px;
                    padding: 2rem;
                    width: 90%;
                    max-width: 400px;
                    text-align: center;
                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
                    transform: scale(0.95);
                    animation: scaleInModal 0.3s forwards;
                    border: 1px solid #eee;
                }
                .confirm-icon {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1.5rem;
                }
                .confirm-icon.danger { background: #fee2e2; color: #ef4444; }
                .confirm-actions { display: flex; gap: 1rem; justify-content: center; }
                .btn-danger { background: #ef4444; color: white; }
                @keyframes fadeInModal { to { opacity: 1; } }
                @keyframes scaleInModal { to { transform: scale(1); } }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(modal);

        const okBtn = document.getElementById('confirm-ok');
        const cancelBtn = document.getElementById('confirm-cancel');

        const close = (result) => {
            modal.style.opacity = '0';
            setTimeout(() => modal.remove(), 200);
            resolve(result);
        };

        okBtn.onclick = () => close(true);
        cancelBtn.onclick = () => close(false);
        modal.onclick = (e) => { if (e.target === modal) close(false); };
    });
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuthStatus();
    initMobileMenu();
    initNavbarScroll();
    initSmoothScroll();
    initScrollAnimations();
    initStats();

    document.body.addEventListener('click', async (e) => {
        const logoutLink = e.target.closest('a[href*="/logout"]');
        if (logoutLink) {
            e.preventDefault();
            e.stopImmediatePropagation();
            const confirmed = await showConfirmModal('Logout?', 'Are you sure?', 'Logout');
            if (confirmed) window.location.href = logoutLink.href;
        }
    }, true);
});

window.AppUtils = {
    checkAuthStatus,
    showToast,
    setLoading,
    showConfirmModal,
    get authState() { return authState; }
};
