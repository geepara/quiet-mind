import { useState, useEffect, useRef, type Dispatch, type SetStateAction, type KeyboardEvent } from 'react'
import { useWebHaptics } from 'web-haptics/react'
import { Sheet, SheetContent } from '@/components/ui/sheet'

// --- Types ---

interface Idea {
  id: number
  text: string
  timestamp: string
}

type Screen = 'modes' | 'ideas' | 'settings' | 'weekend'
type Mode = 'recovery' | 'recovery-creation' | 'ambition'

interface ModeInfo {
  name: string
  description: string
  affirmation: string
}

interface ModeSelectionProps {
  currentMode: Mode | null
  onSelectMode: (mode: Mode) => void
  onHaptic: () => void
}

// --- Data ---

const MODES: Record<Mode, ModeInfo> = {
  recovery: {
    name: 'Recovery',
    description: 'Rest and decompression',
    affirmation: 'Tonight is for recovery. No optimization.'
  },
  'recovery-creation': {
    name: 'Recovery-Creation',
    description: 'Light creative engagement without ambition',
    affirmation: 'Create lightly. Nothing needs to become anything.'
  },
  ambition: {
    name: 'Ambition',
    description: 'Scheduled planning or idea exploration',
    affirmation: 'Planning is allowed tonight.'
  }
}

// --- Hooks ---

function useLocalStorage<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) as T : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue]
}

// --- Components ---

function ModeSelection({ currentMode, onSelectMode, onHaptic }: ModeSelectionProps) {

  const modeAccentClasses: Record<Mode, { hover: string; selected: string }> = {
    recovery: {
      hover: 'hover:border-[rgba(74,111,165,0.5)] hover:bg-[rgba(74,111,165,0.1)]',
      selected: 'border-[rgba(74,111,165,0.5)] bg-[rgba(74,111,165,0.15)]',
    },
    'recovery-creation': {
      hover: 'hover:border-[rgba(107,91,149,0.5)] hover:bg-[rgba(107,91,149,0.1)]',
      selected: 'border-[rgba(107,91,149,0.5)] bg-[rgba(107,91,149,0.15)]',
    },
    ambition: {
      hover: 'hover:border-[rgba(212,165,116,0.5)] hover:bg-[rgba(212,165,116,0.1)]',
      selected: 'border-[rgba(212,165,116,0.5)] bg-[rgba(212,165,116,0.15)]',
    },
  }

  return (
    <div className="flex flex-1 flex-col justify-center">
      <h2 className="text-center text-2xl font-normal text-text-secondary mb-8">Choose tonight's mode</h2>
      <div className="flex flex-col gap-4">
        {(Object.entries(MODES) as [Mode, ModeInfo][]).map(([key, mode]) => {
          const isSelected = currentMode === key
          const accent = modeAccentClasses[key]
          return (
            <div
              key={key}
              className={`p-6 bg-glass-bg backdrop-blur-[20px] backdrop-saturate-[1.4] border border-glass-border rounded-2xl cursor-pointer transition-all duration-200 text-left ${accent.hover} ${isSelected ? `${accent.selected} scale-[0.97] shadow-[inset_0_2px_6px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(0,0,0,0.2)]` : 'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] active:scale-[0.98]'}`}
              onClick={() => { onHaptic(); onSelectMode(key) }}
            >
              <div className="text-xl font-medium mb-2">{mode.name}</div>
              <div className="text-sm text-text-secondary">{mode.description}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function IdeasScreen() {
  const [ideas] = useLocalStorage<Idea[]>('night-modes-ideas', [])

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()

    if (isToday) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <div className="flex flex-1 flex-col">
      <h2 className="text-xl text-text-secondary mb-4">Captured Ideas</h2>
      {ideas.length === 0 ? (
        <div className="text-center text-text-muted py-12 px-4">No ideas captured yet</div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {ideas.map(idea => (
            <div key={idea.id} className="p-4 bg-glass-bg backdrop-blur-[20px] border border-glass-border rounded-[14px] mb-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
              <div className="text-base mb-2">{idea.text}</div>
              <div className="text-xs text-text-muted">{formatTime(idea.timestamp)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SettingsScreen() {
  const [notificationTime, setNotificationTime] = useLocalStorage('night-modes-notification-time', '20:00')
  const [notificationEnabled, setNotificationEnabled] = useState(false)

  useEffect(() => {
    setNotificationEnabled(Notification.permission === 'granted')
  }, [])

  const requestNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      setNotificationEnabled(permission === 'granted')

      if (permission === 'granted') {
        scheduleNotification()
      }
    }
  }

  const scheduleNotification = () => {
    if ('serviceWorker' in navigator && notificationEnabled) {
      navigator.serviceWorker.ready.then(_registration => {
        const [hours, minutes] = notificationTime.split(':').map(Number)
        const now = new Date()
        const scheduledTime = new Date(now)
        scheduledTime.setHours(hours!, minutes!, 0, 0)

        if (scheduledTime <= now) {
          scheduledTime.setDate(scheduledTime.getDate() + 1)
        }

        localStorage.setItem('night-modes-next-notification', scheduledTime.toISOString())
      })
    }
  }

  useEffect(() => {
    if (notificationEnabled) {
      scheduleNotification()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationTime, notificationEnabled])

  return (
    <div className="flex-1">
      <h2 className="text-xl text-text-secondary mb-6">Settings</h2>

      <div className="flex justify-between items-center p-4 bg-glass-bg backdrop-blur-[20px] border border-glass-border rounded-[14px] mb-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
        <span className="text-base">Daily Reminder</span>
        {notificationEnabled ? (
          <input
            type="time"
            value={notificationTime}
            onChange={(e) => setNotificationTime(e.target.value)}
            className="px-4 py-2 text-sm bg-glass-bg text-text-primary border border-glass-border rounded-[10px] cursor-pointer"
          />
        ) : (
          <button className="px-4 py-2 text-sm bg-glass-bg text-text-primary border border-glass-border rounded-[10px] cursor-pointer" onClick={requestNotifications}>
            Enable
          </button>
        )}
      </div>

      <p className="text-sm text-text-muted mt-4 text-center">
        {notificationEnabled
          ? `Reminder set for ${notificationTime}`
          : 'Enable notifications for daily mode reminders'}
      </p>
    </div>
  )
}

function WeekendPlannerScreen() {
  return (
    <div className="flex flex-1 flex-col">
      <h2 className="text-xl text-text-secondary mb-4">Weekend Planner</h2>
      <div className="text-center text-text-muted py-12 px-4">Coming soon — plan your ideal weekend here.</div>
    </div>
  )
}

function App() {
  const [screen, setScreen] = useState<Screen>('modes')
  const [currentMode, setCurrentMode] = useLocalStorage<Mode | null>('night-modes-current-mode', null)
  const [modeDate, setModeDate] = useLocalStorage<string | null>('night-modes-mode-date', null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [captureText, setCaptureText] = useState('')
  const [ideas, setIdeas] = useLocalStorage<Idea[]>('night-modes-ideas', [])
  const captureInputRef = useRef<HTMLTextAreaElement>(null)
  const { trigger: haptic } = useWebHaptics()

  useEffect(() => {
    const today = new Date().toDateString()
    if (modeDate !== today) {
      setCurrentMode(null)
      setModeDate(today)
    }
  }, [modeDate, setCurrentMode, setModeDate])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  const handleSelectMode = (mode: Mode) => {
    if (currentMode === mode) {
      setCurrentMode(null)
    } else {
      setCurrentMode(mode)
    }
    setModeDate(new Date().toDateString())
  }

  const handleCapture = () => {
    if (!captureText.trim()) return
    const newIdea: Idea = {
      id: Date.now(),
      text: captureText.trim(),
      timestamp: new Date().toISOString()
    }
    setIdeas([newIdea, ...ideas])
    setCaptureText('')
    setSheetOpen(false)
  }

  const handleCaptureKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleCapture()
    }
  }

  const modeColors: Record<Mode, { bg: string; icon: string }> = {
    recovery: { bg: 'rgba(74, 111, 165, 0.08)', icon: 'rgb(74, 111, 165)' },
    'recovery-creation': { bg: 'rgba(107, 91, 149, 0.08)', icon: 'rgb(107, 91, 149)' },
    ambition: { bg: 'rgba(212, 165, 116, 0.08)', icon: 'rgb(212, 165, 116)' },
  }

  const navBtnBase = 'flex-1 h-11 text-[0px] font-[inherit] bg-transparent border-none rounded-xl cursor-pointer transition-all duration-[250ms] ease-in-out flex items-center justify-center touch-manipulation relative'
  const navBtnActive = 'bg-[rgba(255,255,255,0.1)] text-text-primary shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_2px_8px_rgba(0,0,0,0.2)]'
  const navBtnInactive = 'text-text-muted'

  return (
    <div
      className="flex flex-1 flex-col px-6 py-4 pt-[env(safe-area-inset-top,1rem)] pb-[env(safe-area-inset-bottom,1rem)] max-w-[480px] mx-auto w-full transition-[background-color] duration-700 ease-in-out"
      style={{ backgroundColor: currentMode ? modeColors[currentMode].bg : undefined }}
    >
      <div className="flex flex-1 flex-col">
        {screen === 'modes' && (
          <ModeSelection
            currentMode={currentMode}
            onSelectMode={handleSelectMode}
            onHaptic={() => haptic('nudge')}
          />
        )}
        {screen === 'ideas' && <IdeasScreen />}
        {screen === 'settings' && <SettingsScreen />}
        {screen === 'weekend' && <WeekendPlannerScreen />}
      </div>

      <div className="flex items-center gap-3 mt-auto">
        <nav className="flex flex-1 justify-center items-center gap-1 p-1 bg-glass-bg backdrop-blur-[40px] backdrop-saturate-[1.8] border border-glass-border rounded-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_4px_16px_rgba(0,0,0,0.3)]">
          <button
            className={`${navBtnBase} ${screen === 'modes' ? navBtnActive : navBtnInactive} transition-colors`}
            onClick={() => { haptic('nudge'); setScreen('modes') }}
            aria-label="Quiet Mind"
            style={{ color: currentMode ? modeColors[currentMode].icon : undefined }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          </button>
          <button
            className={`${navBtnBase} ${screen === 'ideas' ? navBtnActive : navBtnInactive}`}
            onClick={() => { haptic('nudge'); setScreen('ideas') }}
            aria-label="Ideas"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18h6"/>
              <path d="M10 22h4"/>
              <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>
            </svg>
          </button>
          <button
            className={`${navBtnBase} ${screen === 'weekend' ? navBtnActive : navBtnInactive}`}
            onClick={() => { haptic('nudge'); setScreen('weekend') }}
            aria-label="Weekend Planner"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </button>
        </nav>

        <button
          className="w-11 h-11 flex-shrink-0 bg-glass-bg backdrop-blur-[40px] backdrop-saturate-[1.8] border border-glass-border rounded-full cursor-pointer transition-all duration-[250ms] ease-in-out flex items-center justify-center touch-manipulation text-text-primary shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_4px_16px_rgba(0,0,0,0.3)] active:scale-[0.95] active:bg-[rgba(255,255,255,0.14)]"
          onClick={() => { haptic('nudge'); setSheetOpen(true) }}
          aria-label="New Note"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="bg-[rgba(20,20,22,0.95)] backdrop-blur-[40px] border-t border-glass-border rounded-t-2xl px-6 pb-[env(safe-area-inset-bottom,1.5rem)]">
          <div className="flex flex-col gap-4 pt-2">
            <textarea
              ref={captureInputRef}
              className="w-full min-h-[120px] p-4 text-base font-[inherit] bg-glass-bg backdrop-blur-[20px] border border-glass-border rounded-2xl text-text-primary resize-none outline-none transition-[border-color,background] duration-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] focus:border-[rgba(255,255,255,0.25)] focus:bg-[rgba(255,255,255,0.08)] placeholder:text-text-muted"
              placeholder="Capture an idea..."
              value={captureText}
              onChange={(e) => setCaptureText(e.target.value)}
              onKeyDown={handleCaptureKeyDown}
              autoFocus
            />
            <button
              className="w-full px-6 py-4 text-base font-medium font-[inherit] border-none rounded-[14px] cursor-pointer transition-all duration-200 bg-[rgba(255,255,255,0.12)] backdrop-blur-[20px] text-text-primary border border-glass-border shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] active:scale-[0.98] active:bg-[rgba(255,255,255,0.18)] disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
              onClick={handleCapture}
              disabled={!captureText.trim()}
            >
              Capture
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default App
