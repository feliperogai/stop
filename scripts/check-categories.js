// Script para verificar e inserir a categoria "Meu Chefe é" no banco de dados
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_CJ6jebqDYvh2@ep-snowy-cloud-aewcfcwx-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: {
    rejectUnauthorized: false
  }
})

async function checkAndInsertCategory() {
  const client = await pool.connect()
  try {
    // Verificar se a categoria "Meu Chefe é" já existe
    const checkResult = await client.query('SELECT * FROM categories WHERE name = $1', ['Meu Chefe é'])
    
    if (checkResult.rows.length === 0) {
      console.log('Categoria "Meu Chefe é" não encontrada. Inserindo...')
      
      // Inserir a categoria
      const insertResult = await client.query(
        'INSERT INTO categories (name, description, is_active) VALUES ($1, $2, $3) RETURNING *',
        ['Meu Chefe é', 'Características ou descrições de chefe', true]
      )
      
      console.log('Categoria inserida:', insertResult.rows[0])
    } else {
      console.log('Categoria "Meu Chefe é" já existe:', checkResult.rows[0])
    }
    
    // Listar todas as categorias
    const allCategories = await client.query('SELECT * FROM categories WHERE is_active = true ORDER BY id')
    console.log('\nTodas as categorias ativas:')
    allCategories.rows.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.name} (ID: ${cat.id})`)
    })
    
  } catch (error) {
    console.error('Erro:', error)
  } finally {
    client.release()
    await pool.end()
  }
}

checkAndInsertCategory()
