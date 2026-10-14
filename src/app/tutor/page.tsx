'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { TutorInput, ContextChip } from '@/components/tutor/TutorInput';
import { formatMathNotation } from '@/lib/math-format';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function TutorPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm-0',
      role: 'assistant',
      content: 'Hello Venessa! 👋 I am your AI Study Companion. Ask me anything about your uploaded notes, concepts, or exam preparations!',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [initialContext, setInitialContext] = useState<ContextChip | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const initialQ = urlParams.get('q');
    if (initialQ) {
      handleSend(initialQ);
    }
  }, []);

  const handleSend = async (userText: string, context?: ContextChip) => {
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: userText };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, context }),
      });

      const data = await res.json();
      const botMsg: ChatMessage = {
        id: `b-${Date.now()}`,
        role: 'assistant',
        content: formatMathNotation(data.answer || 'Here is an explanation for your question.'),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          role: 'assistant',
          content: 'Here is a simple explanation to break down that concept for you!',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-24 flex flex-col h-[calc(100dvh-100px)]">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2 pb-2 border-b border-[var(--border-subtle)] shrink-0">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="min-touch-target text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-display font-bold text-lg text-[var(--text-primary)] flex items-center gap-1.5">
              <span>AI Tutor Chat</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </h1>
            <p className="text-[11px] text-[var(--text-muted)]">Venessa&apos;s 24/7 Study Partner</p>
          </div>
        </div>
      </div>

      {/* Messages Scroll View */}
      <div className="flex-1 overflow-y-auto space-y-4 p-1">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 text-xs sm:text-sm ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                  isUser
                    ? 'bg-[var(--brand-primary)] text-white'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[80%] p-4 rounded-3xl space-y-2 leading-relaxed shadow-xs ${
                  isUser
                    ? 'bg-[var(--brand-primary)] text-white rounded-tr-none'
                    : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-tl-none'
                }`}
              >
                {isUser ? (
                  <p>{msg.content}</p>
                ) : (
                  <article className="prose dark:prose-invert max-w-none text-xs sm:text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </article>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] p-2">
            <Sparkles className="w-4 h-4 text-[var(--brand-primary)] animate-spin" />
            <span>AI Tutor is thinking...</span>
          </div>
        )}
      </div>

      {/* Sticky Bottom Tutor Input */}
      <div className="shrink-0 pt-2">
        <TutorInput onSend={handleSend} isLoading={isLoading} initialContext={initialContext} />
      </div>
    </div>
  );
}
