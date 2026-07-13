// =========================================================================
// កូដភ្ជាប់ Firebase (សូមយកព័ត៌មានពី Firebase Console របស់អ្នកមកដាក់ជំនួសត្រង់នេះ)
// =========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyAw0owrI_MjRPJmQLzd9zNFyjcdgRc7H4I",
  authDomain: "vckshop-b951b.firebaseapp.com",
  databaseURL: "https://vckshop-b951b-default-rtdb.firebaseio.com",
  projectId: "vckshop-b951b",
  storageBucket: "vckshop-b951b.firebasestorage.app",
  messagingSenderId: "39230962959",
  appId: "1:39230962959:web:bc2fde1b4f8e9b3c7ed27a",
};

// ចាប់ផ្តើមប្រព័ន្ធ Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ទិន្នន័យគណនីបុគ្គលិកក្នុងប្រព័ន្ធ
const usersData = [
    { id: 1, name: "Vicheka", role: "Admin", password: "123" },
    { id: 2, name: "លាងហាក់", role: "User", password: "123" },
    { id: 3, name: "ផាន់នី", role: "User", password: "123" }
];

let currentUser = null; 
let productsData = [];
let salesData = [];
let deliveryData = [];
let currentInvoiceItems = [];

// ទាញ និងស្តាប់បម្រែបម្រួលទិន្នន័យពី Firebase (Realtime Listening)
function listenToFirebaseData() {
    // ១. ស្តុកទំនិញ
    database.ref('products').on('value', (snapshot) => {
        const data = snapshot.val();
        if(data) {
            productsData = data;
        } else {
            // បើដំបូងមិនទាន់មានស្តុក វានឹងបង្កើតទិន្នន័យគំរូស្វ័យប្រវត្ត
            productsData = [
                { id: 1, name: "ចានបាយប្រណិតជើងមាស", cat: "ចានឆ្នាំង", total: 500, avail: 500, price: 0.80 },
                { id: 2, name: "តុអាហារមូលមហាសាល", cat: "តុ", total: 50, avail: 50, price: 10.00 },
                { id: 3, name: "កៅអីព្រះនាងពូកទន់", cat: "កៅអី", total: 500, avail: 500, price: 1.50 }
            ];
            database.ref('products').set(productsData);
        }
        setupInvoiceProductSelect();
        renderAll();
    });

    // ២. របាយការណ៍លក់
    database.ref('sales').on('value', (snapshot) => {
        const data = snapshot.val();
        salesData = data ? Object.values(data) : [];
        renderAll();
    });

    // ៣. ប្រព័ន្ធដឹកជញ្ជូន
    database.ref('deliveries').on('value', (snapshot) => {
        const data = snapshot.val();
        deliveryData = data ? Object.values(data) : [];
        renderAll();
    });
}

// មុខងារ LOGIN & LOGOUT
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

        // ដាក់ថ្ងៃខែស្វ័យប្រវត្តក្នុង Form វិក្កយបត្រ
        document.getElementById('invoiceDate').value = new Date().toISOString().split('T')[0];

        // ភ្ជាប់ព្រឹត្តិការណ៍វាយអក្សរដើម្បីបង្ហាញភ្លាមៗទៅកាន់ទម្រង់ PDF (Live Preview)
        setupLivePreviewInputs();

        listenToFirebaseData();
        switchTab('dashboard');
    } else {
        errorEl.classList.remove('hidden');
    }
}

function handleLogout() {
    currentUser = null;
    document.getElementById('main-application').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById('tab-' + tabId).classList.remove('hidden');
    document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('active-menu'));
    document.getElementById('btn-' + tabId).classList.add('active-menu');
    document.getElementById('pageTitle').innerText = { dashboard: '📊 ផ្ទាំងគ្រប់គ្រងទូទៅ', sales: '📄 វិក្កយបត្រជួល & លក់', delivery: '🚚 ប្រព័ន្ធដឹកជញ្ជូន', stock: '📦 គ្រប់គ្រងឃ្លាំងស្តុក' }[tabId];
}

// ភ្ជាប់ព្រឹត្តិការណ៍ Live Preview លើតម្រូវការអតិថិជន
function setupLivePreviewInputs() {
    const inputs = ['Customer', 'Phone', 'Location', 'Date'];
    inputs.forEach(id => {
        document.getElementById('invoice' + id).addEventListener('input', (e) => {
            document.getElementById('pdf' + id).innerText = e.target.value || '-';
        });
    });
}

// រៀបចំបញ្ជីជ្រើសរើសទំនិញ
function setupInvoiceProductSelect() {
    const select = document.getElementById('invoiceProductSelect');
    if(!select) return;
    let html = `<option value="">--- ជ្រើសរើសទំនិញ ---</option>`;
    productsData.forEach(p => {
        html += `<option value="${p.id}">${p.name} (ក្នុងឃ្លាំង: ${p.avail})</option>`;
    });
    select.innerHTML = html;
}

// មុខងារពេល User ប្តូរមុខទំនិញ៖ បំពេញតម្លៃរាយដើម ប៉ុន្តែអនុញ្ញាតឱ្យ User កែប្រែតម្លៃបានតាមចិត្ត
function onProductSelectChange() {
    const prodId = parseInt(document.getElementById('invoiceProductSelect').value);
    const prod = productsData.find(p => p.id === prodId);
    document.getElementById('invoiceUnitPrice').value = prod ? prod.price : "";
}

// បន្ថែមទំនិញទៅក្នុងបញ្ជីវិក្កយបត្រ (លរ ឈ្មោះទំនិញ ចំនួន តម្លៃរាយ សរុប)
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
        existing.qty += qty;
        existing.price = customPrice; // ប្រសិនបើកែតម្លៃ វានឹងយកតម្លៃថ្មី
        existing.total = existing.qty * customPrice;
    } else {
        currentInvoiceItems.push({
            productId: prod.id,
            name: prod.name,
            qty: qty,
            price: customPrice,
            total: qty * customPrice
        });
    }
    renderInvoiceItemsTable();
}

function removeInvoiceItem(index) {
    currentInvoiceItems.splice(index, 1);
    renderInvoiceItemsTable();
}

function renderInvoiceItemsTable() {
    let html = "";
    let grandTotal = 0;
    currentInvoiceItems.forEach((item, index) => {
        grandTotal += item.total;
        html += `<tr>
            <td class="p-2.5 text-center font-bold text-slate-400 border-r">${index + 1}</td>
            <td class="p-2.5 font-bold text-slate-800 border-r">${item.name}</td>
            <td class="p-2.5 text-center font-bold border-r">${item.qty}</td>
            <td class="p-2.5 text-right font-semibold border-r">$${item.price.toFixed(2)}</td>
            <td class="p-2.5 text-right font-extrabold text-indigo-600">$${item.total.toFixed(2)}</td>
            <td class="p-2 text-center print-hide"><button onclick="removeInvoiceItem(${index})" class="text-rose-500 font-bold">❌</button></td>
        </tr>`;
    });
    document.getElementById('invoiceItemsTableBody').innerHTML = currentInvoiceItems.length ? html : `<tr><td colspan="6" class="p-6 text-center text-slate-400">មិនទាន់មានមុខទំនិញបញ្ចូលឡើយ</td></tr>`;
    document.getElementById('invoiceGrandTotal').innerText = `$${grandTotal.toFixed(2)}`;
}

// មុខងាររក្សាទុកវិក្កយបត្រ និងបញ្ជូនទៅកាន់ប្រព័ន្ធដឹកជញ្ជូន
function saveFinalInvoice() {
    const customer = document.getElementById('invoiceCustomer').value.trim();
    const phone = document.getElementById('invoicePhone').value.trim();
    const location = document.getElementById('invoiceLocation').value.trim();
    const date = document.getElementById('invoiceDate').value;
    
    if(!customer || !phone || !location || !date || currentInvoiceItems.length === 0) {
        alert("⚠️ សូមបំពេញព័ត៌មានអតិថិជន និងបន្ថែមទំនិញយ៉ាងហោចណាស់ ១ មុខ!");
        return;
    }

    let grandTotal = 0;
    currentInvoiceItems.forEach(item => {
        grandTotal += item.total;
        const p = productsData.find(prod => prod.id === item.productId);
        if(p) p.avail = Math.max(0, p.avail - item.qty);
    });

    const newInvoiceId = salesData.length + 1001;

    // ១. រក្សាទុកចូលរបាយការណ៍លក់លើ Cloud
    database.ref('sales/inv_' + newInvoiceId).set({ id: newInvoiceId, customer, phone, location, date, amount: grandTotal, user: currentUser.name });

    // ២. បញ្ជូនទៅកាន់ប្រព័ន្ធដឹកជញ្ជូន (ដំបូងឡើយមិនទាន់មានអ្នកដឹកទេ ត្រូវទុកឱ្យ Admin ជាអ្នកកំណត់)
    database.ref('deliveries/del_' + newInvoiceId).set({
        id: newInvoiceId, customer, phone, location, date,
        driver: "មិនទាន់កំណត់", // រង់ចាំ Admin កំណត់ឱ្យ
        status: "កំពុងរៀបចំសម្ភារៈ" 
    });

    // ៣. អាប់ដេតស្តុកទំនិញទៅ Cloud
    database.ref('products').set(productsData);

    // សម្អាត Form
    document.getElementById('invoiceCustomer').value = "";
    document.getElementById('invoicePhone').value = "";
    document.getElementById('invoiceLocation').value = "";
    currentInvoiceItems = [];
    document.querySelectorAll('#invoice-pdf-area span[id^="pdf"]').forEach(el => el.innerText = "-");
    renderInvoiceItemsTable();

    alert(`🎉 រក្សាទុកវិក្កយបត្រ #INV-${newInvoiceId} ជោគជ័យ! ទិន្នន័យត្រូវបានបញ្ជូនទៅផ្នែកដឹកជញ្ជូន។`);
}

// មុខងារទាញយកវិក្កយបត្រជា PDF (Download PDF)
function downloadInvoicePDF() {
    const element = document.getElementById('invoice-pdf-area');
    const customerName = document.getElementById('pdfCustomer').innerText || 'invoice';
    const opt = {
        margin:       10,
        filename:     `វិក្កយបត្រ-${customerName}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
}

// ======================== ផ្នែកដឹកជញ្ជូន (ADMIN ASSIGN) ========================
function assignDriver(invoiceId, driverName) {
    database.ref(`deliveries/del_${invoiceId}`).update({ driver: driverName, status: "កំពុងដឹក" });
}

function updateDeliveryStatus(invoiceId, nextStatus) {
    database.ref(`deliveries/del_${invoiceId}`).update({ status: nextStatus });
}

// ======================== ផ្នែកឃ្លាំងស្តុក (ADD NEW PRODUCT) ========================
function addNewProductToStock() {
    const name = document.getElementById('newProdName').value.trim();
    const cat = document.getElementById('newProdCat').value.trim();
    const total = parseInt(document.getElementById('newProdTotal').value);
    const price = parseFloat(document.getElementById('newProdPrice').value);

    if(!name || !cat || isNaN(total) || isNaN(price)) {
        alert("⚠️ សូមបំពេញព័ត៌មានទំនិញថ្មីឱ្យបានគ្រប់គ្រាន់!");
        return;
    }

    const newId = productsData.length + 1;
    productsData.push({ id: newId, name, cat, total, avail: total, price });
    database.ref('products').set(productsData);

    document.getElementById('newProdName').value = "";
    alert("📦 បន្ថែមទំនិញថ្មីចូលក្នុងស្តុក Cloud ជោគជ័យ!");
}

// បង្ហាញទិន្នន័យឡើងលើអេក្រង់ (Render All Tables)
function renderAll() {
    const todayStr = new Date().toISOString().split('T')[0];
    let dailyTotal = 0, monthlyTotal = 0;

    salesData.forEach(s => {
        monthlyTotal += s.amount;
        if(s.date === todayStr) dailyTotal += s.amount;
    });

    document.getElementById('dashDailyAmount').innerText = `$${dailyTotal.toFixed(2)}`;
    document.getElementById('dashMonthlyAmount').innerText = `$${monthlyTotal.toFixed(2)}`;
    document.getElementById('dashDeliveryCount').innerText = `${deliveryData.length} ជើង`;

    // Render របាយការណ៍ប្រវត្តិវិក្កយបត្រ
    let salesHtml = "";
    salesData.sort((a,b) => b.id - a.id).forEach(s => {
        salesHtml += `<tr class="border-b"><td class="p-4 pl-6 text-xs text-slate-400">${s.date}</td><td class="p-4 font-bold text-indigo-600 text-xs">#INV-${s.id}</td><td class="p-4 font-bold text-slate-800">${s.customer}</td><td class="p-4 text-xs text-slate-500">${s.location}</td><td class="p-4 text-right font-extrabold text-emerald-600 pr-6">$${s.amount.toFixed(2)}</td></tr>`;
    });
    document.getElementById('salesTableBody').innerHTML = salesHtml || `<tr><td colspan="5" class="p-4 text-center text-slate-400">មិនទាន់មានប្រវត្តិលក់ឡើយ</td></tr>`;

    // Render ផ្ទាំងប្រព័ន្ធដឹកជញ្ជូន (Admin Assign & Status Control)
    let delHtml = "";
    deliveryData.forEach(d => {
        let statusBadge = "bg-slate-100 text-slate-600 border-slate-200";
        if(d.status === 'កំពុងដឹក') statusBadge = "bg-amber-50 text-amber-700 border-amber-100";
        if(d.status === 'បានដឹកដល់') statusBadge = "bg-emerald-50 text-emerald-700 border-emerald-100";

        // ប៊ូតុងជ្រើសរើសអ្នកដឹកសម្រាប់តែ Admin
        let driverSelectAction = "";
        if (currentUser && currentUser.role === 'Admin') {
            driverSelectAction = `
                <select onchange="assignDriver(${d.id}, this.value)" class="border rounded-lg p-1.5 text-xs bg-white focus:outline-none">
                    <option value="មិនទាន់កំណត់" ${d.driver === 'មិនទាន់កំណត់' ? 'selected' : ''}>-- ចាត់តាំងអ្នកដឹក --</option>
                    <option value="លាងហាក់" ${d.driver === 'លាងហាក់' ? 'selected' : ''}>លាងហាក់</option>
                    <option value="ផាន់នី" ${d.driver === 'ផាន់នី' ? 'selected' : ''}>ផាន់នី</option>
                </select>
            `;
        } else {
            driverSelectAction = `<span class="text-xs font-bold text-slate-500">👤 ${d.driver}</span>`;
        }

        // ប៊ូតុងប្តូរស្ថានភាព
        let statusButtons = `
            <div class="flex justify-center gap-1">
                <button onclick="updateDeliveryStatus(${d.id}, 'កំពុងដឹក')" class="bg-amber-500 text-white text-[10px] px-2 py-1 rounded font-bold hover:bg-amber-600">កំពុងដឹក</button>
                <button onclick="updateDeliveryStatus(${d.id}, 'បានដឹកដល់')" class="bg-emerald-500 text-white text-[10px] px-2 py-1 rounded font-bold hover:bg-emerald-600">បានដឹកដល់</button>
            </div>
        `;

        delHtml += `<tr class="border-b">
            <td class="p-4 pl-6 font-bold text-indigo-600 text-xs">#INV-${d.id}</td>
            <td class="p-4 font-bold text-slate-800">${d.customer}<br><span class="text-[11px] text-slate-400 font-normal">📞 ${d.phone}</span></td>
            <td class="p-4 text-xs font-medium text-slate-600">${d.location}</td>
            <td class="p-4">${driverSelectAction}</td>
            <td class="p-4 text-center"><span class="${statusBadge} border px-2.5 py-1 rounded-full text-xs font-bold">${d.status}</span></td>
            <td class="p-4 text-center">${statusButtons}</td>
        </tr>`;
    });
    document.getElementById('deliveryTableBody').innerHTML = delHtml || `<tr><td colspan="6" class="p-4 text-center text-slate-400">មិនទាន់មានជើងដឹកជញ្ជូនឡើយ</td></tr>`;

    // Render ផ្ទាំងស្តុកទំនិញ
    let stockHtml = "";
    productsData.forEach(p => {
        stockHtml += `<tr class="border-b"><td class="p-4 pl-6 font-bold text-slate-800">${p.name}</td><td class="p-4 text-slate-500 text-xs">${p.cat}</td><td class="p-4 text-center font-bold">${p.total}</td><td class="p-4 text-center text-indigo-600 font-bold">${p.avail}</td><td class="p-4 text-right font-extrabold text-slate-700">$${p.price.toFixed(2)}</td><td class="p-4 text-center admin-only"><button onclick="if(confirm('លុបទំនិញនេះ?')){productsData=productsData.filter(x=>x.id!=${p.id});database.ref('products').set(productsData);}" class="text-rose-600 text-xs font-bold bg-rose-50 px-2 py-1 rounded border border-rose-200">🗑️ លុប</button></td></tr>`;
    });
    document.getElementById('stockTableBody').innerHTML = stockHtml;

    // លាក់ប៊ូតុងរបស់ Admin ករណី User ធម្មតាចូលប្រើ
    document.querySelectorAll('.admin-only').forEach(b => (currentUser && currentUser.role === 'User') ? b.classList.add('hidden') : b.classList.remove('hidden'));
}
