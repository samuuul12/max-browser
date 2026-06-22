# 🚀 Max Browser

Um navegador moderno para Linux que combina a robustez e o desempenho do **PyQt6 (QtWebEngine)** no backend com a flexibilidade e o design moderno de uma interface híbrida baseada em **HTML5, CSS3 e JavaScript**.

Inspirado na usabilidade do Google Chrome, o **Max Browser** traz uma identidade visual própria e minimalista com elementos de vidro e suporte completo a planos de fundo dinâmicos personalizados.

---

## ✨ Recursos Principais

- **📂 Navegação Híbrida**: Interface de abas e botões renderizados localmente via HTML/CSS/JS, garantindo leveza e transições suaves.
- **🖼️ Wallpaper Personalizado**: Defina qualquer imagem do seu computador como plano de fundo da página de Nova Guia, com controle deslizante de opacidade em tempo real.
- **⚙️ Painel de Configurações Completo**: Interface de configurações organizada com sidebar intuitiva dividida em Geral, Início, Pesquisa e Privacidade (conforme padrões de UI de alta fidelidade).
- **⭐ Favoritos e Histórico**: Sistema de marcadores rápidos na barra de endereços (estrela) e página dedicada para gerenciar favoritos e histórico de visitas.
- **⚡ Downloads em Tempo Real**: Monitoramento nativo de downloads com cálculo de progresso, velocidade de download e opções para abrir arquivos ou pastas diretamente.
- **🔍 Mecanismo de Busca Customizável**: Suporte a Google, Bing, DuckDuckGo e Yahoo diretamente na barra de endereços.

---

## 🛠️ Tecnologias Utilizadas

- **Backend**: Python 3, PyQt6 (com PyQt6-WebEngine e PyQt6-WebChannel)
- **Frontend**: HTML5, Vanilla CSS3 (com Glassmorphism e Transições Suaves), JavaScript Moderno
- **Comunicação**: QWebChannel para integração bidirecional assíncrona entre o Python e o motor do navegador.

---

## 🚀 Como Executar

### 1. Instalar as Dependências

Certifique-se de que o Python 3 e o gerenciador de pacotes pip estão instalados no seu sistema Linux. Em seguida, instale os requisitos do PyQt6:

```bash
pip install PyQt6 PyQt6-WebEngine PyQt6-WebChannel
```

### 2. Iniciar o Navegador

Clone ou acesse a pasta do projeto e inicie o arquivo principal:

```bash
cd modern_browser
python3 main.py
```

---

## 📂 Estrutura do Projeto

```
modern_browser/
├── main.py             # Script principal em Python (backend e motor PyQt6)
├── config.json         # Banco de dados local em JSON (histórico, favoritos, downloads e wallpaper)
└── ui/                 # Arquivos da interface do usuário (HTML/CSS/JS)
    ├── bar.html/css/js        # Barra de topo (abas, navegação e endereço)
    ├── newtab.html/css/js     # Página de Nova Guia (wallpaper, atalhos, busca)
    ├── settings.html/css/js   # Painel de configurações com sidebar dedicada
    ├── history.html/css/js    # Página de histórico de navegação
    ├── bookmarks.html/css/js  # Página de favoritos
    ├── downloads.html/css/js  # Página de gerenciamento de downloads
    └── qwebchannel.js         # Biblioteca de integração do Qt
```

---

## 🎨 Personalização do Wallpaper

No painel de Configurações (ou no botão "Personalizar" da Nova Guia):
1. Clique em **Escolher Imagem** e selecione qualquer arquivo de imagem (`.png`, `.jpg`, `.jpeg`, `.bmp`).
2. Ajuste o controle deslizante de **Opacidade** para misturar a imagem com o tema escuro do navegador.
3. Suas alterações são salvas automaticamente no arquivo `config.json` e serão aplicadas na próxima inicialização.

;)

