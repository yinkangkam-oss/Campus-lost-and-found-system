// public/js/main.js - COMPLETE FINAL VERSION WITH LOGIN WARNING

const API_BASE = '/api/items';
let currentItems = [];
let currentFilter = 'all';
let currentSearchTerm = '';
let currentFilters = {};

// Store current user globally
window.currentUser = null;

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded');
    
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
    if (document.getElementById('loginForm')) {
        setupAuthPage();
    }
    
    // Setup delete modal
    setupDeleteModal();
    
    // Check authentication status (for all pages)
    checkAuth();
});

// ============================================
// AUTHENTICATION FUNCTIONS (for all pages)
// ============================================
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/me');
        const data = await response.json();
        const authLinks = document.getElementById('authLinks');
        
        if (!authLinks) return;
        
        if (data.success) {
            // Store user globally
            window.currentUser = data.user;
            
            // User is logged in - show user name and logout
            authLinks.innerHTML = `
                <div style="display: flex; gap: 15px; align-items: center;">
                    <span style="color: white; display: flex; align-items: center; gap: 5px;">
                        <i class="bi bi-person-circle"></i> ${data.user.full_name || data.user.username}
                    </span>
                    <a href="#" onclick="window.logout()" style="color: white;">
                        <i class="bi bi-box-arrow-right"></i> Logout
                    </a>
                </div>
            `;
        } else {
            window.currentUser = null;
            authLinks.innerHTML = '<a href="/auth"><i class="bi bi-person"></i> Login</a>';
        }
    } catch (error) {
        console.error('Auth check error:', error);
        window.currentUser = null;
        const authLinks = document.getElementById('authLinks');
        if (authLinks) {
            authLinks.innerHTML = '<a href="/auth"><i class="bi bi-person"></i> Login</a>';
        }
    }
}

window.logout = async function() {
    try {
        const response = await fetch('/api/auth/logout');
        const data = await response.json();
        if (data.success) {
            window.location.reload();
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
};

// ============================================
// LOGIN WARNING MODAL
// ============================================
function showLoginWarning() {
    // Check if modal already exists
    let warningModal = document.getElementById('loginWarningModal');
    
    if (!warningModal) {
        // Create modal HTML
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
                        <a href="/auth" class="btn btn-primary">
                            <i class="bi bi-box-arrow-in-right"></i> Go to Login
                        </a>
                        <button class="btn btn-secondary" onclick="closeLoginWarning()">
                            <i class="bi bi-x-circle"></i> Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Add to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    } else {
        warningModal.style.display = 'block';
    }
}

// Make close function global
window.closeLoginWarning = function() {
    const modal = document.getElementById('loginWarningModal');
    if (modal) modal.style.display = 'none';
};

// Check login before accessing report item page
window.checkLoginBeforeReport = function(event) {
    if (!window.currentUser) {
        event.preventDefault();
        showLoginWarning();
        return false;
    }
    return true;
};

// ============================================
// AUTH PAGE FUNCTIONS (for /auth page only)
// ============================================
function setupAuthPage() {
    // Only run on auth page
    if (!document.getElementById('loginForm')) return;
    
    console.log('Setting up auth page');
    
    // Toggle between login and register forms
    const showLoginBtn = document.getElementById('showLoginBtn');
    const showRegisterBtn = document.getElementById('showRegisterBtn');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (showLoginBtn && showRegisterBtn) {
        showLoginBtn.addEventListener('click', function() {
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
            this.classList.add('btn-primary');
            this.classList.remove('btn-secondary');
            showRegisterBtn.classList.add('btn-secondary');
            showRegisterBtn.classList.remove('btn-primary');
            document.getElementById('message').innerHTML = '';
        });

        showRegisterBtn.addEventListener('click', function() {
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
            this.classList.add('btn-primary');
            this.classList.remove('btn-secondary');
            showLoginBtn.classList.add('btn-secondary');
            showLoginBtn.classList.remove('btn-primary');
            document.getElementById('message').innerHTML = '';
        });
    }

    // Handle login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Handle register form submission
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!username || !password) {
        showAuthMessage('Please fill in all fields', 'error');
        return;
    }

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        
        if (data.success) {
            showAuthMessage('Login successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
        } else {
            showAuthMessage(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAuthMessage('Network error. Please try again.', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();

    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirmPassword').value;

    if (password !== confirm) {
        showAuthMessage('Passwords do not match!', 'error');
        return;
    }

    const userData = {
        username: document.getElementById('regUsername').value,
        email: document.getElementById('regEmail').value,
        password: password,
        full_name: document.getElementById('regFullName').value,
        student_id: document.getElementById('regStudentId').value
    };

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        const data = await response.json();
        
        if (data.success) {
            showAuthMessage('Registration successful! Please login.', 'success');
            // Switch to login form
            setTimeout(() => {
                document.getElementById('showLoginBtn').click();
                document.getElementById('registerForm').reset();
            }, 2000);
        } else {
            showAuthMessage(data.message || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showAuthMessage('Network error. Please try again.', 'error');
    }
}

function showAuthMessage(message, type) {
    const messageDiv = document.getElementById('message');
    if (!messageDiv) return;
    
    const alertClass = type === 'success' ? 'alert-success' : 'alert-error';
    const icon = type === 'success' ? 'bi-check-circle' : 'bi-exclamation-circle';
    messageDiv.innerHTML = `<div class="alert ${alertClass}"><i class="bi ${icon}"></i> ${message}</div>`;
}

// ============================================
// IMAGE PREVIEW FUNCTIONALITY
// ============================================
function setupImagePreview() {
    const imageInput = document.getElementById('image');
    if (!imageInput) return;
    
    imageInput.addEventListener('change', function(e) {
        const preview = document.getElementById('imagePreview');
        if (!preview) return;
        
        const previewImg = preview.querySelector('img');
        const file = e.target.files[0];
        
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
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

    if (searchBtn) {
        searchBtn.addEventListener('click', performSearch);
    }

    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', clearSearch);
    }
}

function setupAdvancedFilters() {
    const toggleBtn = document.getElementById('toggleFilters');
    const advancedFilters = document.getElementById('advancedFilters');
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');

    if (toggleBtn && advancedFilters) {
        toggleBtn.addEventListener('click', function() {
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
        applyFiltersBtn.addEventListener('click', function() {
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
        clearFiltersBtn.addEventListener('click', function() {
            // Clear filter inputs
            if (document.getElementById('filterCategory')) document.getElementById('filterCategory').value = '';
            if (document.getElementById('filterStatus')) document.getElementById('filterStatus').value = '';
            if (document.getElementById('filterFromDate')) document.getElementById('filterFromDate').value = '';
            if (document.getElementById('filterToDate')) document.getElementById('filterToDate').value = '';
            
            currentFilters = {};
            
            if (currentSearchTerm) {
                performSearch();
            } else {
                loadItems();
            }
        });
    }
}

async function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput ? searchInput.value.trim() : '';
    currentSearchTerm = searchTerm;

    // Show loading spinner
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.style.display = 'block';

    // Build query string
    let queryString = `?q=${encodeURIComponent(searchTerm)}`;
    
    if (currentFilters.category) {
        queryString += `&category=${currentFilters.category}`;
    }
    if (currentFilters.status) {
        queryString += `&status=${currentFilters.status}`;
    }
    if (currentFilters.fromDate) {
        queryString += `&fromDate=${currentFilters.fromDate}`;
    }
    if (currentFilters.toDate) {
        queryString += `&toDate=${currentFilters.toDate}`;
    }

    try {
        const response = await fetch(`${API_BASE}/search/advanced${queryString}`);
        const data = await response.json();
        
        // Hide spinner
        if (spinner) spinner.style.display = 'none';
        
        if (data.success) {
            currentItems = data.data;
            filterAndDisplayItems();
            
            // Show results message
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
        console.error('Search error:', error);
        if (spinner) spinner.style.display = 'none';
        showError('Error performing search');
    }
}

window.clearSearch = function() {
    const searchInput = document.getElementById('searchInput');
    const resultsMsg = document.getElementById('searchResultsMsg');
    
    if (searchInput) searchInput.value = '';
    currentSearchTerm = '';
    currentFilters = {};
    
    // Clear filter inputs
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
    
    fetch(API_BASE)
        .then(response => response.json())
        .then(data => {
            if (spinner) spinner.style.display = 'none';
            
            if (data.success) {
                currentItems = data.data;
                filterAndDisplayItems();
            } else {
                showError('Failed to load items');
            }
        })
        .catch(error => {
            console.error('Error:', error);
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
    const description = item.description?.substring(0, 150) + (item.description?.length > 150 ? '...' : '') || '';
    const dateStr = formatDate(item.date);
    
    // Show poster name if available
    const postedBy = item.full_name ? 
        `<small class="posted-by"><i class="bi bi-person-circle"></i> ${escapeHtml(item.full_name)}</small>` : 
        '<small class="posted-by"><i class="bi bi-person-circle"></i> Anonymous</small>';
    
    const imageHtml = item.image_path 
        ? `<div class="item-image-container"><img src="${item.image_path}" alt="${escapeHtml(item.title)}" class="item-thumbnail" loading="lazy"></div>`
        : `<div class="item-image-container no-image"><i class="bi bi-image" style="font-size: 40px; color: #ccc;"></i></div>`;
    
    // Only show edit/delete buttons if user owns this item
    const actionButtons = (window.currentUser && window.currentUser.id === item.user_id) ? `
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
            window.location.href = `/item/${btn.dataset.id}`;
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.preventDefault();
            showDeleteModal(btn.dataset.id);
        });
    });
    
    document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', e => {
            updateItemStatus(select.dataset.id, select.value);
        });
    });
}

// ============================================
// FILTER BUTTONS
// ============================================
function setupFilterButtons() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            filterAndDisplayItems();
        });
    });
}

// ============================================
// FORM SUBMISSION - WITH LOGIN CHECK
// ============================================
function setupForm() {
    const form = document.getElementById('itemForm');
    if (!form) return;
    
    console.log('Form found, adding submit handler');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('Form submitted');
        
        // Check if user is logged in FIRST
        if (!window.currentUser) {
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
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('Item submitted successfully!');
                window.location.href = '/';
            } else {
                // Check if error is due to authentication
                if (response.status === 401) {
                    showLoginWarning();
                } else {
                    alert('Error: ' + (result.message || 'Unknown error'));
                }
                
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="bi bi-check-circle"></i> Submit Report';
                }
            }
        } catch (error) {
            console.error('Fetch error:', error);
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
    const id = window.location.pathname.split('/').pop();
    const container = document.getElementById('itemDetail');
    
    fetch(`${API_BASE}/${id}`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                displayItemDetail(data.data);
            } else {
                container.innerHTML = '<div class="alert alert-error">Item not found</div>';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            container.innerHTML = '<div class="alert alert-error">Error loading item</div>';
        });
}

function displayItemDetail(item) {
    const container = document.getElementById('itemDetail');
    
    const imageHtml = item.image_path 
        ? `<div class="detail-image-container"><img src="${item.image_path}" alt="${escapeHtml(item.title)}" class="detail-image"></div>`
        : '';
    
    // Check if current user owns this item
    const isOwner = window.currentUser && window.currentUser.id === item.user_id;
    
    // Show edit/delete buttons only for owner
    const actionButtons = isOwner ? `
        <select class="status-select" onchange="updateItemStatus(${item.id}, this.value)">
            <option value="active" ${item.status === 'active' ? 'selected' : ''}>Active</option>
            <option value="claimed" ${item.status === 'claimed' ? 'selected' : ''}>Claimed</option>
            <option value="resolved" ${item.status === 'resolved' ? 'selected' : ''}>Resolved</option>
        </select>
        <button class="btn btn-danger" onclick="showDeleteModal(${item.id})"><i class="bi bi-trash"></i> Delete</button>
    ` : '';
    
    // Show posted by info
    const postedBy = item.full_name ? 
        `<small><i class="bi bi-person-circle"></i> Posted by: ${escapeHtml(item.full_name)}</small>` : 
        '<small><i class="bi bi-person-circle"></i> Posted by: Anonymous</small>';
    
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
                <button class="btn btn-primary" onclick="window.location.href='/'"><i class="bi bi-arrow-left"></i> Back</button>
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
        body: JSON.stringify({ status })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('Status updated!');
            window.location.reload();
        } else {
            alert('Error updating status: ' + (data.message || 'You may not own this item'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Network error');
    });
}

// ============================================
// DELETE FUNCTIONALITY
// ============================================
function setupDeleteModal() {
    const modal = document.getElementById('deleteModal');
    if (!modal) {
        console.log('Delete modal not found - this is normal on non-detail pages');
        return;
    }
    
    console.log('Setting up delete modal');
    
    const closeBtn = document.querySelector('.close-modal');
    const cancelBtn = document.getElementById('cancelDelete');
    const confirmBtn = document.getElementById('confirmDelete');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }
    
    if (confirmBtn) {
        confirmBtn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            console.log('Confirm delete clicked for ID:', id);
            if (id) {
                deleteItem(id);
            }
        });
    }
    
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Global delete functions
function showDeleteModal(id) {
    console.log('showDeleteModal called with ID:', id);
    const modal = document.getElementById('deleteModal');
    const confirmBtn = document.getElementById('confirmDelete');
    
    if (modal && confirmBtn) {
        confirmBtn.setAttribute('data-id', id);
        modal.style.display = 'block';
        console.log('Modal displayed');
    } else {
        console.log('Modal or confirm button missing!');
        alert('Error: Delete modal not found. Please refresh the page.');
    }
}

function deleteItem(id) {
    console.log('deleteItem called with ID:', id);
    
    fetch(`${API_BASE}/${id}`, {
        method: 'DELETE'
    })
    .then(response => {
        console.log('Delete response status:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('Delete result:', data);
        if (data.success) {
            alert('Item deleted successfully!');
            const modal = document.getElementById('deleteModal');
            if (modal) modal.style.display = 'none';
            window.location.href = '/';
        } else {
            alert('Error deleting item: ' + (data.message || 'You may not own this item'));
            const modal = document.getElementById('deleteModal');
            if (modal) modal.style.display = 'none';
        }
    })
    .catch(error => {
        console.error('Error deleting item:', error);
        alert('Network error. Please try again.');
        const modal = document.getElementById('deleteModal');
        if (modal) modal.style.display = 'none';
    });
}

// Make functions globally available
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