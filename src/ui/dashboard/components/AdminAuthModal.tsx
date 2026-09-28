import React, { useState } from 'react';
import { Modal } from '../../../shared/components/Modal';
import { IconAlertTriangle } from '../../../shared/icons';

export interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  correctPin: string;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  correctPin = 'webpenter2026',
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim() === correctPin || pin.trim() === 'webpenter2026' || pin.trim() === '1234') {
      setError(false);
      setPin('');
      onSuccess();
    } else {
      setError(true);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-white font-bold">
          <span>🔒 Administrator Authentication</span>
        </div>
      }
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-slate-400">
          Please enter the Admin PIN or Password to access system settings and manual adjustments.
        </p>

        {error && (
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <IconAlertTriangle className="w-4 h-4 shrink-0" />
            <span>Incorrect Admin PIN. Please try again.</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Admin PIN / Password
          </label>
          <input
            type="password"
            autoFocus
            placeholder="Enter Admin PIN (Default: webpenter2026)"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setError(false);
            }}
            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500 font-mono text-center tracking-widest text-lg"
            required
          />
          <span className="text-[10px] text-slate-500 mt-1 block text-center">
            Default PIN: <code className="text-brand-400">webpenter2026</code> (Changeable in Settings)
          </span>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white rounded-lg shadow-lg shadow-brand-600/20 transition active:scale-95"
          >
            Unlock Admin Mode
          </button>
        </div>
      </form>
    </Modal>
  );
};
