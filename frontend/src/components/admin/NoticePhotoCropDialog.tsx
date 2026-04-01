import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { NOTICE_CROP_ASPECT, getCroppedNoticeImageBlob } from "@/lib/noticeCrop";
import { toast } from "@/hooks/use-toast";

type Props = {
  open: boolean;
  imageSrc: string | null;
  onOpenChange: (open: boolean) => void;
  /** Returns the cropped file ready to attach to the form */
  onCropped: (file: File) => void;
};

export function NoticePhotoCropDialog({ open, imageSrc, onOpenChange, onCropped }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (open && imageSrc) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setCroppedAreaPixels(null);
    }
  }, [open, imageSrc]);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleApply = async () => {
    if (!imageSrc || !croppedAreaPixels) {
      toast({ title: "Crop not ready", description: "Wait for the image to load then try again.", variant: "destructive" });
      return;
    }
    setWorking(true);
    try {
      const blob = await getCroppedNoticeImageBlob(imageSrc, croppedAreaPixels);
      const file = new File([blob], "notice-image.jpg", { type: "image/jpeg" });
      onCropped(file);
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Crop failed",
        description: e instanceof Error ? e.message : "Could not process image.",
        variant: "destructive",
      });
    } finally {
      setWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-xl"
        onInteractOutside={(e) => e.stopPropagation()}
        onEscapeKeyDown={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Crop notice image
            <Badge variant="outline" className="text-[10px] font-normal">16 : 9</Badge>
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Drag to reposition · use zoom to fill the frame. The cropped image will be used in both
          the notice card thumbnail and the full detail view.
        </p>

        {/* Crop canvas */}
        <div className="relative h-[min(54vh,340px)] w-full overflow-hidden rounded-lg bg-muted">
          {imageSrc ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={NOTICE_CROP_ASPECT}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              showGrid
              cropShape="rect"
            />
          ) : null}
        </div>

        {/* Controls */}
        <div className="space-y-3 px-1">
          <div className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-xs text-muted-foreground">Zoom</span>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.02}
              onValueChange={(v) => setZoom(v[0] ?? 1)}
              className="flex-1"
            />
            <span className="w-10 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
              {zoom.toFixed(1)}×
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-xs text-muted-foreground">Rotate</span>
            <Slider
              value={[rotation]}
              min={-45}
              max={45}
              step={1}
              onValueChange={(v) => setRotation(v[0] ?? 0)}
              className="flex-1"
            />
            <span className="w-10 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
              {rotation > 0 ? `+${rotation}` : rotation}°
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => { setRotation(0); setZoom(1); setCrop({ x: 0, y: 0 }); }}
            disabled={working}
          >
            Reset
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={working}>
            Cancel
          </Button>
          <Button type="button" onClick={handleApply} disabled={working || !imageSrc}>
            {working ? "Processing…" : "Apply crop"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
