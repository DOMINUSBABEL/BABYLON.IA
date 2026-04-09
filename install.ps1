<#
.SYNOPSIS
Script de instalacion de BABYLON.IA

.DESCRIPTION
Instala todas las dependencias necesarias de Node.js (incluyendo Puppeteer para WhatsApp-Web.js)
y verifica la conexion del ecosistema Geist.

.AUTHOR
Juan Esteban Gomez Bernal
#>

Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "         INICIANDO INSTALACION DE BABYLON.IA              " -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host ""

# Instalar Node.js y Git automaticamente si faltan (Windows 10/11)
$needRestart = $false

try {
    $nodeVersion = node -v
    Write-Host "OK: Node.js detectado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "WARNING: Node.js no esta instalado. Intentando instalar mediante winget..." -ForegroundColor Yellow
    try {
        winget install -e --id OpenJS.NodeJS
        Write-Host "OK: Node.js instalado. (Es posible que debas reiniciar tu terminal despues)" -ForegroundColor Green
        $needRestart = $true
    } catch {
        Write-Host "ERROR: No se pudo instalar Node.js automaticamente." -ForegroundColor Red
        Write-Host "Por favor, instala Node.js manualmente (https://nodejs.org/) y vuelve a intentar." -ForegroundColor Yellow
        exit 1
    }
}

try {
    $gitVersion = git --version
    Write-Host "OK: Git detectado: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "WARNING: Git no esta instalado. Intentando instalar mediante winget..." -ForegroundColor Yellow
    try {
        winget install -e --id Git.Git
        Write-Host "OK: Git instalado." -ForegroundColor Green
        $needRestart = $true
    } catch {
        Write-Host "ERROR: No se pudo instalar Git automaticamente. Es necesario para descargar el codigo." -ForegroundColor Red
        exit 1
    }
}

# Clonar el repo si no estamos dentro de el
if (-not (Test-Path "package.json") -or -not ((Get-Content "package.json" -Raw) -match '"name"\s*:\s*"babylonia"')) {
    $targetPath = Join-Path -Path $HOME -ChildPath "BABYLON.IA"
    Write-Host "INFO: No estas en el directorio de BABYLON.IA. Clonando en $targetPath ..." -ForegroundColor Cyan
    if (Test-Path $targetPath) {
        Remove-Item -Recurse -Force $targetPath
    }
    Set-Location $HOME
    git clone https://github.com/DOMINUSBABEL/BABYLON.IA.git
    Set-Location "BABYLON.IA"
}

Write-Host ""
Write-Host "Instalando dependencias de Node.js (npm install)..." -ForegroundColor Yellow
npm install

Write-Host ""
Write-Host "Enlazando CLI globalmente (npm link)..." -ForegroundColor Yellow
npm link

Write-Host ""
Write-Host "Verificando enlace de OAuth (Gemini CLI)..." -ForegroundColor Yellow
$oauthPath = Join-Path -Path $HOME -ChildPath ".gemini\oauth_creds.json"
if (Test-Path $oauthPath) {
    Write-Host "OK: Credenciales de Gemini CLI encontradas. Puente OAuth habilitado." -ForegroundColor Green
} else {
    Write-Host "WARNING: No se encontraron credenciales locales de Gemini CLI." -ForegroundColor DarkYellow
    Write-Host "Para que BABYLON.IA opere autonomamente, ejecuta 'gemini login' en tu terminal antes de iniciar." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "    INSTALACION COMPLETADA. EL AGENTE ESTA LISTO.         " -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para iniciar el agente:" -ForegroundColor White
Write-Host "1. babylonia onboard  -> Para configurar tu agente" -ForegroundColor Green
Write-Host "2. babylonia gateway  -> Para arrancar el motor y conectar" -ForegroundColor Green
if ($needRestart) {
    Write-Host ""
    Write-Host "IMPORTANTE: Se instalaron dependencias del sistema. Por favor, reinicia tu terminal antes de usar 'babylonia'." -ForegroundColor Red
}
