import React from 'react';
import { X } from 'lucide-react';

interface ImageLightboxModalProps {
  src: string | null;
  caption?: string;
  onClose: () => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  src,
  caption,
  onClose,
}) => {
  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-label={caption || 'Xem ảnh'}
      onClick={onClose}
    >
      <div
        className="relative max-w-2xl w-full bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <p className="text-sm font-medium text-slate-100 truncate">
            {caption || 'Ảnh đính kèm'}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng xem ảnh"
            className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center rounded-xl text-slate-300 hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="bg-black flex items-center justify-center max-h-[75vh]">
          <img
            src={src}
            alt={caption || 'Ảnh đính kèm'}
            referrerPolicy="no-referrer"
            className="max-h-[75vh] w-auto object-contain"
          />
        </div>
      </div>
    </div>
  );
};
