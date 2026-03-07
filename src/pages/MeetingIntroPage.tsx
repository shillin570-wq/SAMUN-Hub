import React from 'react';
import { useMeeting } from '../context/MeetingContext';

export function MeetingIntroPage() {
  const { meetingInfo, enterMeeting } = useMeeting();

  return (
    <div className="h-full w-full relative overflow-hidden bg-slate-950 stage-entrance">
      <div className="absolute inset-0 bg-[radial-gradient(45rem_24rem_at_50%_28%,rgba(210,83,101,0.26),transparent_65%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(60rem_32rem_at_50%_120%,rgba(63,18,25,0.88),transparent_70%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/70" />
      <button
        onClick={enterMeeting}
        className="w-full h-full text-center transition-all duration-500 relative overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        <div className="h-full flex flex-col items-center justify-center px-6 relative">
          <div className="space-y-4 stage-float">
            <p className="text-sm tracking-[0.38em] font-semibold text-slate-300/90">SAMUN</p>
            <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-white drop-shadow-[0_8px_24px_rgba(210,83,101,0.35)]">
              {meetingInfo.committee || '未设置委员会'}
            </h1>
            <p className="text-xl md:text-2xl text-slate-200/90 max-w-4xl mx-auto">
              {meetingInfo.topic || '请先在会议设置中填写本次会议议题'}
            </p>
          </div>

          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-slate-300/85 text-sm tracking-[0.2em] uppercase">
            Tap to Enter
          </div>
        </div>
      </button>
    </div>
  );
}
