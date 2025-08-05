class VideoSubmissionApp {
    constructor() {
        this.webhookUrl = 'https://eof2r4gt8aplhsc.m.pipedream.net';
        this.init();
    }

    init() {
        this.form = document.getElementById('videoForm');
        this.submitBtn = document.getElementById('submitBtn');
        this.statusList = document.getElementById('statusList');
        this.clearStatusBtn = document.getElementById('clearStatus');
        
        this.bindEvents();
        this.loadStoredStatuses();
    }

    bindEvents() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.clearStatusBtn.addEventListener('click', () => this.clearStatuses());
        
        // Real-time URL validation
        const urlInput = document.getElementById('videoUrl');
        urlInput.addEventListener('input', (e) => this.validateUrl(e.target));
        
        // Auto-format hashtags
        const hashtagsInput = document.getElementById('hashtags');
        hashtagsInput.addEventListener('input', (e) => this.formatHashtags(e.target));
    }

    validateUrl(input) {
        const errorElement = document.getElementById('urlError');
        const url = input.value.trim();
        
        if (!url) {
            errorElement.textContent = '';
            return true;
        }
        
        try {
            new URL(url);
            errorElement.textContent = '';
            input.style.borderColor = '#28a745';
            return true;
        } catch {
            errorElement.textContent = 'Please enter a valid URL';
            input.style.borderColor = '#dc3545';
            return false;
        }
    }

    formatHashtags(input) {
        let value = input.value;
        
        // Split by spaces or commas and clean up
        const hashtags = value.split(/[\s,]+/)
            .filter(tag => tag.length > 0)
            .map(tag => {
                // Add # if not present and tag is not empty
                if (tag && !tag.startsWith('#')) {
                    return '#' + tag.replace(/[^a-zA-Z0-9_]/g, '');
                }
                return tag.replace(/[^a-zA-Z0-9_#]/g, '');
            })
            .filter(tag => tag.length > 1); // Remove single # characters
        
        // Update input with formatted hashtags
        input.value = hashtags.join(' ');
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(this.form);
        const videoUrl = formData.get('videoUrl');
        
        if (!this.validateUrl(document.getElementById('videoUrl'))) {
            return;
        }
        
        // Get selected platforms
        const platforms = Array.from(document.querySelectorAll('input[name="platforms"]:checked'))
            .map(cb => cb.value);
        
        if (platforms.length === 0) {
            this.addStatus('error', 'Please select at least one platform');
            return;
        }
        
        const submissionData = {
            videoUrl,
            platforms,
            hashtags: formData.get('hashtags'),
            description: formData.get('description'),
            timestamp: new Date().toISOString(),
            submissionId: this.generateId()
        };
        
        this.setLoading(true);
        this.addStatus('pending', `Submitting video: ${videoUrl}`);
        
        try {
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(submissionData)
            });
            
            if (response.ok) {
                const result = await response.json().catch(() => ({ success: true }));
                this.addStatus('success', `Successfully submitted to ${platforms.join(', ')}`);
                this.form.reset();
                this.resetFormStyles();
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Submission error:', error);
            this.addStatus('error', `Failed to submit: ${error.message}`);
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(loading) {
        const btnText = this.submitBtn.querySelector('.btn-text');
        const btnSpinner = this.submitBtn.querySelector('.btn-spinner');
        
        if (loading) {
            btnText.textContent = 'Submitting...';
            btnSpinner.style.display = 'inline-block';
            this.submitBtn.disabled = true;
        } else {
            btnText.textContent = 'Submit Video';
            btnSpinner.style.display = 'none';
            this.submitBtn.disabled = false;
        }
    }

    addStatus(type, message) {
        const timestamp = new Date().toLocaleString();
        const statusItem = document.createElement('div');
        statusItem.className = `status-item ${type}`;
        statusItem.innerHTML = `
            <div class="timestamp">${timestamp}</div>
            <div class="message">${message}</div>
        `;
        
        this.statusList.insertBefore(statusItem, this.statusList.firstChild);
        this.saveStatusToStorage(type, message, timestamp);
        
        // Remove empty state if present
        const emptyState = this.statusList.querySelector('.empty-status');
        if (emptyState) {
            emptyState.remove();
        }
        
        // Limit to last 20 statuses
        const items = this.statusList.querySelectorAll('.status-item');
        if (items.length > 20) {
            items[items.length - 1].remove();
        }
    }

    clearStatuses() {
        this.statusList.innerHTML = '<div class="empty-status">No submissions yet</div>';
        localStorage.removeItem('videoSubmissionStatuses');
    }

    saveStatusToStorage(type, message, timestamp) {
        const statuses = JSON.parse(localStorage.getItem('videoSubmissionStatuses') || '[]');
        statuses.unshift({ type, message, timestamp });
        
        // Keep only last 20 statuses
        if (statuses.length > 20) {
            statuses.length = 20;
        }
        
        localStorage.setItem('videoSubmissionStatuses', JSON.stringify(statuses));
    }

    loadStoredStatuses() {
        const statuses = JSON.parse(localStorage.getItem('videoSubmissionStatuses') || '[]');
        
        if (statuses.length === 0) {
            this.statusList.innerHTML = '<div class="empty-status">No submissions yet</div>';
            return;
        }
        
        statuses.forEach(status => {
            const statusItem = document.createElement('div');
            statusItem.className = `status-item ${status.type}`;
            statusItem.innerHTML = `
                <div class="timestamp">${status.timestamp}</div>
                <div class="message">${status.message}</div>
            `;
            this.statusList.appendChild(statusItem);
        });
    }

    resetFormStyles() {
        document.getElementById('videoUrl').style.borderColor = '#e1e5e9';
        document.getElementById('urlError').textContent = '';
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VideoSubmissionApp();
});