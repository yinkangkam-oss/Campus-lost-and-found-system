// ============================================
// MAIN JAVASCRIPT - CAMPUS LOST & FOUND SYSTEM
// ============================================

// CHANGE THIS TO YOUR BACKEND SERVER
const API_ORIGIN = "http://localhost:3000"; 
// Example when deployed:
// const API_ORIGIN = "https://your-backend.onrender.com";

const API_BASE = `${API_ORIGIN}/api/items`;

let currentItems = [];
let currentFilter = 'all';
let currentSearchTerm = '';
let currentFilters = {};
let loggedInUser = null;


// ============================================
// HELPERS
// ============================================

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


// ============================================
// IMAGE PATH FIX
// ============================================

function resolveImagePath(p) {

    if (!p) return '';

    if (/^(https?:)?\/\//i.test(p) || /^data:/i.test(p)) {
        return p;
    }

    if (p.startsWith('/')) {
        return `${API_ORIGIN}${p}`;
    }

    return `${API_ORIGIN}/${p}`;
}


// ============================================
// CHECK LOGIN SESSION
// ============================================

async function checkAuthStatus() {

    try {

        const response = await fetch(`${API_ORIGIN}/api/auth/me`, {
            credentials: "include"
        });

        const data = await response.json();

        if (data.success) {
            loggedInUser = data.user;
        }

    } catch (error) {
        console.log("Not logged in");
    }

    updateNavigation();
}


// ============================================
// INITIALIZE PAGE
// ============================================

document.addEventListener('DOMContentLoaded', async function () {

    await checkAuthStatus();

    if (document.getElementById('itemsContainer')) {
        loadItems();
        setupFilterButtons();
        setupSearch();
        setupAdvancedFilters();
    }

    if (document.getElementById('itemForm')) {
        setupForm();
        setupImagePreview();
    }

    if (document.getElementById('itemDetail')) {
        loadItemDetail();
    }

    if (document.getElementById('loginForm') || document.getElementById('registerForm')) {
        setupAuthPage();
    }

    setupDeleteModal();

});


// ============================================
// NAVIGATION UPDATE
// ============================================

function updateNavigation() {

    const authLinks = document.getElementById('authLinks');

    if (!authLinks) return;

    if (loggedInUser) {

        authLinks.innerHTML = `
        <div style="display:flex;gap:15px;align-items:center;">
            <span style="color:white;">
                <i class="bi bi-person-circle"></i>
                ${loggedInUser.full_name || loggedInUser.username}
            </span>

            <a href="#" onclick="logout();return false;" style="color:white;">
                <i class="bi bi-box-arrow-right"></i> Logout
            </a>
        </div>
        `;

    } else {

        authLinks.innerHTML =
            `<a href="./auth.html"><i class="bi bi-person"></i> Login</a>`;
    }

}


// ============================================
// LOGOUT
// ============================================

window.logout = async function () {

    try {

        const response = await fetch(`${API_ORIGIN}/api/auth/logout`, {
            credentials: "include"
        });

        const data = await response.json();

        if (data.success) {

            loggedInUser = null;
            updateNavigation();
            goHome();
        }

    } catch (error) {
        console.error("Logout error", error);
    }

};


// ============================================
// AUTH PAGE
// ============================================

function setupAuthPage() {

    setupLoginForm();
    setupRegisterForm();

}


// ============================================
// LOGIN
// ============================================

function setupLoginForm() {

    const loginForm = document.getElementById('loginForm');

    if (!loginForm) return;

    loginForm.addEventListener('submit', async function (e) {

        e.preventDefault();

        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        try {

            const response = await fetch(`${API_ORIGIN}/api/auth/login`, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                credentials: "include",

                body: JSON.stringify({
                    username,
                    password
                })
            });

            const data = await response.json();

            if (data.success) {

                loggedInUser = data.user;

                setTimeout(() => {
                    goHome();
                }, 500);

            } else {

                alert(data.message || "Login failed");

            }

        } catch (error) {

            console.error("Login error:", error);
            alert("Network error");

        }

    });

}


// ============================================
// REGISTER
// ============================================

function setupRegisterForm() {

    const registerForm = document.getElementById('registerForm');

    if (!registerForm) return;

    registerForm.addEventListener('submit', async function (e) {

        e.preventDefault();

        const fullName = document.getElementById('regFullName').value;
        const username = document.getElementById('regUsername').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;

        try {

            const response = await fetch(`${API_ORIGIN}/api/auth/register`, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                credentials: "include",

                body: JSON.stringify({
                    full_name: fullName,
                    username,
                    email,
                    password
                })

            });

            const data = await response.json();

            if (data.success) {

                alert("Registration successful. Please login.");
                goAuth();

            } else {

                alert(data.message || "Registration failed");

            }

        } catch (error) {

            console.error("Registration error", error);
            alert("Network error");

        }

    });

}


// ============================================
// LOAD ITEMS
// ============================================

async function loadItems() {

    const spinner = document.getElementById("loadingSpinner");

    if (spinner) spinner.style.display = "block";

    try {

        const response = await fetch(API_BASE);

        const data = await response.json();

        if (spinner) spinner.style.display = "none";

        if (data.success) {

            currentItems = data.data;
            filterAndDisplayItems();

        }

    } catch (error) {

        console.error("Error loading items:", error);

        if (spinner) spinner.style.display = "none";

    }

}


// ============================================
// DISPLAY ITEMS
// ============================================

function filterAndDisplayItems() {

    const container = document.getElementById("itemsContainer");

    if (!container) return;

    let filteredItems = currentFilter === "all"
        ? currentItems
        : currentItems.filter(item => item.category === currentFilter);

    if (filteredItems.length === 0) {

        container.innerHTML = `<div class="alert">No items found</div>`;
        return;
    }

    container.innerHTML = filteredItems
        .map(item => createItemCard(item))
        .join("");

}


// ============================================
// CREATE CARD
// ============================================

function createItemCard(item) {

    const imgSrc = item.image_path
        ? resolveImagePath(item.image_path)
        : "";

    return `

<div class="item-card">

    ${imgSrc
        ? `<img src="${imgSrc}" class="item-thumbnail">`
        : `<div class="no-image"><i class="bi bi-image"></i></div>`
    }

    <h3>${escapeHtml(item.title)}</h3>

    <p>${escapeHtml(item.description)}</p>

    <button class="btn btn-primary view-btn"
        data-id="${item.id}">
        View
    </button>

</div>

`;

}


// ============================================
// UTILITIES
// ============================================

function escapeHtml(unsafe) {

    if (!unsafe) return "";

    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

}