import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import {
  Camera,
  CheckSquare,
  Inbox,
  Mic,
  MicOff,
  Receipt,
  Type,
  X,
} from 'lucide-react';
import { CaptureSource } from '../types/life';
import { compressImageFile, formatVnd, parseQuickAmountVnd } from '../utils/imageUtils';

interface QuickCaptureSheetProps {
  isOpen: boolean;
  initialMode: CaptureSource;
  onClose: () => void;
  onSaveToInbox: (payload: {
    source: CaptureSource;
    content: string;
    photo?: string;
    suggestedType: 'task' | 'expense' | 'note';
    suggestedAmount?: number;
  }) => void;
  onConvertToTask: (prefill: { title: string; photo?: string }) => void;
  onConvertToExpense: (prefill: { title: string; amount?: number; photo?: string }) => void;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<{
    0: { transcript: string };
    isFinal: boolean;
  }>;
}

export const QuickCaptureSheet: React.FC<QuickCaptureSheetProps> = ({
  isOpen,
  initialMode,
  onClose,
  onSaveToInbox,
  onConvertToTask,
  onConvertToExpense,
}) => {
  const [mode, setMode] = useState<CaptureSource>(initialMode);
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const nativeListenersRef = useRef<Array<{ remove: () => Promise<void> }>>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setText('');
      setPhoto(undefined);
      setVoiceError(null);
      setListening(false);
    } else {
      try {
        recognitionRef.current?.stop();
        if (Capacitor.isNativePlatform()) {
          void SpeechRecognition.stop();
          void Promise.all(nativeListenersRef.current.map((listener) => listener.remove()));
          nativeListenersRef.current = [];
        }
      } catch {
        // Ignore
      }
      setListening(false);
    }
  }, [isOpen, initialMode]);

  const detectedAmount = useMemo(() => parseQuickAmountVnd(text), [text]);
  const suggestedType: 'task' | 'expense' | 'note' = useMemo(() => {
    if (detectedAmount) return 'expense';
    if (text.trim().length > 0) return 'task';
    return 'note';
  }, [detectedAmount, text]);

  if (!isOpen) return null;

  const removeNativeListeners = async () => {
    await Promise.all(nativeListenersRef.current.map((listener) => listener.remove()));
    nativeListenersRef.current = [];
  };

  const stopVoiceRecording = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await SpeechRecognition.stop();
        await removeNativeListeners();
      } else {
        recognitionRef.current?.stop();
      }
    } catch {
      // The recognition session may already have stopped.
    } finally {
      setListening(false);
    }
  };

  const toggleVoiceRecording = async () => {
    if (listening) {
      await stopVoiceRecording();
      return;
    }

    if (Capacitor.isNativePlatform()) {
      try {
        const { available } = await SpeechRecognition.available();
        if (!available) {
          setVoiceError('Thiết bị chưa hỗ trợ nhận diện giọng nói. Bạn vẫn có thể nhập nội dung bằng tay.');
          return;
        }

        let permission = await SpeechRecognition.checkPermissions();
        if (permission.speechRecognition !== 'granted') {
          permission = await SpeechRecognition.requestPermissions();
        }
        if (permission.speechRecognition !== 'granted') {
          setVoiceError('Bạn chưa cấp quyền micro. Hãy cấp quyền khi được hỏi hoặc bật lại trong Cài đặt ứng dụng.');
          return;
        }

        await removeNativeListeners();
        nativeListenersRef.current = [
          await SpeechRecognition.addListener('partialResults', ({ matches }) => {
            if (matches?.[0]) setText(matches[0]);
          }),
          await SpeechRecognition.addListener('listeningState', ({ status }) => {
            setListening(status === 'started');
          }),
        ];
        setVoiceError(null);
        setListening(true);
        await SpeechRecognition.start({
          language: 'vi-VN',
          maxResults: 1,
          partialResults: true,
          popup: false,
        });
      } catch {
        await stopVoiceRecording();
        setVoiceError('Không thể khởi động micro. Vui lòng kiểm tra quyền micro hoặc thử lại.');
      }
      return;
    }

    const SpeechRec =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance })
        .webkitSpeechRecognition;

    if (!SpeechRec) {
      setVoiceError(
        'Trình duyệt hiện tại chưa hỗ trợ ghi âm trực tiếp. Bạn có thể nhập hoặc dán nội dung vào ô bên dưới.'
      );
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = 'vi-VN';
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (event) => {
        let combined = '';
        for (let i = 0; i < event.results.length; i++) {
          combined += event.results[i][0].transcript + ' ';
        }
        setText(combined.trim());
      };
      rec.onerror = (ev) => {
        setVoiceError(`Không thể thu âm (${ev.error}). Vui lòng kiểm tra quyền micro hoặc nhập tay.`);
        setListening(false);
      };
      rec.onend = () => setListening(false);
      recognitionRef.current = rec;
      setVoiceError(null);
      setListening(true);
      rec.start();
    } catch {
      setVoiceError('Không thể khởi động micro. Vui lòng thử lại hoặc gõ trực tiếp.');
      setListening(false);
    }
  };

  const handlePhotoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      setPhoto(compressed);
    } catch {
      // Ignore
    } finally {
      e.target.value = '';
    }
  };

  const hasContent = Boolean(text.trim() || photo);

  const handleSendToInbox = () => {
    if (!hasContent) return;
    onSaveToInbox({
      source: mode,
      content: text.trim() || (mode === 'image' ? 'Ảnh ghi nhận nhanh' : 'Ghi chú nhanh'),
      photo,
      suggestedType,
      suggestedAmount: detectedAmount,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Ghi nhận nhanh"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Ghi nhận nhanh
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Lưu tức thì vào Hộp thư chờ hoặc chuyển thành việc / chi tiêu
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* 3 Input Mode Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => setMode('text')}
              className={`min-h-[42px] rounded-xl text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors ${
                mode === 'text'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Type className="w-4 h-4" />
              <span>Văn bản</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('voice')}
              className={`min-h-[42px] rounded-xl text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors ${
                mode === 'voice'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>Giọng nói</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('image')}
              className={`min-h-[42px] rounded-xl text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors ${
                mode === 'image'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Hình ảnh</span>
            </button>
          </div>

          {/* Voice Control */}
          {mode === 'voice' && (
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 flex flex-col items-center gap-3 text-center">
              <button
                type="button"
                onClick={toggleVoiceRecording}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                  listening
                    ? 'bg-rose-600 text-white scale-105'
                    : 'bg-slate-900 dark:bg-teal-600 text-white hover:bg-slate-800'
                }`}
                aria-label={listening ? 'Dừng ghi âm' : 'Bắt đầu nói'}
              >
                {listening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {listening
                  ? 'Đang lắng nghe tiếng Việt... Nhấn để dừng'
                  : 'Chạm micro để đọc ghi chú, lịch hẹn hoặc khoản chi'}
              </p>
              {voiceError && (
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  {voiceError}
                </p>
              )}
            </div>
          )}

          {/* Image Capture Control */}
          {mode === 'image' && (
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoPick}
                className="hidden"
              />
              {photo ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                  <img
                    src={photo}
                    alt="Ảnh ghi nhận nhanh"
                    className="w-full max-h-56 object-cover"
                  />
                  <div className="p-2.5 bg-white dark:bg-slate-900 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-medium text-teal-700 dark:text-teal-300"
                    >
                      Chụp ảnh khác
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhoto(undefined)}
                      className="text-xs font-medium text-rose-600 dark:text-rose-400"
                    >
                      Xóa ảnh
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full min-h-[120px] rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950/60 flex flex-col items-center justify-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40"
                >
                  <Camera className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                  <span>Chụp hóa đơn, bảng việc hoặc chọn ảnh từ máy</span>
                </button>
              )}
            </div>
          )}

          {/* Text / Caption Box */}
          <div className="space-y-1.5">
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                mode === 'image'
                  ? 'Mô tả ngắn cho ảnh (VD: Hóa đơn siêu thị 240k, Sửa ống nước...)'
                  : 'Ghi bất kỳ điều gì (VD: Gọi khách hàng 9h sáng mai, Mua cà phê 45k...)'
              }
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 resize-none"
            />
            {detectedAmount && (
              <p className="text-xs text-teal-700 dark:text-teal-300 font-mono-nums">
                Phát hiện số tiền: {formatVnd(detectedAmount)}
              </p>
            )}
          </div>

          {/* 3 Action Choices */}
          <div className="space-y-2 pt-1 pb-safe">
            <button
              type="button"
              disabled={!hasContent}
              onClick={handleSendToInbox}
              className="w-full min-h-[48px] px-4 rounded-2xl bg-slate-900 dark:bg-teal-600 text-white text-sm font-semibold disabled:opacity-40 inline-flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-teal-500 transition-colors"
            >
              <Inbox className="w-4 h-4" />
              <span>Lưu vào Hộp thư chờ xử lý</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!hasContent}
                onClick={() => {
                  onClose();
                  onConvertToTask({
                    title: text.trim() || 'Công việc từ ảnh chụp',
                    photo,
                  });
                }}
                className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 disabled:opacity-40 inline-flex items-center justify-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <CheckSquare className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Tạo việc ngay</span>
              </button>

              <button
                type="button"
                disabled={!hasContent}
                onClick={() => {
                  onClose();
                  onConvertToExpense({
                    title: text.trim() || 'Chi tiêu từ hóa đơn',
                    amount: detectedAmount,
                    photo,
                  });
                }}
                className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 disabled:opacity-40 inline-flex items-center justify-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Receipt className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Tạo chi tiêu</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
