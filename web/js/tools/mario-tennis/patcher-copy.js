/* ===========================================================================
   Save patcher copy — translation data only, no logic.

   Kept next to the tool rather than in web/js/i18n/dictionary.js so the home
   page does not download ~60 keys it will never render. page.js merges the two
   dictionaries for this page. Every key is prefixed "mt" so a merge can never
   shadow a site-wide key.

   Keys ending in "Msg" are the body paragraph of the matching title, which is
   what patcher-format.js assumes when it derives bodyKey from titleKey.
   =========================================================================== */

export const PATCHER_DICT = {
  en: {
    // hero
    mtHeroLead:
      "Mario Tennis (GBC, 2001) hides Yoshi, Wario, Waluigi, Bowser and four minigames behind a Transfer Pak session with the N64 game. Nintendo never patched that out. This tool writes the exact same bytes that session writes — straight into your save file.",
    mtPrivacy: "Your save never leaves this tab. Everything runs in your browser, no upload, no server.",

    // dropzone
    mtDropTitle: "DROP YOUR .SAV HERE",
    mtDropHint: "A raw 32,768-byte SRAM dump from Mario Tennis (USA). Nothing is uploaded.",
    mtDropButton: "Choose a file",
    mtDropLabel: "Choose a Mario Tennis save file, or drop one here",

    // inspector
    mtInspector: "SAVE INSPECTOR",
    mtStateLabel: "STATE",
    mtPlayersLabel: "PROFILES",
    mtCounterLabel: "SAVE COUNT",
    mtChecksumLabel: "CHECKSUMS",
    mtChkAllOk: "ALL OK",
    mtChkBad: "{n} BAD",
    mtStateLocked: "LOCKED",
    mtStateUnlocked: "UNLOCKED",
    mtStatePartial: "PARTIAL",
    mtNoteLocked: "N64 content is not unlocked in this save yet.",
    mtNoteUnlocked: "Yoshi, Wario, Waluigi and Bowser are already available.",
    mtNotePartial: "Half-applied state — either action repairs it.",

    // checksum audit
    mtAuditToggle: "Checksum audit — stored vs computed",
    mtAuditCount: "{audited} / {total}",
    mtAuditCaption: "Directory records in both save halves, with stored and recomputed checksums.",
    mtAuditNote:
      "An unlocked save always shows one mismatch: record 0x110 in the backup half. The transfer block is written to the primary half only — that is what the game itself does, and every hardware-unlocked cartridge audits the same way.",
    mtColHalf: "HALF",
    mtColRec: "REC",
    mtColAddr: "ADDR",
    mtColSize: "SIZE",
    mtColStored: "STORED",
    mtColComputed: "COMPUTED",
    mtColOk: "OK",

    // actions
    mtBtnUnlock: "UNLOCK N64 CONTENT",
    mtBtnRemove: "Remove unlock",
    mtBtnReset: "Reset",
    mtBtnDownload: "Download patched save",
    mtHintUnlocked: "Already unlocked — nothing to apply.",
    mtHintLocked: "Nothing to remove — this save is locked.",
    mtHintIdle: "Load a save file to enable these.",

    // side panels
    mtUnlocksTitle: "WHAT YOU UNLOCK",
    mtUnlocksMinigames: "4 N64 minigames",
    mtReqTitle: "REQUIREMENTS",
    mtReq1: "Mario Tennis (USA) for Game Boy Color",
    mtReq2: "A raw .sav file of exactly 32,768 bytes",
    mtReq3: "Not supported: EUR/JPN carts, save states (.st, .sgm), archives",

    // how to use
    mtHowEyebrow: "HOW TO USE ▸ 4 STEPS",
    mtHowTitle: "From save file to unlocked roster",
    mtStep1Title: "Get your save file",
    mtStep1Body:
      'On an emulator, the .sav sits next to your ROM (mGBA, BGB, SameBoy). On a real cartridge, dump it with a GB Operator, GBxCart RW or similar — the "backup save" option.',
    mtStep2Title: "Drop it in",
    mtStep2Body:
      "The file is read locally and checked: exact size, the Camelot header in both save halves, and a sane directory. If anything looks off, the tool refuses instead of guessing.",
    mtStep3Title: "Hit unlock",
    mtStep3Body:
      "Thirteen bytes change, mirrored across the primary and backup halves, plus the 512-byte transfer block the N64 side would have written. Save counters and profiles are untouched.",
    mtStep4Title: "Put it back",
    mtStep4Body:
      "Download the patched file, keep your original as a backup, and replace it. Next boot, Yoshi, Wario, Waluigi and Bowser are on the character select — and the minigames are open.",

    // why
    mtWhyEyebrow: "WHY THIS EXISTS",
    mtWhyTitle: "Content locked behind hardware nobody has",
    mtWhyP1:
      "To unlock those four characters legitimately you need an N64, the N64 Mario Tennis cartridge, a Transfer Pak and the GBC cartridge — all four, at once. No cheat code exists, and the re-releases never fixed it. For most people the content is simply unreachable.",
    mtWhyP2:
      "So the save format got reverse-engineered — it was documented nowhere — and the patch was verified against three real cartridge dumps. The unlock output is byte-identical to a hardware Transfer Pak session, and the removal restores the original byte for byte.",

    // under the hood
    mtBytesEyebrow: "UNDER THE HOOD",
    mtBytesLead: "For the technically curious — this is the whole diff:",
    mtBytesOffset: "OFFSET",
    mtBytesWhat: "WHAT IT IS",
    mtBytesValue: "VALUE",
    mtByte1: "N64 character bitmask",
    mtByte2: "transfer-done flag",
    mtByte3: "directory record in use",
    mtByte4: "record checksum",
    mtByte5: "transfer block (512 B)",
    mtBytesFoot:
      "Every marker is mirrored in the backup half at 0x2000. Save counters, profile blocks and the non-checksum records from 0x3C0 are never written.",

    // faq
    mtFaqEyebrow: "GOOD TO KNOW",
    mtFaq1Q: "Can I undo it?",
    mtFaq1A:
      'Yes. "Remove unlock" reverses the patch and produces a byte-identical pre-unlock save. It also repairs a half-applied "partial" state.',
    mtFaq2Q: "Does it work on a real cartridge?",
    mtFaq2A:
      "Yes — the output was verified byte-for-byte against a hardware Transfer Pak unlock. Write the patched .sav back with your flasher.",
    mtFaq3Q: "Will it corrupt my progress?",
    mtFaq3A:
      "It only touches the N64 unlock markers and the transfer area. Still: keep a copy of the original file before you overwrite anything.",

    // errors
    mtErrBadSize: "Bad file size",
    mtErrBadSizeMsg: "Expected a 32,768-byte .sav file. Save states and archives will not work.",
    mtErrBadMagic: "Not a Mario Tennis (USA) save",
    mtErrBadMagicMsg: "The Camelot header is missing. This tool only supports the USA release.",
    mtErrBadDirectory: "Save structure is corrupted",
    mtErrBadDirectoryMsg: "The save directory does not look right, so the tool refuses to touch it.",
    mtErrRead: "Could not read the file",
    mtErrReadMsg: "Your browser could not read that file. Try selecting it again.",
    mtErrTransfer: "Unexpected data in the transfer area",
    mtErrTransferMsg:
      "Something already occupies the N64 transfer block. Refusing to patch rather than risk your save.",
    mtErrLib: "Patcher core did not load",
    mtErrLibMsg: "Reload the page. If it keeps failing, the tool cannot run offline from a local file.",
    mtErrUnknown: "Something went wrong",
    mtErrUnknownMsg: "The patch was not applied. Your loaded file is unchanged.",

    // success
    mtOkUnlocked: "N64 content unlocked",
    mtOkUnlockedMsg: "Download the patched save below and put it back where your original lives.",
    mtOkRestored: "Unlock removed",
    mtOkRestoredMsg: "The save is back to its pre-unlock state, byte for byte.",

    // machine status
    mtStatusIdle: "WAITING FOR FILE",
    mtStatusLoaded: "FILE LOADED",
    mtStatusPatched: "PATCH APPLIED",
    mtStatusError: "REFUSED",

    mtFooterLegal:
      "Fan tool · Mario Tennis © Nintendo/Camelot. Not affiliated. Runs entirely in your browser — no file is uploaded."
  },

  pt: {
    // hero
    mtHeroLead:
      "Mario Tennis (GBC, 2001) esconde Yoshi, Wario, Waluigi, Bowser e quatro minigames atrás de uma sessão de Transfer Pak com o jogo de N64. A Nintendo nunca corrigiu isso. Esta ferramenta escreve exatamente os mesmos bytes daquela sessão — direto no seu save.",
    mtPrivacy: "Seu save nunca sai desta aba. Tudo roda no seu navegador, sem upload, sem servidor.",

    // dropzone
    mtDropTitle: "ARRASTE SEU .SAV AQUI",
    mtDropHint: "Um dump bruto de SRAM de 32.768 bytes de Mario Tennis (USA). Nada é enviado.",
    mtDropButton: "Escolher arquivo",
    mtDropLabel: "Escolha um arquivo de save do Mario Tennis, ou arraste um até aqui",

    // inspector
    mtInspector: "INSPETOR DO SAVE",
    mtStateLabel: "ESTADO",
    mtPlayersLabel: "PERFIS",
    mtCounterLabel: "CONTADOR",
    mtChecksumLabel: "CHECKSUMS",
    mtChkAllOk: "TUDO OK",
    mtChkBad: "{n} RUIM",
    mtStateLocked: "TRANCADO",
    mtStateUnlocked: "LIBERADO",
    mtStatePartial: "PARCIAL",
    mtNoteLocked: "O conteúdo de N64 ainda não está liberado neste save.",
    mtNoteUnlocked: "Yoshi, Wario, Waluigi e Bowser já estão disponíveis.",
    mtNotePartial: "Estado aplicado pela metade — qualquer ação corrige.",

    // checksum audit
    mtAuditToggle: "Auditoria de checksum — salvo vs calculado",
    mtAuditCount: "{audited} / {total}",
    mtAuditCaption: "Registros do diretório nas duas metades do save, com checksum salvo e recalculado.",
    mtAuditNote:
      "Um save liberado sempre mostra uma divergência: o registro 0x110 na metade de backup. O bloco de transferência é escrito só na metade primária — é o que o próprio jogo faz, e todo cartucho liberado por hardware audita igual.",
    mtColHalf: "METADE",
    mtColRec: "REG",
    mtColAddr: "ENDER",
    mtColSize: "TAM",
    mtColStored: "SALVO",
    mtColComputed: "CALCULADO",
    mtColOk: "OK",

    // actions
    mtBtnUnlock: "DESBLOQUEAR N64",
    mtBtnRemove: "Remover desbloqueio",
    mtBtnReset: "Limpar",
    mtBtnDownload: "Baixar save corrigido",
    mtHintUnlocked: "Já está liberado — nada a aplicar.",
    mtHintLocked: "Nada a remover — este save está trancado.",
    mtHintIdle: "Carregue um save para habilitar estas ações.",

    // side panels
    mtUnlocksTitle: "O QUE DESBLOQUEIA",
    mtUnlocksMinigames: "4 minigames do N64",
    mtReqTitle: "REQUISITOS",
    mtReq1: "Mario Tennis (USA) de Game Boy Color",
    mtReq2: "Um .sav bruto de exatamente 32.768 bytes",
    mtReq3: "Sem suporte: cartuchos EUR/JPN, save states (.st, .sgm), arquivos compactados",

    // how to use
    mtHowEyebrow: "COMO USAR ▸ 4 PASSOS",
    mtHowTitle: "Do arquivo de save ao elenco completo",
    mtStep1Title: "Pegue seu save",
    mtStep1Body:
      'No emulador, o .sav fica ao lado da ROM (mGBA, BGB, SameBoy). No cartucho real, faça o dump com um GB Operator, GBxCart RW ou similar — a opção de "backup save".',
    mtStep2Title: "Solte aqui",
    mtStep2Body:
      "O arquivo é lido localmente e verificado: tamanho exato, o cabeçalho Camelot nas duas metades e um diretório coerente. Se algo parecer errado, a ferramenta recusa em vez de adivinhar.",
    mtStep3Title: "Desbloqueie",
    mtStep3Body:
      "Treze bytes mudam, espelhados na metade primária e na de backup, mais o bloco de transferência de 512 bytes que o lado do N64 escreveria. Contador de saves e perfis ficam intactos.",
    mtStep4Title: "Devolva ao lugar",
    mtStep4Body:
      "Baixe o arquivo corrigido, guarde o original como backup e substitua. No próximo boot, Yoshi, Wario, Waluigi e Bowser aparecem na seleção — e os minigames estão liberados.",

    // why
    mtWhyEyebrow: "POR QUE ISSO EXISTE",
    mtWhyTitle: "Conteúdo trancado atrás de hardware que ninguém tem",
    mtWhyP1:
      "Para desbloquear esses quatro personagens do jeito oficial você precisa de um N64, do cartucho de Mario Tennis de N64, de um Transfer Pak e do cartucho de GBC — os quatro, ao mesmo tempo. Não existe código de cheat, e os relançamentos nunca corrigiram isso. Para quase todo mundo, o conteúdo é inalcançável.",
    mtWhyP2:
      "Então o formato do save foi reverso — não havia documentação em lugar nenhum — e o patch foi verificado contra três dumps de cartuchos reais. A saída do desbloqueio é byte a byte idêntica à de uma sessão real de Transfer Pak, e a remoção restaura o original byte a byte.",

    // under the hood
    mtBytesEyebrow: "POR DENTRO",
    mtBytesLead: "Para os curiosos — este é o diff inteiro:",
    mtBytesOffset: "OFFSET",
    mtBytesWhat: "O QUE É",
    mtBytesValue: "VALOR",
    mtByte1: "bitmask de personagens N64",
    mtByte2: "flag de transferência concluída",
    mtByte3: "registro do diretório em uso",
    mtByte4: "checksum do registro",
    mtByte5: "bloco de transferência (512 B)",
    mtBytesFoot:
      "Cada marcador é espelhado na metade de backup em 0x2000. Contadores de save, blocos de perfil e os registros sem checksum a partir de 0x3C0 nunca são escritos.",

    // faq
    mtFaqEyebrow: "BOM SABER",
    mtFaq1Q: "Dá para desfazer?",
    mtFaq1A:
      'Sim. "Remover desbloqueio" reverte o patch e gera um save idêntico ao anterior, byte a byte. Também repara um estado "parcial" aplicado pela metade.',
    mtFaq2Q: "Funciona em cartucho real?",
    mtFaq2A:
      "Sim — a saída foi verificada byte a byte contra um desbloqueio real via Transfer Pak. Grave o .sav corrigido de volta com seu flasher.",
    mtFaq3Q: "Vai corromper meu progresso?",
    mtFaq3A:
      "Ele só mexe nos marcadores de desbloqueio do N64 e na área de transferência. Mesmo assim: guarde uma cópia do arquivo original antes de sobrescrever.",

    // errors
    mtErrBadSize: "Tamanho de arquivo inválido",
    mtErrBadSizeMsg: "Era esperado um .sav de 32.768 bytes. Save states e arquivos compactados não funcionam.",
    mtErrBadMagic: "Não é um save de Mario Tennis (USA)",
    mtErrBadMagicMsg: "O cabeçalho Camelot não está lá. Esta ferramenta só suporta a versão americana.",
    mtErrBadDirectory: "Estrutura do save corrompida",
    mtErrBadDirectoryMsg: "O diretório do save não parece correto, então a ferramenta se recusa a mexer nele.",
    mtErrRead: "Não foi possível ler o arquivo",
    mtErrReadMsg: "Seu navegador não conseguiu ler esse arquivo. Tente selecioná-lo de novo.",
    mtErrTransfer: "Dados inesperados na área de transferência",
    mtErrTransferMsg:
      "Algo já ocupa o bloco de transferência do N64. Recusando o patch em vez de arriscar seu save.",
    mtErrLib: "O núcleo do patcher não carregou",
    mtErrLibMsg: "Recarregue a página. Se continuar falhando, a ferramenta não roda a partir de um arquivo local.",
    mtErrUnknown: "Algo deu errado",
    mtErrUnknownMsg: "O patch não foi aplicado. Seu arquivo carregado está inalterado.",

    // success
    mtOkUnlocked: "Conteúdo de N64 liberado",
    mtOkUnlockedMsg: "Baixe o save corrigido abaixo e coloque no lugar do original.",
    mtOkRestored: "Desbloqueio removido",
    mtOkRestoredMsg: "O save voltou ao estado anterior, byte a byte.",

    // machine status
    mtStatusIdle: "AGUARDANDO ARQUIVO",
    mtStatusLoaded: "ARQUIVO CARREGADO",
    mtStatusPatched: "PATCH APLICADO",
    mtStatusError: "RECUSADO",

    mtFooterLegal:
      "Ferramenta de fã · Mario Tennis © Nintendo/Camelot. Sem afiliação. Roda inteiramente no seu navegador — nenhum arquivo é enviado."
  }
};
