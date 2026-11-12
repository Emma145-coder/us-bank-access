let users = {};
let settings = {};
let currentUser = null;
let pendingTransferData = null; 

window.onload = async function() {
    const rememberedUser = localStorage.getItem('remembered_username');
    if (rememberedUser) {
        document.getElementById('login-username').value = rememberedUser;
        document.getElementById('remember').checked = true;
    }
    await syncData();
};

// Fetch latest data from backend
async function syncData() {
    try {
        const res = await fetch('/api/data');
        const data = await res.json();
        users = data.users || {};
        settings = data.settings || {};
        
        if (currentUser) {
            currentUser = users[currentUser.username]; 
        }
    } catch(e) { console.error("Error syncing data", e); }
}

async function saveToServer() {
    await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(users)
    });
}

function checkAccountStatus() {
    if (!currentUser) return false;
    const status = currentUser.status || 'Active';
    if (status !== 'Active') {
        document.getElementById('frozen-text').textContent = `Account ${status.toLowerCase()}, contact live chat support for more information.`;
        document.getElementById('frozen-overlay').classList.remove('hidden');
        return false;
    }
    return true;
}

function updateBalancesUI() {
    if(!currentUser) return;
    
    let chk = parseFloat(currentUser.checking_bal).toFixed(2);
    let sav = parseFloat(currentUser.savings_bal).toFixed(2);
    let total = (parseFloat(chk) + parseFloat(sav)).toFixed(2);

    document.getElementById('dash-bal-checking').textContent = `$${chk}`;
    document.getElementById('dash-bal-savings').textContent = `$${sav}`;
    document.getElementById('dash-bal-total').textContent = `$${total}`;

    const dropdowns = ['us-from', 'ext-from', 'zelle-from', 'wire-from'];
    dropdowns.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.innerHTML = `
                <option value="Checking">Checking ...1112 ($${chk})</option>
                <option value="Savings">Savings ...2223 ($${sav})</option>
            `;
        }
    });
}

async function showPage(pageId) {
    const pages = ['main-page', 'login-page', 'create-account-page', 'app-wrapper', 'profile-page'];
    pages.forEach(id => document.getElementById(id).classList.add('hidden'));
    document.getElementById(pageId).classList.remove('hidden');
    
    if (pageId === 'app-wrapper') {
        await syncData();
        if(!checkAccountStatus()) return; 
        initDashboard();
        updateBalancesUI();
        switchTab('accounts');
    }
}

async function switchTab(tabName) {
    await syncData(); 
    if(!checkAccountStatus()) return; 

    const views = ['tab-accounts', 'tab-pay-transfer', 'tab-history', 'form-usbank', 'form-otherbank', 'form-zelle', 'form-wire'];
    views.forEach(id => document.getElementById(id).classList.add('hidden'));

    if (tabName === 'accounts') {
        document.getElementById('tab-accounts').classList.remove('hidden');
        updateBalancesUI();
    } else if (tabName === 'pay-transfer') {
        document.getElementById('tab-pay-transfer').classList.remove('hidden');
        updateBalancesUI();
    } else if (tabName === 'history') {
        document.getElementById('tab-history').classList.remove('hidden');
        renderTransactions();
    }
}

function openTransferForm(type) {
    if(!checkAccountStatus()) return;
    document.getElementById('tab-pay-transfer').classList.add('hidden');
    updateBalancesUI();

    if (type === 'usbank') document.getElementById('form-usbank').classList.remove('hidden');
    else if (type === 'otherbank') document.getElementById('form-otherbank').classList.remove('hidden');
    else if (type === 'zelle') document.getElementById('form-zelle').classList.remove('hidden');
    else if (type === 'wire') document.getElementById('form-wire').classList.remove('hidden');
}

function handleTransferSubmit(event, transferTo) {
    event.preventDefault();
    let amount = 0;
    let fromAccount = "";

    if (transferTo === 'US Bank Account') { amount = document.getElementById('us-amount').value; fromAccount = document.getElementById('us-from').value; }
    else if (transferTo === 'Other Bank') { amount = document.getElementById('ext-amount').value; fromAccount = document.getElementById('ext-from').value; }
    else if (transferTo === 'Zelle') { amount = document.getElementById('zelle-amount').value; fromAccount = document.getElementById('zelle-from').value; }
    else if (transferTo === 'Wire Transfer') { amount = document.getElementById('wire-amount').value; fromAccount = document.getElementById('wire-from').value; }

    pendingTransferData = { to: transferTo, amount: amount, from: fromAccount };

    if (settings.auth_enabled) {
        const authName = settings.auth_name || 'IMF CODE';
        document.getElementById('auth-prompt-text').innerHTML = `Please enter your <strong>${authName}</strong> to proceed.`;
        document.getElementById('input-imf-code').value = '';
        document.getElementById('imf-modal').classList.remove('hidden');
    } else {
        executeTransfer();
    }
}

function closeIMF() {
    document.getElementById('imf-modal').classList.add('hidden');
    pendingTransferData = null;
}

function verifyAuthCode() {
    const enteredCode = document.getElementById('input-imf-code').value.trim();
    const requiredCode = settings.auth_code || '';

    if (enteredCode !== requiredCode) {
        alert('Invalid Authorization Code. Please try again.');
        return;
    }
    document.getElementById('imf-modal').classList.add('hidden');
    executeTransfer();
}

async function executeTransfer() {
    let amountVal = parseFloat(pendingTransferData.amount);
    let accountType = pendingTransferData.from;

    if (accountType.includes("Checking")) {
        if (amountVal > parseFloat(currentUser.checking_bal)) { alert('Insufficient funds in Checking.'); return; }
        currentUser.checking_bal = (parseFloat(currentUser.checking_bal) - amountVal).toFixed(2);
    } else {
        if (amountVal > parseFloat(currentUser.savings_bal)) { alert('Insufficient funds in Savings.'); return; }
        currentUser.savings_bal = (parseFloat(currentUser.savings_bal) - amountVal).toFixed(2);
    }

    const refNo = 'US' + Math.floor(10000000 + Math.random() * 90000000);
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    document.getElementById('receipt-amount').textContent = `$${amountVal.toFixed(2)}`;
    document.getElementById('receipt-from').textContent = accountType.split(' ')[0];
    document.getElementById('receipt-to').textContent = pendingTransferData.to;
    document.getElementById('receipt-ref').textContent = refNo;
    document.getElementById('receipt-date').textContent = dateStr;

    const newTx = { 
        type: 'Debit', from: accountType.split(' ')[0], to: pendingTransferData.to, 
        amount: amountVal.toFixed(2), ref: refNo, date: dateStr 
    };
    
    if (!currentUser.transactions) currentUser.transactions = [];
    currentUser.transactions.unshift(newTx);
    
    users[currentUser.username] = currentUser;
    await saveToServer();
    updateBalancesUI();

    document.getElementById('receipt-modal').classList.remove('hidden');
    pendingTransferData = null;
}

function finishTransfer() {
    document.getElementById('receipt-modal').classList.add('hidden');
    document.querySelectorAll('form').forEach(form => form.reset());
    switchTab('accounts');
}

function renderTransactions() {
    const listEl = document.getElementById('history-list-full');
    listEl.innerHTML = '';
    
    if (!currentUser.transactions || currentUser.transactions.length === 0) {
        listEl.innerHTML = `<p style="font-size: 14px; color: #888; text-align: center; margin-top: 20px;">No recent transactions found.</p>`;
    } else {
        currentUser.transactions.forEach(tx => {
            const item = document.createElement('div');
            item.className = 'transaction-item';
            let isCredit = tx.type === 'Credit';
            let amountClass = isCredit ? 'transaction-amount amount-deposit' : 'transaction-amount';
            let amountPrefix = isCredit ? '+' : '-';

            item.innerHTML = `
                <div class="transaction-left">
                    <h5>${isCredit ? 'Deposit / Credit' : 'Transfer to'} ${tx.to}</h5>
                    <p>${tx.date} • From: ${tx.from} • Ref: ${tx.ref}</p>
                </div>
                <div class="${amountClass}">${amountPrefix}$${tx.amount}</div>
            `;
            listEl.appendChild(item);
        });
    }
}

function togglePassword(inputId, el) {
    var input = document.getElementById(inputId);
    if (input.type === "password") { input.type = "text"; el.textContent = "Hide"; } 
    else { input.type = "password"; el.textContent = "Show"; }
}

async function handleSignup(event) {
    event.preventDefault(); 
    await syncData(); // Get latest

    const name = document.getElementById('reg-name').value;
    const username = document.getElementById('reg-username').value.toLowerCase();
    const email = document.getElementById('reg-email').value;
    const phone = document.getElementById('reg-phone').value;
    const dob = document.getElementById('reg-dob').value;
    const password = document.getElementById('reg-pass').value;

    if (users[username]) {
        alert('Username already exists. Please choose another.');
        return;
    }

    const acctNum = Math.floor(1000000000 + Math.random() * 9000000000).toString();

    users[username] = {
        name: name, username: username, password: password, email: email, phone: phone, dob: dob,
        acctNum: acctNum, checking_bal: "0.00", savings_bal: "0.00", status: "Active", transactions: []
    };
    
    await saveToServer();

    alert('Account Successfully Created! You can now log in.');
    document.getElementById('signup-form').reset();
    showPage('login-page');
}

async function handleLogin(event) {
    event.preventDefault();
    await syncData(); 

    const enteredUser = document.getElementById('login-username').value.trim().toLowerCase();
    const enteredPass = document.getElementById('login-password').value;

    if (users[enteredUser] && users[enteredUser].password === enteredPass) {
        currentUser = users[enteredUser];
        
        if (document.getElementById('remember').checked) {
            localStorage.setItem('remembered_username', enteredUser);
        } else {
            localStorage.removeItem('remembered_username');
        }
        
        document.getElementById('login-form').reset();
        
        if (currentUser.status !== 'Active') {
            showPage('app-wrapper');
            checkAccountStatus(); 
        } else {
            showPage('app-wrapper');
        }
    } else {
        alert('Incorrect username or password.');
    }
}

function handleLogout() {
    if (confirm("Are you sure you want to log out?")) {
        currentUser = null;
        document.getElementById('frozen-overlay').classList.add('hidden');
        showPage('main-page');
    }
}

async function initDashboard() {
    if(!currentUser) return;
    const name = currentUser.name || 'User';
    document.getElementById('dash-greeting').textContent = `Welcome, ${name.split(' ')[0]}.`; 
    
    const dateElement = document.getElementById('live-date');
    try {
        const response = await fetch('https://worldtimeapi.org/api/ip');
        const data = await response.json();
        const dateObj = new Date(data.datetime);
        const options = { weekday: 'long', month: 'long', day: 'numeric' };
        dateElement.textContent = dateObj.toLocaleDateString('en-US', options).toUpperCase();
    } catch (error) {
        const dateObj = new Date();
        const options = { weekday: 'long', month: 'long', day: 'numeric' };
        dateElement.textContent = dateObj.toLocaleDateString('en-US', options).toUpperCase();
    }
}

function initProfile() {
    if(!currentUser) return;
    document.getElementById('prof-name').textContent = currentUser.name;
    document.getElementById('prof-username').textContent = currentUser.username;
    document.getElementById('prof-email').textContent = currentUser.email;
    document.getElementById('prof-phone').textContent = currentUser.phone;
    
    if (currentUser.dob) {
        const dobObj = new Date(currentUser.dob);
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('prof-dob').textContent = dobObj.toLocaleDateString('en-US', options);
    } else {
        document.getElementById('prof-dob').textContent = 'N/A';
    }
    showPage('profile-page');
}