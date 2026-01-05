import { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Download, Check, Link2, QrCode } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface ShareLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobTitle: string;
  slug?: string | null;
}

export const ShareLinkModal = ({
  open,
  onOpenChange,
  jobId,
  jobTitle,
  slug,
}: ShareLinkModalProps) => {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  // Use slug if available, otherwise use jobId
  const linkPath = slug || jobId;
  // Direct application link - clean URL without Supabase references
  const applicationLink = `${window.location.origin}/apply/${linkPath}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(applicationLink);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = applicationLink;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadQR = () => {
    if (!qrRef.current) return;

    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    // Create canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();

    img.onload = () => {
      canvas.width = 512;
      canvas.height = 512;
      
      // White background
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw QR code
      ctx.drawImage(img, 0, 0, 512, 512);

      // Download
      const link = document.createElement("a");
      link.download = `qr-${slug || jobId}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast.success("QR code downloaded!");
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            Share Application Link
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Job Title */}
          <p className="text-sm text-muted-foreground">
            Share this link with candidates to apply for <span className="font-medium text-foreground">{jobTitle || "this position"}</span>
          </p>

          {/* Link Input with Copy */}
          <div className="flex gap-2">
            <Input
              readOnly
              value={applicationLink}
              className="font-mono text-sm"
            />
            <Button
              onClick={handleCopyLink}
              variant={copied ? "default" : "outline"}
              className="shrink-0"
            >
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center gap-4 py-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <QrCode className="w-4 h-4" />
              <span>Scan with phone</span>
            </div>
            <div 
              ref={qrRef}
              className="p-4 bg-white rounded-lg shadow-sm"
            >
              <QRCodeSVG
                value={applicationLink}
                size={180}
                level="H"
                includeMargin
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadQR}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Download QR Code
            </Button>
          </div>

          {/* Slug info */}
          {slug && (
            <p className="text-xs text-muted-foreground text-center">
              Using short URL: <span className="font-mono">/apply/{slug}</span>
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
