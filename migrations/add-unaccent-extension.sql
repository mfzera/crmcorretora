-- Migration: Habilitar extensão unaccent
-- Data: 2026-04-30
-- Descrição: Habilita a extensão unaccent para suporte a busca sem acentos nos nomes de clientes

CREATE EXTENSION IF NOT EXISTS unaccent;
