import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, User, ExternalLink } from 'lucide-react';
import type { Session, Theme, HistoryEntry, HistoryEntryType } from '../types';
import { HistoryDetailModal } from './HistoryDetailModal';

interface HistoryPanelProps {
  session: Session;
  theme: Theme;
  onJumpToClaudeSession?: (claudeSessionId: string) => void;
}

export function HistoryPanel({ session, theme, onJumpToClaudeSession }: HistoryPanelProps) {
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [activeFilters, setActiveFilters] = useState<Set<HistoryEntryType>>(new Set(['AUTO', 'USER']));
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [detailModalEntry, setDetailModalEntry] = useState<HistoryEntry | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Load history entries on mount and when session changes
  useEffect(() => {
    const loadHistory = async () => {
      setIsLoading(true);
      try {
        const entries = await window.maestro.history.getAll(session.cwd);
        // Ensure entries is an array and has valid shape
        setHistoryEntries(Array.isArray(entries) ? entries : []);
      } catch (error) {
        console.error('Failed to load history:', error);
        setHistoryEntries([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, [session.cwd]);

  // Toggle a filter
  const toggleFilter = (type: HistoryEntryType) => {
    setActiveFilters(prev => {
      const newFilters = new Set(prev);
      if (newFilters.has(type)) {
        newFilters.delete(type);
      } else {
        newFilters.add(type);
      }
      return newFilters;
    });
  };

  // Filter entries based on active filters
  const filteredEntries = historyEntries.filter(entry => entry && entry.type && activeFilters.has(entry.type));

  // Reset selected index when filters change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [activeFilters]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0) {
      const itemEl = itemRefs.current[selectedIndex];
      if (itemEl) {
        itemEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (filteredEntries.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => {
          const next = prev < filteredEntries.length - 1 ? prev + 1 : prev;
          return next;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => {
          const next = prev > 0 ? prev - 1 : 0;
          return next;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredEntries.length) {
          setDetailModalEntry(filteredEntries[selectedIndex]);
        }
        break;
      case 'Escape':
        // Only handle if modal is not open (modal handles its own escape)
        if (!detailModalEntry) {
          setSelectedIndex(-1);
        }
        break;
    }
  }, [filteredEntries, selectedIndex, detailModalEntry]);

  // Open detail modal for an entry
  const openDetailModal = useCallback((entry: HistoryEntry, index: number) => {
    setSelectedIndex(index);
    setDetailModalEntry(entry);
  }, []);

  // Close detail modal and restore focus
  const closeDetailModal = useCallback(() => {
    setDetailModalEntry(null);
    // Restore focus to the list
    listRef.current?.focus();
  }, []);

  // Format timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
        ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  // Get pill color based on type
  const getPillColor = (type: HistoryEntryType) => {
    switch (type) {
      case 'AUTO':
        return { bg: theme.colors.warning + '20', text: theme.colors.warning, border: theme.colors.warning + '40' };
      case 'USER':
        return { bg: theme.colors.accent + '20', text: theme.colors.accent, border: theme.colors.accent + '40' };
      default:
        return { bg: theme.colors.bgActivity, text: theme.colors.textDim, border: theme.colors.border };
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filter Pills */}
      <div className="flex gap-2 mb-4 pt-2 justify-center">
        {(['AUTO', 'USER'] as HistoryEntryType[]).map(type => {
          const isActive = activeFilters.has(type);
          const colors = getPillColor(type);
          const Icon = type === 'AUTO' ? Bot : User;

          return (
            <button
              key={type}
              onClick={() => toggleFilter(type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase transition-all ${
                isActive ? 'opacity-100' : 'opacity-40'
              }`}
              style={{
                backgroundColor: isActive ? colors.bg : 'transparent',
                color: isActive ? colors.text : theme.colors.textDim,
                border: `1px solid ${isActive ? colors.border : theme.colors.border}`
              }}
            >
              <Icon className="w-3 h-3" />
              {type}
            </button>
          );
        })}
      </div>

      {/* History List */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto space-y-3 outline-none"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {isLoading ? (
          <div className="text-center py-8 text-xs opacity-50">Loading history...</div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-8 text-xs opacity-50">
            {historyEntries.length === 0
              ? 'No history yet. Run batch tasks or use /synopsis to add entries.'
              : 'No entries match the selected filters.'}
          </div>
        ) : (
          filteredEntries.map((entry, index) => {
            const colors = getPillColor(entry.type);
            const Icon = entry.type === 'AUTO' ? Bot : User;
            const isSelected = index === selectedIndex;

            return (
              <div
                key={entry.id || `entry-${index}`}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                onClick={() => openDetailModal(entry, index)}
                className="p-3 rounded border transition-colors cursor-pointer hover:bg-white/5"
                style={{
                  borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                  backgroundColor: isSelected ? theme.colors.accent + '10' : 'transparent',
                  outline: isSelected ? `2px solid ${theme.colors.accent}` : 'none',
                  outlineOffset: '1px'
                }}
              >
                {/* Header Row */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {/* Type Pill */}
                    <span
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                      style={{
                        backgroundColor: colors.bg,
                        color: colors.text,
                        border: `1px solid ${colors.border}`
                      }}
                    >
                      <Icon className="w-2.5 h-2.5" />
                      {entry.type}
                    </span>

                    {/* Session ID Octet (clickable) */}
                    {entry.claudeSessionId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onJumpToClaudeSession?.(entry.claudeSessionId!);
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase transition-colors hover:opacity-80"
                        style={{
                          backgroundColor: theme.colors.accent + '20',
                          color: theme.colors.accent,
                          border: `1px solid ${theme.colors.accent}40`
                        }}
                        title={`Jump to session ${entry.claudeSessionId}`}
                      >
                        {entry.claudeSessionId.split('-')[0].toUpperCase()}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>

                  {/* Timestamp */}
                  <span className="text-[10px]" style={{ color: theme.colors.textDim }}>
                    {formatTime(entry.timestamp)}
                  </span>
                </div>

                {/* Summary */}
                <p
                  className="text-xs leading-relaxed overflow-hidden"
                  style={{
                    color: theme.colors.textMain,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical' as const
                  }}
                >
                  {entry.summary || 'No summary available'}
                </p>

                {/* Expand hint */}
                {entry.fullResponse && (
                  <p className="text-[10px] mt-1 opacity-50" style={{ color: theme.colors.textDim }}>
                    Click or press Enter to view full response
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Detail Modal */}
      {detailModalEntry && (
        <HistoryDetailModal
          theme={theme}
          entry={detailModalEntry}
          onClose={closeDetailModal}
          onJumpToClaudeSession={onJumpToClaudeSession}
        />
      )}
    </div>
  );
}
