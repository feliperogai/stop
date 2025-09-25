// Script para testar a API de categorias
async function testCategoriesAPI() {
  const fetch = (await import('node-fetch')).default
  try {
    // Testar a API de categorias
    const response = await fetch('http://localhost:3000/api/database', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'testCategories'
      })
    })
    
    const result = await response.json()
    console.log('Resultado da API de categorias:')
    console.log(JSON.stringify(result, null, 2))
    
    if (result.success && result.data) {
      console.log('\nCategorias encontradas:')
      result.data.forEach((cat, index) => {
        console.log(`${index + 1}. ${cat.name} (ID: ${cat.id})`)
      })
    }
    
  } catch (error) {
    console.error('Erro ao testar API:', error.message)
  }
}

testCategoriesAPI()
