'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, Paperclip, X, Square, Sparkles } from 'lucide-react';

export interface ContextChip {
  type: 'material' | 'lesson' | 'topic' | 'question';
  id?: string;
  label: string;
}

interface TutorInputProps {
  onSend: (message: string, context?: ContextChip) => void;
  isLoading?: boolean;
  onStop?: () => void;
  initialContext?: ContextChip | null;
  placeholder?: string;
}

const QUICK_PROMPTS = [
  'Explain this more simply',
  'Give me an example',
  "I don't understand this",
  'Explain this step',
  'Give me a memory trick',
  'Quiz me on this',
  'Why was my answer wrong?',
];

interface SpeechResultEvent {
  results: Array<Array<{ transcript: string }>>;
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechResultEvent) => void) | null;
  start: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

export function TutorInput({
  onSend,
  isLoading = false,
  onStop,
  initialContext = null,
  placeholder = 'Ask your AI tutor anything...',
}: TutorInputProps) {
  const [text, setText] = useState('');
  const [activeContext, setActiveContext] = useState<ContextChip | null>(initialContext);
  const [prevInitialContext, setPrevInitialContext] = useState<ContextChip | null>(initialContext);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (initialContext !== prevInitialContext) {
    setPrevInitialContext(initialContext);
    setActiveContext(initialContext);
  }

  useEffect(() => {
    const SpeechRecognitionClass =
      (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognitionClass);
  }, []);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleSend = () => {
    if (!text.trim() || isLoading) return;
    onSend(text.trim(), activeContext || undefined);
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceInput = () => {
    if (!speechSupported) return;
    try {
      const SpeechRecognitionClass = (
        (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition
      );
      if (!SpeechRecognitionClass) return;

      const recognition = new SpeechRecognitionClass();
      recognition.lang = 'en-US';
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);

      recognition.onresult = (event: SpeechResultEvent) => {
        const transcript = event.results[0][0].transcript;
        setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  return (
    <div className="w-full bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl p-3 shadow-md transition-all duration-200 focus-within:border-[var(--brand-primary)] focus-within:ring-2 focus-within:ring-[var(--brand-primary)]/20">
      {/* Active Context Chip */}
      {activeContext && (
        <div className="flex items-center gap-1.5 mb-2.5 px-2.5 py-1 bg-[var(--brand-light)] text-[var(--brand-primary)] rounded-full text-xs font-medium w-fit">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate max-w-[220px]">Looking at: {activeContext.label}</span>
          <button
            onClick={() => setActiveContext(null)}
            className="p-0.5 hover:bg-[var(--brand-primary)]/10 rounded-full"
            aria-label="Remove context"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Quick Prompts horizontally scrollable */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none mb-1">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onSend(prompt, activeContext || undefined)}
            disabled={isLoading}
            className="whitespace-nowrap text-xs px-2.5 py-1 bg-[var(--bg-elevated)] hover:bg-[var(--border-subtle)] text-[var(--text-secondary)] rounded-full transition-colors shrink-0"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Main Input Row */}
      <div className="flex items-end gap-2 pt-1">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none outline-none max-h-32 min-h-[40px] py-2"
        />

        <div className="flex items-center gap-1 shrink-0">
          {speechSupported && (
            <button
              onClick={handleVoiceInput}
              type="button"
              className={`min-touch-target p-2 rounded-xl transition-colors ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
              title={isListening ? 'Listening...' : 'Voice Input'}
            >
              <Mic className="w-5 h-5" />
            </button>
          )}

          {isLoading ? (
            <button
              onClick={onStop}
              type="button"
              className="min-touch-target p-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm"
              title="Stop generating"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!text.trim()}
              type="button"
              className="min-touch-target p-2 rounded-xl bg-[var(--brand-primary)] text-white hover:opacity-95 disabled:opacity-40 transition-opacity shadow-sm"
              title="Send Message"
            >
              <Send className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
