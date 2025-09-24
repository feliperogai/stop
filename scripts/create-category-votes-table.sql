-- Criar tabela para controlar votação de categorias
CREATE TABLE IF NOT EXISTS category_votes (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL,
    category_index INTEGER NOT NULL,
    is_ready BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(game_id, player_id, category_index)
);
