import React, { useState } from 'react';
import { useMeeting } from '../context/MeetingContext';
import { PageType } from '../types';
import { 
  SlidersHorizontal,
  Users, 
  MonitorPlay, 
  Vote, 
  LayoutList, 
  PlusCircle,
  FolderOpen,
  Save,
  Trash2,
  BookOpen,
  NotebookText,
  House,
  Maximize2,
  Minimize2,
  StretchHorizontal
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import appLogo from '../assets/app-logo.png';
import { softwareGuideSections } from '../content/softwareGuide';

interface SidebarProps {
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
  forceFullscreenFill: boolean;
  onToggleForceFullscreenFill: () => void;
}

export function Sidebar({
  isFullScreen,
  onToggleFullScreen,
  forceFullscreenFill,
  onToggleForceFullscreenFill,
}: SidebarProps) {
  const { 
    currentPage, 
    setCurrentPage, 
    hasMeetingAccess,
    meetingInfo,
    setMeetingInfo,
    countries,
    setCountries,
    startMeetingCreation, 
    saveArchive, 
    archives, 
    loadArchive, 
    deleteArchive 
  } = useMeeting();

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [newCountry, setNewCountry] = useState('');

  const navItems: { id: PageType; label: string; icon: React.ReactNode }[] = [
    { id: 'meeting', label: '会议进行', icon: <MonitorPlay className="w-5 h-5" /> },
  ];

  const handleCreateNew = () => {
    startMeetingCreation();
    setIsNewModalOpen(false);
  };

  const handleSave = () => {
    saveArchive();
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 3000);
  };

  const handleAddCountry = () => {
    const value = newCountry.trim();
    if (!value || countries.includes(value)) return;
    setCountries([...countries, value]);
    setNewCountry('');
  };

  const handleRemoveCountry = (country: string) => {
    setCountries(countries.filter((c) => c !== country));
  };

  return (
    <>
      <div className="w-72 h-full bg-brand-800 text-brand-100/85 flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-brand-900/70">
          <div className="flex items-center gap-3">
            <img
              src={appLogo}
              alt="SAMUN logo"
              className="h-9 w-9 rounded-md object-contain bg-white/95 p-0.5 shadow-sm ring-1 ring-white/30"
            />
            <div>
              <h1 className="text-[1.35rem] font-bold text-white tracking-tight leading-tight">SAMUN Hub</h1>
              <p className="text-sm text-brand-200/70 mt-1">春秋模联会议控制台</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 flex flex-col sidebar-scrollbar-transparent">
          <div className="px-6 mb-4">
            <h3 className="text-sm font-semibold text-brand-200/75 uppercase tracking-wider">主界面</h3>
          </div>
          <ul className="space-y-1 px-3">
            {navItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setCurrentPage(item.id)}
                  disabled={!hasMeetingAccess}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-[15px] font-medium transition-colors",
                    currentPage === item.id 
                      ? "bg-brand-700 text-white"
                      : "hover:bg-brand-900/75 hover:text-white",
                    !hasMeetingAccess && "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-brand-100/80"
                  )}
                >
                  {item.icon}
                  {item.label}
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-8 px-6 mb-4">
            <h3 className="text-sm font-semibold text-brand-200/75 uppercase tracking-wider">会议工具</h3>
          </div>
          <ul className="space-y-1 px-3">
            <li>
              <button
                onClick={() => setCurrentPage('roll-call')}
                disabled={!hasMeetingAccess}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-[15px] font-medium transition-colors",
                  currentPage === 'roll-call'
                    ? "bg-brand-700 text-white"
                    : "hover:bg-brand-900/75 hover:text-white",
                  !hasMeetingAccess && "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-brand-100/80"
                )}
              >
                <Users className="w-5 h-5" />
                代表点名
              </button>
            </li>
            <li>
              <button
                onClick={() => setCurrentPage('voting')}
                disabled={!hasMeetingAccess}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-[15px] font-medium transition-colors",
                  currentPage === 'voting'
                    ? "bg-brand-700 text-white"
                    : "hover:bg-brand-900/75 hover:text-white",
                  !hasMeetingAccess && "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-brand-100/80"
                )}
              >
                <Vote className="w-5 h-5" />
                投票表决
              </button>
            </li>
            <li>
              <button
                onClick={() => setCurrentPage('agenda-arrangement')}
                disabled={!hasMeetingAccess}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-[15px] font-medium transition-colors",
                  currentPage === 'agenda-arrangement'
                    ? "bg-brand-700 text-white"
                    : "hover:bg-brand-900/75 hover:text-white",
                  !hasMeetingAccess && "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-brand-100/80"
                )}
              >
                <LayoutList className="w-5 h-5" />
                议程编辑
              </button>
            </li>
            <li>
              <button
                onClick={() => setCurrentPage('meeting-records')}
                disabled={!hasMeetingAccess}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-[15px] font-medium transition-colors",
                  currentPage === 'meeting-records'
                    ? "bg-brand-700 text-white"
                    : "hover:bg-brand-900/75 hover:text-white",
                  !hasMeetingAccess && "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-brand-100/80"
                )}
              >
                <NotebookText className="w-5 h-5" />
                会议记录
              </button>
            </li>
            <li>
              <button
                onClick={() => setIsGuideModalOpen(true)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-[15px] font-medium hover:bg-brand-900/75 hover:text-white transition-colors"
              >
                <BookOpen className="w-5 h-5" />
                软件说明
              </button>
            </li>
          </ul>

          <div className="mt-8 px-6 mb-4">
            <h3 className="text-sm font-semibold text-brand-200/75 uppercase tracking-wider">会议管理</h3>
          </div>
          
          <ul className="space-y-1 px-3 mb-4">
            <li>
              <button
                onClick={() => setCurrentPage('entry')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-[15px] font-medium hover:bg-brand-900/75 hover:text-white transition-colors"
              >
                <House className="w-5 h-5" />
                回到封面
              </button>
            </li>
            <li>
              <button
                onClick={onToggleFullScreen}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-[15px] font-medium hover:bg-brand-900/75 hover:text-white transition-colors"
              >
                {isFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                {isFullScreen ? '退出全屏' : '进入全屏'}
              </button>
            </li>
            <li>
              <button
                onClick={onToggleForceFullscreenFill}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-[15px] font-medium hover:bg-brand-900/75 hover:text-white transition-colors"
                title="开启后全屏时无条件铺满，关闭则按16:9白边适配"
              >
                <StretchHorizontal className="w-5 h-5" />
                强制占满：{forceFullscreenFill ? '开' : '关'}
              </button>
            </li>
            <li>
              <button
                onClick={() => setIsManageModalOpen(true)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-[15px] font-medium hover:bg-brand-900/75 hover:text-white transition-colors"
              >
                <SlidersHorizontal className="w-5 h-5" />
                会议设置
              </button>
            </li>
            <li>
              <button 
                onClick={() => setIsNewModalOpen(true)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-[15px] font-medium hover:bg-brand-900/75 hover:text-white transition-colors"
              >
                <PlusCircle className="w-5 h-5" />
                新建会议
              </button>
            </li>
            <li>
              <button 
                onClick={() => setIsLoadModalOpen(true)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-[15px] font-medium hover:bg-brand-900/75 hover:text-white transition-colors"
              >
                <FolderOpen className="w-5 h-5" />
                读取存档
              </button>
            </li>
            <li>
              <button 
                onClick={handleSave}
                disabled={!hasMeetingAccess}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-[15px] font-medium transition-colors relative",
                  hasMeetingAccess
                    ? "hover:bg-brand-900/75 hover:text-white"
                    : "opacity-40 cursor-not-allowed"
                )}
              >
                <Save className="w-5 h-5" />
                保存当前进度
                {showSaveToast && (
                  <span className="absolute right-3 text-xs text-emerald-400 animate-in fade-in slide-in-from-bottom-1">
                    已保存!
                  </span>
                )}
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {/* New Meeting Modal */}
      <Modal 
        isOpen={isNewModalOpen} 
        onClose={() => setIsNewModalOpen(false)} 
        title="新建会议"
      >
        <div className="space-y-4">
          <div className="bg-slate-50 text-slate-700 p-4 rounded-lg text-sm border border-slate-200">
            <p className="font-semibold mb-1">警告：此操作将清空当前所有数据！</p>
            <p>如果您还没有保存当前会议的进度，请先点击"保存当前进度"。</p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsNewModalOpen(false)}>取消</Button>
            <Button variant="danger" onClick={handleCreateNew}>确认新建</Button>
          </div>
        </div>
      </Modal>

      {/* Load Archive Modal */}
      <Modal 
        isOpen={isLoadModalOpen} 
        onClose={() => setIsLoadModalOpen(false)} 
        title="读取存档"
        className="max-w-2xl"
      >
        <div className="space-y-4">
          {archives.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              暂无保存的会议存档
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {archives.map(archive => (
                <div key={archive.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-brand-300 transition-colors">
                  <div>
                    <h4 className="font-semibold text-slate-900">
                      {archive.meetingInfo.committee || '未命名委员会'}
                    </h4>
                    <p className="text-sm text-slate-500 mt-1">
                      {archive.meetingInfo.topic || '无议题'}
                    </p>
                    <div className="flex gap-4 mt-2 text-xs text-slate-400">
                      <span>{new Date(archive.timestamp).toLocaleString()}</span>
                      <span>{archive.countries.length} 个国家</span>
                      <span>{archive.agendaItems.length} 项议程</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        loadArchive(archive.id);
                        setIsLoadModalOpen(false);
                      }}
                    >
                      读取
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => deleteArchive(archive.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        title="软件使用说明"
        className="max-w-3xl"
      >
        <div className="space-y-5">
          <p className="text-sm text-slate-600">
            本说明用于帮助主席团或记录团队快速完成会前配置、会中控制与会后归档。
          </p>
          {softwareGuideSections.map((section) => (
            <section key={section.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h4 className="text-sm font-semibold text-slate-900">{section.title}</h4>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-700 list-disc pl-5">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
          <div className="flex justify-end">
            <Button onClick={() => setIsGuideModalOpen(false)}>我知道了</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        title="会议设置"
        className="max-w-2xl"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">委员会名称</label>
              <Input
                value={meetingInfo.committee}
                onChange={(e) => setMeetingInfo({ ...meetingInfo, committee: e.target.value })}
                placeholder="例如：联合国安全理事会"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">会议议题</label>
              <Input
                value={meetingInfo.topic}
                onChange={(e) => setMeetingInfo({ ...meetingInfo, topic: e.target.value })}
                placeholder="例如：关于维护国际和平与安全的决议"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">记录人</label>
              <Input
                value={meetingInfo.recorder}
                onChange={(e) => setMeetingInfo({ ...meetingInfo, recorder: e.target.value })}
                placeholder="请输入记录人姓名"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-800">国家列表</h4>
              <span className="text-xs text-slate-500">{countries.length} 个</span>
            </div>
            <div className="flex gap-2">
              <Input
                value={newCountry}
                onChange={(e) => setNewCountry(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCountry()}
                placeholder="输入国家名称..."
              />
              <Button variant="secondary" onClick={handleAddCountry}>添加</Button>
            </div>
            <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg p-3 bg-slate-50">
              {countries.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">暂无国家，请添加</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {countries.map((country) => (
                    <button
                      key={country}
                      onClick={() => handleRemoveCountry(country)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-sm bg-white border border-slate-200 hover:border-red-300 hover:text-red-700 transition-colors"
                      title="点击删除"
                    >
                      <span>{country}</span>
                      <span className="text-xs">×</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500">点击国家标签可快速删除。</p>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setIsManageModalOpen(false)}>完成</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
