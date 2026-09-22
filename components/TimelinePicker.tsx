'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  History,
  CalendarDays,
  Check,
  X,
} from 'lucide-react';
import {
  type Timeline,
  type RangePreset,
  RANGE_PRESETS,
  formatTimeline,
  resolveRangeStart,
  formatDisplayDate,
  getCalendarMonthDays,
  formatLocalDate,
} from '@/lib/timeline';
import Popover from '@/components/ui/Popover';
import SegmentedControl from '@/components/ui/SegmentedControl';
import Icon from '@/components/ui/Icon';
import IconButton from '@/components/ui/IconButton';

export interface TimelinePickerProps {
  value: Timeline | null;
  onChange: (timeline: Timeline | null) => void;
  disabled?: boolean;
  id?: string;
  hasError?: boolean;
}

export default function TimelinePicker({
  value,
  onChange,
  disabled = false,
  id = 'timeline-picker',
  hasError = false,
}: TimelinePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'range' | 'date'>(
    value?.kind === 'date' ? 'date' : 'range'
  );

  const [viewYear, setViewYear] = useState(
    value?.kind === 'date' ? parseInt(value.date.split('-')[0], 10) : 2024
  );
  const [viewMonth, setViewMonth] = useState(
    value?.kind === 'date' ? parseInt(value.date.split('-')[1], 10) - 1 : 0
  );
  const [showYearPicker, setShowYearPicker] = useState(false);

  // Stable reference to the current date — set once and never updated.
  // Using a ref avoids re-renders and keeps future-date checks consistent.
  const nowRef = useRef(new Date());

  // Sync calendar to actual current month after hydration (client-only)
  useEffect(() => {
    if (value?.kind !== 'date') {
      const now = nowRef.current;
      setViewYear(now.getFullYear());
      setViewMonth(now.getMonth());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live hover preview for Range presets
  const [hoveredPreset, setHoveredPreset] = useState<RangePreset | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);

  const displayText = formatTimeline(value);

  const handleSelectPreset = (preset: RangePreset) => {
    onChange({ kind: 'range', preset });
    setIsOpen(false);
  };

  const handleSelectDate = (dateStr: string) => {
    onChange({ kind: 'date', date: dateStr });
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      if (viewYear > 2005) {
        setViewYear((y) => y - 1);
        setViewMonth(11);
      }
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    const isCurrentYear = viewYear === nowRef.current.getFullYear();
    if (isCurrentYear && viewMonth >= nowRef.current.getMonth()) return;

    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleTodayShortcut = () => {
    const todayStr = formatLocalDate(nowRef.current);
    handleSelectDate(todayStr);
  };

  const handleOneYearAgoShortcut = () => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const dateStr = formatLocalDate(oneYearAgo);
    handleSelectDate(dateStr);
  };

  const activeRangePreset = value?.kind === 'range' ? value.preset : null;
  const activeDate = value?.kind === 'date' ? value.date : null;

  // Resolved range helper text
  const previewPreset = hoveredPreset || activeRangePreset;
  const resolvedStartDate = previewPreset ? resolveRangeStart(previewPreset) : null;

  const calendarDays = getCalendarMonthDays(viewYear, viewMonth);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Year list from current year back to 2005
  const yearsList: number[] = [];
  for (let y = nowRef.current.getFullYear(); y >= 2005; y--) {
    yearsList.push(y);
  }

  return (
    <div className="timeline-picker-wrap">
      {/* Trigger Row */}
      <div className={`timeline-field ${hasError ? 'has-error' : ''} ${isOpen ? 'is-open' : ''}`}>
        <button
          ref={triggerRef}
          type="button"
          id={id}
          className="timeline-trigger"
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-label={displayText ? `Timeline: ${displayText}` : 'Select Timeline'}
        >
          <span className="trigger-icon">
            <Icon as={CalendarClock} size={18} anim="tick" />
          </span>

          <span className={`trigger-text truncate ${!displayText ? 'placeholder' : ''}`}>
            {displayText || 'Select Timeline'}
          </span>

          <span className={`trigger-chevron ${isOpen ? 'open' : ''}`} aria-hidden="true">
            <Icon as={ChevronDown} size={16} />
          </span>
        </button>

        {/* Clear Button (Sibling of trigger, not nested inside it) */}
        {value && !disabled && (
          <IconButton
            aria-label="Clear timeline selection"
            size="sm"
            onClick={handleClear}
            className="timeline-clear-btn"
          >
            <Icon as={X} size={14} anim="pop" />
          </IconButton>
        )}
      </div>

      {/* Popover / Sheet Container */}
      <Popover
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        triggerRef={triggerRef}
        width={360}
        maxHeight={540}
        title="Timeline"
      >
        <div className="timeline-panel">
          {/* Mode Switcher */}
          <div className="timeline-mode-switch">
            <SegmentedControl
              options={[
                {
                  value: 'range',
                  label: 'Range',
                  icon: <Icon as={History} size={16} anim="tick" />,
                },
                {
                  value: 'date',
                  label: 'Date',
                  icon: <Icon as={CalendarDays} size={16} anim="flip" />,
                },
              ]}
              value={activeTab}
              onChange={(tab) => {
                setActiveTab(tab);
                setShowYearPicker(false);
              }}
              fullWidth
              size="sm"
              aria-label="Timeline selection mode"
            />
          </div>

          {/* ── Tab: Range Presets ── */}
          {activeTab === 'range' && (
            <div className="timeline-range-content">
              {/* Months Group */}
              <div className="preset-group">
                <span className="group-title">Months</span>
                <div className="preset-grid">
                  {RANGE_PRESETS.filter((p) => p.group === 'months').map((preset) => {
                    const isSelected = activeRangePreset === preset.value;
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className={`preset-row ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectPreset(preset.value)}
                        onMouseEnter={() => setHoveredPreset(preset.value)}
                        onMouseLeave={() => setHoveredPreset(null)}
                        onFocus={() => setHoveredPreset(preset.value)}
                        onBlur={() => setHoveredPreset(null)}
                      >
                        <span className="preset-label">{preset.label}</span>
                        {isSelected && (
                          <span className="preset-check" aria-hidden="true">
                            <Icon as={Check} size={16} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Years Group */}
              <div className="preset-group">
                <span className="group-title">Years</span>
                <div className="preset-grid">
                  {RANGE_PRESETS.filter((p) => p.group === 'years').map((preset) => {
                    const isSelected = activeRangePreset === preset.value;
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className={`preset-row ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectPreset(preset.value)}
                        onMouseEnter={() => setHoveredPreset(preset.value)}
                        onMouseLeave={() => setHoveredPreset(null)}
                        onFocus={() => setHoveredPreset(preset.value)}
                        onBlur={() => setHoveredPreset(null)}
                      >
                        <span className="preset-label">{preset.label}</span>
                        {isSelected && (
                          <span className="preset-check" aria-hidden="true">
                            <Icon as={Check} size={16} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Helper Preview */}
              <div className="range-helper" aria-live="polite">
                {resolvedStartDate ? (
                  <span>
                    Videos published since <strong>{formatDisplayDate(resolvedStartDate)}</strong>
                  </span>
                ) : (
                  <span>Select how far back to search</span>
                )}
              </div>
            </div>
          )}

          {/* ── Tab: Calendar Day Picker ── */}
          {activeTab === 'date' && (
            <div className="timeline-date-content">
              {/* Calendar Header Navigation */}
              <div className="calendar-header">
                <IconButton
                  aria-label="Previous month"
                  size="sm"
                  onClick={handlePrevMonth}
                  disabled={viewYear <= 2005 && viewMonth <= 3}
                >
                  <Icon as={ChevronLeft} size={18} anim="nudge-x" />
                </IconButton>

                <button
                  type="button"
                  className="calendar-title-btn"
                  onClick={() => setShowYearPicker((v) => !v)}
                  aria-label="Switch to month/year quick jump"
                  title="Click to jump year"
                >
                  <span>
                    {monthNames[viewMonth]} {viewYear}
                  </span>
                  <Icon as={ChevronDown} size={14} />
                </button>

                <IconButton
                  aria-label="Next month"
                  size="sm"
                  onClick={handleNextMonth}
                  disabled={viewYear === nowRef.current.getFullYear() && viewMonth >= nowRef.current.getMonth()}
                >
                  <Icon as={ChevronRight} size={18} anim="nudge-x" />
                </IconButton>
              </div>

              {/* Quick Jump Dropdown for Year / Month */}
              {showYearPicker ? (
                <div className="year-month-picker" role="dialog" aria-label="Select Year and Month">
                  <div className="year-selector">
                    <span className="picker-subheading">Year</span>
                    <div className="years-scroll-list">
                      {yearsList.map((y) => (
                        <button
                          key={y}
                          type="button"
                          className={`year-item ${viewYear === y ? 'selected' : ''}`}
                          onClick={() => {
                            setViewYear(y);
                            if (y === nowRef.current.getFullYear() && viewMonth > nowRef.current.getMonth()) {
                              setViewMonth(nowRef.current.getMonth());
                            }
                          }}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="month-selector">
                    <span className="picker-subheading">Month</span>
                    <div className="months-grid">
                      {monthNames.map((name, idx) => {
                        const isFuture = viewYear === nowRef.current.getFullYear() && idx > nowRef.current.getMonth();
                        const isBeforeLaunch = viewYear === 2005 && idx < 3;
                        const isDis = isFuture || isBeforeLaunch;
                        return (
                          <button
                            key={name}
                            type="button"
                            className={`month-item ${viewMonth === idx ? 'selected' : ''}`}
                            disabled={isDis}
                            onClick={() => {
                              setViewMonth(idx);
                              setShowYearPicker(false);
                            }}
                          >
                            {name.slice(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Weekday headers */}
                  <div className="calendar-weekdays" aria-hidden="true">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                      <span key={d} className="weekday-cell">
                        {d}
                      </span>
                    ))}
                  </div>

                  {/* Days grid */}
                  <div className="calendar-grid" role="grid" aria-label="Calendar days">
                    {calendarDays.map((day, idx) => {
                      const isSelected = activeDate === day.dateStr;
                      return (
                        <button
                          key={`${day.dateStr}-${idx}`}
                          type="button"
                          role="gridcell"
                          disabled={!day.isSelectable}
                          aria-selected={isSelected}
                          aria-label={formatDisplayDate(day.dateStr)}
                          className={`day-cell ${day.isCurrentMonth ? 'curr-month' : 'other-month'} ${
                            day.isToday ? 'is-today' : ''
                          } ${isSelected ? 'selected' : ''}`}
                          onClick={() => day.isSelectable && handleSelectDate(day.dateStr)}
                        >
                          {day.dayNum}
                        </button>
                      );
                    })}
                  </div>

                  {/* Shortcuts: Today & 1 Year Ago */}
                  <div className="calendar-shortcuts">
                    <button
                      type="button"
                      className="calendar-shortcut-btn"
                      onClick={handleTodayShortcut}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      className="calendar-shortcut-btn"
                      onClick={handleOneYearAgoShortcut}
                    >
                      1 Year Ago Today
                    </button>
                  </div>
                </>
              )}

              {/* Helper */}
              <div className="range-helper">
                {activeDate ? (
                  <span>
                    Videos published on <strong>{formatDisplayDate(activeDate)}</strong>
                  </span>
                ) : (
                  <span>Click a day to find videos published on that exact date</span>
                )}
              </div>
            </div>
          )}
        </div>
      </Popover>

      <style jsx>{`
        .timeline-picker-wrap {
          position: relative;
          width: 100%;
        }

        .timeline-field {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
          height: var(--control-h);
          background-color: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
        }
        .timeline-field.is-open,
        .timeline-field:focus-within {
          border-color: var(--text-secondary);
          box-shadow: 0 0 0 3px var(--accent-subtle);
        }
        .timeline-field.has-error {
          border-color: var(--error);
        }

        .timeline-trigger {
          flex: 1;
          height: 100%;
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: 0 var(--space-3);
          background: transparent;
          color: var(--text-primary);
          font-size: var(--text-base);
          text-align: left;
          cursor: pointer;
          min-width: 0;
        }

        .trigger-icon {
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }

        .trigger-text {
          flex: 1;
          color: var(--text-primary);
          font-size: var(--text-sm);
          font-weight: 500;
        }
        .trigger-text.placeholder {
          color: var(--text-muted);
          font-weight: 400;
        }

        .trigger-chevron {
          color: var(--text-muted);
          display: flex;
          align-items: center;
          transition: transform 180ms var(--ease-standard);
          flex-shrink: 0;
        }
        .trigger-chevron.open {
          transform: rotate(180deg);
        }

        :global(.timeline-clear-btn) {
          margin-right: 4px;
          color: var(--text-muted) !important;
        }
        :global(.timeline-clear-btn:hover) {
          color: var(--text-primary) !important;
        }

        /* ── Panel Content ── */
        .timeline-panel {
          display: flex;
          flex-direction: column;
          padding: var(--space-3);
          gap: var(--space-3);
          width: 100%;
        }

        .timeline-mode-switch {
          padding-bottom: 2px;
        }

        /* ── Range Tab ── */
        .timeline-range-content {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .preset-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }

        .group-title {
          font-size: var(--text-xs);
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding-left: var(--space-1);
        }

        .preset-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 4px;
        }

        .preset-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          background-color: var(--surface-2);
          border: 1px solid transparent;
          color: var(--text-secondary);
          font-size: var(--text-sm);
          font-weight: 500;
          transition: background-color var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
          cursor: pointer;
          min-height: 40px;
        }
        .preset-row:hover {
          background-color: var(--surface-3);
          color: var(--text-primary);
        }
        .preset-row.selected {
          background-color: var(--surface-4);
          border-color: var(--accent);
          color: #fff;
          font-weight: 600;
        }
        .preset-check {
          color: var(--accent);
          display: flex;
          align-items: center;
        }

        .range-helper {
          font-size: var(--text-xs);
          color: var(--text-muted);
          text-align: center;
          padding-top: var(--space-2);
          border-top: 1px solid var(--border-subtle);
          line-height: 1.4;
        }
        .range-helper strong {
          color: var(--text-primary);
        }

        /* ── Date Tab ── */
        .timeline-date-content {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .calendar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 var(--space-1);
        }

        .calendar-title-btn {
          display: inline-flex;
          align-items: center;
          gap: var(--space-1);
          padding: 4px 10px;
          border-radius: var(--radius-sm);
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--text-primary);
          transition: background-color var(--transition-fast);
          cursor: pointer;
        }
        .calendar-title-btn:hover {
          background-color: var(--surface-3);
        }

        .calendar-weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          text-align: center;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          padding: 4px 0;
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
        }

        .day-cell {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: var(--text-xs);
          border-radius: var(--radius-sm);
          background: transparent;
          color: var(--text-primary);
          transition: background-color var(--transition-fast), color var(--transition-fast);
          cursor: pointer;
          min-width: 32px;
          min-height: 32px;
        }
        .day-cell.other-month {
          color: var(--border-strong);
        }
        .day-cell:hover:not(:disabled) {
          background-color: var(--surface-3);
        }
        .day-cell.is-today {
          box-shadow: inset 0 0 0 1px var(--accent);
          font-weight: 600;
        }
        .day-cell.selected {
          background-color: var(--accent) !important;
          color: #fff !important;
          font-weight: 700;
        }
        .day-cell:disabled {
          opacity: 0.25;
          cursor: not-allowed;
        }

        .calendar-shortcuts {
          display: flex;
          justify-content: space-between;
          gap: var(--space-2);
          padding-top: var(--space-2);
        }

        .calendar-shortcut-btn {
          font-size: var(--text-xs);
          color: var(--accent);
          font-weight: 500;
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          transition: background-color var(--transition-fast);
          cursor: pointer;
        }
        .calendar-shortcut-btn:hover {
          background-color: var(--accent-subtle);
        }

        /* Year/Month Selector Dropdown view */
        .year-month-picker {
          display: flex;
          gap: var(--space-3);
          height: 220px;
          padding: var(--space-2);
          background-color: var(--surface-2);
          border-radius: var(--radius-md);
        }
        .year-selector {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .month-selector {
          flex: 2;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .picker-subheading {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: var(--space-1);
        }
        .years-scroll-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding-right: 4px;
        }
        .year-item {
          text-align: left;
          padding: 4px 8px;
          font-size: var(--text-xs);
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          transition: background-color var(--transition-fast);
        }
        .year-item:hover {
          background-color: var(--surface-3);
          color: var(--text-primary);
        }
        .year-item.selected {
          background-color: var(--accent);
          color: #fff;
          font-weight: 600;
        }
        .months-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 4px;
        }
        .month-item {
          padding: 6px 4px;
          font-size: var(--text-xs);
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          text-align: center;
          transition: background-color var(--transition-fast);
        }
        .month-item:hover:not(:disabled) {
          background-color: var(--surface-3);
          color: var(--text-primary);
        }
        .month-item.selected {
          background-color: var(--accent);
          color: #fff;
          font-weight: 600;
        }
        .month-item:disabled {
          opacity: 0.25;
          cursor: not-allowed;
        }

        @media (pointer: coarse) {
          .day-cell {
            min-height: 40px;
          }
          .preset-row {
            min-height: 44px;
          }
        }
      `}</style>
    </div>
  );
}
