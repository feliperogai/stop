// Script para debugar as rodadas e pontos
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_CJ6jebqDYvh2@ep-snowy-cloud-aewcfcwx-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: {
    rejectUnauthorized: false
  }
})

async function debugRounds() {
  const client = await pool.connect()
  try {
    // Buscar jogos ativos
    const gamesResult = await client.query(`
      SELECT id, current_round, max_rounds, status 
      FROM games 
      WHERE status IN ('waiting', 'playing', 'scoring', 'finished') 
      ORDER BY id DESC 
      LIMIT 5
    `)
    
    console.log('Jogos encontrados:')
    gamesResult.rows.forEach(game => {
      console.log(`Jogo ${game.id}: Rodada ${game.current_round}/${game.max_rounds}, Status: ${game.status}`)
    })
    
    // Buscar rodadas de um jogo específico
    const gameId = gamesResult.rows[0]?.id
    if (gameId) {
      console.log(`\nRodadas do jogo ${gameId}:`)
      const roundsResult = await client.query(`
        SELECT id, round_number, letter, status, start_time, end_time
        FROM rounds 
        WHERE game_id = $1 
        ORDER BY round_number
      `, [gameId])
      
      roundsResult.rows.forEach(round => {
        console.log(`Rodada ${round.round_number}: ${round.letter}, Status: ${round.status}, Início: ${round.start_time}`)
      })
      
      // Verificar pontos dos jogadores
      console.log(`\nPontuações dos jogadores no jogo ${gameId}:`)
      const scoresResult = await client.query(`
        SELECT gp.player_name, gp.total_score, 
               COUNT(pa.id) as total_answers,
               SUM(pa.points) as round_points
        FROM game_participants gp
        LEFT JOIN player_answers pa ON gp.player_id = pa.player_id 
          AND pa.round_id IN (SELECT id FROM rounds WHERE game_id = $1)
        WHERE gp.game_id = $1
        GROUP BY gp.player_id, gp.player_name, gp.total_score
        ORDER BY gp.total_score DESC
      `, [gameId])
      
      scoresResult.rows.forEach(score => {
        console.log(`${score.player_name}: ${score.total_score} pts total, ${score.round_points || 0} pts nas rodadas`)
      })
    }
    
  } catch (error) {
    console.error('Erro:', error)
  } finally {
    client.release()
    await pool.end()
  }
}

debugRounds()
