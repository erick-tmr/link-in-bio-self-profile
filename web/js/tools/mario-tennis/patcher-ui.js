/* ===========================================================================
   PatcherUI — the DOM adapter between the page and the SavePatcher.

   Responsibility (SRP): wire the page's controls (file picker, dropzone,
   unlock/remove/reset, audit toggle, download) to the SavePatcher, and paint
   its state. It owns the browser-only parts the state machine deliberately
   avoids — FileReader, Blob, object URLs — and nothing else.

   Every visible string is resolved through i18n.t() at render time, so the UI
   subscribes to both patcher.onChange and i18n.onChange. Two redraw paths, as
   in MusicDock: render() for state and copy, _renderAudit() only when the
   report changes — the audit's 30-odd rows are hex, not copy, so a language
   toggle must not rebuild them.
   =========================================================================== */
import {
  auditRows,
  auditSummary,
  checksumLabel,
  errorKeys,
  interpolate,
  machineView,
  outputFileName,
  patchKeys,
  playerLabel,
  stateView
} from "./patcher-format.js";

const REVOKE_DELAY = 2000;

export class PatcherUI {
  /**
   * @param {object} deps
   * @param {import("./save-patcher.js").SavePatcher} deps.patcher
   * @param {import("../../i18n/i18n.js").I18n} deps.i18n
   * @param {Document|HTMLElement} [deps.root]
   */
  constructor({ patcher, i18n, root = document }) {
    this.patcher = patcher;
    this.i18n = i18n;

    this.machine = root.getElementById("mtLed");
    if (!this.machine) return; // not the patcher page — nothing to wire

    this.led = this.machine;
    this.status = root.getElementById("mtStatus");
    this.alert = root.getElementById("mtAlert");
    this.success = root.getElementById("mtSuccess");
    this.noticeTpl = root.getElementById("mtNoticeTpl");

    this.emptyView = root.getElementById("mtEmpty");
    this.loadedView = root.getElementById("mtLoaded");
    this.dropzone = root.getElementById("mtDropzone");
    this.fileInput = root.getElementById("mtFile");

    this.fileName = root.getElementById("mtFileName");
    this.stateText = root.getElementById("mtStateText");
    this.stateNote = root.getElementById("mtStateNote");
    this.players = root.getElementById("mtPlayers");
    this.counter = root.getElementById("mtCounter");
    this.checksum = root.getElementById("mtChecksum");

    this.auditToggle = root.getElementById("mtAuditToggle");
    this.auditPanel = root.getElementById("mtAuditPanel");
    this.auditCaret = root.getElementById("mtAuditCaret");
    this.auditCount = root.getElementById("mtAuditCount");
    this.auditBody = root.getElementById("mtAuditBody");

    this.unlockBtn = root.getElementById("mtUnlock");
    this.removeBtn = root.getElementById("mtRemove");
    this.resetBtn = root.getElementById("mtReset");
    this.actionHint = root.getElementById("mtActionHint");
    this.downloadRow = root.getElementById("mtDownloadRow");
    this.downloadBtn = root.getElementById("mtDownload");
    this.outName = root.getElementById("mtOutName");

    this._auditOpen = false;
    this._lastReport = null;

    this._bind();
    this.patcher.onChange(() => this.render());
    this.i18n.onChange(() => this.render());
    this.render();
  }

  _bind() {
    this.dropzone.addEventListener("click", () => this.fileInput.click());
    this.fileInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) this._load(file);
    });

    // The dropzone is a <button>, so Enter/Space activation and focus come for
    // free; only the drag affordance needs wiring.
    const setDrag = (on) => this.dropzone.classList.toggle("is-drag", on);
    this.dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      setDrag(true);
    });
    this.dropzone.addEventListener("dragenter", (e) => {
      e.preventDefault();
      setDrag(true);
    });
    this.dropzone.addEventListener("dragleave", () => setDrag(false));
    this.dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      setDrag(false);
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) this._load(file);
    });

    this.unlockBtn.addEventListener("click", () => this.patcher.unlock());
    this.removeBtn.addEventListener("click", () => this.patcher.restore());
    this.resetBtn.addEventListener("click", () => {
      this.fileInput.value = "";
      this._auditOpen = false;
      this.patcher.reset();
    });

    this.auditToggle.addEventListener("click", () => {
      this._auditOpen = !this._auditOpen;
      this._paintAuditToggle();
    });

    this.downloadBtn.addEventListener("click", () => this._download());
  }

  /** Read a picked or dropped file and hand the bytes to the state machine. */
  _load(file) {
    const reader = new FileReader();
    reader.onerror = () => this.patcher.failRead(file.name);
    reader.onload = () => this.patcher.loadBytes(file.name, new Uint8Array(reader.result));
    reader.readAsArrayBuffer(file);
  }

  _download() {
    const { bytes, patched, fileName } = this.patcher;
    if (!bytes || !patched) return;

    const url = URL.createObjectURL(new Blob([bytes], { type: "application/octet-stream" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = outputFileName(fileName, patched);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY);
  }

  /** Translate a key, optionally filling {placeholders}. */
  _t(key, vars) {
    const text = this.i18n.t(key) ?? "";
    return vars ? interpolate(text, vars) : text;
  }

  render() {
    const p = this.patcher;

    const machine = machineView(p.phase);
    this.led.dataset.tone = machine.tone;
    this.status.textContent = this._t(machine.statusKey);

    this._paintNotice(this.alert, errorKeys(p.error), "error");
    this._paintNotice(this.success, p.patched ? patchKeys(p.patched) : null, "success", p.patched === "unlocked");

    this.emptyView.hidden = p.loaded;
    this.loadedView.hidden = !p.loaded;
    if (!p.loaded) {
      // Clear rather than leave the previous file's details behind the hidden
      // inspector, so nothing stale can resurface on the next render.
      this._lastReport = null;
      this.fileName.textContent = "";
      this.auditBody.replaceChildren();
      return;
    }

    this.fileName.textContent = p.fileName || "";

    const view = stateView(p.report.state);
    this.stateText.textContent = this._t(view.labelKey);
    this.stateText.dataset.tone = view.tone;
    this.stateNote.textContent = this._t(view.noteKey);

    this.players.textContent = playerLabel(p.report);
    this.counter.textContent = String(p.report.saveCounter);

    const rows = auditRows(p.report);
    const summary = auditSummary(rows);
    const chk = checksumLabel(summary);
    this.checksum.textContent = chk.key ? this._t(chk.key, chk.vars) : chk.text;
    this.checksum.dataset.tone = chk.tone;
    this.auditCount.textContent = summary.audited
      ? this._t("mtAuditCount", { audited: summary.audited, total: summary.total })
      : "";

    // Rebuild rows only when the underlying report changed — a language toggle
    // does not alter a single hex cell.
    if (p.report !== this._lastReport) {
      this._lastReport = p.report;
      this._renderAudit(rows);
    }
    this._paintAuditToggle();

    this.unlockBtn.disabled = !p.canUnlock;
    this.removeBtn.disabled = !p.canRemove;
    this.actionHint.textContent = this._actionHint();

    this.downloadRow.hidden = !p.patched;
    if (p.patched) this.outName.textContent = outputFileName(p.fileName, p.patched);
  }

  /**
   * Why an action is unavailable. `opacity: .34` communicates nothing to a
   * screen reader, so the reason is spelled out.
   */
  _actionHint() {
    const p = this.patcher;
    if (!p.loaded) return this._t("mtHintIdle");
    if (!p.canUnlock) return this._t("mtHintUnlocked");
    if (!p.canRemove) return this._t("mtHintLocked");
    return "";
  }

  /**
   * Fill a live region from the notice template, or empty it. Content is
   * inserted into a region that has existed since first paint, which is what
   * makes role="alert"/"status" announce reliably.
   *
   * @param {HTMLElement} region
   * @param {{titleKey: string, bodyKey: string}|null} keys
   * @param {"error"|"success"} kind
   * @param {boolean} [showRoster]
   */
  _paintNotice(region, keys, kind, showRoster = false) {
    if (!keys) {
      region.replaceChildren();
      return;
    }
    const node = this.noticeTpl.content.cloneNode(true);
    const notice = node.querySelector(".notice");
    notice.classList.add("notice--" + kind);
    notice.querySelector(".notice__badge").textContent = kind === "error" ? "×" : "✓";
    notice.querySelector(".notice__title").textContent = this._t(keys.titleKey);
    notice.querySelector(".notice__body").textContent = this._t(keys.bodyKey);
    notice.querySelector(".notice__roster").hidden = !showRoster;
    region.replaceChildren(node);
  }

  /** @param {ReturnType<typeof auditRows>} rows */
  _renderAudit(rows) {
    const frag = document.createDocumentFragment();
    for (const row of rows) {
      const tr = document.createElement("tr");
      for (const key of ["half", "rec", "addr", "size", "stored", "computed"]) {
        const td = document.createElement("td");
        td.textContent = row[key];
        if (key === "half") td.className = "audit__half";
        tr.appendChild(td);
      }
      const flag = document.createElement("td");
      flag.className = "audit__flag";
      flag.dataset.tone = row.flag;
      flag.textContent = row.flag === "none" ? "-" : row.flag === "ok" ? "OK" : "BAD";
      tr.appendChild(flag);
      frag.appendChild(tr);
    }
    this.auditBody.replaceChildren(frag);
  }

  _paintAuditToggle() {
    this.auditToggle.setAttribute("aria-expanded", String(this._auditOpen));
    this.auditPanel.hidden = !this._auditOpen;
    this.auditCaret.textContent = this._auditOpen ? "▾" : "▸";
  }
}
