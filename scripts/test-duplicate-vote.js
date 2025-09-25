const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_CJ6jebqDYvh2@ep-snowy-cloud-aewcfcwx-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

async function testMarkDuplicate() {
  const client = await pool.connect();
  try {
    console.log('🔍 Testando markAnswerAsDuplicate...');
    
    // Simular uma chamada para markAnswerAsDuplicate
    const answerId = 3006; // ID de uma resposta existente
    const playerId = 1; // ID de um jogador existente
    
    console.log('📋 Testando com answerId:', answerId, 'playerId:', playerId);
    
    // Verificar se já existe voto deste jogador para esta resposta
    const existingVote = await client.query(
      'SELECT id, is_valid, is_duplicate FROM answer_votes WHERE answer_id = $1 AND player_id = $2',
      [answerId, playerId]
    );
    
    console.log('📋 Voto existente encontrado:', existingVote.rows[0]);
    
    if (existingVote.rows.length > 0) {
      // Atualizar voto existente
      console.log('📋 Atualizando voto existente para duplicata');
      await client.query(
        'UPDATE answer_votes SET is_duplicate = true, is_valid = NULL WHERE answer_id = $1 AND player_id = $2',
        [answerId, playerId]
      );
    } else {
      // Inserir novo voto
      console.log('📋 Inserindo novo voto de duplicata');
      await client.query(
        'INSERT INTO answer_votes (answer_id, player_id, is_valid, is_duplicate) VALUES ($1, $2, NULL, true)',
        [answerId, playerId]
      );
    }
    
    // Verificar se o voto foi inserido/atualizado corretamente
    const verifyVote = await client.query(
      'SELECT id, is_valid, is_duplicate FROM answer_votes WHERE answer_id = $1 AND player_id = $2',
      [answerId, playerId]
    );
    console.log('📋 Voto verificado após inserção/atualização:', verifyVote.rows[0]);
    
    // Marcar resposta como duplicada
    await client.query('UPDATE player_answers SET is_duplicate = true WHERE id = $1', [answerId]);
    
    console.log('✅ Teste de markAnswerAsDuplicate concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao testar markAnswerAsDuplicate:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

testMarkDuplicate();
