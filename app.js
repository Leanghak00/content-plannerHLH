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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// User Accounts Array
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

// Firebase Realtime Listener
function listenToFirebaseData() {
    database.ref('products').on('value', (snapshot) => {
        const data = snapshot.val();
        if(data) productsData = Object.values(data);
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

// Auth Login System
function handleLogin() {
    const userIn = document.getElementById('loginUsername').value.trim();
    const passIn = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    
    const foundUser = usersData.find(u => u.name.toLowerCase() === userIn.toLowerCase() && u.password === passIn);

    if (foundUser) {
        currentUser = foundUser;
        errorEl.classList.add('hidden');
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-application').classList.remove('hidden');

        document.getElementById('topNavUser').innerText = currentUser.name;
        document.getElementById('topNavRole').innerText = currentUser.role === 'Admin' ? 'អ្នកគ្រប់គ្រង (Admin)' : 'បុគ្គលិក (User)';
        document.getElementById('userAvatar').innerText = currentUser.name.charAt(0).toUpperCase();

        if (currentUser.role !== 'Admin') {
            document.getElementById('stock-entry-form').classList.add('hidden');
        } else {
            document.getElementById('stock-entry-form').classList.remove('hidden');
        }

        const today = new Date().toISOString().split('T')[0];
        document.getElementById('invoiceDate').value = today;
        document.getElementById('pdfDate').innerText = today;

        setupLivePreviewInputs();
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
}

function setupLivePreviewInputs() {
    ['Customer', 'Phone', 'Location', 'Date'].forEach(id => {
        const el = document.getElementById('invoice' + id);
        if(el) {
            el.addEventListener('input', (e) => {
                document.getElementById('pdf' + id).innerText = e.target.value || '-';
            });
        }
    });
}

function setupInvoiceProductSelect() {
    const select = document.getElementById('invoiceProductSelect');
    if(!select) return;
    let html = `<option value="">--- ជ្រើសរើសទំនិញ ---</option>`;
    productsData.forEach(p => { html += `<option value="${p.id}">${p.name} (${p.avail})</option>`; });
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
    const prod = productsData.find(p => p.id === prodId);

    if(!prod || isNaN(qty) || qty <= 0 || qty > prod.avail) { alert("⚠️ ចំនួនមិនត្រឹមត្រូវ ឬលើសពីស្តុក!"); return; }

    const existing = currentInvoiceItems.find(item => item.productId === prodId);
    if(existing) {
        existing.qty += qty;
        existing.totalPrice = existing.qty * customPrice;
    } else {
        currentInvoiceItems.push({ productId: prod.id, name: prod.name, qty, price: customPrice, totalPrice: qty * customPrice });
    }
    renderInvoicePreviewTable();
}

function removeInvoiceItem(index) {
    currentInvoiceItems.splice(index, 1);
    renderInvoicePreviewTable();
}

function renderInvoicePreviewTable() {
    const tbody = document.getElementById('invoiceItemsTableBody');
    let html = '', grandTotal = 0;
    currentInvoiceItems.forEach((item, index) => {
        grandTotal += item.totalPrice;
        html += `
        <tr class="border-b">
            <td class="p-2.5 text-center border-r">${index+1}</td>
            <td class="p-2.5 border-r font-medium">${item.name}</td>
            <td class="p-2.5 text-center border-r font-bold">${item.qty}</td>
            <td class="p-2.5 text-right border-r">$${item.price.toFixed(2)}</td>
            <td class="p-2.5 text-right font-bold text-slate-700">$${item.totalPrice.toFixed(2)}</td>
            <td class="p-2.5 text-center print-hide col-action"><button onclick="removeInvoiceItem(${index})" class="text-rose-500 hover:text-rose-700">❌</button></td>
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
    if(!customer || currentInvoiceItems.length === 0) { alert("⚠️ បំពេញព័ត៌មានឱ្យគ្រប់គ្រាន់ និងបញ្ចូលទំនិញយ៉ាងតិច ១!"); return; }

    const invCode = 'INV-' + Math.floor(100000 + Math.random() * 900000);
    const grandTotal = currentInvoiceItems.reduce((sum, item) => sum + item.totalPrice, 0);

    currentInvoiceItems.forEach(item => {
        const p = productsData.find(prod => prod.id === item.productId);
        if(p) p.avail -= item.qty;
    });

    database.ref('sales').child(invCode).set({ invCode, customer, phone, location, date, total: grandTotal, items: currentInvoiceItems });
    database.ref('deliveries').child(invCode).set({ invCode, customer, phone, location, driver: "មិនទាន់ចាត់ចែង", status: "កំពុងរៀបចំ" });
    database.ref('products').set(productsData).then(() => {
        alert("🎉 រក្សាទុកវិក្កយបត្រជោគជ័យ!");
        resetInvoiceForm();
    });
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
}

// 🛠️ មុខងារទាញយកវិក្កយបត្រជា PDF (បានកែសម្រួលថ្មី លឿន ច្បាស់ និងមិនគាំង)
function downloadInvoicePDF() {
    const element = document.getElementById('invoice-pdf-area');
    
    if (currentInvoiceItems.length === 0) {
        alert("⚠️ សូមបញ្ចូលទំនិញទៅក្នុងបញ្ជីវិក្កយបត្រជាមុនសិន ទើបអាចទាញយកបាន!");
        return;
    }

    // លាក់ប៊ូតុងសកម្មភាព "លុប (❌)" មិនឱ្យជាប់ក្នុង PDF
    const actionElements = document.querySelectorAll('.col-action');
    const thAction = document.getElementById('th-action');
    if(thAction) thAction.style.display = 'none';
    actionElements.forEach(el => el.style.display = 'none');

    const opt = {
        margin:       0.3,
        filename:     `Invoice-${document.getElementById('pdfCustomer').innerText || 'Guest'}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    // ដំណើរការបង្កើត និងទាញយក PDF
    html2pdf().set(opt).from(element).save().then(() => {
        // បង្ហាញប៊ូតុងលុប (❌) មកវិញធម្មតា ក្រោយពេលទាញយកចប់
        if(thAction) thAction.style.display = '';
        actionElements.forEach(el => el.style.display = '');
    }).catch(err => {
        console.error("PDF Error: ", err);
        if(thAction) thAction.style.display = '';
        actionElements.forEach(el => el.style.display = '');
    });
}

function addNewProductToStock() {
    const name = document.getElementById('newProdName').value.trim();
    const cat = document.getElementById('newProdCat').value.trim();
    const total = parseInt(document.getElementById('newProdTotal').value);
    const price = parseFloat(document.getElementById('newProdPrice').value);
    const nextId = productsData.length > 0 ? Math.max(...productsData.map(p => p.id)) + 1 : 1;

    productsData.push({ id: nextId, name, cat, total, avail: total, price });
    database.ref('products').set(productsData).then(() => { alert("📦 បញ្ចូលស្តុកជោគជ័យ!"); });
}

function updateDriver(invCode, driver) { database.ref('deliveries').child(invCode).update({ driver }); }
function updateStatus(invCode, status) { database.ref('deliveries').child(invCode).update({ status }); }

function renderAll() {
    const salesTbody = document.getElementById('salesTableBody');
    if(salesTbody) {
        salesTbody.innerHTML = salesData.map(s => `<tr class="text-xs hover:bg-slate-50"><td class="p-4 pl-6">${s.date}</td><td class="p-4 text-indigo-600 font-bold">${s.invCode}</td><td class="p-4 font-medium">${s.customer}</td><td class="p-4 text-slate-500">${s.location}</td><td class="p-4 text-right pr-6 font-bold text-emerald-600">$${s.total.toFixed(2)}</td></tr>`).join('');
    }
    const deliveryTbody = document.getElementById('deliveryTableBody');
    if(deliveryTbody) {
        deliveryTbody.innerHTML = deliveryData.map(d => `<tr class="text-xs hover:bg-slate-50"><td class="p-4 pl-6 font-bold text-indigo-600">${d.invCode}</td><td class="p-4 font-bold">${d.customer}</td><td class="p-4">${d.location}</td><td class="p-4"><input type="text" value="${d.driver}" onchange="updateDriver('${d.invCode}', this.value)" class="border p-1.5 w-28 font-bold rounded"></td><td class="p-4 text-center"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${d.status === 'បានប្រគល់ជូន' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}">${d.status}</span></td><td class="p-4 text-center"><select onchange="updateStatus('${d.invCode}', this.value)" class="border font-bold p-1 rounded bg-white"><option value="កំពុងរៀបចំ" ${d.status === 'កំពុងរៀបចំ' ? 'selected' : ''}>📦 កំពុងរៀបចំ</option><option value="កំពុងដឹកជញ្ជូន" ${d.status === 'កំពុងដឹកជញ្ជូន' ? 'selected' : ''}>🚚 កំពុងដឹកជញ្ជូន</option><option value="បានប្រគល់ជូន" ${d.status === 'បានប្រគល់ជូន' ? 'selected' : ''}>✅ បានប្រគល់ជូន</option></select></td></tr>`).join('');
    }
    const stockTbody = document.getElementById('stockTableBody');
    if(stockTbody) {
        stockTbody.innerHTML = productsData.map(p => `<tr class="text-xs hover:bg-slate-50"><td class="p-4 pl-6 font-bold text-slate-800">${p.name}</td><td class="p-4 text-slate-400">${p.cat}</td><td class="p-4 text-center">${p.total}</td><td class="p-4 text-center font-bold text-indigo-600">${p.avail}</td><td class="p-4 text-right font-medium">$${p.price.toFixed(2)}</td><td class="p-4 text-center admin-only">---</td></tr>`).join('');
    }
}
