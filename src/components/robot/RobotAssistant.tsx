'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Bot,
  Sparkles,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  X,
  Minimize2,
  Compass,
  Clock,
  Moon,
  Sun,
  Play,
  RotateCcw,
  Zap,
  ArrowRight,
  BookOpen,
  HelpCircle,
  GripHorizontal,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatMathNotation } from '@/lib/math-format';

interface Message {
  id: string;
  sender: 'user' | 'robot';
  text: string;
  time: string;
  actionText?: string;
}

interface RobotPosition {
  x: number;
  y: number;
}

export function RobotAssistant() {
  const router = useRouter();
  const pathname = usePathname();

  // Assistant State
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'robot',
      text: "Beep boop! 🤖 I am **CyberVen**, your autonomous AI robot assistant!\n\nI can **fly you around the site**, start **practice quizzes**, time your study sessions, or answer questions with speech and text. Click or drag me anywhere on screen!",
      time: 'Just now',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [transcriptPreview, setTranscriptPreview] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Focus Timer state
  const [activeTimerSeconds, setActiveTimerSeconds] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);

  // Dragging & Screen Movement State
  const [position, setPosition] = useState<RobotPosition>({ x: -1, y: -1 });
  const [isDragging, setIsDragging] = useState(false);
  const [isFlying, setIsFlying] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
  });
  const hasDraggedRef = useRef(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize position on screen (bottom right default)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('venessa_robot_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          setPosition(parsed);
          return;
        }
      }
    } catch {
      // ignore
    }

    // Default: bottom right with safety margins
    if (typeof window !== 'undefined') {
      setPosition({
        x: Math.max(16, window.innerWidth - 88),
        y: Math.max(80, window.innerHeight - 150),
      });
    }
  }, []);

  // Update position on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => ({
        x: Math.min(prev.x, window.innerWidth - 80),
        y: Math.min(prev.y, window.innerHeight - 80),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Timer Countdown Effect
  useEffect(() => {
    let interval: any;
    if (timerRunning && activeTimerSeconds !== null && activeTimerSeconds > 0) {
      interval = setInterval(() => {
        setActiveTimerSeconds((sec) => {
          if (sec === null || sec <= 1) {
            setTimerRunning(false);
            speakText("Ding ding! Your study session timer has finished! Great focus!");
            return 0;
          }
          return sec - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, activeTimerSeconds]);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, transcriptPreview]);

  // Text-To-Speech function
  const speakText = useCallback((text: string) => {
    if (!audioEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel();
      const clean = text
        .replace(/[*#_`~\[\]\(\)]/g, ' ')
        .replace(/https?:\/\/\S+/g, '')
        .trim();

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 1.05;
      utterance.pitch = 1.05;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
    }
  }, [audioEnabled]);

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Toggle Speech-To-Text (Microphone)
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. You can type your request directly!');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setTranscriptPreview('');
      };

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript;
        setTranscriptPreview(transcript);
        if (event.results[current].isFinal) {
          handleSendMessage(transcript);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        setTranscriptPreview('');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Autonomous Robot Movement Animation across screen
  const animateRobotFly = (targetX: number, targetY: number, onComplete?: () => void) => {
    setIsFlying(true);
    setPosition({ x: targetX, y: targetY });

    setTimeout(() => {
      setIsFlying(false);
      if (onComplete) onComplete();
    }, 850);
  };

  // Execute Autonomous Operations
  const executeAutonomousAction = async (action: any) => {
    if (!action || action.type === 'none') return;

    if (action.type === 'navigate' && action.url) {
      setStatusMessage(`🚀 Navigating to ${action.url}...`);
      // Animate robot toward navigation target
      animateRobotFly(
        window.innerWidth / 2 - 32,
        Math.max(60, window.innerHeight * 0.3),
        () => {
          router.push(action.url);
          setTimeout(() => setStatusMessage(null), 1500);
        }
      );
    } else if (action.type === 'start_quiz') {
      setStatusMessage(`📝 Generating quiz on ${action.topic || 'Subject'}...`);
      animateRobotFly(window.innerWidth / 2 - 32, 100, async () => {
        try {
          const res = await fetch('/api/quizzes/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subject: action.subject || 'General Science',
              topic: action.topic || 'Fundamentals',
              count: 5,
              difficulty: 'mixed',
              types: 'mixed',
            }),
          });
          const data = await res.json();
          if (data.quiz?.id) {
            router.push(`/practice/quiz/${data.quiz.id}`);
          } else {
            router.push('/practice');
          }
        } catch {
          router.push('/practice');
        } finally {
          setStatusMessage(null);
        }
      });
    } else if (action.type === 'timer') {
      const mins = action.minutes || 15;
      setActiveTimerSeconds(mins * 60);
      setTimerRunning(true);
      setStatusMessage(`⏱️ ${mins}-min Study Timer active!`);
      setTimeout(() => setStatusMessage(null), 3000);
    } else if (action.type === 'toggle_theme') {
      const isDark = document.documentElement.classList.contains('dark');
      if (isDark) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('venessa-theme', 'light');
      } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('venessa-theme', 'dark');
      }
      setStatusMessage('🌙 Theme updated!');
      setTimeout(() => setStatusMessage(null), 2000);
    } else if (action.type === 'scroll') {
      window.scrollTo({
        top: action.direction === 'bottom' ? document.body.scrollHeight : 0,
        behavior: 'smooth',
      });
    }
  };

  // Send Message to Robot API
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;

    setInputText('');
    setTranscriptPreview('');
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/robot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          currentPath: pathname,
        }),
      });

      const data = await res.json();
      const replyFormatted = formatMathNotation(data.reply || 'I am here to assist your studies! 🤖');

      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: 'robot',
        text: replyFormatted,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionText: data.action?.type !== 'none' ? `Operation: ${data.action.type}` : undefined,
      };

      setMessages((prev) => [...prev, botMsg]);

      // Audio feedback
      if (data.spokenText) {
        speakText(data.spokenText);
      }

      // Execute autonomous screen operation
      if (data.action && data.action.type !== 'none') {
        executeAutonomousAction(data.action);
      }
    } catch {
      const fallbackMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: 'robot',
        text: "I am ready to help you navigate or study! You can ask me to navigate to practice, quiz you, or solve problems.",
        time: 'Just now',
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Drag Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag from icon or header handle
    hasDraggedRef.current = false;
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: position.x,
      initY: position.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;

    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      hasDraggedRef.current = true;
    }

    const newX = Math.max(10, Math.min(window.innerWidth - 75, dragStartRef.current.initX + deltaX));
    const newY = Math.max(60, Math.min(window.innerHeight - 75, dragStartRef.current.initY + deltaY));

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    // Save position
    try {
      localStorage.setItem('venessa_robot_pos', JSON.stringify(position));
    } catch {
      // ignore
    }

    // If wasn't a significant drag, treat as click
    if (!hasDraggedRef.current) {
      setIsOpen((prev) => !prev);
    }
  };

  // Quick Action Chips
  const QUICK_COMMANDS = [
    { label: '🚀 Practice', command: 'Take me to practice quizzes' },
    { label: '✍️ Mistakes', command: 'Show me my mistakes bank' },
    { label: '🎓 Learn', command: 'Take me to masterclasses' },
    { label: '📚 Library', command: 'Open my digital notebook' },
    { label: '⏱️ 15m Timer', command: 'Set a 15 minute study timer' },
    { label: '🌙 Theme', command: 'Toggle dark mode' },
  ];

  if (position.x === -1) return null; // Avoid initial hydration flash

  return (
    <>
      {/* --------------------------------------------------------------------- */}
      {/* AUTONOMOUS DRAGGABLE ROBOT AVATAR ICON */}
      {/* --------------------------------------------------------------------- */}
      <div
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 9999,
          touchAction: 'none',
        }}
        className={`transition-transform duration-200 select-none ${
          isFlying ? 'scale-125 transition-all duration-700 ease-in-out' : ''
        }`}
      >
        {/* Floating Speech/Status Toast */}
        {statusMessage && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1 bg-emerald-600 text-white font-bold text-xs rounded-full shadow-lg animate-bounce pointer-events-none">
            {statusMessage}
          </div>
        )}

        {/* Focus Timer Mini Badge (if timer running) */}
        {activeTimerSeconds !== null && activeTimerSeconds > 0 && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(true);
            }}
            className="absolute -top-6 -right-2 px-2 py-0.5 bg-amber-500 text-white font-mono text-[10px] font-bold rounded-full shadow-md flex items-center gap-1 cursor-pointer"
          >
            <Clock className="w-2.5 h-2.5 animate-spin" />
            <span>
              {Math.floor(activeTimerSeconds / 60)}:
              {String(activeTimerSeconds % 60).padStart(2, '0')}
            </span>
          </div>
        )}

        {/* Interactive Robot Head Button */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          title="CyberVen AI Robot - Click to talk or drag anywhere"
          className={`w-16 h-16 sm:w-16 sm:h-16 rounded-3xl relative flex items-center justify-center cursor-grab active:cursor-grabbing shadow-xl transition-all duration-300 ${
            isOpen
              ? 'ring-4 ring-[var(--brand-primary)] bg-gradient-to-br from-teal-700 to-emerald-950 text-white'
              : isSpeaking
              ? 'ring-4 ring-cyan-400 bg-gradient-to-br from-cyan-600 to-teal-900 text-white animate-pulse'
              : isListening
              ? 'ring-4 ring-rose-500 bg-gradient-to-br from-rose-600 to-amber-900 text-white animate-bounce'
              : 'bg-gradient-to-br from-teal-600 via-emerald-700 to-slate-900 text-white hover:scale-105'
          }`}
        >
          {/* Glowing Antenna */}
          <div className="absolute -top-3.5 flex flex-col items-center">
            <span
              className={`w-3 h-3 rounded-full transition-all duration-300 shadow-md ${
                isSpeaking
                  ? 'bg-cyan-300 ring-4 ring-cyan-400/50 animate-ping'
                  : isListening
                  ? 'bg-rose-400 ring-4 ring-rose-500/50 animate-ping'
                  : 'bg-emerald-400 ring-2 ring-emerald-300/40'
              }`}
            />
            <span className="w-1 h-3 bg-slate-300 dark:bg-slate-500" />
          </div>

          {/* Robot Face Display */}
          <div className="w-12 h-10 rounded-2xl bg-slate-950/90 border border-teal-400/30 flex flex-col items-center justify-center p-1 relative overflow-hidden shadow-inner">
            {/* Expressive Glowing Eyes */}
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2.5 rounded-full transition-all duration-200 ${
                  isSpeaking
                    ? 'bg-cyan-300 shadow-[0_0_8px_#67e8f9]'
                    : isListening
                    ? 'bg-rose-400 shadow-[0_0_8px_#fb7185]'
                    : 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                }`}
              />
              <span
                className={`w-2 h-2.5 rounded-full transition-all duration-200 ${
                  isSpeaking
                    ? 'bg-cyan-300 shadow-[0_0_8px_#67e8f9]'
                    : isListening
                    ? 'bg-rose-400 shadow-[0_0_8px_#fb7185]'
                    : 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                }`}
              />
            </div>

            {/* Speaking / Audio Wave Mouth */}
            <div className="mt-1 flex items-center justify-center gap-0.5 h-1.5">
              {isSpeaking ? (
                <>
                  <span className="w-1 h-2 bg-cyan-300 rounded-full animate-bounce" />
                  <span className="w-1 h-3 bg-cyan-200 rounded-full animate-bounce [animation-delay:0.1s]" />
                  <span className="w-1 h-1.5 bg-cyan-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                </>
              ) : isListening ? (
                <span className="w-4 h-1 bg-rose-400 rounded-full animate-pulse" />
              ) : (
                <span className="w-3 h-0.5 bg-emerald-400/60 rounded-full" />
              )}
            </div>
          </div>

          {/* Jetpack Booster Flames when flying */}
          {isFlying && (
            <div className="absolute -bottom-3 flex gap-1">
              <span className="w-2 h-4 bg-amber-400 rounded-full animate-ping" />
              <span className="w-2 h-4 bg-rose-500 rounded-full animate-ping [animation-delay:0.1s]" />
            </div>
          )}
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* EXPANDABLE ROBOT CHATBOT HUD PANEL */}
      {/* --------------------------------------------------------------------- */}
      {isOpen && (
        <div
          className={`fixed z-[9998] transition-all duration-300 flex flex-col shadow-2xl rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] backdrop-blur-xl ${
            isMinimized
              ? 'bottom-20 right-4 w-72 h-14 overflow-hidden'
              : 'bottom-4 right-4 sm:right-6 w-[calc(100vw-32px)] sm:w-96 h-[540px] max-h-[85vh]'
          }`}
        >
          {/* Header & Drag Grip */}
          <div className="p-3.5 px-4 bg-gradient-to-r from-teal-800 to-emerald-900 text-white rounded-t-3xl flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center font-bold text-xs">
                🤖
              </div>
              <div>
                <h3 className="font-display font-bold text-sm leading-none flex items-center gap-1.5">
                  <span>CyberVen Robot</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </h3>
                <p className="text-[10px] text-emerald-200 mt-0.5">Autonomous Study Companion</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Audio Speech Toggle */}
              <button
                type="button"
                onClick={() => {
                  if (audioEnabled && isSpeaking) stopSpeaking();
                  setAudioEnabled(!audioEnabled);
                }}
                title={audioEnabled ? 'Voice feedback on (click to mute)' : 'Voice feedback muted (click to enable)'}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              >
                {audioEnabled ? <Volume2 className="w-4 h-4 text-emerald-300" /> : <VolumeX className="w-4 h-4 text-rose-300" />}
              </button>

              {/* Minimize / Maximize */}
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              >
                <Minimize2 className="w-4 h-4" />
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setIsOpen(false);
                }}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Active Timer HUD bar (if set) */}
              {activeTimerSeconds !== null && (
                <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-center justify-between text-xs shrink-0">
                  <div className="flex items-center gap-1.5 font-bold font-mono">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>
                      {Math.floor(activeTimerSeconds / 60)}m {activeTimerSeconds % 60}s remaining
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTimerRunning(!timerRunning)}
                      className="px-2 py-0.5 rounded-md bg-amber-600 text-white text-[11px] font-semibold"
                    >
                      {timerRunning ? 'Pause' : 'Resume'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTimerSeconds(null);
                        setTimerRunning(false);
                      }}
                      className="text-amber-700 dark:text-amber-400 text-[11px] hover:underline"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}

              {/* Quick Actions Scroll Bar */}
              <div className="p-2 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 text-xs">
                {QUICK_COMMANDS.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(chip.command)}
                    className="whitespace-nowrap px-2.5 py-1 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--brand-light)] hover:text-[var(--brand-primary)] border border-[var(--border-subtle)] font-medium text-[11px] transition-colors cursor-pointer"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Messages Feed */}
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
                {messages.map((msg) => {
                  const isRobot = msg.sender === 'robot';
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2 ${isRobot ? 'flex-row' : 'flex-row-reverse'}`}
                    >
                      {isRobot && (
                        <div className="w-6 h-6 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                          🤖
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] p-3 rounded-2xl leading-relaxed space-y-1.5 ${
                          isRobot
                            ? 'bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-tl-none'
                            : 'bg-[var(--brand-primary)] text-white rounded-tr-none'
                        }`}
                      >
                        {isRobot ? (
                          <article className="prose dark:prose-invert max-w-none text-xs leading-relaxed">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                          </article>
                        ) : (
                          <p>{msg.text}</p>
                        )}

                        {msg.actionText && (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold">
                            {msg.actionText}
                          </span>
                        )}

                        <div className="text-[9px] opacity-60 text-right">{msg.time}</div>
                      </div>
                    </div>
                  );
                })}

                {/* Live Transcript Preview while speaking into mic */}
                {isListening && transcriptPreview && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2 animate-pulse">
                    <Mic className="w-3.5 h-3.5 text-rose-600 animate-spin" />
                    <span>&ldquo;{transcriptPreview}&rdquo;</span>
                  </div>
                )}

                {/* Thinking / Robot Loading Indicator */}
                {isLoading && (
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] p-2">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] animate-bounce [animation-delay:0.15s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] animate-bounce [animation-delay:0.3s]" />
                    </div>
                    <span className="font-mono text-[11px]">CyberVen is calculating...</span>
                  </div>
                )}
              </div>

              {/* Speaking audio banner */}
              {isSpeaking && (
                <div className="px-3 py-1.5 bg-cyan-50 dark:bg-cyan-950/40 border-t border-cyan-200 dark:border-cyan-800 flex items-center justify-between text-xs text-cyan-800 dark:text-cyan-200 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-cyan-600 animate-bounce" />
                    <span className="text-[11px] font-semibold">CyberVen is speaking...</span>
                  </div>
                  <button
                    type="button"
                    onClick={stopSpeaking}
                    className="text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline"
                  >
                    Stop Audio
                  </button>
                </div>
              )}

              {/* Input Form with Audio Mic & Send */}
              <div className="p-2.5 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] rounded-b-3xl shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  {/* Microphone speech input toggle */}
                  <button
                    type="button"
                    onClick={toggleListening}
                    title={isListening ? 'Stop listening' : 'Speak to Robot Assistant'}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                      isListening
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-[var(--bg-elevated)] hover:bg-[var(--brand-light)] text-[var(--text-secondary)] hover:text-[var(--brand-primary)]'
                    }`}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={isListening ? 'Listening to voice...' : 'Ask or tell robot where to go...'}
                    className="flex-1 px-3.5 py-2 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl text-xs outline-none focus:border-[var(--brand-primary)] text-[var(--text-primary)]"
                  />

                  <button
                    type="submit"
                    disabled={!inputText.trim() || isLoading}
                    className="w-9 h-9 rounded-xl bg-[var(--brand-primary)] hover:opacity-90 disabled:opacity-40 text-white flex items-center justify-center transition-all shrink-0 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
