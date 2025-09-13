// Global variables
let currentUser = null;
let currentCustomerTurn = null;
let authToken = localStorage.getItem('authToken');

// API Base URL
const API_BASE_URL = '/api';

// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const bookNowBtn = document.getElementById('bookNowBtn');
const loginModal = document.getElementById('loginModal');
const bookingModal = document.getElementById('bookingModal');
const adminModal = document.getElementById('adminModal');
const loginForm = document.getElementById('loginForm');
const bookingForm = document.getElementById('bookingForm');
const notificationForm = document.getElementById('notificationForm');
const customerTurnStatus = document.getElementById('customerTurnStatus');
const checkTurnStatusBtn = document.getElementById('checkTurnStatusBtn');
const cancelTurnBtn = document.getElementById('cancelTurnBtn');

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    updateUI();
    checkForExistingTurn();
});

function setupEventListeners() {
    // Admin login button
    loginBtn.addEventListener('click', () => showModal(loginModal));
    
    // Logout button
    logoutBtn.addEventListener('click', logout);
    
    // Take turn button (no login required)
    bookNowBtn.addEventListener('click', () => showModal(bookingModal));
    
    // Close modals
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeAllModals();
        });
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });
    
    // Form submissions
    loginForm.addEventListener('submit', handleLogin);
    bookingForm.addEventListener('submit', handleTurn);
    notificationForm.addEventListener('submit', handleSMS);
    
    // Admin tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchTab(e.target.dataset.tab);
        });
    });
    
    // Customer turn status buttons
    checkTurnStatusBtn.addEventListener('click', checkTurnStatus);
    cancelTurnBtn.addEventListener('click', cancelTurn);
    

}

// Modal functions
function showModal(modal) {
    modal.style.display = 'block';
}

function closeAllModals() {
    loginModal.style.display = 'none';
    bookingModal.style.display = 'none';
    adminModal.style.display = 'none';
}

// API Helper Functions
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        },
        ...options
    };

    try {
        const response = await fetch(url, config);
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Non-JSON response:', text);
            throw new Error('الخادم غير متاح حالياً. يرجى المحاولة مرة أخرى لاحقاً.');
        }
        
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || data.message || 'خطأ في الاتصال بالخادم');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('لا يمكن الاتصال بالخادم. تحقق من اتصال الإنترنت.');
        }
        throw error;
    }
}

// Admin login functionality
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        currentUser = response.data.user;
        authToken = response.data.token;
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        closeAllModals();
        updateUI();
        showToast(response.message, 'success');
        
        // Clear form
        loginForm.reset();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Logout functionality
async function logout() {
    try {
        await apiRequest('/auth/logout', { method: 'POST' });
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
    currentUser = null;
        authToken = null;
        localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    updateUI();
    showToast('تم تسجيل الخروج بنجاح', 'success');
    }
}

// Turn booking functionality (no login required)
async function handleTurn(e) {
    e.preventDefault();
    
    const customerName = document.getElementById('customerName').value;
    const mobileNumber = document.getElementById('mobileNumber').value;
    const serviceType = document.getElementById('serviceType').value;
    
    try {
        const response = await apiRequest('/turns', {
            method: 'POST',
            body: JSON.stringify({ customerName, mobileNumber, serviceType })
        });

        currentCustomerTurn = response.data.turn;
        localStorage.setItem('currentCustomerTurn', JSON.stringify(currentCustomerTurn));
    
    closeAllModals();
    bookingForm.reset();
        showToast(response.message, 'success');
    
    // Show customer turn status
        showCustomerTurnStatus(currentCustomerTurn);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Show customer turn status
function showCustomerTurnStatus(turn) {
    if (!turn) return;
    
    // Update turn status display
    document.getElementById('customerTurnNumber').textContent = `#${turn.turnNumber}`;
    document.getElementById('customerNameDisplay').textContent = turn.customerName;
    document.getElementById('customerServiceDisplay').textContent = turn.serviceNameArabic;
    document.getElementById('customerStatusDisplay').textContent = turn.statusNameArabic;
    document.getElementById('customerStatusDisplay').className = `status-${turn.status}`;
    
    // Format and display time
    const turnTime = new Date(turn.createdAt);
    const timeString = turnTime.toLocaleTimeString('ar-SA', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });
    document.getElementById('customerTimeDisplay').textContent = timeString;
    
    // Show the status section
    customerTurnStatus.style.display = 'block';
    
    // Scroll to the status section
    customerTurnStatus.scrollIntoView({ behavior: 'smooth' });
}

// Check for existing turn on page load
async function checkForExistingTurn() {
    const savedTurn = localStorage.getItem('currentCustomerTurn');
    if (savedTurn) {
        currentCustomerTurn = JSON.parse(savedTurn);
        
        try {
            // Verify turn still exists and is active
            const response = await apiRequest(`/turns/customer/${currentCustomerTurn.mobileNumber}`);
            const activeTurn = response.data.turn;
            
            if (activeTurn && activeTurn.status === 'waiting') {
                currentCustomerTurn = activeTurn;
                localStorage.setItem('currentCustomerTurn', JSON.stringify(activeTurn));
                showCustomerTurnStatus(activeTurn);
        } else {
            // Turn completed or cancelled, remove from localStorage
                localStorage.removeItem('currentCustomerTurn');
                currentCustomerTurn = null;
            }
        } catch (error) {
            // Turn not found, remove from localStorage
            localStorage.removeItem('currentCustomerTurn');
            currentCustomerTurn = null;
        }
    }
}

// Check turn status
async function checkTurnStatus() {
    if (!currentCustomerTurn) return;
    
    try {
        const response = await apiRequest(`/turns/customer/${currentCustomerTurn.mobileNumber}`);
        const activeTurn = response.data.turn;
        
        currentCustomerTurn = activeTurn;
        showCustomerTurnStatus(activeTurn);
        
        if (activeTurn.status === 'waiting') {
            showToast('دورك لا يزال في الانتظار', 'success');
        } else if (activeTurn.status === 'completed') {
            showToast('تم إكمال دورك! شكراً لك', 'success');
            // Remove completed turn from localStorage
            localStorage.removeItem('currentCustomerTurn');
            currentCustomerTurn = null;
            customerTurnStatus.style.display = 'none';
        }
    } catch (error) {
        showToast('لم يتم العثور على دورك', 'error');
    }
}

// Cancel turn
async function cancelTurn() {
    if (!currentCustomerTurn) return;
    
    if (confirm('هل أنت متأكد من إلغاء دورك؟')) {
        try {
            await apiRequest(`/turns/cancel/${currentCustomerTurn.mobileNumber}`, {
                method: 'PUT'
            });
            
            // Remove from localStorage
            localStorage.removeItem('currentCustomerTurn');
            currentCustomerTurn = null;
            
            // Hide the status section
            customerTurnStatus.style.display = 'none';
            
            showToast('تم إلغاء دورك بنجاح', 'success');
        } catch (error) {
            showToast(error.message, 'error');
        }
    }
}

// Admin functionality
function showAdminDashboard() {
    showModal(adminModal);
    loadTurns();
    loadCustomers();
}

async function loadTurns() {
    const turnsList = document.getElementById('turnsList');
    turnsList.innerHTML = '';
    
    try {
        const response = await apiRequest('/admin/turns/waiting');
        const turns = response.data.turns;
    
    if (turns.length === 0) {
        turnsList.innerHTML = '<p>لا توجد أدوار تنتظر في الطابور.</p>';
        return;
    }
    
        turns.forEach(turn => {
        const turnItem = document.createElement('div');
        turnItem.className = 'turn-item';
        turnItem.innerHTML = `
            <div class="turn-info">
                <h4>${turn.customerName}</h4>
                <p><strong>الدور:</strong> #${turn.turnNumber}</p>
                    <p><strong>الخدمة:</strong> ${turn.serviceNameArabic}</p>
                <p><strong>الجوال:</strong> ${turn.mobileNumber}</p>
                    <p><strong>الحالة:</strong> <span class="status-${turn.status}">${turn.statusNameArabic}</span></p>
            </div>
            <div class="turn-actions">
                    <button class="btn btn-primary btn-small call-btn" data-customer="${turn.customerName}" data-mobile="${turn.mobileNumber}" data-turn-id="${turn.id}">
                    <i class="fas fa-phone"></i> اتصل الآن
                </button>
                    <button class="btn btn-secondary btn-small complete-btn" data-turn-id="${turn.id}">
                    <i class="fas fa-check"></i> إكمال
                </button>
            </div>
        `;
        turnsList.appendChild(turnItem);
    });
    
    // Add event listeners for the buttons
    turnsList.addEventListener('click', function(e) {
        if (e.target.closest('.call-btn')) {
            const btn = e.target.closest('.call-btn');
            const customerName = btn.dataset.customer;
            const mobileNumber = btn.dataset.mobile;
            const turnId = btn.dataset.turnId;
            callNow(customerName, mobileNumber, turnId);
        } else if (e.target.closest('.complete-btn')) {
            const btn = e.target.closest('.complete-btn');
            const turnId = btn.dataset.turnId;
            completeTurn(turnId);
        }
    });
    } catch (error) {
        turnsList.innerHTML = '<p>خطأ في تحميل الأدوار</p>';
        showToast(error.message, 'error');
    }
}

async function loadCustomers() {
    const customerSelect = document.getElementById('notificationCustomer');
    customerSelect.innerHTML = '<option value="">اختر العميل</option>';
    
    try {
        const response = await apiRequest('/admin/turns/waiting');
        const turns = response.data.turns;
        
        turns.forEach(turn => {
        const option = document.createElement('option');
        option.value = turn.customerName;
        option.textContent = `${turn.customerName} (الدور #${turn.turnNumber})`;
        customerSelect.appendChild(option);
    });
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
}

async function handleSMS(e) {
    e.preventDefault();
    
    const customer = document.getElementById('notificationCustomer').value;
    const adminPhone = document.getElementById('adminPhone').value;
    const message = document.getElementById('notificationMessage').value;
    
    if (!customer || !adminPhone || !message) {
        showToast('يرجى ملء جميع الحقول', 'error');
        return;
    }
    
    // Simulate sending SMS
    showToast(`تم إرسال الرسالة النصية إلى ${customer} من ${adminPhone}: "${message}"`, 'success');
    
    // Clear form
    notificationForm.reset();
    
    // Switch back to turns tab
    switchTab('turns');
}

async function sendSMS(customerName, mobileNumber, turnId) {
    const adminPhone = prompt('أدخل رقم جوال المدير:');
    if (!adminPhone) return;
    
    const message = prompt('أدخل الرسالة النصية (افتراضي: "دورك، احضر خلال 15 دقيقة"):', 'دورك، احضر خلال 15 دقيقة');
    if (message) {
        try {
            const response = await apiRequest(`/admin/turns/${turnId}/sms`, {
                method: 'POST',
                body: JSON.stringify({ message, adminPhone })
            });
            
            showToast(response.message, 'success');
        } catch (error) {
            showToast(error.message, 'error');
        }
    }
}

async function completeTurn(turnId) {
    try {
        const response = await apiRequest(`/admin/turns/${turnId}/complete`, {
            method: 'PUT'
        });
        
        // If this is the current customer's turn, update the display
        if (currentCustomerTurn && currentCustomerTurn.id === turnId) {
            currentCustomerTurn.status = 'completed';
            showCustomerTurnStatus(currentCustomerTurn);
        }
        
        // Reload turns display
        loadTurns();
        loadCustomers();
        
        showToast(response.message, 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function callNow(customerName, mobileNumber, turnId) {
    if (confirm(`هل أنت متأكد من اتصال ${customerName} (${mobileNumber})؟`)) {
        try {
            // Log the call attempt
            const response = await apiRequest(`/admin/turns/${turnId}/call`, {
                method: 'POST'
            });
            
            // Initiate the phone call
            const phoneNumber = mobileNumber.startsWith('+') ? mobileNumber : `+966${mobileNumber.replace(/^0/, '')}`;
            window.location.href = `tel:${phoneNumber}`;
            
            showToast(response.message, 'success');
        } catch (error) {
            showToast(error.message, 'error');
        }
    }
}

// Utility functions for Arabic text
function getServiceNameInArabic(serviceType) {
    const serviceNames = {
        'haircut': 'قص شعر',
        'beard-trim': 'قص لحية',
        'haircut-beard': 'قص شعر + لحية',
        'shampoo': 'غسيل شعر',
        'styling': 'تسريحة'
    };
    return serviceNames[serviceType] || serviceType;
}

function getStatusInArabic(status) {
    const statusNames = {
        'waiting': 'في الانتظار',
        'confirmed': 'مؤكد',
        'completed': 'مكتمل',
        'cancelled': 'ملغي'
    };
    return statusNames[status] || status;
}

function updateUI() {
    if (currentUser) {
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        bookNowBtn.textContent = 'لوحة تحكم المدير';
        bookNowBtn.onclick = showAdminDashboard;
    } else {
        loginBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
        bookNowBtn.textContent = 'خذ دورك';
        bookNowBtn.onclick = () => showModal(bookingModal);
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('notificationToast');
    const toastMessage = document.getElementById('toastMessage');
    
    // Set message and style based on type
    toastMessage.textContent = message;
    toast.className = `toast toast-${type}`;
    
    // Show toast
    toast.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        toast.style.display = 'none';
    }, 5000);
}

// Toast close functionality
document.querySelector('.toast-close').addEventListener('click', () => {
    document.getElementById('notificationToast').style.display = 'none';
});

// Load current user from localStorage on page refresh
window.addEventListener('load', function() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUI();
    }
});



