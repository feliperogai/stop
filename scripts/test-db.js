// Script simples para testar conexão com o banco
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_CJ6jebqDYvh2@ep-snowy-cloud-aewcfcwx-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: {
    rejectUnauthorized: false
  }
})

async function testConnection() {
  try {
    const client = await pool.connect()
    console.log('Conectado ao banco de dados!')
    
    // Testar uma query simples
    const result = await client.query('SELECT COUNT(*) FROM categories')
    console.log('Número de categorias:', result.rows[0].count)
    
    client.release()
    await pool.end()
  } catch (error) {
    console.error('Erro de conexão:', error.message)
  }
}

testConnection()
