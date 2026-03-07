import { Suspense, lazy, useEffect, useState } from 'react';
import { MeetingProvider, useMeeting } from './context/MeetingContext';
import { Sidebar } from './components/Sidebar';
import { cn } from './lib/utils';

const EntryGatePage = lazy(() => import('./pages/EntryGatePage').then((m) => ({ default: m.EntryGatePage })));
const MeetingCreatePage = lazy(() => import('./pages/MeetingCreatePage').then((m) => ({ default: m.MeetingCreatePage })));
const MeetingIntroPage = lazy(() => import('./pages/MeetingIntroPage').then((m) => ({ default: m.MeetingIntroPage })));
const RollCallPage = lazy(() => import('./pages/RollCallPage').then((m) => ({ default: m.RollCallPage })));
const MeetingPage = lazy(() => import('./pages/MeetingPage').then((m) => ({ default: m.MeetingPage })));
const AgendaArrangementPage = lazy(() =>
  import('./pages/AgendaArrangementPage').then((m) => ({ default: m.AgendaArrangementPage }))
);
const VotingPage = lazy(() => import('./pages/VotingPage').then((m) => ({ default: m.VotingPage })));
const FULLSCREEN_ASPECT_TOLERANCE = 0.1;
const FORCE_FULLSCREEN_FILL_KEY = 'samun_force_fullscreen_fill';

function MainContent() {
  const { currentPage } = useMeeting();
  const isCinematicFlow =
    currentPage === 'entry' || currentPage === 'meeting-create' || currentPage === 'meeting-intro';

  const renderPage = () => {
    switch (currentPage) {
      case 'entry': return <EntryGatePage />;
      case 'meeting-create': return <MeetingCreatePage />;
      case 'meeting-intro': return <MeetingIntroPage />;
      case 'roll-call': return <RollCallPage />;
      case 'meeting': return <MeetingPage />;
      case 'agenda-arrangement': return <AgendaArrangementPage />;
      case 'voting': return <VotingPage />;
      default: return <EntryGatePage />;
    }
  };

  return (
    <main
      className={cn(
        'flex-1 overflow-y-auto transition-[padding,background-color] duration-900 ease-out',
        isCinematicFlow ? 'bg-slate-950 p-0' : 'bg-slate-50 px-5 pb-5 pt-0.5 md:px-6 md:pb-6 md:pt-1'
      )}
    >
      <Suspense fallback={<div className="h-full w-full" />}>
        <div key={currentPage} className="page-fade-slide h-full">
          {renderPage()}
        </div>
      </Suspense>
    </main>
  );
}

export default function App() {
  const AppLayout = () => {
    const { currentPage } = useMeeting();
    const showSidebar = !(currentPage === 'entry' || currentPage === 'meeting-create' || currentPage === 'meeting-intro');
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isNear16By9, setIsNear16By9] = useState(false);
    const [forceFullscreenFill, setForceFullscreenFill] = useState(false);

    useEffect(() => {
      let disposed = false;
      if (!window.desktopWindow) {
        const handleBrowserFullScreenChange = () => {
          setIsFullScreen(Boolean(document.fullscreenElement));
        };
        document.addEventListener('fullscreenchange', handleBrowserFullScreenChange);
        handleBrowserFullScreenChange();
        return () => {
          document.removeEventListener('fullscreenchange', handleBrowserFullScreenChange);
        };
      }

      window.desktopWindow.getState().then((state) => {
        if (disposed) return;
        setIsFullScreen(state.isFullScreen);
      }).catch((error) => {
        console.error('Failed to get window state', error);
      });

      const disposeListener = window.desktopWindow.onFullScreenChanged((nextIsFullScreen) => {
        setIsFullScreen(nextIsFullScreen);
      });

      return () => {
        disposed = true;
        disposeListener();
      };
    }, []);

    useEffect(() => {
      const savedValue = localStorage.getItem(FORCE_FULLSCREEN_FILL_KEY);
      setForceFullscreenFill(savedValue === '1');
    }, []);

    useEffect(() => {
      const updateViewportRatioFlag = () => {
        if (!isFullScreen) {
          setIsNear16By9(false);
          return;
        }
        const targetRatio = 16 / 9;
        const viewportRatio = window.innerWidth / window.innerHeight;
        const screenRatio = window.screen.width / window.screen.height;
        const diff = Math.min(Math.abs(viewportRatio - targetRatio), Math.abs(screenRatio - targetRatio));
        // 容忍窗口与屏幕比例在全屏时的细微偏差，接近16:9就直接占满。
        setIsNear16By9(diff <= FULLSCREEN_ASPECT_TOLERANCE);
      };

      updateViewportRatioFlag();
      window.addEventListener('resize', updateViewportRatioFlag);
      return () => {
        window.removeEventListener('resize', updateViewportRatioFlag);
      };
    }, [isFullScreen]);

    const handleToggleFullScreen = async () => {
      if (!window.desktopWindow) {
        try {
          if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
          } else {
            await document.exitFullscreen();
          }
        } catch (error) {
          console.error('Failed to toggle browser fullscreen', error);
        }
        return;
      }
      try {
        const nextState = await window.desktopWindow.setFullScreen(!isFullScreen);
        setIsFullScreen(nextState.isFullScreen);
      } catch (error) {
        console.error('Failed to toggle full screen', error);
      }
    };

    const handleToggleForceFullscreenFill = () => {
      setForceFullscreenFill((prev) => {
        const nextValue = !prev;
        localStorage.setItem(FORCE_FULLSCREEN_FILL_KEY, nextValue ? '1' : '0');
        return nextValue;
      });
    };

    return (
      <div className={cn('h-screen w-screen overflow-hidden', isFullScreen && 'fullscreen-shell')}>
        <div className={cn(
          'flex h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden',
          isFullScreen && 'fullscreen-stage',
          isFullScreen && (isNear16By9 || forceFullscreenFill) && 'fullscreen-stage-fill'
        )}>
          <aside
            className={cn(
              'h-full overflow-hidden transition-[width,opacity] duration-900 ease-out',
              showSidebar ? 'w-72 opacity-100' : 'w-0 opacity-0 pointer-events-none'
            )}
          >
            <Sidebar
              isFullScreen={isFullScreen}
              onToggleFullScreen={handleToggleFullScreen}
              forceFullscreenFill={forceFullscreenFill}
              onToggleForceFullscreenFill={handleToggleForceFullscreenFill}
            />
          </aside>
          <MainContent />
        </div>
      </div>
    );
  };

  return (
    <MeetingProvider>
      <AppLayout />
    </MeetingProvider>
  );
}
