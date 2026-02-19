import React, { useRef, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { DragChip } from './DragChip';
import { DraggedChip } from '@/stores/chatStore';
import { useTranslation } from '@/hooks/useTranslation';

interface ChipInputProps {
  chips: DraggedChip[];
  inputValue: string;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onRemoveChip: (id: string) => void;
}

export const ChipInput: React.FC<ChipInputProps> = ({
  chips,
  inputValue,
  isLoading,
  onInputChange,
  onSend,
  onStop,
  onRemoveChip,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
    if (e.key === 'Backspace' && !inputValue && chips.length > 0) {
      onRemoveChip(chips[chips.length - 1].id);
    }
  };

  return (
    <div className="border-t border-terminal-gray bg-terminal-bg/95">
      {/* Floating Chip Tray — above the input bar */}
      {chips.length > 0 && (
        <div className="px-4 pt-3 pb-1 flex flex-wrap gap-2 border-b border-terminal-gray/50 bg-terminal-black/30">
          {chips.map((chip) => (
            <DragChip key={chip.id} chip={chip} onRemove={onRemoveChip} />
          ))}
        </div>
      )}

      {/* Input Bar */}
      <div
        onClick={() => inputRef.current?.focus()}
        className="flex items-center gap-2 p-3 cursor-text"
      >
        {/* Prompt prefix */}
        <span className="text-terminal-orange font-mono font-bold select-none flex-shrink-0">
          ❯
        </span>

        {/* Text input */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={chips.length > 0
            ? t('app.chip_placeholder')
            : t('app.input_placeholder')
          }
          disabled={isLoading}
          className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-terminal-light font-mono text-sm placeholder-terminal-dim/50"
          autoComplete="off"
          spellCheck={false}
        />

        {/* Send / Stop button */}
        {isLoading ? (
          <button
            onClick={onStop}
            className="text-terminal-red hover:text-red-400 transition-colors flex-shrink-0 p-1 border border-terminal-red/50 rounded-sm"
            title="중단"
          >
            <span className="block w-4 h-4 bg-current" style={{ clipPath: 'inset(0)' }} />
          </button>
        ) : (
          <button
            onClick={onSend}
            disabled={!inputValue.trim() && chips.length === 0}
            className="text-terminal-orange hover:text-terminal-light disabled:text-terminal-dim transition-colors flex-shrink-0 p-1"
          >
            <Send size={18} />
          </button>
        )}
      </div>
    </div>
  );
};
