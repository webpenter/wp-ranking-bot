import React, { useState } from 'react';
import { Modal } from '../../../shared/components/Modal';
import { SlackPayload, sendSlackWebhook } from '../../../core/slack-service';
import { Settings } from '../../../core/types';
import { IconSlack, IconCopy, IconCheck, IconAlertTriangle } from '../../../shared/icons';

export interface SlackShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportTitle: string;
  slackData: { payload: SlackPayload; markdownText: string } | null;
  settings: Settings;
}

export const SlackShareModal: React.FC<SlackShareModalProps> = ({
  isOpen,
  onClose,
  reportTitle,
  slackData,
  settings,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!slackData) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(slackData.markdownText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendWebhook = async () => {
    if (!settings.slackWebhookUrl) {
      setStatusMessage({
        type: 'error',
        text: 'Slack Webhook URL is not configured. Please add your webhook URL in Admin Settings.',
      });
      return;
    }

    setIsSending(true);
    setStatusMessage(null);

    const res = await sendSlackWebhook(settings.slackWebhookUrl, slackData.payload);
    if (res.success) {
      setStatusMessage({ type: 'success', text: res.message });
    } else {
      setStatusMessage({ type: 'error', text: res.message });
    }
    setIsSending(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5 text-white">
          <IconSlack className="w-5 h-5 text-emerald-400" />
          <span>1-Click Slack Report: {reportTitle}</span>
        </div>
      }
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Status Notification */}
        {statusMessage && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <IconCheck className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <IconAlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Webhook Channel destination */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-300">
          <div>
            <span>Target Slack Channel: </span>
            <strong className="text-emerald-400">{settings.slackChannel || '#standup'}</strong>
          </div>
          <div className="text-[11px] text-slate-400">
            {settings.slackWebhookUrl ? '✅ Webhook Configured' : '⚠️ Webhook Missing (Use Copy)'}
          </div>
        </div>

        {/* Live Preview Box */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Slack Message Preview:
          </label>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed custom-scrollbar selection:bg-brand-500 selection:text-white">
            {slackData.markdownText}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={handleCopy}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold transition border border-slate-700"
          >
            {copied ? <IconCheck className="w-4 h-4 text-emerald-400" /> : <IconCopy className="w-4 h-4" />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Slack Markdown'}</span>
          </button>

          <div className="w-full sm:w-auto flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSendWebhook}
              disabled={isSending}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
            >
              <IconSlack className="w-4 h-4" />
              <span>{isSending ? 'Sending to Slack...' : 'Post to Slack Now'}</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
