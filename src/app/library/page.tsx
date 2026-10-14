'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Plus,
  Search,
  SlidersHorizontal,
  MoreVertical,
  Brain,
  HelpCircle,
  Trash2,
  Edit2,
  FileText,
  Sparkles,
} from 'lucide-react';
import { UploadSheet } from '@/components/library/UploadSheet';

interface Material {
  id: string;
  title: string;
  subject: string;
  source_type: string;
  page_count: number;
  topics: string[];
  created_at: string;
  last_studied_at?: string;
}

export default function LibraryPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'title'>('recent');
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Overflow sheet state
  const [activeMaterial, setActiveMaterial] = useState<Material | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    async function loadMaterials() {
      // 1. First check Supabase via /api/materials
      try {
        const res = await fetch('/api/materials');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.materials) && data.materials.length > 0) {
            const formatted = data.materials.map((m: Record<string, unknown>) => ({
              id: m.id as string,
              title: (m.title as string) || 'Study Notes',
              subject: (m.subject as string) || 'General',
              source_type: (m.source_type as string) || 'pdf',
              page_count: (m.page_count as number) || 1,
              topics: Array.isArray(m.topics) ? (m.topics as string[]) : [],
              created_at: (m.created_at as string) || new Date().toISOString(),
              last_studied_at: m.last_studied_at as string | undefined,
            }));
            setMaterials(formatted);
            return;
          }
        }
      } catch {
        // Fallback to local storage
      }

      // 2. Fallback to localStorage
      try {
        const saved = localStorage.getItem('venessa_materials');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMaterials(parsed);
          }
        }
      } catch {
        // empty initial state
      }
    }

    loadMaterials();

    // Check if query params specified upload action
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'upload') {
      setIsUploadOpen(true);
    }
  }, []);

  const updateAndPersistMaterials = (updater: (prev: Material[]) => Material[]) => {
    setMaterials((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem('venessa_materials', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const filteredMaterials = materials
    .filter((m) => {
      const matchSearch =
        m.title.toLowerCase().includes(search.toLowerCase()) ||
        m.topics.some((t) => t.toLowerCase().includes(search.toLowerCase())) ||
        m.subject.toLowerCase().includes(search.toLowerCase());
      const matchSubject = selectedSubject === 'all' || m.subject.toLowerCase() === selectedSubject.toLowerCase();
      return matchSearch && matchSubject;
    })
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const handleDelete = (id: string) => {
    updateAndPersistMaterials((prev) => prev.filter((m) => m.id !== id));
    setShowDeleteConfirm(false);
    setActiveMaterial(null);
  };


  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
            Study Library 📚
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Your notes, extracted concepts, and digital handouts
          </p>
        </div>
        <button
          onClick={() => setIsUploadOpen(true)}
          className="min-touch-target px-3.5 py-2 bg-[var(--brand-primary)] text-white font-semibold text-xs rounded-xl shadow-md flex items-center gap-1.5 hover:opacity-95 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          <span>Add Notes</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes by title or topic..."
            className="w-full pl-9 pr-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--brand-primary)]"
          />
        </div>

        {/* Subject Filter Pills */}
        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl text-xs text-[var(--text-primary)] outline-none"
        >
          <option value="all">All Subjects</option>
          <option value="biology">Biology</option>
          <option value="chemistry">Chemistry</option>
          <option value="physics">Physics</option>
        </select>
      </div>

      {/* Material Cards Grid */}
      {filteredMaterials.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-subtle)] p-6">
          <div className="w-16 h-16 rounded-2xl bg-[var(--brand-light)] text-[var(--brand-primary)] flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="font-display font-bold text-base text-[var(--text-primary)]">
            Your study library is waiting 📚
          </h3>
          <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto">
            Upload your first notes (PDF, DOCX, or photos) and let your AI tutor break them down.
          </p>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="min-touch-target px-4 py-2.5 bg-[var(--brand-primary)] text-white font-semibold text-xs rounded-xl shadow-md inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Notes</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMaterials.map((material) => (
            <div
              key={material.id}
              className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              {/* Top Row */}
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--brand-light)] text-[var(--brand-primary)]">
                    {material.subject} • {material.page_count} Pages
                  </span>
                  <h3 className="font-display font-bold text-base text-[var(--text-primary)] line-clamp-2">
                    {material.title}
                  </h3>
                </div>
                <button
                  onClick={() => setActiveMaterial(material)}
                  className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg min-touch-target"
                  aria-label="Material actions menu"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              {/* Topics */}
              <div className="flex flex-wrap gap-1.5">
                {material.topics.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded-md bg-[var(--bg-elevated)] text-[11px] text-[var(--text-secondary)] font-medium"
                  >
                    #{t}
                  </span>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[var(--border-subtle)]">
                <Link
                  href={`/library/${material.id}`}
                  className="min-touch-target py-2 px-1 bg-[var(--bg-elevated)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] font-semibold text-xs rounded-xl text-center flex items-center justify-center gap-1 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Study</span>
                </Link>
                <Link
                  href={`/learn?materialId=${material.id}`}
                  className="min-touch-target py-2 px-1 bg-[var(--brand-light)] text-[var(--brand-primary)] font-semibold text-xs rounded-xl text-center flex items-center justify-center gap-1 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Explain</span>
                </Link>
                <Link
                  href={`/practice?materialId=${material.id}`}
                  className="min-touch-target py-2 px-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold text-xs rounded-xl text-center flex items-center justify-center gap-1 transition-colors"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Quiz</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Material Overflow Menu Bottom Sheet */}
      {activeMaterial && !showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-sm bg-[var(--bg-surface)] rounded-t-3xl sm:rounded-3xl p-5 space-y-3 animate-fade-in shadow-2xl">
            <h3 className="font-display font-bold text-base text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-2">
              {activeMaterial.title}
            </h3>
            <button
              onClick={() => setActiveMaterial(null)}
              className="w-full text-left px-4 py-3 rounded-xl hover:bg-[var(--bg-elevated)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4 text-[var(--text-muted)]" />
              <span>Rename / Edit Subject</span>
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full text-left px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Study Material</span>
            </button>
            <button
              onClick={() => setActiveMaterial(null)}
              className="w-full py-2.5 text-xs text-[var(--text-muted)] font-medium text-center"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Sheet (Strictly separated from primary actions) */}
      {showDeleteConfirm && activeMaterial && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-sm bg-[var(--bg-surface)] rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-base text-[var(--text-primary)]">
              Confirm Material Deletion?
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Are you sure you want to delete &quot;{activeMaterial.title}&quot;? This will permanently remove its extracted concepts and vector chunks.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="py-3 px-4 bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(activeMaterial.id)}
                className="py-3 px-4 bg-red-600 text-white font-semibold text-xs rounded-xl shadow-md hover:bg-red-700"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Bottom Sheet */}
      <UploadSheet
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={(id) => {
          updateAndPersistMaterials((prev) => [
            {
              id,
              title: 'New Uploaded Study Notes',
              subject: 'General',
              source_type: 'pdf',
              page_count: 5,
              topics: ['Summary', 'Concepts'],
              created_at: new Date().toISOString(),
            },
            ...prev,
          ]);
        }}
      />
    </div>
  );
}
