import React, { useMemo, useState } from 'react';
import { useMeeting } from '../context/MeetingContext';
import { useLanguage } from '../context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Plus, Trash2, ArrowUp, ArrowDown, ListTodo, GripVertical } from 'lucide-react';
import { cn } from '../lib/utils';

const sanitizeAgendaTitle = (title: string) =>
  title
    .replace(/^一级\s*[:：]\s*/i, '')
    .replace(/^二级\s*[:：]\s*/i, '')
    .replace(/^\s*[-*•]\s+/, '')
    .replace(/^\s*(?:\d+(?:[.．]\d+)*)(?:[)）.．、:：\s-]+)?/, '')
    .replace(/^\s*(?:第?[一二三四五六七八九十百零]+(?:项|条)?|[一二三四五六七八九十]+)(?:[)）.．、:：\s-]+)?/, '')
    .trim();

type DragInsertPosition = 'before' | 'after' | 'end';

export function AgendaArrangementPage() {
  const { agendaItems, setAgendaItems, setCurrentPage, addMeetingLog } = useMeeting();
  const { t, locale } = useLanguage();
  const [newTitle, setNewTitle] = useState('');
  const [newLevel, setNewLevel] = useState<1 | 2>(1);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [agendaImportInput, setAgendaImportInput] = useState('');
  const [draggingItemId, setDraggingItemId] = useState<number | null>(null);
  const [dragIndicator, setDragIndicator] = useState<{ itemId: number; position: Exclude<DragInsertPosition, 'end'> } | null>(null);
  const [isDraggingToEnd, setIsDraggingToEnd] = useState(false);
  const colon = locale === 'zh' ? '：' : ': ';
  const formatAgendaItem = (item: { level: 1 | 2; title: string }) =>
    `${item.level === 1 ? t('agenda.formatL1') : t('agenda.formatL2')}${colon}${item.title}`;
  const agendaStatusLabel = (s: 'normal' | 'postponed' | 'ended') =>
    s === 'postponed'
      ? t('meeting.agendaStatusPostponed')
      : s === 'ended'
        ? t('meeting.agendaStatusEnded')
        : t('meeting.agendaStatusNormal');

  const handleAdd = () => {
    const cleanedTitle = sanitizeAgendaTitle(newTitle);
    if (!cleanedTitle) {
      alert(t('agenda.alertNeedTitle'));
      return;
    }
    const nextItem = {
      id: Date.now(),
      level: newLevel,
      title: cleanedTitle,
      status: 'normal' as const
    };
    setAgendaItems([
      ...agendaItems,
      nextItem
    ]);
    addMeetingLog('agenda-change', t('log.agendaAddTitle'), formatAgendaItem(nextItem));
    setNewTitle('');
  };

  const handleRemove = (id: number) => {
    const target = agendaItems.find((item) => item.id === id);
    setAgendaItems(agendaItems.filter(item => item.id !== id));
    if (target) {
      addMeetingLog('agenda-change', t('log.agendaRemoveTitle'), formatAgendaItem(target));
    }
  };

  const handleStatusChange = (id: number, status: 'normal' | 'postponed' | 'ended') => {
    const targetIndex = agendaItems.findIndex((item) => item.id === id);
    if (targetIndex === -1) return;

    const targetItem = agendaItems[targetIndex];
    if (targetItem.level === 2) {
      setAgendaItems(
        agendaItems.map((item) =>
          item.id === id
            ? { ...item, status }
            : item
        )
      );
      addMeetingLog(
        'agenda-change',
        t('log.agendaStatusTitle'),
        `${formatAgendaItem(targetItem)} -> ${agendaStatusLabel(status)}`
      );
      return;
    }

    const linkedIds = new Set<number>([id]);
    for (let idx = targetIndex + 1; idx < agendaItems.length; idx += 1) {
      const current = agendaItems[idx];
      if (current.level === 1) break;
      linkedIds.add(current.id);
    }

    setAgendaItems(
      agendaItems.map((item) =>
        linkedIds.has(item.id)
          ? { ...item, status }
          : item
      )
    );
    addMeetingLog(
      'agenda-change',
      t('log.agendaGroupTitle'),
      t('log.agendaGroupDetail', {
        item: formatAgendaItem(targetItem),
        n: linkedIds.size - 1,
        status: agendaStatusLabel(status),
      })
    );
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    if (index + direction < 0 || index + direction >= agendaItems.length) return;
    const newItems = [...agendaItems];
    const temp = newItems[index];
    newItems[index] = newItems[index + direction];
    newItems[index + direction] = temp;
    setAgendaItems(newItems);
    addMeetingLog(
      'agenda-change',
      t('log.agendaMoveTitle'),
      t('log.agendaMoveDetail', {
        item: formatAgendaItem(temp),
        dir: direction === -1 ? t('log.agendaMoveUp') : t('log.agendaMoveDown'),
      })
    );
  };

  const getBlockRangeIn = (
    list: typeof agendaItems,
    startIndex: number
  ) => {
    const target = list[startIndex];
    if (!target || target.level === 2) {
      return { start: startIndex, end: startIndex };
    }

    let end = startIndex;
    for (let idx = startIndex + 1; idx < list.length; idx += 1) {
      if (list[idx].level === 1) break;
      end = idx;
    }
    return { start: startIndex, end };
  };

  const reorderByDrag = (fromId: number, toId: number | null, position: DragInsertPosition) => {
    const fromIndex = agendaItems.findIndex((item) => item.id === fromId);
    if (fromIndex < 0) return;

    const fromRange = getBlockRangeIn(agendaItems, fromIndex);
    const block = agendaItems.slice(fromRange.start, fromRange.end + 1);

    if (toId !== null && position !== 'end') {
      const toIndex = agendaItems.findIndex((item) => item.id === toId);
      if (toIndex >= fromRange.start && toIndex <= fromRange.end) return;
    }

    const remaining = agendaItems.filter((_, idx) => idx < fromRange.start || idx > fromRange.end);
    let safeInsertIndex = remaining.length;
    if (toId !== null && position !== 'end') {
      const toIndexInRemaining = remaining.findIndex((item) => item.id === toId);
      if (toIndexInRemaining >= 0) {
        if (position === 'before') {
          safeInsertIndex = toIndexInRemaining;
        } else {
          const toRange = getBlockRangeIn(remaining, toIndexInRemaining);
          safeInsertIndex = toRange.end + 1;
        }
      }
    }

    setAgendaItems([
      ...remaining.slice(0, safeInsertIndex),
      ...block,
      ...remaining.slice(safeInsertIndex),
    ]);
    addMeetingLog(
      'agenda-change',
      t('log.agendaDragTitle'),
      t('log.agendaDragDetail', {
        n: block.length,
        pos:
          position === 'end'
            ? t('log.agendaPosEnd')
            : position === 'before'
              ? t('log.agendaPosBefore')
              : t('log.agendaPosAfter'),
      })
    );
  };

  const handleImportMyAgenda = () => {
    const rawLines = agendaImportInput.split('\n');
    const parsed = rawLines
      .map((line) => {
        const hasIndent = /^\s+/.test(line);
        const trimmed = line.trim();
        if (!trimmed) return null;

        let level: 1 | 2 = hasIndent ? 2 : 1;
        if (/^二级\s*[:：]/.test(trimmed)) level = 2;
        if (/^一级\s*[:：]/.test(trimmed)) level = 1;
        if (/^\d+[.．]\d+/.test(trimmed) || /^\d+-\d+/.test(trimmed) || /^\s*[-*•]\s+/.test(line)) level = 2;

        const title = sanitizeAgendaTitle(trimmed);

        if (!title) return null;
        return { level, title };
      })
      .filter((item): item is { level: 1 | 2; title: string } => Boolean(item));

    if (parsed.length === 0) {
      alert(t('agenda.alertImportFail'));
      return;
    }

    const seed = Date.now();
    const importedItems = parsed.map((item, index) => ({
      id: seed + index,
      level: item.level,
      title: item.title,
      status: 'normal' as const,
    }));
    setAgendaItems(importedItems);
    addMeetingLog('agenda-change', t('log.agendaImportTitle'), t('log.agendaImportDetail', { n: importedItems.length }));
    setAgendaImportInput('');
    setIsImportModalOpen(false);
  };

  const numberMap = useMemo(() => {
    let levelOneCounter = 0;
    let levelTwoCounter = 0;
    return agendaItems.reduce<Record<number, string>>((acc, item) => {
      if (item.level === 1) {
        levelOneCounter += 1;
        levelTwoCounter = 0;
        acc[item.id] = `${levelOneCounter}`;
      } else {
        if (levelOneCounter === 0) levelOneCounter = 1;
        levelTwoCounter += 1;
        acc[item.id] = `${levelOneCounter}.${levelTwoCounter}`;
      }
      return acc;
    }, {});
  }, [agendaItems]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300 pb-8">
      <div className="apple-panel p-8 md:p-10 space-y-2">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">{t('agenda.title')}</h1>
        <p className="text-lg text-slate-500">{t('agenda.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="apple-panel border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Plus className="w-5 h-5 text-slate-700" />
                {t('agenda.addBlock')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <select 
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                  value={newLevel}
                  onChange={(e) => setNewLevel(Number(e.target.value) as 1 | 2)}
                >
                  <option value={1}>{t('agenda.level1')}</option>
                  <option value={2}>{t('agenda.level2')}</option>
                </select>
                <Input 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  placeholder={t('agenda.phTitle')}
                  className="flex-1 rounded-xl border-slate-200"
                />
                <Button onClick={handleAdd}>{t('common.add')}</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="apple-panel border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ListTodo className="w-5 h-5 text-slate-700" />
                {t('agenda.currentList')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {agendaItems.length === 0 ? (
                <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  {t('agenda.emptyList')}
                </div>
              ) : (
                <div className="space-y-2">
                  {agendaItems.map((item, idx) => (
                    <div 
                      key={item.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move';
                        setDraggingItemId(item.id);
                        setIsDraggingToEnd(false);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        const rect = e.currentTarget.getBoundingClientRect();
                        const midpoint = rect.top + rect.height / 2;
                        const position: Exclude<DragInsertPosition, 'end'> =
                          e.clientY < midpoint ? 'before' : 'after';
                        setDragIndicator({ itemId: item.id, position });
                        setIsDraggingToEnd(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggingItemId !== null && dragIndicator?.itemId === item.id) {
                          reorderByDrag(draggingItemId, item.id, dragIndicator.position);
                        }
                        setDragIndicator(null);
                        setIsDraggingToEnd(false);
                      }}
                      onDragEnd={() => {
                        setDraggingItemId(null);
                        setDragIndicator(null);
                        setIsDraggingToEnd(false);
                      }}
                      className={cn(
                        "relative flex items-center justify-between gap-3 p-3 rounded-2xl border bg-white shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.12)]",
                        item.level === 1 ? "border-l-4 border-l-slate-700" : "border-l-4 border-l-slate-300 ml-8",
                        item.status === 'postponed' && "bg-amber-50 border-amber-200",
                        item.status === 'ended' && "bg-slate-100 border-slate-300",
                        draggingItemId === item.id && "opacity-95 scale-[1.01] -translate-y-1 shadow-[0_18px_36px_rgba(15,23,42,0.22)] ring-2 ring-brand-200",
                        dragIndicator?.itemId === item.id && "ring-2 ring-brand-300"
                      )}
                    >
                      <span className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/45 via-transparent to-slate-100/35" />
                      {dragIndicator?.itemId === item.id && dragIndicator.position === 'before' && (
                        <span className="pointer-events-none absolute -top-[3px] left-2 right-2 h-1 rounded-full bg-brand-400" />
                      )}
                      {dragIndicator?.itemId === item.id && dragIndicator.position === 'after' && (
                        <span className="pointer-events-none absolute -bottom-[3px] left-2 right-2 h-1 rounded-full bg-brand-400" />
                      )}
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <span
                          className="mt-0.5 shrink-0 cursor-grab rounded-md bg-slate-50 p-0.5 text-slate-300 hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing"
                          title={item.level === 1 ? t('agenda.dragL1') : t('agenda.dragL2')}
                        >
                          <GripVertical className="w-4 h-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-semibold text-slate-500 shrink-0">{numberMap[item.id]}</span>
                          <span className={cn(
                            "font-medium truncate",
                            item.level === 1 ? "text-slate-900" : "text-slate-700",
                            item.status === 'postponed' && "text-amber-800",
                            item.status === 'ended' && "text-slate-500 line-through"
                          )}>
                            {item.title}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(item.id, 'normal')}
                            className={cn(
                              "px-2 py-1 rounded-md text-[11px] font-semibold transition-colors",
                              item.status === 'normal'
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            )}
                          >
                            {t('meeting.agendaStatusNormal')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(item.id, 'postponed')}
                            className={cn(
                              "px-2 py-1 rounded-md text-[11px] font-semibold transition-colors",
                              item.status === 'postponed'
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            )}
                          >
                            {t('meeting.agendaStatusPostponed')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(item.id, 'ended')}
                            className={cn(
                              "px-2 py-1 rounded-md text-[11px] font-semibold transition-colors",
                              item.status === 'ended'
                                ? "bg-slate-200 text-slate-700"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            )}
                          >
                            {t('meeting.agendaStatusEnded')}
                          </button>
                        </div>
                      </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700" onClick={() => moveItem(idx, -1)} disabled={idx === 0}>
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700" onClick={() => moveItem(idx, 1)} disabled={idx === agendaItems.length - 1}>
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-brand-400 hover:text-brand-600 hover:bg-brand-50" onClick={() => handleRemove(item.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingToEnd(true);
                      setDragIndicator(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggingItemId !== null) reorderByDrag(draggingItemId, null, 'end');
                      setDragIndicator(null);
                      setIsDraggingToEnd(false);
                    }}
                    className={cn(
                      "rounded-xl border border-dashed py-2 text-center text-xs transition-colors",
                      isDraggingToEnd
                        ? "border-brand-300 bg-brand-50 text-brand-600"
                        : "border-slate-200 text-slate-400"
                    )}
                  >
                    {t('agenda.dropEnd')}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="apple-panel border-0 sticky top-6">
            <CardHeader>
              <CardTitle className="text-base">{t('agenda.actions')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full" size="lg" onClick={() => setCurrentPage('meeting')}>
                {t('agenda.enterMeeting')}
              </Button>
              <Button className="w-full" variant="secondary" onClick={() => setIsImportModalOpen(true)}>
                {t('agenda.importBtn')}
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => {
                  if (agendaItems.length > 0) {
                    addMeetingLog(
                      'agenda-change',
                      t('log.agendaClearTitle'),
                      t('log.agendaClearDetail', { n: agendaItems.length })
                    );
                  }
                  setAgendaItems([]);
                }}
              >
                {t('agenda.clearAll')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title={t('agenda.importModalTitle')}
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            {t('agenda.importModalBody')}
          </p>
          <textarea
            value={agendaImportInput}
            onChange={(e) => setAgendaImportInput(e.target.value)}
            placeholder={t('agenda.importModalPh')}
            className="w-full min-h-64 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-300/60"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsImportModalOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleImportMyAgenda} disabled={!agendaImportInput.trim()}>
              {t('agenda.importConfirm')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
