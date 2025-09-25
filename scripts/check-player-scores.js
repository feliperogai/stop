const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_CJ6jebqDYvh2@ep-snowy-cloud-aewcfcwx-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

async function checkPlayerScores() {
  const client = await pool.connect();
  try {
    console.log('🔍 Verificando pontuações dos jogadores...');
    
    // Buscar todos os jogadores e suas pontuações
    const playersResult = await client.query(`
      SELECT 
        gp.player_id,
        gp.player_name,
        gp.total_score,
        COUNT(pa.id) as total_answers,
        SUM(COALESCE(pa.points, 0)) as calculated_points
      FROM game_participants gp
      LEFT JOIN player_answers pa ON gp.player_id = pa.player_id 
        AND pa.round_id IN (SELECT id FROM rounds WHERE game_id = gp.game_id)
      WHERE gp.game_id = (SELECT id FROM games ORDER BY id DESC LIMIT 1)
      GROUP BY gp.player_id, gp.player_name, gp.total_score
      ORDER BY gp.player_name
    `);
    
    console.log('📊 Pontuações dos jogadores:');
    playersResult.rows.forEach(player => {
      console.log(`  - ${player.player_name}: total_score=${player.total_score}, calculated_points=${player.calculated_points}, answers=${player.total_answers}`);
    });
    
    // Verificar se há respostas com pontos
    const answersResult = await client.query(`
      SELECT 
        pa.player_name,
        pa.answer,
        pa.points,
        pa.is_valid,
        pa.is_duplicate,
        c.name as category_name
      FROM player_answers pa
      LEFT JOIN game_categories gc ON pa.category_id = gc.category_id
      LEFT JOIN categories c ON gc.category_id = c.id
      WHERE pa.round_id IN (SELECT id FROM rounds WHERE game_id = (SELECT id FROM games ORDER BY id DESC LIMIT 1))
      ORDER BY pa.player_name, c.name
    `);
    
    console.log('\n📝 Respostas com pontos:');
    answersResult.rows.forEach(answer => {
      console.log(`  - ${answer.player_name} (${answer.category_name}): "${answer.answer}" - ${answer.points} pts (valid: ${answer.is_valid}, duplicate: ${answer.is_duplicate})`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar pontuações:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkPlayerScores();
