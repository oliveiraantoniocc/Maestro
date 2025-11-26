import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Bot, User, ExternalLink, Check, X } from 'lucide-react';
import type { Session, Theme, HistoryEntry, HistoryEntryType } from '../types';
import { HistoryDetailModal } from './HistoryDetailModal';

interface HistoryPanelProps {
  session: Session;
  theme: Theme;
  onJumpToClaudeSession?: (claudeSessionId: string) => void;
}

export interface HistoryPanelHandle {
  focus: () => void;
}

export const HistoryPanel = React.memo(forwardRef<HistoryPanelHandle, HistoryPanelProps>(function HistoryPanel({ session, theme, onJumpToClaudeSession }, ref) {
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [activeFilters, setActiveFilters] = useState<Set<HistoryEntryType>>(new Set(['AUTO', 'USER']));
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [detailModalEntry, setDetailModalEntry] = useState<HistoryEntry | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [searchFilterOpen, setSearchFilterOpen] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Expose focus method to parent
  useImperativeHandle(ref, () => ({
    focus: () => {
      listRef.current?.focus();
      // Select first item if none selected
      if (selectedIndex < 0 && historyEntries.length > 0) {
        setSelectedIndex(0);
      }
    }
  }), [selectedIndex, historyEntries.length]);

  // Load history entries on mount and when session changes
  useEffect(() => {
    const loadHistory = async () => {
      setIsLoading(true);
      try {
        // Pass sessionId to filter: only show entries from this session or legacy entries without sessionId
        const entries = await window.maestro.history.getAll(session.cwd, session.id);
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
  }, [session.cwd, session.id]);

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

  // Filter entries based on active filters and search text
  const filteredEntries = historyEntries.filter(entry => {
    if (!entry || !entry.type) return false;
    if (!activeFilters.has(entry.type)) return false;

    // Apply text search filter
    if (searchFilter) {
      const searchLower = searchFilter.toLowerCase();
      const summaryMatch = entry.summary?.toLowerCase().includes(searchLower);
      const responseMatch = entry.fullResponse?.toLowerCase().includes(searchLower);
      const promptMatch = entry.prompt?.toLowerCase().includes(searchLower);
      if (!summaryMatch && !responseMatch && !promptMatch) return false;
    }

    return true;
  });

  // Reset selected index when filters change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [activeFilters, searchFilter]);

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
    // Open search filter with / key
    if (e.key === '/' && !searchFilterOpen) {
      e.preventDefault();
      setSearchFilterOpen(true);
      // Focus the search input after state update
      setTimeout(() => searchInputRef.current?.focus(), 0);
      return;
    }

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
  }, [filteredEntries, selectedIndex, detailModalEntry, searchFilterOpen]);

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

      {/* Search Filter */}
      {searchFilterOpen && (
        <div className="mb-3">
          <input
            ref={searchInputRef}
            autoFocus
            type="text"
            placeholder="Filter history..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearchFilterOpen(false);
                setSearchFilter('');
                // Return focus to the list
                listRef.current?.focus();
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                // Move focus to list and select first item
                listRef.current?.focus();
                if (filteredEntries.length > 0) {
                  setSelectedIndex(0);
                }
              }
            }}
            className="w-full px-3 py-2 rounded border bg-transparent outline-none text-sm"
            style={{ borderColor: theme.colors.accent, color: theme.colors.textMain }}
          />
          {searchFilter && (
            <div className="text-[10px] mt-1 text-right" style={{ color: theme.colors.textDim }}>
              {filteredEntries.length} result{filteredEntries.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}

      {/* History List */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto space-y-3 outline-none scrollbar-thin"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {isLoading ? (
          <div className="text-center py-8 text-xs opacity-50">Loading history...</div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-8 text-xs opacity-50">
            {historyEntries.length === 0
              ? 'No history yet. Run batch tasks or use /synopsis to add entries.'
              : searchFilter
                ? `No entries match "${searchFilter}"`
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
                    {/* Success/Failure Indicator for AUTO entries */}
                    {entry.type === 'AUTO' && entry.success !== undefined && (
                      <span
                        className="flex items-center justify-center w-5 h-5 rounded-full"
                        style={{
                          backgroundColor: entry.success ? theme.colors.success + '20' : theme.colors.error + '20',
                          border: `1px solid ${entry.success ? theme.colors.success + '40' : theme.colors.error + '40'}`
                        }}
                        title={entry.success ? 'Task completed successfully' : 'Task failed'}
                      >
                        {entry.success ? (
                          <Check className="w-3 h-3" style={{ color: theme.colors.success }} />
                        ) : (
                          <X className="w-3 h-3" style={{ color: theme.colors.error }} />
                        )}
                      </span>
                    )}

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

                {/* Full response preview */}
                {entry.fullResponse && (
                  <p
                    className="text-[10px] mt-1.5 opacity-60 leading-relaxed overflow-hidden"
                    style={{
                      color: theme.colors.textDim,
                      display: '-webkit-box',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical' as const
                    }}
                  >
                    {entry.fullResponse.slice(0, 200)}
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
}));
