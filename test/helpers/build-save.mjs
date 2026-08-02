/* ===========================================================================
   Synthetic Mario Tennis (GBC, USA) save fixtures for tests.

   Built independently of web/js/tools/mario-tennis/save-format.js on purpose:
   these encode the format spec by hand so the tests validate the lib against
   the spec, not against itself. Real cartridge dumps contain personal data
   and are never committed; an env-gated suite covers them locally.
   =========================================================================== */

const SAVE_SIZE = 0x8000;
const HALF = 0x2000;
const MAGIC = "CAMELOTGBTENNIS\0";

function sum16(bytes, start, length) {
  let sum = 0;
  for (let i = start; i < start + length; i++) sum = (sum + bytes[i]) & 0xffff;
  return sum;
}

function writeAscii(bytes, at, text) {
  for (let i = 0; i < text.length; i++) bytes[at + i] = text.charCodeAt(i);
}

function writeRecord(bytes, at, { used, table, addr, size, sum }) {
  bytes[at] = used ? 0x01 : 0x00;
  bytes[at + 1] = table;
  bytes[at + 2] = addr & 0xff;
  bytes[at + 3] = addr >> 8;
  bytes[at + 4] = size & 0xff;
  bytes[at + 5] = size >> 8;
  bytes[at + 6] = sum & 0xff;
  bytes[at + 7] = sum >> 8;
}

/** Sentinel bytes of the type-02 record at 0x3C0: patches must never touch them. */
export const TYPE02_SENTINEL = [0x01, 0x02, 0x00, 0x00, 0x00, 0x03, 0x48, 0x16];

/**
 * A structurally valid locked save: magic + directory + used profile block
 * with correct checksum in both halves, transfer area zero, no N64 markers.
 */
export function buildLockedSave({ names = ["ERICK", "TESTER"], counter = 0x3137 } = {}) {
  const bytes = new Uint8Array(SAVE_SIZE);
  for (const base of [0x0000, HALF]) {
    writeAscii(bytes, base + 0x20, MAGIC);
    bytes[base + 0x30] = counter & 0xff;
    bytes[base + 0x31] = counter >> 8;

    writeAscii(bytes, base + 0x800, names[0]);
    writeAscii(bytes, base + 0x840, names[1]);
    bytes[base + 0x80b] = 0x02;
    bytes[base + 0x84b] = 0x03;
    const profileSum = sum16(bytes, base + 0x800, 0x300);

    writeRecord(bytes, base + 0x60, { used: true, table: 0, addr: 0x0800, size: 0x0300, sum: profileSum });
    writeRecord(bytes, base + 0x110, { used: false, table: 0, addr: 0x1800, size: 0x0200, sum: 0 });
    writeRecord(bytes, base + 0x210, { used: true, table: 1, addr: 0x0800, size: 0x0300, sum: profileSum });
    TYPE02_SENTINEL.forEach((value, i) => { bytes[base + 0x3c0 + i] = value; });
  }
  return bytes;
}

/**
 * Locked base plus the exact unlock bytes, written from the spec by hand.
 * The transfer block goes in both halves: each half's record checksums its
 * own copy, so a block in the primary alone leaves the backup storing 0x01C9
 * for an empty area.
 */
export function buildUnlockedSave(options) {
  const bytes = buildLockedSave(options);
  for (const base of [0x0000, HALF]) {
    bytes[base + 0x41] = 0x3c;
    bytes[base + 0x47] = 0x02;
    bytes[base + 0x110] = 0x01;
    bytes[base + 0x116] = 0xc9;
    bytes[base + 0x117] = 0x01;
    bytes[base + 0x1800] = 0xed;
    bytes[base + 0x1801] = 0xd5;
    bytes[base + 0x1959] = 0x07;
  }
  return bytes;
}

/** Markers applied to the primary half only: a half-applied unlock. */
export function buildPartialSave(options) {
  const bytes = buildLockedSave(options);
  bytes[0x41] = 0x3c;
  bytes[0x47] = 0x02;
  bytes[0x110] = 0x01;
  bytes[0x116] = 0xc9;
  bytes[0x117] = 0x01;
  return bytes;
}

export function truncate(bytes) {
  return bytes.slice(0, SAVE_SIZE - 1);
}

export function smashMagic(bytes, half = 0) {
  const out = new Uint8Array(bytes);
  out[(half ? HALF : 0) + 0x25] = 0x58;
  return out;
}

export function smashDirectory(bytes) {
  const out = new Uint8Array(bytes);
  out[0x63] = 0x09;
  return out;
}

export function dirtyTransfer(bytes) {
  const out = new Uint8Array(bytes);
  out[0x18f0] = 0xaa;
  return out;
}
