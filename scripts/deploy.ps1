# Script de Deploy para Vercel (PowerShell)
Write-Host "Iniciando deploy do Stop Game para Vercel..." -ForegroundColor Green

# Verificar se o Vercel CLI está instalado
try {
    vercel --version | Out-Null
    Write-Host "Vercel CLI encontrado" -ForegroundColor Green
} catch {
    Write-Host "Vercel CLI não encontrado. Instalando..." -ForegroundColor Red
    npm install -g vercel
}

# Verificar se está logado no Vercel
try {
    vercel whoami | Out-Null
    Write-Host "Logado no Vercel" -ForegroundColor Green
} catch {
    Write-Host "Faça login no Vercel:" -ForegroundColor Yellow
    vercel login
}

# Verificar se a variável DATABASE_URL está configurada
if (-not $env:DATABASE_URL) {
    Write-Host "DATABASE_URL não encontrada nas variáveis de ambiente" -ForegroundColor Yellow
    Write-Host "Configure no painel do Vercel: Settings > Environment Variables" -ForegroundColor Cyan
    Write-Host "   Name: DATABASE_URL" -ForegroundColor Cyan
    Write-Host "   Value: sua_connection_string_do_neon" -ForegroundColor Cyan
}

# Fazer build de teste
Write-Host "Testando build..." -ForegroundColor Blue
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "Build bem-sucedido!" -ForegroundColor Green
    
    # Deploy de preview
    Write-Host "Fazendo deploy de preview..." -ForegroundColor Blue
    vercel
    
    # Perguntar se quer fazer deploy de produção
    $response = Read-Host "Fazer deploy de produção? (y/n)"
    if ($response -eq "y" -or $response -eq "Y") {
        Write-Host "Fazendo deploy de produção..." -ForegroundColor Blue
        vercel --prod
        Write-Host "Deploy de produção concluído!" -ForegroundColor Green
    }
} else {
    Write-Host "Build falhou. Corrija os erros antes de fazer deploy." -ForegroundColor Red
    exit 1
}

Write-Host "Deploy concluído com sucesso!" -ForegroundColor Green
Write-Host "Acesse sua aplicação no painel do Vercel" -ForegroundColor Cyan
