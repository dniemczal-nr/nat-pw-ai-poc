import zlib from 'zlib';

/**
 * NetReveal batch acquisition envelopes (MinIO batch data interface):
 * `<prefix>/waiting/envelope_<date>.zip` holds `<FEED>_<date>.txt` files (GS-delimited, no header),
 * an empty `envelope_<date>.zip.flag` starts the load, rejected rows come back in
 * `<prefix>/feedback/acq_bad_<date>.zip` as `<FEED>_<date>.txt` + `<FEED>_<date>.txt_reason`.
 */

/** Field separator of the acquisition feeds (ASCII group separator). */
export const FIELD_SEPARATOR = '\x1d';

export const envelopeKey = (prefix: string, date: string) => `${prefix}/waiting/envelope_${date}.zip`;
export const flagKey = (prefix: string, date: string) => `${envelopeKey(prefix, date)}.flag`;
export const feedbackKey = (prefix: string, date: string) => `${prefix}/feedback/acq_bad_${date}.zip`;

/**
 * The day after the latest envelope date found in `waiting/` (processing logs) or `feedback/`:
 * envelopes are loaded in date order, one date each.
 */
export function nextEnvelopeDate(keys: string[]): string {
  const dates = keys.map((key) => /(?:envelope|acq_bad)_(\d{8})\.zip/.exec(key)?.[1]).filter((d): d is string => !!d);
  if (dates.length === 0) throw new Error('No envelope found in the acquisition folders: cannot tell the next envelope date');
  const latest = dates.sort().at(-1)!;
  const next = new Date(Date.UTC(+latest.slice(0, 4), +latest.slice(4, 6) - 1, +latest.slice(6, 8) + 1));
  return next.toISOString().slice(0, 10).replace(/-/g, '');
}

/** One feed file: rows of fields joined by GS, LF between rows, no trailing newline (as UNIQA sends). */
export function feedFile(rows: string[][]): Buffer {
  return Buffer.from(rows.map((fields) => fields.join(FIELD_SEPARATOR)).join('\n'), 'utf8');
}

/** Zip archive with the given files, stored (no compression). */
export function zip(files: Record<string, Buffer>): Buffer {
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const [name, data] of Object.entries(files)) {
    const fileName = Buffer.from(name, 'utf8');
    const crc = zlib.crc32(data);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4); // version needed
    header.writeUInt16LE(0x0800, 6); // UTF-8 names
    header.writeUInt16LE(0, 8); // stored
    header.writeUInt32LE(0, 10); // DOS time/date 0
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(data.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(fileName.length, 26);
    local.push(header, fileName, data);

    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(0x0800, 8);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(data.length, 20);
    entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(fileName.length, 28);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, fileName);
    offset += header.length + fileName.length + data.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}

/** Files of a zip archive (stored or deflated entries), read through its central directory. */
export function unzip(archive: Buffer): Record<string, Buffer> {
  const endAt = archive.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (endAt < 0) throw new Error('Not a zip archive (no end of central directory)');
  const count = archive.readUInt16LE(endAt + 10);
  let at = archive.readUInt32LE(endAt + 16);
  const files: Record<string, Buffer> = {};
  for (let i = 0; i < count; i++) {
    const method = archive.readUInt16LE(at + 10);
    const size = archive.readUInt32LE(at + 20);
    const nameLength = archive.readUInt16LE(at + 28);
    const extraLength = archive.readUInt16LE(at + 30);
    const commentLength = archive.readUInt16LE(at + 32);
    const localAt = archive.readUInt32LE(at + 42);
    const name = archive.subarray(at + 46, at + 46 + nameLength).toString('utf8');
    const dataAt = localAt + 30 + archive.readUInt16LE(localAt + 26) + archive.readUInt16LE(localAt + 28);
    const data = archive.subarray(dataAt, dataAt + size);
    files[name] = method === 8 ? zlib.inflateRawSync(data) : Buffer.from(data);
    at += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}
