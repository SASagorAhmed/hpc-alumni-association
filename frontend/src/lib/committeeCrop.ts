import type { Area } from "react-easy-crop";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", () => reject(new Error("Failed to load image")));
    img.src = src;
  });
}

/**
 * Committee cards use square photo frames in public UI.
 * We export a square JPEG at section-specific pixel sizes.
 */
export async function getCroppedCommitteeImageBlob(
  imageSrc: string,
  pixelCrop: Area,
  outputSize: number
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  const finalSize = Math.max(280, Math.min(1200, Math.round(outputSize)));
  canvas.width = finalSize;
  canvas.height = finalSize;

  ctx.drawImage(
    image,
    Math.round(pixelCrop.x),
    Math.round(pixelCrop.y),
    Math.round(pixelCrop.width),
    Math.round(pixelCrop.height),
    0,
    0,
    finalSize,
    finalSize
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

export const COMMITTEE_PHOTO_CROP_ASPECT = 1;
