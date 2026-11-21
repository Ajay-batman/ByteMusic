import React, { useState, useEffect } from 'react';
import { Server, CheckCircle2, XCircle, RefreshCw, X, Globe } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getApiBaseUrl, setCustomApiHost, testServerConnection, DEFAULT_SERVER_URL } from '../../config/api';

interface ServerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ServerSettingsModal: React.FC<ServerSettingsModalProps> = ({ isOpen, onClose }) => {
  const { isLiquidGlass } = useTheme();
  const [urlInput, setUrlInput] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; latencyMs?: number; message?: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const current = localStorage.getItem('spotify_custom_api_host') || getApiBaseUrl();
      setUrlInput(current);
      setTestResult(null);
      setSaveSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await testServerConnection(urlInput.trim());
    setTestResult(res);
    setTesting(false);
  };

  const handleSave = () => {
    setCustomApiHost(urlInput.trim());
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1000);
  };

  const handleReset = () => {
    setUrlInput(DEFAULT_SERVER_URL);
    setCustomApiHost('');
    setTestResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className={`w-full max-w-md p-6 rounded-2xl shadow-2xl transition-all ${
          isLiquidGlass
            ? 'glass-panel border border-white/20 text-white'
            : 'bg-[#282828] text-white border border-[#3e3e3e]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1db954] to-emerald-600 flex items-center justify-center shadow-lg shadow-[#1db954]/20">
              <Server size={18} className="text-black" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Backend Server Settings</h2>
              <p className="text-xs text-[#b3b3b3]">Connect your mobile app to your Render cloud</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-[#b3b3b3] hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Input Field */}
        <div className="space-y-3 mb-5">
          <label className="text-xs font-semibold text-[#b3b3b3] uppercase tracking-wider block">
            Cloud Server URL (Render / Custom)
          </label>
          <div className="relative">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                setTestResult(null);
              }}
              placeholder="https://your-service.onrender.com"
              className={`w-full px-4 py-2.5 rounded-lg text-sm bg-black/40 border transition-all outline-none ${
                isLiquidGlass
                  ? 'border-white/20 focus:border-[#1db954] text-white placeholder-white/40'
                  : 'border-[#404040] focus:border-[#1db954] text-white placeholder-neutral-500'
              }`}
            />
          </div>

          {/* Test Status Indicator */}
          {testResult && (
            <div
              className={`flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium ${
                testResult.ok
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}
            >
              {testResult.ok ? (
                <>
                  <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
                  <span>Connected successfully! Latency: {testResult.latencyMs}ms</span>
                </>
              ) : (
                <>
                  <XCircle size={15} className="text-red-400 flex-shrink-0" />
                  <span>Connection failed: {testResult.message || 'Cannot reach server'}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || !urlInput.trim()}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <RefreshCw size={13} className={testing ? 'animate-spin' : ''} />
            <span>{testing ? 'Testing...' : 'Test Connection'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 text-xs font-medium text-[#b3b3b3] hover:text-white transition-colors"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-[#1db954] hover:bg-[#1ed760] text-black shadow-md hover:scale-105 active:scale-95 transition-all"
            >
              {saveSuccess ? 'Saved!' : 'Save & Connect'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
