/**
 * ============================================
 * PROFILE PAGE JAVASCRIPT
 * ============================================
 */

document.addEventListener('DOMContentLoaded', async () => {
    // DOM Elements
    const elements = {
        profilePic: document.getElementById('profile-pic'),
        totalVerifications: document.getElementById('total-verifications'),
        username: document.getElementById('username'),
        email: document.getElementById('email'),
        age: document.getElementById('age'),
        editBtn: document.getElementById('edit-profile'),
        logoutBtn: document.getElementById('logout'),
        editPopup: document.getElementById('edit-popup'),
        closePopup: document.getElementById('close-popup'),
        updateBtn: document.getElementById('update-details'),
        editProfileImage: document.getElementById('edit-profile-image'),
        editEmail: document.getElementById('edit-email'),
        editAge: document.getElementById('edit-age')
    };

    // ============================================
    // FETCH USER DETAILS ON PAGE LOAD
    // ============================================
    const fetchUserDetails = async () => {
        try {
            const response = await fetch('/api/user/profile');

            if (response.status === 401) {
                // Not logged in, redirect to login
                window.location.href = '/login';
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch user details');
            }

            const user = await response.json();

            // Populate profile fields
            if (elements.username) elements.username.textContent = user.username || 'User';
            if (elements.email) elements.email.textContent = user.email || 'Not provided';
            if (elements.age) elements.age.textContent = user.age || 'Not provided';

            // Update Profile Picture
            if (elements.profilePic && user.profileImage) {
                elements.profilePic.src = user.profileImage;
            }

            // Update Stats
            if (elements.totalVerifications) {
                const count = user.verificationsCount || 0;
                elements.totalVerifications.textContent = count;
            }

        } catch (error) {
            console.error('Error fetching user details:', error);
            if (window.AppUtils) {
                window.AppUtils.showToast('Failed to load profile data', 'error');
            }
        }
    };

    // ============================================
    // EDIT PROFILE POPUP HANDLERS
    // ============================================
    const openEditPopup = () => {
        // Pre-fill form with current values
        if (elements.editEmail) {
            elements.editEmail.value = elements.email?.textContent !== 'Not provided'
                ? elements.email.textContent : '';
        }
        if (elements.editAge) {
            const ageValue = elements.age?.textContent;
            elements.editAge.value = ageValue !== 'Not provided' ? ageValue : '';
        }

        // Show popup
        if (elements.editPopup) {
            elements.editPopup.classList.add('show');
        }
    };

    const closeEditPopup = () => {
        if (elements.editPopup) {
            elements.editPopup.classList.remove('show');
        }
    };

    // ============================================
    // UPDATE PROFILE
    // ============================================
    const updateProfile = async () => {
        const formData = new FormData();

        // Append text fields
        if (elements.editEmail?.value) formData.append('email', elements.editEmail.value.trim());
        if (elements.editAge?.value) formData.append('age', elements.editAge.value.trim());

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
            const response = await fetch('/api/user/profile', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const result = await response.json();

                // Update UI with new values
                if (elements.email) elements.email.textContent = result.email || 'Not provided';
                if (elements.age) elements.age.textContent = result.age || 'Not provided';

                // Update Image immediately if returned
                if (result.profileImage && elements.profilePic) {
                    elements.profilePic.src = `${result.profileImage}?t=${new Date().getTime()}`;
                }

                closeEditPopup();

                if (window.AppUtils) {
                    window.AppUtils.showToast('Profile updated successfully!', 'success');
                }
            } else {
                const error = await response.json();
                throw new Error(error.message || error.error || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
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

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeEditPopup();
        }
    });

    // ============================================
    // INITIALIZE
    // ============================================
    await fetchUserDetails();
});