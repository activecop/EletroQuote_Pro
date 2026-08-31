@echo off
chcp 65001 >nul 2>&1
title Electro-Cotacao Pro - Build
echo ============================================
echo   ELECTRO-COTACAO PRO - Build automatico
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo ERRO: o Node.js nao esta instalado.
    echo Descarregue a versao LTS em https://nodejs.org
    pause
    exit /b 1
)

echo [1/2] A instalar dependencias (npm install)...
echo.
call npm install
if errorlevel 1 (
    echo.
    echo ERRO: o npm install falhou.
    pause
    exit /b 1
)

echo.
echo [2/2] A gerar o build de producao (npm run build)...
echo.
call npm run build
if errorlevel 1 (
    echo.
    echo ERRO: o build falhou. Verifique as mensagens acima.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   CONCLUIDO!
echo   O site esta na pasta: dist\
echo   Copie o CONTEUDO de dist\ para o servidor
echo   (Laragon, Neocities, etc.)
echo ============================================
pause
