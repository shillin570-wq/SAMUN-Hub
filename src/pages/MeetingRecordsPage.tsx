import React, { useMemo, useState } from 'react';
import { useMeeting } from '../context/MeetingContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MeetingLogType } from '../types';

const LOG_TYPE_LABEL: Record<MeetingLogType, string> = {
  'roll-call': '点名',
  'agenda-change': '议程变更',
  'vote-result': '投票结果',
  speech: '发言日志',
};

type FilterType = MeetingLogType | 'all';

export function MeetingRecordsPage() {
  const { meetingLogs, clearMeetingLogs, meetingInfo } = useMeeting();
  const [filterType, setFilterType] = useState<FilterType>('all');

  const getSpeechTopic = (title: string, detail: string) => {
    if (title.startsWith('发言议题：')) return title.replace('发言议题：', '').trim() || '未标注议题';
    const match = detail.match(/在「(.+)」下发言/);
    return match?.[1]?.trim() || '未标注议题';
  };

  const getSpeechSpeakerText = (title: string, detail: string) => {
    if (detail.endsWith('发言')) return detail;
    if (title.startsWith('发言记录：') || title.startsWith('发言日志：')) {
      const speaker = title.replace(/^发言(?:记录|日志)：/, '').trim();
      return speaker ? `${speaker} 发言` : detail;
    }
    return detail;
  };

  const filteredLogs = useMemo(
    () => (filterType === 'all' ? meetingLogs : meetingLogs.filter((log) => log.type === filterType)),
    [meetingLogs, filterType]
  );

  const groupedSpeechLogs = useMemo(() => {
    const speechLogs = filteredLogs.filter((log) => log.type === 'speech');
    const groupMap = new Map<string, typeof speechLogs>();
    speechLogs.forEach((log) => {
      const topic = getSpeechTopic(log.title, log.detail);
      const prev = groupMap.get(topic) ?? [];
      groupMap.set(topic, [...prev, log]);
    });
    return Array.from(groupMap.entries()).map(([topic, logs]) => ({
      topic,
      logs: logs.sort((a, b) => a.timestamp - b.timestamp),
    }));
  }, [filteredLogs]);

  const formatLogLine = (log: (typeof meetingLogs)[number]) =>
    `[${new Date(log.timestamp).toLocaleString()}] [${LOG_TYPE_LABEL[log.type]}] ${log.title} - ${log.detail}`;

  const getExportBaseName = () =>
    `会议日志_${filterType === 'all' ? '全部' : LOG_TYPE_LABEL[filterType]}_${new Date()
      .toLocaleString()
      .replace(/[/: ]/g, '-')}`;

  const downloadFile = (content: BlobPart, fileName: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyText = async () => {
    const lines = filteredLogs.map((log) => formatLogLine(log));
    const content = lines.join('\n');
    try {
      await navigator.clipboard.writeText(content);
      alert('会议日志已复制到剪贴板。');
    } catch (error) {
      console.error('Failed to copy meeting logs', error);
      alert('复制失败，请稍后重试。');
    }
  };

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const handleExportWord = () => {
    const rows = filteredLogs
      .map(
        (log) => `
          <tr>
            <td>${escapeHtml(new Date(log.timestamp).toLocaleString())}</td>
            <td>${escapeHtml(LOG_TYPE_LABEL[log.type])}</td>
            <td>${escapeHtml(log.title)}</td>
            <td>${escapeHtml(log.detail)}</td>
          </tr>
        `
      )
      .join('');
    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: "Microsoft YaHei", sans-serif; padding: 16px; }
            h1 { margin: 0 0 8px; font-size: 22px; }
            p { margin: 2px 0 12px; color: #555; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ccc; padding: 8px; font-size: 12px; text-align: left; vertical-align: top; }
            th { background: #f5f5f5; }
          </style>
        </head>
        <body>
          <h1>会议日志导出</h1>
          <p>导出时间：${escapeHtml(new Date().toLocaleString())}</p>
          <p>导出范围：${escapeHtml(filterType === 'all' ? '全部类型' : LOG_TYPE_LABEL[filterType])}</p>
          <p>委员会：${escapeHtml(meetingInfo.committee || '未填写')}</p>
          <p>会议议题：${escapeHtml(meetingInfo.topic || '未填写')}</p>
          ${
            meetingInfo.recorder?.trim()
              ? `<p>记录人：${escapeHtml(meetingInfo.recorder.trim())}</p>`
              : ''
          }
          <table>
            <thead>
              <tr>
                <th>时间</th>
                <th>类型</th>
                <th>标题</th>
                <th>详情</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;
    downloadFile(`\uFEFF${html}`, `${getExportBaseName()}.doc`, 'application/msword;charset=utf-8');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300 pb-8">
      <Card className="apple-panel border-0">
        <CardContent className="p-6 md:p-7">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900">会议日志</h1>
              <p className="text-slate-500 mt-1">自动记录点名、议程变更、投票结果与发言情况</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as FilterType)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="all">全部类型</option>
                <option value="roll-call">点名</option>
                <option value="agenda-change">议程变更</option>
                <option value="vote-result">投票结果</option>
                <option value="speech">发言日志</option>
              </select>
              <Button variant="secondary" onClick={handleCopyText} disabled={filteredLogs.length === 0}>
                复制当前日志
              </Button>
              <Button variant="secondary" onClick={handleExportWord} disabled={filteredLogs.length === 0}>
                导出Word
              </Button>
              <Button variant="outline" onClick={clearMeetingLogs} disabled={meetingLogs.length === 0}>
                清空日志
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="apple-panel border-0">
        <CardHeader>
          <CardTitle>日志列表（{filteredLogs.length}）</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              暂无日志
            </div>
          ) : filterType === 'speech' ? (
            <div className="max-h-[70vh] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {groupedSpeechLogs.map((group) => (
                <div key={group.topic} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{group.topic}</h3>
                    <span className="text-xs text-slate-500">{group.logs.length} 条发言</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {group.logs.map((log) => (
                      <div key={log.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                        <div className="text-sm text-slate-700">{getSpeechSpeakerText(log.title, log.detail)}</div>
                        <div className="mt-1 text-xs text-slate-500">{new Date(log.timestamp).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto pr-2 space-y-2.5 custom-scrollbar">
              {filteredLogs.map((log) => (
                <div key={log.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                        {LOG_TYPE_LABEL[log.type]}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">{log.title}</span>
                    </div>
                    <span className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{log.detail}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
