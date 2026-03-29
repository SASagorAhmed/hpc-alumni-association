import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string | null | undefined;
  name: string;
};

/** Full-size profile photo in a modal (directory cards + profile detail). */
export function AlumniPhotoLightbox({ open, onOpenChange, src, name }: Props) {
  const url = src?.trim() || null;
  if (!url) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] max-w-[min(100vw-1rem,52rem)] overflow-hidden border border-border bg-background p-3 shadow-2xl sm:p-4">
        <DialogHeader className="sr-only">
          <DialogTitle>Profile photo — {name}</DialogTitle>
        </DialogHeader>
        <div className="flex max-h-[85vh] items-center justify-center overflow-auto rounded-md bg-muted/30">
          <img
            src={url}
            alt={`${name} — full profile photo`}
            className="max-h-[85vh] w-auto max-w-full object-contain"
            decoding="async"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
