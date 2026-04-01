import type { Area } from "react-easy-crop";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", () => reject(new Error("Failed to load image")));
    img.src = src;
  });
}

/** 16:9 — standard article/card image ratio. */
export const NOTICE_CROP_ASPECT = 16 / 9;
export const NOTICE_CROP_ASPECT_STYLE = "16 / 9" as const;

const MAX_OUTPUT_WIDTH = 1280;

/**
 * Crops the image to the pixel rect from react-easy-crop and exports as JPEG.
 * Scales down if wider than MAX_OUTPUT_WIDTH to keep upload size reasonable.
 */
export async function getCroppedNoticeImageBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  let outW = Math.round(pixelCrop.width);
  let outH = Math.round(pixelCrop.height);
  if (outW > MAX_OUTPUT_WIDTH) {
    const scale = MAX_OUTPUT_WIDTH / outW;
    outW = MAX_OUTPUT_WIDTH;
    outH = Math.round(outH * scale);
  }

  canvas.width = outW;
  canvas.height = outH;

  ctx.drawImage(
    image,
    Math.round(pixelCrop.x),
    Math.round(pixelCrop.y),
    Math.round(pixelCrop.width),
    Math.round(pixelCrop.height),
    0,
    0,
    outW,
    outH
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create image blob"));
      },
      "image/jpeg",
      0.88
    );
  });
}
