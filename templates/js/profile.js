/**
 * ============================================
 * PROFILE DASHBOARD CONTROLLER
 * ============================================
 */

document.addEventListener('DOMContentLoaded', async () => {
    // DOM Elements
    const elements = {
        profilePic: document.getElementById('profile-pic'),
        username: document.getElementById('username'),
        email: document.getElementById('email'),
        age: document.getElementById('age'),
        college: document.getElementById('college'),
        bio: document.getElementById('bio'),
        totalVerifications: document.getElementById('total-verifications'),
        authenticCount: document.getElementById('authentic-count'),
        forgedCount: document.getElementById('forged-count'),
        recentActivity: document.getElementById('recent-activity'),
        editBtn: document.getElementById('edit-profile'),
        logoutBtn: document.getElementById('logout'),
        editPopup: document.getElementById('edit-popup'),
        closePopup: document.getElementById('close-popup'),
        updateBtn: document.getElementById('update-details'),
        editProfileImage: document.getElementById('edit-profile-image'),
        editEmail: document.getElementById('edit-email'),
        editAge: document.getElementById('edit-age'),
        editCollege: document.getElementById('edit-college'),
        editBio: document.getElementById('edit-bio')
    };

    /**
     * Fetch and display user profile details
     */
    const fetchUserDetails = async () => {
        try {
            console.log('[PROFILE] Fetching user details...');
            const response = await fetch('/api/user/profile');

            if (response.status === 401) {
                console.warn('[PROFILE] Unauthorized access. Redirecting to login.');
                window.location.href = '/login';
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch user details');
            }

            const user = await response.json();
            console.log('[PROFILE] User data loaded:', user.username);

            // Populate profile fields
            if (elements.username) elements.username.textContent = user.username || 'User';
            if (elements.email) elements.email.textContent = user.email || 'email@example.com';
            if (elements.age) elements.age.textContent = user.age || '--';
            if (elements.college) elements.college.textContent = user.college || 'Not provided';
            if (elements.bio) elements.bio.textContent = user.bio || 'Tell us about yourself...';

            // Update Profile Picture
            if (elements.profilePic && user.profileImage) {
                elements.profilePic.src = user.profileImage;
            }

            // Update member badge if available
            if (user.createdAt) {
                const joinDate = new Date(user.createdAt).toLocaleDateString(undefined, {
                    month: 'long', year: 'numeric'
                });
                const badge = document.querySelector('.badge-premium');
                if (badge) {
                    badge.title = `Member since ${joinDate}`;
                }
            }

        } catch (error) {
            console.error('[PROFILE] Error fetching user details:', error);
            if (window.AppUtils) {
                window.AppUtils.showToast('Failed to load profile data', 'error');
            }
        }
    };

    // Shared verification data cache
    let verificationsCache = null;

    /**
     * Fetch verification data (cached)
     */
    const fetchVerificationData = async () => {
        try {
            console.log('[PROFILE] Fetching verification data from API...');
            const response = await fetch('/api/verify/history');

            if (!response.ok) {
                throw new Error(`API responded with status ${response.status}`);
            }

            const data = await response.json();
            console.log('[PROFILE] Raw API response:', data);

            // API returns 'records' not 'verifications'
            verificationsCache = data.records || data.verifications || [];

            console.log(`[PROFILE] ✅ Loaded ${verificationsCache.length} verifications from API.`);
            console.log('[PROFILE] Sample record:', verificationsCache[0]);

            if (verificationsCache.length === 0) {
                console.warn('[PROFILE] ⚠️ No verification records found in database.');
            }

            return verificationsCache;

        } catch (error) {
            console.error('[PROFILE] ❌ Error fetching verification data:', error);
            throw error;
        }
    };

    /**
     * Fetch and display verification statistics
     */
    const fetchVerificationStats = async () => {
        try {
            console.log('[PROFILE] Calculating verification stats...');

            // Show loading state on stat cards
            if (elements.totalVerifications) elements.totalVerifications.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            if (elements.authenticCount) elements.authenticCount.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            if (elements.forgedCount) elements.forgedCount.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            // Fetch data (uses cache if available)
            const verifications = verificationsCache || await fetchVerificationData();

            // Calculate stats
            const total = verifications.length;
            const authentic = verifications.filter(v => v.label?.toLowerCase() === 'genuine').length;
            const forged = total - authentic;

            // Calculate accuracy percentage
            const accuracy = total > 0 ? ((authentic / total) * 100).toFixed(1) : 0;

            // Animate counters with counting effect
            animateCounter(elements.totalVerifications, total, 1200);
            animateCounter(elements.authenticCount, authentic, 1400);
            animateCounter(elements.forgedCount, forged, 1600);

            // Update trend indicators based on data
            updateTrendIndicators(total, authentic, forged);

            // Animate stat cards entrance
            animateStats();

            console.log(`[PROFILE] Stats calculated: Total=${total}, Authentic=${authentic} (${accuracy}%), Forged=${forged}`);

        } catch (error) {
            console.error('[PROFILE] Error calculating stats:', error);

            // Show error state
            if (elements.totalVerifications) elements.totalVerifications.textContent = '--';
            if (elements.authenticCount) elements.authenticCount.textContent = '--';
            if (elements.forgedCount) elements.forgedCount.textContent = '--';

            if (window.AppUtils) {
                window.AppUtils.showToast('Unable to load statistics', 'error');
            }
        }
    };

    /**
     * Animate counter with counting effect
     */
    const animateCounter = (element, target, duration = 1000) => {
        if (!element) return;

        const start = 0;
        const increment = target / (duration / 16); // 60fps
        let current = 0;

        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                element.textContent = target;
                clearInterval(timer);
            } else {
                element.textContent = Math.floor(current);
            }
        }, 16);
    };

    /**
     * Update trend indicators dynamically
     */
    const updateTrendIndicators = (total, authentic, forged) => {
        // This is a placeholder - you can enhance with historical comparison
        const totalTrend = document.querySelector('.stat-primary .stat-trend');
        const authenticTrend = document.querySelector('.stat-success .stat-trend');

        // Add dynamic trend logic here based on your requirements
        // For now, keeping static trends as shown in UI
    };

    /**
     * Fetch and populate recent activity timeline
     */
    const fetchRecentActivity = async () => {
        try {
            console.log('[PROFILE] Rendering recent activity...');

            if (!elements.recentActivity) {
                console.warn('[PROFILE] Recent activity element not found.');
                return;
            }

            // Use cached data if available, otherwise fetch
            const verifications = verificationsCache || await fetchVerificationData();

            console.log(`[PROFILE] Processing ${verifications.length} verifications for recent activity.`);

            // Handle empty state
            if (verifications.length === 0) {
                elements.recentActivity.innerHTML = `
                    <div style="text-align: center; padding: 50px 20px;">
                        <i class="fas fa-inbox" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 15px;"></i>
                        <p style="color: #64748b; font-size: 1rem; font-weight: 600; margin-bottom: 10px;">No verification history yet</p>
                        <p style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 20px;">Start by verifying your first signature</p>
                        <a href="/verify" class="btn btn-primary" style="margin-top: 10px; display: inline-flex; text-decoration: none;">
                            <i class="fas fa-pen-nib"></i> Start Verifying
                        </a>
                    </div>
                `;
                return;
            }

            // Ensure we only show top 3
            const topThree = verifications.slice(0, 3);

            // Render activity items with animation
            elements.recentActivity.innerHTML = topThree.map((v, index) => {
                const isGenuine = v.label?.toLowerCase() === 'genuine';
                const timeAgo = getTimeAgo(new Date(v.timestamp));
                const verifiedFor = v.verifiedFor || v.user || 'Unknown';

                return `
                    <div class="activity-item" style="animation: fadeInUp 0.5s ease ${index * 0.1}s both;">
                        <div class="activity-icon ${isGenuine ? 'success' : 'danger'}">
                            <i class="fas fa-${isGenuine ? 'check' : 'times'}"></i>
                        </div>
                        <div class="activity-content">
                            <p class="activity-title">
                                ${isGenuine ? 'Verified signature' : 'Detected forgery'} for <strong>${verifiedFor}</strong>
                            </p>
                            <span class="activity-time">
                                <i class="far fa-clock" style="margin-right: 4px;"></i>${timeAgo}
                            </span>
                        </div>
                        <span class="activity-badge ${isGenuine ? 'authentic' : 'forged'}">
                            ${isGenuine ? 'Authentic' : 'Forged'}
                        </span>
                    </div>
                `;
            }).join('');

            console.log(`[PROFILE] Displayed top ${topThree.length} recent activities.`);

        } catch (error) {
            console.error('[PROFILE] Error fetching recent activity:', error);
            showActivityError();
        }
    };

    /**
     * Show error state for activity feed
     */
    const showActivityError = () => {
        if (!elements.recentActivity) return;

        elements.recentActivity.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <i class="fas fa-exclamation-circle" style="font-size: 2.5rem; color: #f59e0b; margin-bottom: 15px;"></i>
                <p style="color: #64748b; font-size: 0.95rem; font-weight: 600; margin-bottom: 10px;">Unable to load recent activity</p>
                <p style="color: #94a3b8; font-size: 0.85rem;">Please refresh the page or try again later.</p>
            </div>
        `;
    };

    /**
     * Animate stat counters on load
     */
    const animateStats = () => {
        const statCards = document.querySelectorAll('.stat-card');
        statCards.forEach((card, index) => {
            card.style.animation = `slideInRight 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.1}s both`;
        });
    };

    /**
     * Calculate time ago from timestamp
     */
    const getTimeAgo = (date) => {
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'Just now';
    };

    /**
     * Open edit profile modal
     */
    const openEditPopup = () => {
        // Pre-fill form with current values
        if (elements.editEmail) {
            elements.editEmail.value = elements.email?.textContent || '';
        }
        if (elements.editAge) {
            const ageValue = elements.age?.textContent;
            elements.editAge.value = ageValue !== '--' ? ageValue : '';
        }
        if (elements.editCollege) {
            const collegeValue = elements.college?.textContent;
            elements.editCollege.value = collegeValue !== 'Not provided' ? collegeValue : '';
        }
        if (elements.editBio) {
            const bioValue = elements.bio?.textContent;
            elements.editBio.value = bioValue !== 'Tell us about yourself...' ? bioValue : '';
        }

        // Show popup
        if (elements.editPopup) {
            elements.editPopup.classList.add('show');
        }
    };

    /**
     * Close edit profile modal
     */
    const closeEditPopup = () => {
        if (elements.editPopup) {
            elements.editPopup.classList.remove('show');
        }
    };

    /**
     * Update user profile
     */
    const updateProfile = async () => {
        const formData = new FormData();

        // Append text fields
        if (elements.editEmail?.value) formData.append('email', elements.editEmail.value.trim());
        if (elements.editAge?.value) formData.append('age', elements.editAge.value.trim());
        if (elements.editCollege?.value) formData.append('college', elements.editCollege.value.trim());
        if (elements.editBio?.value) formData.append('bio', elements.editBio.value.trim());

        // Append file
        if (elements.editProfileImage?.files[0]) {
            formData.append('profileImage', elements.editProfileImage.files[0]);
        }

        // Basic validation
        if (!elements.editEmail?.value) {
            if (window.AppUtils) {
                window.AppUtils.showToast('Email is required', 'error');
            }
            return;
        }

        // Show loading state
        if (elements.updateBtn && window.AppUtils) {
            window.AppUtils.setLoading(elements.updateBtn, true);
        }

        try {
            console.log('[PROFILE] Updating profile...');
            const response = await fetch('/api/user/profile', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const result = await response.json();

                // Update UI with new values
                if (elements.email) elements.email.textContent = result.email || 'email@example.com';
                if (elements.age) elements.age.textContent = result.age || '--';
                if (elements.college) elements.college.textContent = result.college || 'Not provided';
                if (elements.bio) elements.bio.textContent = result.bio || 'Tell us about yourself...';

                // Update Image immediately if returned
                if (result.profileImage && elements.profilePic) {
                    elements.profilePic.src = `${result.profileImage}?t=${new Date().getTime()}`;
                }

                closeEditPopup();

                if (window.AppUtils) {
                    window.AppUtils.showToast('Profile updated successfully!', 'success');
                }

                console.log('[PROFILE] Profile updated successfully.');
            } else {
                const error = await response.json();
                throw new Error(error.message || error.error || 'Failed to update profile');
            }
        } catch (error) {
            console.error('[PROFILE] Error updating profile:', error);
            if (window.AppUtils) {
                window.AppUtils.showToast(error.message || 'Failed to update profile', 'error');
            }
        } finally {
            if (elements.updateBtn && window.AppUtils) {
                window.AppUtils.setLoading(elements.updateBtn, false);
            }
        }
    };

    // ============================================
    // EVENT LISTENERS
    // ============================================
    if (elements.editBtn) {
        elements.editBtn.addEventListener('click', openEditPopup);
    }

    if (elements.closePopup) {
        elements.closePopup.addEventListener('click', closeEditPopup);
    }

    if (elements.updateBtn) {
        elements.updateBtn.addEventListener('click', updateProfile);
    }

    if (elements.editPopup) {
        elements.editPopup.addEventListener('click', (e) => {
            if (e.target === elements.editPopup) {
                closeEditPopup();
            }
        });
    }

    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.AppUtils) {
                window.AppUtils.showConfirmModal('Logout?', 'Are you sure you want to logout?', 'Logout')
                    .then(confirmed => {
                        if (confirmed) window.location.href = '/api/auth/logout';
                    });
            } else if (confirm('Are you sure?')) {
                window.location.href = '/api/auth/logout';
            }
        });
    }

    // Esc key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeEditPopup();
        }
    });

    // ============================================
    // INITIALIZE DASHBOARD
    // ============================================
    console.log('[PROFILE] Initializing dashboard...');

    try {
        // Fetch user profile first
        await fetchUserDetails();

        // Fetch verification data once (populates cache)
        await fetchVerificationData();

        // Then use cached data for both stats and activity (parallel is safe now)
        await Promise.all([
            fetchVerificationStats(),
            fetchRecentActivity()
        ]);

        console.log('[PROFILE] Dashboard loaded successfully.');
    } catch (error) {
        console.error('[PROFILE] Error initializing dashboard:', error);
        if (window.AppUtils) {
            window.AppUtils.showToast('Failed to load dashboard data', 'error');
        }
    }
});