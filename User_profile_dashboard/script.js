const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

async function getCurrentUser() {
    try {
        // Get the most recent valid session using database manager
        const sessions = db.getSessionsFromStorage();
        const validSession = sessions.find(s => new Date(s.expiresAt) > new Date());
        if (!validSession) return null;
        
        // Get user data from database
        const user = await db.getUserByEmail(validSession.email);
        return user;
    } catch {
        return null;
    }
}

async function guardAccess() {
    const user = await getCurrentUser();
    if (!user) {
        // Redirect to main site if not logged in
        window.location.href = '../index.html';
        return false;
    }
    return user;
}

function reveal() {
    const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) { e.target.classList.add('show'); io.unobserve(e.target); }
        });
    }, { threshold: 0.12 });
    $$('.reveal').forEach(el => io.observe(el));
}

async function populateUserProfile(user) {
    // Update profile section
    $('#profileName').textContent = user.name;
    $('#profileEmail').textContent = user.email;
    $('#profileMobile').textContent = user.compactMobile || 'Not provided';
    
    // Update avatars
    const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
    $('#profileAvatar').textContent = initials;
    $('#userAvatar').textContent = initials;
    $('#userName').textContent = user.name;
    $('#userEmail').textContent = user.email;
    
    // Calculate stats using database
    const userEnrollments = await db.getEnrollmentsByEmail(user.email);
    const memberSince = Math.floor((Date.now() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24));
    
    $('#totalEnrollments').textContent = userEnrollments.length;
    $('#activeCourses').textContent = userEnrollments.length; // Assuming all are active for demo
    $('#memberSince').textContent = memberSince;
    $('#loginCount').textContent = user.loginCount || 0;
    
    // Update login details
    $('#lastLogin').textContent = user.lastLogin ? 
        new Date(user.lastLogin).toLocaleString() : 'Never';
    $('#accountCreated').textContent = new Date(user.createdAt).toLocaleDateString();
}

async function populateUserEnrollments(user) {
    const userEnrollments = await db.getEnrollmentsByEmail(user.email);
    
    const tbody = $('#userEnrollmentsTable tbody');
    tbody.innerHTML = '';
    
    if (userEnrollments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--muted);">No enrollments yet</td></tr>';
        return;
    }
    
    userEnrollments.forEach((e, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${i + 1}</td>
            <td>${e.course}</td>
            <td>${new Date(e.timestamp).toLocaleDateString()}</td>
            <td><span class="status active">Active</span></td>
            <td>
                <button class="btn btn-sm" onclick="viewEnrollment('${e.course}')">View</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function moveIndicator() {
    const active = $('.nav-item.active');
    const ind = $('.nav-indicator');
    if (!active || !ind) return;
    const rect = active.getBoundingClientRect();
    const parent = active.parentElement.getBoundingClientRect();
    const y = rect.top - parent.top;
    ind.style.transform = `translateY(${y}px)`;
}

function setupNav() {
    $$('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            $$('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            moveIndicator();
            const id = item.getAttribute('href');
            const el = document.querySelector(id);
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
    moveIndicator();
}

function initSettings() {
    $('#themeToggle').addEventListener('click', () => document.body.classList.toggle('alt-theme'));
    $('#motionToggle').addEventListener('change', (e) => {
        document.body.style.setProperty('prefers-reduced-motion', e.target.checked ? 'no-preference' : 'reduce');
    });
    
    // Load saved settings
    try {
        const settings = JSON.parse(localStorage.getItem('ncc_user_settings') || '{}');
        $('#emailNotifications').checked = settings.emailNotifications !== false;
        $('#smsNotifications').checked = settings.smsNotifications === true;
        $('#motionToggle').checked = settings.motionToggle !== false;
    } catch {}
    
    // Save settings on change
    $$('.setting-item input[type="checkbox"]').forEach(input => {
        input.addEventListener('change', saveSettings);
    });
}

function saveSettings() {
    const settings = {
        emailNotifications: $('#emailNotifications').checked,
        smsNotifications: $('#smsNotifications').checked,
        motionToggle: $('#motionToggle').checked
    };
    try {
        localStorage.setItem('ncc_user_settings', JSON.stringify(settings));
    } catch {}
}

function initActions() {
    $('#editProfile').addEventListener('click', () => {
        alert('Edit Profile feature coming soon!');
    });
    
    $('#changePassword').addEventListener('click', () => {
        alert('Change Password feature coming soon!');
    });
    
    $('#newEnrollment').addEventListener('click', () => {
        window.location.href = '../index.html#enroll';
    });
    
    $('#logout').addEventListener('click', async () => {
        try {
            // Clear session using database manager
            const session = await getCurrentUser();
            if (session) {
                await db.clearSession(session.email);
            }
            window.location.href = '../index.html';
        } catch (error) {
            console.error('Logout error:', error);
            window.location.href = '../index.html';
        }
    });
}

function viewEnrollment(course) {
    alert(`Viewing details for: ${course}`);
}

function onResize() { moveIndicator(); }

async function init() {
    const user = await guardAccess();
    if (!user) return;
    
    reveal(); setupNav(); initSettings(); initActions();
    await populateUserProfile(user); 
    await populateUserEnrollments(user);
    window.addEventListener('resize', onResize);
}

document.addEventListener('DOMContentLoaded', init);
