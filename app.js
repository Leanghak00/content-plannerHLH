// =========================================================================
// ទិន្នន័យគណនីបុគ្គលិកប្រើប្រាស់ក្នុងប្រព័ន្ធ (Hardcoded & Secure Login)
// =========================================================================
const usersData = [
    { id: 1, name: "Vicheka", role: "Admin", password: "123" },
    { id: 2, name: "លាងហាក់", role: "User", password: "123" },
    { id: 3, name: "ផាន់នី", role: "User", password: "123" }
];

// ចាប់ផ្តើមស្តារទិន្នន័យពី LocalStorage របស់ម៉ាស៊ីន (ទោះ Refresh ក៏មិនបាត់)
let productsData = JSON.parse(localStorage.getItem('vck_products')) || [
    { id: 1, name: "ចានបាយប្រណិតជើងមាស", cat: "ចានឆ្នាំង", total: 500, avail: 500, price: 0.80 },
    { id: 2, name: "តុអាហារមូលមហាសាល", cat: "តុ", total: 50, avail: 50, price: 10.00 },
    { id: 3, name: "កៅអីព្រះនាងពូកទន់", cat: "កៅអី", total: 500, avail: 500, price: 1.50 }
];

let salesData = JSON.parse(localStorage.getItem('vck_sales')) || [];
let deliveryData = JSON.parse(localStorage.getItem('vck_deliveries')) || [];

let currentUser = null; 
let currentInvoiceItems = [];

// មុខងារគណនានាឡិកាផ្សាយបន្តផ្ទាល់ (Live Clock)
setInterval(() => {
    const now = new Date();
    document.getElementById('liveClock').innerText = now.toLocaleString('km-KH');
}, 1000);

// ==========================================
// មុខងារ LOGIN & LOGOUT
// ==========================================
function handleLogin() {
    const userIn = document.getElementById('loginUsername').value.trim();
    const passIn = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    
    // ស្វែងរកគណនីដែលត្រូវគ្នា (មិនប្រកាន់អក្សរតូចធំចំពោះឈ្មោះអង់គ្លេស)
    const foundUser = usersData.find(u => u.name.toLowerCase() === userIn.toLowerCase() && u.password === passIn);

    if (foundUser) {
        currentUser = foundUser;
        errorEl.classList.add('hidden');
        
        // បើកផ្ទាំងកម្មវិធី
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-application').classList.remove('hidden');

        // បំពេញព័ត៌មានបុគ្គលិកនៅលើ Top Nav
        document.getElementById('topNavUser').innerText = currentUser.name;
        document.getElementById('topNavRole').innerText = currentUser.role === 'Admin' ? 'អ្នកគ្រប់គ្រង (Admin)' : 'បុគ្គលិក (User)';
        document.getElementById('userAvatar').innerText = currentUser.name.charAt(0).toUpperCase();

        // គ្រប់គ្រងសិទ្ធិ (លាក់ទម្រង់បញ្ចូលស្តុកបើមិនមែនជា Admin)
        if (currentUser.role !== 'Admin') {
            document.getElementById('stock-entry-form').classList.add('hidden');
            document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
        } else {
            document.getElementById('stock-entry-form').classList.remove('hidden');
            document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
        }

        // កំណត់ថ្ងៃខែស្វ័យប្រវត្តក្នុងវិក្កយបត្រ
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('invoiceDate').value = today;
        document.getElementById('pdfDate').innerText = today;

        setupLivePreviewInputs();
        setupInvoiceProductSelect();
        renderAll();
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

// មុខងារប្តូរ Tab Menu
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

// មុខងារ Live Sync Text ពី Form ទៅក្នុងទម្រង់ PDF
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

// បង្កើតបញ្ជីជ្រើសរើសទំនិញក្នុងវិក្កយបត្រ
function setupInvoiceProductSelect() {
    const select = document.getElementById('invoiceProductSelect');
    if(!select) return;
    let html = `<option value="">--- ជ្រើសរើសទំនិញ ---</option>`;
    productsData.forEach(p => {
        html += `<option value="${p.id}">${p.name} (ក្នុងឃ្លាំង: ${p.avail})</option>`;
    });
    select.innerHTML = html;
    document.getElementById('invoiceQty').value = 1;
    document.getElementById('invoiceUnitPrice').value = "";
}

function onProductSelectChange() {
    const prodId = parseInt(document.getElementById('invoiceProductSelect').value);
    const prod = productsData.find(p => p.id === prodId);
    document.getElementById('invoiceUnitPrice').value = prod ? prod.price : "";
}

// បញ្ចូលមុខទំនិញទៅក្នុងតារាងបណ្តោះអាសន្ន
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
            <tr class="border-b border-slate-200">
                <td class="p-2 text-center border-r">${index + 1}</td>
                <td class="p-2 border-r">${item.name}</td>
                <td class="p-2 text-center border-r">${item.qty}</td>
                <td class="p-2 text-right border-r">$${item.price.toFixed(2)}</td>
                <td class="p-2 text-right">$${item.totalPrice.toFixed(2)}</td>
                <td class="p-2 text-center print-hide">
                    <button onclick="removeInvoiceItem(${index})" class="text-red-500 hover:text-red-700 cursor-pointer">❌</button>
                </td>
            </tr>`;
    });

    tbody.innerHTML = html;
    document.getElementById('invoiceGrandTotal').innerText = `$${grandTotal.toFixed(2)}`;
}

// រក្សាទុកវិក្កយបត្រចុងក្រោយចូលទៅកាន់ LocalStorage
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

    // កាត់ស្តុកនៅក្នុងឃ្លាំងទំនិញ
    currentInvoiceItems.forEach(item => {
        const prodIndex = productsData.findIndex(p => p.id === item.productId);
        if(prodIndex !== -1) {
            productsData[prodIndex].avail -= item.qty;
        }
    });

    // បន្ថែមទិន្នន័យថ្មីចូល Array
    salesData.unshift({ invCode, customer, phone, location, date, total: grandTotal, items: currentInvoiceItems });
    deliveryData.unshift({ invCode, customer, phone, location, driver: "មិនទាន់ចាត់ចែង", status: "កំពុងរៀបចំ" });

    // សរសេរចូលម៉ាស៊ីនផ្ទាល់ (LocalStorage)
    saveAllToLocalStorage();
    
    alert("🎉 វិក្កយបត្រត្រូវបានរក្សាទុកដោយជោគជ័យ!");
    resetInvoiceForm();
    renderAll();
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

// ទាញយកឯកសារជា PDF
function downloadInvoicePDF() {
    const element = document.getElementById('invoice-pdf-area');
    
    // លាក់ប៊ូតុងលុបចោល (❌) ពេលទាញយក
    const printHides = document.querySelectorAll('.print-hide');
    printHides.forEach(el => el.style.display = 'none');

    const opt = {
        margin:       0.3,
        filename:     `VCK-Invoice-${new Date().getTime()}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save().then(() => {
        // បើកប៊ូតុងលុបចោលមកវិញក្រោយទាញយកចប់
        printHides.forEach(el => el.style.display = '');
    });
}

// បន្ថែមទំនិញថ្មីចូលស្តុក (Admin Only)
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
        alert("⚠️ សូមបំពេញទិន្នន័យផលិតផលឱ្យបានគ្រប់គ្រាន់!");
        return;
    }

    const nextId = productsData.length > 0 ? Math.max(...productsData.map(p => p.id)) + 1 : 1;
    productsData.push({ id: nextId, name, cat, total, avail: total, price });
    
    saveAllToLocalStorage();
    alert("📦 ផលិតផលថ្មីត្រូវបានបញ្ចូលក្នុងឃ្លាំងរួចរាល់!");
    
    document.getElementById('newProdName').value = '';
    document.getElementById('newProdCat').value = '';
    document.getElementById('newProdTotal').value = '';
    document.getElementById('newProdPrice').value = '';
    
    renderAll();
    setupInvoiceProductSelect();
}

// អាប់ដេតឈ្មោះអ្នកដឹកជញ្ជូន
function updateDriver(invCode, driverName) {
    const item = deliveryData.find(d => d.invCode === invCode);
    if(item) {
        item.driver = driverName;
        saveAllToLocalStorage();
    }
}

// អាប់ដេតស្ថានភាពដឹកជញ្ជូន
function updateStatus(invCode, statusValue) {
    const item = deliveryData.find(d => d.invCode === invCode);
    if(item) {
        item.status = statusValue;
        saveAllToLocalStorage();
        renderAll();
    }
}

// មុខងាររក្សាទិន្នន័យចូល LocalStorage
function saveAllToLocalStorage() {
    localStorage.setItem('vck_products', JSON.stringify(productsData));
    localStorage.setItem('vck_sales', JSON.stringify(salesData));
    localStorage.setItem('vck_deliveries', JSON.stringify(deliveryData));
}

// បង្ហាញទិន្នន័យទាំងអស់ឡើងលើអេក្រង់
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

    // Render Dashboard Table
    const salesTbody = document.getElementById('salesTableBody');
    if(salesTbody) {
        salesTbody.innerHTML = salesData.map(s => `
            <tr class="hover:bg-slate-50 transition text-xs">
                <td class="p-4 pl-6 font-bold text-slate-500">${s.date}</td>
                <td class="p-4 font-bold text-indigo-600">${s.invCode}</td>
                <td class="p-4 font-bold text-slate-700">${s.customer}</td>
                <td class="p-4 text-slate-500">${s.location}</td>
                <td class="p-4 text-right pr-6 font-black text-emerald-600">$${s.total.toFixed(2)}</td>
            </tr>
        `).join('');
    }

    // Render Delivery Table
    const deliveryTbody = document.getElementById('deliveryTableBody');
    if(deliveryTbody) {
        deliveryTbody.innerHTML = deliveryData.map(d => {
            const isAdmin = currentUser && currentUser.role === 'Admin';
            return `
            <tr class="hover:bg-slate-50 transition text-xs">
                <td class="p-4 pl-6 font-bold text-indigo-600">${d.invCode}</td>
                <td class="p-4 font-bold text-slate-700">${d.customer}<br><span class="text-[10px] text-slate-400 font-medium">${d.phone}</span></td>
                <td class="p-4 text-slate-500 font-medium">${d.location}</td>
                <td class="p-4">
                    ${isAdmin ? 
                        `<input type="text" value="${d.driver}" onchange="updateDriver('${d.invCode}', this.value)" class="border border-slate-200 p-1.5 rounded-lg text-xs focus:outline-none focus:border-indigo-500 w-32 font-bold bg-white">` : 
                        `<span class="font-bold text-slate-700">${d.driver}</span>`
                    }
                </td>
                <td class="p-4 text-center">
                    <span class="px-2 py-1 rounded-full text-[10px] font-bold ${d.status === 'បានប្រគល់ជូន' ? 'bg-emerald-50 text-emerald-600' : d.status === 'កំពុងដឹកជញ្ជូន' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}">${d.status}</span>
                </td>
                <td class="p-4 text-center">
                    <select onchange="updateStatus('${d.invCode}', this.value)" class="border border-slate-200 p-1.5 rounded-lg text-[11px] focus:outline-none bg-white font-bold cursor-pointer">
                        <option value="កំពុងរៀបចំ" ${d.status === 'កំពុងរៀបចំ' ? 'selected' : ''}>📦 កំពុងរៀបចំ</option>
                        <option value="កំពុងដឹកជញ្ជូន" ${d.status === 'កំពុងដឹកជញ្ជូន' ? 'selected' : ''}>🚚 កំពុងដឹកជញ្ជូន</option>
                        <option value="បានប្រគល់ជូន" ${d.status === 'បានប្រគល់ជូន' ? 'selected' : ''}>✅ បានប្រគល់ជូន</option>
                    </select>
                </td>
            </tr>`;
        }).join('');
    }

    // Render Stock Table
    const stockTbody = document.getElementById('stockTableBody');
    if(stockTbody) {
        stockTbody.innerHTML = productsData.map(p => `
            <tr class="hover:bg-slate-50 transition text-xs">
                <td class="p-4 pl-6 font-bold text-slate-800">${p.name}</td>
                <td class="p-4 text-slate-400 font-bold">${p.cat}</td>
                <td class="p-4 text-center font-bold text-slate-500">${p.total}</td>
                <td class="p-4 text-center font-black ${p.avail < 10 ? 'text-rose-600 bg-rose-50 rounded-lg' : 'text-indigo-600'}">${p.avail}</td>
                <td class="p-4 text-right font-bold text-slate-600">$${p.price.toFixed(2)}</td>
                <td class="p-4 text-center admin-only font-bold text-slate-400">---</td>
            </tr>
        `).join('');
    }
}
