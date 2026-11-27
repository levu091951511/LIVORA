import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { DebtEntry, Debtor, Transaction } from '../types/life';
import { compressImageFile, formatVnd, formatVndInput } from '../utils/imageUtils';

interface DebtViewProps {
  debtors: Debtor[];
  debts: DebtEntry[];
  transactions: Transaction[];
  todayIso: string;
  onAddDebtor: (name: string) => void;
  onAddDebt: (debtorId: string, amount: number, note: string) => void;
  onToggleDebt: (id: string) => void;
  onAttachProof: (id: string, photo: string) => void;
  onDeleteDebts: (ids: string[]) => void;
  onDeleteDebtor: (id: string) => void;
  onPreviewProof: (debt: DebtEntry) => void;
}

export const DebtView: React.FC<DebtViewProps> = ({ debtors, debts, transactions, todayIso, onAddDebtor, onAddDebt, onToggleDebt, onAttachProof, onDeleteDebts, onDeleteDebtor, onPreviewProof }) => {
  const [name, setName] = useState(''); const [debtorId, setDebtorId] = useState(''); const [amount, setAmount] = useState(''); const [note, setNote] = useState(''); const [targetProof, setTargetProof] = useState('');
  const [range, setRange] = useState<'day' | 'week' | 'month' | 'custom' | 'all'>('all'); const [customStart, setCustomStart] = useState(todayIso); const [customEnd, setCustomEnd] = useState(todayIso); const [personFilter, setPersonFilter] = useState(''); const [selected, setSelected] = useState<Set<string>>(new Set());
  const visible = useMemo(() => debts.filter((debt) => {
    if (personFilter && debt.debtorId !== personFilter) return false;
    if (range === 'all') return true; if (range === 'day') return debt.date === todayIso;
    if (range === 'week') return debt.date >= new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
    if (range === 'custom') return debt.date >= customStart && debt.date <= customEnd;
    return debt.date.startsWith(todayIso.slice(0, 7));
  }), [debts, range, todayIso, customStart, customEnd, personFilter]);
  const total = visible.filter((debt) => debt.status === 'unpaid').reduce((sum, debt) => sum + debt.amount, 0);
  const [exportStatus, setExportStatus] = useState('');
  const exportExcel = async () => {
    const rows = (selected.size ? visible.filter((debt) => selected.has(debt.id)) : visible).map((debt) => ({ 'Người nợ': debtors.find((person) => person.id === debt.debtorId)?.name || 'Đã xóa', 'Số tiền': debt.amount, Ngày: debt.date, 'Trạng thái': debt.status === 'paid' ? 'Đã trả' : 'Chưa trả', 'Ghi chú': debt.note || '' }));
    if (!rows.length) { setExportStatus('Không có khoản nợ để xuất.'); return; }
    const fileName = `livora-cong-no-${new Date().toISOString().slice(0, 10)}.xlsx`;
    const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), 'Cong no');
    try {
      if (Capacitor.isNativePlatform()) {
        const data = XLSX.write(book, { bookType: 'xlsx', type: 'base64' });
        await Filesystem.writeFile({ path: fileName, data, directory: Directory.Documents, recursive: true });
        const uri = await Filesystem.getUri({ path: fileName, directory: Directory.Documents });
        await Share.share({ title: 'Xuất công nợ Livora', text: 'Tệp Excel công nợ Livora', url: uri.uri, dialogTitle: 'Lưu hoặc gửi tệp Excel' });
        setExportStatus('Đã tạo tệp Excel. Hãy chọn nơi lưu hoặc gửi tệp.');
      } else {
        XLSX.writeFile(book, fileName);
        setExportStatus('Đã tải tệp Excel.');
      }
    } catch { setExportStatus('Không thể tạo tệp Excel. Vui lòng thử lại.'); }
  };
  const attachProof = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file && targetProof) onAttachProof(targetProof, await compressImageFile(file)); e.target.value = ''; setTargetProof(''); };
  const toggleSelected = (id: string) => setSelected((previous) => { const next = new Set(previous); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const clearPersonDebts = () => { const ids = debts.filter((debt) => debt.debtorId === personFilter).map((debt) => debt.id); if (ids.length && window.confirm('Xóa toàn bộ các khoản nợ của người này? Thao tác không thể hoàn tác.')) onDeleteDebts(ids); };
  const removeDebtor = () => { if (personFilter && window.confirm('Xóa người này khỏi danh bạ? Các khoản nợ cũ vẫn được giữ để không sai số liệu.')) { onDeleteDebtor(personFilter); setPersonFilter(''); setSelected(new Set()); } };
  return <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 space-y-3">
    <input type="file" accept="image/*" capture="environment" onChange={attachProof} className="hidden" id="debt-proof-upload" />
    <div className="flex items-center justify-between"><div><h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">Công nợ</h3><p className="text-xs text-slate-500">Còn phải thu: {formatVnd(total)} {total ? '🐱 đang theo dõi' : '🐱 đã xong'}</p></div><button type="button" onClick={() => void exportExcel()} className="text-xs font-semibold text-teal-700 dark:text-teal-300">Xuất Excel{selected.size ? ` (${selected.size})` : ''}</button></div>
    {exportStatus && <p className="text-xs text-teal-700 dark:text-teal-300">{exportStatus}</p>}
    <div className="flex gap-1 overflow-x-auto">{(['day', 'week', 'month', 'custom', 'all'] as const).map((item) => <button key={item} type="button" onClick={() => setRange(item)} className={`px-3 py-1.5 rounded-lg text-xs ${range === item ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>{({ day: 'Ngày', week: 'Tuần', month: 'Tháng', custom: 'Tùy chọn', all: 'Tất cả' } as Record<string, string>)[item]}</button>)}</div>
    {range === 'custom' && <div className="grid grid-cols-2 gap-2"><input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="rounded-xl border border-slate-200 px-2 py-2 text-xs dark:bg-slate-950 dark:border-slate-700" /><input type="date" value={customEnd} min={customStart} onChange={(e) => setCustomEnd(e.target.value)} className="rounded-xl border border-slate-200 px-2 py-2 text-xs dark:bg-slate-950 dark:border-slate-700" /></div>}
    <div className="flex flex-wrap gap-2"><select value={personFilter} onChange={(e) => { setPersonFilter(e.target.value); setSelected(new Set()); }} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs dark:bg-slate-950 dark:border-slate-700"><option value="">Tất cả người nợ</option>{debtors.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select>{personFilter && <><button type="button" onClick={clearPersonDebts} className="rounded-xl bg-rose-50 px-3 text-xs font-semibold text-rose-600">Xóa nợ</button><button type="button" onClick={removeDebtor} className="rounded-xl border border-rose-200 px-3 text-xs font-semibold text-rose-600">Xóa danh bạ</button></>}</div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2"><div className="flex gap-1"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên người nợ mới" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm dark:bg-slate-950 dark:border-slate-700" /><button type="button" onClick={() => { if (name.trim()) { onAddDebtor(name.trim()); setName(''); } }} className="rounded-xl bg-slate-900 px-3 text-xs text-white">Thêm</button></div><div className="flex gap-1"><select value={debtorId} onChange={(e) => setDebtorId(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-2 text-sm dark:bg-slate-950 dark:border-slate-700"><option value="">Chọn người nợ</option>{debtors.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select><input value={amount} onChange={(e) => setAmount(formatVndInput(e.target.value))} inputMode="numeric" placeholder="Số tiền" className="w-24 rounded-xl border border-slate-200 px-2 text-sm dark:bg-slate-950 dark:border-slate-700" /><button type="button" onClick={() => { const value = Number(amount.replace(/[^\d]/g, '')); if (debtorId && value) { onAddDebt(debtorId, value, note); setAmount(''); setNote(''); } }} className="rounded-xl bg-teal-600 px-3 text-xs text-white">Ghi nợ</button></div></div>
    <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú khoản nợ (tùy chọn)" className="w-full min-h-[38px] rounded-xl border border-slate-200 px-3 text-sm dark:bg-slate-950 dark:border-slate-700" />
    <div className="divide-y divide-slate-100 dark:divide-slate-800">{visible.map((debt) => <div key={debt.id} className="py-2 flex items-center gap-2"><input type="checkbox" checked={selected.has(debt.id)} onChange={() => toggleSelected(debt.id)} aria-label="Chọn khoản nợ" /><div className="flex-1"><p className="text-sm font-medium">{debtors.find((person) => person.id === debt.debtorId)?.name || 'Đã xóa'}</p><p className="text-xs text-slate-500">{debt.date} · {debt.note || transactions.find((tx) => tx.id === debt.transactionId)?.title || 'Khoản nợ'}</p></div><span className="font-mono-nums text-sm font-semibold">{formatVnd(debt.amount)}</span>{debt.status === 'paid' && !debt.proofPhoto && <label htmlFor="debt-proof-upload" onClick={() => setTargetProof(debt.id)} className="text-xs text-teal-700 cursor-pointer">Ảnh CK</label>}{debt.proofPhoto && <button type="button" onClick={() => onPreviewProof(debt)} className="text-xs font-semibold text-teal-700">Xem ảnh CK</button>}<button type="button" onClick={() => onToggleDebt(debt.id)} className={`text-xs px-2 py-1 rounded-lg ${debt.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{debt.status === 'paid' ? 'Đã trả' : 'Đánh dấu trả'}</button></div>)}</div>
  </section>;
};
