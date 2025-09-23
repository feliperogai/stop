# 🎯 Stop Game - Versão Online com Banco Neon

Um jogo Stop online em tempo real com funcionalidades avançadas, conectado ao banco de dados Neon PostgreSQL.

## ✨ Funcionalidades Implementadas

### 🏠 Sistema de Salas
- **Criação de salas** com código único de 6 caracteres
- **Entrada em salas** existentes via código
- **Lobby** com lista de jogadores em tempo real
- **Host** pode iniciar a partida quando todos estiverem prontos

### 🎮 Jogo ao Vivo
- **10 rodadas** por partida (conforme solicitado)
- **STOP individual** - cada jogador pode parar quando quiser
- **Tempo real** - atualizações automáticas a cada 2 segundos
- **8 categorias** padrão: Nome, Animal, Objeto, Comida, Lugar, Profissão, Cor, Marca

### 📊 Sistema de Avaliação
- **Avaliação pelos jogadores** - cada jogador avalia as respostas dos outros
- **Pontuação em tempo real** - pontos calculados automaticamente
- **Sistema de validação** - respostas devem começar com a letra sorteada

### 🧹 Limpeza Automática
- **Dados temporários** - salas e partidas expiram em 2 horas
- **Limpeza automática** - dados são removidos após o fim da partida
- **Sem histórico permanente** - conforme solicitado

## 🚀 Como Executar

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar Banco de Dados
```bash
npm run setup-db
```

### 3. Executar o Projeto
```bash
npm run dev
```

O projeto estará disponível em `http://localhost:3000`

## 🎯 Como Jogar

### 1. Criar ou Entrar em uma Sala
- **Criar sala**: Digite seu nome e nome da sala
- **Entrar em sala**: Digite seu nome e código da sala (6 caracteres)

### 2. Aguardar no Lobby
- Veja outros jogadores entrando
- Host pode iniciar quando houver pelo menos 2 jogadores

### 3. Jogar as Rodadas
- Cada rodada tem uma letra sorteada
- Preencha palavras que começam com essa letra para cada categoria
- Aperte **STOP** quando terminar (ou quando quiser parar)
- Aguarde todos os jogadores pararem

### 4. Avaliar Respostas
- Veja todas as respostas dos outros jogadores
- Marque como **Válida** (✓) ou **Inválida** (✗)
- Adicione motivo da avaliação (opcional)

### 5. Ver Pontuação
- Pontuação calculada automaticamente:
  - **10 pontos**: Resposta única (só você respondeu)
  - **5 pontos**: Resposta duplicada (outros também responderam)
  - **0 pontos**: Resposta inválida ou em branco
  - **5 pontos**: Bônus por completar todas as categorias

### 6. Próxima Rodada
- Após avaliação, próxima rodada inicia automaticamente
- Processo se repete por 10 rodadas

### 7. Fim da Partida
- Após 10 rodadas, vencedor é anunciado
- Dados são limpos automaticamente
- Opção de jogar novamente

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais
- `players` - Jogadores temporários (por sessão)
- `game_rooms` - Salas de jogo com códigos únicos
- `games` - Partidas temporárias (10 rodadas)
- `game_participants` - Participantes de cada partida
- `rounds` - Rodadas individuais
- `player_answers` - Respostas dos jogadores
- `answer_evaluations` - Avaliações das respostas
- `round_scores` - Pontuações por rodada
- `game_history` - Histórico temporário (limpo após partida)

### Funcionalidades Automáticas
- **Expiração**: Salas e partidas expiram em 2 horas
- **Limpeza**: Dados são removidos automaticamente
- **Índices**: Performance otimizada com índices
- **Cascata**: Deleção em cascata para manter consistência

## 🔧 Configuração Técnica

### Banco de Dados
- **Neon PostgreSQL** - Banco em nuvem
- **Conexão SSL** - Segura e confiável
- **Pool de conexões** - Performance otimizada

### Tecnologias
- **Next.js 14** - Framework React
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **Radix UI** - Componentes acessíveis
- **PostgreSQL** - Banco de dados
- **Node.js** - Runtime

## 📱 Interface Responsiva

- **Desktop** - Layout completo com sidebar
- **Tablet** - Layout adaptado
- **Mobile** - Interface otimizada para touch

## 🎨 Design

- **Tema moderno** - Gradientes e cores vibrantes
- **Animações** - Transições suaves
- **Feedback visual** - Estados claros para cada ação
- **Acessibilidade** - Componentes Radix UI

## 🔒 Segurança

- **Sessões temporárias** - Sem dados permanentes
- **Validação** - Respostas validadas pelos jogadores
- **Limpeza automática** - Dados removidos automaticamente
- **Conexão segura** - SSL obrigatório

## 🚀 Deploy

Para fazer deploy em produção:

1. Configure a variável `DATABASE_URL` no ambiente
2. Execute `npm run build`
3. Execute `npm start`

## 📝 Notas Importantes

- **Dados temporários**: Nenhum dado é armazenado permanentemente
- **Limpeza automática**: Sistema limpa dados expirados a cada 5 minutos
- **10 rodadas**: Cada partida tem exatamente 10 rodadas
- **STOP individual**: Cada jogador controla quando para
- **Avaliação coletiva**: Todos avaliam as respostas de todos

## 🎉 Pronto para Jogar!

O sistema está completamente funcional e pronto para uso. Crie uma sala, convide amigos e divirta-se jogando Stop online em tempo real!
