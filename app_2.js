// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAw0owrI_MjRPJmQLzd9zNFyjcdgRc7H4I",
    authDomain: "vckshop-b951b.firebaseapp.com",
    databaseURL: "https://vckshop-b951b-default-rtdb.firebaseio.com",
    projectId: "vckshop-b951b",
    storageBucket: "vckshop-b951b.firebasestorage.app",
    messagingSenderId: "39230962959",
    appId: "1:39230962959:web:bc2fde1b4f8e9b3c7ed27a"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const usersData = [
    { id: 1, name: "Vk", role: "Admin", password: "123" },
    { id: 2, name: "HK", role: "User", password: "123" },
    { id: 3, name: "PN", role: "User", password: "123" },
    { id: 4, name: "SP", role: "User", password: "123" }
];

let productsData = [], currentUser = null, salesData = [], deliveryData = [], currentInvoiceItems = [];
let myChartInstance = null;
let qrcodeInstance = null;
let currentInvoiceGrandTotal = 0;

window.addEventListener('DOMContentLoaded', () => {
    startClock();
    initTheme();
    requestNotificationPermission(); // សុំសិទ្ធិបង្ហាញ Notification ពេលបើក App
    
    const savedUser = localStorage.getItem('vck_current_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        initSystemAfterLogin();
        const today = new Date().toISOString().split('T')[0];
        if (document.getElementById('deliveryStatDate')) document.getElementById('deliveryStatDate').value = today;
    }
});

// មុខងារសុំសិទ្ធិ និងបង្ហាញ Notification លើ Screen ទូរស័ព្ទ
function requestNotificationPermission() {
    if ("Notification" in window) {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                console.log("✅ ទទួលបានសិទ្ធិបង្ហាញ Notification រួចរាល់!");
            }
        });
    }
}

function triggerPhoneNotification(invCode, customer, total) {
    if ("Notification" in window && Notification.permission === "granted") {
        const options = {
            body: `👤 អតិថិជន: ${customer}\n💰 ទឹកប្រាក់សរុប: $${total.toFixed(2)}`,
            icon: 'https://cdn-icons-png.flaticon.com/512/3144/3144456.png',
            vibrate: [200, 100, 200],
            tag: invCode
        };

        new Notification(`🧾 វិក្កយបត្រថ្មី៖ ${invCode}`, options);
    }
}

function initTheme() {
    const savedTheme = localStorage.getItem('vck_theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        const icon = document.getElementById('darkModeIcon');
        if (icon) icon.innerText = '☀️';
    }
}

function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('vck_theme', isDark ? 'dark' : 'light');
    const icon = document.getElementById('darkModeIcon');
    if (icon) icon.innerText = isDark ? '☀️' : '🌙';
}

function startClock() {
    const clockEl = document.getElementById('liveClockDisplay');
    if (!clockEl) return;
    setInterval(() => {
        const now = new Date();
        clockEl.innerText = now.toLocaleDateString('km-KH') + ' | ' + now.toLocaleTimeString('en-US', { hour12: true });
    }, 1000);
}

function handleLogin() {
    const userIn = document.getElementById('loginUsername').value.trim();
    const passIn = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    const foundUser = usersData.find(u => u.name.toLowerCase() === userIn.toLowerCase() && u.password === passIn);

    if (foundUser) {
        currentUser = foundUser;
        localStorage.setItem('vck_current_user', JSON.stringify(currentUser));
        errorEl.classList.add('hidden');
        initSystemAfterLogin();
    } else {
        errorEl.classList.remove('hidden');
    }
}

function initSystemAfterLogin() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-application').classList.remove('hidden');
    document.getElementById('topNavUser').innerText = currentUser.name;
    document.getElementById('topNavRole').innerText = currentUser.role;
    document.getElementById('userAvatar').innerText = currentUser.name.charAt(0).toUpperCase();

    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7);

    if (document.getElementById('searchMonth')) document.getElementById('searchMonth').value = currentMonth;
    if (document.getElementById('invoiceDate')) document.getElementById('invoiceDate').value = today;
    if (document.getElementById('pdfDate')) document.getElementById('pdfDate').innerText = today;
    if (document.getElementById('deliveryStatDate')) document.getElementById('deliveryStatDate').value = today;

    const dashCards = document.getElementById('dash-cards-container');
    const thTotal = document.getElementById('th-dashboard-total');
    const thAction = document.getElementById('th-dashboard-action');

    if (currentUser.role === 'Admin') {
        if (dashCards) dashCards.classList.remove('hidden');
        if (thTotal) thTotal.classList.remove('hidden');
        if (thAction) thAction.classList.remove('hidden');
    } else {
        if (dashCards) dashCards.classList.add('hidden');
        if (thTotal) thTotal.classList.add('hidden');
        if (thAction) thAction.classList.add('hidden');
    }

    if (currentUser.role !== 'Admin') {
        const stockForm = document.getElementById('stock-entry-form');
        if (stockForm) stockForm.classList.add('hidden');
    }

    setupLivePreviewInputs();
    listenToFirebaseData();
    switchTab('dashboard');
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('vck_current_user');
    location.reload();
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    
    const targetTab = document.getElementById('tab-' + tabId);
    if (targetTab) targetTab.classList.remove('hidden');

    document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('active-menu', 'bg-indigo-600', 'text-white'));
    const targetBtn = document.getElementById('btn-' + tabId);
    if (targetBtn) {
        targetBtn.classList.add('active-menu', 'bg-indigo-600', 'text-white');
    }
    
    const titles = { 
        'dashboard': '📊 ផ្ទាំងគ្រប់គ្រងទូទៅ', 
        'sales': '📄 វិក្កយបត្រលក់សម្ភារៈ', 
        'delivery': '🚚 ប្រព័ន្ធដឹកជញ្ជូន', 
        'stock': '📦 គ្រប់គ្រងឃ្លាំងស្តុក',
        'customer-history': '👥 ប្រវត្តិទិញរបស់អតិថិជន'
    };
    document.getElementById('pageTitle').innerText = titles[tabId] || 'VCK System';

    if (window.innerWidth < 768) {
        const menu = document.getElementById('sidebarMenu');
        const footer = document.getElementById('userFooter');
        if (menu) menu.classList.add('hidden');
        if (footer) {
            footer.classList.add('hidden');
            footer.classList.remove('flex');
        }
    }
}

function listenToFirebaseData() {
    database.ref('products').on('value', (snapshot) => {
        const data = snapshot.val();
        productsData = data ? Object.values(data) : [];
        setupInvoiceProductSelect();
        renderAll();
    });
    database.ref('sales').on('value', (snapshot) => {
        const data = snapshot.val();
        salesData = data ? Object.values(data) : [];
        renderAll();
    });
    database.ref('deliveries').on('value', (snapshot) => {
        const data = snapshot.val();
        deliveryData = data ? Object.values(data) : [];
        renderAll();
    });
}

function setupLivePreviewInputs() {
    ['Customer', 'Phone', 'Location', 'Date'].forEach(id => {
        const el = document.getElementById('invoice' + id);
        if (el) el.addEventListener('input', (e) => {
            const pdfEl = document.getElementById('pdf' + id);
            if (pdfEl) pdfEl.innerText = e.target.value || '-';
        });
    });
}

function setupInvoiceProductSelect() {
    const dataList = document.getElementById('productList');
    if (!dataList) return;
    
    let html = '';
    productsData.forEach(p => {
        const displayLabel = `${p.name} (សល់: ${p.avail})`;
        html += `<option value="${p.name}" data-price="${p.price}" data-id="${p.id}" data-avail="${p.avail}">${displayLabel}</option>`;
    });
    dataList.innerHTML = html;
}

function autoFillProductPrice() {
    const input = document.getElementById('invoiceProductInput');
    const dataList = document.getElementById('productList');
    const priceInput = document.getElementById('invoiceUnitPrice');
    const hiddenId = document.getElementById('invoiceProductIdHidden');
    const qtyInput = document.getElementById('invoiceQty');
    
    const selectedOption = Array.from(dataList.options).find(opt => opt.value === input.value);
    
    if (selectedOption) {
        const price = selectedOption.getAttribute('data-price');
        const id = selectedOption.getAttribute('data-id');
        const avail = parseInt(selectedOption.getAttribute('data-avail'));
        
        priceInput.value = price;
        hiddenId.value = id;
        qtyInput.max = avail;
        
        if (avail <= 0) {
            alert("⚠️ ទំនិញនេះអស់ពីស្តុកហើយ!");
        }
    } else {
        priceInput.value = '';
        hiddenId.value = '';
    }
}

function adjustInvoiceQty(amount) {
    const qtyInput = document.getElementById('invoiceQty');
    if (!qtyInput) return;
    let currentQty = parseInt(qtyInput.value) || 0;
    qtyInput.value = Math.max(1, currentQty + amount);
}

function addItemToCurrentInvoice() {
    const productId = document.getElementById('invoiceProductIdHidden').value;
    const productName = document.getElementById('invoiceProductInput').value;
    const qty = parseInt(document.getElementById('invoiceQty').value);
    const price = parseFloat(document.getElementById('invoiceUnitPrice').value);

    const product = productsData.find(p => p.id == productId);

    if (!product) return alert("⚠️ សូមជ្រើសរើសទំនិញពីបញ្ជីឱ្យបានត្រឹមត្រូវ!");
    if (isNaN(qty) || qty <= 0) return alert("⚠️ សូមបញ្ចូលចំនួនឱ្យបានត្រឹមត្រូវ!");
    if (qty > product.avail) return alert(`⚠️ ស្តុកមិនគ្រប់គ្រាន់! សល់តែ ${product.avail} ទេ។`);

    const existingItem = currentInvoiceItems.find(item => item.productId == productId);

    if (existingItem) {
        if (existingItem.qty + qty > product.avail) {
            return alert("⚠️ បូកបញ្ចូលទាំងរបស់ចាស់ លើសពីស្តុកដែលមាន!");
        }
        existingItem.qty += qty;
        existingItem.totalPrice = existingItem.qty * existingItem.price;
    } else {
        currentInvoiceItems.push({
            productId: product.id,
            name: product.name,
            qty: qty,
            price: price,
            totalPrice: qty * price
        });
    }

    document.getElementById('invoiceProductInput').value = '';
    document.getElementById('invoiceUnitPrice').value = '';
    document.getElementById('invoiceQty').value = '1';
    document.getElementById('invoiceProductIdHidden').value = '';

    renderInvoicePreviewTable();
}

function removeInvoiceItem(index) {
    currentInvoiceItems.splice(index, 1);
    renderInvoicePreviewTable();
}

function renderInvoicePreviewTable() {
    const tbody = document.getElementById('invoiceItemsTableBody');
    if (!tbody) return;
    let html = '', itemsTotal = 0;
    
    currentInvoiceItems.forEach((item, index) => {
        itemsTotal += item.totalPrice;
        html += `
        <tr class="border-b dark:border-slate-800 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <td class="p-2 text-center border-r dark:border-slate-800">${index + 1}</td>
            <td class="p-2 border-r dark:border-slate-800 font-medium text-slate-800 dark:text-slate-200">${item.name}</td>
            <td class="p-2 text-center border-r dark:border-slate-800 font-bold">${item.qty}</td>
            <td class="p-2 text-right border-r dark:border-slate-800">$${item.price.toFixed(2)}</td>
            <td class="p-2 text-right font-bold text-slate-700 dark:text-slate-200">$${item.totalPrice.toFixed(2)}</td>
            <td class="p-2 text-center print-hide"><button onclick="removeInvoiceItem(${index})" class="text-rose-500 hover:text-rose-700 cursor-pointer">❌</button></td>
        </tr>`;
    });
    tbody.innerHTML = html;

    const deliveryFeeInput = document.getElementById('invoiceDeliveryFee');
    const deliveryFee = deliveryFeeInput ? parseFloat(deliveryFeeInput.value) || 0 : 0;
    
    const pdfDeliveryFeeText = document.getElementById('pdfDeliveryFeeText');
    if (pdfDeliveryFeeText) {
        pdfDeliveryFeeText.innerText = `$${deliveryFee.toFixed(2)}`;
    }

    const grandTotal = itemsTotal + deliveryFee;
    currentInvoiceGrandTotal = grandTotal;
    
    const exchangeRate = 4000;
    const grandTotalRiel = Math.round(grandTotal * exchangeRate);
    const formattedRiel = grandTotalRiel.toLocaleString('km-KH');

    const grandTotalElement = document.getElementById('invoiceGrandTotal');
    if (grandTotalElement) {
        grandTotalElement.innerHTML = `$${grandTotal.toFixed(2)} <span class="text-xs font-normal text-slate-500 dark:text-slate-400 block sm:inline">(${formattedRiel} ៛)</span>`;
    }

    generateDynamicKHQR(grandTotal);
    calculateChange();
}

function calculateChange() {
    const cashInput = document.getElementById('cashReceived');
    const changeOutput = document.getElementById('changeDue');
    if (!cashInput || !changeOutput) return;

    const cashReceived = parseFloat(cashInput.value) || 0;
    if (cashReceived <= 0 || currentInvoiceGrandTotal <= 0) {
        changeOutput.value = '$0.00';
        return;
    }

    const changeDue = cashReceived - currentInvoiceGrandTotal;
    if (changeDue < 0) {
        changeOutput.value = `ខ្វះ $${Math.abs(changeDue).toFixed(2)}`;
    } else {
        const exchangeRate = 4000;
        const changeRiel = Math.round(changeDue * exchangeRate).toLocaleString('km-KH');
        changeOutput.value = `$${changeDue.toFixed(2)} (${changeRiel} ៛)`;
    }
}

function generateDynamicKHQR(amount) {
    const qrcodeContainer = document.getElementById('qrcode');
    if (!qrcodeContainer) return;
    
    qrcodeContainer.innerHTML = '';
    const payload = `00020101021230380016bakong@vckshop0108VCK_SHOP5204599953038405405${amount.toFixed(2)}5802KH5910VCK SHOP6010Phnom Penh6304`;

    qrcodeInstance = new QRCode(qrcodeContainer, {
        text: payload,
        width: 80,
        height: 80,
        colorDark: "#0f172a",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
    });
}

function playSuccessSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioContext.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioContext.currentTime + 0.1); // A5
        
        gain.gain.setValueAtTime(0.1, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.3);
        
        osc.connect(gain);
        gain.connect(audioContext.destination);
        
        osc.start();
        osc.stop(audioContext.currentTime + 0.3);
    } catch(e) {
        console.log("Sound alert disabled");
    }
}

async function saveFinalInvoice() {
    const customer = document.getElementById('invoiceCustomer').value.trim();
    const phone = document.getElementById('invoicePhone').value.trim();
    const fromLoc = document.getElementById('invoiceFromLocation').value.trim();
    const location = document.getElementById('invoiceLocation').value.trim();
    const date = document.getElementById('invoiceDate').value;
    const driver = document.getElementById('invoiceDriverSelect').value;
    const deliveryFee = parseFloat(document.getElementById('invoiceDeliveryFee').value) || 0;

    if (!customer || !location || currentInvoiceItems.length === 0) {
        return alert("⚠️ សូមបំពេញព័ត៌មានអតិថិជន ទិសដៅ និងទំនិញឱ្យបានគ្រប់គ្រាន់!");
    }

    const invCode = 'INV-' + Math.floor(100000 + Math.random() * 900000);
    const itemsTotal = currentInvoiceItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const grandTotal = itemsTotal + deliveryFee;

    currentInvoiceItems.forEach(item => {
        const p = productsData.find(prod => prod.id === item.productId);
        if (p) {
            p.avail -= item.qty;
        }
    });

    try {
        await database.ref('sales').child(invCode).set({ 
            invCode, customer, phone, location, date, 
            itemsTotal: itemsTotal,
            deliveryFee: deliveryFee,
            total: grandTotal, 
            items: currentInvoiceItems 
        });
        
        await database.ref('deliveries').child(invCode).set({ 
            invCode, customer, phone, fromLoc, location, driver, status: "កំពុងរៀបចំ" 
        });

        const productsObj = {};
        productsData.forEach(p => { productsObj[p.id] = p; });
        await database.ref('products').set(productsObj);

        // 🔔 ១. ចាក់សំឡេង
        playSuccessSound();

        // 📱 ២. លោត Notification លើ Screen ទូរស័ព្ទ
        triggerPhoneNotification(invCode, customer, grandTotal);

        // 📄 ៣. ទាញយក PDF
        downloadInvoicePDF(invCode);

        alert(`🎉 រក្សាទុកវិក្កយបត្រលេខ ${invCode} រួចរាល់ដោយជោគជ័យ!`);
        
        resetInvoiceForm();
        switchTab('delivery');

    } catch (error) {
        console.error("Save Invoice Error:", error);
        alert("❌ មានបញ្ហាក្នុងការរក្សាទុកទិន្នន័យ!");
    }
}

function searchCustomerHistory() {
    const phoneInput = document.getElementById('searchCustPhone').value.trim();
    const resultArea = document.getElementById('custHistoryResult');
    const nameEl = document.getElementById('custHistoryName');
    const phoneEl = document.getElementById('custHistoryPhone');
    const totalSpentEl = document.getElementById('custHistoryTotalSpent');
    const totalInvEl = document.getElementById('custHistoryTotalInvoices');
    const tableBody = document.getElementById('custHistoryTableBody');

    if (!phoneInput) {
        alert("⚠️ សូមបញ្ចូលលេខទូរស័ព្ទអតិថិជនដើម្បីស្វែងរក!");
        return;
    }

    const customerSales = salesData.filter(s => s.phone && s.phone.replace(/\s+/g, '') === phoneInput.replace(/\s+/g, ''));

    if (customerSales.length === 0) {
        resultArea.classList.add('hidden');
        alert("❌ រកមិនឃើញប្រវត្តិទិញសម្រាប់លេខទូរស័ព្ទនេះទេ!");
        return;
    }

    const firstMatch = customerSales[0];
    const totalSpent = customerSales.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);

    nameEl.innerText = firstMatch.customer || 'មិនស្គាល់';
    phoneEl.innerText = phoneInput;
    totalSpentEl.innerText = `$${totalSpent.toFixed(2)}`;
    totalInvEl.innerText = `${customerSales.length} វិក្កយបត្រ`;

    tableBody.innerHTML = customerSales.map(s => `
        <tr class="text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
            <td class="p-3 pl-6 font-medium">${s.date || '-'}</td>
            <td class="p-3 font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer" onclick="viewInvoice('${s.invCode}')">${s.invCode}</td>
            <td class="p-3 text-slate-600 dark:text-slate-300">
                ${s.items ? s.items.map(i => `${i.name} (x${i.qty})`).join(', ') : '-'}
            </td>
            <td class="p-3 text-slate-500 dark:text-slate-400">${s.location || '-'}</td>
            <td class="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">$${(parseFloat(s.total) || 0).toFixed(2)}</td>
            <td class="p-3 text-center">
                <button onclick="viewInvoice('${s.invCode}')" class="bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-400 p-1.5 rounded-xl transition text-[11px] font-bold cursor-pointer">👁️ មើល</button>
            </td>
        </tr>
    `).join('');

    resultArea.classList.remove('hidden');
}

function deleteInvoice(invCode) {
    if (!currentUser || currentUser.role !== 'Admin') return alert("⚠️ អ្នកគ្មានសិទ្ធិលុបវិក្កយបត្រនេះទេ!");
    
    if (confirm(`⚠️ តើអ្នកពិតជាចង់លុបវិក្កយបត្រលេខ ${invCode} នេះមែនទេ?`)) {
        database.ref('sales').child(invCode).remove();
        database.ref('deliveries').child(invCode).remove().then(() => {
            alert("🗑️ បានលុបវិក្កយបត្រដោយជោគជ័យ!");
        });
    }
}

function resetInvoiceForm() {
    currentInvoiceItems = [];
    currentInvoiceGrandTotal = 0;
    if (document.getElementById('invoiceCustomer')) document.getElementById('invoiceCustomer').value = '';
    if (document.getElementById('invoicePhone')) document.getElementById('invoicePhone').value = '';
    if (document.getElementById('invoiceLocation')) document.getElementById('invoiceLocation').value = '';
    if (document.getElementById('invoiceDeliveryFee')) document.getElementById('invoiceDeliveryFee').value = '0.00';
    if (document.getElementById('invoiceDriverSelect')) document.getElementById('invoiceDriverSelect').value = 'មិនទាន់ចាត់ចែង';
    if (document.getElementById('cashReceived')) document.getElementById('cashReceived').value = '';
    if (document.getElementById('changeDue')) document.getElementById('changeDue').value = '$0.00';
    renderInvoicePreviewTable();
}

function downloadInvoicePDF(customInvCode) {
    if (typeof html2pdf === 'undefined') {
        console.warn("⚠️ មិនឃើញ Library html2pdf ទេ!");
        return;
    }

    const invCode = customInvCode || ('INV-' + Math.floor(100000 + Math.random() * 900000));
    const customer = document.getElementById('invoiceCustomer')?.value || 'អតិថិជនទូទៅ';
    const phone = document.getElementById('invoicePhone')?.value || '-';
    const location = document.getElementById('invoiceLocation')?.value || '-';
    const date = document.getElementById('invoiceDate')?.value || new Date().toISOString().split('T')[0];
    const deliveryFee = parseFloat(document.getElementById('invoiceDeliveryFee')?.value) || 0;

    if (currentInvoiceItems.length === 0) return;

    const itemsTotal = currentInvoiceItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const grandTotalNum = itemsTotal + deliveryFee;
    const grandTotalRielStr = Math.round(grandTotalNum * 4000).toLocaleString('km-KH');

    const pdfTemplate = `
        <div style="padding: 24px; font-family: 'Kantumruy Pro', sans-serif; color: #0f172a; background: #ffffff;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-bottom: 20px;">
                <div>
                    <h1 style="color: #4f46e5; margin: 0; font-size: 22px; font-weight: 900;">VCK SHOP</h1>
                    <p style="margin: 3px 0 0 0; font-size: 11px; color: #64748b;">ផ្គត់ផ្គង់សម្ភារៈតុការចានប្រណិតទាន់សម័យ</p>
                </div>
                <div style="text-align: right;">
                    <h3 style="margin: 0; font-size: 15px; color: #1e293b;">វិក្កយបត្រ / INVOICE</h3>
                    <p style="margin: 3px 0 0 0; font-size: 11px; color: #6366f1; font-weight: bold;">${invCode}</p>
                </div>
            </div>

            <div style="background-color: #f8fafc; padding: 12px 16px; border-radius: 12px; margin-bottom: 20px; font-size: 12px; border: 1px solid #e2e8f0; display: flex; justify-content: space-between;">
                <div>
                    <p style="margin: 2px 0;"><strong>អតិថិជន:</strong> ${customer}</p>
                    <p style="margin: 2px 0;"><strong>លេខទូរស័ព្ទ:</strong> ${phone}</p>
                </div>
                <div style="text-align: right;">
                    <p style="margin: 2px 0;"><strong>ថ្ងៃខែ:</strong> ${date}</p>
                    <p style="margin: 2px 0;"><strong>ទិសដៅ:</strong> ${location}</p>
                </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
                <thead>
                    <tr style="background-color: #4f46e5; color: white;">
                        <th style="padding: 8px; text-align: center; border-radius: 6px 0 0 0;">#</th>
                        <th style="padding: 8px; text-align: left;">ឈ្មោះទំនិញ</th>
                        <th style="padding: 8px; text-align: center;">ចំនួន</th>
                        <th style="padding: 8px; text-align: right;">តម្លៃរាយ</th>
                        <th style="padding: 8px; text-align: right; border-radius: 0 6px 0 0;">សរុប</th>
                    </tr>
                </thead>
                <tbody>
                    ${currentInvoiceItems.map((item, idx) => `
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 8px; text-align: center; color: #64748b;">${idx + 1}</td>
                            <td style="padding: 8px; font-weight: bold;">${item.name}</td>
                            <td style="padding: 8px; text-align: center;">${item.qty}</td>
                            <td style="padding: 8px; text-align: right;">$${parseFloat(item.price).toFixed(2)}</td>                             <td style="padding: 8px; text-align: right; font-weight: bold;">$${parseFloat(item.totalPrice).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                <div style="font-size: 10px; color: #94a3b8;">
                    <p style="margin: 0;">សូមអរគុណចំពោះការគាំទ្រ VCK SHOP!</p>
                </div>
                <div style="text-align: right; font-size: 12px;">
                    <p style="margin: 2px 0; color: #64748b;">សរុបទំនិញ៖ $${itemsTotal.toFixed(2)}</p>
                    <p style="margin: 2px 0; color: #64748b;">សេវាដឹកជញ្ជូន៖ $${deliveryFee.toFixed(2)}</p>
                    <h3 style="margin: 6px 0 0 0; color: #4338ca; font-size: 18px; font-weight: 900;">សរុប៖ $${grandTotalNum.toFixed(2)} (${grandTotalRielStr} ៛)</h3>
                </div>
            </div>
        </div>
    `;

    const element = document.createElement('div');
    element.innerHTML = pdfTemplate;
    document.body.appendChild(element);

    const opt = {
        margin:       [0.2, 0.2, 0.2, 0.2],
        filename:     `${invCode}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        if (document.body.contains(element)) document.body.removeChild(element);
    }).catch(err => {
        console.error("PDF Export error:", err);
        if (document.body.contains(element)) document.body.removeChild(element);
    });
}

function addNewProductToStock() {
    const name = document.getElementById('newProdName').value.trim();
    const cat = document.getElementById('newProdCat').value.trim();
    const total = parseInt(document.getElementById('newProdTotal').value);
    const price = parseFloat(document.getElementById('newProdPrice').value);
    
    if (!name || !cat || isNaN(total) || isNaN(price)) return alert("⚠️ សូមបំពេញព័ត៌មានឱ្យបានគ្រប់គ្រាន់!");

    const nextId = Date.now(); 
    const newProduct = { id: nextId, name, cat, total, avail: total, price };

    database.ref('products').child(nextId).set(newProduct).then(() => {
        document.getElementById('newProdName').value = '';
        document.getElementById('newProdCat').value = '';
        document.getElementById('newProdTotal').value = '';
        document.getElementById('newProdPrice').value = '';
    });
}

function autoSaveProduct(id) {
    const total = parseInt(document.getElementById(`inline-total-${id}`).value);
    const avail = parseInt(document.getElementById(`inline-avail-${id}`).value);
    const price = parseFloat(document.getElementById(`inline-price-${id}`).value);

    if (isNaN(total) || isNaN(avail) || isNaN(price)) return;
    database.ref('products').child(id).update({ total, avail, price });
}

function deleteProductFromStock(id) {
    if (confirm("⚠️ ចង់លុបទំនិញនេះមែនទេ?")) database.ref('products').child(id).remove();
}

function updateDriver(invCode, driver) { 
    database.ref('deliveries/' + invCode).update({ driver }).then(() => {
        const delivery = deliveryData.find(d => d.invCode === invCode);
        if (delivery) delivery.driver = driver;
        updateDeliveryStatsByDate(); 
    }); 
}

function updateStatus(invCode, status) { 
    database.ref('deliveries/' + invCode).update({ status }).then(() => {
        const delivery = deliveryData.find(d => d.invCode === invCode);
        if (delivery) delivery.status = status;
        updateDeliveryStatsByDate(); 
    }); 
}

function updateDeliveryStatsByDate() {
    const statDateInput = document.getElementById('deliveryStatDate');
    if (!statDateInput) return;
    
    const selectedDate = statDateInput.value;
    const driverCounts = { "លាងហាក់": 0, "ផាន់នី": 0, "សុភាព": 0 };

    deliveryData.forEach(d => {
        const matchedSale = salesData.find(s => s.invCode === d.invCode);
        const deliveryDate = matchedSale ? matchedSale.date : '';

        if (deliveryDate === selectedDate && 
            driverCounts.hasOwnProperty(d.driver) && 
            d.status === 'បានប្រគល់ជូន') {
            driverCounts[d.driver]++;
        }
    });

    if (document.getElementById('stat-driver-1')) document.getElementById('stat-driver-1').innerText = `${driverCounts["លាងហាក់"]} ជើង`;
    if (document.getElementById('stat-driver-2')) document.getElementById('stat-driver-2').innerText = `${driverCounts["ផាន់នី"]} ជើង`;
    if (document.getElementById('stat-driver-3')) document.getElementById('stat-driver-3').innerText = `${driverCounts["សុភាព"]} ជើង`;
}

function renderDashboard() {
    const today = new Date().toISOString().split('T')[0];
    
    const dateInput = document.getElementById('searchDate');
    const selectedDate = dateInput ? dateInput.value : '';

    const monthInput = document.getElementById('searchMonth');
    if (monthInput && !monthInput.value) monthInput.value = today.substring(0, 7);
    const selectedMonth = monthInput ? monthInput.value : today.substring(0, 7);

    let dailySum = 0;
    let monthlySum = 0;

    salesData.forEach(s => {
        const amt = parseFloat(s.total) || 0;
        if (selectedDate && s.date === selectedDate) dailySum += amt;
        if (s.date && typeof s.date === 'string' && s.date.substring(0, 7) === selectedMonth) monthlySum += amt;
    });

    const isAdmin = currentUser && currentUser.role === 'Admin';

    if (document.getElementById('dashDailyAmount')) {
        document.getElementById('dashDailyAmount').innerText = isAdmin ? `$${dailySum.toFixed(2)}` : '***';
    }
    if (document.getElementById('dashMonthlyAmount')) {
        document.getElementById('dashMonthlyAmount').innerText = isAdmin ? `$${monthlySum.toFixed(2)}` : '***';
    }

    if (document.getElementById('dashTotalProducts')) {
        document.getElementById('dashTotalProducts').innerText = `${productsData.length} មុខ`;
    }
    if (document.getElementById('dashLowStockCount')) {
        const lowStockCount = productsData.filter(p => p.avail <= 5).length;
        document.getElementById('dashLowStockCount').innerText = `${lowStockCount} មុខ`;
    }

    renderSalesTable(selectedDate);
    renderBestSellersChart();
}

function renderSalesTable(selectedDate) {
    let filteredSales = selectedDate ? salesData.filter(s => s.date === selectedDate) : salesData;
    filteredSales.sort((a, b) => b.invCode.localeCompare(a.invCode));

    const salesTbody = document.getElementById('salesTableBody');
    if (salesTbody) {
        if (filteredSales.length === 0) {
            const cols = (currentUser && currentUser.role === 'Admin') ? 6 : 4;
            salesTbody.innerHTML = `<tr><td colspan="${cols}" class="p-6 text-center text-xs font-bold text-slate-400">📝 មិនទាន់មានទិន្នន័យលក់ ${selectedDate ? 'សម្រាប់ថ្ងៃទី ' + selectedDate : ''} ទេ</td></tr>`;
        } else {
            salesTbody.innerHTML = filteredSales.map(s => {
                const totalAmt = parseFloat(s.total) || 0;
                let totalTd = '';
                let actionTd = '';

                if (currentUser && currentUser.role === 'Admin') {
                    totalTd = `<td class="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">$${totalAmt.toFixed(2)}</td>`;
                    actionTd = (s.invCode && s.invCode !== '-') ? 
                        `<td class="p-3 text-center pr-6 flex justify-center gap-1">
                            <button onclick="viewInvoice('${s.invCode}')" class="bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-400 p-1.5 rounded-lg transition text-[11px] cursor-pointer" title="មើល">👁️</button>
                            <button onclick="deleteInvoice('${s.invCode}')" class="bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-600 hover:text-white text-rose-600 dark:text-rose-400 p-1.5 rounded-lg transition text-[11px] cursor-pointer" title="លុប">🗑️</button>
                         </td>` : 
                        `<td class="p-3 text-center pr-6 text-slate-300 dark:text-slate-600">-</td>`;
                }

                return `
                    <tr class="text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition border-b border-slate-100 dark:border-slate-800">
                        <td class="p-3 pl-6">${s.date || '-'}</td>
                        <td class="p-3 text-indigo-600 dark:text-indigo-400 font-bold cursor-pointer" onclick="viewInvoice('${s.invCode}')">${s.invCode || '-'}</td>
                        <td class="p-3 font-bold text-slate-800 dark:text-slate-200">${s.customer || '-'}</td>
                        <td class="p-3 text-slate-500 dark:text-slate-400">${s.location || '-'}</td>
                        ${totalTd}
                        ${actionTd}
                    </tr>
                `;
            }).join('');
        }
    }
}

function filterDashSalesTable() {
    const input = document.getElementById('dashSalesSearch').value.toLowerCase();
    const tbody = document.getElementById('salesTableBody');
    const trs = tbody.getElementsByTagName('tr');

    for (let tr of trs) {
        const text = tr.textContent.toLowerCase();
        tr.style.display = text.includes(input) ? '' : 'none';
    }
}

function filterDeliveryTable() {
    const driverFilter = document.getElementById('filterDeliveryDriver').value;
    const statusFilter = document.getElementById('filterDeliveryStatus').value;
    const tbody = document.getElementById('deliveryTableBody');
    const trs = tbody.getElementsByTagName('tr');

    for (let tr of trs) {
        const driverSelect = tr.querySelector('select[onchange*="updateDriver"]');
        const statusSelect = tr.querySelector('select[onchange*="updateStatus"]');

        const driverVal = driverSelect ? driverSelect.value : '';
        const statusVal = statusSelect ? statusSelect.value : '';

        const driverMatch = (driverFilter === 'all') || (driverVal === driverFilter);
        const statusMatch = (statusFilter === 'all') || (statusVal === statusFilter);

        tr.style.display = (driverMatch && statusMatch) ? '' : 'none';
    }
}

function renderAll() {
    const today = new Date().toISOString().split('T')[0];
    renderDashboard();

    const deliveryTbody = document.getElementById('deliveryTableBody');
    if (deliveryTbody) {
        if (deliveryData.length === 0) {
            deliveryTbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-xs font-bold text-slate-400">🚚 មិនទាន់មានជើងដឹកជញ្ជូនទេ</td></tr>`;
        } else {
            deliveryTbody.innerHTML = deliveryData.map(d => {
                const matchedSale = salesData.find(s => s.invCode === d.invCode);
                const dDate = matchedSale ? matchedSale.date : today;
                return `
                    <tr class="text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                        <td class="p-4 pl-6 text-slate-500 dark:text-slate-400">${dDate}</td>
                        <td class="p-4 font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer" onclick="viewInvoice('${d.invCode}')">${d.invCode || '-'}</td>
                        <td class="p-4 font-bold dark:text-slate-200">${d.customer || '-'} ${d.phone ? `(${d.phone})` : ''}</td>
                        <td class="p-4 font-medium text-slate-600 dark:text-slate-400">${d.fromLoc || 'ភ្នំពេញ'}</td>
                        <td class="p-4 font-medium text-indigo-600 dark:text-indigo-400">${d.location || '-'}</td>
                        <td class="p-4">
                            <select onchange="updateDriver('${d.invCode}', this.value)" class="border border-slate-200 dark:border-slate-700 p-1.5 rounded-xl text-xs bg-white dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200 focus:outline-none">
                                <option value="មិនទាន់ចាត់ចែង" ${d.driver === 'មិនទាន់ចាត់ចែង' ? 'selected' : ''}>--- ជ្រើសរើស ---</option>
                                <option value="លាងហាក់" ${d.driver === 'លាងហាក់' ? 'selected' : ''}>លាងហាក់</option>
                                <option value="ផាន់នី" ${d.driver === 'ផាន់នី' ? 'selected' : ''}>ផាន់នី</option>
                                <option value="សុភាព" ${d.driver === 'សុភាព' ? 'selected' : ''}>សុភាព</option>
                            </select>
                        </td>
                        <td class="p-4 text-center">
                            <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${d.status === 'បានប្រគល់ជូន' ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' : d.status === 'កំពុងដឹក' ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800' : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'}">${d.status || 'កំពុងរៀបចំ'}</span>
                        </td>
                        <td class="p-4 text-center">
                            <select onchange="updateStatus('${d.invCode}', this.value)" class="border border-slate-200 dark:border-slate-700 p-1.5 rounded-xl text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none">
                                <option value="កំពុងរៀបចំ" ${d.status === 'កំពុងរៀបចំ' ? 'selected' : ''}>កំពុងរៀបចំ</option>
                                <option value="កំពុងដឹក" ${d.status === 'កំពុងដឹក' ? 'selected' : ''}>កំពុងដឹក</option>
                                <option value="បានប្រគល់ជូន" ${d.status === 'បានប្រគល់ជូន' ? 'selected' : ''}>បានប្រគល់ជូន</option>
                            </select>
                        </td>
                    </tr>`;
            }).join('');
        }
    }

    const stockTbody = document.getElementById('stockTableBody');
    if (stockTbody) {
        if (productsData.length === 0) {
            stockTbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-xs font-bold text-slate-400">📦 មិនទាន់មានទំនិញទេ</td></tr>`;
        } else {
            stockTbody.innerHTML = productsData.map((p, index) => `
                <tr class="text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                    <td class="p-3 text-center font-bold text-slate-400">${index + 1}</td>
                    <td class="p-3 font-bold text-slate-800 dark:text-slate-200">${p.name}</td>
                    <td class="p-3"><span class="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-lg text-[10px] font-bold">${p.cat}</span></td>
                    <td class="p-2 text-center"><input type="number" id="inline-total-${p.id}" value="${p.total}" onchange="autoSaveProduct(${p.id})" class="w-16 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-center p-1 font-bold"></td>
                    <td class="p-2 text-center"><input type="number" id="inline-avail-${p.id}" value="${p.avail}" onchange="autoSaveProduct(${p.id})" class="w-16 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-center p-1 font-bold ${p.avail <= 5 ? 'text-rose-500 font-black bg-rose-50 dark:bg-rose-950/50' : ''}"></td>
                    <td class="p-2 text-right"><input type="number" step="0.01" id="inline-price-${p.id}" value="${p.price}" onchange="autoSaveProduct(${p.id})" class="w-20 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-right p-1 font-bold"></td>
                    <td class="p-3 text-center"><button onclick="deleteProductFromStock(${p.id})" class="text-rose-600 dark:text-rose-400 hover:text-rose-800 cursor-pointer text-sm">🗑️</button></td>
                </tr>
            `).join('');
        }
    }

    updateDeliveryStatsByDate();
}

function searchStockFunction() {
    let input = document.getElementById("searchStockInput");
    let filter = input.value.toLowerCase();
    let tableBody = document.getElementById("stockTableBody");
    let tr = tableBody.getElementsByTagName("tr");

    for (let i = 0; i < tr.length; i++) {
        let tdName = tr[i].getElementsByTagName("td")[1];
        let tdCategory = tr[i].getElementsByTagName("td")[2];
        
        if (tdName || tdCategory) {
            let txtValueName = tdName.textContent || tdName.innerText;
            let txtValueCategory = tdCategory.textContent || tdCategory.innerText;
            
            if (txtValueName.toLowerCase().indexOf(filter) > -1 || txtValueCategory.toLowerCase().indexOf(filter) > -1) {
                tr[i].style.display = "";
            } else {
                tr[i].style.display = "none";
            }
        }       
    }
}

function viewInvoice(invoiceId) {
    database.ref('sales/' + invoiceId).once('value').then((snapshot) => {
        const data = snapshot.val();
        if (!data) return alert("រកមិនឃើញវិក្កយបត្រនេះទេ!");

        const modal = document.getElementById('invoiceModal');
        const content = document.getElementById('modalInvoiceContent');
        const deliveryFee = parseFloat(data.deliveryFee) || 0;
        
        const exchangeRate = 4000;
        const totalNum = parseFloat(data.total) || 0;
        const totalRielStr = Math.round(totalNum * exchangeRate).toLocaleString('km-KH');

        content.innerHTML = `
            <div class="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 space-y-1">
                <p class="text-xs font-bold text-slate-500 dark:text-slate-400">វិក្កយបត្រលេខ: <span class="text-indigo-600 dark:text-indigo-400 font-extrabold">${data.invCode || invoiceId}</span></p>
                <p class="text-xs font-bold text-slate-500 dark:text-slate-400">អតិថិជន: <span class="text-slate-800 dark:text-slate-200">${data.customer || '-'}</span> (${data.phone || 'គ្មានលេខ'})</p>
                <p class="text-xs font-bold text-slate-500 dark:text-slate-400">ទិសដៅ: <span class="text-slate-800 dark:text-slate-200">${data.location || '-'}</span></p>
                <p class="text-xs font-bold text-slate-500 dark:text-slate-400">កាលបរិច្ឆេទ: <span class="text-slate-800 dark:text-slate-200">${data.date || '-'}</span></p>
            </div>
            <table class="w-full text-xs border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <thead class="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    <tr>
                        <th class="p-2 border-r dark:border-slate-800 text-left">ទំនិញ</th>
                        <th class="p-2 border-r dark:border-slate-800 text-center">ចំនួន</th>
                        <th class="p-2 text-right border-r dark:border-slate-800">តម្លៃ</th>
                        <th class="p-2 text-right">សរុប</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    ${data.items ? data.items.map(item => `
                        <tr>
                            <td class="p-2 border-r dark:border-slate-800 text-left font-medium text-slate-800 dark:text-slate-200">${item.name}</td>
                            <td class="p-2 border-r dark:border-slate-800 text-center font-bold">${item.qty}</td>
                            <td class="p-2 border-r dark:border-slate-800 text-right">$${parseFloat(item.price).toFixed(2)}</td>                             <td class="p-2 text-right font-bold text-slate-700 dark:text-slate-200">$${parseFloat(item.totalPrice).toFixed(2)}</td>
                        </tr>
                    `).join('') : '<tr><td colspan="4" class="p-2 text-center text-slate-400">គ្មានទិន្នន័យ</td></tr>'}
                </tbody>
            </table>

            <div class="mt-3 text-xs space-y-1 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div class="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>សរុបតម្លៃទំនិញ៖</span>
                    <span>$${(parseFloat(data.total) - deliveryFee).toFixed(2)}</span>
                </div>
                <div class="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>សេវាដឹកជញ្ជូន៖</span>
                    <span>$${deliveryFee.toFixed(2)}</span>
                </div>
            </div>

            <div class="text-right mt-4 p-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
                <p class="text-xs font-black text-indigo-700 dark:text-indigo-300">សរុបទាំងអស់: $${totalNum.toFixed(2)} (${totalRielStr} ៛)</p>
            </div>
        `;
        modal.classList.remove('hidden');
    });
}

function closeInvoiceModal() {
    const modal = document.getElementById('invoiceModal');
    if (modal) modal.classList.add('hidden');
}

function toggleMobileMenu() {
    const menu = document.getElementById('sidebarMenu');
    const footer = document.getElementById('userFooter');
    menu.classList.toggle('hidden');
    footer.classList.toggle('hidden');
    footer.classList.toggle('flex');
}

function renderBestSellersChart() {
    const ctx = document.getElementById('bestSellersChart')?.getContext('2d');
    if (!ctx) return;

    const filter = document.getElementById('chartFilter')?.value || 'month';
    const currentMonth = new Date().toISOString().substring(0, 7);
    
    const productSalesCount = {};

    salesData.forEach(sale => {
        if (filter === 'month' && sale.date && !sale.date.startsWith(currentMonth)) {
            return;
        }

        if (sale.items && Array.isArray(sale.items)) {
            sale.items.forEach(item => {
                if (productSalesCount[item.name]) {
                    productSalesCount[item.name] += item.qty;
                } else {
                    productSalesCount[item.name] = item.qty;
                }
            });
        }
    });

    const sortedProducts = Object.entries(productSalesCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const labels = sortedProducts.map(p => p[0]);
    const dataValues = sortedProducts.map(p => p[1]);

    if (myChartInstance) {
        myChartInstance.destroy();
    }

    myChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels.length > 0 ? labels : ['គ្មានទិន្នន័យ'],
            datasets: [{
                data: dataValues.length > 0 ? dataValues : [1],
                backgroundColor: [
                    '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}
