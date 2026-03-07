// Campus Lost & Found System - Main JavaScript File
// Works for both localhost:3000 and GitHub Pages + Render backend

const IS_LOCALHOST =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

const FRONTEND_IS_GITHUB_PAGES = window.location.hostname === 'yinkangkam-oss.github.io';

const BACKEND_ORIGIN = IS_LOCALHOST
    ? window.location.origin
    : 'https://campus-lost-and-found-system-pkiq.onrender.com';

const API_BASE = `${BACKEND_ORIGIN}/api/items`;

function getPagePath(page) {
    if (IS_LOCALHOST) {
        switch (page) {
            case 'home':
                return '/';
            case 'auth':
                return '/auth';
            case 'add-item':
                return '/add-item';
            case 'item-detail':
                return '/item-detail.html';
            default:
                return '/';
        }
    }

    switch (page) {
        case 'home':
            return './index.html';
        case 'auth':
            return './auth.html';
        case 'add-item':
            return './add-item.html';
        case 'item-detail':
            return './item-detail.html';
        default:
            return './index.html';
    }
}

function goToHome() {
    window.location.href = getPagePath('home');
}

function goToAuth() {
    window.location.href = getPagePath('auth');
}

function goToAddItem() {
    window.location.href = getPagePath('add-item');
}

function goToItemDetail(id) {
    if (IS_LOCALHOST) {
        window.location.href = `/item/${id}`;
    } else {
        window.location.href = `./item-detail.html?id=${id}`;
    }
}

function getCurrentItemId() {
    if (IS_LOCALHOST) {
        const parts = window.location.pathname.split('/').filter(Boolean);
        return parts[parts.length - 1];
    }

    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

function showMessage(message, type = 'info') {
    const existing = document.querySelector('.alert-message');
    if (existing) existing.remove();

    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-message`;
    alert.style.margin = '15px 0';
    alert.textContent = message;

    const container = document.querySelector('.container') || document.body;
    container.prepend(alert);

    setTimeout(() => {
        alert.remove();
    }, 4000);
}

async function checkAuthStatus() {
    try {
        const response = await fetch(`${BACKEND_ORIGIN}/api/auth/me`, {
            credentials: 'include'
        });

        const authLinks = document.getElementById('authLinks');
        if (!authLinks) return null;

        if (response.ok) {
            const data = await response.json();
            const user = data.user || data;

            authLinks.innerHTML = `
                <a href="#" id="logoutBtn"><i class="bi bi-box-arrow-right"></i> Logout (${user.username || user.full_name || 'User'})</a>
            `;

            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    await logoutUser();
                });
            }

            return user;
        } else {
            authLinks.innerHTML = `<a href="${getPagePath('auth')}"><i class="bi bi-person"></i> Login</a>`;
            return null;
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        return null;
    }
}

async function logoutUser() {
    try {
        const response = await fetch(`${BACKEND_ORIGIN}/api/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });

        if (response.ok) {
            showMessage('Logged out successfully.', 'success');
            setTimeout(() => {
                goToHome();
            }, 800);
        } else {
            showMessage('Logout failed.', 'danger');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showMessage('Unable to logout right now.', 'danger');
    }
}

function checkLoginBeforeReport(event) {
    const authLinks = document.getElementById('authLinks');
    const isLoggedIn = authLinks && authLinks.textContent.toLowerCase().includes('logout');

    if (!isLoggedIn) {
        event.preventDefault();
        showMessage('Please login first before reporting an item.', 'warning');
        setTimeout(() => {
            goToAuth();
        }, 1000);
        return false;
    }

    return true;
}

async function loginUser(username, password) {
    try {
        const response = await fetch(`${BACKEND_ORIGIN}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('Login successful!', 'success');
            setTimeout(() => {
                goToHome();
            }, 1000);
        } else {
            showMessage(data.message || 'Login failed.', 'danger');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('Unable to login right now.', 'danger');
    }
}

async function registerUser(username, email, password, fullName, studentId) {
    try {
        const response = await fetch(`${BACKEND_ORIGIN}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                username,
                email,
                password,
                full_name: fullName,
                student_id: studentId
            })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('Registration successful! Please login.', 'success');
            const loginTab = document.getElementById('login-tab');
            if (loginTab) loginTab.click();
        } else {
            showMessage(data.message || 'Registration failed.', 'danger');
        }
    } catch (error) {
        console.error('Register error:', error);
        showMessage('Unable to register right now.', 'danger');
    }
}

async function loadItems(filter = 'all') {
    const container = document.getElementById('itemsContainer');
    const spinner = document.getElementById('loadingSpinner');
    if (!container) return;

    try {
        if (spinner) spinner.style.display = 'block';
        container.innerHTML = '';

        let url = API_BASE;
        if (filter && filter !== 'all') {
            url += `?category=${encodeURIComponent(filter)}`;
        }

        const response = await fetch(url, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to load items');
        }

        const data = await response.json();
        const items = Array.isArray(data) ? data : (data.items || []);

        if (!items.length) {
            container.innerHTML = '<p>No items found.</p>';
            return;
        }

        container.innerHTML = items.map(item => `
            <div class="item-card">
                <div class="item-image-wrapper">
                    <img src="${item.image_url || item.image || 'https://via.placeholder.com/300x200?text=No+Image'}" alt="${item.title}" class="item-image">
                </div>
                <div class="item-card-content">
                    <h3>${item.title}</h3>
                    <p>${item.description || 'No description available.'}</p>
                    <p><strong>Category:</strong> ${item.category || '-'}</p>
                    <p><strong>Status:</strong> ${item.status || '-'}</p>
                    <p><strong>Location:</strong> ${item.location || '-'}</p>
                    <button class="btn btn-primary view-detail-btn" data-id="${item.id}">View Details</button>
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.view-detail-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                goToItemDetail(btn.dataset.id);
            });
        });
    } catch (error) {
        console.error('Load items error:', error);
        container.innerHTML = '<p>Unable to load items right now.</p>';
    } finally {
        if (spinner) spinner.style.display = 'none';
    }
}

async function loadItemDetail() {
    const itemId = getCurrentItemId();
    if (!itemId) return;

    const container = document.getElementById('itemDetailContainer');
    if (!container) return;

    try {
        const response = await fetch(`${API_BASE}/${itemId}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to load item detail');
        }

        const item = await response.json();
        const data = item.item || item;

        container.innerHTML = `
            <div class="item-detail-card">
                <img src="${data.image_url || data.image || 'https://via.placeholder.com/500x350?text=No+Image'}" alt="${data.title}" class="item-detail-image">
                <div class="item-detail-content">
                    <h2>${data.title}</h2>
                    <p><strong>Description:</strong> ${data.description || '-'}</p>
                    <p><strong>Category:</strong> ${data.category || '-'}</p>
                    <p><strong>Status:</strong> ${data.status || '-'}</p>
                    <p><strong>Location:</strong> ${data.location || '-'}</p>
                    <p><strong>Date:</strong> ${data.date_lost_found || data.created_at || '-'}</p>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Load item detail error:', error);
        container.innerHTML = '<p>Unable to load item details.</p>';
    }
}

function initAuthPage() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('loginUsername')?.value?.trim();
            const password = document.getElementById('loginPassword')?.value;
            await loginUser(username, password);
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('registerUsername')?.value?.trim();
            const email = document.getElementById('registerEmail')?.value?.trim();
            const password = document.getElementById('registerPassword')?.value;
            const fullName = document.getElementById('registerFullName')?.value?.trim();
            const studentId = document.getElementById('registerStudentId')?.value?.trim();
            await registerUser(username, email, password, fullName, studentId);
        });
    }
}

function initFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadItems(btn.dataset.filter);
        });
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuthStatus();
    initAuthPage();
    initFilters();
    loadItems();
    loadItemDetail();
});
