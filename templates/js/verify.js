/**
 * ============================================
 * VERIFY PAGE SCRIPT
 * ============================================
 */

document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const verifyForm = document.getElementById('verifyForm');
    const filePreview = document.getElementById('filePreview');
    const previewImg = document.getElementById('previewImg');
    const fileName = document.getElementById('fileName');
    const removeFileBtn = document.getElementById('removeFile');
    const resultSection = document.getElementById('resultSection');
    const resultPlaceholder = document.getElementById('resultPlaceholder');
    const verifyBtn = document.getElementById('verifyBtn');
    const newTestBtn = document.getElementById('newTestBtn');

    // New Test button - CSP compliant
    if (newTestBtn) {
        newTestBtn.addEventListener('click', () => window.location.reload());
    }

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, e => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-over'));
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over'));
    });

    dropZone.addEventListener('drop', e => {
        const dt = e.dataTransfer;
        handleFiles(dt.files);
    });

    dropZone.addEventListener('click', () => {
        if (!filePreview.classList.contains('active')) {
            fileInput.click();
        }
    });

    fileInput.addEventListener('change', function () {
        handleFiles(this.files);
    });

    removeFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetFile();
    });

    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            if (!file.type.startsWith('image/')) {
                window.AppUtils.showToast('Please upload an image file', 'error');
                return;
            }

            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInput.files = dataTransfer.files;

            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                fileName.textContent = file.name;
                filePreview.classList.add('active');
            };
            reader.readAsDataURL(file);
        }
    }

    function resetFile() {
        fileInput.value = '';
        filePreview.classList.remove('active');
        previewImg.src = '';
    }

    verifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('usernameInput').value.trim();
        const file = fileInput.files[0];

        if (!username || !file) {
            window.AppUtils.showToast('Fill all fields', 'error');
            return;
        }

        window.AppUtils.setLoading(verifyBtn, true);

        // UI Transition - use class instead of style for proper grid sizing
        resultPlaceholder.classList.add('hidden');
        resultSection.classList.add('active');

        // Start Scanning Animation
        const previewFrame = document.getElementById('previewFrame');
        if (previewFrame) previewFrame.classList.add('scanning-active');

        const formData = new FormData();
        formData.append('username', username);
        formData.append('file', file);

        try {
            const response = await fetch('/api/verify/predict', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            // Stop Scanning Animation
            if (previewFrame) previewFrame.classList.remove('scanning-active');

            if (response.ok) {
                showResult(result);
            } else {
                // Enhanced error handling - show detailed message
                let errorMessage = result.error || 'Verification failed';

                // If we have a detailed message, use it
                if (result.message) {
                    errorMessage = result.message;
                }

                // If we have a suggestion, append it
                if (result.suggestion) {
                    errorMessage += '\n\n💡 ' + result.suggestion;
                }

                throw new Error(errorMessage);
            }

        } catch (error) {
            console.error('Verify error:', error);

            // Show detailed error with multiline support
            const errorMsg = error.message || 'Verification failed';
            window.AppUtils.showToast(errorMsg, 'error', 8000); // Show for 8 seconds

            // Stop Scanning Animation
            if (previewFrame) previewFrame.classList.remove('scanning-active');
            // Re-show placeholder on error
            resultPlaceholder.classList.remove('hidden');
            resultSection.classList.remove('active');
        } finally {
            window.AppUtils.setLoading(verifyBtn, false);
        }
    });

    // Check for URL parameters (Direct from Models Page)
    async function checkDeepLinks() {
        const params = new URLSearchParams(window.location.search);
        const user = params.get('user');
        const sampleUrl = params.get('sample');

        if (user) {
            const usernameInput = document.getElementById('usernameInput');
            if (usernameInput) {
                usernameInput.value = user;
                // Add visual highlight to show it's pre-filled
                usernameInput.classList.add('prefilled');
                setTimeout(() => usernameInput.classList.remove('prefilled'), 2000);
            }
        }

        if (sampleUrl) {
            try {
                // Show loading state in drop zone
                const dropZone = document.getElementById('dropZone');
                if (dropZone) {
                    dropZone.classList.add('loading-sample');
                }

                window.AppUtils.showToast(`Loading ${user}'s signature sample...`, 'info');
                const response = await fetch(sampleUrl);

                if (!response.ok) throw new Error('Failed to fetch sample');

                const blob = await response.blob();

                // Construct file name from URL
                const fileNameFromUrl = sampleUrl.split('/').pop() || 'sample.png';
                const file = new File([blob], fileNameFromUrl, { type: blob.type || 'image/png' });

                // Use existing handleFiles logic
                handleFiles([file]);

                // Remove loading state
                if (dropZone) {
                    dropZone.classList.remove('loading-sample');
                }

                window.AppUtils.showToast('Sample loaded! Click "Analyze Signature" to verify.', 'success');

                // Clean up URL without refreshing page
                const cleanUrl = window.location.pathname;
                window.history.replaceState({}, document.title, cleanUrl);

            } catch (err) {
                console.error('Failed to load sample:', err);
                window.AppUtils.showToast('Failed to load sample signature. Please try manually.', 'error');

                const dropZone = document.getElementById('dropZone');
                if (dropZone) {
                    dropZone.classList.remove('loading-sample');
                }
            }
        }
    }

    // Call deep link check
    checkDeepLinks();

    function showResult(data) {
        const card = document.getElementById('resultSection');
        const icon = document.getElementById('resultIcon');
        const title = document.getElementById('resultTitle');
        const desc = document.getElementById('resultDesc');
        const confBar = document.getElementById('confidenceBar');
        const confVal = document.getElementById('confidenceValue');
        const suggestionList = document.getElementById('suggestionList');

        // Reset classes
        card.classList.remove('success', 'danger');

        const isGenuine = data.label.toLowerCase().includes('genuine');
        card.classList.add(isGenuine ? 'success' : 'danger');

        if (isGenuine) {
            icon.className = 'fas fa-check-circle';
            title.textContent = 'Signature Verified';
            desc.textContent = `Matching results found for ${data.label}`;
            confBar.style.background = 'linear-gradient(90deg, #10b981, #34d399)';

            suggestionList.innerHTML = `
                <li><i class="fas fa-check-circle"></i> Pressure points match verified baseline</li>
                <li><i class="fas fa-check-circle"></i> Stroke velocity consistent with known patterns</li>
                <li><i class="fas fa-check-circle"></i> Fluidity index: Excellent (High confidence)</li>
            `;
        } else {
            icon.className = 'fas fa-times-circle';
            title.textContent = 'Verification Failed';
            desc.textContent = `The signature is likely ${data.label}`;
            confBar.style.background = 'linear-gradient(90deg, #ef4444, #f87171)';

            suggestionList.innerHTML = `
                <li><i class="fas fa-exclamation-triangle"></i> Detectable hesitation in mid-stroke patterns</li>
                <li><i class="fas fa-exclamation-triangle"></i> Structural variance exceeded tolerance limits</li>
                <li><i class="fas fa-exclamation-triangle"></i> Artificial tremor detected in character edges</li>
            `;
        }

        // Animated Score
        const score = parseFloat(data.confidence).toFixed(2);
        confVal.textContent = '0%';
        confBar.style.width = '0%';

        setTimeout(() => {
            confVal.textContent = `${score}%`;
            confBar.style.width = `${score}%`;
        }, 100);

        window.AppUtils.showToast('Analysis Complete', 'success');
    }
});
