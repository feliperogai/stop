# 🚀 Configuração do Vercel - Stop Game

## ❌ Erro Corrigido

O erro `"DATABASE_URL" faz referência ao segredo "database_url", que não existe` foi corrigido removendo a referência incorreta do `vercel.json`.

## ✅ Como Configurar Corretamente

### 1. **Configurar Variável de Ambiente no Vercel**

**OPÇÃO A: Via Painel do Vercel (Recomendado)**
1. Acesse o painel do Vercel: [vercel.com/dashboard](https://vercel.com/dashboard)
2. Selecione seu projeto
3. Vá para **Settings** → **Environment Variables**
4. Clique em **Add New**
5. Configure:
   - **Name**: `DATABASE_URL`
   - **Value**: `postgresql://neondb_owner:npg_CJ6jebqDYvh2@ep-snowy-cloud-aewcfcwx-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
   - **Environment**: Marque todas as opções (Production, Preview, Development)

**OPÇÃO B: Via vercel.json (Já configurado)**
A variável já está configurada no arquivo `vercel.json`, então você pode pular esta etapa.

### 2. **Deploy Novamente**

Após configurar a variável:

```bash
# Se usando Vercel CLI
vercel --prod

# Ou faça push para GitHub (deploy automático)
git add .
git commit -m "Fix Vercel configuration"
git push origin main
```

## 🔧 Arquivos Atualizados

### `vercel.json` (Corrigido)
```json
{
  "functions": {
    "app/api/database/route.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "DATABASE_URL": "postgresql://neondb_owner:npg_CJ6jebqDYvh2@ep-snowy-cloud-aewcfcwx-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
  }
}
```

### `next.config.mjs` (Já configurado)
```javascript
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['pg'],
  },
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
  },
  // ... outras configurações
}
```

## 📋 Checklist de Deploy

- [ ] ✅ Código no GitHub
- [ ] ✅ `DATABASE_URL` configurada (via painel OU vercel.json)
- [ ] ✅ `vercel.json` corrigido (com DATABASE_URL direto)
- [ ] ✅ Build funcionando (`npm run build`)
- [ ] ✅ Deploy realizado
- [ ] ✅ Aplicação funcionando

## 🎯 Próximos Passos

1. **Configure a variável** `DATABASE_URL` no painel do Vercel
2. **Faça novo deploy** (push para GitHub ou `vercel --prod`)
3. **Teste a aplicação** na URL fornecida pelo Vercel

## 🚨 Se Ainda Houver Problemas

### Verificar se a variável está configurada:
1. Vercel Dashboard → Seu Projeto → Settings → Environment Variables
2. Deve aparecer `DATABASE_URL` com o valor da connection string

### Verificar logs:
1. Vercel Dashboard → Seu Projeto → Functions
2. Clique em `app/api/database/route.ts`
3. Verifique os logs para erros de conexão

---

**✅ Agora o deploy deve funcionar perfeitamente!**
