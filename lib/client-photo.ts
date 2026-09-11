"use client";

async function loadImage(file: File) {
  let objectUrl: string;
  try {
    objectUrl = window.URL.createObjectURL(file);
  } catch {
    throw new Error("この写真をブラウザで読み込めませんでした。");
  }

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const candidate = new Image();
      candidate.onload = () => resolve(candidate);
      candidate.onerror = () => reject(new Error("この画像形式を読み込めませんでした。"));
      candidate.src = objectUrl;
    });
    // iOS Safariではload後すぐにBlob URLを破棄すると、後続のcanvas描画が
    // 不安定になることがあるため、描画が済むまでURLを保持する。
    return { image, release: () => window.URL.revokeObjectURL(objectUrl) };
  } catch (error) {
    window.URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function fileLooksLikeSupportedImage(file: File) {
  const type = file.type.toLowerCase().split(";", 1)[0];
  const extension = file.name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
  return ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"].includes(type)
    || ((!type || type === "application/octet-stream") && ["jpg", "jpeg", "png", "webp", "heic", "heif"].includes(extension));
}

function canvasBlob(canvas: HTMLCanvasElement, type: "image/webp" | "image/jpeg", quality: number) {
  return new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob(resolve, type, quality);
    } catch {
      resolve(null);
    }
  });
}

async function convertPhoto(file: File) {
  if (file.size > 12_000_000) {
    throw new Error("元の写真は12MB以下にしてください。");
  }
  if (!fileLooksLikeSupportedImage(file)) {
    throw new Error("JPEG・PNG・WebP・HEIC形式の写真を選んでください。");
  }

  const { image, release } = await loadImage(file);
  try {
    const maximum = 1800;
    const scale = Math.min(1, maximum / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("写真を安全な形式へ変換できませんでした。");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.84, 0.7, 0.55]) {
      const blob = await canvasBlob(canvas, "image/webp", quality);
      if (blob?.type === "image/webp" && blob.size <= 2_900_000) {
        return new File([blob], "agave-photo.webp", { type: "image/webp" });
      }
    }

    // WebP書き出しが不安定なSafariでも投稿できるよう、canvasで再生成した
    // メタデータなしJPEGへフォールバックする。
    for (const quality of [0.84, 0.7, 0.55]) {
      const blob = await canvasBlob(canvas, "image/jpeg", quality);
      if (blob?.type === "image/jpeg" && blob.size <= 2_900_000) {
        return new File([blob], "agave-photo.jpg", { type: "image/jpeg" });
      }
    }
  } finally {
    release();
  }
  throw new Error("写真を3MB以下に変換できませんでした。別の写真を選んでください。");
}

export async function sanitizePhoto(file: File) {
  try {
    return await convertPhoto(file);
  } catch (error) {
    if (error instanceof Error && /[ぁ-んァ-ヶ一-龠]/.test(error.message)) throw error;
    console.error("Photo preparation failed", error);
    throw new Error("写真を変換できませんでした。別の写真を選ぶか、iOSとChromeを更新してもう一度お試しください。");
  }
}
