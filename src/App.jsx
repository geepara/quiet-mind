import { useState, useEffect, useRef } from 'react'

const MODES = {
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

function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue]
}

function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef(null)

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false

      recognitionRef.current.onresult = (event) => {
        const text = event.results[0][0].transcript
        setTranscript(text)
        setIsListening(false)
      }

      recognitionRef.current.onerror = () => {
        setIsListening(false)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }
  }, [])

  const startListening = () => {
    if (recognitionRef.current) {
      setTranscript('')
      setIsListening(true)
      recognitionRef.current.start()
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  const supported = !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  return { isListening, transcript, startListening, stopListening, supported, clearTranscript: () => setTranscript('') }
}

function CaptureScreen() {
  const [text, setText] = useState('')
  const [ideas, setIdeas] = useLocalStorage('night-modes-ideas', [])
  const inputRef = useRef(null)

  const handleCapture = () => {
    if (!text.trim()) return

    const newIdea = {
      id: Date.now(),
      text: text.trim(),
      timestamp: new Date().toISOString()
    }

    setIdeas([newIdea, ...ideas])
    setText('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleCapture()
    }
  }

  return (
    <div className="capture-section">
      <textarea
        ref={inputRef}
        className="capture-input"
        placeholder="Capture an idea..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
      />
      <div className="capture-actions">
        <button
          className="btn btn-capture"
          onClick={handleCapture}
          disabled={!text.trim()}
        >
          Capture
        </button>
      </div>
    </div>
  )
}

function ModeSelection({ currentMode, onSelectMode, onNavigate }) {
  const handleSelect = (mode) => {
    onSelectMode(mode)
    onNavigate('capture')
  }

  return (
    <div className="mode-selection">
      <h2 className="mode-title">Choose tonight's mode</h2>
      <div className="mode-options">
        {Object.entries(MODES).map(([key, mode]) => (
          <div
            key={key}
            className={`mode-option ${key} ${currentMode === key ? 'selected' : ''}`}
            onClick={() => handleSelect(key)}
          >
            <div className="mode-option-name">{mode.name}</div>
            <div className="mode-option-desc">{mode.description}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function IdeasScreen() {
  const [ideas] = useLocalStorage('night-modes-ideas', [])

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()

    if (isToday) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <div className="ideas-screen">
      <h2 className="ideas-header">Captured Ideas</h2>
      {ideas.length === 0 ? (
        <div className="empty-state">No ideas captured yet</div>
      ) : (
        <div className="ideas-list">
          {ideas.map(idea => (
            <div key={idea.id} className="idea-item">
              <div className="idea-text">{idea.text}</div>
              <div className="idea-time">{formatTime(idea.timestamp)}</div>
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
      navigator.serviceWorker.ready.then(registration => {
        const [hours, minutes] = notificationTime.split(':').map(Number)
        const now = new Date()
        const scheduledTime = new Date(now)
        scheduledTime.setHours(hours, minutes, 0, 0)

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
  }, [notificationTime, notificationEnabled])

  return (
    <div className="settings-screen">
      <h2 className="settings-header">Settings</h2>

      <div className="setting-item">
        <span className="setting-label">Daily Reminder</span>
        {notificationEnabled ? (
          <input
            type="time"
            value={notificationTime}
            onChange={(e) => setNotificationTime(e.target.value)}
            className="btn-small"
          />
        ) : (
          <button className="btn-small" onClick={requestNotifications}>
            Enable
          </button>
        )}
      </div>

      <p className="notification-status">
        {notificationEnabled
          ? `Reminder set for ${notificationTime}`
          : 'Enable notifications for daily mode reminders'}
      </p>
    </div>
  )
}

function WeekendPlannerScreen() {
  return (
    <div className="weekend-screen">
      <h2 className="weekend-header">Weekend Planner</h2>
      <div className="empty-state">Coming soon — plan your ideal weekend here.</div>
    </div>
  )
}

function App() {
  const [screen, setScreen] = useState('capture')
  const [currentMode, setCurrentMode] = useLocalStorage('night-modes-current-mode', null)
  const [modeDate, setModeDate] = useLocalStorage('night-modes-mode-date', null)

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

  const handleSelectMode = (mode) => {
    setCurrentMode(mode)
    setModeDate(new Date().toDateString())
  }

  return (
    <div className="app">
      <div className="screen-content">
        {screen === 'capture' && <CaptureScreen />}
        {screen === 'modes' && (
          <ModeSelection
            currentMode={currentMode}
            onSelectMode={handleSelectMode}
            onNavigate={setScreen}
          />
        )}
        {screen === 'ideas' && <IdeasScreen />}
        {screen === 'settings' && <SettingsScreen />}
        {screen === 'weekend' && <WeekendPlannerScreen />}
      </div>

      <nav className="nav-bar">
        <button
          className={`nav-btn ${screen === 'modes' || screen === 'capture' ? 'active' : ''}`}
          onClick={() => setScreen('modes')}
          aria-label="Night Mode"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        </button>
        <button
          className={`nav-btn nav-btn-center ${screen === 'capture' ? 'active' : ''}`}
          onClick={() => setScreen('capture')}
          aria-label="New Note"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
        <button
          className={`nav-btn ${screen === 'weekend' ? 'active' : ''}`}
          onClick={() => setScreen('weekend')}
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
    </div>
  )
}

export default App
