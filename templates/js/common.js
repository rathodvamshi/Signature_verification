/**
 * ============================================
 * COMMON JAVASCRIPT - Shared across all pages
 * ============================================
 * Handles authentication, UI interactions, and animations
 */

// ============================================
// AUTH STATE MANAGEMENT
// ============================================
// ============================================
// GLOBAL SESSION GUARD (Pro Suggestion)
// ============================================
const originalFetch = window.fetch;
window.fetch = async (...args) => {
    const response = await originalFetch(...args);

    // If we get a 401 Unauthorized, and we're not on the login page or checking status
    if (response.status === 401 &&
        !window.location.pathname.includes('/login') &&
        !window.location.pathname.includes('/signup') &&
        !args[0].includes('/api/auth/status')) {

        console.warn('Session expired, redirecting to login...');
        window.location.href = '/login?session=expired&next=' + encodeURIComponent(window.location.pathname);
    }

    return response;
};

let authState = {
    isLoggedIn: false,
    user: null
};

let authCheckPromise = null;

/**
 * Check authentication status from the server
 */
const checkAuthStatus = async () => {
    if (authCheckPromise) return authCheckPromise;

    authCheckPromise = (async () => {
        try {
            const response = await fetch('/api/auth/status');
            const data = await response.json();
            authState = data;
            updateNavbar();
            return data;
        } catch (error) {
            console.error('Auth check failed:', error);
            authState = { isLoggedIn: false, user: null };
            updateNavbar();
            return authState;
        }
    })();

    return authCheckPromise;
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

    const modelsLink = `
        <li><a href="/models" class="${isActive('/models') ? 'active' : ''}"><i class="fas fa-brain"></i> Models</a></li>
    `;

    if (authState.isLoggedIn) {
        const username = authState.user?.username || 'User';
        navLinks.innerHTML = `
            <li><a href="/" class="${isActive('/') ? 'active' : ''}"><i class="fas fa-home"></i> Home</a></li>
            ${modelsLink}
            <li><a href="/verify" class="${isActive('/verify') ? 'active' : ''}"><i class="fas fa-pen-nib"></i> Verify</a></li>
            <li><a href="/history" class="${isActive('/history') ? 'active' : ''}"><i class="fas fa-clock-rotate-left"></i> History</a></li>
            <li><a href="/profile" class="${isActive('/profile') ? 'active' : ''}"><i class="fas fa-user-circle"></i> Profile</a></li>
            <li>
                <a href="/logout" class="nav-logout"><i class="fas fa-sign-out-alt"></i> Logout</a>
            </li>
        `;
    } else {
        navLinks.innerHTML = `
            <li><a href="/" class="${isActive('/') ? 'active' : ''}"><i class="fas fa-home"></i> Home</a></li>
            ${modelsLink}
            <li><a href="/login" class="${isActive('/login') ? 'active' : ''}"><i class="fas fa-sign-in-alt"></i> Login</a></li>
            <li><a href="/signup" class="${isActive('/signup') ? 'active' : ''}"><i class="fas fa-user-plus"></i> Sign Up</a></li>
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

        // Toggle dropdown on mobile click
        navLinks.addEventListener('click', (e) => {
            const dropdownToggle = e.target.closest('.nav-item-dropdown > a');
            if (dropdownToggle && window.innerWidth <= 768) {
                e.preventDefault();
                const parent = dropdownToggle.parentElement;
                parent.classList.toggle('mobile-active');
            }
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

    // Pro Tip: Make Logo Clickable globally
    const logo = document.querySelector('.navbar .logo');
    if (logo) {
        logo.style.cursor = 'pointer';
        logo.addEventListener('click', () => {
            window.location.href = '/';
        });
    }
};

// ============================================
// PAGE TRANSITION LOADER (Pro Suggestion)
// ============================================
const initPageLoader = () => {
    // Add a progress bar to the top of the page
    const progressBar = document.createElement('div');
    progressBar.id = 'page-loader-progress';
    progressBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 0;
        height: 3px;
        background: var(--gradient-primary);
        z-index: 2000;
        transition: width 0.3s ease;
    `;
    document.body.appendChild(progressBar);

    window.addEventListener('beforeunload', () => {
        progressBar.style.width = '60%';
        setTimeout(() => {
            progressBar.style.width = '100%';
        }, 500);
    });
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
 * Handle Call to Action buttons (Try Now, Get Started, etc.)
 */
const initCTAButtons = () => {
    // Only target buttons that are clearly meant to go to verification
    const ctaSelectors = [
        'a.btn-verify',
        '.hero-buttons .btn-primary',
        '.cta-section .btn'
    ];

    document.querySelectorAll(ctaSelectors.join(',')).forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (authState.isLoggedIn) {
                // If the link is to /signup or /login, redirect specifically to /verify
                if (btn.getAttribute('href')?.includes('signup') || btn.getAttribute('href')?.includes('login')) {
                    e.preventDefault();
                    window.location.href = '/verify';
                }
            } else {
                // Not logged in, redirect to login
                const href = btn.getAttribute('href');
                if (href && !href.startsWith('#') && !href.includes('login') && !href.includes('signup')) {
                    e.preventDefault();
                    window.location.href = '/login';
                }
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
    
    const icons = {
        success: '<i class="fas fa-check"></i>',
        error: '<i class="fas fa-times"></i>',
        warning: '<i class="fas fa-exclamation"></i>',
        info: '<i class="fas fa-info"></i>'
    };
    
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">${icons[type] || icons.info}</span>
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
            .toast-warning { border-color: #f59e0b; }
            .toast-warning .toast-icon { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
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

// ============================================
// PASSWORD VISIBILITY TOGGLE (Global)
// ============================================

/**
 * Toggle password visibility for an input and its eye icon
 * @param {string} inputId - ID of the password input
 * @param {HTMLElement} iconEl - The eye icon element clicked
 */
window.togglePassword = function (inputId, iconEl) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const nowText = input.type === 'password';
    input.type = nowText ? 'text' : 'password';

    if (iconEl) {
        iconEl.classList.toggle('fa-eye', !nowText);
        iconEl.classList.toggle('fa-eye-slash', nowText);
        iconEl.setAttribute('aria-pressed', nowText ? 'true' : 'false');
        iconEl.setAttribute('title', nowText ? 'Hide password' : 'Show password');
    }
};

// Delegate click/keyboard for all password toggle icons
document.addEventListener('click', (e) => {
    const icon = e.target.closest('.password-toggle');
    if (!icon) return;

    const targetId = icon.getAttribute('aria-controls') || icon.dataset.target;
    if (targetId) {
        window.togglePassword(targetId, icon);
    } else {
        // Fallback: find nearest input in wrapper
        const wrapper = icon.closest('.form-input-wrapper');
        const input = wrapper ? wrapper.querySelector('input') : null;
        if (input && input.id) {
            window.togglePassword(input.id, icon);
        }
    }
});

// Keyboard accessibility: toggle on Enter/Space
document.addEventListener('keydown', (e) => {
    const icon = e.target.closest('.password-toggle');
    if (!icon) return;
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const targetId = icon.getAttribute('aria-controls') || icon.dataset.target;
        if (targetId) window.togglePassword(targetId, icon);
    }
});

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
    initPageLoader(); // Pro Suggestion
    initMobileMenu();
    initNavbarScroll();
    initSmoothScroll();
    initScrollAnimations();
    initStats();
    initCTAButtons();

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
