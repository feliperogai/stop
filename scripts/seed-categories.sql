-- Inserção das categorias padrão do jogo Stop
-- Este script popula a tabela de categorias com as opções mais comuns

INSERT INTO categories (name, description) VALUES
('Nome', 'Nomes próprios de pessoas'),
('Animal', 'Qualquer tipo de animal'),
('Objeto', 'Objetos do dia a dia'),
('Comida', 'Alimentos e bebidas'),
('Lugar', 'Cidades, países, locais'),
('Profissão', 'Trabalhos e ocupações'),
('Cor', 'Cores e tonalidades'),
('Marca', 'Marcas comerciais'),
('Filme', 'Títulos de filmes'),
('Música', 'Títulos de músicas ou artistas'),
('Esporte', 'Modalidades esportivas'),
('Fruta', 'Frutas e vegetais'),
('Carro', 'Marcas e modelos de carros'),
('País', 'Países do mundo'),
('Cidade', 'Cidades brasileiras ou mundiais'),
('Personagem', 'Personagens de filmes, livros, etc.'),
('Instrumento', 'Instrumentos musicais'),
('Roupa', 'Peças de vestuário'),
('Brinquedo', 'Brinquedos e jogos'),
('Doença', 'Doenças e condições médicas')
ON CONFLICT (name) DO NOTHING;
