import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Database,
  Server,
  Send,
  RefreshCw,
  Layers,
  Search,
  FileText,
  Bot,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Loader2,
  AlertTriangle,
  Key,
} from 'lucide-react';

export default function App() {
  // Direct Gemini prompt state
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  // RAG Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [groundedAnswer, setGroundedAnswer] = useState('');
  const [sources, setSources] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [isSourcesOpen, setIsSourcesOpen] = useState(true);

  // System Status State
  const [backendStatus, setBackendStatus] = useState<{ status: string; service: string } | null>(null);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; databaseName?: string; collectionsCount?: number; error?: string } | null>(null);

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setBackendStatus(data);
    } catch {
      setBackendStatus(null);
    }

    try {
      const res = await fetch('/api/db-status');
      const data = await res.json();
      setDbStatus(data);
    } catch {
      setDbStatus({ connected: false, error: 'Failed to reach backend' });
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setResponse('');

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (res.ok) {
        setResponse(data.result);
      } else {
        setResponse(`Notice: ${data.error || data.result || 'Failed to generate response'}`);
      }
    } catch (err: any) {
      setResponse(`Client Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || searchLoading) return;

    setSearchLoading(true);
    setSearchError('');
    setGroundedAnswer('');
    setSources([]);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, limit: 5 }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGroundedAnswer(data.answer);
        setSources(data.sources || []);
        setIsSourcesOpen(true);
      } else {
        setSearchError(data.error || 'RAG Search failed');
      }
    } catch (err: any) {
      setSearchError(err.message || 'Client error connecting to /api/search');
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-cyan-600 rounded-xl shadow-lg shadow-indigo-500/20">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
              Gemini Fullstack RAG Dashboard
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              React 18 • Vite • Tailwind CSS • Express TypeScript • @google/genai • MongoDB Atlas
            </p>
          </div>
        </div>
        <button
          onClick={checkHealth}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 rounded-lg transition text-slate-300 border border-slate-700/80 shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </header>

      {/* System Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Express Backend Status */}
        <div className="p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <Server className="w-5 h-5 text-indigo-400" />
            <div>
              <p className="text-xs text-slate-400 font-medium">Express API Gateway</p>
              <p className="text-sm font-semibold text-slate-200">
                {backendStatus ? backendStatus.service : 'Offline / Connecting...'}
              </p>
            </div>
          </div>
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${
              backendStatus ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-rose-500'
            }`}
          />
        </div>

        {/* MongoDB Status */}
        <div className="p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-cyan-400" />
            <div>
              <p className="text-xs text-slate-400 font-medium">MongoDB Vector Store</p>
              <p className="text-sm font-semibold text-slate-200">
                {dbStatus?.connected ? `Connected (${dbStatus.databaseName})` : 'Not Connected (Using In-Memory Fallback)'}
              </p>
            </div>
          </div>
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${
              dbStatus?.connected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-amber-500'
            }`}
          />
        </div>
      </div>

      {/* Setup & Environment Variables Quick Guide Banner */}
      <div className="p-4 bg-gradient-to-r from-amber-950/30 to-indigo-950/30 border border-amber-700/40 rounded-xl space-y-2 text-xs">
        <div className="flex items-center gap-2 font-bold text-amber-300">
          <Key className="w-4 h-4 text-amber-400" />
          Environment Setup Guide
        </div>
        <p className="text-slate-300 leading-relaxed text-[12px]">
          To connect your actual Google Gemini API key and MongoDB Atlas database cluster, update the root <code className="text-amber-300 font-mono">.env</code> file:
        </p>
        <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-lg font-mono text-[11px] text-cyan-300 space-y-1">
          <div><span className="text-slate-500"># Google Gemini API Key</span></div>
          <div>GEMINI_API_KEY=your_actual_gemini_api_key_here</div>
          <div className="pt-1"><span className="text-slate-500"># MongoDB Atlas Connection URI</span></div>
          <div>MONGODB_URI=mongodb+srv://&lt;username&gt;:&lt;password&gt;@cluster.mongodb.net/my_database</div>
        </div>
      </div>

      {/* RAG Search Interface */}
      <section className="p-6 bg-slate-800/60 border border-slate-700/80 rounded-2xl space-y-6 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-slate-700/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
              <Search className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Grounded Knowledge Search</h2>
              <p className="text-xs text-slate-400">
                Queries vector embeddings with <code className="text-indigo-300">text-embedding-005</code> and synthesizes answers via <code className="text-cyan-300">Gemini 2.5 Flash</code>.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-md text-cyan-400">
            POST /api/search
          </span>
        </div>

        {/* Search Input Form */}
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="relative flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ask a question grounded in your documents (e.g. What are the capabilities of AI?)..."
              className="w-full pl-4 pr-32 py-3 bg-slate-900/90 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 shadow-inner placeholder-slate-500"
            />
            <button
              type="submit"
              disabled={searchLoading || !searchQuery.trim()}
              className="absolute right-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition shadow-md"
            >
              {searchLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  Search & Ground
                </>
              )}
            </button>
          </div>
        </form>

        {/* Error Alert */}
        {searchError && (
          <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-start gap-2 shadow-sm">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{searchError}</span>
          </div>
        )}

        {/* Prominent Generated Answer Display */}
        {groundedAnswer && (
          <div className="space-y-6 pt-2">
            <div className="p-5 bg-gradient-to-b from-slate-900 to-slate-900/90 border border-cyan-500/40 rounded-2xl shadow-xl space-y-3 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400" />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs tracking-wide uppercase">
                  <Bot className="w-4 h-4 text-cyan-400" />
                  Generated Grounded Answer
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                  <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">
                    Model: gemini-2.5-flash
                  </span>
                </div>
              </div>

              <div className="prose prose-invert max-w-none text-slate-100 text-sm leading-relaxed whitespace-pre-wrap font-normal">
                {groundedAnswer}
              </div>
            </div>

            {/* Collapsible Sources Section */}
            {sources.length > 0 && (
              <div className="border border-slate-700/70 rounded-xl overflow-hidden bg-slate-900/60 shadow-md">
                {/* Collapsible Accordion Header */}
                <button
                  type="button"
                  onClick={() => setIsSourcesOpen(!isSourcesOpen)}
                  className="w-full px-4 py-3 bg-slate-800/80 hover:bg-slate-800 flex items-center justify-between text-left transition border-b border-slate-700/60"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                    <BookOpen className="w-4 h-4 text-indigo-400" />
                    <span>Retrieved Source Document Chunks</span>
                    <span className="ml-1 px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[11px] rounded-full border border-indigo-500/30">
                      {sources.length} Chunks
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400 text-xs font-medium">
                    <span>{isSourcesOpen ? 'Hide' : 'Show'} Sources</span>
                    {isSourcesOpen ? (
                      <ChevronDown className="w-4 h-4 text-slate-300" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    )}
                  </div>
                </button>

                {/* Collapsible Body */}
                {isSourcesOpen && (
                  <div className="p-4 space-y-3 bg-slate-950/40">
                    {sources.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700 transition"
                      >
                        <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-cyan-400" />
                            <span className="font-semibold text-slate-200">{item.fileName}</span>
                            <span className="text-slate-500">•</span>
                            <span className="text-slate-400 text-[11px]">Chunk {item.chunkIndex + 1} of {item.totalChunks || 1}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.score !== undefined && (
                              <span className="px-2 py-0.5 bg-cyan-950 border border-cyan-800 text-cyan-300 text-[10px] font-mono rounded font-medium">
                                Similarity: {item.score.toFixed(4)}
                              </span>
                            )}
                            <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] font-mono rounded">
                              {item.tokenCount || 0} tokens
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-mono bg-slate-950/50 p-2.5 rounded-lg border border-slate-900">
                          {item.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Direct Gemini AI Playground */}
      <section className="p-6 bg-slate-800/40 border border-slate-700/60 rounded-2xl space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-semibold text-slate-200">Direct Gemini Playground</h2>
        </div>
        <p className="text-xs text-slate-400">
          Direct prompt inference via Express server and <code className="text-indigo-300">@google/genai</code> SDK.
        </p>

        <form onSubmit={handleGenerate} className="space-y-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask Gemini anything..."
            rows={3}
            className="w-full p-3 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 text-sm placeholder-slate-500"
          />
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg font-medium text-xs transition shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            {loading ? 'Generating...' : 'Send Prompt'}
          </button>
        </form>

        {response && (
          <div className="mt-4 p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
            <h3 className="text-xs uppercase tracking-wider text-slate-400 font-bold">Response:</h3>
            <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{response}</p>
          </div>
        )}
      </section>
    </div>
  );
}
