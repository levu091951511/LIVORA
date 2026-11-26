export async function compressImageFile(
  file: File,
  maxDimension = 960,
  quality = 0.72
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc tệp ảnh'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Định dạng ảnh không hợp lệ'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function formatVnd(amount: number, hidden = false): string {
  if (hidden) return '•••••• ₫';
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(amount))} ₫`;
}

export function parseQuickAmountVnd(text: string): number | undefined {
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(k|nghin|nghìn|tr|trieu|triệu|d|đ)\b/i);
  if (!match) return undefined;
  const num = parseFloat(match[1].replace(',', '.'));
  const unit = match[2].toLowerCase();
  if (unit === 'k' || unit === 'nghin' || unit === 'nghìn') {
    return Math.round(num * 1000);
  }
  if (unit === 'tr' || unit === 'trieu' || unit === 'triệu') {
    return Math.round(num * 1000000);
  }
  return Math.round(num);
}
