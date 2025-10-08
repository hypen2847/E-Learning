const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const ADMIN_KEY = 'ncc_admin_logged_in_v1';
const ENROLL_KEY = 'ncc_enrollments_v1';
const USERS_KEY = 'ncc_users_v1';

function isAdmin() { try { return localStorage.getItem(ADMIN_KEY) === '1'; } catch { return false; } }
function readJSON(key, fallback = []) { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } }

function guardAccess() {
    if (!isAdmin()) {
        // Immediately redirect to main site admin login
        window.location.href = '../index.html#admin';
        return false;
    }
    return true;
}

function reveal() {
    const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) { e.target.classList.add('show'); io.unobserve(e.target); }
        });
    }, { threshold: 0.12 });
    $$('.reveal').forEach(el => io.observe(el));
}

function attachTilt() {
    const strength = 12; const resetMs = 180;
    $$('.tilt-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const r = card.getBoundingClientRect();
            const cx = r.left + r.width / 2; const cy = r.top + r.height / 2;
            const dx = (e.clientX - cx) / (r.width / 2); const dy = (e.clientY - cy) / (r.height / 2);
            const rx = (dy * strength).toFixed(2); const ry = (-dx * strength).toFixed(2);
            card.style.transform = `translateY(-4px) rotateX(${rx}deg) rotateY(${ry}deg)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transition = `transform ${resetMs}ms ease`;
            card.style.transform = '';
            setTimeout(() => (card.style.transition = ''), resetMs);
        });
    });
}

function formatDate(ts) { return new Date(ts).toLocaleString(); }

function populateTop() {
    const users = readJSON(USERS_KEY);
    const enrolls = readJSON(ENROLL_KEY);
    $('#kpiUsers').textContent = String(users.length);
    $('#kpiEnrollments').textContent = String(enrolls.length);
    const conversion = users.length ? Math.min(100, Math.round((enrolls.length / users.length) * 100)) : 0;
    $('#kpiConversion').textContent = `${conversion}%`;
}

function countByDay(items, dateField) {
    const now = new Date();
    const days = Array.from({ length: 14 }, (_, i) => {
        const d = new Date(now); d.setDate(now.getDate() - (13 - i));
        const key = d.toISOString().slice(0, 10);
        return { key, day: d, value: 0 };
    });
    items.forEach(it => {
        const key = new Date(it[dateField]).toISOString().slice(0, 10);
        const bucket = days.find(d => d.key === key);
        if (bucket) bucket.value += 1;
    });
    return days;
}

function drawLine(canvas, points, color) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.clientWidth * devicePixelRatio;
    const h = canvas.height = canvas.clientHeight * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    const max = Math.max(1, ...points.map(p => p.value));
    const pad = 10; const innerW = canvas.clientWidth - pad * 2; const innerH = canvas.clientHeight - pad * 2;
    ctx.lineWidth = 2; ctx.strokeStyle = color; ctx.beginPath();
    points.forEach((p, i) => {
        const x = pad + (i / (points.length - 1)) * innerW;
        const y = pad + innerH - (p.value / max) * innerH;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    // gradient fill
    const grad = ctx.createLinearGradient(0, pad, 0, innerH + pad);
    grad.addColorStop(0, color + '88');
    grad.addColorStop(1, color + '00');
    ctx.fillStyle = grad; ctx.lineTo(pad + innerW, pad + innerH); ctx.lineTo(pad, pad + innerH); ctx.closePath(); ctx.fill();
}

function renderCharts() {
    const enrolls = readJSON(ENROLL_KEY);
    const users = readJSON(USERS_KEY);
    const ePoints = countByDay(enrolls, 'timestamp');
    const uPoints = countByDay(users, 'createdAt');
    drawLine($('#enrollChart'), ePoints, '#7c5cff');
    drawLine($('#usersChart'), uPoints, '#00e0a4');
}

function populateTables() {
    const enrolls = readJSON(ENROLL_KEY).slice(-100).reverse();
    const et = $('#enrollTable tbody'); et.innerHTML = '';
    enrolls.forEach((e, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${i + 1}</td><td>${e.fullName}</td><td>${e.email}</td><td>${e.compactMobile}</td><td>${e.course}</td><td>${formatDate(e.timestamp)}</td>`;
        et.appendChild(tr);
    });
    const users = readJSON(USERS_KEY).slice(-100).reverse();
    const ut = $('#usersTable tbody'); ut.innerHTML = '';
    users.forEach((u, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${i + 1}</td><td>${u.name}</td><td>${u.email}</td><td>${u.compactMobile || ''}</td><td>${formatDate(u.createdAt)}</td>`;
        ut.appendChild(tr);
    });
}

function animateNumbers() {
    const els = $$('.kpi-value');
    els.forEach(el => {
        const target = Number(el.textContent.replace(/[^0-9]/g, '')) || 0;
        let cur = 0; const steps = 30; const step = Math.max(1, Math.round(target / steps));
        const id = setInterval(() => {
            cur += step; if (cur >= target) { cur = target; clearInterval(id); }
            el.textContent = el.textContent.includes('%') ? `${cur}%` : String(cur);
        }, 20);
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

function initAccount() {
    const sess = localStorage.getItem('ncc_session_v1');
    if (sess) {
        try {
            const { email } = JSON.parse(sess);
            $('#adminEmail').textContent = email;
            const name = email.split('@')[0];
            $('#adminName').textContent = name;
            $('#avatar').textContent = name.slice(0,2).toUpperCase();
        } catch {}
    }
    $('#logout').addEventListener('click', () => {
        localStorage.setItem(ADMIN_KEY, '0');
        window.location.href = '../index.html#admin';
    });
}

function initSettings() {
    $('#themeToggle').addEventListener('click', () => document.body.classList.toggle('alt-theme'));
    $('#motionToggle').addEventListener('change', (e) => {
        document.body.style.setProperty('prefers-reduced-motion', e.target.checked ? 'no-preference' : 'reduce');
    });
}

function onResize() { moveIndicator(); renderCharts(); }

function init() {
    if (!guardAccess()) return; // Will redirect immediately if not admin
    reveal(); attachTilt(); setupNav(); initAccount(); initSettings();
    populateTop(); renderCharts(); populateTables(); animateNumbers();
    window.addEventListener('resize', onResize);
}

document.addEventListener('DOMContentLoaded', init);


