#!/usr/bin/env bash
# ELECTRO-COTAÇÃO PRO — build automático (Linux / macOS)
# Uso: ./build.sh
set -e
cd "$(dirname "$0")"

echo "============================================"
echo "  ELECTRO-COTAÇÃO PRO — Build automático"
echo "============================================"
echo

if ! command -v npm >/dev/null 2>&1; then
  echo "ERRO: o npm não foi encontrado."
  echo "Instale o Node.js (LTS) em https://nodejs.org"
  exit 1
fi

echo "[1/2] A instalar dependências (npm install)..."
npm install

echo
echo "[2/2] A gerar o build de produção (npm run build)..."
npm run build

echo
echo "============================================"
echo "  Concluído!"
echo "  O site está na pasta: ./dist"
echo "  Copie o CONTEÚDO de ./dist para o servidor"
echo "  (Laragon, Neocities, etc.)"
echo "============================================"
