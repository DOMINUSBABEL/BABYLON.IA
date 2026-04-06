const socket = io();

// Elementos del DOM
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
        colorClass = 'text-blue-400';
        icon = '<i class="fa-solid fa-gear text-blue-500 mr-2"></i>';
    }

    div.className = `${colorClass} animate-fade-in flex items-start gap-2 mb-1`;
    div.innerHTML = `<span class="text-gray-600 text-[10px] mt-1 shrink-0">[${time}]</span> <div class="flex-1">${icon} ${msg}</div>`;
    
    terminalOutput.appendChild(div);
    scrollToBottom(terminalOutput);
}

// Agregar log de razonamiento
function appendReasoning(msg) {
    if (!reasoningOutput || !reasoningStatus) return;

    // Si es el primer mensaje, limpiamos el placeholder
    if (reasoningOutput.innerHTML.includes('Esperando inyección')) {
        reasoningOutput.innerHTML = '';
    }

    const div = document.createElement('div');
    
    // Determinar estilo según la fase
    let styleClass = 'text-gray-300 border-l-2 border-gray-700 pl-3 py-1';
    let icon = '<i class="fa-solid fa-bolt text-yellow-500 mr-2"></i>';
    
    if (msg.includes('Tesis')) {
        styleClass = 'text-blue-300 border-l-2 border-blue-500 pl-3 py-2 bg-blue-900/10 rounded-r';
        icon = '<i class="fa-solid fa-magnifying-glass text-blue-400 mr-2"></i>';
        reasoningStatus.innerHTML = '<i class="fa-solid fa-circle text-[10px] mr-1 text-blue-400 animate-pulse"></i> ASIMILANDO';
        reasoningStatus.className = 'text-xs font-bold text-blue-400 bg-blue-900/30 px-2 py-1 rounded border border-blue-500/30';
    } else if (msg.includes('Antítesis') && msg.includes('Ollama')) {
        styleClass = 'text-purple-300 border-l-2 border-purple-500 pl-3 py-2 bg-purple-900/10 rounded-r';
        icon = '<i class="fa-solid fa-microchip text-purple-400 mr-2"></i>';
        reasoningStatus.innerHTML = '<i class="fa-solid fa-circle text-[10px] mr-1 text-purple-400 animate-pulse"></i> INFERENCIA LOCAL';
        reasoningStatus.className = 'text-xs font-bold text-purple-400 bg-purple-900/30 px-2 py-1 rounded border border-purple-500/30';
    } else if (msg.includes('Antítesis')) {
        styleClass = 'text-yellow-300 border-l-2 border-yellow-500 pl-3 py-2 bg-yellow-900/10 rounded-r';
        icon = '<i class="fa-solid fa-network-wired text-yellow-400 mr-2"></i>';
        reasoningStatus.innerHTML = '<i class="fa-solid fa-circle text-[10px] mr-1 text-yellow-400 animate-pulse"></i> SINTETIZANDO NUBE';
        reasoningStatus.className = 'text-xs font-bold text-yellow-400 bg-yellow-900/30 px-2 py-1 rounded border border-yellow-500/30';
    } else if (msg.includes('Síntesis')) {
        styleClass = 'text-green-300 border-l-2 border-green-500 pl-3 py-2 bg-green-900/10 rounded-r';
        icon = '<i class="fa-solid fa-check-double text-green-400 mr-2"></i>';
        reasoningStatus.innerHTML = '<i class="fa-solid fa-circle text-[10px] mr-1 text-green-400"></i> COMPLETADO';
        reasoningStatus.className = 'text-xs font-bold text-green-400 bg-green-900/30 px-2 py-1 rounded border border-green-500/30';
        
        setTimeout(() => {
            reasoningStatus.innerHTML = '<i class="fa-solid fa-circle text-[10px] mr-1 text-gray-500"></i> STANDBY';
            reasoningStatus.className = 'text-xs font-bold text-blue-500 bg-blue-900/30 px-2 py-1 rounded border border-blue-500/30';
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

// Socket Events
socket.on('connect', () => {
    if (statusEl) {
        statusEl.textContent = 'Enlazado al Gateway';
        statusEl.className = 'px-2 py-1 bg-green-900/50 text-green-400 rounded border border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.3)] font-bold';
    }
    appendLog('Conexión WebSocket establecida con el motor Geist.', 'system');
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
        waStatusEl.innerHTML = '<i class="fa-solid fa-link text-green-400 mr-1"></i> Enlazado';
        waStatusEl.className = 'text-green-400 font-bold drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]';
    }
    appendLog('Módulo de WhatsApp inicializado y acoplado a la red.', 'success');
});

socket.on('agent_log', (msg) => {
    appendLog(msg, 'info');
});

socket.on('agent_reasoning', (msg) => {
    appendReasoning(msg);
});

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

// Alias for old events mapping to new ones to ensure backwards compatibility with server.js
socket.on('whatsapp_qr', (url) => socket.emit('qr_code', url));
socket.on('whatsapp_status', (status) => { if(status==='connected') socket.emit('whatsapp_ready'); });
socket.on('system_log', (msg) => appendLog(msg, 'system'));
socket.on('system_error', (msg) => appendLog(msg, 'error'));
socket.on('agent_progress', (msg) => appendReasoning(msg));
socket.on('agent_response', (msg) => socket.emit('agent_result', msg));

// Eventos de UI
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
            reasoningOutput.innerHTML = '<div class="text-blue-900/50 italic flex items-center gap-2"><i class="fa-solid fa-satellite-dish"></i> Procesando inyección...</div>';
        }
        
        socket.emit('dashboard_command', cmd); // server.js usually listens to dashboard_command or ui_command
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