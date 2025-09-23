-- Criação das tabelas para o jogo Stop com funcionalidades ao vivo
-- Este script cria a estrutura básica do banco de dados para partidas temporárias

-- Tabela de jogadores (temporária por partida)
CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    session_id VARCHAR(255) UNIQUE NOT NULL, -- ID da sessão do jogador
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de salas de jogo
CREATE TABLE IF NOT EXISTS game_rooms (
    id SERIAL PRIMARY KEY,
    room_code VARCHAR(6) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    max_players INTEGER DEFAULT 8,
    current_players INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'waiting', -- waiting, playing, finished
    created_by_session_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '2 hours') -- Auto-expira em 2 horas
);

-- Tabela de partidas (temporária)
CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES game_rooms(id) ON DELETE CASCADE,
    current_round INTEGER DEFAULT 1,
    max_rounds INTEGER DEFAULT 10, -- 10 rodadas por partida
    current_letter CHAR(1),
    round_start_time TIMESTAMP,
    round_duration INTEGER DEFAULT 60, -- em segundos
    status VARCHAR(20) DEFAULT 'waiting', -- waiting, playing, scoring, finished
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '2 hours') -- Auto-expira em 2 horas
);

-- Tabela de participantes da sala (antes da partida)
CREATE TABLE IF NOT EXISTS room_participants (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES game_rooms(id) ON DELETE CASCADE,
    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    player_name VARCHAR(100) NOT NULL,
    is_ready BOOLEAN DEFAULT false, -- Se o jogador está pronto para começar
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_id, player_id)
);

-- Tabela de participantes da partida
CREATE TABLE IF NOT EXISTS game_participants (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    player_name VARCHAR(100) NOT NULL,
    total_score INTEGER DEFAULT 0,
    has_stopped BOOLEAN DEFAULT false, -- Se o jogador apertou STOP
    stopped_at TIMESTAMP, -- Quando o jogador apertou STOP
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(game_id, player_id)
);

-- Tabela de categorias padrão
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de categorias por partida
CREATE TABLE IF NOT EXISTS game_categories (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id),
    position INTEGER NOT NULL,
    UNIQUE(game_id, category_id)
);

-- Tabela de rodadas
CREATE TABLE IF NOT EXISTS rounds (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    letter CHAR(1) NOT NULL,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration INTEGER DEFAULT 60,
    status VARCHAR(20) DEFAULT 'waiting', -- waiting, playing, scoring, finished
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(game_id, round_number)
);

-- Tabela de respostas dos jogadores
CREATE TABLE IF NOT EXISTS player_answers (
    id SERIAL PRIMARY KEY,
    round_id INTEGER REFERENCES rounds(id) ON DELETE CASCADE,
    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id),
    answer TEXT,
    is_valid BOOLEAN DEFAULT false,
    points INTEGER DEFAULT 0,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(round_id, player_id, category_id)
);

-- Tabela de avaliações de respostas pelos jogadores
CREATE TABLE IF NOT EXISTS answer_evaluations (
    id SERIAL PRIMARY KEY,
    player_answer_id INTEGER REFERENCES player_answers(id) ON DELETE CASCADE,
    evaluator_player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    is_valid BOOLEAN NOT NULL,
    evaluation_reason TEXT,
    evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(player_answer_id, evaluator_player_id)
);

-- Tabela de pontuações por rodada
CREATE TABLE IF NOT EXISTS round_scores (
    id SERIAL PRIMARY KEY,
    round_id INTEGER REFERENCES rounds(id) ON DELETE CASCADE,
    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    base_points INTEGER DEFAULT 0,
    bonus_points INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    position INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(round_id, player_id)
);

-- Tabela de histórico de partidas (temporária - será limpa após cada partida)
CREATE TABLE IF NOT EXISTS game_history (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    player_name VARCHAR(100) NOT NULL,
    final_score INTEGER NOT NULL,
    final_position INTEGER NOT NULL,
    rounds_played INTEGER NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_games_room_id ON games(room_id);
CREATE INDEX IF NOT EXISTS idx_game_participants_game_id ON game_participants(game_id);
CREATE INDEX IF NOT EXISTS idx_game_participants_player_id ON game_participants(player_id);
CREATE INDEX IF NOT EXISTS idx_rounds_game_id ON rounds(game_id);
CREATE INDEX IF NOT EXISTS idx_player_answers_round_id ON player_answers(round_id);
CREATE INDEX IF NOT EXISTS idx_player_answers_player_id ON player_answers(player_id);
CREATE INDEX IF NOT EXISTS idx_round_scores_round_id ON round_scores(round_id);
CREATE INDEX IF NOT EXISTS idx_game_history_player_id ON game_history(player_id);
CREATE INDEX IF NOT EXISTS idx_answer_evaluations_player_answer_id ON answer_evaluations(player_answer_id);
CREATE INDEX IF NOT EXISTS idx_game_rooms_expires_at ON game_rooms(expires_at);
CREATE INDEX IF NOT EXISTS idx_games_expires_at ON games(expires_at);

-- Função para limpar dados expirados automaticamente
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS void AS $$
BEGIN
    -- Remove dados de salas expiradas
    DELETE FROM game_rooms WHERE expires_at < CURRENT_TIMESTAMP;
    
    -- Remove dados de partidas expiradas
    DELETE FROM games WHERE expires_at < CURRENT_TIMESTAMP;
    
    -- Remove jogadores órfãos (sem salas ou partidas)
    DELETE FROM players WHERE id NOT IN (
        SELECT DISTINCT player_id FROM game_participants
        UNION
        SELECT DISTINCT created_by_session_id::INTEGER FROM game_rooms WHERE created_by_session_id ~ '^[0-9]+$'
    );
END;
$$ LANGUAGE plpgsql;

-- Função para limpar dados de uma partida específica após o fim
CREATE OR REPLACE FUNCTION cleanup_game_data(game_id_param INTEGER)
RETURNS void AS $$
BEGIN
    -- Remove histórico da partida
    DELETE FROM game_history WHERE game_id = game_id_param;
    
    -- Remove pontuações das rodadas
    DELETE FROM round_scores WHERE round_id IN (
        SELECT id FROM rounds WHERE game_id = game_id_param
    );
    
    -- Remove avaliações de respostas
    DELETE FROM answer_evaluations WHERE player_answer_id IN (
        SELECT id FROM player_answers WHERE round_id IN (
            SELECT id FROM rounds WHERE game_id = game_id_param
        )
    );
    
    -- Remove respostas dos jogadores
    DELETE FROM player_answers WHERE round_id IN (
        SELECT id FROM rounds WHERE game_id = game_id_param
    );
    
    -- Remove rodadas
    DELETE FROM rounds WHERE game_id = game_id_param;
    
    -- Remove categorias da partida
    DELETE FROM game_categories WHERE game_id = game_id_param;
    
    -- Remove participantes
    DELETE FROM game_participants WHERE game_id = game_id_param;
    
    -- Remove a partida
    DELETE FROM games WHERE id = game_id_param;
END;
$$ LANGUAGE plpgsql;

-- Inserir categorias padrão
INSERT INTO categories (name, description) VALUES
('Nome', 'Nome próprio de pessoa'),
('Animal', 'Nome de animal'),
('Objeto', 'Objeto ou coisa'),
('Comida', 'Alimento ou bebida'),
('Lugar', 'Local, cidade, país, etc.'),
('Profissão', 'Ocupação ou trabalho'),
('Cor', 'Nome de cor'),
('Marca', 'Marca comercial')
ON CONFLICT DO NOTHING;
