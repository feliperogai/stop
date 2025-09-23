# 🚀 Deploy no Vercel - Stop Game

Este guia explica como fazer deploy da aplicação Stop Game no Vercel.

## 📋 Pré-requisitos

1. **Conta no Vercel** - [vercel.com](https://vercel.com)
2. **Conta no Neon** - [neon.tech](https://neon.tech) (banco PostgreSQL)
3. **GitHub** - Para conectar o repositório

## 🔧 Configuração do Banco de Dados

### 1. Configurar Neon PostgreSQL

1. Acesse [neon.tech](https://neon.tech)
2. Crie uma nova conta ou faça login
3. Crie um novo projeto
4. Copie a **Connection String** do seu banco

### 2. Configurar Variáveis de Ambiente no Vercel

1. Acesse o painel do Vercel
2. Vá para seu projeto
3. Clique em **Settings** > **Environment Variables**
4. Adicione a variável:
   - **Name**: `DATABASE_URL`
   - **Value**: `sua_connection_string_do_neon`
   - **Environment**: Production, Preview, Development

## 🚀 Deploy Automático (Recomendado)

### 1. Conectar Repositório GitHub

1. Faça push do código para o GitHub
2. Acesse [vercel.com](https://vercel.com)
3. Clique em **New Project**
4. Conecte seu repositório GitHub
5. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (raiz do projeto)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### 2. Configurar Variáveis de Ambiente

No painel do Vercel:
- **Settings** > **Environment Variables**
- Adicione `DATABASE_URL` com sua connection string do Neon

### 3. Deploy Automático

- O Vercel fará deploy automaticamente a cada push para a branch principal
- Você receberá uma URL única para sua aplicação

## 🛠️ Deploy Manual com Vercel CLI

### 1. Instalar Vercel CLI

```bash
npm install -g vercel
```

### 2. Login no Vercel

```bash
vercel login
```

### 3. Deploy

```bash
# Deploy de preview
vercel

# Deploy de produção
vercel --prod
```

## 📊 Configurações Específicas

### Arquivo `vercel.json`

```json
{
  "functions": {
    "app/api/database/route.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "DATABASE_URL": "@database_url"
  }
}
```

### Configurações do Next.js

O arquivo `next.config.mjs` já está configurado com:
- ✅ Output standalone para Vercel
- ✅ Headers de segurança
- ✅ Otimizações de performance
- ✅ Configuração do PostgreSQL

## 🔍 Verificação Pós-Deploy

### 1. Testar Funcionalidades

Após o deploy, teste:
- [ ] Criação de salas
- [ ] Entrada em salas
- [ ] Lobby de jogadores
- [ ] Início de partidas
- [ ] Sistema de STOP individual
- [ ] Avaliação de respostas
- [ ] Pontuação em tempo real

### 2. Verificar Logs

No painel do Vercel:
- **Functions** > **View Function Logs**
- Verifique se não há erros de conexão com o banco

### 3. Monitorar Performance

- **Analytics** no painel do Vercel
- **Speed Insights** para performance

## 🚨 Solução de Problemas

### Erro de Conexão com Banco

```bash
# Verificar se a DATABASE_URL está configurada
echo $DATABASE_URL
```

### Erro de Build

```bash
# Testar build localmente
npm run build
```

### Timeout de API

- Aumentar `maxDuration` no `vercel.json`
- Otimizar queries do banco de dados

## 📈 Otimizações

### 1. Performance

- ✅ Pool de conexões configurado
- ✅ Timeouts otimizados
- ✅ Headers de cache

### 2. Segurança

- ✅ SSL obrigatório
- ✅ Headers de segurança
- ✅ Validação de entrada

### 3. Monitoramento

- ✅ Logs estruturados
- ✅ Error tracking
- ✅ Performance metrics

## 🎯 URLs Importantes

- **Aplicação**: `https://seu-projeto.vercel.app`
- **Painel Vercel**: `https://vercel.com/dashboard`
- **Neon Dashboard**: `https://console.neon.tech`

## 📞 Suporte

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Neon Docs**: [neon.tech/docs](https://neon.tech/docs)
- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)

---

## ✅ Checklist de Deploy

- [ ] Código no GitHub
- [ ] Projeto conectado no Vercel
- [ ] `DATABASE_URL` configurada
- [ ] Build funcionando
- [ ] Deploy realizado
- [ ] Funcionalidades testadas
- [ ] Performance verificada

**🎉 Sua aplicação Stop Game está pronta para produção!**
