/* ===========================================================================
   Mario Tennis (GBC, USA) save format — pure byte logic, zero DOM.

   Responsibility (SRP): validate, inspect and patch 32 KiB SRAM dumps of
   Mario Tennis (CGB-BM8E-USA). Knows nothing about files, i18n or the page.
   The UI layer feeds it a Uint8Array and renders whatever it returns.

   Format knowledge (reverse-engineered and verified on real hardware):
   - Two mirrored 8 KiB halves: primary 0x0000, backup 0x2000. Halves may
     legitimately diverge (the game itself writes some data primary-only).
   - Magic "CAMELOTGBTENNIS\0" at 0x20 in each half.
   - Per half: 0x30 u16 save counter (never touched), 0x41 N64 character
     bitmask (0x3C = Yoshi/Wario/Waluigi/Bowser), 0x47 = 0x02 transfer done.
   - Directory of 16-byte records from 0x60:
     [0]=used [1]=table [2:4]=addr LE [4:6]=size LE [6:8]=sum16 LE.
     Record at 0x110 describes the N64 transfer block (0x1800, 0x200 bytes,
     sum 0x01C9). Records from 0x3C0 carry non-checksum values: never touch.
   - Block checksum = plain 16-bit byte sum, stored little-endian.
   - Canonical transfer block: ED D5 at +0x000, 07 at +0x159, rest zero.
   =========================================================================== */

export const SAVE_SIZE = 0x8000;
export const HALF = 0x2000;

export const OFFSETS = {
  magic: 0x20,
  counter: 0x30,
  n64Mask: 0x41,
  transferFlag: 0x47,
  directory: 0x60,
  directoryEnd: 0x3c0,
  n64Record: 0x110,
  profileBlock: 0x800,
  playerName1: 0x800,
  playerName2: 0x840,
  transferBlock: 0x1800
};

export const N64_MASK = 0x3c;
export const TRANSFER_FLAG = 0x02;
export const TRANSFER_SIZE = 0x200;
export const TRANSFER_SUM = 0x01c9;

const MAGIC = "CAMELOTGBTENNIS\0";
const NAME_MAX = 8;

export class PatchError extends Error {
  constructor(code) {
    super(code);
    this.name = "PatchError";
    this.code = code;
  }
}

/** Plain 16-bit byte sum over bytes[start, start + length). */
export function sum16(bytes, start, length) {
  let sum = 0;
  for (let i = start; i < start + length; i++) sum = (sum + bytes[i]) & 0xffff;
  return sum;
}

/** The 0x200-byte N64 transfer block a real Transfer Pak session writes. */
export function canonicalTransferBlock() {
  const block = new Uint8Array(TRANSFER_SIZE);
  block[0x000] = 0xed;
  block[0x001] = 0xd5;
  block[0x159] = 0x07;
  return block;
}

function hasMagic(bytes, base) {
  for (let i = 0; i < MAGIC.length; i++) {
    if (bytes[base + OFFSETS.magic + i] !== MAGIC.charCodeAt(i)) return false;
  }
  return true;
}

/**
 * Strict USA-only structural validation.
 * @returns {{ok: true} | {ok: false, code: "badSize"|"badMagic"|"badDirectory"}}
 */
export function validateSave(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length !== SAVE_SIZE) {
    return { ok: false, code: "badSize" };
  }
  for (const base of [0x0000, HALF]) {
    if (!hasMagic(bytes, base)) return { ok: false, code: "badMagic" };
    const rec = base + OFFSETS.directory;
    if (bytes[rec + 2] !== 0x00 || bytes[rec + 3] !== 0x08) {
      return { ok: false, code: "badDirectory" };
    }
  }
  return { ok: true };
}

function markerState(bytes, base) {
  const marks = [
    [OFFSETS.n64Mask, N64_MASK],
    [OFFSETS.transferFlag, TRANSFER_FLAG],
    [OFFSETS.n64Record, 0x01],
    [OFFSETS.n64Record + 6, TRANSFER_SUM & 0xff],
    [OFFSETS.n64Record + 7, TRANSFER_SUM >> 8]
  ];
  let set = 0;
  let clear = 0;
  for (const [off, value] of marks) {
    if (bytes[base + off] === value) set++;
    else if (bytes[base + off] === 0x00) clear++;
  }
  if (set === marks.length) return "set";
  if (clear === marks.length) return "clear";
  return "mixed";
}

function transferState(bytes, base) {
  const start = base + OFFSETS.transferBlock;
  const canonical = canonicalTransferBlock();
  let allZero = true;
  let isCanonical = true;
  for (let i = 0; i < TRANSFER_SIZE; i++) {
    if (bytes[start + i] !== 0x00) allZero = false;
    if (bytes[start + i] !== canonical[i]) isCanonical = false;
  }
  if (allZero) return "zero";
  if (isCanonical) return "canonical";
  return "dirty";
}

/**
 * @returns {"locked"|"unlocked"|"partial"|"invalid"}
 */
export function detectUnlockState(bytes) {
  if (!validateSave(bytes).ok) return "invalid";
  const primary = markerState(bytes, 0x0000);
  const backup = markerState(bytes, HALF);
  const transfer = transferState(bytes, 0x0000);
  if (primary === "clear" && backup === "clear" && transfer === "zero") return "locked";
  if (primary === "set" && backup === "set" && transfer === "canonical") return "unlocked";
  return "partial";
}

/**
 * Walk one half's directory. Only used records get a checksum audit.
 * @param {0x0000|0x2000} base
 */
export function readRecords(bytes, base) {
  const records = [];
  for (let off = OFFSETS.directory; off < OFFSETS.directoryEnd; off += 16) {
    const at = base + off;
    const used = bytes[at] === 0x01;
    const addr = bytes[at + 2] | (bytes[at + 3] << 8);
    const size = bytes[at + 4] | (bytes[at + 5] << 8);
    if (!used && addr === 0 && size === 0) continue;
    const storedSum = bytes[at + 6] | (bytes[at + 7] << 8);
    const auditable = used && addr + size <= HALF;
    const computedSum = auditable ? sum16(bytes, base + addr, size) : null;
    records.push({
      offset: off,
      used,
      table: bytes[at + 1],
      addr,
      size,
      storedSum,
      computedSum,
      ok: auditable ? computedSum === storedSum : null
    });
  }
  return records;
}

function readName(bytes, start) {
  let name = "";
  for (let i = 0; i < NAME_MAX; i++) {
    const byte = bytes[start + i];
    if (byte === 0x00) break;
    name += byte >= 0x20 && byte < 0x7f ? String.fromCharCode(byte) : "?";
  }
  return name;
}

/** Full report for the inspector panel. */
export function inspectSave(bytes) {
  const state = detectUnlockState(bytes);
  if (state === "invalid") return { state };
  const profileRecord = OFFSETS.directory;
  return {
    state,
    saveCounter: bytes[OFFSETS.counter] | (bytes[OFFSETS.counter + 1] << 8),
    profileSlotUsed: bytes[profileRecord] === 0x01,
    playerNames: [readName(bytes, OFFSETS.playerName1), readName(bytes, OFFSETS.playerName2)],
    records: {
      primary: readRecords(bytes, 0x0000),
      backup: readRecords(bytes, HALF)
    }
  };
}

function writeMarkers(out, base, on) {
  out[base + OFFSETS.n64Mask] = on ? N64_MASK : 0x00;
  out[base + OFFSETS.transferFlag] = on ? TRANSFER_FLAG : 0x00;
  out[base + OFFSETS.n64Record] = on ? 0x01 : 0x00;
  out[base + OFFSETS.n64Record + 6] = on ? TRANSFER_SUM & 0xff : 0x00;
  out[base + OFFSETS.n64Record + 7] = on ? TRANSFER_SUM >> 8 : 0x00;
}

/**
 * Unlock the N64 content: markers in both halves, canonical transfer block in
 * the primary half only (matching what the game itself writes). Idempotent.
 * Never touches save counters, profile blocks or records from 0x3C0.
 * @returns {Uint8Array} a new array; the input is not mutated
 * @throws {PatchError} "badSave" | "transferDirty"
 */
export function applyUnlock(bytes) {
  if (!validateSave(bytes).ok) throw new PatchError("badSave");
  if (transferState(bytes, 0x0000) === "dirty") throw new PatchError("transferDirty");
  const out = new Uint8Array(bytes);
  writeMarkers(out, 0x0000, true);
  writeMarkers(out, HALF, true);
  out.set(canonicalTransferBlock(), OFFSETS.transferBlock);
  return out;
}

/**
 * Reverse the unlock: clear markers and zero the transfer area in both
 * halves. Also repairs "partial" saves back to a clean locked state.
 * @returns {Uint8Array} a new array; the input is not mutated
 * @throws {PatchError} "badSave"
 */
export function removeUnlock(bytes) {
  if (!validateSave(bytes).ok) throw new PatchError("badSave");
  const out = new Uint8Array(bytes);
  for (const base of [0x0000, HALF]) {
    writeMarkers(out, base, false);
    out.fill(0x00, base + OFFSETS.transferBlock, base + OFFSETS.transferBlock + TRANSFER_SIZE);
  }
  return out;
}
