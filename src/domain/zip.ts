/* A tiny zip writer: stored entries, no compression and no dependency. Any computer can open the result. */
const TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export function crc32(bytes: Uint8Array): number { let c = 0xffffffff; for (const b of bytes) c = TABLE[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
export function makeZip(files: { path: string; data: Uint8Array | string }[], when = new Date()): Blob {
  const dosTime = (when.getHours() << 11) | (when.getMinutes() << 5) | (when.getSeconds() >> 1);
  const dosDate = ((Math.max(1980, when.getFullYear()) - 1980) << 9) | ((when.getMonth() + 1) << 5) | when.getDate();
  const enc = new TextEncoder(), parts: Uint8Array[] = [], central: Uint8Array[] = []; let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.path), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data, crc = crc32(data);
    const head = new DataView(new ArrayBuffer(30));
    head.setUint32(0, 0x04034b50, true); head.setUint16(4, 20, true); head.setUint16(6, 0x0800, true); head.setUint16(8, 0, true); head.setUint16(10, dosTime, true); head.setUint16(12, dosDate, true);
    head.setUint32(14, crc, true); head.setUint32(18, data.length, true); head.setUint32(22, data.length, true); head.setUint16(26, name.length, true);
    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true); cd.setUint16(4, 20, true); cd.setUint16(6, 20, true); cd.setUint16(8, 0x0800, true); cd.setUint16(12, dosTime, true); cd.setUint16(14, dosDate, true);
    cd.setUint32(16, crc, true); cd.setUint32(20, data.length, true); cd.setUint32(24, data.length, true); cd.setUint16(28, name.length, true); cd.setUint32(42, offset, true);
    parts.push(new Uint8Array(head.buffer), name, data); central.push(new Uint8Array(cd.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const size = central.reduce((a, b) => a + b.length, 0), end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, size, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)] as BlobPart[], { type: 'application/zip' });
}
/* Reads a zip written by makeZip (stored entries): its files by path, as slices of the original Blob, so nothing big is copied. */
export async function readZip(zip: Blob): Promise<Map<string, Blob>> {
  const out = new Map<string, Blob>(), dec = new TextDecoder();
  if (zip.size < 22) return out;
  const tail = new DataView(await zip.slice(zip.size - 22).arrayBuffer());
  if (tail.getUint32(0, true) !== 0x06054b50) return out;
  const count = tail.getUint16(10, true), cdSize = tail.getUint32(12, true), cdAt = tail.getUint32(16, true);
  const cd = new DataView(await zip.slice(cdAt, cdAt + cdSize).arrayBuffer());
  for (let i = 0, o = 0; i < count; i++) {
    if (cd.getUint32(o, true) !== 0x02014b50) break;
    const size = cd.getUint32(o + 24, true), nameLen = cd.getUint16(o + 28, true), extra = cd.getUint16(o + 30, true), note = cd.getUint16(o + 32, true), local = cd.getUint32(o + 42, true);
    const name = dec.decode(new Uint8Array(cd.buffer, o + 46, nameLen));
    const lh = new DataView(await zip.slice(local, local + 30).arrayBuffer()), start = local + 30 + lh.getUint16(26, true) + lh.getUint16(28, true);
    out.set(name, zip.slice(start, start + size));
    o += 46 + nameLen + extra + note;
  }
  return out;
}
