import { Suspense, lazy } from 'react';
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

    return (
      <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden">
        <aside
          className={cn(
            'h-screen overflow-hidden transition-[width,opacity] duration-900 ease-out',
            showSidebar ? 'w-72 opacity-100' : 'w-0 opacity-0 pointer-events-none'
          )}
        >
          <Sidebar />
        </aside>
        <MainContent />
      </div>
    );
  };

  return (
    <MeetingProvider>
      <AppLayout />
    </MeetingProvider>
  );
}
