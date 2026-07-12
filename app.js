// ==========================================================================
// 1. FIREBASE INITIALIZATION & CONFIG
// ==========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyB9n8IsVFNv8uX5INh0dwOyAC8gIJhhw9c",
    authDomain: "contentplanneer.firebaseapp.com",
    databaseURL: "https://contentplanneer-default-rtdb.firebaseio.com/",
    projectId: "contentplanneer",
    storageBucket: "contentplanneer.firebasestorage.app",
    messagingSenderId: "1080920711361",
    appId: "1:1080920711361:web:1b59aeee301a6d0d07b440"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const USERS_DB = {
    "hak": { pass: "123", role: "admin", permissions: ["create", "edit", "delete"] },
    "hom": { pass: "123", role: "writer", permissions: ["create", "edit"] },
    "editor": { pass: "123", role: "editor", permissions: ["edit_status"] }
};

const days = ["ច័ន្ទ", "អង្គារ", "ពុធ", "ព្រហស្បតិ៍", "សុក្រ", "សៅរ៍-អាទិត្យ"];
const workflowTips = {
    "ច័ន្ទ": "🧠 គិត Topic និងសរសេរស្គ្រីប", "អង្គារ": "🎬 រៀបចំឧបករណ៍ទុក", "ពុធ": "🎥 ថ្ងៃថតវីដេអូ!",
    "ព្រហស្បតិ៍": "✂️ ថ្ងៃកាត់តវីដេអូ", "សុក្រ": "🎯 ត្រៀម Thumbnail & Schedule", "សៅរ៍-អាទិត្យ": "🚀 វីដេអូអនឡាញ!"
};

let contentData = [];
let isEditing = false;
let currentUser = null;
let currentUsername = "";

// Selectors
const loginPage = document.getElementById('loginPage');
const mainApp = document.getElementById('mainApp');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const form = document.getElementById('plannerForm');
const daysContainer = document.getElementById('daysContainer');
const ideasContainer = document.getElementById('ideasContainer');
const searchBar = document.getElementById('searchBar');
const btnLogout = document.getElementById('btnLogout');
const btnCancel = document.getElementById('btnCancel');
const logContainer = document.getElementById('logContainer');
const connectionBadge = document.getElementById('connectionBadge');

// ==========================================================================
// 2. NETWORK STATUS MONITOR (មុខងារពិនិត្យអ៊ីនធឺណិត)
// ==========================================================================
db.ref(".info/connected").on("value", (snapshot) => {
    if (snapshot.val() === true) {
        connectionBadge.innerText = "📡 Connected";
        connectionBadge.className = "conn-badge status-online";
    } else {
        connectionBadge.innerText = "❌ Disconnected";
        connectionBadge.className = "conn-badge status-offline";
    }
});

// ==========================================================================
// 3. AUTHENTICATION (WITH SESSION PERSISTENCE)
// ==========================================================================
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const userIn = document.getElementById('username').value.trim();
    const passIn = document.getElementById('password').value;

    if (USERS_DB[userIn] && USERS_DB[userIn].pass === passIn) {
        localStorage.setItem('local_planner_logged_user', userIn);
        loginError.classList.add('hidden');
        pushCloudLog(`👤 គណនី [${userIn}] បានចូលប្រើប្រាស់ប្រព័ន្ធ`);
        checkAuth();
    } else {
        loginError.classList.remove('hidden');
    }
});

function checkAuth() {
    const loggedUser = localStorage.getItem('local_planner_logged_user');
    if (loggedUser && USERS_DB[loggedUser]) {
        currentUsername = loggedUser;
        currentUser = USERS_DB[loggedUser];
        document.getElementById('userRoleBadge').innerText = loggedUser;
        
        loginPage.classList.add('hidden');
        mainApp.classList.remove('hidden');

        const hasCreate = currentUser.permissions.includes('create');
        document.getElementById('sidebarSection').classList.toggle('hidden', !hasCreate);
        document.querySelector('.main-layout').style.gridTemplateColumns = hasCreate ? "320px 1fr" : "1fr";

        // បើកដំណើរការ Listener ទាញទិន្នន័យពី Cloud
        listenToCloudData();
        listenToCloudLogs();
    } else {
        loginPage.classList.remove('hidden');
        mainApp.classList.add('hidden');
    }
}

btnLogout.addEventListener('click', () => {
    pushCloudLog(`🚪 គណនី [${currentUsername}] បានចាកចេញពីប្រព័ន្ធ`);
    localStorage.removeItem('local_planner_logged_user');
    checkAuth();
});

// ==========================================================================
// 4. FIREBASE DATA LISTENERS (REAL-TIME SYNC)
// ==========================================================================
function listenToCloudData() {
    db.ref('videos').on('value', (snapshot) => {
        const data = snapshot.val();
        contentData = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
        renderPlanner();
    });
}

function listenToCloudLogs() {
    db.ref('logs').limitToLast(25).on('value', (snapshot) => {
        const data = snapshot.val();
        const logsArray = data ? Object.keys(data).map(key => data[key]) : [];
        logsArray.sort((a,b) => b.timestamp - a.timestamp);
        logContainer.innerHTML = logsArray.map(l => `
            <div class="log-item">
                <span>${l.msg}</span>
                <span style="color:#475569;">${l.time}</span>
            </div>
        `).join('');
    });
}

function pushCloudLog(message) {
    const time = new Date().toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit' });
    db.ref('logs').push({
        time: time,
        msg: message,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });
}

// ==========================================================================
// 5. DRAG & DROP ENGINE
// ==========================================================================
window.allowDrop = function(ev) { ev.preventDefault(); }
window.dragTask = function(ev, id) { ev.dataTransfer.setData("text/plain", id); }
window.dropTask = function(ev, targetDay) {
    ev.preventDefault();
    const id = ev.dataTransfer.getData("text/plain");
    const task = contentData.find(t => t.id === id);
    if (task && task.day !== targetDay) {
        const oldDay = task.day === 'Idea_Bucket' ? 'Idea Bucket' : 'ថ្ងៃ' + task.day;
        const newDay = targetDay === 'Idea_Bucket' ? 'Idea Bucket' : 'ថ្ងៃ' + targetDay;
        
        db.ref('videos/' + id).update({ day: targetDay });
        pushCloudLog(`🖱️ អូសប្តូរ៖ [${currentUsername}] បានអូសវីដេអូ "${task.title}" ពី ${oldDay} ទៅ ${newDay}`);
    }
}

// ==========================================================================
// 6. DYNAMIC UI RENDERER
// ==========================================================================
function checkIsUrgent(deadlineStr, status) {
    if (!deadlineStr || status === 'Done') return false;
    const diffDays = Math.ceil((new Date(deadlineStr).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
    return diffDays <= 2;
}

function renderPlanner() {
    daysContainer.innerHTML = ''; ideasContainer.innerHTML = '';
    const searchQuery = searchBar.value.toLowerCase();

    // 6.1 Weekly Feed
    days.forEach(day => {
        const dayTasks = contentData.filter(t => t.day === day && (t.title.toLowerCase().includes(searchQuery) || (t.assignee && t.assignee.toLowerCase().includes(searchQuery))));
        let tasksHTML = dayTasks.length === 0 ? `<p style="color:#64748b; font-size:12px; font-style:italic;">មិនមានគម្រោងវីដេអូទេ...</p>` : '';

        dayTasks.forEach(task => {
            const isUrgent = checkIsUrgent(task.deadline, task.status);
            const parts = task.deadline ? task.deadline.split('-') : [];
            const deadlineTxt = parts.length === 3 ? `<span class="tag-deadline ${isUrgent?'tag-urgent':''}">${isUrgent?'⚡ ប្រញាប់៖':'📅 ផុស៖'} ${parts[2]}/${parts[1]}</span>` : '';
            
            let btns = '';
            if (currentUser.permissions.some(p => ['create','edit','edit_status'].includes(p))) btns += `<button onclick="editTask('${task.id}')" class="btn-edit">កែ</button>`;
            if (currentUser.permissions.includes('delete')) btns += `<button onclick="deleteTask('${task.id}')" class="btn-delete">លុប</button>`;

            tasksHTML += `
                <div class="task-item ${isUrgent?'urgent-deadline-alert':''}" draggable="true" ondragstart="dragTask(event, '${task.id}')">
                    <div style="flex:1;">
                        <div class="task-title-text">${task.title}</div>
                        <div class="task-tags">
                            <span class="tag-format">${task.format}</span>
                            <span class="status-${task.status}">${task.status}</span>
                            <span class="tag-assignee">👤 ${task.assignee}</span>
                            ${deadlineTxt}
                        </div>
                    </div>
                    <div class="action-btns">${btns}</div>
                </div>`;
        });

        daysContainer.innerHTML += `
            <div class="day-card" ondragover="allowDrop(event)" ondrop="dropTask(event, '${day}')">
                <div class="day-header"><span class="day-title">ថ្ងៃ${day}</span><span class="day-tip">${workflowTips[day]}</span></div>
                <div>${tasksHTML}</div>
            </div>`;
    });

    // 6.2 Idea Feed
    const ideaTasks = contentData.filter(t => (t.day === 'Idea_Bucket' || !t.day) && t.title.toLowerCase().includes(searchQuery));
    if(ideaTasks.length === 0) {
        ideasContainer.innerHTML = `<p style="color:#94a3b8; font-size:13px; font-style:italic;">មិនទាន់មានគំនិតវីដេអូនៅឡើយទេ...</p>`;
    } else {
        ideaTasks.forEach(task => {
            let btns = currentUser.permissions.includes('delete') ? `<button onclick="deleteTask('${task.id}')" class="btn-delete">លុប</button>` : '';
            btns = (currentUser.permissions.includes('create') || currentUser.permissions.includes('edit') ? `<button onclick="editTask('${task.id}')" class="btn-edit">កែ</button>` : '') + btns;

            ideasContainer.innerHTML += `
                <div class="idea-card-item" draggable="true" ondragstart="dragTask(event, '${task.id}')">
                    <div class="idea-title-text">${task.title}</div>
                    <span class="idea-badge">${task.format}</span> <span style="font-size:11px; color:#94a3b8;">👤 ${task.assignee}</span>
                    <div style="display:flex; justify-content:flex-end; margin-top:10px; gap:5px;">${btns}</div>
                </div>`;
        });
    }

    // Progress
    const totalW = contentData.filter(t => t.day !== 'Idea_Bucket').length;
    const doneW = contentData.filter(t => t.day !== 'Idea_Bucket' && t.status === 'Done').length;
    const percent = totalW > 0 ? Math.round((doneW / totalW) * 100) : 0;
    document.getElementById('totalVideos').innerText = totalW;
    document.getElementById('totalIdeas').innerText = ideaTasks.length;
    document.getElementById('progressBar').style.width = percent + '%';
    document.getElementById('progressText').innerText = percent + '%';
}

// ==========================================================================
// 7. DB OPERATIONS (CRUD & BACKUP)
// ==========================================================================
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('taskId').value;
    const taskData = {
        day: document.getElementById('videoDay').value, title: document.getElementById('videoTitle').value,
        format: document.getElementById('videoFormat').value, status: document.getElementById('videoStatus').value,
        deadline: document.getElementById('videoDeadline').value, assignee: document.getElementById('videoAssignee').value,
        hook: document.getElementById('videoHook').value, notes: document.getElementById('videoNotes').value
    };

    if (isEditing && id) {
        db.ref('videos/' + id).set(taskData);
        pushCloudLog(`✏️ បានកែប្រែ៖ [${currentUsername}] បានកែសម្រួលវីដេអូ "${taskData.title}"`);
        resetFormState();
    } else {
        const newId = Date.now().toString();
        db.ref('videos/' + newId).set(taskData);
        pushCloudLog(`➕ បង្កើតថ្មី៖ [${currentUsername}] បានបន្ថែមវីដេអូថ្មី "${taskData.title}"`);
    }
    form.reset();
});

window.editTask = function(id) {
    const task = contentData.find(t => t.id === id); if (!task) return;
    if (currentUser.role === 'editor') {
        ['videoTitle','videoHook','videoNotes'].forEach(f => document.getElementById(f).readOnly = true);
        ['videoDeadline','videoAssignee','videoDay','videoFormat'].forEach(f => document.getElementById(f).disabled = true);
    }
    document.getElementById('taskId').value = task.id; document.getElementById('videoDay').value = task.day;
    document.getElementById('videoTitle').value = task.title; document.getElementById('videoFormat').value = task.format;
    document.getElementById('videoStatus').value = task.status; document.getElementById('videoDeadline').value = task.deadline;
    document.getElementById('videoAssignee').value = task.assignee; document.getElementById('videoHook').value = task.hook;
    document.getElementById('videoNotes').value = task.notes;
    
    isEditing = true; document.getElementById('formTitle').innerText = "✏️ កែប្រែគម្រោងវីដេអូ";
    document.getElementById('btnSubmit').innerText = "💾 រក្សាទុកទិន្នន័យ";
    btnCancel.classList.remove('hidden'); window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.deleteTask = function(id) {
    const task = contentData.find(t => t.id === id);
    if(task && confirm(`តើអ្នកចង់លុបវីដេអូ "${task.title}" មែនទេ?`)) {
        db.ref('videos/' + id).remove();
        pushCloudLog(`❌ បានលុប៖ [${currentUsername}] បានលុបវីដេអូ "${task.title}"`);
        resetFormState();
    }
}

window.exportData = function() {
    if (contentData.length === 0) return alert("មិនមានទិន្នន័យឡើយ!");
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(contentData));
    const dlAnchor = document.createElement('a'); dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `cloud_planner_backup.json`);
    document.body.appendChild(dlAnchor); dlAnchor.click(); dlAnchor.remove();
}

window.triggerImport = function() { document.getElementById('importFile').click(); }
window.importData = function(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (Array.isArray(imported) && confirm("បញ្ចូលទិន្នន័យទៅ Cloud? វានឹងលុបទិន្នន័យចាស់ទាំងអស់។")) {
                db.ref('videos').remove();
                imported.forEach(task => {
                    const taskId = task.id || Date.now().toString() + Math.random();
                    delete task.id;
                    db.ref('videos/' + taskId).set(task);
                });
                pushCloudLog(`📥 Import៖ [${currentUsername}] បានបញ្ចូល File ទិន្នន័យទៅ Cloud`);
                alert("📥 រួចរាល់!");
            }
        } catch(err) { alert("❌ ទម្រង់ File មិនត្រឹមត្រូវ!"); }
    };
    reader.readAsText(file); event.target.value = '';
}

window.toggleTemplateModal = function() { document.getElementById('templateModal').classList.toggle('hidden'); }

function resetFormState() {
    isEditing = false; document.getElementById('taskId').value = "";
    document.getElementById('formTitle').innerText = "📝 បន្ថែមវីដេអូថ្មី";
    document.getElementById('btnSubmit').innerText = "➕ បន្ថែមគម្រោង"; btnCancel.classList.add('hidden');
    ['videoTitle','videoHook','videoNotes'].forEach(f => document.getElementById(f).readOnly = false);
    ['videoDeadline','videoAssignee','videoDay','videoFormat'].forEach(f => document.getElementById(f).disabled = false);
    form.reset();
}

btnCancel.addEventListener('click', resetFormState);
searchBar.addEventListener('input', renderPlanner);

// ចាប់ផ្តើមប្រព័ន្ធ
checkAuth();
