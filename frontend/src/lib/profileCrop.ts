import type { Area } from "react-easy-crop";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", () => reject(new Error("Failed to load image")));
    img.src = src;
  });
}

const MAX_OUTPUT_SIZE = 900;

export const PROFILE_CROP_ASPECT = 1;

/**
 * Crop image to a square profile picture and export as JPEG blob.
 */
export async function getCroppedProfileImageBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  let outW = Math.round(pixelCrop.width);
  let outH = Math.round(pixelCrop.height);
  if (outW > MAX_OUTPUT_SIZE) {
    const scale = MAX_OUTPUT_SIZE / outW;
    outW = MAX_OUTPUT_SIZE;
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
        else reject(new Error("Failed to create cropped image"));
      },
      "image/jpeg",
      0.9
    );
  });
}
