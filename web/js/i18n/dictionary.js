/* ===========================================================================
   i18n dictionary — translation data only, no logic.
   Keys are referenced from the DOM via [data-i18n="<key>"] and from the music
   player status label (musicNowPlaying / musicPaused). Add a language by adding
   a sibling object.
   =========================================================================== */

export const DEFAULT_LANG = "en";

export const DICT = {
  en: {
    bioRole: "Software engineer · Pokémon ROM hacker · JDM enthusiast",
    bioLine: "Backend systems by day, Game Boy ROMs by night, chasing apexes on the weekend.",
    projTitleSub: "An RTC-free, MBC5 fork of Pokémon Crystal Legacy.",
    projLead: "Crystal Legacy was never designed to run on cartridges without an RTC, so on those it quietly corrupts your save. This patch fixes that, and stacks a bunch of quality-of-life improvements on top. Check it out.",
    statRtc: "RTC writes",
    statSave: "save intact",
    statTime: "time control",
    ctaDownload: "Download the patch",
    ctaOpen: "Open project",
    ctaSource: "Source",
    blogTitle: "Field Notes",
    blogLead: "// long-form writing on auth, identity & backend craft.",
    ctaBlog: "Read the blog",
    ctaSeries: "OAuth & OIDC series",
    linksTitle: "Connect",
    linkedinSub: "professional profile",
    twitterSub: "thoughts & dev chatter",
    instagramSub: "life & builds",
    mentoriaSub: "1:1 tech mentoring",
    amaSub: "ask me anything",
    githubSub: "code & ROM hacks",
    toolsSub: "Mario Tennis save patcher & more",
    emailSub: "say hello",

    // Cool Tools hub (/tools/)
    toolsLead:
      "Small, single-purpose utilities I built because something annoyed me and nobody else had fixed it. They run entirely in your browser — no accounts, no uploads, no server.",
    toolsBadgeLocal: "Runs in your browser",
    toolsBadgeFree: "Free · no sign-up",
    toolsCardLead:
      "Mario Tennis for Game Boy Color locks four characters and four minigames behind an N64, the N64 cartridge and a Transfer Pak. This patcher writes the exact same bytes a real Transfer Pak session writes — verified on a real cartridge — so you can unlock them from your save file alone.",
    toolsUnlocksLabel: "UNLOCKS",
    toolsChipMinigames: "+ 4 minigames",
    toolsStatBytes: "bytes changed",
    toolsStatUploads: "uploads",
    toolsStatReversible: "reversible",
    toolsCtaOpen: "Open the patcher",
    toolsCardHint: "accepts a 32 KiB .sav (USA)",
    toolsRequestEyebrow: "REQUESTS",
    toolsRequestLead:
      "Know some retro content locked behind hardware nobody owns anymore? Tell me — reverse-engineering save formats is my kind of weekend.",
    toolsCtaEmail: "Email me",
    toolsFooterLegal:
      "Fan tools. Trademarks belong to their owners. Not affiliated. Everything runs locally in your browser.",
    aboutTitle: "Driver Profile",
    garageTitle: "GARAGE",
    bannerCaption: "Hoenn legends clash: rain vs drought.",
    saveTitle: "SAVE DATA",
    lRide: "DAILY DRIVER",
    lStyle: "STYLE",
    lMain: "MAIN GAME",
    lSide: "SIDE QUEST",
    lClass: "CLASS",
    footerNote: "Built with caffeine, Pokémon & boost.",
    musicNowPlaying: "NOW PLAYING",
    musicPaused: "PAUSED"
  },
  pt: {
    bioRole: "Engenheiro de software · romhacker de Pokémon · entusiasta JDM",
    bioLine: "Backend de dia, ROMs de Game Boy de noite, curvas no fim de semana.",
    projTitleSub: "Um fork sem RTC, em MBC5, do Pokémon Crystal Legacy.",
    projLead: "O Crystal Legacy nunca foi feito para rodar em cartuchos sem RTC, então neles ele corrompe seu save silenciosamente. Este patch corrige isso e ainda adiciona várias melhorias de qualidade de vida por cima. Dá uma olhada.",
    statRtc: "escritas RTC",
    statSave: "save intacto",
    statTime: "controle do tempo",
    ctaDownload: "Baixar o patch",
    ctaOpen: "Abrir projeto",
    ctaSource: "Código",
    blogTitle: "Anotações",
    blogLead: "// textos longos sobre autenticação, identidade e backend.",
    ctaBlog: "Ler o blog",
    ctaSeries: "Série OAuth & OIDC",
    linksTitle: "Conecte-se",
    linkedinSub: "perfil profissional",
    twitterSub: "ideias & papo dev",
    instagramSub: "vida & projetos",
    mentoriaSub: "mentoria tech 1:1",
    amaSub: "pergunte qualquer coisa",
    githubSub: "código & ROM hacks",
    toolsSub: "patcher de save do Mario Tennis & mais",
    emailSub: "manda um oi",

    // Cool Tools hub (/tools/)
    toolsLead:
      "Utilitários pequenos e de propósito único que eu criei porque algo me incomodava e ninguém tinha resolvido. Rodam inteiramente no seu navegador — sem conta, sem upload, sem servidor.",
    toolsBadgeLocal: "Roda no seu navegador",
    toolsBadgeFree: "Grátis · sem cadastro",
    toolsCardLead:
      "Mario Tennis de Game Boy Color tranca quatro personagens e quatro minigames atrás de um N64, o cartucho de N64 e um Transfer Pak. Este patcher escreve exatamente os mesmos bytes que uma sessão real de Transfer Pak escreve — verificado em cartucho real — então você desbloqueia tudo só com o seu save.",
    toolsUnlocksLabel: "DESBLOQUEIA",
    toolsChipMinigames: "+ 4 minigames",
    toolsStatBytes: "bytes alterados",
    toolsStatUploads: "uploads",
    toolsStatReversible: "reversível",
    toolsCtaOpen: "Abrir o patcher",
    toolsCardHint: "aceita um .sav de 32 KiB (USA)",
    toolsRequestEyebrow: "PEDIDOS",
    toolsRequestLead:
      "Conhece algum conteúdo retrô trancado atrás de hardware que ninguém mais tem? Me conta — engenharia reversa de save é meu tipo de fim de semana.",
    toolsCtaEmail: "Me manda um email",
    toolsFooterLegal:
      "Ferramentas de fã. Marcas pertencem aos seus donos. Sem afiliação. Tudo roda localmente no seu navegador.",
    aboutTitle: "Perfil do Piloto",
    garageTitle: "GARAGEM",
    bannerCaption: "Lendas de Hoenn em confronto: chuva vs seca.",
    saveTitle: "DADOS DO SAVE",
    lRide: "CARRO",
    lStyle: "ESTILO",
    lMain: "JOGO PRINCIPAL",
    lSide: "MISSÃO PARALELA",
    lClass: "CLASSE",
    footerNote: "Feito com cafeína, Pokémon e turbo.",
    musicNowPlaying: "TOCANDO AGORA",
    musicPaused: "PAUSADO"
  }
};
