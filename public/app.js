const socket = io();

// DOM Elements
const statusEl = document.getElementById('agent-status');
const waStatusEl = document.getElementById('wa-status');
const qrContainer = document.getElementById('qr-container');
const qrImage = document.getElementById('qr-image');
const qrSpinner = document.getElementById('qr-spinner');
const waConnectedState = document.getElementById('wa-connected-state');

const terminalOutput = document.getElementById('terminal-output');
const reasoningOutput = document.getElementById('reasoning-output');
const reasoningStatus = document.getElementById('reasoning-status');

const commandForm = document.getElementById('command-form');
const cmdInput = document.getElementById('cmd-input');
const clearBtn = document.getElementById('clear-btn');
const quickCmds = document.querySelectorAll('.quick-cmd');

// Tab System
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Config Elements
const configForm = document.getElementById('config-form');
const btnRefreshConfig = document.getElementById('btn-refresh-config');
const configModel = document.getElementById('config-model');
const configCustomModel = document.getElementById('config-custom-model');

const configHeartbeat = document.getElementById('config-heartbeat');
const configCustomHeartbeat = document.getElementById('config-custom-heartbeat');

// Theme Toggle
const themeToggle = document.getElementById('theme-toggle');
const appBody = document.getElementById('app-body');
let isAzulOro = true;

themeToggle.addEventListener('click', () => {
    isAzulOro = !isAzulOro;
    if (isAzulOro) {
        appBody.classList.add('theme-azul-oro');
    } else {
        appBody.classList.remove('theme-azul-oro');
    }
    appendLog(`Tema visual cambiado a ${isAzulOro ? 'Azul y Oro' : 'Matrix'}`, 'system');
});

// Tab Navigation Logic
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active', 'hidden'));
        tabContents.forEach(c => c.classList.add('hidden'));

        // Add active class to clicked
        btn.classList.add('active');
        const targetId = btn.getAttribute('data-target');
        const targetContent = document.getElementById(targetId);
        targetContent.classList.remove('hidden');
        targetContent.classList.add('active');

        // Load specific data when tab is opened
        if (targetId === 'tab-context') {
            socket.emit('get_wiki_tree');
            if (currentEditingFile === 'AGENTS.md') {
                socket.emit('get_agents_md');
            } else {
                socket.emit('get_wiki_file', currentEditingFile);
            }
        } else if (targetId === 'tab-config') {
            socket.emit('get_config');
            socket.emit('check_local_models');
        }
    });
});

// Select custom model logic
configModel.addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
        configCustomModel.disabled = false;
        configCustomModel.focus();
    } else {
        configCustomModel.disabled = true;
    }
});

// Select custom heartbeat logic
if (configHeartbeat) {
    configHeartbeat.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            configCustomHeartbeat.disabled = false;
            configCustomHeartbeat.focus();
        } else {
            configCustomHeartbeat.disabled = true;
        }
    });
}

// Utilidad para autoscroll
function scrollToBottom(el) {
    if (el) el.scrollTop = el.scrollHeight;
}

// Agregar log a la terminal
function appendLog(msg, type = 'info') {
    if (!terminalOutput) return;
    const div = document.createElement('div');
    const time = new Date().toLocaleTimeString();
    
    let colorClass = 'text-gray-300';
    let icon = '<i class="fa-solid fa-angle-right text-gray-500 mr-2"></i>';
    
    if (type === 'error') {
        colorClass = 'text-red-400';
        icon = '<i class="fa-solid fa-triangle-exclamation text-red-500 mr-2"></i>';
    } else if (type === 'success') {
        colorClass = 'text-green-400';
        icon = '<i class="fa-solid fa-check text-green-500 mr-2"></i>';
    } else if (type === 'system') {
        colorClass = 'text-accent-400';
        icon = '<i class="fa-solid fa-gear text-accent-500 mr-2"></i>';
    }

    div.className = `${colorClass} animate-fade-in flex items-start gap-2 mb-1`;
    div.innerHTML = `<span class="text-gray-600 text-[10px] mt-1 shrink-0">[${time}]</span> <div class="flex-1">${icon} ${msg}</div>`;
    
    terminalOutput.appendChild(div);
    scrollToBottom(terminalOutput);
}

// Agregar log de razonamiento
function appendReasoning(msg) {
    if (!reasoningOutput || !reasoningStatus) return;

    if (reasoningOutput.innerHTML.includes('Esperando inyección')) {
        reasoningOutput.innerHTML = '';
    }

    const div = document.createElement('div');
    
    let styleClass = 'text-gray-300 border-l-2 border-gray-700 pl-3 py-1';
    let icon = '<i class="fa-solid fa-bolt text-primary-500 mr-2"></i>';
    
    if (msg.includes('Tesis')) {
        styleClass = 'text-accent-300 border-l-2 border-accent-500 pl-3 py-2 bg-accent-900/10 rounded-r';
        icon = '<i class="fa-solid fa-magnifying-glass text-accent-400 mr-2"></i>';
        reasoningStatus.innerHTML = '<i class="fa-solid fa-circle text-[10px] mr-1 text-accent-400 animate-pulse"></i> ASIMILANDO';
        reasoningStatus.className = 'text-xs font-bold text-accent-400 bg-accent-900/30 px-2 py-1 rounded border border-accent-500/30';
    } else if (msg.includes('Antítesis') && msg.includes('Ollama')) {
        styleClass = 'text-purple-300 border-l-2 border-purple-500 pl-3 py-2 bg-purple-900/10 rounded-r';
        icon = '<i class="fa-solid fa-microchip text-purple-400 mr-2"></i>';
        reasoningStatus.innerHTML = '<i class="fa-solid fa-circle text-[10px] mr-1 text-purple-400 animate-pulse"></i> INFERENCIA LOCAL';
        reasoningStatus.className = 'text-xs font-bold text-purple-400 bg-purple-900/30 px-2 py-1 rounded border border-purple-500/30';
    } else if (msg.includes('Antítesis')) {
        styleClass = 'text-primary-300 border-l-2 border-primary-500 pl-3 py-2 bg-primary-900/10 rounded-r';
        icon = '<i class="fa-solid fa-network-wired text-primary-400 mr-2"></i>';
        reasoningStatus.innerHTML = '<i class="fa-solid fa-circle text-[10px] mr-1 text-primary-400 animate-pulse"></i> SINTETIZANDO NUBE';
        reasoningStatus.className = 'text-xs font-bold text-primary-400 bg-primary-900/30 px-2 py-1 rounded border border-primary-500/30';
    } else if (msg.includes('Síntesis')) {
        styleClass = 'text-green-300 border-l-2 border-green-500 pl-3 py-2 bg-green-900/10 rounded-r';
        icon = '<i class="fa-solid fa-check-double text-green-400 mr-2"></i>';
        reasoningStatus.innerHTML = '<i class="fa-solid fa-circle text-[10px] mr-1 text-green-400"></i> COMPLETADO';
        reasoningStatus.className = 'text-xs font-bold text-green-400 bg-green-900/30 px-2 py-1 rounded border border-green-500/30';
        
        setTimeout(() => {
            reasoningStatus.innerHTML = '<i class="fa-solid fa-circle text-[10px] mr-1 text-gray-500"></i> STANDBY';
            reasoningStatus.className = 'text-xs font-bold text-accent-500 bg-accent-900/30 px-2 py-1 rounded border border-accent-500/30';
        }, 3000);
    } else if (msg.includes('Subagente') || msg.includes('Herramienta')) {
        styleClass = 'text-orange-300 border-l-2 border-orange-500 pl-3 py-2 bg-orange-900/10 rounded-r';
        icon = '<i class="fa-solid fa-robot text-orange-400 mr-2"></i>';
        reasoningStatus.innerHTML = '<i class="fa-solid fa-circle text-[10px] mr-1 text-orange-400 animate-spin"></i> SUBAGENTE';
        reasoningStatus.className = 'text-xs font-bold text-orange-400 bg-orange-900/30 px-2 py-1 rounded border border-orange-500/30';
    }

    div.className = `${styleClass} animate-fade-in text-sm font-medium shadow-sm`;
    div.innerHTML = `<div class="flex items-start">${icon} <span class="flex-1">${msg}</span></div>`;
    
    reasoningOutput.appendChild(div);
    scrollToBottom(reasoningOutput);
}

// Quick Commands
quickCmds.forEach(btn => {
    btn.addEventListener('click', () => {
        const cmd = btn.getAttribute('data-cmd');
        if (cmdInput) {
            cmdInput.value = cmd;
            cmdInput.focus();
        }
    });
});

// Socket Events
socket.on('connect', () => {
    if (statusEl) {
        statusEl.textContent = 'Enlazado al Gateway';
        statusEl.className = 'px-2 py-1 bg-green-900/50 text-green-400 rounded border border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.3)] font-bold';
    }
    appendLog('Conexión WebSocket establecida con el motor Geist.', 'system');
    socket.emit('get_config'); // Load initial config silently
});

socket.on('disconnect', () => {
    if (statusEl) {
        statusEl.textContent = 'Desconectado';
        statusEl.className = 'px-2 py-1 bg-red-900/50 text-red-400 rounded border border-red-500/50 font-bold';
    }
    appendLog('Pérdida de conexión con el motor.', 'error');
});

socket.on('qr_code', (url) => {
    if (qrSpinner) qrSpinner.classList.add('hidden');
    if (qrImage) {
        qrImage.src = url;
        qrImage.classList.remove('hidden');
    }
    if (waStatusEl) {
        waStatusEl.innerHTML = '<i class="fa-solid fa-mobile-screen text-yellow-500 mr-1 animate-pulse"></i> Escanear QR';
        waStatusEl.className = 'text-yellow-500 font-bold';
    }
    appendLog('Matriz QR generada. Esperando enlace de dispositivo...', 'info');
});

socket.on('whatsapp_ready', () => {
    if (qrContainer) qrContainer.classList.add('hidden');
    if (waConnectedState) {
        waConnectedState.classList.remove('hidden');
        waConnectedState.classList.add('flex');
    }
    if (waStatusEl) {
        waStatusEl.innerHTML = '<i class="fa-solid fa-link text-primary-400 mr-1"></i> Enlazado';
        waStatusEl.className = 'text-primary-400 font-bold glow-text';
    }
    appendLog('Módulo de WhatsApp inicializado y acoplado a la red.', 'success');
});

// New Config & Context Events
socket.on('config_data', (config) => {
    if(config.model) {
        // check if it's in our predefined options
        let optionFound = false;
        Array.from(configModel.options).forEach(opt => {
            if(opt.value === config.model) optionFound = true;
        });

        if (optionFound) {
            configModel.value = config.model;
            configCustomModel.disabled = true;
            configCustomModel.value = '';
        } else {
            configModel.value = 'custom';
            configCustomModel.disabled = false;
            configCustomModel.value = config.model;
        }
    }

    if(config.whatsapp !== undefined) document.getElementById('toggle-whatsapp').checked = config.whatsapp;
    if(config.telegram !== undefined) document.getElementById('toggle-telegram').checked = config.telegram;
    if(config.twitter !== undefined) document.getElementById('toggle-twitter').checked = config.twitter;

    appendLog('Configuración sincronizada con el backend.', 'system');
});

socket.on('agents_md_data', (content) => {
    contextLoading.classList.add('hidden');
    if (content) {
        contextEditor.value = content;
        appendLog('AGENTS.md cargado desde el disco.', 'system');
    } else {
        contextEditor.value = "No se encontró AGENTS.md en la raíz del proyecto.";
        appendLog('No se encontró AGENTS.md.', 'error');
    }
});

socket.on('config_updated', (msg) => {
    appendLog(msg, 'success');
    // Show visual feedback on button
    const submitBtn = configForm.querySelector('button[type="submit"]');
    const originalHtml = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-check mr-1"></i> Aplicado';
    submitBtn.classList.add('bg-green-600');
    setTimeout(() => {
        submitBtn.innerHTML = originalHtml;
        submitBtn.classList.remove('bg-green-600');
    }, 2000);
});

socket.on('agents_md_saved', (msg) => {
    appendLog(msg, 'success');
    contextLoading.classList.add('hidden');
    const originalHtml = saveContextBtn.innerHTML;
    saveContextBtn.innerHTML = '<i class="fa-solid fa-check"></i> Guardado';
    saveContextBtn.classList.add('bg-green-600');
    setTimeout(() => {
        saveContextBtn.innerHTML = originalHtml;
        saveContextBtn.classList.remove('bg-green-600');
    }, 2000);
});

socket.on('agent_log', (msg) => appendLog(msg, 'info'));
socket.on('agent_reasoning', (msg) => appendReasoning(msg));

socket.on('agent_result', (result) => {
    appendLog('Dialéctica concluida. Síntesis generada.', 'success');
    const preview = typeof result === 'string' ? result.substring(0, 100).replace(/\n/g, ' ') + '...' : 'Resultado recibido.';
    appendLog(`Respuesta: ${preview}`, 'info');
});

socket.on('agent_error', (errorMsg) => {
    appendLog(`Aporía Crítica: ${errorMsg}`, 'error');
    if (reasoningStatus) {
        reasoningStatus.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-red-500 text-[10px] mr-1"></i> FALLO COGNITIVO';
        reasoningStatus.className = 'text-xs font-bold text-red-400 bg-red-900/30 px-2 py-1 rounded border border-red-500/30';
    }
});

// Compat map
socket.on('whatsapp_qr', (url) => socket.emit('qr_code', url));
socket.on('whatsapp_status', (status) => { if(status==='connected') socket.emit('whatsapp_ready'); });
socket.on('system_log', (msg) => appendLog(msg, 'system'));
socket.on('system_error', (msg) => appendLog(msg, 'error'));
socket.on('agent_progress', (msg) => appendReasoning(msg));
socket.on('agent_response', (msg) => socket.emit('agent_result', msg));

// UI Events
if (clearBtn) {
    clearBtn.addEventListener('click', () => {
        if (terminalOutput) {
            terminalOutput.innerHTML = '<div class="text-gray-500 flex items-center gap-2 mb-2"><i class="fa-solid fa-terminal"></i> Daemon TUI purgado.</div>';
        }
    });
}

if (commandForm) {
    commandForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const cmd = cmdInput ? cmdInput.value.trim() : '';
        if (!cmd) return;

        appendLog(`Inyectando Tesis Manual: ${cmd}`, 'system');
        
        if (reasoningOutput) {
            reasoningOutput.innerHTML = '<div class="text-accent-900/50 italic flex items-center gap-2"><i class="fa-solid fa-satellite-dish"></i> Procesando inyección...</div>';
        }
        
        socket.emit('dashboard_command', cmd);
        socket.emit('ui_command', cmd);
        
        if (cmdInput) cmdInput.value = '';
    });
}

if (cmdInput) {
    cmdInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            commandForm.dispatchEvent(new Event('submit'));
        }
    });
}

// Config Submits
if (configForm) {
    configForm.addEventListener('submit', (e) => {
        e.preventDefault();

        let modelToUse = configModel.value;
        if (modelToUse === 'custom') {
            modelToUse = configCustomModel.value.trim();
        }

        const configData = {
            model: modelToUse,
            whatsapp: document.getElementById('toggle-whatsapp').checked,
            telegram: document.getElementById('toggle-telegram').checked,
            twitter: document.getElementById('toggle-twitter').checked
        };

        appendLog(`Enviando actualización de configuración al motor...`, 'system');
        socket.emit('update_config', configData);
    });
}

if (btnRefreshConfig) {
    btnRefreshConfig.addEventListener('click', () => {
        appendLog(`Solicitando recarga de configuración...`, 'system');
        socket.emit('get_config');
    });
}

// Context Actions
let currentEditingFile = 'AGENTS.md';
const currentFileLabel = document.getElementById('current-file-label');
const wikiTreeContainer = document.getElementById('wiki-tree-container');
const newWikiBtn = document.getElementById('new-wiki-btn');

function renderWikiTree(files) {
    if (!wikiTreeContainer) return;
    let html = `<div class="cursor-pointer hover:bg-gray-800/80 p-1.5 rounded transition-colors mb-1 ${currentEditingFile === 'AGENTS.md' ? 'text-primary-400 font-bold' : 'text-gray-300'}" onclick="loadAgentsMd()">
        <i class="fa-solid fa-file-shield text-red-400 w-4 text-center mr-1"></i> AGENTS.md
    </div>`;
    
    html += '<div class="text-[10px] text-gray-500 uppercase mt-3 mb-1 px-1 tracking-wider border-b border-gray-800 pb-1">Wiki Workspace</div>';

    if (!files || files.length === 0) {
        html += '<div class="text-xs text-gray-500 italic p-1">No hay archivos en la wiki.</div>';
    } else {
        files.forEach(file => {
            const isActive = currentEditingFile === file;
            html += `<div class="cursor-pointer hover:bg-gray-800/80 p-1.5 rounded transition-colors text-xs truncate flex items-center ${isActive ? 'text-primary-400 bg-gray-800/50 font-bold' : 'text-gray-400'}" onclick="loadWikiFile('${file}')">
                <i class="fa-solid fa-file-lines text-blue-400 w-4 text-center mr-1"></i> <span class="truncate" title="${file}">${file}</span>
            </div>`;
        });
    }
    wikiTreeContainer.innerHTML = html;
}

window.loadAgentsMd = function() {
    currentEditingFile = 'AGENTS.md';
    if (currentFileLabel) currentFileLabel.textContent = currentEditingFile;
    contextLoading.classList.remove('hidden');
    socket.emit('get_agents_md');
};

window.loadWikiFile = function(filename) {
    currentEditingFile = filename;
    if (currentFileLabel) currentFileLabel.textContent = currentEditingFile;
    contextLoading.classList.remove('hidden');
    socket.emit('get_wiki_file', filename);
};

if (newWikiBtn) {
    newWikiBtn.addEventListener('click', () => {
        const filename = prompt("Nombre del nuevo archivo wiki (ej. Nuevo_Concepto):");
        if (filename && filename.trim()) {
            let name = filename.trim();
            if (!name.endsWith('.md')) name += '.md';
            currentEditingFile = name;
            if (currentFileLabel) currentFileLabel.textContent = currentEditingFile;
            contextEditor.value = `# ${name.replace('.md', '')}\n\n`;
            renderWikiTree([]); // Trick to update active state, tree will refresh on save
            socket.emit('get_wiki_tree');
        }
    });
}

socket.on('wiki_tree_data', (files) => {
    renderWikiTree(files);
});

socket.on('wiki_file_data', ({ filename, content }) => {
    contextLoading.classList.add('hidden');
    contextEditor.value = content;
    appendLog(`Archivo ${filename} cargado.`, 'system');
    socket.emit('get_wiki_tree'); // Refresh tree to show active state
});

socket.on('wiki_file_saved', (msg) => {
    appendLog(msg, 'success');
    contextLoading.classList.add('hidden');
    const originalHtml = saveContextBtn.innerHTML;
    saveContextBtn.innerHTML = '<i class="fa-solid fa-check"></i> Guardado';
    saveContextBtn.classList.add('bg-green-600');
    setTimeout(() => {
        saveContextBtn.innerHTML = originalHtml;
        saveContextBtn.classList.remove('bg-green-600');
    }, 2000);
});

// Update existing tab load logic to also fetch tree
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        if (targetId === 'tab-context') {
            socket.emit('get_wiki_tree');
            if (currentEditingFile === 'AGENTS.md') {
                socket.emit('get_agents_md');
            } else {
                socket.emit('get_wiki_file', currentEditingFile);
            }
        }
    });
});

if (saveContextBtn) {
    saveContextBtn.addEventListener('click', () => {
        const content = contextEditor.value;
        contextLoading.classList.remove('hidden');
        appendLog(`Guardando actualizaciones en ${currentEditingFile}...`, 'system');
        if (currentEditingFile === 'AGENTS.md') {
            socket.emit('save_agents_md', content);
        } else {
            socket.emit('save_wiki_file', { filename: currentEditingFile, content });
        }
    });
}
