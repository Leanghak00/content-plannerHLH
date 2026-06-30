// ====== 1. ប្រព័ន្ធគ្រប់គ្រងគណនី និងសិទ្ធិ (AUTH & ROLES SYSTEM) ======
const USERS_DB = {
    "hak": { pass: "123", role: "admin", permissions: ["create", "edit", "delete", "backup"] },
    "jork": { pass: "2000", role: "writer", permissions: ["create", "edit"] },
    "editor": { pass: "3000", role: "editor", permissions: ["edit_status"] }
};

const days = ["ច័ន្ទ", "អង្គារ", "ពុធ", "ព្រហស្បតិ៍", "សុក្រ", "សៅរ៍-អាទិត្យ"];
const workflowTips = {
    "ច័ន្ទ": "🧠 គិត Topic និងសរសេរស្គ្រីបឱ្យហើយ",
    "អង្គារ": "🎬 រៀបចំកាមេរ៉ា, ភ្លើង, មីក្រូហ្វូន ឬ Templates ទុក",
    "ពុធ": "🎥 ថ្ងៃថត! (Batch Shooting ថតម្តងឱ្យបានច្រើនវីដេអូ)",
    "ព្រហស្បតិ៍": "✂️ ថ្ងៃកាត់ត, ដាក់ Transitions, Color Grade & Effects",
    "សុក្រ": "🎯 Review វីដេអូចុងក្រោយ, ធ្វើ Thumbnail & Schedule ផុស",
    "សៅរ៍-អាទិត្យ": "🚀 វីដេអូអនឡាញ! ឆ្លៀតឆ្លើយតប Comments និងមើល Analytics"
};

let contentData = JSON.parse(localStorage.getItem('contentPlannerData')) || [];
let isEditing = false;
let currentUser = null;

// Selectors
const loginPage = document.getElementById('loginPage');
const mainApp = document.getElementById('mainApp');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const form = document.getElementById('plannerForm');
const daysContainer = document.getElementById('daysContainer');
const searchBar = document.getElementById('searchBar');

// មុខងារ Login
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const userIn = document.getElementById('username').value.trim();
    const passIn = document.getElementById('password').value;

    if (USERS_DB[userIn] && USERS_DB[userIn].pass === passIn) {
        localStorage.setItem('planner_logged_user', userIn);
        checkAuth();
    } else {
        loginError.classList.remove('hidden');
    }
});

// មុខងារពិនិត្យសិទ្ធិ និងកំណត់ទម្រង់ UI
function checkAuth() {
    const loggedUser = localStorage.getItem('planner_logged_user');
    if (loggedUser && USERS_DB[loggedUser]) {
        currentUser = USERS_DB[loggedUser];
        document.getElementById('userRoleBadge').innerText = loggedUser.toUpperCase() + ` (${currentUser.role})`;
        
        loginPage.classList.add('hidden');
        mainApp.classList.remove('hidden');

        // កំណត់ការបង្ហាញ UI ទៅតាមសិទ្ធិ (Role Interface Control)
        const hasBackup = currentUser.permissions.includes('backup');
        const hasCreate = currentUser.permissions.includes('create');

        document.getElementById('backupSection').classList.toggle('hidden', !hasBackup);
        document.getElementById('sidebarSection').classList.toggle('hidden', !hasCreate);
        
        if (!hasCreate) {
            document.querySelector('.main-layout').style.gridTemplateColumns = "1fr";
        } else {
            document.querySelector('.main-layout').removeAttribute('style');
        }

        renderPlanner();
    } else {
        loginPage.classList.remove('hidden');
        mainApp.classList.add('hidden');
    }
}

function logout() {
    localStorage.removeItem('planner_logged_user');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    loginError.classList.add('hidden');
    checkAuth();
}

// ====== 2. ប្រព័ន្ធគ្រប់គ្រង CONTENT PLANNER ======
function renderPlanner() {
    daysContainer.innerHTML = '';
    const searchQuery = searchBar.value.toLowerCase();

    days.forEach(day => {
        const dayTasks = contentData.filter(task => {
            const matchesDay = task.day === day;
            const matchesSearch = task.title.toLowerCase().includes(searchQuery) || 
                                  task.hook.toLowerCase().includes(searchQuery);
            return matchesDay && matchesSearch;
        });

        let tasksHTML = '';

        if(dayTasks.length === 0) {
            tasksHTML = `<p style="color:#64748b; font-size:12px; font-style:italic;">មិនមានគម្រោងវីដេអូទេ...</p>`;
        } else {
            dayTasks.forEach(task => {
                // បង្កើតប៊ូតុងសកម្មភាពទៅតាម Role សិទ្ធិ
                let actionButtonsHTML = '';
                if (currentUser.permissions.includes('create') || currentUser.permissions.includes('edit') || currentUser.permissions.includes('edit_status')) {
                    actionButtonsHTML += `<button onclick="editTask(${task.id})" class="btn-edit">កែ</button>`;
                }
                if (currentUser.permissions.includes('delete')) {
                    actionButtonsHTML += `<button onclick="deleteTask(${task.id})" class="btn-delete">លុប</button>`;
                }

                tasksHTML += `
                    <div class="task-item">
                        <div style="flex: 1;">
                            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:5px;">
                                <strong style="color:#fff; font-size:15px;">${task.title}</strong>
                                <div class="task-tags">
                                    <span class="tag-format">${task.format}</span>
                                    <span class="status-${task.status}">${task.status}</span>
                                </div>
                            </div>
                            ${task.hook ? `<p style="font-size:12px; color:#f59e0b; margin:2px 0;"><span style="color:#94a3b8;">Hook:</span> "${task.hook}"</p>` : ''}
                            ${task.notes ? `<p style="font-size:12px; color:#94a3b8; margin:2px 0;"><span style="color:#64748b;">Note:</span> ${task.notes}</p>` : ''}
                        </div>
                        <div class="action-btns">${actionButtonsHTML}</div>
                    </div>
                `;
            });
        }

        const daySection = `
            <div class="day-card">
                <div class="day-header">
                    <span class="day-title">${day}</span>
                    <span class="day-tip">${workflowTips[day]}</span>
                </div>
                <div>${tasksHTML}</div>
            </div>
        `;
        daysContainer.innerHTML += daySection;
    });

    // ធ្វើបច្ចុប្បន្នភាព Dashboard
    document.getElementById('totalVideos').innerText = contentData.length;
    document.getElementById('doneVideos').innerText = contentData.filter(t => t.status === 'Done').length;
}

form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const id = document.getElementById('taskId').value;
    const day = document.getElementById('videoDay').value;
    const title = document.getElementById('videoTitle').value;
    const format = document.getElementById('videoFormat').value;
    const status = document.getElementById('videoStatus').value;
    const hook = document.getElementById('videoHook').value;
    const notes = document.getElementById('videoNotes').value;

    if (isEditing) {
        contentData = contentData.map(task => {
            if (task.id === parseInt(id)) {
                return { ...task, day, title, format, status, hook, notes };
            }
            return task;
        });
        resetFormState();
    } else {
        const newTask = { id: Date.now(), day, title, format, status, hook, notes };
        contentData.push(newTask);
    }

    localStorage.setItem('contentPlannerData', JSON.stringify(contentData));
    form.reset();
    renderPlanner();
});

window.editTask = function(id) {
    const task = contentData.find(t => t.id === id);
    if (!task) return;

    // បើជាគណនី Editor ឱ្យកែបានតែស្ថានភាព (Status) ទេ លាក់ផ្នែកផ្សេងៗចោល
    if (currentUser.role === 'editor') {
        document.getElementById('videoTitle').readOnly = true;
        document.getElementById('videoHook').readOnly = true;
        document.getElementById('videoNotes').readOnly = true;
        document.getElementById('sidebarSection').classList.remove('hidden');
        document.querySelector('.main-layout').removeAttribute('style');
    }

    document.getElementById('taskId').value = task.id;
    document.getElementById('videoDay').value = task.day;
    document.getElementById('videoTitle').value = task.title;
    document.getElementById('videoFormat').value = task.format;
    document.getElementById('videoStatus').value = task.status;
    document.getElementById('videoHook').value = task.hook;
    document.getElementById('videoNotes').value = task.notes;

    isEditing = true;
    document.getElementById('formTitle').innerText = "✏️ កែប្រែគម្រោងវីដេអូ";
    document.getElementById('btnSubmit').innerText = "💾 រក្សាទុកការកែប្រែ";
    document.getElementById('btnCancel').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.deleteTask = function(id) {
    if(confirm("តើអ្នកពិតជាចង់លុបគម្រោងវីដេអូនេះមែនទេ?")) {
        contentData = contentData.filter(task => task.id !== id);
        localStorage.setItem('contentPlannerData', JSON.stringify(contentData));
        renderPlanner();
        if(isEditing && document.getElementById('taskId').value == id) {
            resetFormState();
        }
    }
}

window.resetFormState = function() {
    isEditing = false;
    document.getElementById('taskId').value = "";
    document.getElementById('formTitle').innerText = "📝 បន្ថែមវីដេអូថ្មី (Video Brief)";
    document.getElementById('btnSubmit').innerText = "➕ បន្ថែមទៅក្នុងតារាង";
    document.getElementById('btnCancel').classList.add('hidden');
    
    document.getElementById('videoTitle').readOnly = false;
    document.getElementById('videoHook').readOnly = false;
    document.getElementById('videoNotes').readOnly = false;
    
    if (currentUser.role === 'editor') {
        document.getElementById('sidebarSection').classList.add('hidden');
        document.querySelector('.main-layout').style.gridTemplateColumns = "1fr";
    }
    form.reset();
}

// ====== 3. មុខងារ BACKUP & RESTORE ======
window.exportData = function() {
    if(contentData.length === 0) return alert("មិនមានទិន្នន័យសម្រាប់ Export ទេ!");
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(contentData));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "content_planner_backup.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

window.importData = function(event) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (Array.isArray(importedData)) {
                contentData = importedData;
                localStorage.setItem('contentPlannerData', JSON.stringify(contentData));
                renderPlanner();
                alert("🎯 បញ្ចូលទិន្នន័យចាស់ជោគជ័យ!");
            } else {
                alert("❌ ទម្រង់ហ្វាយមិនត្រឹមត្រូវ!");
            }
        } catch (err) {
            alert("❌ ហ្វាយមានបញ្ហា មិនអាចអានបានទេ!");
        }
    };
    if(event.target.files[0]) {
        reader.readAsText(event.target.files[0]);
    }
}

// ឆែកមើលស្ថានភាព Auth នៅពេលបើកដំបូង
checkAuth();