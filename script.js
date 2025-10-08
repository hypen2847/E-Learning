/* Utilities */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const toast = (message, ms = 2000) => {
    const node = $('#toast');
    if (!node) return;
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => node.classList.remove('show'), ms);
};

const showLoading = (action, redirect) => {
    const params = new URLSearchParams({
        action: action,
        redirect: redirect || window.location.href
    });
    window.location.href = `./loading/index.html?${params.toString()}`;
};

const setButtonLoading = (btnId, loading = true) => {
    const btn = $(btnId);
    if (!btn) return;
    if (loading) {
        btn.classList.add('loading');
        btn.disabled = true;
    } else {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
};

/* Scroll reveal */
const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
        if (e.isIntersecting) {
            e.target.classList.add('show');
            io.unobserve(e.target);
        }
    });
}, { threshold: 0.12 });

$$('.reveal').forEach(el => io.observe(el));

/* 3D tilt effect */
function attachTilt(container) {
    const strength = 12; // deg
    const resetMs = 180;
    container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) / (rect.width / 2);
        const dy = (e.clientY - cy) / (rect.height / 2);
        const rx = (dy * strength).toFixed(2);
        const ry = (-dx * strength).toFixed(2);
        container.style.transform = `translateY(-4px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
    container.addEventListener('mouseleave', () => {
        container.style.transition = `transform ${resetMs}ms ease`;
        container.style.transform = '';
        setTimeout(() => (container.style.transition = ''), resetMs);
    });
}

$$('.tilt-card').forEach(attachTilt);

/* Simple Navbar: remove particles and floating indicator */
function initNavigationOverlay() {}

/* Mobile nav toggle */
function initNavToggle() {
    const toggle = document.getElementById('navToggle');
    const nav = document.getElementById('primaryNav');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', () => {
        const open = nav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    // Close on link click (mobile)
    $$('#primaryNav a').forEach(a => a.addEventListener('click', () => {
        if (nav.classList.contains('open')) {
            nav.classList.remove('open');
            toggle.setAttribute('aria-expanded', 'false');
        }
    }));
}

/* Smooth anchor navigation */
$$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        const el = $(id);
        if (el) {
            e.preventDefault();
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

/* Admin auth using database */
const ADMIN_KEY = 'ncc_admin_logged_in_v1';

function isAdmin() {
    try { return localStorage.getItem(ADMIN_KEY) === '1'; } catch { return false; }
}

function setAdmin(flag) {
    try { localStorage.setItem(ADMIN_KEY, flag ? '1' : '0'); } catch {}
    renderAdmin();
}

const loginDialog = $('#loginDialog');
$('#openLogin')?.addEventListener('click', () => loginDialog.showModal());
$('#openAdmin')?.addEventListener('click', () => {
    if (!isAdmin()) { 
        loginDialog.showModal(); 
        return; 
    }
    window.location.href = './dashboard/dashboard.html';
});

// Admin login with specific credentials
$('#loginForm')?.addEventListener('submit', async (e) => {
	e.preventDefault();
	const email = $('#adminEmail').value.trim();
	const password = $('#adminPassword').value.trim();
	const error = $('#loginError');
	
	// Check for specific admin credentials
	if (email === 'piyushsadar56@gmail.com' && password === 'Piyush_sadar_56') {
		setAdmin(true);
		error.textContent = '';
		setButtonLoading('#loginSubmit', true);
		setTimeout(() => { window.location.href = './dashboard/dashboard.html'; }, 500);
	} else {
		error.textContent = 'Invalid email or password';
	}
});

function renderAdmin() {
    const locked = $('#adminLocked');
    const panel = $('#adminPanel');
    const show = isAdmin();
    if (locked && panel) {
        locked.hidden = show;
        panel.hidden = !show;
    }
    if (show) {
        populateTable();
        populateRegisteredUsers();
    }
}
renderAdmin();

/* User registration + login using database */
// Remove modal open handlers for Register/Login since we now use dedicated pages
// $('#navRegister')?.addEventListener('click', () => $('#userRegisterDialog').showModal());
// $('#navLogin')?.addEventListener('click', () => $('#userLoginDialog').showModal());

// Ensure Account button redirects to profile
$('#accountBtn')?.addEventListener('click', () => {
	// Use relative path that works from both main page and auth pages
	const currentPath = window.location.pathname;
	if (currentPath.includes('/auth/')) {
		// If we're on auth pages, go up one level then to profile
		window.location.href = '../User_profile_dashboard/index.html';
	} else {
		// If we're on main page, go directly to profile
		window.location.href = './User_profile_dashboard/index.html';
	}
});

// Use local getSession helper to clear session on logout
$('#logoutBtn')?.addEventListener('click', async (e) => {
	e.preventDefault();
	const session = await getSession();
	if (session) {
		await db.clearSession(session.email);
	}
	$('#accountDialog').close();
	toast('Logged out');
	await renderAccountUI();
});

// User registration and login
$('#userRegisterForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#userName').value.trim();
    const email = $('#userEmail').value.trim();
    const password = $('#userPassword').value.trim();
    const mobile = $('#userMobile').value.trim();
    
    if (!name || !email || !password || !mobile) {
        $('#registerError').textContent = 'All fields are required';
        return;
    }
    
    try {
        const existingUser = await db.getUserByEmail(email);
        if (existingUser) {
            $('#registerError').textContent = 'Email already registered';
            return;
        }
        
        const newUser = await db.addUser({
            name,
            email,
            password: hashPassword(password),
            compactMobile: mobile
        });
        
        $('#registerError').textContent = '';
        $('#userRegisterDialog').close();
        
        // Auto-login after registration
        await db.createSession(email);
        await renderAccountUI();
        
        // Loading screen redirect
        setButtonLoading('#registerBtn', true);
        setTimeout(() => { showLoading('register', './User_profile_dashboard/index.html'); }, 400);
    } catch (error) {
        $('#registerError').textContent = 'Registration failed. Please try again.';
    }
});

$('#userLoginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#loginUserEmail').value.trim();
    const password = $('#loginUserPassword').value.trim();
    
    if (!email || !password) {
        $('#userLoginError').textContent = 'All fields are required';
        return;
    }
    
    try {
        const user = await db.getUserByEmail(email);
        if (user && user.password === hashPassword(password)) {
            // Update login time and count
            await db.updateUserLogin(email);
            
            // Create session
            await db.createSession(email);
            
            $('#userLoginError').textContent = '';
            $('#userLoginDialog').close();
            await renderAccountUI();
            
            // Loading screen redirect
            setButtonLoading('#userLoginBtn', true);
            setTimeout(() => { showLoading('login', './User_profile_dashboard/index.html'); }, 400);
        } else {
            $('#userLoginError').textContent = 'Invalid email or password';
        }
    } catch (error) {
        $('#userLoginError').textContent = 'Login failed. Please try again.';
    }
});

/* Enrollment storage using database */
function compactMobile(input) {
    const digits = (input || '').replace(/[^0-9]/g, '');
    if (digits.length <= 10) return digits; // assume local
    // Keep last 10 as local, prefix with country if present
    const last10 = digits.slice(-10);
    const country = digits.slice(0, -10);
    return country ? `+${country}-${last10}` : last10;
}

async function populateTable() {
    const tbody = $('#usersTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const list = await db.getAllEnrollments();
    list.forEach((e, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td>${e.fullName}</td>
            <td>${e.email}</td>
            <td>${e.compactMobile}</td>
            <td>${e.course}</td>
            <td>${new Date(e.timestamp).toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
    });
}

$('#exportBtn')?.addEventListener('click', async () => {
    try {
        const data = await db.exportDatabase();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ncc_database_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast('Database exported successfully');
    } catch (error) {
        toast('Export failed');
    }
});

$('#importInput')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
        await db.importDatabase(text);
        toast('Database imported successfully');
        populateTable();
        populateRegisteredUsers();
    } catch (err) {
        toast('Import failed');
    }
});

$('#clearBtn')?.addEventListener('click', async () => {
    try {
        await db.clearDatabase();
        populateTable();
        populateRegisteredUsers();
        toast('Database cleared successfully');
    } catch (error) {
        toast('Clear failed');
    }
});

async function populateRegisteredUsers() {
    const tbody = $('#regUsersTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const users = await db.getAllUsers();
    users.forEach((u, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${i + 1}</td>
            <td>${u.name}</td>
            <td>${u.email}</td>
            <td>${u.compactMobile || ''}</td>
            <td>${new Date(u.createdAt).toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
    });
}

$('#exportUsersBtn')?.addEventListener('click', async () => {
    try {
        const users = await db.getAllUsers();
        const data = JSON.stringify(users, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ncc_registered_users_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast('Users exported successfully');
    } catch (error) {
        toast('Export failed');
    }
});

/* Form handling using database */
$('#enrollForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const entry = {
        fullName: String(values.fullName || '').trim(),
        email: String(values.email || '').trim().toLowerCase(),
        mobile: String(values.mobile || '').trim(),
        compactMobile: compactMobile(values.mobile),
        course: String(values.course || '').trim(),
    };

    if (!entry.fullName || !entry.email || !entry.course || !entry.compactMobile) {
        $('#formMessage').textContent = 'Please complete all fields correctly.';
        return;
    }

    try {
        await db.addEnrollment(entry);
        $('#formMessage').textContent = 'Submitted! We will contact you soon.';
        toast('Enrollment saved');
        form.reset();
        populateTable();
    } catch (error) {
        $('#formMessage').textContent = 'Submission failed. Please try again.';
    }
});

async function renderAccountUI() {
    const navRegister = $('#navRegister');
    const navLogin = $('#navLogin');
    const accountBtn = $('#accountBtn');

    try {
        // Get the most recent valid session
        const sessions = db.getSessionsFromStorage();
        const validSession = sessions.find(s => new Date(s.expiresAt) > new Date());
        
        if (validSession) {
            const user = await db.getUserByEmail(validSession.email);
            if (user) {
                // User is logged in - hide Register/Login, show Account
                navRegister?.classList.add('hidden');
                navLogin?.classList.add('hidden');
                accountBtn?.classList.remove('hidden');
                accountBtn && (accountBtn.textContent = user.name || 'Account');
                return;
            } else {
                // User not found - clear stale session
                await db.clearSession(validSession.email);
            }
        }
    } catch (e) {
        console.warn('Error checking user session:', e);
    }

    // Default: show Register/Login, hide Account
    navRegister?.classList.remove('hidden');
    navLogin?.classList.remove('hidden');
    accountBtn?.classList.add('hidden');
}

async function updateAccountButtonText(email) {
    try {
        const user = await db.getUserByEmail(email);
        const accountBtn = $('#accountBtn');
        if (user && accountBtn) {
            accountBtn.textContent = user.name;
        }
    } catch (error) {
        console.error('Error updating account button text:', error);
    }
}

async function getSession() {
    try {
        // Get the most recent valid session using database manager
        const sessions = db.getSessionsFromStorage();
        const validSession = sessions.find(s => new Date(s.expiresAt) > new Date());
        return validSession || null;
    } catch {
        return null;
    }
}

function hashPassword(pw) {
    // Simple non-cryptographic hash for demo; replace with real hashing on backend in production
    let h = 0; for (let i = 0; i < pw.length; i++) { h = (h << 5) - h + pw.charCodeAt(i); h |= 0; }
    return `h${Math.abs(h)}`;
}

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize navigation overlay effects
    initNavigationOverlay();
    initNavToggle();
    
    // Initialize account UI state
    await renderAccountUI();
});


