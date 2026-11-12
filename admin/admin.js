// Global variables to hold data fetched from the server
let users = {};
let settings = {};
let currentManageUsername = null;

// Run when the page loads
window.onload = async function() {
    // Check if admin is already logged in for this session
    if (sessionStorage.getItem('isAdminAuth') === 'true') {
        await fetchData(); // Get latest data from backend
        showDashboard();
    } else {
        showLogin();
    }
};

// ==========================================
// 1. SERVER COMMUNICATION (API CALLS)
// ==========================================

// Fetch all users and settings from the backend
async function fetchData() {
    try {
        const res = await fetch('/api/data');
        const data = await res.json();
        users = data.users || {};
        settings = data.settings || {};
    } catch (error) {
        console.error("Error fetching data from server:", error);
        alert("Could not connect to the server.");
    }
}

// Save the entire users object to the backend
async function saveUsersToServer() {
    try {
        await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(users)
        });
    } catch (error) {
        console.error("Error saving users:", error);
        alert("Failed to save changes.");
    }
}

// Save the security settings to the backend
async function saveSettingsToServer() {
    try {
        await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
    } catch (error) {
        console.error("Error saving settings:", error);
        alert("Failed to save settings.");
    }
}

// ==========================================
// 2. AUTHENTICATION & VIEW SWITCHING
// ==========================================

function showLogin() {
    document.getElementById('body-tag').className = 'login-body';
    document.getElementById('login-view').classList.remove('hidden');
    document.getElementById('login-view').style.display = 'block';
    document.getElementById('dashboard-view').classList.add('hidden');
    document.getElementById('dashboard-view').style.display = 'none';
}

async function showDashboard() {
    document.getElementById('body-tag').className = 'dash-body';
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('login-view').style.display = 'none';
    document.getElementById('dashboard-view').classList.remove('hidden');
    document.getElementById('dashboard-view').style.display = 'flex';
    
    // Load current settings into the settings form
    document.getElementById('admin-auth-name').value = settings.auth_name || 'IMF CODE';
    document.getElementById('admin-auth-code').value = settings.auth_code || '';
    document.getElementById('admin-auth-enabled').checked = settings.auth_enabled || false;
    
    // Render the user list
    renderUserList();
}

function loginAdmin() {
    const email = document.getElementById('admin-email').value;
    const pass = document.getElementById('admin-pass').value;
    
    // Hardcoded Admin Credentials
    if (email === "admin@usbank.com" && pass === "tqn8e5RLVVd2") {
        sessionStorage.setItem('isAdminAuth', 'true');
        document.getElementById('error-msg').style.display = 'none';
        showDashboard();
    } else {
        document.getElementById('error-msg').style.display = 'block';
    }
}

function logoutAdmin() {
    sessionStorage.removeItem('isAdminAuth');
    showLogin();
}

// Switch between tabs (Users List, Manage, Settings)
function showTab(tabId, element) {
    document.querySelectorAll('.main-content > div').forEach(div => div.classList.add('hidden'));
    document.getElementById('tab-' + tabId).classList.remove('hidden');
    
    if (element) {
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        element.classList.add('active');
    }
}

// ==========================================
// 3. USER LIST & MANAGEMENT
// ==========================================

function renderUserList() {
    const container = document.getElementById('users-container');
    container.innerHTML = '';
    const userKeys = Object.keys(users);

    if(userKeys.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#666; margin-top:20px;">No users created yet. Sign up on the main site.</p>';
        return;
    }

    // Helper to format numbers with commas (e.g. 1,000.50)
    const formatMoney = (num) => parseFloat(num).toLocaleString('en-US', {minimumFractionDigits: 2});

    userKeys.forEach((key) => {
        const u = users[key];
        
        // Determine badge color based on status
        let statusClass = u.status === 'Active' ? 'status-active' : (u.status === 'Frozen' ? 'status-frozen' : 'status-suspended');
        
        // Calculate total balance
        let totalBal = parseFloat(u.checking_bal) + parseFloat(u.savings_bal);

        container.innerHTML += `
            <div class="user-list-item">
                <div class="user-info">
                    <h3>${u.name}</h3>
                    <p>${u.email}</p>
                    <p>Acct: ${u.acctNum} | Bal:</p>
                    <span class="bal">$${formatMoney(totalBal)}</span>
                    <span class="status-badge ${statusClass}">${u.status.toUpperCase()}</span>
                </div>
                <button class="manage-btn" onclick="manageUser('${u.username}')">Manage Account</button>
            </div>
        `;
    });
}

window.manageUser = function(username) {
    currentManageUsername = username;
    const u = users[username];
    
    // Populate the Manage form with the user's data
    document.getElementById('manage-username-title').textContent = u.name;
    document.getElementById('manage-acct-num').textContent = u.acctNum;
    document.getElementById('manage-status').value = u.status;
    document.getElementById('manage-checking').value = u.checking_bal;
    document.getElementById('manage-savings').value = u.savings_bal;
    
    // Clear transaction inputs
    document.getElementById('tx-amount').value = '';
    document.getElementById('tx-desc').value = '';
    document.getElementById('tx-date').value = '';

    // Switch to the manage tab (keeping the Users List nav active)
    showTab('manage', document.querySelector('.nav-item'));
}

// ==========================================
// 4. ACTIONS (STATUS, BALANCE, TRANSACTIONS)
// ==========================================

window.updateStatus = async function() {
    const newStatus = document.getElementById('manage-status').value;
    users[currentManageUsername].status = newStatus;
    
    // Save to server and update UI
    await saveUsersToServer();
    alert(`Account status changed to ${newStatus}!`);
    renderUserList();
}

window.saveBalances = async function() {
    const newChecking = document.getElementById('manage-checking').value;
    const newSavings = document.getElementById('manage-savings').value;
    
    users[currentManageUsername].checking_bal = newChecking;
    users[currentManageUsername].savings_bal = newSavings;
    
    // Save to server and update UI
    await saveUsersToServer();
    alert('Balances Updated Successfully!');
    renderUserList();
}

window.createTransaction = async function() {
    const u = users[currentManageUsername];
    const action = document.getElementById('tx-action').value; // Credit or Debit
    const account = document.getElementById('tx-account').value; // Checking or Savings
    const amount = parseFloat(document.getElementById('tx-amount').value);
    const dateInput = document.getElementById('tx-date').value;
    const desc = document.getElementById('tx-desc').value;

    if (!amount || !desc) { 
        alert('Please fill in the amount and description.'); 
        return; 
    }

    // Handle Backdating Logic
    let txDateObj = new Date();
    if (dateInput) {
        txDateObj = new Date(dateInput + 'T12:00:00'); // Add time to prevent timezone offset
    }
    const formattedDate = txDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    // Generate a random Reference Number
    const refNo = 'ADM-' + Math.floor(100000 + Math.random() * 900000);

    // 1. Update the User's Balance
    if (action === 'Credit') {
        if (account === 'Checking') u.checking_bal = (parseFloat(u.checking_bal) + amount).toFixed(2);
        else u.savings_bal = (parseFloat(u.savings_bal) + amount).toFixed(2);
    } else {
        if (account === 'Checking') u.checking_bal = (parseFloat(u.checking_bal) - amount).toFixed(2);
        else u.savings_bal = (parseFloat(u.savings_bal) - amount).toFixed(2);
    }

    // 2. Create the Transaction Object
    const newTx = { 
        type: action, 
        from: account, 
        to: desc, 
        amount: amount.toFixed(2), 
        ref: refNo, 
        date: formattedDate 
    };

    // 3. Add to User's Transaction History (at the top)
    if (!u.transactions) u.transactions = [];
    u.transactions.unshift(newTx);

    // 4. Save everything to the backend
    await saveUsersToServer();
    
    // 5. Show success and reset form
    alert('Transaction Added and Balance Updated!');
    document.getElementById('manage-checking').value = u.checking_bal;
    document.getElementById('manage-savings').value = u.savings_bal;
    document.getElementById('tx-amount').value = '';
    document.getElementById('tx-desc').value = '';
    document.getElementById('tx-date').value = '';
}

// ==========================================
// 5. SECURITY SETTINGS
// ==========================================

window.saveAuthSettings = async function() {
    settings.auth_name = document.getElementById('admin-auth-name').value;
    settings.auth_code = document.getElementById('admin-auth-code').value;
    settings.auth_enabled = document.getElementById('admin-auth-enabled').checked;
    
    await saveSettingsToServer();
    alert('Security Settings Saved!');
}