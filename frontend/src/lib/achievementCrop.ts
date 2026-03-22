import type { Area } from "react-easy-crop";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", () => reject(new Error("Failed to load image")));
    img.src = src;
  });
}

const MAX_OUTPUT_WIDTH = 1400;

/**
 * Crop image to pixel rect from react-easy-crop and export as JPEG blob.
 * Scales down if wider than MAX_OUTPUT_WIDTH for reasonable upload size.
 */
export async function getCroppedAchievementImageBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
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
        else reject(new Error("Failed to create image"));
      },
      "image/jpeg",
      0.9
    );
  });
}

/** Banner spotlight photo panel is ~half width × full height → use a wide crop frame */
export const ACHIEVEMENT_BANNER_CROP_ASPECT = 8 / 5;
