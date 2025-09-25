// Script para atualizar jogos existentes com a nova categoria "Meu Chefe é"
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_CJ6jebqDYvh2@ep-snowy-cloud-aewcfcwx-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: {
    rejectUnauthorized: false
  }
})

async function updateExistingGames() {
  const client = await pool.connect()
  try {
    // Buscar jogos ativos que não têm a categoria "Meu Chefe é"
    const gamesResult = await client.query(`
      SELECT DISTINCT g.id, g.room_id 
      FROM games g 
      LEFT JOIN game_categories gc ON g.id = gc.game_id 
      LEFT JOIN categories c ON gc.category_id = c.id AND c.name = 'Meu Chefe é'
      WHERE g.status IN ('waiting', 'playing', 'scoring') 
      AND c.id IS NULL
    `)
    
    console.log(`Encontrados ${gamesResult.rows.length} jogos que precisam ser atualizados`)
    
    // Buscar o ID da categoria "Meu Chefe é"
    const categoryResult = await client.query('SELECT id FROM categories WHERE name = $1', ['Meu Chefe é'])
    
    if (categoryResult.rows.length === 0) {
      console.log('Categoria "Meu Chefe é" não encontrada!')
      return
    }
    
    const categoryId = categoryResult.rows[0].id
    console.log('ID da categoria "Meu Chefe é":', categoryId)
    
    // Atualizar cada jogo
    for (const game of gamesResult.rows) {
      console.log(`Atualizando jogo ${game.id}...`)
      
      // Verificar quantas categorias o jogo já tem
      const existingCategories = await client.query(
        'SELECT COUNT(*) as count FROM game_categories WHERE game_id = $1',
        [game.id]
      )
      
      const currentCount = parseInt(existingCategories.rows[0].count)
      console.log(`Jogo ${game.id} tem ${currentCount} categorias`)
      
      // Adicionar a categoria "Meu Chefe é" na próxima posição
      await client.query(
        'INSERT INTO game_categories (game_id, category_id, position) VALUES ($1, $2, $3)',
        [game.id, categoryId, currentCount + 1]
      )
      
      console.log(`Categoria "Meu Chefe é" adicionada ao jogo ${game.id} na posição ${currentCount + 1}`)
    }
    
    console.log('Atualização concluída!')
    
  } catch (error) {
    console.error('Erro:', error)
  } finally {
    client.release()
    await pool.end()
  }
}

updateExistingGames()
