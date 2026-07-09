// ====== 1. Database គណនីសម្ងាត់ (Username & Password) ======
const USERS_DB = {
    "hak": { pass: "123", role: "admin", permissions: ["create", "edit", "delete"] },
    "LEANGHAK":{pass:"1111",role:" admin",permissions:["create","edit","delete"]},
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

// មុខងារពិនិត្យមើល Deadline ថាតើ Urgent ឬទេ (សល់ទាបជាង ឬស្មើ ២ថ្ងៃ)
function checkIsUrgent(deadlineStr, status) {
    if (!deadlineStr || status === 'Done') return false;
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const deadlineDate = new Date(deadlineStr);
    deadlineDate.setHours(0,0,0,0);
    
    // គណនាគម្លាតថ្ងៃ
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // ប្រសិនបើសល់ក្រោម ២ ថ្ងៃ ឬហួសថ្ងៃកំណត់ ឱ្យសញ្ញាអាសន្ន
    return diffDays <= 2;
}

// បង្ហាញទិន្នន័យលើអេក្រង់
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
                let urgentClass = '';
                const isUrgent = checkIsUrgent(task.deadline, task.status);
                
                if (isUrgent) {
                    urgentClass = 'urgent-deadline-alert';
                }

                if (task.deadline) {
                    const parts = task.deadline.split('-');
                    if(parts.length === 3) {
                        deadlineHTML = `<span class="tag-deadline ${isUrgent ? 'tag-urgent' : ''}">📅 ${isUrgent ? '⚡ ប្រញាប់ខ្លាំង៖' : 'ផុស៖'} ${parts[2]}/${parts[1]}</span>`;
                    }
                }

                tasksHTML += `
                    <div class="task-item ${urgentClass}">
                        <div style="flex: 1; padding-right: 10px;">
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
                    <span class="day-title">ថ្ងៃ${day}</span>
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
            let moveSelectorHTML = '';

            if (currentUser.permissions.includes('create') || currentUser.permissions.includes('edit')) {
                moveSelectorHTML = `
                    <div class="move-box">
                        <select id="moveDaySelect-${task.id}" class="select-move-day">
                            <option value="">-- ផ្ទេរទៅថ្ងៃ --</option>
                            ${days.map(d => `<option value="${d}">ថ្ងៃ${d}</option>`).join('')}
                        </select>
                        <button onclick="executeMoveIdea('${task.id}')" class="btn-move-go">🚀</button>
                    </div>
                `;
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
                    <div class="idea-btns">
                        ${moveSelectorHTML}
                        <div style="display:flex; gap:6px; justify-content:flex-end; width:100%;">
                            ${actionButtonsHTML}
                        </div>
                    </div>
                </div>
            `;
        });
    }

    // 3. បច្ចុប្បន្នភាព Dashboard & គណនា Progress Bar
    const totalWeeklyVideos = contentData.filter(t => t.day !== 'Idea_Bucket').length;
    const doneWeeklyVideos = contentData.filter(t => t.day !== 'Idea_Bucket' && t.status === 'Done').length;
    const percent = totalWeeklyVideos > 0 ? Math.round((doneWeeklyVideos / totalWeeklyVideos) * 100) : 0;

    document.getElementById('totalVideos').innerText = totalWeeklyVideos;
    document.getElementById('totalIdeas').innerText = ideaTasks.length;
    document.getElementById('progressBar').style.width = percent + '%';
    document.getElementById('progressText').innerText = percent + '%';
}

// មុខងារអនុវត្តការផ្ទេរគំនិតទៅកាន់កាលវិភាគ
window.executeMoveIdea = function(id) {
    const selectEl = document.getElementById(`moveDaySelect-${id}`);
    const targetDay = selectEl.value;
    if (!targetDay) return;

    const task = contentData.find(t => t.id === id);
    if (task) {
        task.day = targetDay;
        localStorage.setItem('local_planner_videos', JSON.stringify(contentData));
        renderPlanner();
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
        document.querySelector('.main-layout').style.gridTemplateColumns = "1fr";
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

// មុខងារទាញទិន្នន័យ Backup ចេញជា File JSON
window.exportData = function() {
    if (contentData.length === 0) {
        alert("មិនមានទិន្នន័យសម្រាប់លុប ឬ Backup ទេ!");
        return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(contentData));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `local_planner_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

// មុខងារហៅប្រអប់ជ្រើសរើស File Import
window.triggerImport = function() {
    document.getElementById('importFile').click();
}

// មុខងារអាន File JSON និងបញ្ចូលទៅ LocalStorage
window.importData = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (Array.isArray(importedData)) {
                if(confirm("តើអ្នកពិតជាចង់បញ្ចូលទិន្នន័យនេះមែនទេ? វានឹងលុបទិន្នន័យចាស់ដែលមាននៅលើម៉ាស៊ីននេះចោល។")) {
                    contentData = importedData;
                    localStorage.setItem('local_planner_videos', JSON.stringify(contentData));
                    renderPlanner();
                    alert("📥 បញ្ចូលទិន្នន័យដោយជោគជ័យ!");
                }
            } else {
                alert("❌ ទម្រង់ File មិនត្រឹមត្រូវឡើយ (ត្រូវតែជា JSON របស់ប្រព័ន្ធ Local Planner)!");
            }
        } catch (error) {
            alert("❌ មានបញ្ហាក្នុងការអាន File នេះ! សូមពិនិត្យមើលឡើងវិញ។");
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input file
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
