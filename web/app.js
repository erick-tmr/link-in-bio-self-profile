/* ===========================================================================
   Erick Takeshi — personal page
   Vanilla port of the prototype's DCLogic component: EN/PT i18n + a looping
   music dock (Littleroot Town lo-fi) driven by an HTMLAudioElement.
   =========================================================================== */
(function () {
  "use strict";

  /* ---- i18n ------------------------------------------------------------ */
  var DICT = {
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
      musicOn: "♪ MUSIC ON · TAP TO MUTE",
      musicOff: "♪ MUSIC OFF · TAP TO PLAY"
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
      musicOn: "♪ SOM LIGADO · TOQUE P/ MUTAR",
      musicOff: "♪ SOM DESLIGADO · TOQUE"
    }
  };

  var state = { lang: "en", musicOn: true };

  var i18nNodes = document.querySelectorAll("[data-i18n]");
  var langButtons = document.querySelectorAll(".lang-btn");
  var musicLabel = document.getElementById("musicLabel");

  function applyLang(lang) {
    state.lang = lang;
    var dict = DICT[lang];
    document.documentElement.lang = lang;

    i18nNodes.forEach(function (node) {
      var key = node.getAttribute("data-i18n");
      if (dict[key] != null) node.textContent = dict[key];
    });

    langButtons.forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-lang") === lang);
    });

    updateMusicLabel();
  }

  function updateMusicLabel() {
    if (!musicLabel) return;
    musicLabel.textContent = DICT[state.lang][state.musicOn ? "musicOn" : "musicOff"];
  }

  langButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      applyLang(btn.getAttribute("data-lang"));
    });
  });

  /* ---- Music dock — Littleroot Town lo-fi loop ------------------------- */
  var dock = document.getElementById("dock");
  var musicBtn = document.getElementById("musicBtn");
  var track = document.getElementById("track");
  if (track) track.volume = 0.5;

  function playTrack() {
    // play() rejects until the page has had a user gesture; swallow that.
    if (track && state.musicOn) track.play().catch(function () {});
  }

  function toggleMusic() {
    state.musicOn = !state.musicOn;
    if (dock) dock.classList.toggle("is-muted", !state.musicOn);
    if (musicBtn) musicBtn.setAttribute("aria-pressed", String(state.musicOn));
    if (track) {
      if (state.musicOn) track.play().catch(function () {});
      else track.pause();
    }
    updateMusicLabel();
  }

  if (musicBtn) musicBtn.addEventListener("click", toggleMusic);

  // Start playback on the first user gesture (browser autoplay policy).
  function kick() {
    playTrack();
    window.removeEventListener("pointerdown", kick);
    window.removeEventListener("keydown", kick);
  }
  window.addEventListener("pointerdown", kick);
  window.addEventListener("keydown", kick);

  /* ---- Init ------------------------------------------------------------ */
  applyLang("en");
})();
