@echo off
chcp 65001 >nul
title Craftum Blocks — установка
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
if errorlevel 1 pause
