let tasks = [];
let currentFilter = '';
let isListening = false;
let recognition = null;
let toastTimeout = null;

let todoList, progressList, doneList;
let todoCountEl, progressCountEl, doneCountEl;
let searchInput;
let canvas, ctx;
let toast, toastMessage, toastIcon;
let addModal, modalTaskTitle, modalTaskStatus;
let voiceButton, voiceModal, voiceStatusText;

window.addEventListener('DOMContentLoaded', init);

function init() {
    todoList = document.getElementById('todo-list');
    progressList = document.getElementById('progress-list');
    doneList = document.getElementById('done-list');
    
    todoCountEl = document.getElementById('todo-count');
    progressCountEl = document.getElementById('progress-count');
    doneCountEl = document.getElementById('done-count');
    
    searchInput = document.getElementById('search-input');
    canvas = document.getElementById('progress-canvas');
    ctx = canvas.getContext('2d');
    toast = document.getElementById('toast');
    toastMessage = document.getElementById('toast-message');
    toastIcon = document.getElementById('toast-icon');
    
    addModal = document.getElementById('add-modal');
    modalTaskTitle = document.getElementById('modal-task-title');
    modalTaskStatus = document.getElementById('modal-task-status');
    voiceButton = document.getElementById('voice-button');
    
    canvas.width = 160;
    canvas.height = 160;
    
    searchInput.addEventListener('input', () => {
        currentFilter = searchInput.value.toLowerCase().trim();
        renderBoard();
    });
    
    document.addEventListener('keydown', handleKeyboard);
    
    loadTasks();
    if (tasks.length === 0) {
        createDemoTasks();
    }
    
    renderBoard();
    setupSpeechRecognition();
}

function handleKeyboard(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
    }
    if (e.key === '/' && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "SELECT") {
        e.preventDefault();
        searchInput.focus();
    }
}

function createDemoTasks() {
    tasks = [
        { id: 'task-1', title: 'Welcome to UJJWAL To do board!', status: 'todo' },
        { id: 'task-2', title: 'HIGH: Double click this card to edit text', status: 'todo' },
        { id: 'task-3', title: 'Drag me to In Progress or Done', status: 'inprogress' },
        { id: 'task-4', title: 'LOW: Click microphone button to say "Add task..."', status: 'done' }
    ];
    saveTasks();
}

function loadTasks() {
    const saved = localStorage.getItem('vibeTasks');
    if (saved) {
        try { tasks = JSON.parse(saved); } catch(e) { tasks = []; }
    }
}

function saveTasks() {
    localStorage.setItem('vibeTasks', JSON.stringify(tasks));
}

function handleDragOver(e) {
    e.preventDefault();
    const col = e.currentTarget;
    if (!col.classList.contains('drop-over')) {
        col.classList.add('drop-over');
    }
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drop-over');
}

function handleDrop(e, targetStatus) {
    e.preventDefault();
    e.currentTarget.classList.remove('drop-over');
    const taskId = e.dataTransfer.getData('text/plain');
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex !== -1 && tasks[taskIndex].status !== targetStatus) {
        tasks[taskIndex].status = targetStatus;
        saveTasks();
        renderBoard();
        showToast('📋', 'Task status updated');
    }
}

function showAddModal() {
    modalTaskTitle.value = '';
    modalTaskStatus.value = 'todo';
    addModal.classList.add('show');
    modalTaskTitle.focus();
}

function hideAddModal() {
    addModal.classList.remove('show');
}

function addTaskFromModal() {
    const title = modalTaskTitle.value.trim();
    if (!title) {
        showToast('❌', 'Task title cannot be empty');
        return;
    }
    const status = modalTaskStatus.value;
    const newTask = {
        id: 'task-' + Date.now(),
        title: title,
        status: status
    };
    tasks.push(newTask);
    saveTasks();
    renderBoard();
    hideAddModal();
    showToast('🚀', 'Task added successfully');
}

function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderBoard();
    showToast('🗑️', 'Task removed');
}

function clearCompleted() {
    const initialLength = tasks.length;
    tasks = tasks.filter(t => t.status !== 'done');
    if (tasks.length === initialLength) {
        showToast('ℹ️', 'No completed tasks to clear');
        return;
    }
    saveTasks();
    renderBoard();
    showToast('🧹', 'Done tasks cleared');
}

function enableInlineEdit(titleEl, taskId) {
    titleEl.contentEditable = true;
    titleEl.focus();
    
    const range = document.createRange();
    range.selectNodeContents(titleEl);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    
    function saveChange() {
        titleEl.contentEditable = false;
        const newTitle = titleEl.textContent.trim();
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        
        if (taskIndex !== -1 && newTitle && newTitle !== tasks[taskIndex].title) {
            tasks[taskIndex].title = newTitle;
            saveTasks();
            renderBoard(); 
            showToast('✏️', 'Task updated');
        } else {
            renderBoard();
        }
    }
    
    titleEl.addEventListener('blur', saveChange, { once: true });
    titleEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            titleEl.blur();
        }
    });
}

function getCleanTitleAndTag(title) {
    const t = title.toLowerCase();
    if (t.includes('high:') || t.includes('urgent:')) {
        return { text: title.replace(/(high|urgent):/i, '').trim(), tag: 'high' };
    }
    if (t.includes('low:')) {
        return { text: title.replace(/low:/i, '').trim(), tag: 'low' };
    }
    return { text: title, tag: 'normal' };
}

function getStatusLabel(status) {
    if (status === 'todo') return 'To Do';
    if (status === 'inprogress') return 'In Progress';
    return 'Done';
}

function renderBoard() {
    todoList.innerHTML = '';
    progressList.innerHTML = '';
    doneList.innerHTML = '';
    
    const filteredTasks = tasks.filter(task => {
        if (!currentFilter) return true;
        return task.title.toLowerCase().includes(currentFilter);
    });
    
    filteredTasks.forEach(task => {
        const card = createTaskCard(task);
        if (task.status === 'todo') todoList.appendChild(card);
        else if (task.status === 'inprogress') progressList.appendChild(card);
        else if (task.status === 'done') doneList.appendChild(card);
    });
    
    appendEmptyStateIfNeeded(todoList, '📌', 'All clear here!');
    appendEmptyStateIfNeeded(progressList, '🏃‍♂️', 'Nothing in progress');
    appendEmptyStateIfNeeded(doneList, '🏆', 'No completed tasks');
    
    const counts = tasks.reduce((acc, t) => {
        if (acc[t.status] !== undefined) acc[t.status]++;
        return acc;
    }, { todo: 0, inprogress: 0, done: 0 });
    
    todoCountEl.textContent = counts.todo;
    progressCountEl.textContent = counts.inprogress;
    doneCountEl.textContent = counts.done;
    
    document.getElementById('total-tasks').textContent = tasks.length;
    document.getElementById('todo-stat').textContent = counts.todo;
    document.getElementById('progress-stat').textContent = counts.inprogress;
    
    updateAnalytics(counts);
}

function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = `task-card`;
    card.draggable = true;
    card.dataset.id = task.id;
    
    const parsed = getCleanTitleAndTag(task.title);
    if (parsed.tag === 'high') card.classList.add('high');
    else if (parsed.tag === 'low') card.classList.add('low');
    
    card.innerHTML = `
        <div class="task-title" title="Double click to edit"></div>
        <div class="task-meta">
            <div style="display:flex; align-items:center; gap:6px;">
                <span class="priority-badge ${parsed.tag}-tag">${parsed.tag}</span>
                <span>• ${getStatusLabel(task.status)}</span>
            </div>
            <div class="delete-btn">✕</div>
        </div>
    `;
    
    const titleEl = card.querySelector('.task-title');
    titleEl.textContent = parsed.text;
    
    card.addEventListener('dblclick', () => enableInlineEdit(titleEl, task.id));
    
    card.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTask(task.id);
    });
    
    card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', task.id);
        setTimeout(() => card.style.opacity = '0.4', 0);
    });
    
    card.addEventListener('dragend', () => card.style.opacity = '1');
    
    return card;
}

function appendEmptyStateIfNeeded(container, emoji, text) {
    if (container.children.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div style="font-size:42px; margin-bottom:12px; opacity:0.3;">${emoji}</div>
                <div>${text}</div>
            </div>
        `;
    }
}

function updateAnalytics(counts) {
    const total = tasks.length;
    const completionPercent = total > 0 ? Math.round((counts.done / total) * 100) : 0;
    
    document.getElementById('completion-percent').textContent = completionPercent;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 65;
    const strokeWidth = 12;
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.stroke();
    
    if (completionPercent > 0) {
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + (2 * Math.PI * (completionPercent / 100));
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = 'round';
        
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#c026d3');
        gradient.addColorStop(1, '#a855f7');
        
        ctx.strokeStyle = gradient;
        ctx.stroke();
    }
}

function showToast(icon, message) {
    if (toastTimeout) clearTimeout(toastTimeout);
    toastIcon.textContent = icon;
    toastMessage.textContent = message;
    toast.classList.add('show');
    
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    voiceModal = document.getElementById('voice-modal');
    voiceStatusText = document.getElementById('voice-status-text');

    if (!SpeechRecognition) {
        voiceButton.style.display = 'none';
        return;
    }
    
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';
    
    recognition.onstart = () => {
        isListening = true;
        voiceButton.classList.add('listening');
        voiceStatusText.textContent = "Listening...";
        voiceModal.classList.add('show');
    };
    
    recognition.onend = () => {
        isListening = false;
        voiceButton.classList.remove('listening');
        voiceModal.classList.remove('show');
    };
    
    recognition.onerror = (event) => {
        isListening = false;
        voiceButton.classList.remove('listening');
        voiceModal.classList.remove('show');
        
        if (event.error === 'not-allowed') {
            showToast('❌', 'Microphone blocked! Allow access from browser bar.');
        } else if (event.error === 'no-speech') {
            showToast('💡', 'No speech detected. Try again.');
        } else {
            showToast('❌', 'Voice error. Please retry.');
        }
    };
    
    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        
        let currentText = finalTranscript || interimTranscript;
        if (currentText.trim().length > 0) {
            voiceStatusText.textContent = `"${currentText}"`;
            voiceStatusText.style.color = "#c4b5fd";
        }
        
        if (finalTranscript !== '') {
            recognition.stop();
            parseVoiceCommand(finalTranscript.toLowerCase().trim());
        }
    };
}

function toggleVoiceRecognition() {
    if (!recognition) return;
    if (isListening) {
        recognition.stop();
    } else {
        recognition.start();
    }
}

function parseVoiceCommand(text) {
    if (text.startsWith('add task')) {
        const taskTitle = text.replace('add task', '').trim();
        if (taskTitle.length > 0) {
            const formattedTitle = taskTitle.charAt(0).toUpperCase() + taskTitle.slice(1);
            const newTask = {
                id: 'task-' + Date.now(),
                title: formattedTitle,
                status: 'todo'
            };
            tasks.push(newTask);
            saveTasks();
            renderBoard();
            showToast('🎙️', `Added: "${formattedTitle}"`);
        } else {
            showToast('💡', 'Please say a task name after "add task"');
        }
    } else {
        showToast('💡', 'Say: "Add task [your work]"');
    }
}