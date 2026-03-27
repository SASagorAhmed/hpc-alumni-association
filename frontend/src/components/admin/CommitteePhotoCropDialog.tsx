import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";
import { COMMITTEE_PHOTO_CROP_ASPECT, getCroppedCommitteeImageBlob } from "@/lib/committeeCrop";

type Props = {
  open: boolean;
  imageSrc: string | null;
  onOpenChange: (open: boolean) => void;
  onCropped: (blob: Blob) => void | Promise<void>;
  presetLabel: string;
  outputSize: number;
};

export function CommitteePhotoCropDialog({
  open,
  imageSrc,
  onOpenChange,
  onCropped,
  presetLabel,
  outputSize,
}: Props) {
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
      toast({ title: "Crop not ready", description: "Wait for image load and try again.", variant: "destructive" });
      return;
    }
    setWorking(true);
    try {
      const blob = await getCroppedCommitteeImageBlob(imageSrc, croppedAreaPixels, outputSize);
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
          <DialogTitle>Crop committee photo</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Crop as square for `{presetLabel}` card. Export size: {outputSize}x{outputSize}px.
        </p>
        <div className="relative h-[min(52vh,320px)] w-full overflow-hidden rounded-md bg-muted">
          {imageSrc ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={COMMITTEE_PHOTO_CROP_ASPECT}
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
            {working ? "Processing..." : "Apply & upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
