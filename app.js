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

// 🎯 ប្តូរមកប្រើ Token និង Chat ID ថ្មីរបស់អ្នក
const TELEGRAM_BOT_TOKEN = "8830737719:AAHYaFzRQYAFwPXHhYexgTdVGYOGrenYIKE"; 
const TELEGRAM_CHAT_ID = "-1004430346289"; 

window.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('vck_current_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        initSystemAfterLogin();
        const today = new Date().toISOString().split('T')[0];
        if (document.getElementById('deliveryStatDate')) document.getElementById('deliveryStatDate').value = today;
        if (document.getElementById('filterDeliveryDate')) document.getElementById('filterDeliveryDate').value = today;
    }
});

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

    document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('active-menu'));
    const targetBtn = document.getElementById('btn-' + tabId);
    if (targetBtn) targetBtn.classList.add('active-menu');
    
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
        <tr class="border-b text-xs">
            <td class="p-2 text-center border-r">${index + 1}</td>
            <td class="p-2 border-r font-medium">${item.name}</td>
            <td class="p-2 text-center border-r font-bold">${item.qty}</td>
            <td class="p-2 text-right border-r">$${item.price.toFixed(2)}</td>
            <td class="p-2 text-right font-bold text-slate-700">$${item.totalPrice.toFixed(2)}</td>
            <td class="p-2 text-center print-hide"><button onclick="removeInvoiceItem(${index})" class="text-rose-500 cursor-pointer">❌</button></td>
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
    const exchangeRate = 4000;
    const grandTotalRiel = Math.round(grandTotal * exchangeRate);
    const formattedRiel = grandTotalRiel.toLocaleString('km-KH');

    const grandTotalElement = document.getElementById('invoiceGrandTotal');
    if (grandTotalElement) {
        grandTotalElement.innerHTML = `$${grandTotal.toFixed(2)} <span class="text-xs font-normal text-slate-500">(${formattedRiel} ៛)</span>`;
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

    const lowStockAlerts = [];

    currentInvoiceItems.forEach(item => {
        const p = productsData.find(prod => prod.id === item.productId);
        if (p) {
            p.avail -= item.qty;
            if (p.avail <= 5) {
                lowStockAlerts.push({ name: p.name, avail: p.avail });
            }
        }
    });

    try {
        // ១. រក្សាទុកចូល Firebase
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

        // ២. ផ្ញើសារដំណឹងទៅកាន់ Telegram Bot
        sendTelegramNotification(invCode, customer, phone, location, date, driver, grandTotal, currentInvoiceItems, deliveryFee);

        if (lowStockAlerts.length > 0) {
            sendLowStockTelegramAlert(lowStockAlerts);
        }

        // ៣. បង្កើត PDF
        downloadInvoicePDF(invCode);

        alert("🎉 រក្សាទុកចូលរបាយការណ៍ និងផ្ញើចូល Telegram Bot ជោគជ័យ!");
        resetInvoiceForm();
        switchTab('dashboard');

    } catch (error) {
        console.error("Save Invoice Error:", error);
        alert("❌ មានបញ្ហាក្នុងការរក្សាទុកទិន្នន័យ!");
    }
}

function sendLowStockTelegramAlert(items) {
    let itemsListText = items.map(i => `⚠️ *${i.name}* ➔ នៅសល់ត្រឹមតែ *${i.avail}* ប៉ុណ្ណោះ!`).join('\n');
    let message = `🚨 *ការជូនដំណឹង៖ ទំនិញជិតអស់ពីស្តុក (LOW STOCK ALERT)*\n` +
                  `------------------------------\n` +
                  `${itemsListText}\n` +
                  `------------------------------\n` +
                  `សូមពិនិត្យ និងបំពេញស្តុកបន្ថែម!`;

    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'Markdown'
        })
    }).catch(err => console.error('Low Stock Telegram Error:', err));
}

async function sendTelegramNotification(invCode, customer, phone, location, date, driver, total, items, deliveryFee = 0) {
    const exchangeRate = 4000;
    
    let itemsTotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    let itemsTotalRiel = Math.round(itemsTotal * exchangeRate).toLocaleString('km-KH');
    let deliveryFeeNum = parseFloat(deliveryFee) || 0;
    let deliveryFeeRiel = Math.round(deliveryFeeNum * exchangeRate).toLocaleString('km-KH');
    let totalNum = parseFloat(total) || 0;
    let grandTotalRiel = Math.round(totalNum * exchangeRate).toLocaleString('km-KH');

    let itemsListStr = items.map((item, idx) => 
        `  ${idx + 1}. <b>${item.name}</b>\n     └ ចំនួន: <code>${item.qty}</code> × $${parseFloat(item.price).toFixed(2)} = <b>$${parseFloat(item.totalPrice).toFixed(2)}</b>`
    ).join('\n');

    // ប្រើប្រាស់ HTML Format ជំនួស Markdown ដើម្បីជៀសវាងបញ្ហា Link Syntax Error
    let message = `🧾 <b>វិក្កយបត្រលក់ថ្មី / NEW INVOICE</b>\n`;
    message += `━━━━━━━━━━━━━━━━━━━\n`;
    message += `🔖 លេខកូដ: <b>${invCode}</b>\n`;
    message += `📅 កាលបរិច្ឆេទ: <b>${date}</b>\n`;
    message += `👤 អតិថិជន: <b>${customer}</b>\n`;
    message += `📞 ទូរស័ព្ទ: <b>${phone || 'គ្មានលេខ'}</b>\n`;
    message += `📍 ទីតាំងដឹក: <b>${location}</b>\n`;
    message += `🛵 អ្នកដឹកជញ្ជូន: <b>${driver || 'មិនទាន់ចាត់ចែង'}</b>\n`;
    message += `━━━━━━━━━━━━━━━━━━━\n`;
    message += `📦 <b>បញ្ជីទំនិញបញ្ជាទិញ:</b>\n${itemsListStr}\n`;
    message += `━━━━━━━━━━━━━━━━━━━\n`;
    message += `💵 សរុបទំនិញ: <b>$${itemsTotal.toFixed(2)}</b> (${itemsTotalRiel} ៛)\n`;
    message += `🚚 ថ្លៃដឹកជញ្ជូន: <b>$${deliveryFeeNum.toFixed(2)}</b> (${deliveryFeeRiel} ៛)\n`;
    message += `💰 <b>ប្រាក់សរុបត្រូវទូទាត់:</b>\n👉 <b>$${totalNum.toFixed(2)}</b> (<b>${grandTotalRiel} ៛</b>)\n`;
    message += `━━━━━━━━━━━━━━━━━━━\n`;
    message += `📌 ស្ថានភាព: ⏳ <b>កំពុងរៀបចំ</b>`;

    // ការបង្កើត Inline Keyboard
    const keyboard = {
        inline_keyboard: [
            [
                { 
                    text: "👁️ មើលវិក្កយបត្រអនឡាញ", 
                    url: `https://vck-shop.web.app/?inv=${invCode}` // បើក Browser
                }
            ],
            [
                { text: "🚚 កំពុងដឹក", callback_data: `status_delivering_${invCode}` },
                { text: "✅ រួចរាល់", callback_data: `status_completed_${invCode}` }
            ]
        ]
    };

    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'HTML', // ផ្លាស់ប្តូរមកប្រើ HTML វិញដើម្បីកុំឱ្យទាស់ Link
                reply_markup: keyboard
            })
        });

        const resData = await response.json();
        if (!resData.ok) {
            console.error("❌ Telegram Error:", resData.description);
        } else {
            console.log("✅ ផ្ញើសារទៅ Telegram រួចរាល់!");
        }
    } catch (err) {
        console.error("❌ Network Error:", err);
    }
}
function listenTelegramCommands() {
    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}`)
        .then(res => res.json())
        .then(data => {
            if (data.ok && data.result.length > 0) {
                data.result.forEach(update => {
                    lastUpdateId = update.update_id;
                    
                    if (update.callback_query) {
                        const callbackData = update.callback_query.data;
                        const chatId = update.callback_query.message.chat.id;

                        if (callbackData.startsWith('complete_')) {
                            const invCode = callbackData.replace('complete_', '');
                            database.ref('deliveries/' + invCode).update({ status: 'បានប្រគល់ជូន' }).then(() => {
                                sendTelegramReply(chatId, `✅ *វិក្កយបត្រ ${invCode} បានផ្លាស់ប្តូរទៅជា៖ [បានប្រគល់ជូន] រួចរាល់!*`);
                            });
                        }
                    }

                    if (update.message && update.message.text) {
                        const text = update.message.text.trim();
                        const chatId = update.message.chat.id;

                        if (text === '/stock') {
                            let lowStock = productsData.filter(p => p.avail <= 5);
                            let replyMsg = `📦 *របាយការណ៍ស្តុកទំនិញជិតអស់ (<= ៥)*\n------------------------------\n`;
                            
                            if (lowStock.length === 0) {
                                replyMsg += `✅ គ្រប់មុខទំនិញទាំងអស់មានស្តុកគ្រប់គ្រាន់!`;
                            } else {
                                lowStock.forEach(p => {
                                    replyMsg += `⚠️ *${p.name}*: នៅសល់ \`${p.avail}\` ${p.cat}\n`;
                                });
                            }
                            sendTelegramReply(chatId, replyMsg);
                        }

                        if (text === '/today_sales') {
                            const today = new Date().toISOString().split('T')[0];
                            let todayTotal = 0;
                            let count = 0;

                            salesData.forEach(s => {
                                if (s.date === today) {
                                    todayTotal += (parseFloat(s.total) || 0);
                                    count++;
                                }
                            });

                            const totalRiel = Math.round(todayTotal * 4000).toLocaleString('km-KH');
                            let replyMsg = `💰 *របាយការណ៍លក់ប្រចាំថ្ងៃ (${today})*\n------------------------------\n` +
                                           `🧾 ចំនួនវិក្កយបត្រ៖ *${count}*\n` +
                                           `💵 ចំណូលសរុប៖ *$${todayTotal.toFixed(2)}* (${totalRiel} ៛)`;
                            
                            sendTelegramReply(chatId, replyMsg);
                        }
                    }
                });
            }
        })
        .catch(err => console.error('Telegram Command Error:', err));
}

function sendTelegramReply(chatId, text) {
    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown'
        })
    });
}

setInterval(listenTelegramCommands, 3000);

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
        <tr class="text-xs hover:bg-slate-50 border-b">
            <td class="p-3 pl-6 font-medium">${s.date || '-'}</td>
            <td class="p-3 font-bold text-indigo-600 cursor-pointer" onclick="viewInvoice('${s.invCode}')">${s.invCode}</td>
            <td class="p-3 text-slate-600">
                ${s.items ? s.items.map(i => `${i.name} (x${i.qty})`).join(', ') : '-'}
            </td>
            <td class="p-3 text-slate-500">${s.location || '-'}</td>
            <td class="p-3 text-right font-bold text-emerald-600">$${(parseFloat(s.total) || 0).toFixed(2)}</td>
            <td class="p-3 text-center">
                <button onclick="viewInvoice('${s.invCode}')" class="bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 p-1.5 rounded transition text-[11px] font-bold">👁️ មើល</button>
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
    document.getElementById('invoiceCustomer').value = '';
    document.getElementById('invoicePhone').value = '';
    document.getElementById('invoiceLocation').value = '';
    document.getElementById('invoiceDeliveryFee').value = '0.00';
    document.getElementById('invoiceDriverSelect').value = 'មិនទាន់ចាត់ចែង';
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
        <div style="padding: 20px; font-family: sans-serif; color: #1e293b;">
            <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #6366f1; padding-bottom: 10px; margin-bottom: 15px;">
                <div>
                    <h1 style="color: #6366f1; margin: 0; font-size: 20px;">VCK SHOP</h1>
                    <p style="margin: 2px 0; font-size: 11px; color: #64748b;">INVOICE / វិក្កយបត្រ</p>
                </div>
                <div style="text-align: right;">
                    <h3 style="margin: 0; font-size: 14px;">លេខ៖ ${invCode}</h3>
                    <p style="margin: 2px 0; font-size: 11px; color: #64748b;">ថ្ងៃទី៖ ${date}</p>
                </div>
            </div>

            <div style="background-color: #f8fafc; padding: 10px; border-radius: 6px; margin-bottom: 15px; font-size: 12px;">
                <p style="margin: 2px 0;"><strong>អតិថិជន:</strong> ${customer} (${phone})</p>
                <p style="margin: 2px 0;"><strong>អាសយដ្ឋាន:</strong> ${location}</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 12px;">
                <thead>
                    <tr style="background-color: #6366f1; color: white;">
                        <th style="padding: 6px; border: 1px solid #6366f1;">#</th>
                        <th style="padding: 6px; border: 1px solid #6366f1; text-align: left;">ទំនិញ</th>
                        <th style="padding: 6px; border: 1px solid #6366f1;">ចំនួន</th>
                        <th style="padding: 6px; border: 1px solid #6366f1; text-align: right;">តម្លៃ</th>
                        <th style="padding: 6px; border: 1px solid #6366f1; text-align: right;">សរុប</th>
                    </tr>
                </thead>
                <tbody>
                    ${currentInvoiceItems.map((item, idx) => `
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 6px; text-align: center;">${idx + 1}</td>
                            <td style="padding: 6px;">${item.name}</td>
                            <td style="padding: 6px; text-align: center;">${item.qty}</td>
                            <td style="padding: 6px; text-align: right;">$${parseFloat(item.price).toFixed(2)}</td>
                            <td style="padding: 6px; text-align: right;">$${parseFloat(item.totalPrice).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div style="text-align: right; font-size: 12px;">
                <p style="margin: 2px 0;">សរុបទំនិញ៖ $${itemsTotal.toFixed(2)}</p>
                <p style="margin: 2px 0;">ថ្លៃដឹកជញ្ជូន៖ $${deliveryFee.toFixed(2)}</p>
                <h3 style="margin: 5px 0; color: #4338ca; font-size: 16px;">ប្រាក់សរុប៖ $${grandTotalNum.toFixed(2)} (${grandTotalRielStr} ៛)</h3>
            </div>
        </div>
    `;

    const element = document.createElement('div');
    element.innerHTML = pdfTemplate;
    document.body.appendChild(element);

    const opt = {
        margin:       [0.2, 0.2, 0.2, 0.2],
        filename:     `${invCode}.pdf`,
        image:        { type: 'jpeg', quality: 0.95 },
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
        
        if (selectedDate && s.date === selectedDate) {
            dailySum += amt;
        }
        
        if (s.date && typeof s.date === 'string' && s.date.substring(0, 7) === selectedMonth) {
            monthlySum += amt;
        }
    });

    const isAdmin = currentUser && currentUser.role === 'Admin';

    if (document.getElementById('dashDailyAmount')) {
        document.getElementById('dashDailyAmount').innerText = isAdmin ? `$${dailySum.toFixed(2)}` : '***';
    }
    if (document.getElementById('dashMonthlyAmount')) {
        document.getElementById('dashMonthlyAmount').innerText = isAdmin ? `$${monthlySum.toFixed(2)}` : '***';
    }

    renderSalesTable(selectedDate);
}

function renderSalesTable(selectedDate) {
    let filteredSales = selectedDate ? salesData.filter(s => s.date === selectedDate) : salesData;
    filteredSales.sort((a, b) => b.invCode.localeCompare(a.invCode));

    const salesTbody = document.getElementById('salesTableBody');
    if (salesTbody) {
        if (filteredSales.length === 0) {
            const cols = (currentUser && currentUser.role === 'Admin') ? 6 : 5;
            salesTbody.innerHTML = `<tr><td colspan="${cols}" class="p-6 text-center text-xs font-bold text-slate-400">📝 មិនទាន់មានទិន្នន័យលក់ ${selectedDate ? 'សម្រាប់ថ្ងៃទី ' + selectedDate : ''} ទេ</td></tr>`;
        } else {
            salesTbody.innerHTML = filteredSales.map(s => {
                const totalAmt = parseFloat(s.total) || 0;
                let actionTd = '';
                if (currentUser && currentUser.role === 'Admin') {
                    actionTd = (s.invCode && s.invCode !== '-') ? 
                        `<td class="p-3 text-center pr-6 flex justify-center gap-1.5">
                            <button onclick="viewInvoice('${s.invCode}')" class="bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 p-1 rounded transition text-[11px] cursor-pointer shadow-sm" title="មើលលម្អិត">👁️</button>
                            <button onclick="deleteInvoice('${s.invCode}')" class="bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 p-1 rounded transition text-[11px] cursor-pointer shadow-sm" title="លុប">🗑️</button>
                         </td>` : 
                        `<td class="p-3 text-center pr-6 text-slate-300">-</td>`;
                }

                return `
                    <tr class="text-xs hover:bg-slate-50">
                        <td class="p-3 pl-6">${s.date || '-'}</td>
                        <td class="p-3 text-indigo-600 font-bold cursor-pointer" onclick="viewInvoice('${s.invCode}')">${s.invCode || '-'}</td>
                        <td class="p-3 font-medium">${s.customer || '-'}</td>
                        <td class="p-3 text-slate-500">${s.location || '-'}</td>
                        <td class="p-3 text-right font-bold text-emerald-600">$${totalAmt.toFixed(2)}</td>
                        ${actionTd}
                    </tr>
                `;
            }).join('');
        }
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
                    <tr class="text-xs hover:bg-slate-50">
                        <td class="p-4 pl-6 text-slate-500">${dDate}</td>
                        <td class="p-4 font-bold text-indigo-600 cursor-pointer" onclick="viewInvoice('${d.invCode}')">${d.invCode || '-'}</td>
                        <td class="p-4 font-bold">${d.customer || '-'} ${d.phone ? `(${d.phone})` : ''}</td>
                        <td class="p-4 font-medium text-slate-600">${d.fromLoc || 'ភ្នំពេញ'}</td>
                        <td class="p-4 font-medium text-indigo-600">${d.location || '-'}</td>
                        <td class="p-4">
                            <select onchange="updateDriver('${d.invCode}', this.value)" class="border border-slate-200 p-1.5 rounded-xl text-xs bg-white font-bold text-slate-700 focus:outline-none">
                                <option value="មិនទាន់ចាត់ចែង" ${d.driver === 'មិនទាន់ចាត់ចែង' ? 'selected' : ''}>--- ជ្រើសរើស ---</option>
                                <option value="លាងហាក់" ${d.driver === 'លាងហាក់' ? 'selected' : ''}>លាងហាក់</option>
                                <option value="ផាន់នី" ${d.driver === 'ផាន់នី' ? 'selected' : ''}>ផាន់នី</option>
                                <option value="សុភាព" ${d.driver === 'សុភាព' ? 'selected' : ''}>សុភាព</option>
                            </select>
                        </td>
                        <td class="p-4 text-center">
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${d.status === 'បានប្រគល់ជូន' ? 'bg-emerald-50 text-emerald-600' : d.status === 'កំពុងដឹក' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}">${d.status || 'កំពុងរៀបចំ'}</span>
                        </td>
                        <td class="p-4 text-center">
                            <select onchange="updateStatus('${d.invCode}', this.value)" class="border border-slate-200 p-1.5 rounded-xl text-xs bg-white text-slate-700 focus:outline-none">
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
                <tr class="text-xs hover:bg-slate-50">
                    <td class="p-3 text-center font-bold text-slate-400">${index + 1}</td>
                    <td class="p-3 font-bold text-slate-700">${p.name}</td>
                    <td class="p-3"><span class="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px]">${p.cat}</span></td>
                    <td class="p-2 text-center"><input type="number" id="inline-total-${p.id}" value="${p.total}" onchange="autoSaveProduct(${p.id})" class="w-16 border border-slate-200 rounded text-center p-1 font-bold"></td>
                    <td class="p-2 text-center"><input type="number" id="inline-avail-${p.id}" value="${p.avail}" onchange="autoSaveProduct(${p.id})" class="w-16 border border-slate-200 rounded text-center p-1 font-bold ${p.avail <= 5 ? 'text-rose-500 font-black' : ''}"></td>
                    <td class="p-2 text-right"><input type="number" step="0.01" id="inline-price-${p.id}" value="${p.price}" onchange="autoSaveProduct(${p.id})" class="w-20 border border-slate-200 rounded text-right p-1 font-bold"></td>
                    <td class="p-3 text-center"><button onclick="deleteProductFromStock(${p.id})" class="text-rose-600 cursor-pointer text-sm">🗑️</button></td>
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
            <div class="border-b pb-3 mb-4">
                <p class="text-xs font-bold text-slate-500">វិក្កយបត្រលេខ: <span class="text-slate-800">${data.invCode || invoiceId}</span></p>
                <p class="text-xs font-bold text-slate-500">អតិថិជន: <span class="text-slate-800">${data.customer || '-'}</span> (${data.phone || 'គ្មានលេខ'})</p>
                <p class="text-xs font-bold text-slate-500">ទិសដៅ: <span class="text-slate-800">${data.location || '-'}</span></p>
                <p class="text-xs font-bold text-slate-500">កាលបរិច្ឆេទ: <span class="text-slate-800">${data.date || '-'}</span></p>
            </div>
            <table class="w-full text-xs border border-slate-200">
                <thead class="bg-slate-100">
                    <tr>
                        <th class="p-2 border-r text-left">ទំនិញ</th>
                        <th class="p-2 border-r">ចំនួន</th>
                        <th class="p-2 text-right">តម្លៃរាយ</th>
                        <th class="p-2 text-right">សរុប</th>
                    </tr>
                </thead>
                <tbody class="divide-y text-center">
                    ${data.items ? data.items.map(item => `
                        <tr>
                            <td class="p-2 border-r text-left font-medium">${item.name}</td>
                            <td class="p-2 border-r font-bold">${item.qty}</td>
                            <td class="p-2 border-r text-right">$${parseFloat(item.price).toFixed(2)}</td>
                            <td class="p-2 text-right font-bold text-slate-700">$${parseFloat(item.totalPrice).toFixed(2)}</td>
                        </tr>
                    `).join('') : '<tr><td colspan="4" class="p-2">គ្មានទិន្នន័យ</td></tr>'}
                </tbody>
            </table>

            <div class="mt-3 text-xs space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div class="flex justify-between text-slate-600">
                    <span>សរុបតម្លៃទំនិញ៖</span>
                    <span>$${(parseFloat(data.total) - deliveryFee).toFixed(2)}</span>
                </div>
                <div class="flex justify-between text-slate-600">
                    <span>សេវាដឹកជញ្ជូន៖</span>
                    <span>$${deliveryFee.toFixed(2)}</span>
                </div>
            </div>

            <div class="text-right mt-4 p-3 bg-indigo-50 rounded-xl">
                <p class="text-xs font-bold text-indigo-600">សរុបទាំងអស់: $${totalNum.toFixed(2)} (${totalRielStr} ៛)</p>
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

function checkAndSendDailyDriverSummary() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    if (hours === 17 && minutes === 17) {
        const today = now.toISOString().split('T')[0];
        const driverCounts = { "លាងហាក់": 0, "ផាន់នី": 0, "សុភាព": 0 };
        let totalRevenueToday = 0;

        deliveryData.forEach(d => {
            const matchedSale = salesData.find(s => s.invCode === d.invCode);
            const deliveryDate = matchedSale ? matchedSale.date : '';

            if (deliveryDate === today) {
                if (matchedSale) {
                    totalRevenueToday += (parseFloat(matchedSale.total) || 0);
                }
                if (driverCounts.hasOwnProperty(d.driver) && d.status === 'បានប្រគល់ជូន') {
                    driverCounts[d.driver]++;
                }
            }
        });

        const exchangeRate = 4000;
        const totalRevenueRiel = Math.round(totalRevenueToday * exchangeRate).toLocaleString('km-KH');

        let message = `🛵 *របាយការណ៍សង្ខេបប្រចាំថ្ងៃ*\n` +
                      `📅 *កាលបរិច្ឆេទ:* ${today}\n` +
                      `------------------------------\n` +
                      `👤 *លោក លាងហាក់:* ${driverCounts["លាងហាក់"]} ជើង\n` +
                      `👤 *លោក ផាន់នី:* ${driverCounts["ផាន់នី"]} ជើង\n` +
                      `👤 *លោក សុភាព:* ${driverCounts["សុភាព"]} ជើង\n` +
                      `------------------------------\n` +
                      `💰 *ចំណូលសរុបថ្ងៃនេះ:* *$${totalRevenueToday.toFixed(2)}* (${totalRevenueRiel} ៛)\n` +
                      `------------------------------\n` +
                      `✅ បានបញ្ចប់ការពិនិត្យស្វ័យប្រវត្តី។`;

        fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'Markdown'
            })
        })
        .then(response => console.log('Daily summary sent successfully'))
        .catch(err => console.error('Daily Summary Telegram Error:', err));
    }
}

setInterval(checkAndSendDailyDriverSummary, 60000);

let myChartInstance = null;

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
