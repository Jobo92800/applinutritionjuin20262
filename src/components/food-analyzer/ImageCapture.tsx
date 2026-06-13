import React, { useRef } from 'react';
import { Camera, Upload, Image as ImageIcon } from 'lucide-react';

interface ImageCaptureProps {
  onImageReady: (base64: string, previewUrl: string) => void;
  isAnalyzing: boolean;
}

const MAX_SIZE = 400;
const JPEG_QUALITY = 0.4;

async function resizeToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const tryWithImage = () => {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) {
          if (width > MAX_SIZE) { height = (height * MAX_SIZE) / width; width = MAX_SIZE; }
        } else {
          if (height > MAX_SIZE) { width = (width * MAX_SIZE) / height; height = MAX_SIZE; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
      };
      img.onerror = reject;
      img.src = url;
    };

    if (typeof createImageBitmap !== 'undefined') {
      createImageBitmap(blob)
        .then((bitmap) => {
          const canvas = document.createElement('canvas');
          let { width, height } = bitmap;
          if (width > height) {
            if (width > MAX_SIZE) { height = (height * MAX_SIZE) / width; width = MAX_SIZE; }
          } else {
            if (height > MAX_SIZE) { width = (width * MAX_SIZE) / height; height = MAX_SIZE; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(bitmap, 0, 0, width, height);
          bitmap.close();
          resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
        })
        .catch(tryWithImage);
    } else {
      tryWithImage();
    }
  });
}

async function processFile(file: File): Promise<{ base64: string; previewUrl: string }> {
  let blob: Blob = file;

  const isHeic =
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    file.name.toLowerCase().endsWith('.heic') ||
    file.name.toLowerCase().endsWith('.heif');

  if (isHeic) {
    const heic2any = (await import('heic2any')).default;
    const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.8 });
    blob = Array.isArray(converted) ? converted[0] : converted;
  }

  const base64 = await resizeToBase64(blob);
  const previewUrl = URL.createObjectURL(blob);
  return { base64, previewUrl };
}

export default function ImageCapture({ onImageReady, isAnalyzing }: ImageCaptureProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const { base64, previewUrl } = await processFile(file);
      onImageReady(base64, previewUrl);
    } catch (err) {
      console.error('Error processing image:', err);
      alert('Impossible de traiter cette image. Veuillez réessayer avec un autre format.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <ImageIcon className="w-10 h-10 text-green-600" />
      </div>

      <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Analyser votre repas</h2>
      <p className="text-gray-500 text-center mb-8 max-w-sm">
        Prenez une photo ou importez une image de votre repas pour obtenir une analyse nutritionnelle détaillée.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
        <button
          onClick={() => cameraRef.current?.click()}
          disabled={isAnalyzing}
          className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold shadow-md hover:shadow-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Camera className="w-5 h-5" />
          <span>Prendre une photo</span>
        </button>

        <button
          onClick={() => galleryRef.current?.click()}
          disabled={isAnalyzing}
          className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-white text-gray-700 border-2 border-gray-200 rounded-xl font-semibold hover:border-green-400 hover:bg-green-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="w-5 h-5" />
          <span>Importer</span>
        </button>
      </div>

      <p className="text-xs text-gray-400 mt-4">Formats supportés : JPG, PNG, HEIC (iPhone)</p>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*,.heic,.heif"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
