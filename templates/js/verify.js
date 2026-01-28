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
            const response = await fetch('/predict', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            // Stop Scanning Animation
            if (previewFrame) previewFrame.classList.remove('scanning-active');

            if (response.ok) {
                showResult(result);
            } else {
                throw new Error(result.error || 'Verification failed');
            }

        } catch (error) {
            console.error('Verify error:', error);
            window.AppUtils.showToast(error.message, 'error');
            // Stop Scanning Animation
            if (previewFrame) previewFrame.classList.remove('scanning-active');
            // Re-show placeholder on error
            resultPlaceholder.classList.remove('hidden');
            resultSection.classList.remove('active');
        } finally {
            window.AppUtils.setLoading(verifyBtn, false);
        }
    });

    function showResult(data) {
        const card = document.getElementById('resultSection');
        const icon = document.getElementById('resultIcon');
        const title = document.getElementById('resultTitle');
        const desc = document.getElementById('resultDesc');
        const confBar = document.getElementById('confidenceBar');
        const confVal = document.getElementById('confidenceValue');

        // Reset classes
        card.classList.remove('success', 'danger');

        const isGenuine = data.label.toLowerCase().includes('genuine');
        card.classList.add(isGenuine ? 'success' : 'danger');

        if (isGenuine) {
            icon.className = 'fas fa-check-circle';
            title.textContent = 'Signature Verified';
            desc.textContent = `Matching results found for ${data.label}`;
            confBar.style.background = '#10b981';
        } else {
            icon.className = 'fas fa-times-circle';
            title.textContent = 'Verification Failed';
            desc.textContent = `The signature is likely ${data.label}`;
            confBar.style.background = '#ef4444';
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
