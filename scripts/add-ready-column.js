const { Pool } = require('pg')

// Configuração do banco de dados Neon PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_CJ6jebqDYvh2@ep-snowy-cloud-aewcfcwx-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: {
    rejectUnauthorized: false
  }
})

async function addReadyColumn() {
  const client = await pool.connect()
  
  try {
    console.log('Adicionando coluna is_ready à tabela room_participants...')
    
    // Adicionar coluna se não existir
    await client.query(`
      ALTER TABLE room_participants 
      ADD COLUMN IF NOT EXISTS is_ready BOOLEAN DEFAULT false
    `)
    
    console.log('Coluna is_ready adicionada com sucesso!')
    
    // Verificar se a coluna foi adicionada
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'room_participants' AND column_name = 'is_ready'
    `)
    
    if (result.rows.length > 0) {
      console.log('Coluna confirmada:', result.rows[0])
    } else {
      console.log('Coluna não encontrada após adição')
    }
    
  } catch (error) {
    console.error('Erro ao adicionar coluna:', error)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  addReadyColumn()
}

module.exports = { addReadyColumn }
