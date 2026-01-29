/**
 * ============================================
 * PROFILE DASHBOARD - DEBUG & TEST UTILITIES
 * ============================================
 */

// Add to browser console for testing:

// 1. Check if profile.js is loaded
console.log('Profile.js loaded:', typeof fetchUserDetails !== 'undefined');

// 2. Test API endpoint directly
async function testAPI() {
    try {
        const response = await fetch('/api/verify/history');
        const data = await response.json();
        console.log('API Response:', data);
        console.log('Verifications count:', data.verifications?.length);
        return data;
    } catch (error) {
        console.error('API Error:', error);
    }
}

// 3. Check DOM elements
function checkElements() {
    const elements = {
        totalVerifications: document.getElementById('total-verifications'),
        authenticCount: document.getElementById('authentic-count'),
        forgedCount: document.getElementById('forged-count'),
        recentActivity: document.getElementById('recent-activity'),
        username: document.getElementById('username'),
        email: document.getElementById('email')
    };

    console.log('DOM Elements Check:');
    Object.entries(elements).forEach(([key, el]) => {
        console.log(`  ${key}:`, el ? '✅ Found' : '❌ Missing');
    });

    return elements;
}

// 4. Force refresh dashboard
async function refreshDashboard() {
    console.log('🔄 Force refreshing dashboard...');

    // Clear cache
    if (typeof verificationsCache !== 'undefined') {
        verificationsCache = null;
    }

    // Reload page
    window.location.reload();
}

// 5. Manual data update (for testing)
function updateStats(total, authentic, forged) {
    const totalEl = document.getElementById('total-verifications');
    const authEl = document.getElementById('authentic-count');
    const forgEl = document.getElementById('forged-count');

    if (totalEl) totalEl.textContent = total;
    if (authEl) authEl.textContent = authentic;
    if (forgEl) forgEl.textContent = forged;

    console.log(`Updated stats: Total=${total}, Auth=${authentic}, Forged=${forged}`);
}

// Quick test commands
console.log(`
╔═══════════════════════════════════════════╗
║   PROFILE DEBUG UTILITIES LOADED          ║
╠═══════════════════════════════════════════╣
║ Commands:                                 ║
║  • testAPI()        - Test API endpoint   ║
║  • checkElements()  - Check DOM elements  ║
║  • refreshDashboard() - Force refresh     ║
║  • updateStats(t,a,f) - Manual update     ║
╚═══════════════════════════════════════════╝
`);
