'use client';

import { useEffect, useRef } from 'react';

interface QRCodeCanvasProps {
  value: string;
  size?: number;
}

// Simple QR code component using canvas
// For production, use a proper QR library like 'qrcode'
export function QRCodeCanvas({ value, size = 160 }: QRCodeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Dynamic import of qrcode library
    import('qrcode').then((QRCode) => {
      QRCode.toCanvas(canvas, value, {
        width: size,
        margin: 1,
        color: {
          dark: '#1a1a2e',
          light: '#ffffff',
        },
      });
    }).catch(() => {
      // Fallback: draw placeholder
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = size;
      canvas.height = size;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#1a1a2e';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(value.slice(-10), size / 2, size / 2);
    });
  }, [value, size]);

  return <canvas ref={canvasRef} />;
}
