#!/bin/bash
# install_android.sh - Script de instalación automatizada para Termux (Android)
# Diseñado para desplegar BABYLON.IA optimizado para bajos recursos (ej. Honor X6c).

echo "====================================================="
echo "  BABYLON.IA - INSTALACIÓN EN TERMUX (ANDROID)"
echo "====================================================="
echo "Optimizando entorno para dispositivos de bajos recursos..."

# 1. Actualizar repositorios e instalar dependencias base
echo "[1/4] Actualizando repositorios y paquetes base..."
pkg update -y && pkg upgrade -y
pkg install -y nodejs git chromium

# 2. Configurar variables de entorno para Puppeteer
# Evitamos que instale el chromium predeterminado de puppeteer (que no sirve en Termux)
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_EXECUTABLE_PATH="/data/data/com.termux/files/usr/bin/chromium-browser"
export CHROME_BIN="/data/data/com.termux/files/usr/bin/chromium-browser"

echo "[2/4] Variables de entorno de Chromium configuradas."

# 3. Instalación de dependencias de Node.js
echo "[3/4] Instalando dependencias de Node.js..."
npm install

# 4. Enlazar CLI globalmente
echo "[4/4] Enlazando la CLI localmente..."
npm link

echo "====================================================="
echo " INSTALACIÓN COMPLETADA EXITOSAMENTE"
echo "====================================================="
echo "Para iniciar, usa los siguientes comandos:"
echo "1. babylonia onboard  -> Para configurar tu agente"
echo "2. babylonia gateway  -> Para arrancar el motor y conectar WhatsApp"
echo ""
echo "Recuerda tener tu Gemini CLI configurado previamente para el Auth-Bridge."
