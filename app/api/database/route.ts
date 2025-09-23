import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

// Configuração do banco de dados Neon PostgreSQL para Vercel
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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
        const getRoomResult = await query('SELECT * FROM game_rooms WHERE room_code = $1', [params.roomCode])
        return NextResponse.json({ success: true, data: getRoomResult.rows[0] || null })

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
        const gameResult = await query(
          'INSERT INTO games (room_id, max_rounds, round_duration) VALUES ($1, $2, $3) RETURNING *',
          [params.roomId, params.maxRounds, 60]
        )
        
        const game = gameResult.rows[0]
        
        // Adicionar categorias padrão à partida
        const categoriesResult = await query('SELECT * FROM categories WHERE is_active = true ORDER BY id')
        for (let i = 0; i < categoriesResult.rows.length; i++) {
          await query(
            'INSERT INTO game_categories (game_id, category_id, position) VALUES ($1, $2, $3)',
            [game.id, categoriesResult.rows[i].id, i + 1]
          )
        }
        
        return NextResponse.json({ success: true, data: game })

      case 'getGame':
        const getGameResult = await query('SELECT * FROM games WHERE id = $1', [params.id])
        return NextResponse.json({ success: true, data: getGameResult.rows[0] || null })

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

      case 'updatePlayerStopStatus':
        await query(
          'UPDATE game_participants SET has_stopped = $1, stopped_at = $2 WHERE game_id = $3 AND player_id = $4',
          [params.hasStopped, params.hasStopped ? new Date() : null, params.gameId, params.playerId]
        )
        return NextResponse.json({ success: true })

      case 'createRound':
        const roundResult = await query(
          'INSERT INTO rounds (game_id, round_number, letter, duration) VALUES ($1, $2, $3, $4) RETURNING *',
          [params.gameId, params.roundNumber, params.letter, 60]
        )
        return NextResponse.json({ success: true, data: roundResult.rows[0] })

      case 'startRound':
        await query('UPDATE rounds SET status = $1, start_time = $2 WHERE id = $3', ['playing', new Date(), params.roundId])
        return NextResponse.json({ success: true })

      case 'endRound':
        await query('UPDATE rounds SET status = $1, end_time = $2 WHERE id = $3', ['scoring', new Date(), params.roundId])
        return NextResponse.json({ success: true })

      case 'getCurrentRound':
        const currentRoundResult = await query(
          'SELECT * FROM rounds WHERE game_id = $1 ORDER BY round_number DESC LIMIT 1',
          [params.gameId]
        )
        return NextResponse.json({ success: true, data: currentRoundResult.rows[0] || null })

      case 'savePlayerAnswer':
        const answerResult = await query(
          `INSERT INTO player_answers (round_id, player_id, category_id, answer) 
           VALUES ($1, $2, $3, $4) 
           ON CONFLICT (round_id, player_id, category_id) 
           DO UPDATE SET answer = $4, submitted_at = CURRENT_TIMESTAMP 
           RETURNING *`,
          [params.roundId, params.playerId, params.categoryId, params.answer]
        )
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

      default:
        return NextResponse.json({ success: false, error: 'Ação não encontrada' }, { status: 400 })
    }
  } catch (error) {
    console.error('Erro na API do banco de dados:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}
