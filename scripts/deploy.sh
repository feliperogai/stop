#!/bin/bash

# Script de Deploy para Vercel
echo "🚀 Iniciando deploy do Stop Game para Vercel..."

# Verificar se o Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI não encontrado. Instalando..."
    npm install -g vercel
fi

# Verificar se está logado no Vercel
if ! vercel whoami &> /dev/null; then
    echo "🔐 Faça login no Vercel:"
    vercel login
fi

# Verificar se a variável DATABASE_URL está configurada
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL não encontrada nas variáveis de ambiente"
    echo "📝 Configure no painel do Vercel: Settings > Environment Variables"
    echo "   Name: DATABASE_URL"
    echo "   Value: sua_connection_string_do_neon"
fi

# Fazer build de teste
echo "🔨 Testando build..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build bem-sucedido!"
    
    # Deploy de preview
    echo "🚀 Fazendo deploy de preview..."
    vercel
    
    # Perguntar se quer fazer deploy de produção
    read -p "❓ Fazer deploy de produção? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🚀 Fazendo deploy de produção..."
        vercel --prod
        echo "✅ Deploy de produção concluído!"
    fi
else
    echo "❌ Build falhou. Corrija os erros antes de fazer deploy."
    exit 1
fi

echo "🎉 Deploy concluído com sucesso!"
echo "📱 Acesse sua aplicação no painel do Vercel"
