const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// Configuração do banco de dados Neon PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_CJ6jebqDYvh2@ep-snowy-cloud-aewcfcwx-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: {
    rejectUnauthorized: false
  }
})

async function setupDatabase() {
  const client = await pool.connect()
  
  try {
    console.log('🔧 Configurando banco de dados...')
    
    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, 'create-database-schema.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    // Executar o script SQL
    await client.query(sql)
    
    console.log('✅ Banco de dados configurado com sucesso!')
    console.log('📊 Tabelas criadas:')
    console.log('   - players (jogadores temporários)')
    console.log('   - game_rooms (salas de jogo)')
    console.log('   - games (partidas temporárias)')
    console.log('   - game_participants (participantes)')
    console.log('   - categories (categorias padrão)')
    console.log('   - game_categories (categorias por partida)')
    console.log('   - rounds (rodadas)')
    console.log('   - player_answers (respostas dos jogadores)')
    console.log('   - answer_evaluations (avaliações)')
    console.log('   - round_scores (pontuações)')
    console.log('   - game_history (histórico temporário)')
    console.log('')
    console.log('🧹 Funções de limpeza automática criadas')
    console.log('📈 Índices de performance criados')
    console.log('🎯 Categorias padrão inseridas')
    
  } catch (error) {
    console.error('❌ Erro ao configurar banco de dados:', error)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  setupDatabase()
}

module.exports = { setupDatabase }
