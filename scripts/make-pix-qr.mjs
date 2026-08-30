/* ===========================================================================
   Generate the Pix QR shown in the donate section.

   Runs LOCALLY and rarely — the output lands in web/assets/, which is
   gitignored and lives on R2 (see scripts/publish-assets.mjs). Without this
   script the PNG's provenance would be unrecoverable: nobody could tell which
   Pix key a committed-nowhere image actually encodes.

   What it writes is a *static* Pix BR Code: the EMV®/QRCPS payload the Central
   Bank specifies for a reusable, amount-less transfer. A banking app scans it,
   reads the key out of merchant account field 26, and opens its transfer
   screen with the amount left for the payer to type.

   Requires the `qrencode` CLI (Debian/Ubuntu: apt install qrencode).

   Usage:
     node scripts/make-pix-qr.mjs
     node scripts/make-pix-qr.mjs --key=someone@example.com --name="JANE DOE" --city=RECIFE
   =========================================================================== */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "web", "assets", "pix-qr.png");

const DEFAULTS = {
  key: "erick.tmr@outlook.com",
  // Fields 59/60 are mandatory in the spec and shown by some apps on the
  // confirmation screen. They do not route the money — the key in field 26
  // does — but they must be present, ASCII, and within their length caps.
  name: "ERICK TAKESHI",
  city: "SAO PAULO"
};

/** One EMV TLV: two-digit id, two-digit length, value. */
const tlv = (id, value) => id + String(value.length).padStart(2, "0") + value;

/**
 * CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF), which the Pix spec fixes as
 * the checksum in field 63. It covers the whole payload *including* the "6304"
 * header of the field it ends up in, so the caller appends that first.
 */
function crc16(payload) {
  let crc = 0xffff;
  for (const byte of Buffer.from(payload, "ascii")) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Strip accents and anything outside printable ASCII, upper-case, and clamp to
 * the field's cap. Accented bytes are what most often makes a reader reject an
 * otherwise valid payload.
 */
const field = (text, max) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7e]/g, "")
    .toUpperCase()
    .trim()
    .slice(0, max);

/** The full static BR Code payload for `key`. */
export function pixPayload({ key, name, city }) {
  const body =
    tlv("00", "01") + // payload format indicator
    tlv("01", "11") + // static: the code is reusable and carries no amount
    tlv("26", tlv("00", "br.gov.bcb.pix") + tlv("01", key)) +
    tlv("52", "0000") + // merchant category: none
    tlv("53", "986") + // currency: BRL
    tlv("58", "BR") +
    tlv("59", field(name, 25)) +
    tlv("60", field(city, 15)) +
    tlv("62", tlv("05", "***")); // txid: unset, the payer's app fills it in
  const unchecked = body + "6304";
  return unchecked + crc16(unchecked);
}

/** Read --key=… --name=… --city=… off argv, falling back to DEFAULTS. */
function options(argv) {
  const opts = { ...DEFAULTS };
  for (const arg of argv) {
    const match = arg.match(/^--(key|name|city)=(.*)$/);
    if (match) opts[match[1]] = match[2];
  }
  return opts;
}

async function main() {
  const opts = options(process.argv.slice(2));
  const payload = pixPayload(opts);

  // -s 8 with the spec's 4-module quiet zone lands around 400px, which stays
  // crisp at 2x on the 186px panel. M correction survives the scanline overlay
  // the panel paints over the image.
  await execFileAsync("qrencode", [
    "-o", OUT,
    "-s", "8",
    "-m", "4",
    "-l", "M",
    "--foreground=08130D",
    "--background=E8F2E6",
    "--", payload
  ]);

  console.log(`Pix key : ${opts.key}`);
  console.log(`Payload : ${payload}`);
  console.log(`Written : ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
