import React from 'react';
import { useMeeting } from '../context/MeetingContext';
import { PlusCircle, FolderOpen } from 'lucide-react';

export function EntryGatePage() {
  const { archives, setCurrentPage, loadArchive } = useMeeting();

  return (
    <div className="h-full w-full relative overflow-hidden bg-slate-950 stage-entrance">
      <div className="absolute inset-0 bg-[radial-gradient(46rem_24rem_at_50%_26%,rgba(210,83,101,0.22),transparent_65%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(30rem_16rem_at_75%_18%,rgba(159,67,77,0.20),transparent_70%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/30 to-black/70" />

      <div className="relative h-full max-w-6xl mx-auto px-6 md:px-10 py-12 md:py-16 flex flex-col">
        <div className="text-center space-y-3 mt-10">
          <p className="text-xs tracking-[0.35em] uppercase text-brand-200/90">模联 连接青年人与世界</p>
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-white drop-shadow-[0_8px_22px_rgba(210,83,101,0.28)]">SAMUN</h1>
          <p className="text-slate-300 text-lg md:text-xl">选择开始方式</p>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-8 mt-14">
          <button
            onClick={() => setCurrentPage('meeting-create')}
            className="group inline-flex items-center gap-3 text-white/90 hover:text-white transition-colors text-xl md:text-2xl font-medium"
          >
            <PlusCircle className="w-6 h-6 text-brand-300 group-hover:scale-110 transition-transform" />
            <span className="relative">
              新建会议
              <span className="absolute left-0 -bottom-1 h-px w-full bg-brand-300/80 scale-x-0 group-hover:scale-x-100 origin-left transition-transform" />
            </span>
          </button>

          <span className="hidden md:block h-8 w-px bg-white/20" />

          <button
            onClick={() => archives.length > 0 && loadArchive(archives[0].id)}
            disabled={archives.length === 0}
            className="group inline-flex items-center gap-3 text-white/90 hover:text-white transition-colors text-xl md:text-2xl font-medium disabled:opacity-45 disabled:cursor-not-allowed"
          >
            <FolderOpen className="w-6 h-6 text-brand-300 group-hover:scale-110 transition-transform" />
            <span className="relative">
              快速读取最近存档
              <span className="absolute left-0 -bottom-1 h-px w-full bg-brand-300/80 scale-x-0 group-hover:scale-x-100 origin-left transition-transform" />
            </span>
          </button>
        </div>

        <div className="mt-8 text-center text-sm text-slate-400">
          或从下方列表选择任意历史存档继续
        </div>

        <div className="mt-4 flex-1 min-h-0">
          {archives.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500">
              暂无存档，请先新建会议
            </div>
          ) : (
            <div className="h-full overflow-y-auto custom-scrollbar pr-1 space-y-1.5">
              {archives.map((archive) => (
                <button
                  key={archive.id}
                  onClick={() => loadArchive(archive.id)}
                  className="w-full text-left rounded-xl px-3 py-3 border border-transparent hover:border-white/10 hover:bg-white/5 transition-colors"
                >
                  <div className="font-semibold text-white/95">
                    {archive.meetingInfo.committee || '未命名委员会'}
                  </div>
                  <div className="text-sm text-slate-400 mt-0.5">
                    {archive.meetingInfo.topic || '无议题'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="text-center text-xs tracking-[0.18em] uppercase text-brand-200/70 mt-5">
          SAMUN Meeting System
        </div>
      </div>
    </div>
  );
}
