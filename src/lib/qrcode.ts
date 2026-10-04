// src/lib/qrcode.ts
//
// Dependency-free QR Code encoder (byte mode only — plenty for a
// verification URL). This sandbox cannot reach the npm registry to add a
// "qrcode" package (see README), so rather than hand-derive the QR spec's
// Reed-Solomon/mask-pattern math from scratch and risk a subtle bug in
// something meant to be scanned by real phones, this is a straight,
// faithful port of the well-known, MIT-licensed "QRCode for JavaScript"
// by Kazuhiko Arase (http://www.d-project.com/, since 2009) — the same
// implementation vendored inside npm's own qrcode-terminal dependency,
// so it's already battle-tested across a huge number of scanners. Ported
// to TypeScript and consolidated into one file; the encoding algorithm
// itself (Galois-field math, polynomial division, mask scoring, module
// placement) is unchanged from the original, just re-typed.
//
// Original copyright (c) 2009 Kazuhiko Arase, MIT licensed:
//   http://www.opensource.org/licenses/mit-license.php
// "QR Code" is a registered trademark of DENSO WAVE INCORPORATED.
//
// Verified against OpenCV's independent QRCodeDetector (round-tripped
// several representative verify-URLs through generateQrMatrix() ->
// rendered PNG -> cv2.QRCodeDetector().detectAndDecode() and confirmed
// the decoded text matches byte-for-byte) before this was wired into any
// certificate.

export type ErrorCorrectLevel = "L" | "M" | "Q" | "H";

// Two DIFFERENT numbering schemes for error-correction level, both from the
// original vendor code, and easy to conflate (an earlier draft of this file
// did, and it silently produced undecodable QR codes — caught by decoding
// the output against an independent decoder, see the file-level comment):
//
// 1) FORMAT_INFO_BITS — the 2-bit EC-level field embedded in a QR symbol's
//    format info (ISO/IEC 18004): L=01, M=00, Q=11, H=10. This exact value
//    goes straight into setupTypeInfo()'s `(ecLevel << 3) | maskPattern`.
// 2) RS_BLOCK_ROW_OFFSET — the RS_BLOCK_TABLE below is laid out with a
//    fixed L, M, Q, H row order per version (4 rows/version) that has
//    nothing to do with the format-info bit values above; it's just the
//    order the spec's table happens to list them in.
//
// Using FORMAT_INFO_BITS to index RS_BLOCK_TABLE (or vice versa) picks the
// wrong error-correction block structure while the format info still
// truthfully advertises the level you asked for — every structural
// pattern (finder/timing/alignment) still looks right, but no compliant
// decoder can read the data, which is exactly the failure mode a visual
// glance at the module grid won't catch.
const FORMAT_INFO_BITS: Record<ErrorCorrectLevel, number> = { M: 0, L: 1, H: 2, Q: 3 };
const RS_BLOCK_ROW_OFFSET: Record<ErrorCorrectLevel, number> = { L: 0, M: 1, Q: 2, H: 3 };

// --- Galois field GF(256) tables ------------------------------------------

const EXP_TABLE = new Array<number>(256);
const LOG_TABLE = new Array<number>(256);
for (let i = 0; i < 8; i++) EXP_TABLE[i] = 1 << i;
for (let i = 8; i < 256; i++) {
  EXP_TABLE[i] = EXP_TABLE[i - 4]! ^ EXP_TABLE[i - 5]! ^ EXP_TABLE[i - 6]! ^ EXP_TABLE[i - 8]!;
}
for (let i = 0; i < 255; i++) LOG_TABLE[EXP_TABLE[i]!] = i;

function glog(n: number): number {
  if (n < 1) throw new Error(`glog(${n})`);
  return LOG_TABLE[n]!;
}
function gexp(n: number): number {
  while (n < 0) n += 255;
  while (n >= 256) n -= 255;
  return EXP_TABLE[n]!;
}

// --- Polynomial arithmetic over GF(256) -----------------------------------

class QrPolynomial {
  num: number[];
  constructor(num: number[], shift: number) {
    let offset = 0;
    while (offset < num.length && num[offset] === 0) offset++;
    this.num = new Array(num.length - offset + shift).fill(0);
    for (let i = 0; i < num.length - offset; i++) this.num[i] = num[i + offset]!;
  }
  get(index: number): number {
    return this.num[index]!;
  }
  getLength(): number {
    return this.num.length;
  }
  multiply(e: QrPolynomial): QrPolynomial {
    const num = new Array(this.getLength() + e.getLength() - 1).fill(0);
    for (let i = 0; i < this.getLength(); i++) {
      for (let j = 0; j < e.getLength(); j++) {
        num[i + j] ^= gexp(glog(this.get(i)) + glog(e.get(j)));
      }
    }
    return new QrPolynomial(num, 0);
  }
  mod(e: QrPolynomial): QrPolynomial {
    if (this.getLength() - e.getLength() < 0) return this;
    const ratio = glog(this.get(0)) - glog(e.get(0));
    const num = new Array(this.getLength()).fill(0);
    for (let i = 0; i < this.getLength(); i++) num[i] = this.get(i);
    for (let x = 0; x < e.getLength(); x++) num[x] ^= gexp(glog(e.get(x)) + ratio);
    return new QrPolynomial(num, 0).mod(e);
  }
}

function getErrorCorrectPolynomial(errorCorrectLength: number): QrPolynomial {
  let a = new QrPolynomial([1], 0);
  for (let i = 0; i < errorCorrectLength; i++) {
    a = a.multiply(new QrPolynomial([1, gexp(i)], 0));
  }
  return a;
}

// --- Bit buffer ------------------------------------------------------------

class QrBitBuffer {
  buffer: number[] = [];
  length = 0;
  get(index: number): boolean {
    const bufIndex = Math.floor(index / 8);
    return (((this.buffer[bufIndex] ?? 0) >>> (7 - (index % 8))) & 1) === 1;
  }
  put(num: number, length: number): void {
    for (let i = 0; i < length; i++) {
      this.putBit(((num >>> (length - i - 1)) & 1) === 1);
    }
  }
  getLengthInBits(): number {
    return this.length;
  }
  putBit(bit: boolean): void {
    const bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) this.buffer.push(0);
    if (bit) this.buffer[bufIndex]! |= 0x80 >>> this.length % 8;
    this.length++;
  }
}

// --- RS block table (ISO/IEC 18004 Annex, versions 1-40 x L/M/Q/H) --------

// Each row: [count, totalCount, dataCount, count2?, totalCount2?, dataCount2?]
const RS_BLOCK_TABLE: number[][] = [
  [1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9],
  [1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16],
  [1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13],
  [1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9],
  [1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12],
  [2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15],
  [2, 98, 78], [4, 49, 31], [2, 32, 14, 4, 33, 15], [4, 39, 13, 1, 40, 14],
  [2, 121, 97], [2, 60, 38, 2, 61, 39], [4, 40, 18, 2, 41, 19], [4, 40, 14, 2, 41, 15],
  [2, 146, 116], [3, 58, 36, 2, 59, 37], [4, 36, 16, 4, 37, 17], [4, 36, 12, 4, 37, 13],
  [2, 86, 68, 2, 87, 69], [4, 69, 43, 1, 70, 44], [6, 43, 19, 2, 44, 20], [6, 43, 15, 2, 44, 16],
  [4, 101, 81], [1, 80, 50, 4, 81, 51], [4, 50, 22, 4, 51, 23], [3, 36, 12, 8, 37, 13],
  [2, 116, 92, 2, 117, 93], [6, 58, 36, 2, 59, 37], [4, 46, 20, 6, 47, 21], [7, 42, 14, 4, 43, 15],
  [4, 133, 107], [8, 59, 37, 1, 60, 38], [8, 44, 20, 4, 45, 21], [12, 33, 11, 4, 34, 12],
  [3, 145, 115, 1, 146, 116], [4, 64, 40, 5, 65, 41], [11, 36, 16, 5, 37, 17], [11, 36, 12, 5, 37, 13],
  [5, 109, 87, 1, 110, 88], [5, 65, 41, 5, 66, 42], [5, 54, 24, 7, 55, 25], [11, 36, 12],
  [5, 122, 98, 1, 123, 99], [7, 73, 45, 3, 74, 46], [15, 43, 19, 2, 44, 20], [3, 45, 15, 13, 46, 16],
  [1, 135, 107, 5, 136, 108], [10, 74, 46, 1, 75, 47], [1, 50, 22, 15, 51, 23], [2, 42, 14, 17, 43, 15],
  [5, 150, 120, 1, 151, 121], [9, 69, 43, 4, 70, 44], [17, 50, 22, 1, 51, 23], [2, 42, 14, 19, 43, 15],
  [3, 141, 113, 4, 142, 114], [3, 70, 44, 11, 71, 45], [17, 47, 21, 4, 48, 22], [9, 39, 13, 16, 40, 14],
  [3, 135, 107, 5, 136, 108], [3, 67, 41, 13, 68, 42], [15, 54, 24, 5, 55, 25], [15, 43, 15, 10, 44, 16],
  [4, 144, 116, 4, 145, 117], [17, 68, 42], [17, 50, 22, 6, 51, 23], [19, 46, 16, 6, 47, 17],
  [2, 139, 111, 7, 140, 112], [17, 74, 46], [7, 54, 24, 16, 55, 25], [34, 37, 13],
  [4, 151, 121, 5, 152, 122], [4, 75, 47, 14, 76, 48], [11, 54, 24, 14, 55, 25], [16, 45, 15, 14, 46, 16],
  [6, 147, 117, 4, 148, 118], [6, 73, 45, 14, 74, 46], [11, 54, 24, 16, 55, 25], [30, 46, 16, 2, 47, 17],
  [8, 132, 106, 4, 133, 107], [8, 75, 47, 13, 76, 48], [7, 54, 24, 22, 55, 25], [22, 45, 15, 13, 46, 16],
  [10, 142, 114, 2, 143, 115], [19, 74, 46, 4, 75, 47], [28, 50, 22, 6, 51, 23], [33, 46, 16, 4, 47, 17],
  [8, 152, 122, 4, 153, 123], [22, 73, 45, 3, 74, 46], [8, 53, 23, 26, 54, 24], [12, 45, 15, 28, 46, 16],
  [3, 147, 117, 10, 148, 118], [3, 73, 45, 23, 74, 46], [4, 54, 24, 31, 55, 25], [11, 45, 15, 31, 46, 16],
  [7, 146, 116, 7, 147, 117], [21, 73, 45, 7, 74, 46], [1, 53, 23, 37, 54, 24], [19, 45, 15, 26, 46, 16],
  [5, 145, 115, 10, 146, 116], [19, 75, 47, 10, 76, 48], [15, 54, 24, 25, 55, 25], [23, 45, 15, 25, 46, 16],
  [13, 145, 115, 3, 146, 116], [2, 74, 46, 29, 75, 47], [42, 54, 24, 1, 55, 25], [23, 45, 15, 28, 46, 16],
  [17, 145, 115], [10, 74, 46, 23, 75, 47], [10, 54, 24, 35, 55, 25], [19, 45, 15, 35, 46, 16],
  [17, 145, 115, 1, 146, 116], [14, 74, 46, 21, 75, 47], [29, 54, 24, 19, 55, 25], [11, 45, 15, 46, 46, 16],
  [13, 145, 115, 6, 146, 116], [14, 74, 46, 23, 75, 47], [44, 54, 24, 7, 55, 25], [59, 46, 16, 1, 47, 17],
  [12, 151, 121, 7, 152, 122], [12, 75, 47, 26, 76, 48], [39, 54, 24, 14, 55, 25], [22, 45, 15, 41, 46, 16],
  [6, 151, 121, 14, 152, 122], [6, 75, 47, 34, 76, 48], [46, 54, 24, 10, 55, 25], [2, 45, 15, 64, 46, 16],
  [17, 152, 122, 4, 153, 123], [29, 74, 46, 14, 75, 47], [49, 54, 24, 10, 55, 25], [24, 45, 15, 46, 46, 16],
  [4, 152, 122, 18, 153, 123], [13, 74, 46, 32, 75, 47], [48, 54, 24, 14, 55, 25], [42, 45, 15, 32, 46, 16],
  [20, 147, 117, 4, 148, 118], [40, 75, 47, 7, 76, 48], [43, 54, 24, 22, 55, 25], [10, 45, 15, 67, 46, 16],
  [19, 148, 118, 6, 149, 119], [18, 75, 47, 31, 76, 48], [34, 54, 24, 34, 55, 25], [20, 45, 15, 61, 46, 16],
];

interface RsBlock {
  totalCount: number;
  dataCount: number;
}

function getRSBlocks(typeNumber: number, rsRowOffset: number): RsBlock[] {
  const row = RS_BLOCK_TABLE[(typeNumber - 1) * 4 + rsRowOffset];
  if (!row) throw new Error(`bad rs block @ typeNumber:${typeNumber}/rsRowOffset:${rsRowOffset}`);
  const list: RsBlock[] = [];
  const groups = row.length / 3;
  for (let i = 0; i < groups; i++) {
    const count = row[i * 3 + 0]!;
    const totalCount = row[i * 3 + 1]!;
    const dataCount = row[i * 3 + 2]!;
    for (let j = 0; j < count; j++) list.push({ totalCount, dataCount });
  }
  return list;
}

// --- Alignment pattern positions, BCH format/version info -----------------

const PATTERN_POSITION_TABLE: number[][] = [
  [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42],
  [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66],
  [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86],
  [6, 34, 62, 90], [6, 28, 50, 72, 94], [6, 26, 50, 74, 98], [6, 30, 54, 78, 102],
  [6, 28, 54, 80, 106], [6, 32, 58, 84, 110], [6, 30, 58, 86, 114], [6, 34, 62, 90, 118],
  [6, 26, 50, 74, 98, 122], [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130],
  [6, 30, 56, 82, 108, 134], [6, 34, 60, 86, 112, 138], [6, 30, 58, 86, 114, 142],
  [6, 34, 62, 90, 118, 146], [6, 30, 54, 78, 102, 126, 150], [6, 24, 50, 76, 102, 128, 154],
  [6, 28, 54, 80, 106, 132, 158], [6, 32, 58, 84, 110, 136, 162], [6, 26, 54, 82, 110, 138, 166],
  [6, 30, 58, 86, 114, 142, 170],
];

const G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
const G18 =
  (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
const G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);

function getBCHDigit(data: number): number {
  let digit = 0;
  while (data !== 0) {
    digit++;
    data >>>= 1;
  }
  return digit;
}
function getBCHTypeInfo(data: number): number {
  let d = data << 10;
  while (getBCHDigit(d) - getBCHDigit(G15) >= 0) {
    d ^= G15 << (getBCHDigit(d) - getBCHDigit(G15));
  }
  return ((data << 10) | d) ^ G15_MASK;
}
function getBCHTypeNumber(data: number): number {
  let d = data << 12;
  while (getBCHDigit(d) - getBCHDigit(G18) >= 0) {
    d ^= G18 << (getBCHDigit(d) - getBCHDigit(G18));
  }
  return (data << 12) | d;
}

function getMask(maskPattern: number, i: number, j: number): boolean {
  switch (maskPattern) {
    case 0:
      return (i + j) % 2 === 0;
    case 1:
      return i % 2 === 0;
    case 2:
      return j % 3 === 0;
    case 3:
      return (i + j) % 3 === 0;
    case 4:
      return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
    case 5:
      return ((i * j) % 2) + ((i * j) % 3) === 0;
    case 6:
      return (((i * j) % 2) + ((i * j) % 3)) % 2 === 0;
    case 7:
      return (((i * j) % 3) + ((i + j) % 2)) % 2 === 0;
    default:
      throw new Error(`bad maskPattern:${maskPattern}`);
  }
}

function getLengthInBits(type: number): number {
  // Byte mode only.
  if (type < 10) return 8;
  return 16;
}

// --- Data -> codewords -------------------------------------------------

function createData(typeNumber: number, rsRowOffset: number, dataBytes: number[]): number[] {
  const rsBlocks = getRSBlocks(typeNumber, rsRowOffset);
  const buffer = new QrBitBuffer();

  // Mode indicator: 0100 = byte mode.
  buffer.put(0b0100, 4);
  buffer.put(dataBytes.length, getLengthInBits(typeNumber));
  for (const b of dataBytes) buffer.put(b, 8);

  let totalDataCount = 0;
  for (const b of rsBlocks) totalDataCount += b.dataCount;

  if (buffer.getLengthInBits() > totalDataCount * 8) {
    throw new Error(`code length overflow. (${buffer.getLengthInBits()}>${totalDataCount * 8})`);
  }

  if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) buffer.put(0, 4);
  while (buffer.getLengthInBits() % 8 !== 0) buffer.putBit(false);

  const PAD0 = 0xec;
  const PAD1 = 0x11;
  while (buffer.getLengthInBits() < totalDataCount * 8) {
    buffer.put(PAD0, 8);
    if (buffer.getLengthInBits() >= totalDataCount * 8) break;
    buffer.put(PAD1, 8);
  }

  return createBytes(buffer, rsBlocks);
}

function createBytes(buffer: QrBitBuffer, rsBlocks: RsBlock[]): number[] {
  let offset = 0;
  let maxDcCount = 0;
  let maxEcCount = 0;

  const dcdata: number[][] = new Array(rsBlocks.length);
  const ecdata: number[][] = new Array(rsBlocks.length);

  for (let r = 0; r < rsBlocks.length; r++) {
    const dcCount = rsBlocks[r]!.dataCount;
    const ecCount = rsBlocks[r]!.totalCount - dcCount;
    maxDcCount = Math.max(maxDcCount, dcCount);
    maxEcCount = Math.max(maxEcCount, ecCount);

    dcdata[r] = new Array(dcCount);
    for (let i = 0; i < dcdata[r]!.length; i++) dcdata[r]![i] = 0xff & (buffer.buffer[i + offset] ?? 0);
    offset += dcCount;

    const rsPoly = getErrorCorrectPolynomial(ecCount);
    const rawPoly = new QrPolynomial(dcdata[r]!, rsPoly.getLength() - 1);
    const modPoly = rawPoly.mod(rsPoly);

    ecdata[r] = new Array(rsPoly.getLength() - 1);
    for (let x = 0; x < ecdata[r]!.length; x++) {
      const modIndex = x + modPoly.getLength() - ecdata[r]!.length;
      ecdata[r]![x] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
    }
  }

  let totalCodeCount = 0;
  for (const b of rsBlocks) totalCodeCount += b.totalCount;

  const data = new Array<number>(totalCodeCount);
  let index = 0;
  for (let z = 0; z < maxDcCount; z++) {
    for (let s = 0; s < rsBlocks.length; s++) {
      if (z < dcdata[s]!.length) data[index++] = dcdata[s]![z]!;
    }
  }
  for (let z = 0; z < maxEcCount; z++) {
    for (let s = 0; s < rsBlocks.length; s++) {
      if (z < ecdata[s]!.length) data[index++] = ecdata[s]![z]!;
    }
  }
  return data;
}

// --- Module matrix assembly -------------------------------------------

class QrCodeBuilder {
  typeNumber: number;
  formatInfoBits: number; // for setupTypeInfo() — the spec's format-info EC-level bits
  rsRowOffset: number; // for getRSBlocks()/createData() — RS_BLOCK_TABLE's row order
  moduleCount = 0;
  modules: (boolean | null)[][] = [];

  constructor(typeNumber: number, formatInfoBits: number, rsRowOffset: number) {
    this.typeNumber = typeNumber;
    this.formatInfoBits = formatInfoBits;
    this.rsRowOffset = rsRowOffset;
  }

  isDark(row: number, col: number): boolean {
    return !!this.modules[row]![col];
  }

  private setupPositionProbePattern(row: number, col: number): void {
    for (let r = -1; r <= 7; r++) {
      if (row + r <= -1 || this.moduleCount <= row + r) continue;
      for (let c = -1; c <= 7; c++) {
        if (col + c <= -1 || this.moduleCount <= col + c) continue;
        const dark =
          (0 <= r && r <= 6 && (c === 0 || c === 6)) ||
          (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
          (2 <= r && r <= 4 && 2 <= c && c <= 4);
        this.modules[row + r]![col + c] = dark;
      }
    }
  }

  private setupTimingPattern(): void {
    for (let r = 8; r < this.moduleCount - 8; r++) {
      if (this.modules[r]![6] !== null) continue;
      this.modules[r]![6] = r % 2 === 0;
    }
    for (let c = 8; c < this.moduleCount - 8; c++) {
      if (this.modules[6]![c] !== null) continue;
      this.modules[6]![c] = c % 2 === 0;
    }
  }

  private setupPositionAdjustPattern(): void {
    const pos = PATTERN_POSITION_TABLE[this.typeNumber - 1] ?? [];
    for (const row0 of pos) {
      for (const col0 of pos) {
        if (this.modules[row0]![col0] !== null) continue;
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            const dark = Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0);
            this.modules[row0 + r]![col0 + c] = dark;
          }
        }
      }
    }
  }

  private setupTypeNumber(test: boolean): void {
    const bits = getBCHTypeNumber(this.typeNumber);
    for (let i = 0; i < 18; i++) {
      const mod = !test && ((bits >> i) & 1) === 1;
      this.modules[Math.floor(i / 3)]![(i % 3) + this.moduleCount - 8 - 3] = mod;
    }
    for (let x = 0; x < 18; x++) {
      const mod = !test && ((bits >> x) & 1) === 1;
      this.modules[(x % 3) + this.moduleCount - 8 - 3]![Math.floor(x / 3)] = mod;
    }
  }

  private setupTypeInfo(test: boolean, maskPattern: number): void {
    const data = (this.formatInfoBits << 3) | maskPattern;
    const bits = getBCHTypeInfo(data);

    for (let v = 0; v < 15; v++) {
      const mod = !test && ((bits >> v) & 1) === 1;
      if (v < 6) this.modules[v]![8] = mod;
      else if (v < 8) this.modules[v + 1]![8] = mod;
      else this.modules[this.moduleCount - 15 + v]![8] = mod;
    }
    for (let h = 0; h < 15; h++) {
      const mod = !test && ((bits >> h) & 1) === 1;
      if (h < 8) this.modules[8]![this.moduleCount - h - 1] = mod;
      else if (h < 9) this.modules[8]![15 - h - 1 + 1] = mod;
      else this.modules[8]![15 - h - 1] = mod;
    }
    this.modules[this.moduleCount - 8]![8] = !test;
  }

  private mapData(data: number[], maskPattern: number): void {
    let inc = -1;
    let row = this.moduleCount - 1;
    let bitIndex = 7;
    let byteIndex = 0;

    for (let col = this.moduleCount - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        for (let c = 0; c < 2; c++) {
          if (this.modules[row]![col - c] === null) {
            let dark = false;
            if (byteIndex < data.length) {
              dark = (((data[byteIndex] ?? 0) >>> bitIndex) & 1) === 1;
            }
            const mask = getMask(maskPattern, row, col - c);
            if (mask) dark = !dark;
            this.modules[row]![col - c] = dark;
            bitIndex--;
            if (bitIndex === -1) {
              byteIndex++;
              bitIndex = 7;
            }
          }
        }
        row += inc;
        if (row < 0 || this.moduleCount <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }
  }

  private makeImpl(test: boolean, maskPattern: number, dataCache: number[]): void {
    this.moduleCount = this.typeNumber * 4 + 17;
    this.modules = new Array(this.moduleCount);
    for (let row = 0; row < this.moduleCount; row++) {
      this.modules[row] = new Array(this.moduleCount).fill(null);
    }

    this.setupPositionProbePattern(0, 0);
    this.setupPositionProbePattern(this.moduleCount - 7, 0);
    this.setupPositionProbePattern(0, this.moduleCount - 7);
    this.setupPositionAdjustPattern();
    this.setupTimingPattern();
    this.setupTypeInfo(test, maskPattern);
    if (this.typeNumber >= 7) this.setupTypeNumber(test);
    this.mapData(dataCache, maskPattern);
  }

  private getLostPoint(): number {
    const moduleCount = this.moduleCount;
    let lostPoint = 0;

    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        let sameCount = 0;
        const dark = this.isDark(row, col);
        for (let r = -1; r <= 1; r++) {
          if (row + r < 0 || moduleCount <= row + r) continue;
          for (let c = -1; c <= 1; c++) {
            if (col + c < 0 || moduleCount <= col + c) continue;
            if (r === 0 && c === 0) continue;
            if (dark === this.isDark(row + r, col + c)) sameCount++;
          }
        }
        if (sameCount > 5) lostPoint += 3 + sameCount - 5;
      }
    }

    for (let row = 0; row < moduleCount - 1; row++) {
      for (let col = 0; col < moduleCount - 1; col++) {
        let count = 0;
        if (this.isDark(row, col)) count++;
        if (this.isDark(row + 1, col)) count++;
        if (this.isDark(row, col + 1)) count++;
        if (this.isDark(row + 1, col + 1)) count++;
        if (count === 0 || count === 4) lostPoint += 3;
      }
    }

    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount - 6; col++) {
        if (
          this.isDark(row, col) &&
          !this.isDark(row, col + 1) &&
          this.isDark(row, col + 2) &&
          this.isDark(row, col + 3) &&
          this.isDark(row, col + 4) &&
          !this.isDark(row, col + 5) &&
          this.isDark(row, col + 6)
        ) {
          lostPoint += 40;
        }
      }
    }
    for (let col = 0; col < moduleCount; col++) {
      for (let row = 0; row < moduleCount - 6; row++) {
        if (
          this.isDark(row, col) &&
          !this.isDark(row + 1, col) &&
          this.isDark(row + 2, col) &&
          this.isDark(row + 3, col) &&
          this.isDark(row + 4, col) &&
          !this.isDark(row + 5, col) &&
          this.isDark(row + 6, col)
        ) {
          lostPoint += 40;
        }
      }
    }

    let darkCount = 0;
    for (let col = 0; col < moduleCount; col++) {
      for (let row = 0; row < moduleCount; row++) {
        if (this.isDark(row, col)) darkCount++;
      }
    }
    const ratio = Math.abs((100 * darkCount) / moduleCount / moduleCount - 50) / 5;
    lostPoint += ratio * 10;

    return lostPoint;
  }

  make(dataBytes: number[]): void {
    const dataCache = createData(this.typeNumber, this.rsRowOffset, dataBytes);

    let minLostPoint = 0;
    let bestPattern = 0;
    for (let i = 0; i < 8; i++) {
      this.makeImpl(true, i, dataCache);
      const lostPoint = this.getLostPoint();
      if (i === 0 || minLostPoint > lostPoint) {
        minLostPoint = lostPoint;
        bestPattern = i;
      }
    }
    this.makeImpl(false, bestPattern, dataCache);
  }
}

export interface QrMatrix {
  size: number;
  isDark: (row: number, col: number) => boolean;
}

/**
 * Encodes `text` (as UTF-8/Latin1 bytes — fine for the ASCII verify URLs
 * this is used for) into a QR code module matrix at the smallest version
 * that fits, for the given error-correction level.
 */
export function generateQrMatrix(text: string, ecLevel: ErrorCorrectLevel = "M"): QrMatrix {
  const formatInfoBits = FORMAT_INFO_BITS[ecLevel];
  const rsRowOffset = RS_BLOCK_ROW_OFFSET[ecLevel];
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) bytes.push(text.charCodeAt(i) & 0xff);

  let typeNumber = -1;
  for (let t = 1; t <= 40; t++) {
    const rsBlocks = getRSBlocks(t, rsRowOffset);
    let totalDataCount = 0;
    for (const b of rsBlocks) totalDataCount += b.dataCount;
    const headerBits = 4 + getLengthInBits(t);
    const neededBits = headerBits + bytes.length * 8;
    if (neededBits <= totalDataCount * 8) {
      typeNumber = t;
      break;
    }
  }
  if (typeNumber === -1) {
    throw new Error(`Text too long to encode as a QR code (${bytes.length} bytes).`);
  }

  const builder = new QrCodeBuilder(typeNumber, formatInfoBits, rsRowOffset);
  builder.make(bytes);

  return {
    size: builder.moduleCount,
    isDark: (row, col) => builder.isDark(row, col),
  };
}
