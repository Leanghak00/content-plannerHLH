// ==========================================================================
// 1. FIREBASE CONFIGURATION (កំណត់រចនាសម្ព័ន្ធ Firebase របស់អ្នក)
// ==========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyB9n8IsVFNv8uX5INh0dwOyAC8gIJhhw9c",
    authDomain: "contentplanneer.firebaseapp.com",
    databaseURL: "https://contentplanneer-default-rtdb.firebaseio.com", // លុបសញ្ញា / នៅចុងដើម្បីកុំឱ្យ Error លីង
    projectId: "contentplanneer",
    storageBucket: "contentplanneer.firebasestorage.app",
    messagingSenderId: "1080920711361",
    appId: "1:1080920711361:web:1b59aeee301a6d0d07b440"
};

// ប្រកាសអថេរប្រើប្រាស់រួម
let db;
let currentUser = "";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// ==========================================================================
// 2. MULTI-USER LOGIN SYSTEM (ប្រព័ន្ធគណនីអ្នកប្រើប្រាស់ទាំង ៣)
// ==========================================================================
document.getElementById('btnLogin').addEventListener('click', () => {
    const userVal = document.getElementById('username').value.trim().toLowerCase();
    const passVal = document.getElementById('password').value.trim();
    const errorDiv = document.getElementById('loginError');

    // បង្កើតលក្ខខណ្ឌសម្រាប់ User ទាំង ៣ (hak, hom, editor)
    let loginSuccess = false;

    if (userVal === 'hak' && passVal === '123') {
        currentUser = "Hak";
        loginSuccess = true;
    } else if (userVal === 'hom' && passVal === '123') {
        currentUser = "Hom";
        loginSuccess = true;
    } else if (userVal === 'editor' && passVal === '123') {
        currentUser = "Editor";
        loginSuccess = true;
    }

    if (loginSuccess) {
        // លាក់ផ្ទាំង Login និងបើកផ្ទាំង App ចម្បង
        document.getElementById('loginPage').classList.add('hidden');
        document.getElementById('appPage').classList.remove('hidden');
        
        // បើកបង្ហាញរបារម៉ឺនុយទូរស័ព្ទដៃបើប្រើលើទូរស័ព្ទ
        document.getElementById('mobileNavBar').classList.remove('hidden');
        document.getElementById('userBadge').innerText = currentUser;

        // ចាប់ផ្តើមតភ្ជាប់ទៅ Firebase Realtime Database
        initFirebase();
    } else {
        errorDiv.classList.remove('hidden');
        errorDiv.innerText = "❌ ឈ្មោះអ្នកប្រើប្រាស់ ឬលេខកូដសម្ងាត់មិនត្រឹមត្រូវទេ!";
    }
});

// ប្រព័ន្ធចាកចេញ (Logout)
document.getElementById('btnLogout').addEventListener('click', () => {
    location.reload(); // បង្ខំឱ្យអូសទំព័រឡើងវិញដើម្បីសម្អាត Session
});

// ==========================================================================
// 3. FIREBASE CORE & CORE APP LOGIC
// ==========================================================================
function initFirebase() {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();

    // ពិនិត្យស្ថានភាពអ៊ីនធឺណិត (Online/Offline Status)
    const connStatus = document.getElementById('connStatus');
    db.ref('.info/connected').on('value', (snap) => {
        if (snap.val() === true) {
            connStatus.innerText = "📡 Connected";
            connStatus.className = "conn-badge status-online";
        } else {
            connStatus.innerText = "🔌 Offline";
            connStatus.className = "conn-badge status-offline";
        }
    });

    // ចាប់ផ្តើមទាញយកទិន្នន័យពី Cloud មកបង្ហាញលើអេក្រង់រាល់ពេលមានការផ្លាស់ប្តូរ
    db.ref('videos').on('value', (snapshot) => {
        const data = snapshot.val() || {};
        renderDashboard(data);
        renderWorkflow(data);
    });

    // ทាញយកប្រព័ន្ធសកម្មភាពថ្មីៗ (Live Logs)
    db.ref('logs').limitToLast(10).on('value', (snapshot) => {
        const logs = snapshot.val() || {};
        const logBox = document.getElementById('logBox');
        logBox.innerHTML = "";
        Object.values(logs).reverse().forEach(log => {
            const div = document.createElement('div');
            div.className = "log-item";
            div.innerHTML = `<span>${log.text}</span> <b style="color:#475569">${log.time}</b>`;
            logBox.appendChild(div);
        });
    });
}

// មុខងារបញ្ចូល ឬកែប្រែទិន្នន័យ (Form Submit)
document.getElementById('plannerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const id = document.getElementById('editTaskId').value;
    const taskData = {
        title: document.getElementById('taskTitle').value.trim(),
        day: document.getElementById('taskDay').value,
        assignee: document.getElementById('taskAssignee').value,
        format: document.getElementById('taskFormat').value,
        status: document.getElementById('taskStatus').value,
        deadline: document.getElementById('taskDeadline').value,
        notes: document.getElementById('taskNotes').value.trim(),
        updatedBy: currentUser
    };

    if (id) {
        // ករណីកែប្រែទិន្នន័យចាស់
        db.ref('videos/' + id).update(taskData);
        pushLog(`✏️ ${currentUser} បានកែវីដេអូ៖ "${taskData.title}"`);
        resetForm();
    } else {
        // ករណីបង្កើតថ្មី
        const newRef = db.ref('videos').push();
        db.ref('videos/' + newRef.key).set(taskData);
        pushLog(`➕ ${currentUser} បានថែមវីដេអូ៖ "${taskData.title}"`);
        document.getElementById('plannerForm').reset();
    }
});

// មុខងារបង្ហាញទិន្នន័យលើក្តារការងារ (Render App)
function renderWorkflow(data) {
    const daysContainer = document.getElementById('daysContainer');
    const ideaContainer = document.getElementById('ideaContainer');
    
    // បង្កើតគ្រោងថ្ងៃទាំង ៧
    daysContainer.innerHTML = DAYS.map(day => `
        <div class="day-card" id="day-${day}">
            <div class="day-header">
                <span class="day-title">📅 ថ្ងៃ ${translateDay(day)} (${day})</span>
                <span class="day-tip" id="count-${day}">0 វីដេអូ</span>
            </div>
            <div class="task-list-zone" id="list-${day}"></div>
        </div>
    `).join('');
    
    ideaContainer.innerHTML = "";
    const counts = {};
    DAYS.forEach(d => counts[d] = 0);

    // ចែកទិន្នន័យចូលតាមថ្ងៃនីមួយៗ
    Object.keys(data).forEach(key => {
        const task = data[key];
        const isUrgent = checkUrgent(task.deadline, task.status);
        
        const cardHtml = `
            <div class="task-item ${isUrgent ? 'urgent-deadline-alert' : ''}">
                <div>
                    <div class="task-title-text">${task.title}</div>
                    <div class="task-tags">
                        <span class="status-${task.status}">${task.status}</span>
                        <span class="tag-format">${task.format}</span>
                        <span class="tag-assignee">👤 ${task.assignee}</span>
                        ${task.deadline ? `<span class="tag-deadline ${isUrgent ? 'tag-urgent' : ''}">⏰ ${task.deadline}</span>` : ''}
                    </div>
                    ${task.notes ? `<p style="font-size:12px; color:var(--text-muted); margin-top:8px; background:rgba(0,0,0,0.1); padding:6px; border-radius:6px;">📝 ${task.notes}</p>` : ''}
                </div>
                <div class="action-btns">
                    <button class="btn-edit" onclick="editTask('${key}')">កែ</button>
                    <button class="btn-delete" onclick="deleteTask('${key}', '${task.title}')">លុប</button>
                </div>
            </div>
        `;

        if (task.day === "Idea Bucket" || !DAYS.includes(task.day)) {
            ideaContainer.innerHTML += cardHtml;
        } else {
            const listZone = document.getElementById(`list-${task.day}`);
            if (listZone) {
                listZone.innerHTML += cardHtml;
                counts[task.day]++;
            }
        }
    });

    // បច្ចុប្បន្នភាពលេខរាប់ចំនួនវីដេអូតាមថ្ងៃ
    DAYS.forEach(day => {
        const countBadge = document.getElementById(`count-${day}`);
        if (countBadge) countBadge.innerText = `${counts[day]} វីដេអូ`;
    });
}

// មុខងារគណនា Dashboard Stats
function renderDashboard(data) {
    const total = Object.keys(data).length;
    let done = 0;
    Object.values(data).forEach(t => { if (t.status === "Done") done++; });
    
    document.getElementById('statTotal').innerText = total;
    document.getElementById('statDone').innerText = done;
    
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    document.getElementById('progressBarFill').style.width = pct + "%";
    document.getElementById('progressText').innerText = pct + "%";
}

// មុខងារចុចប៊ូតុង "កែ"
window.editTask = function(id) {
    db.ref('videos/' + id).once('value', (snap) => {
        const task = snap.val();
        if(!task) return;
        document.getElementById('editTaskId').value = id;
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskDay').value = task.day === "Idea Bucket" ? "Monday" : task.day;
        document.getElementById('taskAssignee').value = task.assignee;
        document.getElementById('taskFormat').value = task.format;
        document.getElementById('taskStatus').value = task.status;
        document.getElementById('taskDeadline').value = task.deadline || "";
        document.getElementById('taskNotes').value = task.notes || "";
        
        document.getElementById('formTitle').innerText = "✏️ កែប្រែគម្រោង";
        document.getElementById('btnCancelEdit').classList.remove('hidden');
        document.querySelector('.sidebar').scrollIntoView({behavior:'smooth'});
    });
};

// មុខងារលុបគម្រោង
window.deleteTask = function(id, title) {
    if (confirm(`តើអ្នកពិតជាចង់លុបវីដេអូ "${title}" នេះមែនទេ?`)) {
        db.ref('videos/' + id).remove();
        pushLog(`❌ ${currentUser} បានលុបវីដេអូ៖ "${title}"`);
    }
};

function resetForm() {
    document.getElementById('editTaskId').value = "";
    document.getElementById('plannerForm').reset();
    document.getElementById('formTitle').innerText = "➕ បន្ថែមគម្រោងថ្មី";
    document.getElementById('btnCancelEdit').classList.add('hidden');
}
document.getElementById('btnCancelEdit').addEventListener('click', resetForm);

// ==========================================================================
// 4. HELPERS & UTILITIES (ប្រព័ន្ធជំនួយ)
// ==========================================================================
function translateDay(day) {
    const map = { Monday:"ចន្ទ", Tuesday:"អង្គារ", Wednesday:"ពុធ", Thursday:"ព្រហស្បតិ៍", Friday:"សុក្រ", Saturday:"សៅរ៍", Sunday:"អាទិត្យ" };
    return map[day] || day;
}

function checkUrgent(deadline, status) {
    if (!deadline || status === "Done") return false;
    const diff = new Date(deadline) - new Date();
    return diff / (1000 * 60 * 60 * 24) <= 1; // ប្រកាសអាសន្នបើនៅសល់ក្រោម ២៤ម៉ោង
}

function pushLog(text) {
    const time = new Date().toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit' });
    if(db) db.ref('logs').push({ text, time });
}

// ស្វែងរកវីដេអូ (Live Search)
document.getElementById('searchBar').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    document.querySelectorAll('.task-item').forEach(item => {
        const txt = item.querySelector('.task-title-text').innerText.toLowerCase();
        item.style.display = txt.includes(query) ? "flex" : "none";
    });
});

// SYSTEM POPUP MODAL (គំរូស្គ្រីប)
const modal = document.getElementById('templateModal');
document.getElementById('btnTemplates').addEventListener('click', () => modal.classList.remove('hidden'));
document.getElementById('closeModal').addEventListener('click', () => modal.classList.add('hidden'));

// 📱 MOBILE BOTTOM NAVIGATION CLICKS CONTROLLER
const navItems = document.querySelectorAll('.nav-item');
navItems.forEach(item => {
    item.addEventListener('click', function() {
        navItems.forEach(i => i.classList.remove('active'));
        this.classList.add('active');
        
        // បញ្ជាអូសទៅកន្លែងតាម ID ម៉ឺនុយទូរស័ព្ទ
        if (this.id === "navSchedule") window.scrollTo({top:0, behavior:'smooth'});
        if (this.id === "navIdeas") document.querySelector('.idea-section').scrollIntoView({behavior:'smooth'});
        if (this.id === "navAdd") document.querySelector('.sidebar').scrollIntoView({behavior:'smooth'});
    });
});

// SYSTEM BACKUP & IMPORT (Local JSON Backup)
document.getElementById('btnBackup').addEventListener('click', () => {
    db.ref('videos').once('value', (snap) => {
        const blob = new Blob([JSON.stringify(snap.val() || {}, null, 2)], {type: "application/json"});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `backup-planner-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
    });
});
document.getElementById('btnImport').addEventListener('click', () => document.getElementById('importFile').click());
document.getElementById('importFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const data = JSON.parse(evt.target.result);
            if(confirm("តើអ្នកចង់បញ្ចូលទិន្នន័យ Backup នេះទៅក្នុង Cloud មែនទេ? (វានឹងបន្ថែមលើកូដចាស់)")) {
                db.ref('videos').update(data);
                pushLog(`📥 ${currentUser} បានធ្វើការ Import ទិន្នន័យរួមពី File Backup`);
                alert("បញ្ចូលជោគជ័យ!");
            }
        } catch(err) { alert("File មិនត្រឹមត្រូវឡើយ!"); }
    };
    reader.readAsText(file);
});
