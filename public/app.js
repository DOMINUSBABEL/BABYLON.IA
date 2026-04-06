const socket = io();

// Elementos del DOM
const qrContainer = document.getElementById('qr-container');
const qrSpinner = document.getElementById('qr-spinner');
const qrImage = document.getElementById('qr-image');
const waConnectedState = document.getElementById('wa-connected-state');

const waStatus = document.getElementById('wa-status');
const agentStatus = document.getElementById('agent-status');

const terminalOutput = document.getElementById('terminal-output');
const reasoningOutput = document.getElementById('reasoning-output');
const reasoningStatus = document.getElementById('reasoning-status');
const commandForm = document.getElementById('command-form');
const cmdInput = document.getElementById('cmd-input');
const clearBtn = document.getElementById('clear-btn');

let currentTaskSteps = 0;

// Auto-scroll de la terminal
function scrollToBottom() {
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

function scrollReasoningToBottom() {
    reasoningOutput.scrollTop = reasoningOutput.scrollHeight;
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
    if (status === 'Pensando...') {
        reasoningStatus.innerHTML = '<i class="fa-solid fa-circle fa-beat text-blue-500 text-[10px] mr-1"></i> Procesando';
        reasoningOutput.innerHTML = ''; // Limpiar panel anterior
        currentTaskSteps = 0;
    } else if (status === 'En espera de directivas') {
        reasoningStatus.innerHTML = '<i class="fa-solid fa-circle text-green-500 text-[10px] mr-1"></i> Terminado';
    } else if (status === 'Error') {
        reasoningStatus.innerHTML = '<i class="fa-solid fa-circle text-red-500 text-[10px] mr-1"></i> Error';
    }
});

socket.on('agent_progress', (msg) => {
    // Ya no lo enviamos al log general, lo ponemos en el panel de razonamiento como pasos (Queue Orders)
    currentTaskSteps++;
    const stepDiv = document.createElement('div');
    stepDiv.className = 'flex items-start gap-2 mb-2 p-2 bg-blue-900/10 border border-blue-500/20 rounded animate-fade-in text-blue-300';
    stepDiv.innerHTML = `
        <span class="text-blue-500 font-bold">[${currentTaskSteps}]</span>
        <span class="flex-grow">${msg}</span>
        <i class="fa-solid fa-check text-green-500 mt-1 opacity-50"></i>
    `;
    reasoningOutput.appendChild(stepDiv);
    scrollReasoningToBottom();
});

socket.on('agent_response', (msg) => {
    appendLog(`[Síntesis Completada]:\n${msg}`, 'success');

    // Agregar un paso final al panel de razonamiento
    const stepDiv = document.createElement('div');
    stepDiv.className = 'flex items-start gap-2 mt-4 p-2 bg-green-900/20 border border-green-500/50 rounded text-green-400';
    stepDiv.innerHTML = `
        <i class="fa-solid fa-flag-checkered mt-1 text-yellow-500"></i>
        <span class="flex-grow font-bold">Proceso Finalizado. Síntesis enviada al canal de origen.</span>
    `;
    reasoningOutput.appendChild(stepDiv);
    scrollReasoningToBottom();
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