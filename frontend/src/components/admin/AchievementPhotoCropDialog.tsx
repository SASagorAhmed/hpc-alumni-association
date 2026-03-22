import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ACHIEVEMENT_BANNER_CROP_ASPECT, getCroppedAchievementImageBlob } from "@/lib/achievementCrop";
import { toast } from "@/hooks/use-toast";

type Props = {
  open: boolean;
  imageSrc: string | null;
  onOpenChange: (open: boolean) => void;
  onCropped: (blob: Blob) => void | Promise<void>;
};

export function AchievementPhotoCropDialog({ open, imageSrc, onOpenChange, onCropped }: Props) {
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

  const handleApply = async () => {
    if (!imageSrc || !croppedAreaPixels) {
      toast({ title: "Crop not ready", description: "Wait for the image to load, then try again.", variant: "destructive" });
      return;
    }
    setWorking(true);
    try {
      const blob = await getCroppedAchievementImageBlob(imageSrc, croppedAreaPixels);
      await onCropped(blob);
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Crop failed",
        description: e instanceof Error ? e.message : "Could not process image",
        variant: "destructive",
      });
    } finally {
      setWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Crop photo for banner</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Frame the face or subject for the landing page banner. The live banner uses a wide area (8∶5). Drag to reposition,
          use zoom to fit.
        </p>
        <div className="relative h-[min(52vh,320px)] w-full overflow-hidden rounded-md bg-muted">
          {imageSrc ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={ACHIEVEMENT_BANNER_CROP_ASPECT}
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
          <Button type="button" onClick={handleApply} disabled={working || !imageSrc}>
            {working ? "Processing…" : "Apply & upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
