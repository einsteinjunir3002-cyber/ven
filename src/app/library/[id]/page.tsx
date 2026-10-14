'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Sparkles,
  BookOpen,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Lightbulb,
  FileText,
  X,
  Send,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface NotePage {
  pageNumber: number;
  heading: string;
  content: string;
  concept: string;
}

const DEFAULT_NOTE_PAGES: NotePage[] = [
  {
    pageNumber: 1,
    heading: '1. Fundamentals & Key Concepts',
    content: `Active recall and spaced repetition form the cognitive foundation of high-retention study. 

**Key Definition:** *Conceptual Mastery* is the ability to break down complex phenomena into first principles, explain them simply using clear analogies, and apply them accurately to novel exam problems.`,
    concept: 'Cognitive Foundations',
  },
  {
    pageNumber: 2,
    heading: '2. Mechanisms & System Interactions',
    content: `When analyzing complex systems, focus on inputs, outputs, and feedback control loops. 

> **Study Principle:** Memorizing facts without understanding causal connections creates brittle knowledge. Map out every step in the chain of reasoning before testing yourself.`,
    concept: 'Feedback Control & Mechanisms',
  },
  {
    pageNumber: 3,
    heading: '3. Exam Synthesis & Application',
    content: `High-yield exam questions frequently test edge cases and common misconceptions. 

Always look for:
- Assumptions behind equations and formulas
- Contrasts between easily confused terms
- Step-by-step mathematical or logical deductions`,
    concept: 'Exam Synthesis',
  },
];

export default function NoteReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const materialId = resolvedParams.id;

  const [pages, setPages] = useState<NotePage[]>(DEFAULT_NOTE_PAGES);
  const [noteTitle, setNoteTitle] = useState('Study Notes');
  const [currentPage, setCurrentPage] = useState(1);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [showOriginalScan, setShowOriginalScan] = useState(false);
  const [isAiSheetOpen, setIsAiSheetOpen] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [selectedText, setSelectedText] = useState('');

  useEffect(() => {
    async function loadMaterial() {
      try {
        const res = await fetch(`/api/materials/${materialId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.material?.title) {
            setNoteTitle(data.material.title);
          }
          if (data.material?.file_url) {
            setFileUrl(data.material.file_url);
          }
          if (Array.isArray(data.pages) && data.pages.length > 0) {
            const mappedPages = data.pages.map((p: { page_number: number; label?: string; content: string }) => ({
              pageNumber: p.page_number,
              heading: p.label || `Page ${p.page_number}`,
              content: p.content,
              concept: data.material.topics?.[0] || 'Core Concept',
            }));
            setPages(mappedPages);

            // If scanned book has no raw text, automatically open the PDF Document Reader
            const hasAnyText = mappedPages.some((p: NotePage) => p.content && p.content.trim().length > 15);
            if (!hasAnyText && data.material?.file_url) {
              setShowOriginalScan(true);
            }
            return;
          }
        }
      } catch {
        // network fallback to local storage
      }

      try {
        const storedNotes = localStorage.getItem(`note_${materialId}`);
        if (storedNotes) {
          const parsed = JSON.parse(storedNotes);
          if (parsed.pages && parsed.pages.length > 0) {
            setPages(parsed.pages);
            if (parsed.title) setNoteTitle(parsed.title);
          }
        }
      } catch {
        // fallback to defaults
      }
    }

    loadMaterial();
  }, [materialId]);

  // Handle text selection
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection()?.toString().trim();
      if (selection && selection.length > 3) {
        setSelectedText(selection);
      }
    };
    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

  const handleAskAI = async (promptText: string) => {
    setIsAiLoading(true);
    setAiAnswer(null);

    const activePage = pages[currentPage - 1] || pages[0];

    try {
      const res = await fetch('/api/ai/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: promptText,
          context: {
            type: 'material',
            label: `Page ${currentPage}: ${activePage?.heading}`,
            content: activePage?.content,
          },
        }),
      });

      const data = await res.json();
      setAiAnswer(data.answer || 'Here is an explanation for this section of your notes.');
    } catch {
      setAiAnswer('Focus on the underlying mechanism: identify the primary rule, map the steps, and test yourself on a practice question.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const activePage = pages[currentPage - 1] || pages[0];

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-24">
      {/* Top Reading Navigation Bar */}
      <div className="flex items-center justify-between pt-2 pb-2 sticky top-0 bg-[var(--bg-primary)]/90 backdrop-blur-md z-30 border-b border-[var(--border-subtle)] px-1">
        <Link
          href="/library"
          className="min-touch-target text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 font-medium text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Library</span>
        </Link>

        <div className="text-xs font-semibold text-[var(--text-primary)]">
          Page {currentPage} of {pages.length}
        </div>

        <button
          onClick={() => setShowOriginalScan((prev) => !prev)}
          className={`min-touch-target px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            showOriginalScan
              ? 'bg-[var(--brand-primary)] text-white shadow-sm'
              : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--border-subtle)]'
          }`}
        >
          {showOriginalScan ? (
            <>
              <FileText className="w-3.5 h-3.5" />
              <span>Notes View</span>
            </>
          ) : (
            <>
              <BookOpen className="w-3.5 h-3.5" />
              <span>Document Reader</span>
            </>
          )}
        </button>
      </div>

      {/* Reading Document Body */}
      <div className="bg-[var(--bg-surface)] rounded-3xl p-4 sm:p-7 border border-[var(--border-subtle)] shadow-sm space-y-4">
        {showOriginalScan ? (
          <div className="space-y-3">
            {fileUrl ? (
              <div className="w-full h-[72vh] rounded-2xl overflow-hidden border border-[var(--border-subtle)] bg-slate-900 shadow-lg relative">
                <iframe
                  src={`${fileUrl}#page=${currentPage}`}
                  className="w-full h-full border-0 rounded-2xl"
                  title={noteTitle}
                />
              </div>
            ) : (
              <div className="py-12 text-center bg-slate-900 text-slate-300 rounded-2xl p-6 space-y-3">
                <ImageIcon className="w-12 h-12 text-amber-400 mx-auto" />
                <p className="text-sm font-semibold">High-Resolution Note Scan</p>
                <p className="text-xs text-slate-400">
                  Showing page {currentPage}.
                </p>
              </div>
            )}
            {fileUrl && (
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)] px-1">
                <span>📄 Interactive document reader ({pages.length} pages)</span>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--brand-primary)] font-semibold hover:underline inline-flex items-center gap-1"
                >
                  Open in New Window ↗
                </a>
              </div>
            )}
          </div>
        ) : (
          <article className="prose dark:prose-invert max-w-none text-[17px] leading-[1.7] text-[var(--text-primary)]">
            <h2 className="font-display font-bold text-xl sm:text-2xl text-[var(--brand-primary)] mb-4">
              {activePage?.heading}
            </h2>

            {activePage?.content && activePage.content.trim().length > 0 ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {activePage.content}
              </ReactMarkdown>
            ) : (
              <div className="py-10 px-4 text-center space-y-3 bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-subtle)]">
                <BookOpen className="w-8 h-8 text-[var(--brand-primary)] mx-auto" />
                <h4 className="font-semibold text-sm text-[var(--text-primary)]">
                  Scanned Page {currentPage}
                </h4>
                <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                  This page consists of scanned book imagery, graphics, or road signs. Switch to the <strong>Document Reader</strong> to see the original page directly!
                </p>
                <div className="pt-2 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setShowOriginalScan(true)}
                    className="px-4 py-2 bg-[var(--brand-primary)] text-white font-bold text-xs rounded-xl shadow-sm hover:opacity-95"
                  >
                    Open Document Reader 📖
                  </button>
                  {fileUrl && (
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-medium text-xs rounded-xl"
                    >
                      Download PDF ↗
                    </a>
                  )}
                </div>
              </div>
            )}
          </article>
        )}
      </div>

      {/* Selected Text Quick Action Chip */}
      {selectedText && (
        <div className="fixed bottom-20 left-4 right-4 z-40 sm:left-auto sm:right-6 sm:max-w-xs bg-[var(--brand-primary)] text-white p-3 rounded-2xl shadow-xl flex items-center justify-between text-xs animate-bounce">
          <span className="truncate max-w-[200px]">Ask about: &quot;{selectedText}&quot;</span>
          <button
            onClick={() => {
              setIsAiSheetOpen(true);
              handleAskAI(`Explain this selected text from my notes: "${selectedText}"`);
            }}
            className="px-3 py-1 bg-white text-[var(--brand-primary)] font-bold rounded-xl"
          >
            Explain
          </button>
        </div>
      )}

      {/* Page Pagination Controls */}
      <div className="flex items-center justify-between bg-[var(--bg-surface)] p-3 rounded-2xl border border-[var(--border-subtle)] text-xs font-semibold">
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="px-4 py-2 bg-[var(--bg-elevated)] rounded-xl disabled:opacity-30"
        >
          Previous Page
        </button>
        <span className="text-[var(--text-muted)]">
          {Math.round((currentPage / pages.length) * 100)}% Complete
        </span>
        <button
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, pages.length))}
          disabled={currentPage === pages.length}
          className="px-4 py-2 bg-[var(--brand-primary)] text-white rounded-xl disabled:opacity-30"
        >
          Next Page
        </button>
      </div>

      {/* Floating Ask AI Button */}
      <button
        onClick={() => setIsAiSheetOpen(true)}
        className="fixed bottom-20 right-4 lg:bottom-8 lg:right-8 z-40 min-touch-target px-4 py-3 bg-[var(--brand-primary)] text-white font-semibold text-xs rounded-full shadow-2xl flex items-center gap-2 hover:scale-105 transition-transform"
      >
        <Sparkles className="w-4 h-4 text-amber-300" />
        <span>Ask AI about this note</span>
      </button>

      {/* Ask AI Bottom Sheet */}
      {isAiSheetOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end flex-col sm:items-center sm:justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-lg bg-[var(--bg-surface)] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 max-h-[85dvh] overflow-y-auto animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[var(--brand-primary)]" />
                <h3 className="font-display font-bold text-base text-[var(--text-primary)]">
                  AI Note Tutor
                </h3>
              </div>
              <button
                onClick={() => setIsAiSheetOpen(false)}
                className="p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] rounded-full min-touch-target"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Prompt Chips */}
            <div className="flex flex-wrap gap-1.5">
              {[
                'Explain this more simply',
                'Simplify this page',
                'Give an example',
                'What should I remember for exams?',
                'Quiz me on this page',
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleAskAI(prompt)}
                  disabled={isAiLoading}
                  className="px-3 py-1.5 bg-[var(--bg-elevated)] hover:bg-[var(--brand-light)] hover:text-[var(--brand-primary)] text-[var(--text-secondary)] text-xs font-medium rounded-xl transition-colors cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* AI Answer Box */}
            {isAiLoading ? (
              <div className="p-6 text-center text-xs text-[var(--text-muted)] animate-pulse space-y-2">
                <Sparkles className="w-6 h-6 text-[var(--brand-primary)] mx-auto animate-spin" />
                <p>Analyzing Page {currentPage} content...</p>
              </div>
            ) : aiAnswer ? (
              <div className="p-4 rounded-2xl bg-[var(--brand-light)] border border-[var(--brand-primary)]/20 text-xs text-[var(--text-primary)] space-y-2 leading-relaxed">
                <div className="font-bold text-[var(--brand-primary)] flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4" />
                  <span>Tutor Explanation:</span>
                </div>
                <p>{aiAnswer}</p>
              </div>
            ) : null}

            {/* Custom Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (aiQuestion.trim()) {
                  handleAskAI(aiQuestion);
                  setAiQuestion('');
                }
              }}
              className="flex items-center gap-2 pt-2"
            >
              <input
                type="text"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                placeholder="Ask a specific question about this page..."
                className="flex-1 px-3.5 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl text-xs outline-none focus:border-[var(--brand-primary)]"
              />
              <button
                type="submit"
                disabled={!aiQuestion.trim() || isAiLoading}
                className="px-4 py-2.5 bg-[var(--brand-primary)] text-white rounded-xl text-xs font-semibold disabled:opacity-40"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
