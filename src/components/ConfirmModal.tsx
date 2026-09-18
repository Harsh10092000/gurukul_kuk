'use client';

import React, { useEffect, useRef } from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle2, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  variant?: 'warning' | 'danger' | 'info' | 'success';
  confirmText?: string;
  cancelText?: string; // If undefined or empty string, behaves as an alert dialog with single button
  onConfirm: () => void;
  onCancel?: () => void;
  loading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  variant = 'warning',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmModalProps) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Keyboard accessibility: ESC to dismiss, Enter to confirm
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (onCancel) onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Focus confirmation button when opened
    const timeout = setTimeout(() => {
      confirmBtnRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeout);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  // Visual theming based on variant
  const variantConfig = {
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-amber-500',
      iconBg: 'bg-amber-100',
      buttonBg: 'bg-amber-500 hover:bg-amber-600 text-gurukul-navy',
      badge: 'border-amber-200 text-amber-800',
    },
    danger: {
      icon: AlertCircle,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-100',
      buttonBg: 'bg-red-600 hover:bg-red-700 text-white',
      badge: 'border-red-200 text-red-800',
    },
    info: {
      icon: Info,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
      buttonBg: 'bg-gurukul-navy hover:bg-slate-800 text-amber-300',
      badge: 'border-blue-200 text-blue-800',
    },
    success: {
      icon: CheckCircle2,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
      buttonBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      badge: 'border-emerald-200 text-emerald-800',
    },
  }[variant];

  const IconComponent = variantConfig.icon;
  const isAlertMode = !cancelText;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="bg-portal-navy px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg ${variantConfig.iconBg} flex items-center justify-center`}>
              <IconComponent className={`w-4 h-4 ${variantConfig.iconColor}`} />
            </div>
            <h3 id="confirm-modal-title" className="text-white text-base font-bold">
              {title}
            </h3>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={loading}
              className="text-slate-400 hover:text-white p-1 rounded-md transition"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <div className="text-slate-700 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
            {message}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-end gap-3">
          {!isAlertMode && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="btn-secondary text-xs h-9 px-4"
            >
              {cancelText}
            </button>
          )}

          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`text-xs font-semibold h-9 px-5 rounded-md shadow-xs transition flex items-center gap-2 ${variantConfig.buttonBg} disabled:opacity-50`}
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{confirmText}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
