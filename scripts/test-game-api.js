// Script para testar a API completa de um jogo
async function testGameAPI() {
  const fetch = (await import('node-fetch')).default
  
  try {
    // Buscar um jogo ativo
    const response = await fetch('http://localhost:3000/api/database', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'getGameCategories',
        params: { gameId: 8 }
      })
    })
    
    const result = await response.json()
    console.log('Resultado da API getGameCategories para jogo 8:')
    console.log(JSON.stringify(result, null, 2))
    
    if (result.success && result.data) {
      console.log('\nCategorias do jogo:')
      result.data.forEach((cat, index) => {
        console.log(`${index + 1}. ${cat.name} (ID: ${cat.id}, Posição: ${cat.position})`)
      })
      
      // Verificar se "Meu Chefe é" está presente
      const bossCategory = result.data.find(cat => cat.name === 'Meu Chefe é')
      if (bossCategory) {
        console.log(`\n✅ Categoria "Meu Chefe é" encontrada na posição ${bossCategory.position}`)
      } else {
        console.log('\n❌ Categoria "Meu Chefe é" NÃO encontrada!')
      }
    }
    
  } catch (error) {
    console.error('Erro ao testar API:', error.message)
  }
}

testGameAPI()
