// 업로드 전 클라이언트에서 사진을 축소·재인코딩 — 원본을 그대로 올리면 전송·렌더가 느림.
// 긴 변 maxDim px·JPEG 품질 0.82 로 보통 수백 KB 이하가 됨.
// canvas 미지원/실패 시 원본을 그대로 사용(안전 폴백).
export async function downscaleImage(
  file: File,
  maxDim = 1280,
): Promise<{ blob: Blob; ext: string }> {
  const fallbackExt = (file.name.split(".").pop() || "jpg").toLowerCase();
  // 사진 위주 포맷만 변환 (gif/svg 등은 원본 유지)
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
    // 변환 실패하거나 오히려 더 커지면 원본 사용
    if (!blob || blob.size >= file.size) return { blob: file, ext: fallbackExt };
    return { blob, ext: "jpg" };
  } catch {
    return { blob: file, ext: fallbackExt };
  }
}
