// Database utility functions for National Coaching Centre
// Primary mode: Python backend API
// Fallback mode: localStorage (browser-only)

class DatabaseManager {
    constructor() {
        this.apiBase = 'http://localhost:5000/api';
        this.useBackend = true;
        this.initialized = false;
        this.init();
    }

    async init() {
        try {
            // Probe backend availability
            await this.apiCall('/users', { method: 'GET' });
            this.useBackend = true;
            console.log('Database manager: using Python backend API');
        } catch (error) {
            this.useBackend = false;
            console.warn('Database manager: backend not reachable, falling back to localStorage');
        } finally {
            this.initialized = true;
        }
    }

    // Helper: Safe API call
    async apiCall(endpoint, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        try {
            const url = `${this.apiBase}${endpoint}`;
            const response = await fetch(url, {
                headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
                signal: controller.signal,
                ...options
            });
            if (!response.ok) {
                let errorText;
                try { errorText = await response.text(); } catch { errorText = ''; }
                throw new Error(errorText || `HTTP ${response.status}`);
            }
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) return {};
            return await response.json();
        } finally {
            clearTimeout(timeoutId);
        }
    }

    // Helper: switch to fallback if backend fails in-flight
    _fallbackOnError(error) {
        console.warn('Backend error, switching to localStorage fallback:', error?.message || error);
        this.useBackend = false;
    }

    // ---------- Users ----------
    async addUser(userData) {
        if (this.useBackend) {
            try {
                const res = await this.apiCall('/register', {
                    method: 'POST',
                    body: JSON.stringify({
                        name: userData.name,
                        email: userData.email,
                        password: userData.password,
                        mobile: userData.compactMobile
                    })
                });
                return res;
            } catch (e) { this._fallbackOnError(e); }
        }
        // Fallback
        const users = this.getUsersFromStorage();
        const exists = users.some(u => u.email === userData.email);
        if (exists) throw new Error('Email already registered');
        const newUser = {
            id: Date.now(),
            name: userData.name,
            email: userData.email,
            password: userData.password,
            compact_mobile: userData.compactMobile,
            created_at: new Date().toISOString(),
            last_login: null,
            login_count: 0
        };
        users.push(newUser);
        this.saveUsersToStorage(users);
        return newUser;
    }

    async getUserByEmail(email) {
        if (this.useBackend) {
            try {
                const res = await this.apiCall(`/user/${encodeURIComponent(email)}`);
                return res.user;
            } catch (e) { this._fallbackOnError(e); }
        }
        // Fallback
        const users = this.getUsersFromStorage();
        return users.find(u => u.email === email) || null;
    }

    async updateUserLogin(email) {
        if (this.useBackend) {
            // Backend updates happen during /api/login; nothing to do here
            return true;
        }
        const users = this.getUsersFromStorage();
        const idx = users.findIndex(u => u.email === email);
        if (idx !== -1) {
            users[idx].last_login = new Date().toISOString();
            users[idx].login_count = (users[idx].login_count || 0) + 1;
            this.saveUsersToStorage(users);
            return users[idx];
        }
        return null;
    }

    async getAllUsers() {
        if (this.useBackend) {
            try {
                const res = await this.apiCall('/users');
                return res.users || [];
            } catch (e) { this._fallbackOnError(e); }
        }
        return this.getUsersFromStorage();
    }

    // ---------- Enrollments ----------
    async addEnrollment(enrollmentData) {
        if (this.useBackend) {
            try {
                const res = await this.apiCall('/enroll', {
                    method: 'POST',
                    body: JSON.stringify({
                        fullName: enrollmentData.fullName,
                        email: enrollmentData.email,
                        mobile: enrollmentData.mobile,
                        course: enrollmentData.course
                    })
                });
                return res;
            } catch (e) { this._fallbackOnError(e); }
        }
        const enrollments = this.getEnrollmentsFromStorage();
        const record = {
            id: Date.now(),
            fullName: enrollmentData.fullName,
            email: enrollmentData.email,
            mobile: enrollmentData.mobile,
            compact_mobile: (enrollmentData.mobile || '').replace(/[^0-9]/g, ''),
            course: enrollmentData.course,
            timestamp: new Date().toISOString()
        };
        enrollments.push(record);
        this.saveEnrollmentsToStorage(enrollments);
        return record;
    }

    async getEnrollmentsByEmail(email) {
        if (this.useBackend) {
            try {
                const res = await this.apiCall(`/user/${encodeURIComponent(email)}/enrollments`);
                return res.enrollments || [];
            } catch (e) { this._fallbackOnError(e); }
        }
        return this.getEnrollmentsFromStorage().filter(e => e.email === email);
    }

    async getAllEnrollments() {
        if (this.useBackend) {
            try {
                const res = await this.apiCall('/enrollments');
                return res.enrollments || [];
            } catch (e) { this._fallbackOnError(e); }
        }
        return this.getEnrollmentsFromStorage();
    }

    // ---------- Sessions (frontend state) ----------
    async createSession(email) {
        const session = {
            id: Date.now(),
            email,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };
        const sessions = this.getSessionsFromStorage();
        sessions.push(session);
        this.saveSessionsToStorage(sessions);
        return session;
    }

    async getSession(email) {
        const sessions = this.getSessionsFromStorage();
        const session = sessions.find(s => s.email === email);
        if (session && new Date(session.expiresAt) > new Date()) return session;
        return null;
    }

    async clearSession(email) {
        const sessions = this.getSessionsFromStorage();
        const filtered = sessions.filter(s => s.email !== email);
        this.saveSessionsToStorage(filtered);
    }

    // ---------- Admin ----------
    async verifyAdmin(email, password) {
        if (this.useBackend) {
            try {
                const res = await this.apiCall('/admin/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password })
                });
                return res.success ? { email } : null;
            } catch (e) { this._fallbackOnError(e); }
        }
        // Fallback default admin
        if (email === 'admin@gmail.com' && password === 'Admin@123') return { email };
        return null;
    }

    // ---------- Storage helpers (fallback + sessions) ----------
    getUsersFromStorage() {
        try { return JSON.parse(localStorage.getItem('ncc_users_v1') || '[]'); } catch { return []; }
    }
    saveUsersToStorage(users) {
        try { localStorage.setItem('ncc_users_v1', JSON.stringify(users)); } catch {}
    }

    getEnrollmentsFromStorage() {
        try { return JSON.parse(localStorage.getItem('ncc_enrollments_v1') || '[]'); } catch { return []; }
    }
    saveEnrollmentsToStorage(enrollments) {
        try { localStorage.setItem('ncc_enrollments_v1', JSON.stringify(enrollments)); } catch {}
    }

    getSessionsFromStorage() {
        try { return JSON.parse(localStorage.getItem('ncc_sessions_v1') || '[]'); } catch { return []; }
    }
    saveSessionsToStorage(sessions) {
        try { localStorage.setItem('ncc_sessions_v1', JSON.stringify(sessions)); } catch {}
    }

    // ---------- Export / Clear ----------
    async exportDatabase() {
        if (this.useBackend) {
            try {
                const res = await this.apiCall('/export');
                return JSON.stringify(res, null, 2);
            } catch (e) { this._fallbackOnError(e); }
        }
        const exportData = {
            users: this.getUsersFromStorage(),
            enrollments: this.getEnrollmentsFromStorage(),
            admins: [{ email: 'admin@gmail.com' }],
            export_date: new Date().toISOString()
        };
        return JSON.stringify(exportData, null, 2);
    }

    async importDatabase(jsonData) {
        // Backend import not implemented. For fallback, restore LS keys from JSON
        try {
            const data = JSON.parse(jsonData);
            if (Array.isArray(data.users)) this.saveUsersToStorage(data.users);
            if (Array.isArray(data.enrollments)) this.saveEnrollmentsToStorage(data.enrollments);
            return true;
        } catch (error) {
            console.error('Error importing database:', error);
            throw error;
        }
    }

    async clearDatabase() {
        if (this.useBackend) {
            try {
                const res = await this.apiCall('/clear', { method: 'POST' });
                return !!res.success;
            } catch (e) { this._fallbackOnError(e); }
        }
        try {
            localStorage.removeItem('ncc_users_v1');
            localStorage.removeItem('ncc_enrollments_v1');
            localStorage.removeItem('ncc_sessions_v1');
            return true;
        } catch (e) {
            console.error('Error clearing local database:', e);
            return false;
        }
    }
}

// Global instance
const db = new DatabaseManager();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DatabaseManager;
}
