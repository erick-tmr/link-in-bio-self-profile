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
    mentoriaSub: "1:1 tech mentoring",
    amaSub: "ask me anything",
    githubSub: "code & ROM hacks",
    emailSub: "say hello",
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
    mentoriaSub: "mentoria tech 1:1",
    amaSub: "pergunte qualquer coisa",
    githubSub: "código & ROM hacks",
    emailSub: "manda um oi",
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
