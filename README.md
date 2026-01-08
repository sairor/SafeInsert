# Safe-Insert PWA 🚀

Um aplicativo PWA (Progressive Web App) moderno e offline-first para controle financeiro de Microempreendedores Individuais (MEI) e autônomos.

![SalesTracker Icon](app_icon.png)

## Funcionalidades Principais

- **Controle Financeiro Completo**: Registro de Entradas e Saídas.
- **Gestão MEI**: 
  - Controle de limite anual de faturamento (R$ 81k / R$ 97.2k).
  - Gestão de múltiplas contas (MEI vs Pessoal).
- **Interface Mobile-First**: Design inspirado no iOS, fluido e responsivo.
- **Relatórios**: Filtros semanais, mensais, anuais e personalizados.
- **Offline-First**: Funciona sem internet (dados salvos no LocalStorage).
- **Instalável**: Pode ser instalado na tela inicial do celular como um app nativo.

## Tecnologias

- **HTML5, CSS3, JavaScript (Vanilla)**: Sem frameworks pesados, foco em performance e simplicidade.
- **Tailwind CSS**: Estilização rápida e moderna.
- **Lucide Icons**: Ícones vetoriais leves.
- **LocalStorage**: Persistência de dados local segura.

## Como Rodar Localmente

Basta abrir o arquivo `index.html` no seu navegador ou usar uma extensão como "Live Server".

## Como Fazer Deploy (GitHub Pages)

1. Crie um repositório no GitHub.
2. Faça o push deste código:
   ```bash
   git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPO.git
   git push -u origin main
   ```
3. Nas configurações do repositório no GitHub, vá em **Pages** e selecione a branch `main` como fonte.
4. Seu app estará online em minutos!
