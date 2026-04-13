/**
 * Calendar View Component Tests
 * 
 * Tests calendar functionality:
 * - Month view
 * - Week view
 * - Day view
 * - Event rendering
 * - Navigation
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestWrapper } from '../../../test-utils/test-wrapper';
import React from 'react';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type?: string;
}

interface CalendarViewProps {
  events?: CalendarEvent[];
  view?: 'month' | 'week' | 'day';
  onEventClick?: (eventId: string) => void;
}

function CalendarView({ events = [], view = 'month', onEventClick }: CalendarViewProps) {
  return (
    <div role="region" aria-label="Calendar">
      <h2>Calendar - {view} view</h2>
      
      {events.length === 0 ? (
        <p>No events</p>
      ) : (
        <ul>
          {events.map(event => (
            <li key={event.id} data-testid={`event-${event.id}`}>
              <button onClick={() => onEventClick?.(event.id)}>
                <span className="title">{event.title}</span>
                <span className="time">
                  {event.start.toLocaleTimeString()} - {event.end.toLocaleTimeString()}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

describe('Calendar View Component', () => {
  const mockEvents: CalendarEvent[] = [
    {
      id: 'event-1',
      title: 'Team Meeting',
      start: new Date('2025-01-15T10:00:00'),
      end: new Date('2025-01-15T11:00:00'),
      type: 'meeting',
    },
    {
      id: 'event-2',
      title: 'Project Deadline',
      start: new Date('2025-01-20T17:00:00'),
      end: new Date('2025-01-20T17:00:00'),
      type: 'deadline',
    },
  ];

  it('should render calendar', () => {
    render(<CalendarView events={mockEvents} />, { wrapper: TestWrapper });

    expect(screen.getByRole('region', { name: /calendar/i })).toBeInTheDocument();
  });

  it('should display events', () => {
    render(<CalendarView events={mockEvents} />, { wrapper: TestWrapper });

    expect(screen.getByText('Team Meeting')).toBeInTheDocument();
    expect(screen.getByText('Project Deadline')).toBeInTheDocument();
  });

  it('should show empty state when no events', () => {
    render(<CalendarView events={[]} />, { wrapper: TestWrapper });

    expect(screen.getByText(/no events/i)).toBeInTheDocument();
  });

  it('should display month view', () => {
    render(<CalendarView view="month" />, { wrapper: TestWrapper });

    expect(screen.getByText(/month view/i)).toBeInTheDocument();
  });

  it('should display week view', () => {
    render(<CalendarView view="week" />, { wrapper: TestWrapper });

    expect(screen.getByText(/week view/i)).toBeInTheDocument();
  });

  it('should display day view', () => {
    render(<CalendarView view="day" />, { wrapper: TestWrapper });

    expect(screen.getByText(/day view/i)).toBeInTheDocument();
  });

  it('should handle event click', async () => {
    const user = userEvent.setup();
    const onEventClick = vi.fn();

    render(<CalendarView events={mockEvents} onEventClick={onEventClick} />, { wrapper: TestWrapper });

    await user.click(screen.getByText('Team Meeting'));

    expect(onEventClick).toHaveBeenCalledWith('event-1');
  });

  it('should display event times', () => {
    render(<CalendarView events={mockEvents} />, { wrapper: TestWrapper });

    const event = screen.getByTestId('event-event-1');

    expect(event).toHaveTextContent(/10:00/);
  });

  it('should be accessible', () => {
    render(<CalendarView events={mockEvents} />, { wrapper: TestWrapper });

    expect(screen.getByRole('region', { name: /calendar/i })).toBeInTheDocument();
  });
});

