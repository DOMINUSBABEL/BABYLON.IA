<#
.SYNOPSIS
Script de instalación de BABYLON.IA

.DESCRIPTION
Instala todas las dependencias necesarias de Node.js (incluyendo Puppeteer para WhatsApp-Web.js)
y verifica la conexión del ecosistema Geist.

.AUTHOR
Juan Esteban Gómez Bernal
#>

Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "         INICIANDO INSTALACIÓN DE BABYLON.IA              " -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar instalación de Node.js
try {
    $nodeVersion = node -v
    Write-Host "[OK] Node.js detectado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js no está instalado o no está en el PATH." -ForegroundColor Red
    Write-Host "Por favor, instala Node.js (https://nodejs.org/) y vuelve a intentar." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Instalando dependencias del motor (OpenClaw x Geist)..." -ForegroundColor Yellow
npm install

Write-Host ""
Write-Host "Verificando enlace de OAuth (Gemini CLI)..." -ForegroundColor Yellow
$oauthPath = Join-Path -Path $HOME -ChildPath ".gemini\oauth_creds.json"
if (Test-Path $oauthPath) {
    Write-Host "[OK] Credenciales de Gemini CLI encontradas. Puente OAuth habilitado." -ForegroundColor Green
} else {
    Write-Host "[WARNING] No se encontraron credenciales locales de Gemini CLI." -ForegroundColor DarkYellow
    Write-Host "Para que BABYLON.IA opere autónomamente, ejecuta 'gemini login' en tu terminal antes de iniciar." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "    INSTALACIÓN COMPLETADA. EL AGENTE ESTÁ LISTO.         " -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para lanzar el agente, ejecuta:" -ForegroundColor White
Write-Host ".\start.ps1" -ForegroundColor Green
