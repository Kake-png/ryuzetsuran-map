import { HttpError } from "@/lib/server-security";

function chunkName(bytes: Uint8Array, offset: number) {
  return String.fromCharCode(...bytes.slice(offset, offset + 4));
}

function read24(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function imageDimensions(name: string, payload: Uint8Array) {
  if (name === "VP8X" && payload.length >= 10) {
    return { width: read24(payload, 4) + 1, height: read24(payload, 7) + 1 };
  }
  if (name === "VP8 " && payload.length >= 10 && payload[3] === 0x9d && payload[4] === 0x01 && payload[5] === 0x2a) {
    return { width: (payload[6] | (payload[7] << 8)) & 0x3fff, height: (payload[8] | (payload[9] << 8)) & 0x3fff };
  }
  if (name === "VP8L" && payload.length >= 5 && payload[0] === 0x2f) {
    return {
      width: 1 + payload[1] + ((payload[2] & 0x3f) << 8),
      height: 1 + (payload[2] >> 6) + (payload[3] << 2) + ((payload[4] & 0x0f) << 10),
    };
  }
  return null;
}

export function sanitizeWebp(input: Uint8Array) {
  if (input.length < 20 || chunkName(input, 0) !== "RIFF" || chunkName(input, 8) !== "WEBP") {
    throw new HttpError(400, "写真ファイルを確認できませんでした。");
  }
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
  if (view.getUint32(4, true) + 8 !== input.length) {
    throw new HttpError(400, "写真ファイルの構造が正しくありません。");
  }
  const retained: Uint8Array[] = [];
  let offset = 12;
  let dimensions: { width: number; height: number } | null = null;
  while (offset + 8 <= input.length) {
    const name = chunkName(input, offset);
    const size = view.getUint32(offset + 4, true);
    const paddedSize = size + (size % 2);
    const end = offset + 8 + paddedSize;
    if (end > input.length) throw new HttpError(400, "写真ファイルの構造が正しくありません。");
    const payload = input.slice(offset + 8, offset + 8 + size);
    dimensions ??= imageDimensions(name, payload);
    if (!["EXIF", "XMP ", "ICCP"].includes(name)) {
      const chunk = input.slice(offset, end);
      if (name === "VP8X" && chunk.length >= 18) {
        chunk[8] &= ~(0x20 | 0x08 | 0x04);
        if ((chunk[8] & 0x02) !== 0) throw new HttpError(400, "アニメーション画像は投稿できません。");
      }
      retained.push(chunk);
    }
    offset = end;
  }
  if (offset !== input.length || !dimensions) throw new HttpError(400, "写真ファイルを確認できませんでした。");
  if (dimensions.width < 1 || dimensions.height < 1 || dimensions.width > 4_000 || dimensions.height > 4_000 || dimensions.width * dimensions.height > 16_000_000) {
    throw new HttpError(400, "写真の縦横サイズが大きすぎます。");
  }
  const length = 12 + retained.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(length);
  output.set(input.slice(0, 12), 0);
  new DataView(output.buffer).setUint32(4, length - 8, true);
  let writeOffset = 12;
  for (const chunk of retained) {
    output.set(chunk, writeOffset);
    writeOffset += chunk.length;
  }
  return output;
}
