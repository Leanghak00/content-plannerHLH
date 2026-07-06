// ====== 1. Database គណនីសម្ងាត់ (Username & Password) ======
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

// មុខងារ Login & Auth
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const userIn = document.getElementById('username').value.trim();
    const passIn = document.getElementById('password').value;

    if (USERS_DB[userIn] && USERS_DB[userIn].pass === passIn) {
        localStorage.setItem('local_planner_logged_user', userIn);
        loginError.classList.add('hidden');
        // សម្អាត input ពេល login រួច
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        checkAuth();
    } else {
        loginError.classList.remove('hidden');
    }
});

function checkAuth() {
    const loggedUser = localStorage.getItem('local_planner_logged_user');
    if (loggedUser && USERS_DB[loggedUser]) {
        currentUser = USERS_DB[loggedUser];
        document.getElementById('userRoleBadge').innerText = loggedUser;
        
        loginPage.classList.add('hidden');
        mainApp.classList.remove('hidden');

        const hasCreate = currentUser.permissions.includes('create');
        document.getElementById('sidebarSection').classList.toggle('hidden', !hasCreate);
        
        if (!hasCreate) {
            document.querySelector('.main-layout').style.gridTemplateColumns = "1fr";
        } else {
            document.querySelector('.main-layout').removeAttribute('style');
        }

        // ទាញទិន្នន័យពី LocalStorage របស់ម៉ាស៊ីន
        const localData = localStorage.getItem('local_planner_videos');
        contentData = localData ? JSON.parse(localData) : [];
        renderPlanner();
    } else {
        loginPage.classList.remove('hidden');
        mainApp.classList.add('hidden');
    }
}

btnLogout.addEventListener('click', () => {
    localStorage.removeItem('local_planner_logged_user');
    checkAuth();
});

// បង្ហាញទិន្នន័យលើអេក្រង់ (បំបែករវាង កាលវិភាគ និង Idea Bucket)
function renderPlanner() {
    daysContainer.innerHTML = '';
    ideasContainer.innerHTML = '';
    const searchQuery = searchBar.value.toLowerCase();

    // 1. បង្ហាញផ្នែកកាលវិភាគប្រចាំសប្តាហ៍ (Weekly Schedule)
    days.forEach(day => {
        const dayTasks = contentData.filter(task => {
            const matchesDay = task.day === day;
            const assigneeName = task.assignee ? task.assignee.toLowerCase() : '';
            const matchesSearch = task.title.toLowerCase().includes(searchQuery) || 
                                  (task.hook && task.hook.toLowerCase().includes(searchQuery)) ||
                                  assigneeName.includes(searchQuery);
            return matchesDay && matchesSearch;
        });

        let tasksHTML = '';

        if(dayTasks.length === 0) {
            tasksHTML = `<p style="color:#64748b; font-size:12px; font-style:italic; padding:5px 0;">មិនមានគម្រោងវីដេអូទេ...</p>`;
        } else {
            dayTasks.forEach(task => {
                let actionButtonsHTML = '';
                if (currentUser.permissions.includes('create') || currentUser.permissions.includes('edit') || currentUser.permissions.includes('edit_status')) {
                    actionButtonsHTML += `<button onclick="editTask('${task.id}')" class="btn-edit">កែ</button>`;
                }
                if (currentUser.permissions.includes('delete')) {
                    actionButtonsHTML += `<button onclick="deleteTask('${task.id}')" class="btn-delete">លុប</button>`;
                }

                let deadlineHTML = '';
                if (task.deadline) {
                    const d = new Date(task.deadline);
                    deadlineHTML = `<span class="tag-deadline">📅 ផុស៖ ${d.getDate()}/${d.getMonth()+1}</span>`;
                }

                tasksHTML += `
                    <div class="task-item">
                        <div style="flex: 1;">
                            <div class="task-title-text">${task.title}</div>
                            <div class="task-tags">
                                <span class="tag-format">${task.format}</span>
                                <span class="status-${task.status}">${task.status}</span>
                                <span class="tag-assignee">👤 ${task.assignee || 'ទូទៅ'}</span>
                                ${deadlineHTML}
                            </div>
                            ${task.hook ? `<p style="font-size:12px; color:#f59e0b; margin-top:6px;"><span style="color:#64748b;">Hook:</span> "${task.hook}"</p>` : ''}
                            ${task.notes ? `<p style="font-size:12px; color:#94a3b8; margin-top:2px;"><span style="color:#475569;">Note:</span> ${task.notes}</p>` : ''}
                        </div>
                        <div class="action-btns">${actionButtonsHTML}</div>
                    </div>
                `;
            });
        }

        daysContainer.innerHTML += `
            <div class="day-card">
                <div class="day-header">
                    <span class="day-title">${day}</span>
                    <span class="day-tip">${workflowTips[day]}</span>
                </div>
                <div>${tasksHTML}</div>
            </div>
        `;
    });

    // 2. បង្ហាញផ្នែកធុងប្រមូលគំនិតវីដេអូ (Idea Bucket)
    const ideaTasks = contentData.filter(task => {
        const isIdea = task.day === 'Idea_Bucket' || !task.day;
        const assigneeName = task.assignee ? task.assignee.toLowerCase() : '';
        const matchesSearch = task.title.toLowerCase().includes(searchQuery) || 
                              (task.hook && task.hook.toLowerCase().includes(searchQuery)) ||
                              assigneeName.includes(searchQuery);
        return isIdea && matchesSearch;
    });

    if (ideaTasks.length === 0) {
        ideasContainer.innerHTML = `<p style="color:#94a3b8; font-size:13px; font-style:italic; grid-column: 1/-1;">មិនទាន់មានគំនិតវីដេអូនៅក្នុងធុងនៅឡើយទេ...</p>`;
    } else {
        ideaTasks.forEach(task => {
            let actionButtonsHTML = '';
            if (currentUser.permissions.includes('create') || currentUser.permissions.includes('edit')) {
                actionButtonsHTML += `<button onclick="moveIdeaToSchedule('${task.id}')" class="btn-move">🚀 ផ្ទេរទៅកាលវិភាគ</button>`;
                actionButtonsHTML += `<button onclick="editTask('${task.id}')" class="btn-edit">កែ</button>`;
            }
            if (currentUser.permissions.includes('delete')) {
                actionButtonsHTML += `<button onclick="deleteTask('${task.id}')" class="btn-delete">លុប</button>`;
            }

            ideasContainer.innerHTML += `
                <div class="idea-card-item">
                    <div class="idea-title-text">${task.title}</div>
                    <div style="margin-bottom:8px;">
                        <span class="idea-badge">${task.format}</span>
                        <span style="font-size:11px; color:#94a3b8; margin-left:5px;">👤 ${task.assignee || 'ទូទៅ'}</span>
                    </div>
                    ${task.hook ? `<p style="font-size:11px; color:#f59e0b; margin: 3px 0;"><span style="color:#64748b;">Hook:</span> "${task.hook}"</p>` : ''}
                    ${task.notes ? `<p style="font-size:11px; color:#94a3b8; margin: 3px 0;"><span style="color:#475569;">Note:</span> ${task.notes}</p>` : ''}
                    <div class="idea-btns">${actionButtonsHTML}</div>
                </div>
            `;
        });
    }

    // បច្ចុប្បន្នភាពលេខស្ថិតិលើ Dashboard
    document.getElementById('totalVideos').innerText = contentData.filter(t => t.day !== 'Idea_Bucket').length;
    document.getElementById('totalIdeas').innerText = ideaTasks.length;
}

// មុខងារផ្ទេរគំនិតវីដេអូចូលទៅកាន់ថ្ងៃណាមួយក្នុងសប្តាហ៍ (ភ្ជាប់ទៅ window ដើម្បីឱ្យ onclick ហៅដំណើរការបាន)
window.moveIdeaToSchedule = function(id) {
    const task = contentData.find(t => t.id === id);
    if (!task) return;

    const targetDay = prompt("តើអ្នកចង់ផ្ទេរវីដេអូនេះទៅថ្ងៃណា?\n(វាយបញ្ចូលពាក្យ៖ ច័ន្ទ, អង្គារ, ពុធ, ព្រហស្បតិ៍, សុក្រ, សៅរ៍-អាទិត្យ)");
    if (targetDay && days.includes(targetDay.trim())) {
        task.day = targetDay.trim();
        localStorage.setItem('local_planner_videos', JSON.stringify(contentData));
        renderPlanner();
    } else if (targetDay) {
        alert("❌ ការវាយបញ្ចូលឈ្មោះថ្ងៃមិនត្រឹមត្រូវទេ! សូមព្យាយាមម្តងទៀត។");
    }
}

// រក្សាទុក ឬកែប្រែទិន្នន័យ
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('taskId').value;
    const taskData = {
        day: document.getElementById('videoDay').value,
        title: document.getElementById('videoTitle').value,
        format: document.getElementById('videoFormat').value,
        status: document.getElementById('videoStatus').value,
        deadline: document.getElementById('videoDeadline').value,
        assignee: document.getElementById('videoAssignee').value,
        hook: document.getElementById('videoHook').value,
        notes: document.getElementById('videoNotes').value
    };

    if (isEditing && id) {
        contentData = contentData.map(task => task.id === id ? { id, ...taskData } : task);
        resetFormState();
    } else {
        const newTask = { id: Date.now().toString(), ...taskData };
        contentData.push(newTask);
    }

    localStorage.setItem('local_planner_videos', JSON.stringify(contentData));
    renderPlanner();
    form.reset();
});

window.editTask = function(id) {
    const task = contentData.find(t => t.id === id);
    if (!task) return;

    if (currentUser.role === 'editor') {
        document.getElementById('videoTitle').readOnly = true;
        document.getElementById('videoHook').readOnly = true;
        document.getElementById('videoNotes').readOnly = true;
        document.getElementById('videoDeadline').disabled = true;
        document.getElementById('videoAssignee').disabled = true;
        document.getElementById('sidebarSection').classList.remove('hidden');
        document.querySelector('.main-layout').removeAttribute('style');
    }

    document.getElementById('taskId').value = task.id;
    document.getElementById('videoDay').value = task.day || "Idea_Bucket";
    document.getElementById('videoTitle').value = task.title;
    document.getElementById('videoFormat').value = task.format;
    document.getElementById('videoStatus').value = task.status;
    document.getElementById('videoDeadline').value = task.deadline || "";
    document.getElementById('videoAssignee').value = task.assignee || "ទូទៅ";
    document.getElementById('videoHook').value = task.hook || "";
    document.getElementById('videoNotes').value = task.notes || "";

    isEditing = true;
    document.getElementById('formTitle').innerText = "✏️ កែប្រែគម្រោងវីដេអូ";
    document.getElementById('btnSubmit').innerText = "💾 រក្សាទុកទិន្នន័យ";
    btnCancel.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.deleteTask = function(id) {
    if(confirm("តើអ្នកពិតជាចង់លុបគម្រោងវីដេអូនេះមែនទេ?")) {
        contentData = contentData.filter(task => task.id !== id);
        localStorage.setItem('local_planner_videos', JSON.stringify(contentData));
        renderPlanner();
        if(isEditing && document.getElementById('taskId').value == id) {
            resetFormState();
        }
    }
}

function resetFormState() {
    isEditing = false;
    document.getElementById('taskId').value = "";
    document.getElementById('formTitle').innerText = "📝 បន្ថែមវីដេអូថ្មី";
    document.getElementById('btnSubmit').innerText = "➕ បន្ថែមគម្រោង";
    btnCancel.classList.add('hidden');
    
    document.getElementById('videoTitle').readOnly = false;
    document.getElementById('videoHook').readOnly = false;
    document.getElementById('videoNotes').readOnly = false;
    document.getElementById('videoDeadline').disabled = false;
    document.getElementById('videoAssignee').disabled = false;
    
    if (currentUser.role === 'editor') {
        document.getElementById('sidebarSection').classList.add('hidden');
        document.querySelector('.main-layout').style.gridTemplateColumns = "1fr";
    }
    form.reset();
}

btnCancel.addEventListener('click', resetFormState);
searchBar.addEventListener('input', renderPlanner);

// ដំណើរការដំបូង
checkAuth();
