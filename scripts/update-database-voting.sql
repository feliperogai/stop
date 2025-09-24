-- Script para atualizar o banco de dados com as funcionalidades de votação
-- Execute este script para adicionar as tabelas e campos necessários

-- Adicionar campos de votação à tabela player_answers se não existirem
DO $$ 
BEGIN
    -- Adicionar campo player_name se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'player_answers' AND column_name = 'player_name') THEN
        ALTER TABLE player_answers ADD COLUMN player_name VARCHAR(100);
    END IF;
    
    -- Adicionar campo votes_for se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'player_answers' AND column_name = 'votes_for') THEN
        ALTER TABLE player_answers ADD COLUMN votes_for INTEGER DEFAULT 0;
    END IF;
    
    -- Adicionar campo votes_against se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'player_answers' AND column_name = 'votes_against') THEN
        ALTER TABLE player_answers ADD COLUMN votes_against INTEGER DEFAULT 0;
    END IF;
    
    -- Modificar campo is_valid para permitir NULL
    ALTER TABLE player_answers ALTER COLUMN is_valid DROP NOT NULL;
END $$;

-- Criar tabela answer_votes se não existir
CREATE TABLE IF NOT EXISTS answer_votes (
    id SERIAL PRIMARY KEY,
    answer_id INTEGER REFERENCES player_answers(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL,
    is_valid BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(answer_id, player_id)
);

-- Atualizar player_name nas respostas existentes baseado no player_id
UPDATE player_answers 
SET player_name = p.name 
FROM players p 
WHERE player_answers.player_id = p.id 
AND player_answers.player_name IS NULL;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_answer_votes_answer_id ON answer_votes(answer_id);
CREATE INDEX IF NOT EXISTS idx_answer_votes_player_id ON answer_votes(player_id);
CREATE INDEX IF NOT EXISTS idx_player_answers_round_id ON player_answers(round_id);
CREATE INDEX IF NOT EXISTS idx_player_answers_player_name ON player_answers(player_name);
