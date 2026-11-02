"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { verifyYouTubeApiKey } from "@/lib/youtube";

export default function ApiKeyModal() {
  const { apiKey, setApiKey, isApiModalOpen, setIsApiModalOpen } = useApp();
  const [inputKey, setInputKey] = useState(apiKey);
  const [showSecret, setShowSecret] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<{
    type: "idle" | "success" | "error";
    message?: string;
  }>({ type: "idle" });

  useEffect(() => {
    if (isApiModalOpen) {
      setInputKey(apiKey);
      setStatus({ type: "idle" });
    }
  }, [isApiModalOpen, apiKey]);

  if (!isApiModalOpen) return null;

  const handleVerifyAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputKey.trim();
    if (!trimmed) {
      setApiKey("");
      setStatus({
        type: "success",
        message: "Switched to built-in Demo Mode (no API key required).",
      });
      setTimeout(() => setIsApiModalOpen(false), 900);
      return;
    }

    setTesting(true);
    setStatus({ type: "idle" });
    const result = await verifyYouTubeApiKey(trimmed);
    setTesting(false);

    if (result.valid) {
      setApiKey(trimmed);
      setStatus({
        type: "success",
        message: "YouTube Data API v3 key verified and saved! Live feed enabled.",
      });
      setTimeout(() => setIsApiModalOpen(false), 1000);
    } else {
      setStatus({
        type: "error",
        message: result.error || "Invalid API key. Please check your key in Google Cloud Console.",
      });
    }
  };

  const handleClearKey = () => {
    setInputKey("");
    setApiKey("");
    setStatus({
      type: "success",
      message: "API key removed. Using curated ad-free demo feed.",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-500">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                YouTube Data API v3 Key
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Connect your key for live YouTube search, trending & comments
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsApiModalOpen(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleVerifyAndSave} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
              Your API Key
            </label>
            <div className="relative">
              <input
                type={showSecret ? "text" : "password"}
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full h-11 pl-4 pr-11 rounded-xl text-sm font-mono bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-800 focus:outline-none focus:border-red-500"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                title={showSecret ? "Hide key" : "Show key"}
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Stored locally in your browser&apos;s <code className="text-[11px]">localStorage</code>{" "}
              or via <code className="text-[11px]">.env.local</code> (
              <code className="text-[11px]">NEXT_PUBLIC_YOUTUBE_API_KEY</code>).
            </p>
          </div>

          {/* Validation Status */}
          {status.type !== "idle" && (
            <div
              className={`flex items-start gap-2.5 p-3.5 rounded-xl text-xs font-medium border ${
                status.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
              }`}
            >
              {status.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{status.message}</span>
            </div>
          )}

          {/* Quick Guide */}
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200/80 dark:border-zinc-800/80 space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
            <p className="font-semibold text-zinc-800 dark:text-zinc-200">
              How to get a free YouTube Data API v3 Key:
            </p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Open the Google Cloud Console and create/select a project.</li>
              <li>
                Enable <strong>YouTube Data API v3</strong> in APIs &amp; Services.
              </li>
              <li>
                Go to <strong>Credentials → Create Credentials → API key</strong>.
              </li>
            </ol>
            <a
              href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-red-500 hover:underline font-medium pt-1"
            >
              Open Google Cloud Console <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 pt-2">
            {apiKey ? (
              <button
                type="button"
                onClick={handleClearKey}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Use Demo Mode
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsApiModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={testing}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white shadow-sm shadow-red-600/20 transition-all"
              >
                {testing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {testing ? "Verifying..." : "Verify & Save Key"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
