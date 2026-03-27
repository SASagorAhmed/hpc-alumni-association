import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { PROFILE_CROP_ASPECT, getCroppedProfileImageBlob } from "@/lib/profileCrop";
import { toast } from "sonner";

type Props = {
  open: boolean;
  imageSrc: string | null;
  onOpenChange: (open: boolean) => void;
  onCropped: (blob: Blob) => void | Promise<void>;
};

export function ProfilePhotoCropDialog({ open, imageSrc, onOpenChange, onCropped }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (open && imageSrc) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    }
  }, [open, imageSrc]);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const applyCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) {
      toast.error("Crop is not ready yet.");
      return;
    }
    setWorking(true);
    try {
      const blob = await getCroppedProfileImageBlob(imageSrc, croppedAreaPixels);
      await onCropped(blob);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not process image crop");
    } finally {
      setWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Crop profile picture</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Adjust the photo so your face is centered. Registration uses this cropped profile image.
        </p>
        <div className="relative h-[min(52vh,320px)] w-full overflow-hidden rounded-md bg-muted">
          {imageSrc ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={PROFILE_CROP_ASPECT}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              showGrid={false}
            />
          ) : null}
        </div>
        <div className="flex items-center gap-3 px-1">
          <span className="w-10 shrink-0 text-xs text-muted-foreground">Zoom</span>
          <Slider value={[zoom]} min={1} max={3} step={0.02} onValueChange={(v) => setZoom(v[0] ?? 1)} className="flex-1" />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={working}>
            Cancel
          </Button>
          <Button type="button" onClick={applyCrop} disabled={working || !imageSrc}>
            {working ? "Processing..." : "Use cropped photo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
