'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Check, 
  Crop, 
  ShieldCheck, 
  AlertCircle 
} from 'lucide-react';

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string;
  title: string;
  aspectRatio: number; // e.g. 3.5 / 4.5 = 0.7778 for photo, 3.5 / 1.5 = 2.333 for signature
  outputWidth?: number; // e.g. 350
  outputHeight?: number; // e.g. 450
  onCropComplete: (croppedDataUrl: string) => void;
  onClose: () => void;
}

export default function ImageCropperModal({
  isOpen,
  imageSrc,
  title,
  aspectRatio,
  outputWidth = 400,
  outputHeight = 400,
  onCropComplete,
  onClose,
}: ImageCropperModalProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setImageLoaded(false);
      setPreviewUrl(null);
    }
  }, [isOpen, imageSrc]);

  if (!isOpen) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleExecuteCrop = () => {
    if (!imageRef.current || !containerRef.current) return;

    const img = imageRef.current;
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();

    // Box dimensions within the container
    let boxWidth = containerRect.width * 0.85;
    let boxHeight = boxWidth / aspectRatio;

    if (boxHeight > containerRect.height * 0.85) {
      boxHeight = containerRect.height * 0.85;
      boxWidth = boxHeight * aspectRatio;
    }

    const boxX = (containerRect.width - boxWidth) / 2;
    const boxY = (containerRect.height - boxHeight) / 2;

    // Offscreen canvas for cropping
    const targetW = outputWidth || 400;
    const targetH = Math.round(targetW / aspectRatio);

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Fill clean white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetW, targetH);

    // Image position relative to the container centre
    const imgNaturalW = img.naturalWidth;
    const imgNaturalH = img.naturalHeight;

    // Displayed image size
    const imgDisplayW = img.width * scale;
    const imgDisplayH = img.height * scale;

    const imgDisplayX = (containerRect.width - imgDisplayW) / 2 + position.x;
    const imgDisplayY = (containerRect.height - imgDisplayH) / 2 + position.y;

    // Crop box coordinates relative to the displayed image
    const relX = (boxX - imgDisplayX) / imgDisplayW;
    const relY = (boxY - imgDisplayY) / imgDisplayH;
    const relW = boxWidth / imgDisplayW;
    const relH = boxHeight / imgDisplayH;

    // Source rect on natural image
    const sx = relX * imgNaturalW;
    const sy = relY * imgNaturalH;
    const sw = relW * imgNaturalW;
    const sh = relH * imgNaturalH;

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    onCropComplete(croppedDataUrl);
    onClose();
  };

  // Dimensions for crop viewport
  const maxViewWidth = 420;
  const maxViewHeight = 360;
  let viewFrameW = maxViewWidth;
  let viewFrameH = viewFrameW / aspectRatio;
  if (viewFrameH > maxViewHeight) {
    viewFrameH = maxViewHeight;
    viewFrameW = viewFrameH * aspectRatio;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[95vh]">
        {/* Modal Header */}
        <div className="bg-gurukul-navy text-white px-5 py-4 flex items-center justify-between border-b-2 border-amber-500">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base tracking-wide text-white">
                {title}
              </h3>
              <p className="text-[11px] text-amber-300">
                Adjust & crop to match entrance examination upload standards
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Advisory banner */}
        <div className="bg-amber-50 px-5 py-2.5 border-b border-amber-200 text-[11px] text-amber-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>Drag the image to center. Use the slider below to zoom in or out.</span>
        </div>

        {/* Cropping Canvas Viewport */}
        <div className="p-4 flex-1 flex flex-col items-center justify-center bg-slate-100 select-none overflow-hidden">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ width: `${viewFrameW}px`, height: `${viewFrameH}px` }}
            className="relative bg-slate-900 rounded-2xl overflow-hidden shadow-inner border-2 border-slate-300 cursor-grab active:cursor-grabbing flex items-center justify-center"
          >
            {/* Background Image that moves & scales */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop target"
              onLoad={() => setImageLoaded(true)}
              draggable={false}
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                maxWidth: 'none',
                userSelect: 'none',
              }}
              className="pointer-events-none"
            />

            {/* NTA-style Rule of Thirds Crosshair Grid */}
            <div className="absolute inset-0 pointer-events-none border-2 border-amber-400/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.45)]">
              <div className="absolute inset-x-0 top-1/3 border-b border-amber-400/40 border-dashed" />
              <div className="absolute inset-x-0 top-2/3 border-b border-amber-400/40 border-dashed" />
              <div className="absolute inset-y-0 left-1/3 border-r border-amber-400/40 border-dashed" />
              <div className="absolute inset-y-0 left-2/3 border-r border-amber-400/40 border-dashed" />
              
              {/* Corner brackets */}
              <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-white" />
              <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-white" />
              <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-white" />
              <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-white" />
            </div>
          </div>

          {/* Scale & Controls Strip */}
          <div className="w-full max-w-sm mt-4 flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm">
            <button
              type="button"
              onClick={() => setScale((prev) => Math.max(0.4, prev - 0.1))}
              className="p-1 rounded-lg text-slate-600 hover:bg-slate-100 transition"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <input
              type="range"
              min="0.4"
              max="3"
              step="0.05"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="flex-1 accent-amber-500 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
            />

            <button
              type="button"
              onClick={() => setScale((prev) => Math.min(3, prev + 0.1))}
              className="p-1 rounded-lg text-slate-600 hover:bg-slate-100 transition"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition ml-1"
              title="Reset position and zoom"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-white px-5 py-3.5 border-t border-slate-200 flex justify-between items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleExecuteCrop}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-gurukul-navy font-black text-xs rounded-xl shadow-md transition flex items-center gap-1.5 uppercase tracking-wider"
          >
            <Check className="w-4 h-4" />
            <span>Crop &amp; Save</span>
          </button>
        </div>
      </div>
    </div>
  );
}
