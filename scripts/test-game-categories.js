// Script para testar a função getGameCategories
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_CJ6jebqDYvh2@ep-snowy-cloud-aewcfcwx-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: {
    rejectUnauthorized: false
  }
})

async function testGameCategories() {
  const client = await pool.connect()
  try {
    // Buscar um jogo ativo
    const gameResult = await client.query(`
      SELECT id FROM games 
      WHERE status IN ('waiting', 'playing', 'scoring') 
      ORDER BY id DESC 
      LIMIT 1
    `)
    
    if (gameResult.rows.length === 0) {
      console.log('Nenhum jogo ativo encontrado')
      return
    }
    
    const gameId = gameResult.rows[0].id
    console.log(`Testando categorias para o jogo ${gameId}`)
    
    // Testar a query que a API usa
    const gameCategoriesResult = await client.query(
      `SELECT c.*, gc.position 
       FROM categories c 
       JOIN game_categories gc ON c.id = gc.category_id 
       WHERE gc.game_id = $1 
       ORDER BY gc.position`,
      [gameId]
    )
    
    console.log(`\nCategorias encontradas para o jogo ${gameId}:`)
    gameCategoriesResult.rows.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.name} (ID: ${cat.id}, Posição: ${cat.position})`)
    })
    
    // Verificar se "Meu Chefe é" está presente
    const bossCategory = gameCategoriesResult.rows.find(cat => cat.name === 'Meu Chefe é')
    if (bossCategory) {
      console.log(`\n✅ Categoria "Meu Chefe é" encontrada na posição ${bossCategory.position}`)
    } else {
      console.log('\n❌ Categoria "Meu Chefe é" NÃO encontrada!')
    }
    
  } catch (error) {
    console.error('Erro:', error)
  } finally {
    client.release()
    await pool.end()
  }
}

testGameCategories()
