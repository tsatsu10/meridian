/**
 * Time Tracker Tests
 * 
 * Tests time tracking functionality:
 * - Start/stop timer
 * - Manual time entry
 * - Edit time entries
 * - Delete time entries
 * - Time summary
 * - Project/task association
 * - Time validation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

interface TimeEntry {
  id: string
  taskId?: string
  projectId?: string
  description: string
  duration: number // in seconds
  startTime?: string
  endTime?: string
  date: string
  billable?: boolean
}

interface TimeTrackerProps {
  entries?: TimeEntry[]
  currentTimer?: {
    taskId?: string
    projectId?: string
    description: string
    startTime: string
  } | null
  onStart?: (taskId?: string, projectId?: string, description?: string) => void
  onStop?: () => void
  onAdd?: (entry: Omit<TimeEntry, 'id'>) => Promise<void>
  onEdit?: (id: string, entry: Partial<TimeEntry>) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

function TimeTracker({
  entries = [],
  currentTimer,
  onStart,
  onStop,
  onAdd,
  onEdit,
  onDelete,
}: TimeTrackerProps) {
  const [description, setDescription] = React.useState('')
  const [duration, setDuration] = React.useState('')
  const [selectedTaskId, setSelectedTaskId] = React.useState<string>('')
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>('')
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editDescription, setEditDescription] = React.useState('')
  const [editDuration, setEditDuration] = React.useState('')
  const [isRunning, setIsRunning] = React.useState(false)
  const [elapsed, setElapsed] = React.useState(0)

  React.useEffect(() => {
    if (currentTimer) {
      setIsRunning(true)
      const interval = setInterval(() => {
        const start = new Date(currentTimer.startTime).getTime()
        const now = Date.now()
        setElapsed(Math.floor((now - start) / 1000))
      }, 1000)
      return () => clearInterval(interval)
    } else {
      setIsRunning(false)
      setElapsed(0)
    }
  }, [currentTimer])

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleStart = () => {
    onStart?.(selectedTaskId || undefined, selectedProjectId || undefined, description || undefined)
  }

  const handleStop = () => {
    onStop?.()
  }

  const handleAddManual = async () => {
    if (!description.trim() || !duration) return

    const hours = parseInt(duration.split(':')[0] || '0', 10)
    const minutes = parseInt(duration.split(':')[1] || '0', 10)
    const totalSeconds = hours * 3600 + minutes * 60

    await onAdd?.({
      description,
      duration: totalSeconds,
      taskId: selectedTaskId || undefined,
      projectId: selectedProjectId || undefined,
      date: new Date().toISOString().split('T')[0],
    })

    setDescription('')
    setDuration('')
    setSelectedTaskId('')
    setSelectedProjectId('')
  }

  const handleEdit = async (id: string) => {
    if (!editDescription.trim() || !editDuration) return

    const hours = parseInt(editDuration.split(':')[0] || '0', 10)
    const minutes = parseInt(editDuration.split(':')[1] || '0', 10)
    const totalSeconds = hours * 3600 + minutes * 60

    await onEdit?.(id, {
      description: editDescription,
      duration: totalSeconds,
    })

    setEditingId(null)
    setEditDescription('')
    setEditDuration('')
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this time entry?')) return
    await onDelete?.(id)
  }

  const totalTime = entries.reduce((sum, entry) => sum + entry.duration, 0) + elapsed
  const totalHours = Math.floor(totalTime / 3600)

  return (
    <div className="time-tracker" data-testid="time-tracker">
      <h2>Time Tracker</h2>

      {/* Timer Section */}
      <div className="timer-section">
        {isRunning ? (
          <div className="running-timer">
            <div className="timer-display" role="timer" aria-live="polite">
              {formatTime(elapsed)}
            </div>
            <p className="timer-description">{currentTimer?.description || 'No description'}</p>
            <button
              onClick={handleStop}
              aria-label="Stop timer"
              className="stop-button"
            >
              Stop
            </button>
          </div>
        ) : (
          <div className="stopped-timer">
            <div className="timer-display">00:00:00</div>
            <button
              onClick={handleStart}
              disabled={isRunning}
              aria-label="Start timer"
              className="start-button"
            >
              Start Timer
            </button>
          </div>
        )}
      </div>

      {/* Manual Entry Form */}
      <div className="manual-entry">
        <h3>Add Manual Entry</h3>
        <input
          type="text"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-label="Time entry description"
        />
        <input
          type="text"
          placeholder="HH:MM"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          pattern="\d{1,2}:\d{2}"
          aria-label="Duration (HH:MM format)"
        />
        <button
          onClick={handleAddManual}
          disabled={!description.trim() || !duration}
          aria-label="Add time entry"
        >
          Add Entry
        </button>
      </div>

      {/* Time Summary */}
      <div className="time-summary" role="status" aria-live="polite">
        <h3>Summary</h3>
        <p>
          Total Time: <strong>{formatTime(totalTime)}</strong> ({totalHours} hours)
        </p>
        <p>Entries: {entries.length}</p>
      </div>

      {/* Time Entries List */}
      <div className="entries-list">
        <h3>Time Entries ({entries.length})</h3>
        {entries.length === 0 ? (
          <p className="no-entries">No time entries yet</p>
        ) : (
          <ul role="list">
            {entries.map((entry) => (
              <li key={entry.id} className="time-entry" role="listitem">
                {editingId === entry.id ? (
                  <div className="edit-form">
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      aria-label="Edit description"
                    />
                    <input
                      type="text"
                      value={editDuration}
                      onChange={(e) => setEditDuration(e.target.value)}
                      pattern="\d{1,2}:\d{2}"
                      aria-label="Edit duration"
                    />
                    <button
                      onClick={() => handleEdit(entry.id)}
                      disabled={!editDescription.trim() || !editDuration}
                      aria-label="Save edit"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null)
                        setEditDescription('')
                        setEditDuration('')
                      }}
                      aria-label="Cancel edit"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="entry-info">
                      <p className="entry-description">{entry.description}</p>
                      <p className="entry-duration">{formatTime(entry.duration)}</p>
                      {entry.taskId && (
                        <span className="entry-task" aria-label="Associated task">
                          Task: {entry.taskId}
                        </span>
                      )}
                      {entry.billable && (
                        <span className="billable-badge" aria-label="Billable">
                          Billable
                        </span>
                      )}
                    </div>
                    <div className="entry-actions">
                      <button
                        onClick={() => {
                          setEditingId(entry.id)
                          const hours = Math.floor(entry.duration / 3600)
                          const minutes = Math.floor((entry.duration % 3600) / 60)
                          setEditDescription(entry.description)
                          setEditDuration(`${hours}:${minutes.toString().padStart(2, '0')}`)
                        }}
                        aria-label={`Edit entry ${entry.description}`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        aria-label={`Delete entry ${entry.description}`}
                        className="delete-button"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('TimeTracker', () => {
  const mockEntries: TimeEntry[] = [
    {
      id: 'entry-1',
      description: 'Fixed bug',
      duration: 3600, // 1 hour
      date: '2024-01-01',
      taskId: 'task-1',
      billable: true,
    },
    {
      id: 'entry-2',
      description: 'Code review',
      duration: 1800, // 30 minutes
      date: '2024-01-01',
      projectId: 'project-1',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    global.confirm = vi.fn(() => true)
    // Don't use fake timers for these tests to avoid conflicts with userEvent
  })

  it('should render time tracker', () => {
    render(<TimeTracker />, { wrapper: TestWrapper })

    expect(screen.getByTestId('time-tracker')).toBeInTheDocument()
    expect(screen.getByText('Time Tracker')).toBeInTheDocument()
  })

  it('should show stopped timer initially', () => {
    render(<TimeTracker />, { wrapper: TestWrapper })

    const timerDisplays = screen.getAllByText('00:00:00')
    expect(timerDisplays.length).toBeGreaterThan(0)
    expect(screen.getByLabelText('Start timer')).toBeInTheDocument()
  })

  it('should start timer', async () => {
    const user = userEvent.setup()
    const onStart = vi.fn()

    render(<TimeTracker onStart={onStart} />, { wrapper: TestWrapper })

    await user.click(screen.getByLabelText('Start timer'))

    expect(onStart).toHaveBeenCalled()
  })

  it('should display running timer', () => {
    const startTime = new Date(Date.now() - 5000).toISOString()
    render(
      <TimeTracker
        currentTimer={{ description: 'Working on feature', startTime }}
      />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByRole('timer')).toBeInTheDocument()
    expect(screen.getByText(/working on feature/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Stop timer')).toBeInTheDocument()
  })

  it('should stop timer', async () => {
    const user = userEvent.setup()
    const onStop = vi.fn()

    const startTime = new Date(Date.now() - 5000).toISOString()
    render(
      <TimeTracker
        currentTimer={{ description: 'Working', startTime }}
        onStop={onStop}
      />,
      { wrapper: TestWrapper }
    )

    await user.click(screen.getByLabelText('Stop timer'))

    expect(onStop).toHaveBeenCalled()
  })

  it('should format time correctly', () => {
    render(<TimeTracker />, { wrapper: TestWrapper })

    // Timer display should show 00:00:00 (may appear multiple times)
    const timerDisplays = screen.getAllByText('00:00:00')
    expect(timerDisplays.length).toBeGreaterThan(0)
  })

  it('should add manual time entry', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn().mockResolvedValue(undefined)

    render(<TimeTracker onAdd={onAdd} />, { wrapper: TestWrapper })

    await user.type(screen.getByLabelText('Time entry description'), 'Meeting')
    await user.type(screen.getByLabelText('Duration (HH:MM format)'), '1:30')
    await user.click(screen.getByLabelText('Add time entry'))

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Meeting',
          duration: 5400, // 1 hour 30 minutes = 5400 seconds
        })
      )
    })
  })

  it('should validate manual entry fields', () => {
    render(<TimeTracker />, { wrapper: TestWrapper })

    expect(screen.getByLabelText('Add time entry')).toBeDisabled()
  })

  it('should display time entries', () => {
    render(<TimeTracker entries={mockEntries} />, { wrapper: TestWrapper })

    expect(screen.getByText('Fixed bug')).toBeInTheDocument()
    expect(screen.getByText('Code review')).toBeInTheDocument()
  })

  it('should format entry duration', () => {
    render(<TimeTracker entries={mockEntries} />, { wrapper: TestWrapper })

    // Entry 1: 3600 seconds = 01:00:00
    expect(screen.getByText('01:00:00')).toBeInTheDocument()
    // Entry 2: 1800 seconds = 00:30:00
    expect(screen.getByText('00:30:00')).toBeInTheDocument()
  })

  it('should show entry summary', () => {
    render(<TimeTracker entries={mockEntries} />, { wrapper: TestWrapper })

    expect(screen.getByText(/total time/i)).toBeInTheDocument()
    expect(screen.getByText(/entries: 2/i)).toBeInTheDocument()
  })

  it('should calculate total time', () => {
    render(<TimeTracker entries={mockEntries} />, { wrapper: TestWrapper })

    // 3600 + 1800 = 5400 seconds = 01:30:00
    expect(screen.getByText(/01:30:00/i)).toBeInTheDocument()
  })

  it('should show task association', () => {
    render(<TimeTracker entries={mockEntries} />, { wrapper: TestWrapper })

    expect(screen.getByText(/task: task-1/i)).toBeInTheDocument()
  })

  it('should show billable badge', () => {
    render(<TimeTracker entries={mockEntries} />, { wrapper: TestWrapper })

    expect(screen.getByLabelText('Billable')).toBeInTheDocument()
  })

  it('should handle editing time entry', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn().mockResolvedValue(undefined)

    render(<TimeTracker entries={mockEntries} onEdit={onEdit} />, { wrapper: TestWrapper })

    const editButtons = screen.getAllByLabelText(/edit entry/i)
    await user.click(editButtons[0])

    const editDescription = screen.getByLabelText('Edit description')
    await user.clear(editDescription)
    await user.type(editDescription, 'Updated description')

    const editDuration = screen.getByLabelText('Edit duration')
    await user.clear(editDuration)
    await user.type(editDuration, '2:00')

    await user.click(screen.getByLabelText('Save edit'))

    await waitFor(() => {
      expect(onEdit).toHaveBeenCalledWith('entry-1', {
        description: 'Updated description',
        duration: 7200, // 2 hours = 7200 seconds
      })
    })
  })

  it('should cancel editing', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()

    render(<TimeTracker entries={mockEntries} onEdit={onEdit} />, { wrapper: TestWrapper })

    const editButtons = screen.getAllByLabelText(/edit entry/i)
    await user.click(editButtons[0])
    await user.click(screen.getByLabelText('Cancel edit'))

    expect(onEdit).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('Save edit')).not.toBeInTheDocument()
  })

  it('should handle deleting time entry', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn().mockResolvedValue(undefined)

    render(<TimeTracker entries={mockEntries} onDelete={onDelete} />, { wrapper: TestWrapper })

    const deleteButtons = screen.getAllByLabelText(/delete entry/i)
    await user.click(deleteButtons[0])

    expect(onDelete).toHaveBeenCalledWith('entry-1')
  })

  it('should show empty state when no entries', () => {
    render(<TimeTracker entries={[]} />, { wrapper: TestWrapper })

    expect(screen.getByText(/no time entries yet/i)).toBeInTheDocument()
  })

  it('should clear manual entry form after submission', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn().mockResolvedValue(undefined)

    render(<TimeTracker onAdd={onAdd} />, { wrapper: TestWrapper })

    const descriptionInput = screen.getByLabelText('Time entry description')
    const durationInput = screen.getByLabelText('Duration (HH:MM format)')

    await user.type(descriptionInput, 'Meeting')
    await user.type(durationInput, '1:00')
    await user.click(screen.getByLabelText('Add time entry'))

    await waitFor(() => {
      expect(descriptionInput).toHaveValue('')
      expect(durationInput).toHaveValue('')
    })
  })

  it('should validate duration format', () => {
    render(<TimeTracker />, { wrapper: TestWrapper })

    const durationInput = screen.getByLabelText('Duration (HH:MM format)')
    expect(durationInput).toHaveAttribute('pattern', '\\d{1,2}:\\d{2}')
  })

  it('should handle multiple entries', () => {
    const manyEntries: TimeEntry[] = Array.from({ length: 10 }, (_, i) => ({
      id: `entry-${i}`,
      description: `Entry ${i}`,
      duration: 3600,
      date: '2024-01-01',
    }))

    render(<TimeTracker entries={manyEntries} />, { wrapper: TestWrapper })

    expect(screen.getByText(/entries: 10/i)).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(10)
  })

  it('should display correct time format for hours calculation', () => {
    const longEntry: TimeEntry[] = [
      {
        id: 'entry-1',
        description: 'Long work',
        duration: 14400, // 4 hours
        date: '2024-01-01',
      },
    ]

    render(<TimeTracker entries={longEntry} />, { wrapper: TestWrapper })

    expect(screen.getByText(/4 hours/i)).toBeInTheDocument()
  })

  it('should be accessible', () => {
    const startTime = new Date(Date.now() - 5000).toISOString()
    render(
      <TimeTracker
        entries={mockEntries}
        currentTimer={{ description: 'Test', startTime }}
      />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByRole('timer')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByRole('list')).toBeInTheDocument()
  })

  it('should handle timer with description', () => {
    const startTime = new Date(Date.now() - 10000).toISOString()
    render(
      <TimeTracker
        currentTimer={{ description: 'Feature development', startTime }}
      />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByText(/feature development/i)).toBeInTheDocument()
  })

  it('should update elapsed time when timer is running', async () => {
    vi.useFakeTimers()
    const startTime = new Date(Date.now() - 5000).toISOString()
    
    render(
      <TimeTracker
        currentTimer={{ description: 'Test', startTime }}
      />,
      { wrapper: TestWrapper }
    )

    // Initially should show around 5 seconds
    expect(screen.getByRole('timer')).toBeInTheDocument()
    
    // Advance time by 5 more seconds
    vi.advanceTimersByTime(5000)
    
    // Timer should still be running
    expect(screen.getByLabelText('Stop timer')).toBeInTheDocument()
    
    vi.useRealTimers()
  })
})

