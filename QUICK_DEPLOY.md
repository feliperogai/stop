# ⚡ Deploy Rápido no Vercel

## 🚀 Método 1: Deploy Automático (Recomendado)

1. **Push para GitHub**
   ```bash
   git add .
   git commit -m "Deploy para Vercel"
   git push origin main
   ```

2. **Conectar no Vercel**
   - Acesse [vercel.com](https://vercel.com)
   - Clique em "New Project"
   - Conecte seu repositório GitHub
   - Configure `DATABASE_URL` nas Environment Variables

3. **Pronto!** 🎉
   - Deploy automático a cada push
   - URL única para sua aplicação

## 🛠️ Método 2: Deploy Manual

1. **Instalar Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   # Preview
   vercel
   
   # Produção
   vercel --prod
   ```

## 🔧 Método 3: Script Automatizado

```bash
# Windows
npm run deploy:setup

# Ou manualmente
powershell -ExecutionPolicy Bypass -File scripts/deploy.ps1
```

## 📋 Checklist Rápido

- [ ] Código no GitHub
- [ ] `DATABASE_URL` configurada no Vercel
- [ ] Build funcionando (`npm run build`)
- [ ] Deploy realizado
- [ ] Aplicação funcionando

## 🎯 URLs Importantes

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Neon Database**: https://console.neon.tech
- **Sua App**: `https://seu-projeto.vercel.app`

---

**⚡ Deploy em 5 minutos!**
