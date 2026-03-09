import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { MeetingInfo, CountryRight, AgendaItem, PageType, MeetingArchive } from '../types';

const SESSION_STATE_KEY = 'samun_session_state_v1';

interface PersistedSessionState {
  currentPage: PageType;
  hasMeetingAccess: boolean;
  currentArchiveId: string | null;
  meetingInfo: MeetingInfo;
  countries: string[];
  attendance: Record<string, boolean>;
  countryRights: Record<string, CountryRight>;
  agendaItems: AgendaItem[];
}

interface MeetingContextType {
  currentPage: PageType;
  setCurrentPage: (page: PageType) => void;
  hasMeetingAccess: boolean;
  meetingInfo: MeetingInfo;
  setMeetingInfo: (info: MeetingInfo) => void;
  countries: string[];
  setCountries: (countries: string[]) => void;
  attendance: Record<string, boolean>;
  setAttendance: (attendance: Record<string, boolean>) => void;
  countryRights: Record<string, CountryRight>;
  setCountryRights: (rights: Record<string, CountryRight>) => void;
  agendaItems: AgendaItem[];
  setAgendaItems: (items: AgendaItem[]) => void;
  
  // Meeting Management
  archives: MeetingArchive[];
  saveArchive: () => void;
  loadArchive: (id: string) => void;
  deleteArchive: (id: string) => void;
  startMeetingCreation: () => void;
  createNewMeeting: (info: MeetingInfo, countries?: string[]) => void;
  enterMeeting: () => void;
}

const defaultContext: MeetingContextType = {
  currentPage: 'entry',
  setCurrentPage: () => {},
  hasMeetingAccess: false,
  meetingInfo: { committee: '联合国安全理事会', topic: '关于维护国际和平与安全的决议', recorder: '' },
  setMeetingInfo: () => {},
  countries: [],
  setCountries: () => {},
  attendance: {},
  setAttendance: () => {},
  countryRights: {},
  setCountryRights: () => {},
  agendaItems: [],
  setAgendaItems: () => {},
  archives: [],
  saveArchive: () => {},
  loadArchive: () => {},
  deleteArchive: () => {},
  startMeetingCreation: () => {},
  createNewMeeting: () => {},
  enterMeeting: () => {},
};

const MeetingContext = createContext<MeetingContextType>(defaultContext);

export const useMeeting = () => useContext(MeetingContext);

export const MeetingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentPage, setCurrentPage] = useState<PageType>('entry');
  const [hasMeetingAccess, setHasMeetingAccess] = useState(false);
  const [currentArchiveId, setCurrentArchiveId] = useState<string | null>(null);
  const [meetingInfo, setMeetingInfo] = useState<MeetingInfo>(defaultContext.meetingInfo);
  const [countries, setCountries] = useState<string[]>([
    '中华人民共和国', '美利坚合众国', '大不列颠及北爱尔兰联合王国', '法兰西共和国', '俄罗斯联邦', 
    '阿尔及利亚民主人民共和国', '丹麦王国', '希腊共和国', '圭亚那合作共和国', '巴基斯坦伊斯兰共和国', 
    '巴拿马共和国', '大韩民国', '塞拉利昂共和国', '斯洛文尼亚共和国', '索马里联邦共和国'
  ]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [countryRights, setCountryRights] = useState<Record<string, CountryRight>>({});
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [archives, setArchives] = useState<MeetingArchive[]>([]);
  const [isSessionHydrated, setIsSessionHydrated] = useState(false);

  // Load archives from localStorage on mount
  useEffect(() => {
    const savedArchives = localStorage.getItem('samun_archives');
    if (savedArchives) {
      try {
        setArchives(JSON.parse(savedArchives));
      } catch (e) {
        console.error('Failed to parse archives', e);
      }
    }
  }, []);

  useEffect(() => {
    const rawSessionState = localStorage.getItem(SESSION_STATE_KEY);
    if (!rawSessionState) {
      setIsSessionHydrated(true);
      return;
    }

    try {
      const parsed = JSON.parse(rawSessionState) as PersistedSessionState;
      if (parsed.currentPage) setCurrentPage(parsed.currentPage);
      setHasMeetingAccess(Boolean(parsed.hasMeetingAccess));
      setCurrentArchiveId(parsed.currentArchiveId ?? null);
      if (parsed.meetingInfo) setMeetingInfo(parsed.meetingInfo);
      if (Array.isArray(parsed.countries)) setCountries(parsed.countries);
      if (parsed.attendance && typeof parsed.attendance === 'object') setAttendance(parsed.attendance);
      if (parsed.countryRights && typeof parsed.countryRights === 'object') setCountryRights(parsed.countryRights);
      if (Array.isArray(parsed.agendaItems)) setAgendaItems(parsed.agendaItems);
    } catch (error) {
      console.error('Failed to parse meeting session state', error);
    } finally {
      setIsSessionHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isSessionHydrated) return;
    const sessionStateToPersist: PersistedSessionState = {
      currentPage,
      hasMeetingAccess,
      currentArchiveId,
      meetingInfo,
      countries,
      attendance,
      countryRights,
      agendaItems,
    };
    localStorage.setItem(SESSION_STATE_KEY, JSON.stringify(sessionStateToPersist));
  }, [
    isSessionHydrated,
    currentPage,
    hasMeetingAccess,
    currentArchiveId,
    meetingInfo,
    countries,
    attendance,
    countryRights,
    agendaItems,
  ]);

  const saveArchive = useCallback(() => {
    const archiveId = currentArchiveId ?? Date.now().toString();
    const archiveToSave: MeetingArchive = {
      id: archiveId,
      timestamp: Date.now(),
      meetingInfo,
      countries,
      attendance,
      countryRights,
      agendaItems,
    };

    const existingIndex = archives.findIndex((archive) => archive.id === archiveId);
    const updatedArchives =
      existingIndex >= 0
        ? [archiveToSave, ...archives.filter((archive) => archive.id !== archiveId)]
        : [archiveToSave, ...archives];

    setCurrentArchiveId(archiveId);
    setArchives(updatedArchives);
    localStorage.setItem('samun_archives', JSON.stringify(updatedArchives));
  }, [agendaItems, archives, attendance, countries, countryRights, currentArchiveId, meetingInfo]);

  const loadArchive = useCallback((id: string) => {
    const archive = archives.find(a => a.id === id);
    if (archive) {
      setMeetingInfo(archive.meetingInfo);
      setCountries(archive.countries);
      setAttendance(archive.attendance);
      setCountryRights(archive.countryRights);
      setAgendaItems(archive.agendaItems);
      setCurrentArchiveId(archive.id);
      setHasMeetingAccess(true);
      setCurrentPage('meeting-intro');
    }
  }, [archives]);

  const startMeetingCreation = useCallback(() => {
    setHasMeetingAccess(false);
    setCurrentArchiveId(null);
    setMeetingInfo({ committee: '', topic: '', recorder: '' });
    setCountries([]);
    setAttendance({});
    setCountryRights({});
    setAgendaItems([]);
    setCurrentPage('meeting-create');
  }, []);

  const deleteArchive = useCallback((id: string) => {
    const updatedArchives = archives.filter(a => a.id !== id);
    if (currentArchiveId === id) {
      setCurrentArchiveId(null);
    }
    setArchives(updatedArchives);
    localStorage.setItem('samun_archives', JSON.stringify(updatedArchives));
  }, [archives, currentArchiveId]);

  const createNewMeeting = useCallback((info: MeetingInfo, createdCountries: string[] = []) => {
    setCurrentArchiveId(null);
    setMeetingInfo(info);
    setCountries(createdCountries);
    setAttendance({});
    setCountryRights({});
    setAgendaItems([]);
    setHasMeetingAccess(true);
    setCurrentPage('meeting-intro');
  }, []);

  const enterMeeting = useCallback(() => {
    if (!hasMeetingAccess) return;
    setCurrentPage('meeting');
  }, [hasMeetingAccess]);

  const contextValue = useMemo(
    () => ({
      currentPage,
      setCurrentPage,
      hasMeetingAccess,
      meetingInfo,
      setMeetingInfo,
      countries,
      setCountries,
      attendance,
      setAttendance,
      countryRights,
      setCountryRights,
      agendaItems,
      setAgendaItems,
      archives,
      saveArchive,
      loadArchive,
      deleteArchive,
      startMeetingCreation,
      createNewMeeting,
      enterMeeting,
    }),
    [
      currentPage,
      hasMeetingAccess,
      meetingInfo,
      countries,
      attendance,
      countryRights,
      agendaItems,
      archives,
      saveArchive,
      loadArchive,
      deleteArchive,
      startMeetingCreation,
      createNewMeeting,
      enterMeeting,
    ]
  );

  return (
    <MeetingContext.Provider value={contextValue}>
      {children}
    </MeetingContext.Provider>
  );
};
