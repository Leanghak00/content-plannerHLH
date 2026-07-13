// Firebase Configuration
const firebaseConfig = {
     apiKey: "AIzaSyB9n8IsVFNv8uX5INh0dwOyAC8gIJhhw9c",
  authDomain: "contentplanneer.firebaseapp.com",
  databaseURL: "https://contentplanneer-default-rtdb.firebaseio.com",
  projectId: "contentplanneer",
  storageBucket: "contentplanneer.firebasestorage.app",
  messagingSenderId: "1080920711361",
  appId: "1:1080920711361:web:1b59aeee301a6d0d07b440",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Local Data State
const usersData = [
    { id: 1, name: "Vicheka", role: "Admin", password: "123" },
    { id: 2, name: "លាងហាក់", role: "User", password: "123" },
    { id: 3, name: "ផាន់នី", role: "User", password: "123" }
];

let productsData = [
    { id: 1, name: "ចានបាយប្រណិតជើងមាស", cat: "ចានឆ្នាំង", total: 500, avail: 500, price: 0.80 },
    { id: 2, name: "តុអាហារមូលមហាសាល", cat: "តុ", total: 50, avail: 50, price: 10.00 },
    { id: 3, name: "កៅអីព្រះនាងពូកទន់", cat: "កៅអី", total: 500, avail: 500, price: 1.50 }
];

let currentUser = null;
let salesData = [];
let deliveryData = [];
let currentInvoiceItems = [];

// Firebase Syncing
function listenToFirebaseData() {
    database.ref('products').on('value', (snapshot) => {
        const data = snapshot.val();
        if(data) {
            productsData = Object.values(data);
        } else {
            database.ref('products').set(productsData);
        }
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

// -------------------------------------------------------------
// 🛠️ មុខងារ LOGIN (បានជួសជុលរួចរាល់ ធានាចូលបាន ១០០%)
// -------------------------------------------------------------
function handleLogin() {
    const userIn = document.getElementById('loginUsername').value.trim();
    const passIn = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    
    // ផ្ទៀងផ្ទាត់ឈ្មោះ និងលេខសម្ងាត់ជាមួយ usersData ខាងលើផ្ទាល់
    const foundUser = usersData.find(u => u.name.toLowerCase() === userIn.toLowerCase() && u.password === passIn);

    if (foundUser) {
        currentUser = foundUser;
        errorEl.classList.add('hidden');
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-application').classList.remove('hidden');

        // បង្ហាញឈ្មោះបុគ្គលិកនៅលើ Top Nav
        document.getElementById('topNavUser').innerText = currentUser.name;
        document.getElementById('topNavRole').innerText = currentUser.role === 'Admin' ? 'អ្នកគ្រប់គ្រង (Admin)' : 'បុគ្គលិក (User)';
        document.getElementById('userAvatar').innerText = currentUser.name.charAt(0).toUpperCase();

        // ពិនិត្យសិទ្ធិ Admin/User លើទម្រង់បញ្ចូលស្តុក
        if (currentUser.role !== 'Admin') {
            document.getElementById('stock-entry-form').classList.add('hidden');
        } else {
            document.getElementById('stock-entry-form').classList.remove('hidden');
        }

        // កំណត់ថ្ងៃខែក្នុងវិក្កយបត្រ
        document.getElementById('invoiceDate').value = new Date().toISOString().split('T')[0];
        setupLivePreviewInputs();
        
        // ចាប់ផ្តើមទាញទិន្នន័យពី Firebase
        listenToFirebaseData();
        switchTab('dashboard');
    } else {
        errorEl.classList.remove('hidden');
    }
}

function handleLogout() {
    currentUser = null;
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('main-application').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById('tab-' + tabId).classList.remove('hidden');
    document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('active-menu'));
    
    const targetBtn = document.getElementById('btn-' + tabId);
    if(targetBtn) targetBtn.classList.add('active-menu');
    
    const titles = {
        dashboard: '📊 ផ្ទាំងគ្រប់គ្រងទូទៅ',
        sales: '📄 វិក្កយបត្រជួល & លក់',
        delivery: '🚚 ប្រព័ន្ធដឹកជញ្ជូន',
        stock: '📦 គ្រប់គ្រងឃ្លាំងស្តុក'
    };
    document.getElementById('pageTitle').innerText = titles[tabId] || 'ប្រព័ន្ធគ្រប់គ្រង';
}

function setupLivePreviewInputs() {
    const inputs = ['Customer', 'Phone', 'Location', 'Date'];
    inputs.forEach(id => {
        const inputEl = document.getElementById('invoice' + id);
        if(inputEl) {
            inputEl.addEventListener('input', (e) => {
                document.getElementById('pdf' + id).innerText = e.target.value || '-';
            });
        }
    });
}

function setupInvoiceProductSelect() {
    const select = document.getElementById('invoiceProductSelect');
    if(!select) return;
    let html = `<option value="">--- ជ្រើសរើសទំនិញ ---</option>`;
    productsData.forEach(p => {
        html += `<option value="${p.id}">${p.name} (ក្នុងឃ្លាំង: ${p.avail})</option>`;
    });
    select.innerHTML = html;
}

function onProductSelectChange() {
    const prodId = parseInt(document.getElementById('invoiceProductSelect').value);
    const prod = productsData.find(p => p.id === prodId);
    document.getElementById('invoiceUnitPrice').value = prod ? prod.price : "";
}

function addItemToCurrentInvoice() {
    const prodId = parseInt(document.getElementById('invoiceProductSelect').value);
    const qty = parseInt(document.getElementById('invoiceQty').value);
    const customPrice = parseFloat(document.getElementById('invoiceUnitPrice').value);
    
    if(!prodId || isNaN(qty) || qty <= 0 || isNaN(customPrice) || customPrice < 0) {
        alert("⚠️ សូមជ្រើសរើសមុខទំនិញ បញ្ជាក់ចំនួន និងតម្លៃរាយឱ្យបានត្រឹមត្រូវ!");
        return;
    }

    const prod = productsData.find(p => p.id === prodId);
    if(qty > prod.avail) {
        alert(`⚠️ មុខទំនិញនេះក្នុងឃ្លាំងសល់ត្រឹមតែ ${prod.avail} ប៉ុណ្ណោះ!`);
        return;
    }

    const existing = currentInvoiceItems.find(item => item.productId === prodId);
    if(existing) {
        if((existing.qty + qty) > prod.avail) {
            alert(`⚠️ ចំនួនសរុបលើសពីទំនិញដែលមានក្នុងឃ្លាំងហើយ!`);
            return;
        }
        existing.qty += qty;
        existing.totalPrice = existing.qty * customPrice;
    } else {
        currentInvoiceItems.push({
            productId: prod.id,
            name: prod.name,
            qty: qty,
            price: customPrice,
            totalPrice: qty * customPrice
        });
    }
    renderInvoicePreviewTable();
}

function removeInvoiceItem(index) {
    currentInvoiceItems.splice(index, 1);
    renderInvoicePreviewTable();
}

function renderInvoicePreviewTable() {
    const tbody = document.getElementById('invoiceItemsTableBody');
    if(!tbody) return;
    let html = '';
    let grandTotal = 0;

    currentInvoiceItems.forEach((item, index) => {
        grandTotal += item.totalPrice;
        html += `
            <tr class="border-b">
                <td class="p-2 text-center border-r">${index + 1}</td>
                <td class="p-2 border-r">${item.name}</td>
                <td class="p-2 text-center border-r">${item.qty}</td>
                <td class="p-2 text-right border-r">$${item.price.toFixed(2)}</td>
                <td class="p-2 text-right">$${item.totalPrice.toFixed(2)}</td>
                <td class="p-2 text-center print-hide">
                    <button onclick="removeInvoiceItem(${index})" class="text-red-500 hover:text-red-700">❌</button>
                </td>
            </tr>`;
    });

    tbody.innerHTML = html;
    document.getElementById('invoiceGrandTotal').innerText = `$${grandTotal.toFixed(2)}`;
}

function saveFinalInvoice() {
    const customer = document.getElementById('invoiceCustomer').value.trim();
    const phone = document.getElementById('invoicePhone').value.trim();
    const location = document.getElementById('invoiceLocation').value.trim();
    const date = document.getElementById('invoiceDate').value;

    if(!customer || !phone || !location || !date || currentInvoiceItems.length === 0) {
        alert("⚠️ សូមបំពេញព័ត៌មានអតិថិជនឱ្យបានគ្រប់គ្រាន់ និងបញ្ចូលទំនិញយ៉ាងតិចមួយ!");
        return;
    }

    const invCode = 'INV-' + Math.floor(100000 + Math.random() * 900000);
    const grandTotal = currentInvoiceItems.reduce((sum, item) => sum + item.totalPrice, 0);

    currentInvoiceItems.forEach(item => {
        const prodIndex = productsData.findIndex(p => p.id === item.productId);
        if(prodIndex !== -1) {
            productsData[prodIndex].avail -= item.qty;
        }
    });

    const newSale = { invCode, customer, phone, location, date, total: grandTotal, items: currentInvoiceItems };
    const newDelivery = { invCode, customer, phone, location, driver: "មិនទាន់ចាត់ចែង", status: "កំពុងរៀបចំ" };

    const salesRef = database.ref('sales').child(invCode);
    const deliveryRef = database.ref('deliveries').child(invCode);

    Promise.all([
        salesRef.set(newSale),
        deliveryRef.set(newDelivery),
        database.ref('products').set(productsData)
    ]).then(() => {
        alert("🎉 វិក្កយបត្រត្រូវបានរក្សាទុកទៅកាន់ Firebase រួចរាល់!");
        resetInvoiceForm();
    }).catch(err => alert("Firebase Error: " + err.message));
}

function resetInvoiceForm() {
    currentInvoiceItems = [];
    document.getElementById('invoiceCustomer').value = '';
    document.getElementById('invoicePhone').value = '';
    document.getElementById('invoiceLocation').value = '';
    document.getElementById('pdfCustomer').innerText = '-';
    document.getElementById('pdfPhone').innerText = '-';
    document.getElementById('pdfLocation').innerText = '-';
    renderInvoicePreviewTable();
    setupInvoiceProductSelect();
}

function downloadInvoicePDF() {
    const element = document.getElementById('invoice-pdf-area');
    const opt = {
        margin:       0.2,
        filename:     `Invoice-${new Date().getTime()}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
}

function addNewProductToStock() {
    if(currentUser.role !== 'Admin') {
        alert("⚠️ លោកអ្នកគ្មានសិទ្ធិបន្ថែមទំនិញទេ!");
        return;
    }
    const name = document.getElementById('newProdName').value.trim();
    const cat = document.getElementById('newProdCat').value.trim();
    const total = parseInt(document.getElementById('newProdTotal').value);
    const price = parseFloat(document.getElementById('newProdPrice').value);

    if(!name || !cat || isNaN(total) || isNaN(price)) {
        alert("⚠️ សូមបំពេញទិន្នន័យផលិតផលឱ្យបានត្រឹមត្រូវ!");
        return;
    }

    const nextId = productsData.length > 0 ? Math.max(...productsData.map(p => p.id)) + 1 : 1;
    productsData.push({ id: nextId, name, cat, total, avail: total, price });

    database.ref('products').set(productsData).then(() => {
        alert("📦 ផលិតផលថ្មីត្រូវបានបញ្ចូលទៅក្នុងឃ្លាំង Firebase!");
        document.getElementById('newProdName').value = '';
        document.getElementById('newProdCat').value = '';
    });
}

function updateDriver(invCode, driverName) {
    database.ref('deliveries').child(invCode).update({ driver: driverName });
}

function updateStatus(invCode, statusValue) {
    database.ref('deliveries').child(invCode).update({ status: statusValue });
}

function renderAll() {
    const todayStr = new Date().toISOString().split('T')[0];
    const thisMonthStr = todayStr.substring(0, 7);

    let dailyRevenue = 0;
    let monthlyRevenue = 0;
    salesData.forEach(s => {
        if(s.date === todayStr) dailyRevenue += s.total;
        if(s.date && s.date.startsWith(thisMonthStr)) monthlyRevenue += s.total;
    });

    const activeDeliveriesCount = deliveryData.filter(d => d.status !== 'បានប្រគល់ជូន').length;

    document.getElementById('dashDailyAmount').innerText = `$${dailyRevenue.toFixed(2)}`;
    document.getElementById('dashMonthlyAmount').innerText = `$${monthlyRevenue.toFixed(2)}`;
    document.getElementById('dashDeliveryCount').innerText = `${activeDeliveriesCount} ជើង`;

    const salesTbody = document.getElementById('salesTableBody');
    if(salesTbody) {
        salesTbody.innerHTML = salesData.map(s => `
            <tr class="hover:bg-slate-50 transition">
                <td class="p-4 pl-6 text-xs font-bold">${s.date}</td>
                <td class="p-4 text-xs font-bold text-indigo-600">${s.invCode}</td>
                <td class="p-4 text-xs font-bold">${s.customer}</td>
                <td class="p-4 text-xs text-slate-400">${s.location}</td>
                <td class="p-4 text-right pr-6 text-xs font-black text-emerald-600">$${s.total.toFixed(2)}</td>
            </tr>
        `).join('');
    }

    const deliveryTbody = document.getElementById('deliveryTableBody');
    if(deliveryTbody) {
        deliveryTbody.innerHTML = deliveryData.map(d => {
            const isAdmin = currentUser && currentUser.role === 'Admin';
            return `
            <tr class="hover:bg-slate-50 transition text-xs">
                <td class="p-4 pl-6 font-bold text-indigo-600">${d.invCode}</td>
                <td class="p-4 font-bold">${d.customer}<br><span class="text-[10px] text-slate-400">${d.phone}</span></td>
                <td class="p-4 text-slate-500">${d.location}</td>
                <td class="p-4">
                    ${isAdmin ? 
                        `<input type="text" value="${d.driver}" onchange="updateDriver('${d.invCode}', this.value)" class="border p-1.5 rounded-lg text-xs focus:outline-none w-32 font-bold">` : 
                        `<span class="font-bold text-slate-700">${d.driver}</span>`
                    }
                </td>
                <td class="p-4 text-center">
                    <span class="px-2 py-1 rounded-full text-[10px] font-bold ${d.status === 'បានប្រគល់ជូន' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}">${d.status}</span>
                </td>
                <td class="p-4 text-center">
                    <select onchange="updateStatus('${d.invCode}', this.value)" class="border p-1.5 rounded-lg text-[11px] focus:outline-none bg-white font-bold">
                        <option value="កំពុងរៀបចំ" ${d.status === 'កំពុងរៀបចំ' ? 'selected' : ''}>📦 កំពុងរៀបចំ</option>
                        <option value="កំពុងដឹកជញ្ជូន" ${d.status === 'កំពុងដឹកជញ្ជូន' ? 'selected' : ''}>🚚 កំពុងដឹកជញ្ជូន</option>
                        <option value="បានប្រគល់ជូន" ${d.status === 'បានប្រគល់ជូន' ? 'selected' : ''}>✅ បានប្រគល់ជូន</option>
                    </select>
                </td>
            </tr>`;
        }).join('');
    }

    const stockTbody = document.getElementById('stockTableBody');
    if(stockTbody) {
        stockTbody.innerHTML = productsData.map(p => `
            <tr class="hover:bg-slate-50 transition text-xs">
                <td class="p-4 pl-6 font-bold text-slate-800">${p.name}</td>
                <td class="p-4 text-slate-400 font-medium">${p.cat}</td>
                <td class="p-4 text-center font-bold text-slate-500">${p.total}</td>
                <td class="p-4 text-center font-black ${p.avail < 10 ? 'text-rose-600 bg-rose-50 rounded-lg' : 'text-indigo-600'}">${p.avail}</td>
                <td class="p-4 text-right font-bold text-slate-600">$${p.price.toFixed(2)}</td>
                <td class="p-4 text-center admin-only">---</td>
            </tr>
        `).join('');
    }
}
