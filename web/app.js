/* ===========================================================================
   Erick Takeshi — personal page
   Vanilla port of the prototype's DCLogic component: EN/PT i18n + a procedural
   chiptune music dock built on the Web Audio API.
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

  /* ---- Chiptune music dock --------------------------------------------- */
  var N = {
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0
  };
  var LEAD = [
    N.E5, 0, N.C5, 0, N.G4, 0, N.C5, N.E5, N.D5, 0, N.B4, 0, N.G4, 0, N.B4, N.D5,
    N.C5, 0, N.A4, 0, N.E4, 0, N.A4, N.C5, N.D5, 0, 0, N.E5, N.G5, 0, N.E5, 0
  ];
  var B = { C3: 130.81, G2: 98.0, A2: 110.0, F2: 87.31, E2: 82.41 };
  var BASS = [
    B.C3, 0, 0, 0, B.G2, 0, 0, 0, B.A2, 0, 0, 0, B.F2, 0, 0, 0,
    B.C3, 0, 0, 0, B.E2, 0, 0, 0, B.F2, 0, 0, 0, B.G2, 0, 0, 0
  ];
  var STEP_MS = 60000 / 132 / 4; // 132 bpm, sixteenth notes

  var ctx = null, master = null, timer = null, step = 0;

  function ensureAudio() {
    if (ctx) {
      if (ctx.state === "suspended") ctx.resume();
      return;
    }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = state.musicOn ? 0.16 : 0.0;
    master.connect(ctx.destination);
    timer = setInterval(tick, STEP_MS);
  }

  function blip(freq, dur, type, gain) {
    if (!freq || !ctx) return;
    var t = ctx.currentTime;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function tick() {
    if (!ctx) return;
    var s = step % 32;
    blip(LEAD[s], (STEP_MS / 1000) * 1.6, "square", 0.5);
    blip(BASS[s], (STEP_MS / 1000) * 3.2, "triangle", 0.6);
    step++;
  }

  var dock = document.getElementById("dock");
  var musicBtn = document.getElementById("musicBtn");

  function toggleMusic() {
    ensureAudio();
    state.musicOn = !state.musicOn;
    if (dock) dock.classList.toggle("is-muted", !state.musicOn);
    if (musicBtn) musicBtn.setAttribute("aria-pressed", String(state.musicOn));
    if (master && ctx) {
      var t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(state.musicOn ? 0.16 : 0.0, t + 0.25);
    }
    updateMusicLabel();
  }

  if (musicBtn) musicBtn.addEventListener("click", toggleMusic);

  // Start audio on the first user gesture (browser autoplay policy).
  function kick() {
    ensureAudio();
    window.removeEventListener("pointerdown", kick);
    window.removeEventListener("keydown", kick);
  }
  window.addEventListener("pointerdown", kick);
  window.addEventListener("keydown", kick);

  /* ---- Init ------------------------------------------------------------ */
  applyLang("en");
})();
