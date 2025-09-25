const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_CJ6jebqDYvh2@ep-snowy-cloud-aewcfcwx-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

async function fixPlayerScores() {
  const client = await pool.connect();
  try {
    console.log('🔧 Corrigindo pontuações dos jogadores...');
    
    // Buscar o jogo mais recente
    const gameResult = await client.query('SELECT id FROM games ORDER BY id DESC LIMIT 1');
    const gameId = gameResult.rows[0].id;
    
    console.log('🎮 Jogo encontrado:', gameId);
    
    // Buscar todos os participantes do jogo
    const participantsResult = await client.query(`
      SELECT player_id, player_name, total_score
      FROM game_participants 
      WHERE game_id = $1
    `, [gameId]);
    
    console.log('👥 Participantes encontrados:', participantsResult.rows.length);
    
    // Para cada participante, calcular e atualizar a pontuação total
    for (const participant of participantsResult.rows) {
      console.log(`\n🔍 Processando jogador: ${participant.player_name} (ID: ${participant.player_id})`);
      
      // Calcular pontuação total baseada nas respostas
      const totalScoreResult = await client.query(`
        SELECT COALESCE(SUM(pa.points), 0) as total_score
        FROM player_answers pa
        JOIN rounds r ON pa.round_id = r.id
        WHERE r.game_id = $1 AND pa.player_id = $2
      `, [gameId, participant.player_id]);
      
      const calculatedScore = parseInt(totalScoreResult.rows[0].total_score) || 0;
      const currentScore = participant.total_score || 0;
      
      console.log(`  - Pontuação atual: ${currentScore}`);
      console.log(`  - Pontuação calculada: ${calculatedScore}`);
      
      if (calculatedScore !== currentScore) {
        console.log(`  - Atualizando pontuação de ${currentScore} para ${calculatedScore}`);
        
        await client.query(`
          UPDATE game_participants 
          SET total_score = $1 
          WHERE game_id = $2 AND player_id = $3
        `, [calculatedScore, gameId, participant.player_id]);
        
        console.log(`  ✅ Pontuação atualizada com sucesso!`);
      } else {
        console.log(`  - Pontuação já está correta`);
      }
    }
    
    // Verificar resultado final
    const finalResult = await client.query(`
      SELECT 
        gp.player_id,
        gp.player_name,
        gp.total_score,
        COALESCE(SUM(pa.points), 0) as calculated_points
      FROM game_participants gp
      LEFT JOIN player_answers pa ON gp.player_id = pa.player_id 
        AND pa.round_id IN (SELECT id FROM rounds WHERE game_id = $1)
      WHERE gp.game_id = $1
      GROUP BY gp.player_id, gp.player_name, gp.total_score
      ORDER BY gp.total_score DESC
    `, [gameId]);
    
    console.log('\n📊 Pontuações finais:');
    finalResult.rows.forEach(player => {
      console.log(`  - ${player.player_name}: ${player.total_score} pts (calculado: ${player.calculated_points})`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao corrigir pontuações:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixPlayerScores();
