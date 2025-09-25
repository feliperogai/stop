import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

// Configuração do banco de dados Neon PostgreSQL para Vercel
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_CJ6jebqDYvh2@ep-snowy-cloud-aewcfcwx-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: {
    rejectUnauthorized: false
  },
  // Configurações otimizadas para Vercel
  max: 20, // máximo de conexões no pool
  idleTimeoutMillis: 30000, // tempo limite para conexões idle
  connectionTimeoutMillis: 2000, // tempo limite para conexão
})

// Função para executar queries
async function query(text: string, params?: any[]) {
  const client = await pool.connect()
  try {
    const result = await client.query(text, params)
    return result
  } finally {
    client.release()
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, params } = await request.json()

    switch (action) {
      case 'createPlayer':
        const playerResult = await query(
          'INSERT INTO players (name, session_id) VALUES ($1, $2) RETURNING *',
          [params.name, params.sessionId]
        )
        return NextResponse.json({ success: true, data: playerResult.rows[0] })

      case 'getPlayer':
        const getPlayerResult = await query('SELECT * FROM players WHERE id = $1', [params.id])
        return NextResponse.json({ success: true, data: getPlayerResult.rows[0] || null })

      case 'getPlayerBySessionId':
        const sessionResult = await query('SELECT * FROM players WHERE session_id = $1', [params.sessionId])
        return NextResponse.json({ success: true, data: sessionResult.rows[0] || null })

      case 'createGameRoom':
        const roomResult = await query(
          'INSERT INTO game_rooms (room_code, name, max_players, created_by_session_id) VALUES ($1, $2, $3, $4) RETURNING *',
          [params.roomCode, params.name, params.maxPlayers, params.createdBySessionId]
        )
        return NextResponse.json({ success: true, data: roomResult.rows[0] })

      case 'getGameRoom':
        const getRoomResult = await query(`
          SELECT 
            gr.*,
            g.id as game_id,
            g.status as game_status
          FROM game_rooms gr
          LEFT JOIN games g ON gr.id = g.room_id AND g.status IN ('playing', 'scoring')
          WHERE gr.room_code = $1
        `, [params.roomCode])
        
        const roomData = getRoomResult.rows[0]
        if (roomData && roomData.game_status) {
          // Se há uma partida ativa, atualizar o status da sala
          roomData.status = roomData.game_status
        }
        
        console.log('getGameRoom - Dados retornados:', { 
          roomCode: params.roomCode, 
          roomData: roomData ? { 
            id: roomData.id, 
            status: roomData.status, 
            game_id: roomData.game_id, 
            game_status: roomData.game_status 
          } : null 
        })
        
        return NextResponse.json({ success: true, data: roomData || null })

      case 'joinGameRoom':
        // Primeiro, adicionar o jogador à sala
        const joinResult = await query(
          'UPDATE game_rooms SET current_players = current_players + 1 WHERE room_code = $1 AND current_players < max_players RETURNING *',
          [params.roomCode]
        )
        
        if (joinResult.rows.length === 0) {
          return NextResponse.json({ success: false, error: 'Sala cheia ou não encontrada' })
        }
        
        // Adicionar o jogador à lista de participantes da sala
        await query(
          'INSERT INTO room_participants (room_id, player_id, player_name, joined_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) ON CONFLICT (room_id, player_id) DO NOTHING',
          [joinResult.rows[0].id, params.playerId, params.playerName]
        )
        
        return NextResponse.json({ success: true, data: joinResult.rows[0] })

      case 'createGame':
        console.log('Criando partida para room:', params.roomId, 'maxRounds:', params.maxRounds)
        
        const gameResult = await query(
          'INSERT INTO games (room_id, max_rounds, round_duration) VALUES ($1, $2, $3) RETURNING *',
          [params.roomId, params.maxRounds, 60]
        )
        
        const game = gameResult.rows[0]
        console.log('Partida criada:', game)
        
        // Adicionar categorias padrão à partida
        const categoriesResult = await query('SELECT * FROM categories WHERE is_active = true ORDER BY id')
        console.log('Categorias encontradas:', categoriesResult.rows.length)
        console.log('Categorias:', categoriesResult.rows.map(c => ({ id: c.id, name: c.name })))
        
        if (categoriesResult.rows.length === 0) {
          console.log('Nenhuma categoria encontrada, inserindo categorias padrão...')
          // Inserir categorias padrão se não existirem
          const defaultCategories = [
            { name: 'Nome', description: 'Nome próprio de pessoa' },
            { name: 'Animal', description: 'Nome de animal' },
            { name: 'Objeto', description: 'Objeto ou coisa' },
            { name: 'Comida', description: 'Alimento ou bebida' },
            { name: 'Lugar', description: 'Local, cidade, país, etc.' },
            { name: 'Profissão', description: 'Ocupação ou trabalho' },
            { name: 'Cor', description: 'Nome de cor' },
            { name: 'Marca', description: 'Marca comercial' },
            { name: 'Meu Chefe é', description: 'Características ou descrições de chefe' }
          ]
          
          for (let i = 0; i < defaultCategories.length; i++) {
            const catResult = await query(
              'INSERT INTO categories (name, description, is_active) VALUES ($1, $2, $3) RETURNING id',
              [defaultCategories[i].name, defaultCategories[i].description, true]
            )
            await query(
              'INSERT INTO game_categories (game_id, category_id, position) VALUES ($1, $2, $3)',
              [game.id, catResult.rows[0].id, i + 1]
            )
          }
        } else {
          // Usar todas as categorias ativas disponíveis
          const categoriesToUse = categoriesResult.rows
          for (let i = 0; i < categoriesToUse.length; i++) {
            console.log(`Inserindo categoria ${i + 1}:`, categoriesToUse[i].name, "ID:", categoriesToUse[i].id)
            await query(
              'INSERT INTO game_categories (game_id, category_id, position) VALUES ($1, $2, $3)',
              [game.id, categoriesToUse[i].id, i + 1]
            )
          }
        }
        
        // Criar a primeira rodada automaticamente
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        const randomLetter = letters[Math.floor(Math.random() * letters.length)]
        console.log('Criando primeira rodada com letra:', randomLetter)
        
        const firstRoundResult = await query(
          'INSERT INTO rounds (game_id, round_number, letter, duration, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [game.id, 1, randomLetter, 60, 'waiting']
        )
        
        console.log('Primeira rodada criada:', firstRoundResult.rows[0])
        
        // Atualizar status da sala para "playing"
        await query('UPDATE game_rooms SET status = $1 WHERE id = $2', ['playing', params.roomId])
        console.log('Status da sala atualizado para playing')
        
        return NextResponse.json({ success: true, data: game })

      case 'getGame':
        console.log('Buscando jogo com ID:', params.id)
        const getGameResult = await query('SELECT * FROM games WHERE id = $1', [params.id])
        const foundGame = getGameResult.rows[0] || null
        console.log('Jogo encontrado:', foundGame ? { id: foundGame.id, status: foundGame.status, room_id: foundGame.room_id } : null)
        return NextResponse.json({ success: true, data: foundGame })

      case 'updateGameStatus':
        await query('UPDATE games SET status = $1 WHERE id = $2', [params.status, params.gameId])
        return NextResponse.json({ success: true })

      case 'addGameParticipant':
        const participantResult = await query(
          'INSERT INTO game_participants (game_id, player_id, player_name) VALUES ($1, $2, $3) RETURNING *',
          [params.gameId, params.playerId, params.playerName]
        )
        return NextResponse.json({ success: true, data: participantResult.rows[0] })

      case 'getGameParticipants':
        const participantsResult = await query('SELECT * FROM game_participants WHERE game_id = $1 ORDER BY joined_at', [params.gameId])
        return NextResponse.json({ success: true, data: participantsResult.rows })

      case 'getRoomParticipants':
        const roomParticipantsResult = await query(
          'SELECT * FROM room_participants WHERE room_id = $1 ORDER BY joined_at',
          [params.roomId]
        )
        return NextResponse.json({ success: true, data: roomParticipantsResult.rows })

      case 'addRoomParticipant':
        const addRoomParticipantResult = await query(
          'INSERT INTO room_participants (room_id, player_id, player_name, joined_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) ON CONFLICT (room_id, player_id) DO NOTHING RETURNING *',
          [params.roomId, params.playerId, params.playerName]
        )
        return NextResponse.json({ success: true, data: addRoomParticipantResult.rows[0] })

      case 'updateRoomParticipantReady':
        const updateReadyResult = await query(
          'UPDATE room_participants SET is_ready = $1 WHERE room_id = $2 AND player_id = $3 RETURNING *',
          [params.isReady, params.roomId, params.playerId]
        )
        return NextResponse.json({ success: true, data: updateReadyResult.rows[0] })

      case 'removeRoomParticipant':
        // Primeiro, remover o participante da tabela room_participants
        await query(
          'DELETE FROM room_participants WHERE room_id = $1 AND player_id = $2',
          [params.roomId, params.playerId]
        )
        
        // Depois, decrementar o contador de jogadores na sala
        await query(
          'UPDATE game_rooms SET current_players = current_players - 1 WHERE id = $1 AND current_players > 0',
          [params.roomId]
        )
        
        return NextResponse.json({ success: true })

      case 'updatePlayerStopStatus':
        await query(
          'UPDATE game_participants SET has_stopped = $1, stopped_at = $2 WHERE game_id = $3 AND player_id = $4',
          [params.hasStopped, params.hasStopped ? new Date() : null, params.gameId, params.playerId]
        )
        return NextResponse.json({ success: true })


      case 'startRound':
        await query('UPDATE rounds SET status = $1, start_time = $2 WHERE id = $3', ['playing', new Date(), params.roundId])
        
        // Atualizar status do jogo para "playing" quando a primeira rodada iniciar
        await query('UPDATE games SET status = $1 WHERE id = (SELECT game_id FROM rounds WHERE id = $2)', ['playing', params.roundId])
        
        // Atualizar status da sala para "playing" também
        await query('UPDATE game_rooms SET status = $1 WHERE id = (SELECT room_id FROM games WHERE id = (SELECT game_id FROM rounds WHERE id = $2))', ['playing', params.roundId])
        
        return NextResponse.json({ success: true })

      case 'endRound':
        await query('UPDATE rounds SET status = $1, end_time = $2 WHERE id = $3', ['scoring', new Date(), params.roundId])
        return NextResponse.json({ success: true })

      case 'getCurrentRound':
        console.log('Buscando rodada atual para gameId:', params.gameId)
        const currentRoundResult = await query(
          'SELECT * FROM rounds WHERE game_id = $1 ORDER BY round_number DESC LIMIT 1',
          [params.gameId]
        )
        const round = currentRoundResult.rows[0] || null
        console.log('Rodada atual encontrada:', round ? { id: round.id, status: round.status, letter: round.letter } : null)
        return NextResponse.json({ success: true, data: round })

      case 'savePlayerAnswer':
        console.log('Salvando resposta:', { roundId: params.roundId, playerId: params.playerId, playerName: params.playerName, categoryId: params.categoryId, answer: params.answer })
        
        const answerResult = await query(
          `INSERT INTO player_answers (round_id, player_id, player_name, category_id, answer) 
           VALUES ($1, $2, $3, $4, $5) 
           ON CONFLICT (round_id, player_id, category_id) 
           DO UPDATE SET answer = $5, submitted_at = CURRENT_TIMESTAMP 
           RETURNING *`,
          [params.roundId, params.playerId, params.playerName, params.categoryId, params.answer]
        )
        
        console.log('Resposta salva:', answerResult.rows[0])
        return NextResponse.json({ success: true, data: answerResult.rows[0] })

      case 'getRoundAnswers':
        const roundAnswersResult = await query('SELECT * FROM player_answers WHERE round_id = $1', [params.roundId])
        return NextResponse.json({ success: true, data: roundAnswersResult.rows })

      case 'getGameCategories':
        const gameCategoriesResult = await query(
          `SELECT c.*, gc.position 
           FROM categories c 
           JOIN game_categories gc ON c.id = gc.category_id 
           WHERE gc.game_id = $1 
           ORDER BY gc.position`,
          [params.gameId]
        )
        return NextResponse.json({ success: true, data: gameCategoriesResult.rows })

      case 'getGameStats':
        const statsResult = await query(
          `SELECT 
             COUNT(gp.id) as total_players,
             SUM(CASE WHEN gp.has_stopped THEN 1 ELSE 0 END) as stopped_players,
             g.current_round,
             g.max_rounds,
             g.status as game_status
           FROM games g
           LEFT JOIN game_participants gp ON g.id = gp.game_id
           WHERE g.id = $1
           GROUP BY g.id, g.current_round, g.max_rounds, g.status`,
          [params.gameId]
        )
        
        const row = statsResult.rows[0]
        const stats = {
          totalPlayers: parseInt(row?.total_players) || 0,
          stoppedPlayers: parseInt(row?.stopped_players) || 0,
          currentRound: row?.current_round || 0,
          maxRounds: row?.max_rounds || 0,
          gameStatus: row?.game_status || 'waiting'
        }
        return NextResponse.json({ success: true, data: stats })

      case 'checkAllPlayersStopped':
        const checkResult = await query(
          'SELECT COUNT(*) as total, SUM(CASE WHEN has_stopped THEN 1 ELSE 0 END) as stopped FROM game_participants WHERE game_id = $1',
          [params.gameId]
        )
        const { total, stopped } = checkResult.rows[0]
        const allStopped = parseInt(total) === parseInt(stopped)
        return NextResponse.json({ success: true, data: allStopped })

      case 'evaluateAnswer':
        const evalResult = await query(
          `INSERT INTO answer_evaluations (player_answer_id, evaluator_player_id, is_valid, evaluation_reason) 
           VALUES ($1, $2, $3, $4) 
           ON CONFLICT (player_answer_id, evaluator_player_id) 
           DO UPDATE SET is_valid = $3, evaluation_reason = $4, evaluated_at = CURRENT_TIMESTAMP 
           RETURNING *`,
          [params.playerAnswerId, params.evaluatorPlayerId, params.isValid, params.reason]
        )
        return NextResponse.json({ success: true, data: evalResult.rows[0] })

      case 'getAnswerEvaluations':
        const evaluationsResult = await query('SELECT * FROM answer_evaluations WHERE player_answer_id = $1', [params.playerAnswerId])
        return NextResponse.json({ success: true, data: evaluationsResult.rows })

      case 'saveRoundScore':
        const scoreResult = await query(
          `INSERT INTO round_scores (round_id, player_id, base_points, bonus_points, total_points, position) 
           VALUES ($1, $2, $3, $4, $5, $6) 
           ON CONFLICT (round_id, player_id) 
           DO UPDATE SET base_points = $3, bonus_points = $4, total_points = $5, position = $6 
           RETURNING *`,
          [params.roundId, params.playerId, params.basePoints, params.bonusPoints, params.basePoints + params.bonusPoints, params.position]
        )
        return NextResponse.json({ success: true, data: scoreResult.rows[0] })

      case 'updatePlayerScore':
        await query(
          'UPDATE game_participants SET total_score = $1 WHERE game_id = $2 AND player_id = $3',
          [params.score, params.gameId, params.playerId]
        )
        return NextResponse.json({ success: true })

      case 'cleanupExpiredData':
        await query('SELECT cleanup_expired_data()')
        return NextResponse.json({ success: true })

      case 'testCategories':
        const testCategoriesResult = await query('SELECT * FROM categories WHERE is_active = true ORDER BY id')
        return NextResponse.json({ success: true, data: testCategoriesResult.rows })

      case 'cleanupDuplicateCategories':
        // Limpar categorias duplicadas, mantendo apenas as primeiras 8
        await query('DELETE FROM categories WHERE id > 8')
        await query('DELETE FROM game_categories WHERE category_id > 8')
        return NextResponse.json({ success: true })

      case 'forceCleanupCategories':
        // Limpeza forçada - deletar todas as categorias e recriar apenas 8
        await query('DELETE FROM game_categories')
        await query('DELETE FROM categories')
        
        const defaultCategories = [
          { name: 'Nome', description: 'Nome próprio de pessoa' },
          { name: 'Animal', description: 'Nome de animal' },
          { name: 'Objeto', description: 'Objeto ou coisa' },
          { name: 'Comida', description: 'Alimento ou bebida' },
          { name: 'Lugar', description: 'Local, cidade, país, etc.' },
          { name: 'Profissão', description: 'Ocupação ou trabalho' },
          { name: 'Cor', description: 'Nome de cor' },
          { name: 'Marca', description: 'Marca comercial' },
          { name: 'Meu Chefe é', description: 'Características ou descrições de chefe' }
        ]
        
        for (let i = 0; i < defaultCategories.length; i++) {
          await query(
            'INSERT INTO categories (name, description, is_active) VALUES ($1, $2, $3)',
            [defaultCategories[i].name, defaultCategories[i].description, true]
          )
        }
        
        return NextResponse.json({ success: true })

      case 'getPlayerAnswers':
        console.log('Buscando respostas para roundId:', params.roundId)
        
        // Primeiro, verificar se há respostas básicas
        const basicAnswersResult = await query(`
          SELECT 
            pa.id,
            pa.player_name,
            pa.category_id,
            pa.answer,
            pa.votes_for,
            pa.votes_against,
            pa.is_valid
          FROM player_answers pa
          WHERE pa.round_id = $1
          ORDER BY pa.category_id, pa.player_name
        `, [params.roundId])
        
        console.log('Respostas básicas encontradas:', basicAnswersResult.rows.length, basicAnswersResult.rows)
        
        // Se não há respostas básicas, retornar array vazio
        if (basicAnswersResult.rows.length === 0) {
          console.log('Nenhuma resposta encontrada para roundId:', params.roundId)
          return NextResponse.json({ success: true, data: [] })
        }
        
        // Se há respostas, buscar informações das categorias
        const answersResult = await query(`
          SELECT 
            pa.id,
            pa.player_name,
            c.name as category_name,
            pa.answer,
            pa.votes_for,
            pa.votes_against,
            pa.is_valid,
            gc.position
          FROM player_answers pa
          LEFT JOIN game_categories gc ON pa.category_id = gc.category_id AND gc.game_id = (SELECT game_id FROM rounds WHERE id = $1)
          LEFT JOIN categories c ON gc.category_id = c.id
          WHERE pa.round_id = $1
          ORDER BY COALESCE(gc.position, pa.category_id), pa.player_name
        `, [params.roundId])
        
        console.log('Respostas com categorias encontradas:', answersResult.rows.length, answersResult.rows)
        return NextResponse.json({ success: true, data: answersResult.rows })

      case 'voteOnAnswer':
        // Verificar se o jogador já votou nesta resposta
        const existingVote = await query(
          'SELECT id FROM answer_votes WHERE answer_id = $1 AND player_id = $2',
          [params.answerId, params.playerId]
        )
        
        if (existingVote.rows.length > 0) {
          return NextResponse.json({ success: false, error: 'Jogador já votou nesta resposta' })
        }
        
        // Inserir voto
        await query(
          'INSERT INTO answer_votes (answer_id, player_id, is_valid) VALUES ($1, $2, $3)',
          [params.answerId, params.playerId, params.isValid]
        )
        
        // Atualizar contadores de votos
        const voteCounts = await query(`
          SELECT 
            SUM(CASE WHEN is_valid = true THEN 1 ELSE 0 END) as votes_for,
            SUM(CASE WHEN is_valid = false THEN 1 ELSE 0 END) as votes_against
          FROM answer_votes 
          WHERE answer_id = $1
        `, [params.answerId])
        
        const { votes_for, votes_against } = voteCounts.rows[0]
        
        // Calcular pontuação baseada nas regras
        let points = 0
        const isValid = votes_for > votes_against
        
        if (isValid) {
          // Verificar se é duplicada
          const answerData = await query('SELECT is_duplicate FROM player_answers WHERE id = $1', [params.answerId])
          const isDuplicate = answerData.rows[0]?.is_duplicate || false
          
          if (isDuplicate) {
            points = 5 // Resposta duplicada válida
          } else {
            // Verificar se é única na categoria
            const categoryData = await query(`
              SELECT COUNT(*) as total_answers
              FROM player_answers pa
              WHERE pa.category_id = (SELECT category_id FROM player_answers WHERE id = $1)
                AND pa.round_id = (SELECT round_id FROM player_answers WHERE id = $1)
                AND pa.is_valid = true
            `, [params.answerId])
            
            const totalAnswers = parseInt(categoryData.rows[0].total_answers)
            if (totalAnswers === 1) {
              points = 20 // Resposta única válida
            } else {
              points = 10 // Resposta normal válida
            }
          }
        }
        
        await query(
          'UPDATE player_answers SET votes_for = $1, votes_against = $2, is_valid = $3, points = $4 WHERE id = $5',
          [votes_for, votes_against, isValid, points, params.answerId]
        )
        
        // Verificar se todos votaram nesta resposta
        const totalVotes = await query(
          'SELECT COUNT(*) as total FROM answer_votes WHERE answer_id = $1',
          [params.answerId]
        )
        
        const totalPlayers = await query(`
          SELECT COUNT(*) as total FROM game_participants gp
          JOIN player_answers pa ON gp.player_name = pa.player_name
          WHERE pa.id = $1
        `, [params.answerId])
        
        if (parseInt(totalVotes.rows[0].total) >= parseInt(totalPlayers.rows[0].total)) {
          // Todos votaram, determinar resultado final
          const finalIsValid = votes_for > votes_against
          await query(
            'UPDATE player_answers SET is_valid = $1 WHERE id = $2',
            [finalIsValid, params.answerId]
          )
        }
        
        return NextResponse.json({ success: true })

      case 'getVotingResults':
        const resultsResult = await query(`
          SELECT 
            pa.id,
            pa.player_name,
            c.name as category_name,
            pa.answer,
            pa.votes_for,
            pa.votes_against,
            pa.is_valid
          FROM player_answers pa
          JOIN game_categories gc ON pa.category_id = gc.category_id
          JOIN categories c ON gc.category_id = c.id
          WHERE pa.round_id = $1
          ORDER BY gc.position, pa.player_name
        `, [params.roundId])
        return NextResponse.json({ success: true, data: resultsResult.rows })

      case 'stopGameForAll':
        // Parar o jogo para todos os jogadores
        await query('UPDATE game_participants SET has_stopped = true WHERE game_id = $1', [params.gameId])
        await query('UPDATE rounds SET status = $1 WHERE game_id = $2 AND status = $3', ['scoring', params.gameId, 'playing'])
        await query('UPDATE games SET status = $1 WHERE id = $2', ['scoring', params.gameId])
        
        // Atualizar status da sala também
        await query('UPDATE game_rooms SET status = $1 WHERE id = (SELECT room_id FROM games WHERE id = $2)', ['scoring', params.gameId])
        
        return NextResponse.json({ success: true })

      case 'markPlayerReadyForNextCategory':
        console.log('Marcando jogador como pronto:', { gameId: params.gameId, playerId: params.playerId, categoryIndex: params.categoryIndex })
        
        // Marcar jogador como pronto para próxima categoria
        const markResult = await query(`
          INSERT INTO category_votes (game_id, player_id, category_index, is_ready) 
          VALUES ($1, $2, $3, true) 
          ON CONFLICT (game_id, player_id, category_index) 
          DO UPDATE SET is_ready = true, updated_at = CURRENT_TIMESTAMP
          RETURNING *
        `, [params.gameId, params.playerId, params.categoryIndex])
        
        console.log('Jogador marcado como pronto:', markResult.rows[0])
        
        return NextResponse.json({ success: true })

      case 'getPlayersReadyForCategory':
        console.log('Buscando jogadores prontos para categoria:', { gameId: params.gameId, categoryIndex: params.categoryIndex })
        
        // Buscar jogadores prontos para categoria
        const readyPlayersResult = await query(`
          SELECT 
            gp.player_id, 
            gp.player_name, 
            COALESCE(cv.is_ready, false) as is_ready
          FROM game_participants gp
          LEFT JOIN category_votes cv ON gp.player_id = cv.player_id AND cv.game_id = $1 AND cv.category_index = $2
          WHERE gp.game_id = $1
          ORDER BY gp.player_name
        `, [params.gameId, params.categoryIndex])
        
        console.log('Jogadores encontrados:', readyPlayersResult.rows)
        
        return NextResponse.json({ success: true, data: readyPlayersResult.rows })

      case 'createRound':
        console.log('Criando nova rodada:', { gameId: params.gameId, roundNumber: params.roundNumber })
        
        // Gerar letra aleatória
        const newLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        const newRandomLetter = newLetters[Math.floor(Math.random() * newLetters.length)]
        
        const newRoundResult = await query(`
          INSERT INTO rounds (game_id, round_number, letter, status) 
          VALUES ($1, $2, $3, 'waiting') 
          RETURNING *
        `, [params.gameId, params.roundNumber, newRandomLetter])
        
        // Atualizar current_round no jogo
        await query('UPDATE games SET current_round = $1 WHERE id = $2', [params.roundNumber, params.gameId])
        
        console.log('Nova rodada criada:', newRoundResult.rows[0])
        return NextResponse.json({ success: true, data: newRoundResult.rows[0] })

      case 'updateGameStatus':
        console.log('Atualizando status do jogo:', { gameId: params.gameId, status: params.status })
        await query('UPDATE games SET status = $1 WHERE id = $2', [params.status, params.gameId])
        return NextResponse.json({ success: true })

      case 'updateRoomStatus':
        console.log('Atualizando status da sala:', { roomCode: params.roomCode, status: params.status })
        await query('UPDATE game_rooms SET status = $1 WHERE room_code = $2', [params.status, params.roomCode])
        return NextResponse.json({ success: true })

      case 'finalizeGame':
        console.log('Finalizando jogo:', { gameId: params.gameId })
        
        // Atualizar status do jogo para 'finished'
        await query('UPDATE games SET status = $1 WHERE id = $2', ['finished', params.gameId])
        
        // Atualizar status da sala para 'finished'
        await query('UPDATE game_rooms SET status = $1 WHERE id = (SELECT room_id FROM games WHERE id = $2)', ['finished', params.gameId])
        
        // Calcular pontuação final
        const finalScoresResult = await query(`
          SELECT 
            gp.player_id,
            gp.player_name,
            COALESCE(SUM(pa.points), 0) as total_points
          FROM game_participants gp
          LEFT JOIN player_answers pa ON gp.player_id = pa.player_id 
            AND pa.round_id IN (SELECT id FROM rounds WHERE game_id = $1)
          WHERE gp.game_id = $1
          GROUP BY gp.player_id, gp.player_name
          ORDER BY total_points DESC
        `, [params.gameId])
        
        console.log('Pontuação final:', finalScoresResult.rows)
        return NextResponse.json({ success: true, data: finalScoresResult.rows })

      case 'getGameResults':
        console.log('Buscando resultados do jogo:', { gameId: params.gameId })
        
        const gameResultsResult = await query(`
          SELECT 
            gp.player_id,
            gp.player_name,
            COALESCE(SUM(pa.points), 0) as total_points,
            COUNT(pa.id) as total_answers,
            COUNT(CASE WHEN pa.is_valid = true THEN 1 END) as valid_answers,
            COUNT(CASE WHEN pa.is_valid = false THEN 1 END) as invalid_answers
          FROM game_participants gp
          LEFT JOIN player_answers pa ON gp.player_id = pa.player_id 
            AND pa.round_id IN (SELECT id FROM rounds WHERE game_id = $1)
          WHERE gp.game_id = $1
          GROUP BY gp.player_id, gp.player_name
          ORDER BY total_points DESC
        `, [params.gameId])
        
        console.log('Resultados do jogo:', gameResultsResult.rows)
        return NextResponse.json({ success: true, data: gameResultsResult.rows })

      case 'markAnswerAsDuplicate':
        console.log('Marcando resposta como duplicada:', { answerId: params.answerId, playerId: params.playerId })
        
        // Marcar resposta como duplicada
        await query('UPDATE player_answers SET is_duplicate = true WHERE id = $1', [params.answerId])
        
        // Recalcular pontuação baseada nas regras
        const answerData = await query('SELECT is_valid FROM player_answers WHERE id = $1', [params.answerId])
        const answerIsValid = answerData.rows[0]?.is_valid || false
        
        let duplicatePoints = 0
        if (answerIsValid) {
          duplicatePoints = 5 // Resposta duplicada válida
        }
        
        await query('UPDATE player_answers SET points = $1 WHERE id = $2', [duplicatePoints, params.answerId])
        
        console.log('Resposta marcada como duplicada com sucesso, pontos:', duplicatePoints)
        return NextResponse.json({ success: true })

      case 'resetPlayersStopStatus':
        console.log('Resetando status de parada dos jogadores:', { gameId: params.gameId })
        
        // Resetar status de parada de todos os jogadores do jogo
        await query('UPDATE game_participants SET has_stopped = false, stopped_at = NULL WHERE game_id = $1', [params.gameId])
        
        console.log('Status de parada dos jogadores resetado com sucesso')
        return NextResponse.json({ success: true })

      default:
        return NextResponse.json({ success: false, error: 'Ação não encontrada' }, { status: 400 })
    }
  } catch (error) {
    console.error('Erro na API do banco de dados:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}
