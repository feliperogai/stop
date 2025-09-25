-- Script para corrigir a tabela answer_votes adicionando a coluna is_duplicate
-- Execute este script no banco de dados para corrigir o erro

-- Adicionar coluna is_duplicate na tabela answer_votes
ALTER TABLE answer_votes 
ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT NULL;

-- Verificar se a coluna foi adicionada corretamente
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'answer_votes' 
ORDER BY ordinal_position;
