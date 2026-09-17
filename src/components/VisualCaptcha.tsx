'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { RefreshCw, Volume2 } from 'lucide-react';

interface VisualCaptchaProps {
  code: string;
  onRefresh: () => void;
  className?: string;
}

export default function VisualCaptcha({ code, onRefresh, className = '' }: VisualCaptchaProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const drawCaptcha = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 1. Clear background
    ctx.clearRect(0, 0, width, height);

    // 2. Background gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#0f172a'); // slate-900
    gradient.addColorStop(1, '#1e293b'); // slate-800
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 3. Draw random noise background dots
    for (let i = 0; i < 35; i++) {
      ctx.fillStyle = `rgba(${Math.floor(Math.random() * 200 + 55)}, ${Math.floor(
        Math.random() * 200 + 55
      )}, ${Math.floor(Math.random() * 200 + 55)}, ${Math.random() * 0.4 + 0.1})`;
      ctx.beginPath();
      ctx.arc(
        Math.random() * width,
        Math.random() * height,
        Math.random() * 2.5 + 0.5,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // 4. Draw random background disturbance lines
    const colors = ['#f59e0b', '#38bdf8', '#34d399', '#f43f5e', '#fbbf24', '#a78bfa'];
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = colors[i % colors.length] + '55';
      ctx.lineWidth = Math.random() * 1.5 + 1;
      ctx.beginPath();
      ctx.moveTo(Math.random() * width * 0.2, Math.random() * height);
      ctx.bezierCurveTo(
        Math.random() * width,
        Math.random() * height,
        Math.random() * width,
        Math.random() * height,
        width - Math.random() * width * 0.2,
        Math.random() * height
      );
      ctx.stroke();
    }

    // 5. Draw distorted characters
    const chars = code.split('');
    const charSpacing = width / (chars.length + 1);

    chars.forEach((char, index) => {
      ctx.save();
      const x = (index + 0.8) * charSpacing;
      const y = height / 2 + Math.random() * 6 - 3;

      // Random rotation (-25 to +25 degrees)
      const angle = ((Math.random() * 40 - 20) * Math.PI) / 180;
      ctx.translate(x, y);
      ctx.rotate(angle);

      // Character font & styling
      const fontFamilies = ['Arial', 'Verdana', 'Trebuchet MS', 'Courier New', 'Georgia'];
      const chosenFont = fontFamilies[Math.floor(Math.random() * fontFamilies.length)];
      const fontSize = Math.floor(Math.random() * 6) + 24; // 24-29px
      ctx.font = `bold ${fontSize}px ${chosenFont}`;

      // Pick high-contrast vivid colors (amber, gold, white, cyan, emerald)
      const charColors = ['#fbbf24', '#fef08a', '#38bdf8', '#4ade80', '#f97316', '#ffffff'];
      ctx.fillStyle = charColors[index % charColors.length];
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(char, 0, 0);

      ctx.restore();
    });

    // 6. Draw foreground strike-through disturbance wave line
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)'; // amber
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(4, height / 2 + (Math.random() * 10 - 5));
    ctx.quadraticCurveTo(
      width / 2,
      height / 2 + (Math.random() * 20 - 10),
      width - 4,
      height / 2 + (Math.random() * 10 - 5)
    );
    ctx.stroke();
  }, [code]);

  useEffect(() => {
    drawCaptcha();
  }, [drawCaptcha]);

  const speakCaptcha = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      // Speak each character separately with clear announcement of capital/small letters
      const spokenParts = code.split('').map((char) => {
        if (/[A-Z]/.test(char)) return `capital ${char}`;
        if (/[a-z]/.test(char)) return `small ${char}`;
        return char;
      });
      const textToSpeak = spokenParts.join(' , ');
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 0.8;
      utterance.pitch = 1.0;
      window.speechSynthesis.cancel(); // cancel previous
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Captcha Canvas Box */}
      <div 
        className="rounded-xl overflow-hidden shadow-inner border border-slate-700 bg-slate-900 inline-flex items-center select-none"
        title="Security Captcha (NTA Examination Standard)"
      >
        <canvas
          ref={canvasRef}
          width={150}
          height={44}
          className="block cursor-pointer"
          onClick={onRefresh}
        />
      </div>

      {/* Action Buttons: Refresh & Audio */}
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={onRefresh}
          className="p-1.5 text-slate-500 hover:text-gurukul-navy hover:bg-slate-100 rounded-lg border border-slate-200 transition"
          title="Change Security PIN / Captcha"
          aria-label="Refresh Captcha"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={speakCaptcha}
          className="p-1.5 text-slate-500 hover:text-gurukul-navy hover:bg-slate-100 rounded-lg border border-slate-200 transition"
          title="Listen to Captcha Audio"
          aria-label="Audio Captcha"
        >
          <Volume2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
