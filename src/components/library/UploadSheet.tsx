'use client';

import React, { useState } from 'react';
import { X, Upload, FileText, Image as ImageIcon, Camera, Clipboard, Loader2, CheckCircle2 } from 'lucide-react';

interface UploadSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (materialId: string) => void;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function UploadSheet({ isOpen, onClose, onSuccess }: UploadSheetProps) {
  const [activeTab, setActiveTab] = useState<'file' | 'camera' | 'text'>('file');
  const [title, setTitle] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stageMessage, setStageMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > MAX_FILE_SIZE) {
        setErrorMsg(`File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 50MB maximum limit. Please choose a file under 50MB.`);
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setErrorMsg(null);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (activeTab === 'file' && !selectedFile) {
      setErrorMsg('Please select a file to upload.');
      return;
    }
    if (activeTab === 'text' && !pastedText.trim()) {
      setErrorMsg('Please paste your study notes text.');
      return;
    }

    setIsProcessing(true);

    try {
      let uploadPayload: any;

      if ((activeTab === 'file' || activeTab === 'camera') && selectedFile) {
        // Direct upload to Supabase Storage (bypasses Vercel 4.5MB serverless limit)
        setStageMessage(`Uploading ${selectedFile.name} to cloud storage...`);

        const urlRes = await fetch('/api/materials/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: selectedFile.name }),
        });

        if (!urlRes.ok) {
          const errData = await urlRes.json().catch(() => null);
          throw new Error(errData?.error || 'Failed to prepare upload destination.');
        }

        const { signedUrl, path } = await urlRes.json();

        // Direct PUT from browser to Supabase Storage
        setStageMessage('Transferring document directly to cloud storage...');
        const putRes = await fetch(signedUrl, {
          method: 'PUT',
          body: selectedFile,
          headers: { 'Content-Type': selectedFile.type || 'application/octet-stream' },
        });

        if (!putRes.ok) {
          throw new Error(`Direct cloud storage upload failed with status ${putRes.status}`);
        }

        uploadPayload = {
          storagePath: path,
          title: title || selectedFile.name.replace(/\.[^/.]+$/, ''),
          fileType: selectedFile.type,
          fileName: selectedFile.name,
        };
      } else {
        uploadPayload = {
          text: pastedText,
          title: title || 'Pasted Notes',
        };
      }

      setStageMessage('Reading pages and extracting text...');
      setTimeout(() => setStageMessage('Chunking concepts & generating AI study notes...'), 3000);
      setTimeout(() => setStageMessage('Almost ready...'), 7000);

      const res = await fetch('/api/materials/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(uploadPayload),
      });

      let data: any = null;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json().catch(() => null);
      } else {
        const rawText = await res.text().catch(() => '');
        throw new Error(rawText || `Processing error (HTTP ${res.status})`);
      }

      if (!res.ok) {
        throw new Error(data?.error || `Failed to process document (${res.status})`);
      }

      setStageMessage('Your notes are ready! 🎉');
      setTimeout(() => {
        setIsProcessing(false);
        onSuccess(data.materialId);
        onClose();
      }, 1000);
    } catch (err) {
      setIsProcessing(false);
      setErrorMsg((err as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end flex-col sm:items-center sm:justify-center p-0 sm:p-4 animate-fade-in">
      <div className="w-full sm:max-w-md bg-[var(--bg-surface)] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
          <h2 className="font-display font-bold text-lg text-[var(--text-primary)]">
            + Add Study Material
          </h2>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1 rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] min-touch-target"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
            {errorMsg}
          </div>
        )}

        {isProcessing ? (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="w-10 h-10 text-[var(--brand-primary)] animate-spin mx-auto" />
            <div className="font-display font-semibold text-base text-[var(--text-primary)]">
              {stageMessage}
            </div>
            <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto">
              We&apos;re extracting text, chunking concepts, and building your study library.
            </p>
          </div>
        ) : (
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            {/* Mode Select Tabs */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-[var(--bg-elevated)] rounded-2xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('file')}
                className={`py-2 rounded-xl transition-all ${
                  activeTab === 'file'
                    ? 'bg-[var(--bg-surface)] text-[var(--brand-primary)] shadow-xs'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                File Upload
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('camera')}
                className={`py-2 rounded-xl transition-all ${
                  activeTab === 'camera'
                    ? 'bg-[var(--bg-surface)] text-[var(--brand-primary)] shadow-xs'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                Take Photo
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('text')}
                className={`py-2 rounded-xl transition-all ${
                  activeTab === 'text'
                    ? 'bg-[var(--bg-surface)] text-[var(--brand-primary)] shadow-xs'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                Paste Text
              </button>
            </div>

            {/* Title Input */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Title (Optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Driving Book Manual or Biology Notes"
                className="w-full px-3.5 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl text-sm outline-none focus:border-[var(--brand-primary)]"
              />
            </div>

            {/* File Upload Tab */}
            {activeTab === 'file' && (
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Select File (PDF, DOCX, PPTX, Images up to 50MB)
                </label>
                <div className="border-2 border-dashed border-[var(--border-strong)] hover:border-[var(--brand-primary)] rounded-2xl p-6 text-center cursor-pointer transition-colors relative">
                  <input
                    type="file"
                    accept=".pdf,.docx,.pptx,image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-[var(--brand-primary)]" />
                    {selectedFile ? (
                      <div className="text-xs font-semibold text-[var(--brand-primary)] flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)</span>
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--text-muted)]">
                        Tap to choose or drag &amp; drop document
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Camera Photo Tab */}
            {activeTab === 'camera' && (
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Capture Notes via Camera
                </label>
                <div className="border-2 border-dashed border-[var(--border-strong)] rounded-2xl p-6 text-center cursor-pointer relative">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center gap-2">
                    <Camera className="w-8 h-8 text-[var(--brand-primary)]" />
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      Take Photo of Blackboard or Notebook
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Paste Text Tab */}
            {activeTab === 'text' && (
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Paste Study Text
                </label>
                <textarea
                  rows={6}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste lecture notes, study summaries, or textbook sections here..."
                  className="w-full p-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl text-sm outline-none focus:border-[var(--brand-primary)] resize-none"
                />
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="w-full min-touch-target bg-[var(--brand-primary)] text-white font-semibold rounded-2xl py-3.5 text-sm shadow-md hover:opacity-95 transition-opacity mt-2"
            >
              Start AI Processing
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
