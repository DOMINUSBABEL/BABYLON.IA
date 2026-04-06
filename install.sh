#!/bin/bash
# install.sh - Script de instalación universal para BABYLON.IA (Linux, macOS, Termux, iSH)

echo "====================================================="
echo "       BABYLON.IA - INSTALACIÓN UNIVERSAL            "
echo "====================================================="

# Detectar OS y Gestor de Paquetes
OS="$(uname -s)"
PKG_MANAGER=""

if command -v pkg &> /dev/null && [ -d "/data/data/com.termux" ]; then
    PKG_MANAGER="pkg"
    echo "Entorno detectado: Android (Termux)"
elif command -v apk &> /dev/null; then
    PKG_MANAGER="apk"
    echo "Entorno detectado: Alpine Linux / iSH (iOS)"
elif command -v apt-get &> /dev/null; then
    PKG_MANAGER="apt"
    echo "Entorno detectado: Debian / Ubuntu"
elif command -v brew &> /dev/null; then
    PKG_MANAGER="brew"
    echo "Entorno detectado: macOS (Homebrew)"
elif command -v dnf &> /dev/null; then
    PKG_MANAGER="dnf"
    echo "Entorno detectado: Fedora / RHEL"
elif command -v pacman &> /dev/null; then
    PKG_MANAGER="pacman"
    echo "Entorno detectado: Arch Linux"
else
    echo "Gestor de paquetes no detectado automáticamente."
    echo "Asegúrate de tener Node.js y Git instalados."
fi

# Instalar dependencias si tenemos gestor de paquetes
if [ -n "$PKG_MANAGER" ]; then
    echo "[1/4] Instalando dependencias base (Node.js, Git, Chromium)..."
    case $PKG_MANAGER in
        pkg)
            pkg update -y && pkg upgrade -y
            # Instalar NodeJS y Git independientemente para no bloquear si chromium falla
            pkg install -y nodejs git
            # Agregar repositorios necesarios para chromium en Termux
            pkg install -y x11-repo tur-repo || true
            pkg install -y chromium || echo "Advertencia: No se pudo instalar chromium directamente. Revisa los repositorios."
            hash -r # Recargar hash para asegurar que npm está en PATH
            ;;
        apk)
            apk update
            apk add nodejs npm git chromium
            ;;
        apt)
            sudo apt update
            sudo apt install -y nodejs npm git chromium-browser || sudo apt install -y nodejs npm git chromium
            ;;
        brew)
            brew update
            brew install node git chromium
            ;;
        dnf)
            sudo dnf check-update
            sudo dnf install -y nodejs npm git chromium
            ;;
        pacman)
            sudo pacman -Syu --noconfirm
            sudo pacman -S --noconfirm nodejs npm git chromium
            ;;
    esac
else
    echo "[1/4] Saltando instalación de paquetes del sistema..."
fi

# Clonar si no estamos en el directorio
if [ ! -f "package.json" ] || ! grep -q '"name": "babylon.ia"' package.json; then
    echo "[2/4] Clonando el repositorio BABYLON.IA..."
    if [ -d "BABYLON.IA" ]; then
        rm -rf BABYLON.IA
    fi
    git clone https://github.com/DOMINUSBABEL/BABYLON.IA.git
    cd BABYLON.IA || exit 1
else
    echo "[2/4] Repositorio detectado localmente."
fi

# Configurar Puppeteer en Termux / Entornos limitados
if [ "$PKG_MANAGER" = "pkg" ]; then
    export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
    export PUPPETEER_EXECUTABLE_PATH="/data/data/com.termux/files/usr/bin/chromium-browser"
    export CHROME_BIN="/data/data/com.termux/files/usr/bin/chromium-browser"
    echo "Variables de entorno configuradas para Termux."
elif [ "$PKG_MANAGER" = "apk" ]; then
    export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
    export PUPPETEER_EXECUTABLE_PATH="/usr/bin/chromium-browser"
    echo "Variables de entorno configuradas para Alpine/iSH."
elif [ "$PKG_MANAGER" = "apt" ]; then
    export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
    export PUPPETEER_EXECUTABLE_PATH="/usr/bin/chromium-browser"
fi

echo "[3/4] Instalando dependencias de Node.js (npm install)..."
npm install

echo "[4/4] Enlazando CLI globalmente (npm link)..."
if [ "$PKG_MANAGER" = "apt" ] || [ "$PKG_MANAGER" = "dnf" ] || [ "$PKG_MANAGER" = "pacman" ] || [ "$PKG_MANAGER" = "apk" ]; then
    sudo npm link 2>/dev/null || npm link
else
    npm link
fi

echo "====================================================="
echo " INSTALACIÓN COMPLETADA EXITOSAMENTE"
echo "====================================================="
echo "Para iniciar el agente:"
echo "1. babylonia onboard  -> Para configurar tu agente"
echo "2. babylonia gateway  -> Para arrancar el motor y conectar"
echo ""
echo "Recuerda tener tu Gemini CLI configurado previamente para el Auth-Bridge."
