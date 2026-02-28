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

function CaptureScreen({ currentMode, onNavigate }) {
  const [text, setText] = useState('')
  const [ideas, setIdeas] = useLocalStorage('night-modes-ideas', [])
  const inputRef = useRef(null)
  const { isListening, transcript, startListening, stopListening, supported, clearTranscript } = useSpeechRecognition()

  useEffect(() => {
    if (transcript) {
      setText(prev => prev ? `${prev} ${transcript}` : transcript)
      clearTranscript()
    }
  }, [transcript, clearTranscript])

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

  const mode = currentMode ? MODES[currentMode] : null

  return (
    <>
      {mode && (
        <div className={`mode-banner ${currentMode}`} onClick={() => onNavigate('modes')}>
          <div className="mode-label">Tonight's Mode</div>
          <div className="mode-name">{mode.name}</div>
          <div className="mode-affirmation">{mode.affirmation}</div>
        </div>
      )}

      {!mode && (
        <div className="mode-banner" onClick={() => onNavigate('modes')}>
          <div className="mode-affirmation">Tap to choose tonight's mode</div>
        </div>
      )}

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
          {supported && (
            <button
              className={`btn btn-voice ${isListening ? 'listening' : ''}`}
              onClick={isListening ? stopListening : startListening}
            >
              {isListening ? '■' : '🎤'}
            </button>
          )}
        </div>
      </div>
    </>
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
      {screen === 'capture' && (
        <CaptureScreen
          currentMode={currentMode}
          onNavigate={setScreen}
        />
      )}
      {screen === 'modes' && (
        <ModeSelection
          currentMode={currentMode}
          onSelectMode={handleSelectMode}
          onNavigate={setScreen}
        />
      )}
      {screen === 'ideas' && <IdeasScreen />}
      {screen === 'settings' && <SettingsScreen />}

      <nav className="nav-bar">
        <button
          className={`nav-btn ${screen === 'capture' ? 'active' : ''}`}
          onClick={() => setScreen('capture')}
        >
          Capture
        </button>
        <button
          className={`nav-btn ${screen === 'ideas' ? 'active' : ''}`}
          onClick={() => setScreen('ideas')}
        >
          Ideas
        </button>
        <button
          className={`nav-btn ${screen === 'settings' ? 'active' : ''}`}
          onClick={() => setScreen('settings')}
        >
          Settings
        </button>
      </nav>
    </div>
  )
}

export default App
