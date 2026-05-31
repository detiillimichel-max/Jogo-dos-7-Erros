# 🔍 Jogo dos 7 Erros — PWA

> Encontre as 7 diferenças entre as imagens! Jogo de observação com geração procedural de puzzles e design neon retro-futurista.

---

## 🎮 Como Jogar

1. Abra o app e toque em **▶ JOGAR**
2. Duas imagens aparecem lado a lado — **ORIGINAL** e **DIFERENTE**
3. Toque nas áreas onde você vê diferenças
4. Encontre os **7 erros** antes do tempo acabar
5. Use **💡 DICA** (3 por fase) se travar — custa -30 pontos
6. Cada erro encontrado vale **50 + (tempo restante × 2)** pontos

---

## 📁 Estrutura de Arquivos

```
7erros/
├── index.html      # Estrutura HTML principal
├── style.css       # Estilos — tema dark neon retro
├── app.js          # Lógica do jogo (Canvas, Timer, Score)
├── manifest.json   # PWA manifest — instalação nativa
├── sw.js           # Service Worker — modo offline-first
├── README.md       # Este arquivo
└── icons/
    ├── icon-96.png
    ├── icon-192.png
    └── icon-512.png
```

---

## 🚀 Deploy

### GitHub Pages
```bash
git init
git add .
git commit -m "feat: jogo dos 7 erros PWA"
git remote add origin https://github.com/SEU_USER/7erros.git
git push -u origin main
# Ative GitHub Pages em Settings → Pages → Branch: main
```

### Vercel
```bash
npx vercel --prod
```

### Netlify (drag & drop)
Arraste a pasta `7erros/` para [app.netlify.com/drop](https://app.netlify.com/drop)

---

## ⚙️ Requisitos

- Qualquer navegador moderno com suporte a **Canvas API**
- Para instalação como PWA: HTTPS + manifest válido
- Offline funciona após primeira visita (Service Worker ativo)

---

## 🛠️ Personalização

### Adicionar Fases
Em `app.js`, edite o array `SCENES`:
```js
const SCENES = [
  { bg: '#0d1b2a', name: 'Minha Fase', palette: ['#cor1','#cor2','#cor3','#cor4'] },
  // ...
];
```

### Ajustar Dificuldade
```js
// Tempo por fase (em segundos, mínimo 60s)
STATE.totalTime = Math.max(60, 120 - (STATE.level - 1) * 10);

// Número de formas desenhadas (mais formas = mais difícil)
const shapes = 14 + STATE.level * 2;
```

### Ícones
Gere os ícones em [realfavicongenerator.net](https://realfavicongenerator.net) e coloque em `icons/`.

---

## 🎨 Stack Técnica

| Tecnologia | Uso |
|-----------|-----|
| **Canvas 2D API** | Geração procedural dos puzzles |
| **Mulberry32 PRNG** | Seed determinístico por fase |
| **Service Worker** | Cache offline-first |
| **Web Vibration API** | Feedback háptico |
| **CSS Custom Properties** | Tema neon consistente |
| **Google Fonts** | Press Start 2P + Orbitron + Exo 2 |

---

## 📜 Licença

MIT — use à vontade para projetos pessoais e comerciais.

---

Feito com 🔵 **Canvas** + 🟠 **Criatividade**
