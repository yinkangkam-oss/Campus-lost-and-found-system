// Main JavaScript file for Campus Lost & Found System
// Handles all frontend functionality
// GitHub Pages routing fixes + safer detail routing

// Backend server URL (THIS MUST be your BACKEND, not GitHub Pages)
const API_ORIGIN = "https://campus-lost-and-found-system-pkiq.onrender.com"; // change to your deployed backend domain when you deploy backend

const API_BASE = `${API_ORIGIN}/api/items`;
let currentItems = [];
let currentFilter = 'all';
let currentSearchTerm = '';
let currentFilters = {};

// User authentication
let loggedInUser = null;

// --------------------------------------------
// Helpers for GitHub Pages
// --------------------------------------------
function goHome() {
    window.location.href = './index.html';
}

function goAuth() {
    window.location.href = './auth.html';
}

function goAddItem() {
    window.location.href = './add-item.html';
}

function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

// If backend returns image_path like "/uploads/xxx.jpg", convert it to absolute.
function resolveImagePath(p) {
    if (!p) return '';

    // If already absolute (http/https or // or data:) keep it
    if (/^(https?:)?\/\//i.test(p) || /^data:/i.test(p)) return p;

    // If server-style absolute path e.g. "/uploads/a.jpg"
    if (p.startsWith('/')) return `${API_ORIGIN}${p}`;

    // Otherwise leave as is (relative paths)
    return p;
}

// --------------------------------------------
// Safer JSON parse helper (prevents "Unexpected token <")
// --------------------------------------------
async function safeJson(response) {
    const text = await response.text();
    try {
        return JSON.parse(text);
    } catch (e) {
        // If server returned HTML (like an error page), show it as a readable error
        throw new Error(`Server did not return JSON. Status=${response.status}. Body starts with: ${text.slice(0, 80)}`);
    }
}

// --------------------------------------------
// Check for existing session on page load
// --------------------------------------------
async function checkAuthStatus() {
    try {
        const response = await fetch(`${API_ORIGIN}/api/auth/me`, {
            credentials: 'include' // ✅ IMPORTANT: keep session cookie
        });

        if (response.ok) {
            const data = await safeJson(response);
            if (data.success) {
                loggedInUser = data.user;
            } else {
                loggedInUser = null;
            }
        } else {
            loggedInUser = null;
        }
    } catch (error) {
        console.log('Not authenticated or server unreachable:', error.message);
        loggedInUser = null;
    }
    updateNavigation();
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async function () {
    console.log('DOM loaded');

    // Check authentication status first
    await checkAuthStatus();

    // Load items if on main page
    if (document.getElementById('itemsContainer')) {
        loadItems();
        setupFilterButtons();
        setupSearch();
        setupAdvancedFilters();
    }

    // Setup form if on add item page
    if (document.getElementById('itemForm')) {
        console.log('Form found, setting up...');
        setupForm();
        setupImagePreview();
    }

    // Load item details if on detail page
    if (document.getElementById('itemDetail')) {
        loadItemDetail();
    }

    // Setup auth page if on auth page
    if (document.getElementById('loginForm') || document.getElementById('registerForm')) {
        setupAuthPage();
    }

    // Setup delete modal
    setupDeleteModal();
});

// ============================================
// NAVIGATION (shows user status)
// ============================================
function updateNavigation() {
    const authLinks = document.getElementById('authLinks');
    if (!authLinks) return;

    if (loggedInUser) {
        authLinks.innerHTML = `
            <div style="display: flex; gap: 15px; align-items: center;">
                <span style="color: white; display: flex; align-items: center; gap: 5px;">
                    <i class="bi bi-person-circle"></i> ${loggedInUser.full_name || loggedInUser.username}
                </span>
                <a href="#" onclick="logout(); return false;" style="color: white;">
                    <i class="bi bi-box-arrow-right"></i> Logout
                </a>
            </div>
        `;
    } else {
        authLinks.innerHTML = '<a href="./auth.html"><i class="bi bi-person"></i> Login</a>';
    }
}

// ============================================
// LOGOUT FUNCTION
// ============================================
window.logout = async function () {
    try {
        const response = await fetch(`${API_ORIGIN}/api/auth/logout`, {
            credentials: 'include' // ✅ IMPORTANT
        });

        const data = await safeJson(response);
        if (data.success) {
            loggedInUser = null;
            updateNavigation();
            goHome();
        } else {
            console.error('Logout failed:', data.message);
        }
    } catch (error) {
        console.error('Logout error:', error.message);
    }
};

// ============================================
// AUTH PAGE FUNCTIONS
// ============================================
function setupAuthPage() {
    console.log('Setting up auth page');
    setupAuthToggles();
    setupLoginForm();
    setupRegisterForm();
}

function setupAuthToggles() {
    const showLoginBtn = document.getElementById('showLoginBtn');
    const showRegisterBtn = document.getElementById('showRegisterBtn');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (!showLoginBtn || !showRegisterBtn || !loginForm || !registerForm) return;

    showLoginBtn.addEventListener('click', function () {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        this.classList.add('btn-primary');
        this.classList.remove('btn-secondary');
        showRegisterBtn.classList.add('btn-secondary');
        showRegisterBtn.classList.remove('btn-primary');
        clearAuthMessage();
    });

    showRegisterBtn.addEventListener('click', function () {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        this.classList.add('btn-primary');
        this.classList.remove('btn-secondary');
        showLoginBtn.classList.add('btn-secondary');
        showLoginBtn.classList.remove('btn-primary');
        clearAuthMessage();
    });
}

// ============================================
// LOGIN FORM
// ============================================
function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const username = document.getElementById('loginUsername')?.value;
        const password = document.getElementById('loginPassword')?.value;

        if (!username || !password) {
            showAuthMessage('Please fill in all fields', 'error');
            return;
        }

        try {
            const response = await fetch(`${API_ORIGIN}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // ✅ IMPORTANT
                body: JSON.stringify({ username, password })
            });

            const data = await safeJson(response);

            if (data.success) {
                loggedInUser = data.user;
                showAuthMessage('Login successful! Redirecting...', 'success');

                // ✅ immediately verify session (optional but useful)
                await checkAuthStatus();

                setTimeout(() => {
                    goHome();
                }, 800);
            } else {
                showAuthMessage(data.message || 'Invalid username or password', 'error');
            }
        } catch (error) {
            console.error('Login error:', error.message);
            showAuthMessage('Network/server error. Please try again.', 'error');
        }
    });
}

function setupRegisterForm() {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) return;

    registerForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const password = document.getElementById('regPassword')?.value;
        const confirm = document.getElementById('regConfirmPassword')?.value;

        if (password !== confirm) {
            showAuthMessage('Passwords do not match!', 'error');
            return;
        }

        const fullName = document.getElementById('regFullName')?.value;
        const username = document.getElementById('regUsername')?.value;
        const email = document.getElementById('regEmail')?.value;
        const studentId = document.getElementById('regStudentId')?.value;

        if (!fullName || !username || !email || !password) {
            showAuthMessage('Please fill in all required fields', 'error');
            return;
        }

        try {
            const response = await fetch(`${API_ORIGIN}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // ✅ IMPORTANT (safe to include)
                body: JSON.stringify({
                    username,
                    email,
                    password,
                    full_name: fullName,
                    student_id: studentId
                })
            });

            const data = await safeJson(response);

            if (data.success) {
                showAuthMessage('Registration successful! Please login.', 'success');
                setTimeout(() => {
                    const showLoginBtn = document.getElementById('showLoginBtn');
                    if (showLoginBtn) showLoginBtn.click();
                    registerForm.reset();
                }, 1500);
            } else {
                showAuthMessage(data.message || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error.message);
            showAuthMessage('Network/server error. Please try again.', 'error');
        }
    });
}

function showAuthMessage(message, type) {
    const messageDiv = document.getElementById('message');
    if (!messageDiv) return;

    const alertClass = type === 'success' ? 'alert-success' : 'alert-error';
    const icon = type === 'success' ? 'bi-check-circle' : 'bi-exclamation-circle';
    messageDiv.innerHTML = `<div class="alert ${alertClass}"><i class="bi ${icon}"></i> ${message}</div>`;
}

function clearAuthMessage() {
    const messageDiv = document.getElementById('message');
    if (messageDiv) messageDiv.innerHTML = '';
}

// ============================================
// LOGIN WARNING MODAL
// ============================================
function showLoginWarning() {
    let warningModal = document.getElementById('loginWarningModal');

    if (!warningModal) {
        const modalHTML = `
            <div id="loginWarningModal" class="modal" style="display: block; z-index: 9999;">
                <div class="modal-content" style="max-width: 400px; text-align: center;">
                    <span class="close-modal" onclick="closeLoginWarning()">&times;</span>
                    <i class="bi bi-exclamation-triangle" style="font-size: 60px; color: #f39c12;"></i>
                    <h3 style="margin: 20px 0; color: #2c3e50;">Login Required</h3>
                    <p style="margin-bottom: 30px; color: #666;">
                        You must be logged in to report a lost or found item.
                    </p>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <a href="./auth.html" class="btn btn-primary">
                            <i class="bi bi-box-arrow-in-right"></i> Go to Login
                        </a>
                        <button class="btn btn-secondary" onclick="closeLoginWarning()">
                            <i class="bi bi-x-circle"></i> Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    } else {
        warningModal.style.display = 'block';
    }
}

window.closeLoginWarning = function () {
    const modal = document.getElementById('loginWarningModal');
    if (modal) modal.style.display = 'none';
};

window.checkLoginBeforeReport = function (event) {
    if (!loggedInUser) {
        event.preventDefault();
        showLoginWarning();
        return false;
    }
    return true;
};

// ============================================
// IMAGE PREVIEW FUNCTIONALITY
// ============================================
function setupImagePreview() {
    const imageInput = document.getElementById('image');
    if (!imageInput) return;

    imageInput.addEventListener('change', function (e) {
        const preview = document.getElementById('imagePreview');
        if (!preview) return;

        const previewImg = preview.querySelector('img');
        const file = e.target.files[0];

        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                previewImg.src = e.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            preview.style.display = 'none';
        }
    });
}

// ============================================
// SEARCH FUNCTIONALITY
// ============================================
function setupSearch() {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');

    if (searchBtn) searchBtn.addEventListener('click', performSearch);

    if (searchInput) {
        searchInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') performSearch();
        });
    }

    if (clearSearchBtn) clearSearchBtn.addEventListener('click', clearSearch);
}

function setupAdvancedFilters() {
    const toggleBtn = document.getElementById('toggleFilters');
    const advancedFilters = document.getElementById('advancedFilters');
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');

    if (toggleBtn && advancedFilters) {
        toggleBtn.addEventListener('click', function () {
            if (advancedFilters.style.display === 'none') {
                advancedFilters.style.display = 'block';
                toggleBtn.innerHTML = '<i class="bi bi-funnel"></i> Hide Filters';
            } else {
                advancedFilters.style.display = 'none';
                toggleBtn.innerHTML = '<i class="bi bi-funnel"></i> Advanced Filters';
            }
        });
    }

    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', function () {
            currentFilters = {
                category: document.getElementById('filterCategory')?.value || '',
                status: document.getElementById('filterStatus')?.value || '',
                fromDate: document.getElementById('filterFromDate')?.value || '',
                toDate: document.getElementById('filterToDate')?.value || ''
            };
            performSearch();
        });
    }

    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function () {
            if (document.getElementById('filterCategory')) document.getElementById('filterCategory').value = '';
            if (document.getElementById('filterStatus')) document.getElementById('filterStatus').value = '';
            if (document.getElementById('filterFromDate')) document.getElementById('filterFromDate').value = '';
            if (document.getElementById('filterToDate')) document.getElementById('filterToDate').value = '';

            currentFilters = {};

            if (currentSearchTerm) performSearch();
            else loadItems();
        });
    }
}

async function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput ? searchInput.value.trim() : '';
    currentSearchTerm = searchTerm;

    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.style.display = 'block';

    let queryString = `?q=${encodeURIComponent(searchTerm)}`;
    if (currentFilters.category) queryString += `&category=${currentFilters.category}`;
    if (currentFilters.status) queryString += `&status=${currentFilters.status}`;
    if (currentFilters.fromDate) queryString += `&fromDate=${currentFilters.fromDate}`;
    if (currentFilters.toDate) queryString += `&toDate=${currentFilters.toDate}`;

    try {
        const response = await fetch(`${API_BASE}/search/advanced${queryString}`, {
            credentials: 'include' // optional, safe
        });
        const data = await safeJson(response);

        if (spinner) spinner.style.display = 'none';

        if (data.success) {
            currentItems = data.data;
            filterAndDisplayItems();

            const resultsMsg = document.getElementById('searchResultsMsg');
            if (resultsMsg) {
                resultsMsg.innerHTML = `
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle"></i> Found ${data.count} items
                        ${searchTerm ? ` matching "${searchTerm}"` : ''}
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Search error:', error.message);
        if (spinner) spinner.style.display = 'none';
        showError('Error performing search');
    }
}

window.clearSearch = function () {
    const searchInput = document.getElementById('searchInput');
    const resultsMsg = document.getElementById('searchResultsMsg');

    if (searchInput) searchInput.value = '';
    currentSearchTerm = '';
    currentFilters = {};

    if (document.getElementById('filterCategory')) document.getElementById('filterCategory').value = '';
    if (document.getElementById('filterStatus')) document.getElementById('filterStatus').value = '';
    if (document.getElementById('filterFromDate')) document.getElementById('filterFromDate').value = '';
    if (document.getElementById('filterToDate')) document.getElementById('filterToDate').value = '';

    if (resultsMsg) resultsMsg.innerHTML = '';

    loadItems();
};

// ============================================
// LOAD AND DISPLAY ITEMS
// ============================================
function loadItems() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.style.display = 'block';

    fetch(API_BASE, { credentials: 'include' }) // optional, safe
        .then(async (response) => {
            const data = await safeJson(response);
            if (spinner) spinner.style.display = 'none';

            if (data.success) {
                currentItems = data.data;
                filterAndDisplayItems();
            } else {
                showError('Failed to load items');
            }
        })
        .catch(error => {
            console.error('Error:', error.message);
            if (spinner) spinner.style.display = 'none';
            showError('Network error');
        });
}

function filterAndDisplayItems() {
    const container = document.getElementById('itemsContainer');
    if (!container) return;

    let filteredItems = currentFilter === 'all'
        ? currentItems
        : currentItems.filter(item => item.category === currentFilter);

    if (filteredItems.length === 0) {
        container.innerHTML = `<div class="alert alert-info">No ${currentFilter === 'all' ? '' : currentFilter} items found.</div>`;
        return;
    }

    container.innerHTML = filteredItems.map(item => createItemCard(item)).join('');
    attachEventListeners();
}

function createItemCard(item) {
    const description = item.description
        ? item.description.substring(0, 150) + (item.description.length > 150 ? '...' : '')
        : '';
    const dateStr = formatDate(item.date);

    const postedBy = item.full_name
        ? `<small class="posted-by"><i class="bi bi-person-circle"></i> ${escapeHtml(item.full_name)}</small>`
        : '<small class="posted-by"><i class="bi bi-person-circle"></i> Anonymous</small>';

    const imgSrc = item.image_path ? resolveImagePath(item.image_path) : '';
    const imageHtml = imgSrc
        ? `<div class="item-image-container"><img src="${imgSrc}" alt="${escapeHtml(item.title)}" class="item-thumbnail" loading="lazy"></div>`
        : `<div class="item-image-container no-image"><i class="bi bi-image" style="font-size: 40px; color: #ccc;"></i></div>`;

    const actionButtons = (loggedInUser && loggedInUser.id === item.user_id) ? `
        <select class="status-select" data-id="${item.id}">
            <option value="active" ${item.status === 'active' ? 'selected' : ''}>Active</option>
            <option value="claimed" ${item.status === 'claimed' ? 'selected' : ''}>Claimed</option>
            <option value="resolved" ${item.status === 'resolved' ? 'selected' : ''}>Resolved</option>
        </select>
        <button class="btn btn-danger delete-btn" data-id="${item.id}"><i class="bi bi-trash"></i></button>
    ` : '';

    return `
        <div class="item-card ${item.category}">
            <span class="item-category ${item.category}">
                <i class="bi ${item.category === 'lost' ? 'bi-exclamation-circle' : 'bi-check-circle'}"></i> ${item.category}
            </span>
            ${imageHtml}
            <h3 class="item-title">${escapeHtml(item.title)}</h3>
            <p class="item-description">${escapeHtml(description)}</p>
            <div class="item-details">
                <div class="item-detail"><i class="bi bi-geo-alt"></i> <span>${escapeHtml(item.location)}</span></div>
                <div class="item-detail"><i class="bi bi-calendar"></i> <span>${dateStr}</span></div>
                <div class="item-detail"><i class="bi bi-telephone"></i> <span>${escapeHtml(item.contact_info)}</span></div>
            </div>
            ${postedBy}
            <div class="item-status status-${item.status}">
                <i class="bi ${getStatusIcon(item.status)}"></i> Status: ${item.status}
            </div>
            <div class="item-actions">
                <button class="btn btn-primary view-btn" data-id="${item.id}"><i class="bi bi-eye"></i> View</button>
                ${actionButtons}
            </div>
        </div>
    `;
}

function attachEventListeners() {
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.preventDefault();
            window.location.href = `./item-detail.html?id=${encodeURIComponent(btn.dataset.id)}`;
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.preventDefault();
            showDeleteModal(btn.dataset.id);
        });
    });

    document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', () => {
            updateItemStatus(select.dataset.id, select.value);
        });
    });
}

// ============================================
// FILTER BUTTONS
// ============================================
function setupFilterButtons() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            filterAndDisplayItems();
        });
    });
}

// ============================================
// FORM SUBMISSION
// ============================================
function setupForm() {
    const form = document.getElementById('itemForm');
    if (!form) return;

    console.log('Form found, adding submit handler');

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        console.log('Form submitted');

        if (!loggedInUser) {
            showLoginWarning();
            return;
        }

        const formData = new FormData(form);

        const title = document.getElementById('title')?.value.trim();
        const description = document.getElementById('description')?.value.trim();
        const category = document.getElementById('category')?.value;
        const location = document.getElementById('location')?.value.trim();
        const date = document.getElementById('date')?.value;
        const contact = document.getElementById('contact_info')?.value.trim();

        if (!title || !description || !category || !location || !date || !contact) {
            alert('Please fill in all required fields');
            return;
        }

        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Submitting...';
        }

        try {
            const response = await fetch(API_BASE, {
                method: 'POST',
                credentials: 'include', // ✅ IMPORTANT so server knows who is posting
                body: formData
            });

            const result = await safeJson(response);

            if (result.success) {
                alert('Item submitted successfully!');
                goHome();
            } else {
                alert('Error: ' + (result.message || 'Unknown error'));
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="bi bi-check-circle"></i> Submit Report';
                }
            }
        } catch (error) {
            console.error('Fetch error:', error.message);
            alert('Network error: ' + error.message);
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="bi bi-check-circle"></i> Submit Report';
            }
        }
    });
}

// ============================================
// ITEM DETAIL PAGE
// ============================================
function loadItemDetail() {
    const id = getQueryParam('id');
    const container = document.getElementById('itemDetail');

    if (!id) {
        if (container) container.innerHTML = '<div class="alert alert-error">Item not found</div>';
        return;
    }

    fetch(`${API_BASE}/${id}`, { credentials: 'include' })
        .then(async (res) => {
            const data = await safeJson(res);
            if (data.success) displayItemDetail(data.data);
            else container.innerHTML = '<div class="alert alert-error">Item not found</div>';
        })
        .catch(error => {
            console.error('Error:', error.message);
            container.innerHTML = '<div class="alert alert-error">Error loading item</div>';
        });
}

function displayItemDetail(item) {
    const container = document.getElementById('itemDetail');

    const imgSrc = item.image_path ? resolveImagePath(item.image_path) : '';
    const imageHtml = imgSrc
        ? `<div class="detail-image-container"><img src="${imgSrc}" alt="${escapeHtml(item.title)}" class="detail-image"></div>`
        : '';

    const isOwner = loggedInUser && loggedInUser.id === item.user_id;

    const actionButtons = isOwner ? `
        <select class="status-select" onchange="updateItemStatus(${item.id}, this.value)">
            <option value="active" ${item.status === 'active' ? 'selected' : ''}>Active</option>
            <option value="claimed" ${item.status === 'claimed' ? 'selected' : ''}>Claimed</option>
            <option value="resolved" ${item.status === 'resolved' ? 'selected' : ''}>Resolved</option>
        </select>
        <button class="btn btn-danger" onclick="showDeleteModal(${item.id})"><i class="bi bi-trash"></i> Delete</button>
    ` : '';

    const postedBy = item.full_name
        ? `<small><i class="bi bi-person-circle"></i> Posted by: ${escapeHtml(item.full_name)}</small>`
        : '<small><i class="bi bi-person-circle"></i> Posted by: Anonymous</small>';

    container.innerHTML = `
        <div class="item-detail-card">
            <div class="item-header">
                <h2>${escapeHtml(item.title)}</h2>
                <span class="item-category ${item.category}">
                    <i class="bi ${item.category === 'lost' ? 'bi-exclamation-circle' : 'bi-check-circle'}"></i> ${item.category}
                </span>
            </div>
            ${imageHtml}
            <div class="item-info">
                <div class="info-group">
                    <label>Description:</label>
                    <p>${escapeHtml(item.description)}</p>
                </div>
                <div class="info-grid">
                    <div class="info-group">
                        <label>Location:</label>
                        <p><i class="bi bi-geo-alt"></i> ${escapeHtml(item.location)}</p>
                    </div>
                    <div class="info-group">
                        <label>Date:</label>
                        <p><i class="bi bi-calendar"></i> ${formatDate(item.date)}</p>
                    </div>
                    <div class="info-group">
                        <label>Contact:</label>
                        <p><i class="bi bi-telephone"></i> ${escapeHtml(item.contact_info)}</p>
                    </div>
                    <div class="info-group">
                        <label>Status:</label>
                        <p><span class="status-badge status-${item.status}">
                            <i class="bi ${getStatusIcon(item.status)}"></i> ${item.status}
                        </span></p>
                    </div>
                </div>
                <div class="item-meta">
                    <small>Posted: ${formatDate(item.created_at)}</small>
                    ${postedBy}
                </div>
            </div>
            <div class="item-actions">
                <button class="btn btn-primary" onclick="window.location.href='./index.html'"><i class="bi bi-arrow-left"></i> Back</button>
                ${actionButtons}
            </div>
        </div>
    `;
}

// ============================================
// UPDATE ITEM STATUS
// ============================================
function updateItemStatus(id, status) {
    fetch(`${API_BASE}/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // ✅ IMPORTANT for auth
        body: JSON.stringify({ status })
    })
        .then(async (res) => {
            const data = await safeJson(res);
            if (data.success) {
                alert('Status updated!');
                window.location.reload();
            } else {
                alert('Error updating status: ' + (data.message || 'You may not own this item'));
            }
        })
        .catch(error => {
            console.error('Error:', error.message);
            alert('Network error');
        });
}

// ============================================
// DELETE FUNCTIONALITY
// ============================================
function setupDeleteModal() {
    const modal = document.getElementById('deleteModal');
    if (!modal) return;

    const closeBtn = document.querySelector('.close-modal');
    const cancelBtn = document.getElementById('cancelDelete');
    const confirmBtn = document.getElementById('confirmDelete');

    if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
    if (cancelBtn) cancelBtn.addEventListener('click', () => modal.style.display = 'none');

    if (confirmBtn) {
        confirmBtn.addEventListener('click', function () {
            const id = this.getAttribute('data-id');
            if (id) deleteItem(id);
        });
    }

    window.addEventListener('click', function (e) {
        if (e.target === modal) modal.style.display = 'none';
    });
}

function showDeleteModal(id) {
    const modal = document.getElementById('deleteModal');
    const confirmBtn = document.getElementById('confirmDelete');

    if (modal && confirmBtn) {
        confirmBtn.setAttribute('data-id', id);
        modal.style.display = 'block';
    } else {
        alert('Error: Delete modal not found. Please refresh the page.');
    }
}

function deleteItem(id) {
    fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
        credentials: 'include' // ✅ IMPORTANT
    })
        .then(async (response) => {
            const data = await safeJson(response);
            if (data.success) {
                alert('Item deleted successfully!');
                const modal = document.getElementById('deleteModal');
                if (modal) modal.style.display = 'none';
                goHome();
            } else {
                alert('Error deleting item: ' + (data.message || 'You may not own this item'));
                const modal = document.getElementById('deleteModal');
                if (modal) modal.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error deleting item:', error.message);
            alert('Network error. Please try again.');
            const modal = document.getElementById('deleteModal');
            if (modal) modal.style.display = 'none';
        });
}

window.showDeleteModal = showDeleteModal;
window.deleteItem = deleteItem;

// ============================================
// UTILITY FUNCTIONS
// ============================================
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
}

function getStatusIcon(status) {
    const icons = { active: 'bi-clock', claimed: 'bi-hand-index', resolved: 'bi-check-circle' };
    return icons[status] || 'bi-circle';
}

function showError(message) {
    const container = document.getElementById('itemsContainer');
    if (container) {
        container.innerHTML = `<div class="alert alert-error"><i class="bi bi-exclamation-triangle"></i> ${message}</div>`;
    }
}