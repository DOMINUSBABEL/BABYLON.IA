const socket = io();

// Elementos del DOM
const qrContainer = document.getElementById('qr-container');
const qrSpinner = document.getElementById('qr-spinner');
const qrImage = document.getElementById('qr-image');
const waConnectedState = document.getElementById('wa-connected-state');

const waStatus = document.getElementById('wa-status');
const agentStatus = document.getElementById('agent-status');

const terminalOutput = document.getElementById('terminal-output');
const commandForm = document.getElementById('command-form');
const cmdInput = document.getElementById('cmd-input');
const clearBtn = document.getElementById('clear-btn');

// Auto-scroll de la terminal
function scrollToBottom() {
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

// Agregar log a la terminal
function appendLog(message, type = 'info') {
    const div = document.createElement('div');
    div.className = 'mb-1 border-b border-gray-800/50 pb-1';
    
    // Asignar colores según el tipo
    if (type === 'error') {
        div.classList.add('text-red-500');
    } else if (type === 'success') {
        div.classList.add('text-green-400');
    } else if (type === 'warning') {
        div.classList.add('text-yellow-400');
    } else {
        div.classList.add('text-gray-300');
    }
    
    // Limpiar string de comillas si es JSON
    let text = message;
    try {
        if(typeof message === 'string' && message.startsWith('"') && message.endsWith('"')){
             text = JSON.parse(message);
        }
    } catch(e){}

    div.textContent = text;
    terminalOutput.appendChild(div);
    scrollToBottom();
}

// Eventos de Socket.io
socket.on('connect', () => {
    agentStatus.textContent = 'En línea (Dashboard)';
    agentStatus.className = 'px-2 py-1 bg-green-900/50 text-green-400 rounded border border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] glow-text';
    appendLog('Conexión con el servidor Gateway establecida.', 'success');
});

socket.on('disconnect', () => {
    agentStatus.textContent = 'Desconectado';
    agentStatus.className = 'px-2 py-1 bg-red-900/50 text-red-400 rounded border border-red-500';
    waStatus.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-red-500"></i> Desconectado';
    appendLog('Se perdió la conexión con el servidor Gateway.', 'error');
});

// Recepción del código QR
socket.on('whatsapp_qr', (qrDataUrl) => {
    qrSpinner.classList.add('hidden');
    qrImage.src = qrDataUrl;
    qrImage.classList.remove('hidden');
    waStatus.innerHTML = '<i class="fa-solid fa-qrcode text-yellow-500"></i> Esperando Escaneo';
    appendLog('Nuevo código QR de WhatsApp generado. Esperando enlace.', 'warning');
});

// Recepción de conexión exitosa
socket.on('whatsapp_status', (status) => {
    if (status === 'connected') {
        qrContainer.classList.add('hidden');
        waConnectedState.classList.remove('hidden');
        waConnectedState.classList.add('flex');
        waStatus.innerHTML = '<i class="fa-solid fa-link text-green-500"></i> Conectado';
        appendLog('Motor de WhatsApp Web enlazado y listo.', 'success');
    }
});

// Logs generales del sistema
socket.on('system_log', (msg) => {
    appendLog(msg);
});

socket.on('system_error', (msg) => {
    appendLog(msg, 'error');
});

// Actualizaciones de estado del agente
socket.on('agent_status', (status) => {
    agentStatus.textContent = status;
});

socket.on('agent_progress', (msg) => {
    appendLog(`[Geist] ${msg}`, 'warning');
});

socket.on('agent_response', (msg) => {
    appendLog(`[Síntesis]:\n${msg}`, 'success');
});

// Interacciones UI
commandForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const cmd = cmdInput.value.trim();
    if (cmd) {
        socket.emit('dashboard_command', cmd);
        appendLog(`> Ejecutando tesis manual: ${cmd}`, 'info');
        cmdInput.value = '';
    }
});

clearBtn.addEventListener('click', () => {
    terminalOutput.innerHTML = '<div class="text-gray-500 mb-2">Bucle dialéctico reinicializado...</div>';
});