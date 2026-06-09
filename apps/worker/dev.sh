#!/bin/bash
# Script de desenvolvimento do worker
# Carrega .env e executa com node --loader
cd "$(dirname "$0")"
export $(cat .env | grep -v '^#' | xargs)
cd ../..
node --import tsx/esm apps/worker/src/index.ts
