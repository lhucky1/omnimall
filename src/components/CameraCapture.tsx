
"use client";

import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Camera, RefreshCcw, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aspectRatio?: number;
}

const videoConstraints = {
  width: 1280,
  height: 720,
  facingMode: 'user',
};

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, open, onOpenChange, aspectRatio = 16/9 }) => {
  const webcamRef = useRef<Webcam>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const { toast } = useToast();

  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      setImgSrc(imageSrc);
    }
  }, [webcamRef]);

  const handleConfirm = useCallback(async () => {
    if (imgSrc) {
      const blob = await fetch(imgSrc).then(res => res.blob());
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      onCapture(file);
      handleClose();
    }
  }, [imgSrc, onCapture]);

  const handleRetake = () => {
    setImgSrc(null);
  };
  
  const handleClose = () => {
      setImgSrc(null);
      setIsCameraReady(false);
      onOpenChange(false);
  }
  
  const handleUserMedia = () => {
      setIsCameraReady(true);
  }

  const handleUserMediaError = (error: any) => {
    console.error("Webcam error:", error);
    toast({
        title: "Camera Error",
        description: "Could not access the camera. Please check permissions and ensure it's not in use by another app.",
        variant: "destructive"
    });
    handleClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>Capture Photo</DialogTitle>
        </DialogHeader>
        <div className="relative w-full" style={{ aspectRatio }}>
            {!imgSrc ? (
              <>
                 {!isCameraReady && (
                     <div className="absolute inset-0 flex items-center justify-center bg-secondary">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <p className="ml-2">Starting camera...</p>
                    </div>
                )}
                <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={videoConstraints}
                    className="w-full h-full object-cover"
                    onUserMedia={handleUserMedia}
                    onUserMediaError={handleUserMediaError}
                    mirrored={videoConstraints.facingMode === 'user'}
                />
              </>
            ) : (
              <img src={imgSrc} alt="Captured" className="w-full h-full object-contain" />
            )}
        </div>
        <DialogFooter className="p-4 border-t">
          {imgSrc ? (
            <div className="w-full flex justify-between">
              <Button variant="outline" onClick={handleRetake}><RefreshCcw className="mr-2"/> Retake</Button>
              <Button onClick={handleConfirm}><Check className="mr-2"/> Confirm</Button>
            </div>
          ) : (
            <div className="w-full flex justify-between">
                <DialogClose asChild>
                    <Button type="button" variant="ghost"><X className="mr-2"/>Cancel</Button>
                </DialogClose>
                 <Button onClick={capture} disabled={!isCameraReady}><Camera className="mr-2"/> Capture Photo</Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CameraCapture;
