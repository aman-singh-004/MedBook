// API Configurations
const BASE_URL = 'http://localhost:8080/api';

/**
 * Centered API Request Handler
 * Automatically handles token injection, json serialization, and unauthorized intercepts.
 */
async function apiRequest(endpoint, options = {}) {
    const token = sessionStorage.getItem('token');
    
    // Default Headers
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    // Attach Authorization token if available
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers
    };

    // Serialize body if it is an object
    if (options.body && typeof options.body === 'object') {
        config.body = JSON.stringify(options.body);
    }

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, config);
        
        // Handle no-content responses (like DELETE or 204)
        if (response.status === 204) {
            return null;
        }

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            // Intercept 401 Unauthorized (expired/invalid token)
            if (response.status === 401) {
                clearSession();
                // Avoid infinite redirect if already on login page
                if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/' && window.location.pathname !== '') {
                    showToast('Session expired. Please log in again.', 'error');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1500);
                }
            }
            
            // Extract error message
            const errMsg = (data && data.message) || `Request failed with status ${response.status}`;
            throw new Error(errMsg);
        }

        return data;
    } catch (error) {
        console.error(`API Error on ${endpoint}:`, error);
        throw error;
    }
}

// Session Management Helpers
function saveSession(authResponse) {
    sessionStorage.setItem('token', authResponse.token);
    sessionStorage.setItem('user', JSON.stringify({
        id: authResponse.id,
        username: authResponse.username,
        email: authResponse.email,
        role: authResponse.role
    }));
}

function clearSession() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
}

function isLoggedIn() {
    return sessionStorage.getItem('token') !== null;
}

function getCurrentUser() {
    const userStr = sessionStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

// Global Custom Toast Helper
function showToast(message, type = 'success') {
    // Check if container exists, if not create it
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Choose icons based on status
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    // Auto remove toast
    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => {
            toast.remove();
            if (container.children.length === 0) {
                container.remove();
            }
        });
    }, 4000);
}
