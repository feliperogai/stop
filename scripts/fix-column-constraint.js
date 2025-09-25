const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_CJ6jebqDYvh2@ep-snowy-cloud-aewcfcwx-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

async function fixColumnConstraint() {
  const client = await pool.connect();
  try {
    console.log('🔧 Corrigindo restrição da coluna is_valid...');
    
    // Alterar a coluna is_valid para permitir NULL
    await client.query('ALTER TABLE answer_votes ALTER COLUMN is_valid DROP NOT NULL');
    
    console.log('✅ Coluna is_valid agora permite NULL');
    
    // Verificar a estrutura da tabela
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'answer_votes' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Estrutura atualizada da tabela answer_votes:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default})`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao corrigir restrição:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixColumnConstraint();
