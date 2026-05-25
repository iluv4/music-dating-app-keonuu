// 브라우저 전용 이미지 축소. 업로드 전 크기를 줄여 전송 속도·렌더 속도를 함께 개선한다.
// 사진 위주 포맷(jpeg/png/webp)만 변환하고, 그 외(gif/svg 등)나 변환 실패 시 원본을 그대로 반환.
export async function downscaleImage(
  file: File,
  maxDim = 1280,
): Promise<{ blob: Blob; ext: string }> {
  const fallbackExt = (file.name.split(".").pop() || "jpg").toLowerCase();
  if (
    !/^image\/(jpeg|png|webp)$/.test(file.type) ||
    typeof createImageBitmap !== "function"
  ) {
    return { blob: file, ext: fallbackExt };
  }
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { blob: file, ext: fallbackExt };
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.82),
    );
    if (!blob || blob.size >= file.size) return { blob: file, ext: fallbackExt };
    return { blob, ext: "jpg" };
  } catch {
    return { blob: file, ext: fallbackExt };
  }
}
