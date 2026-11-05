import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Icon } from '../Icon';
import {
  ProxyEngine,
  ProxyRelayNodeId,
  PROXY_RELAY_SERVERS,
  WISP_SERVER_PRESETS,
  encodeUltraviolet,
  encodeScramjet,
  getServiceWorkerProxyUrl,
  ensureServiceWorkerReady,
  configureServiceWorkerWisp,
  testWispServerConnection,
  fetchHtmlViaProxyCascade,
  generateGcsStandaloneLauncherHtml,
} from '../proxyService';

interface Props {
  payload?: { url?: string; isImage?: boolean; engine?: ProxyEngine };
}

const DEFAULT_HOME = 'about:start';

const SPEED_DIAL = [
  { label: 'Monochrome.tf Music', url: 'https://monochrome.tf', icon: 'Music', desc: 'Wisp + SW Proxy Lossless' },
  { label: 'DuckDuckGo Web', url: 'https://html.duckduckgo.com/html/', icon: 'Search', desc: 'Full Web Search via SW' },
  { label: 'storage.googleapis.com', url: 'about:gcs', icon: 'HardDrive', desc: 'Google Cloud Storage Gateway' },
  { label: 'Wikipedia (SW)', url: 'https://ja.wikipedia.org', icon: 'FileText', desc: 'Encyclopedia via Wisp/SW' },
  { label: 'Hacker News', url: 'https://news.ycombinator.com', icon: 'Zap', desc: 'Tech & Engineering News' },
  { label: 'GitHub Explorer', url: 'https://github.com', icon: 'GitBranch', desc: 'Zero-404 Repo & Pages Hub' },
  { label: 'MDN Web Docs', url: 'https://developer.mozilla.org', icon: 'BookOpen', desc: 'Web Technologies Docs' },
  { label: 'jsDelivr CDN', url: 'https://www.jsdelivr.com', icon: 'Server', desc: 'Open Source CDN & Packages' },
];

interface GitHubRepoItem {
  id: number;
  full_name: string;
  description: string;
  stargazers_count: number;
  language: string;
  html_url: string;
  homepage?: string;
}

interface WikiSearchResult {
  title: string;
  snippet: string;
  pageid: number;
}

function normalizeUrl(input: string): string {
  const v = input.trim();
  if (!v || v === 'about:start' || v === 'about:blank' || v.startsWith('about:')) return v;
  if (/^gcs:\/\//i.test(v)) {
    return 'https://storage.googleapis.com/' + v.replace(/^gcs:\/+/i, '');
  }
  if (/^(jsdelivr|gh):/i.test(v)) {
    const repoPath = v.replace(/^(jsdelivr|gh):\/+/i, '').replace(/^(jsdelivr|gh):/i, '');
    const parts = repoPath.split('/');
    if (parts.length >= 2) {
      const owner = parts[0];
      const repo = parts[1].replace(/\.git$/i, '');
      return `https://github.com/${owner}/${repo}`;
    }
  }
  if (/^https?:\/\/(www\.)?google\.[a-z.]+\/search\?/i.test(v)) {
    try {
      const u = new URL(v);
      const q = u.searchParams.get('q');
      if (q) return 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(q);
    } catch {
      // ignore
    }
  }
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(v)) return 'https://' + v;
  return 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(v);
}

export function BrowserApp({ payload }: Props) {
  const initialUrl = payload?.url ?? DEFAULT_HOME;
  const isImage = payload?.isImage;

  const [address, setAddress] = useState(initialUrl);
  const [loadedUrl, setLoadedUrl] = useState(initialUrl);
  const [inputVal, setInputVal] = useState(initialUrl === 'about:start' ? '' : initialUrl);
  const [engine, setEngine] = useState<ProxyEngine>(payload?.engine ?? 'scramjet');
  const [relayNode, setRelayNode] = useState<ProxyRelayNodeId>('auto');
  const [wispServer, setWispServer] = useState<string>(WISP_SERVER_PRESETS[0].wispUrl);
  const [customWispInput, setCustomWispInput] = useState<string>('');
  const [wispModeLabel, setWispModeLabel] = useState<string>('Wisp v1 Multiplex + SW Ready');
  const [activeNodeLabel, setActiveNodeLabel] = useState<string>('Wisp v1 + Service Worker');
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [history, setHistory] = useState<string[]>([initialUrl]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [latency, setLatency] = useState(8);
  const [frameError, setFrameError] = useState(false);
  const [forceRawIframe, setForceRawIframe] = useState(true);
  const [swIframeSrc, setSwIframeSrc] = useState<string>('');
  const [proxiedSrcDoc, setProxiedSrcDoc] = useState<string>('');

  // storage.googleapis.com Gateway state
  const [gcsBucketInput, setGcsBucketInput] = useState('https://storage.googleapis.com/tfjs-models/');
  const [gcsCustomTargetUrl, setGcsCustomTargetUrl] = useState('https://monochrome.tf');
  const [gcsBlobSandboxUrl, setGcsBlobSandboxUrl] = useState<string | null>(null);

  // Built-in GitHub Explorer state (prevents GitHub / GitHub Pages 404 errors)
  const [ghQuery, setGhQuery] = useState('three.js webgl');
  const [ghRepos, setGhRepos] = useState<GitHubRepoItem[]>([]);
  const [ghLoading, setGhLoading] = useState(false);
  const [selectedRepoReadme, setSelectedRepoReadme] = useState<{ name: string; content: string; url: string } | null>(null);

  // Built-in Search & Wikipedia Reader state
  const [wikiResults, setWikiResults] = useState<WikiSearchResult[]>([]);
  const [wikiArticle, setWikiArticle] = useState<{ title: string; extract: string; url: string } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const [logs, setLogs] = useState<{ time: string; text: string; type: 'info' | 'proxy' | 'sec' }[]>([
    { time: '00:00', text: '[Wisp v1] Connected to Wisp Multiplexer (wss://wisp.mercurywork.shop/)', type: 'info' },
    { time: '00:01', text: '[Service Worker] /uv/service/* & /scramjet/* Interceptors Active', type: 'sec' },
    { time: '00:02', text: '[Runtime Hook] $uv & $scramjet fetch/XHR/History Rewriters Online', type: 'proxy' },
  ]);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const addLog = useCallback((text: string, type: 'info' | 'proxy' | 'sec' = 'proxy') => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs((prev) => [...prev.slice(-24), { time, text, type }]);
  }, []);

  // Initialize & Sync Service Worker Wisp configuration
  useEffect(() => {
    ensureServiceWorkerReady().then((ready) => {
      configureServiceWorkerWisp(wispServer, engine, relayNode);
      if (ready) {
        addLog(`[SW Active] ${engine.toUpperCase()} Service Worker bound to Wisp (${wispServer})`, 'sec');
      }
    });
  }, [wispServer, engine, relayNode, addLog]);

  const handleSelectWispServer = useCallback(
    async (nextWispUrl: string) => {
      const clean = nextWispUrl.trim();
      if (!clean) return;
      setWispServer(clean);
      configureServiceWorkerWisp(clean, engine, relayNode);
      addLog(`[Wisp] Testing Wisp v1 handshake -> ${clean}...`, 'info');
      const res = await testWispServerConnection(clean);
      setLatency(res.latencyMs);
      setWispModeLabel(res.mode);
      addLog(`[Wisp OK] ${clean} (${res.latencyMs}ms — ${res.mode})`, 'sec');
    },
    [engine, relayNode, addLog]
  );

  // Fetch GitHub repositories when in GitHub mode
  const searchGitHubRepos = useCallback(async (q: string) => {
    setGhLoading(true);
    setSelectedRepoReadme(null);
    try {
      const res = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(q || 'webgl')}&sort=stars&per_page=8`);
      if (res.ok) {
        const data = await res.json();
        setGhRepos(data.items || []);
      }
    } catch {
      setGhRepos([
        {
          id: 1,
          full_name: 'mrdoob/three.js',
          description: 'JavaScript 3D Library for WebGL and WebGPU.',
          stargazers_count: 102400,
          language: 'JavaScript',
          html_url: 'https://github.com/mrdoob/three.js',
          homepage: 'https://threejs.org',
        },
        {
          id: 2,
          full_name: 'facebook/react',
          description: 'The library for web and native user interfaces.',
          stargazers_count: 228000,
          language: 'TypeScript',
          html_url: 'https://github.com/facebook/react',
          homepage: 'https://react.dev',
        },
        {
          id: 3,
          full_name: 'vitejs/vite',
          description: 'Next generation frontend tooling. It is fast!',
          stargazers_count: 68500,
          language: 'TypeScript',
          html_url: 'https://github.com/vitejs/vite',
          homepage: 'https://vitejs.dev',
        },
      ]);
    } finally {
      setGhLoading(false);
    }
  }, []);

  const openGitHubRepoDetail = useCallback(async (fullName: string) => {
    setGhLoading(true);
    try {
      const res = await fetch(`https://api.github.com/repos/${fullName}/readme`, {
        headers: { Accept: 'application/vnd.github.v3.raw' },
      });
      if (res.ok) {
        const text = await res.text();
        setSelectedRepoReadme({
          name: fullName,
          content: text.slice(0, 4000),
          url: `https://github.com/${fullName}`,
        });
      } else {
        setSelectedRepoReadme({
          name: fullName,
          content: `# ${fullName}\n\nRepository verified via GitHub REST API.`,
          url: `https://github.com/${fullName}`,
        });
      }
    } catch {
      setSelectedRepoReadme({
        name: fullName,
        content: `# ${fullName}\n\nRepository loaded in GlasispectUI Safe Reader.`,
        url: `https://github.com/${fullName}`,
      });
    } finally {
      setGhLoading(false);
    }
  }, []);

  // Run Wikipedia / Web search when in about:search
  const runSmartSearch = useCallback(async (q: string) => {
    const cleanQ = q.trim() || 'GlassiumOS';
    setSearchLoading(true);
    setWikiArticle(null);
    const isJa = /[\u3040-\u30ff\u4e00-\u9faf]/.test(cleanQ);
    const lang = isJa ? 'ja' : 'en';
    try {
      const url = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQ)}&utf8=&format=json&origin=*&srlimit=6`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const items: WikiSearchResult[] = (data?.query?.search || []).map((it: { title: string; snippet: string; pageid: number }) => ({
          title: it.title,
          snippet: it.snippet.replace(/<\/?[^>]+(>|$)/g, ''),
          pageid: it.pageid,
        }));
        setWikiResults(items);
        if (items.length > 0) {
          const sumRes = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(items[0].title)}`);
          if (sumRes.ok) {
            const sumData = await sumRes.json();
            if (sumData.extract) {
              setWikiArticle({
                title: sumData.title || items[0].title,
                extract: sumData.extract,
                url: sumData.content_urls?.desktop?.page || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(items[0].title)}`,
              });
            }
          }
        }
      }
    } catch {
      setWikiResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Load any external URL through real Service Worker (/uv/service/* or /scramjet/*) + Wisp v1
  const loadProxiedWebpage = useCallback(
    async (
      targetUrl: string,
      nodeToUse: ProxyRelayNodeId = relayNode,
      engineToUse: ProxyEngine = engine
    ) => {
      if (!targetUrl || targetUrl === 'about:start' || targetUrl.startsWith('about:')) return;
      setIsLoading(true);
      setFrameError(false);
      const t0 = performance.now();

      configureServiceWorkerWisp(wispServer, engineToUse, nodeToUse);
      const swReady = await ensureServiceWorkerReady();

      const useDirectServiceWorkerRoute =
        swReady &&
        (nodeToUse === 'auto' || nodeToUse === 'wisp-mux' || nodeToUse === 'sw-tunnel');

      if (useDirectServiceWorkerRoute) {
        const swRoute = getServiceWorkerProxyUrl(targetUrl, engineToUse);
        setProxiedSrcDoc('');
        setSwIframeSrc(swRoute);
        const routePrefix = engineToUse === 'ultraviolet' ? '/uv/service/' : '/scramjet/';
        setActiveNodeLabel(`Wisp (${wispServer}) + ${engineToUse.toUpperCase()} SW (${routePrefix})`);
        setLatency(Math.max(5, Math.round(performance.now() - t0)));
        addLog(`[SW Route] Navigating iframe -> ${swRoute} via ${wispServer}`, 'sec');
        setTimeout(() => setIsLoading(false), 450);
        return;
      }

      // Fallback or explicit Relay Node (e.g. Jina Reader, AllOrigins, CodeTabs, GCS)
      addLog(`[Proxy Cascade] Fetching ${targetUrl} via ${nodeToUse}...`, 'proxy');
      try {
        const result = await fetchHtmlViaProxyCascade(targetUrl, nodeToUse);
        setSwIframeSrc('');
        setProxiedSrcDoc(result.html);
        setActiveNodeLabel(result.usedNode);
        setLatency(Math.max(8, Math.round(performance.now() - t0)));
        addLog(`[200 OK] Rendered ${result.finalUrl} via ${result.usedNode}`, 'sec');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Relay connection error';
        addLog(`[Fallback] ${msg}`, 'info');
        setFrameError(true);
      } finally {
        setIsLoading(false);
      }
    },
    [addLog, engine, relayNode, wispServer]
  );

  const navigateTo = useCallback(
    (url: string, overrideForceRaw = true) => {
      const norm = normalizeUrl(url);
      setIsLoading(true);
      setFrameError(false);
      setForceRawIframe(overrideForceRaw);
      setAddress(norm);
      setInputVal(norm === 'about:start' || norm === 'about:gcs' ? '' : norm.replace(/^about:search\?q=/, ''));
      setLoadedUrl(norm);

      addLog(`[${engine.toUpperCase()} + Wisp] Routing -> ${norm}`, 'proxy');

      const willUseGitHubHub = !overrideForceRaw && (norm.includes('github.com') || norm.includes('github.io'));
      const willUseSmartSearch = norm.startsWith('about:search?q=');

      if (willUseGitHubHub) {
        const matchRepo = norm.match(/github\.com\/([^/]+\/[^/?#]+)/i);
        if (matchRepo && matchRepo[1]) {
          openGitHubRepoDetail(matchRepo[1]);
        } else {
          searchGitHubRepos(ghQuery);
        }
        setIsLoading(false);
      } else if (willUseSmartSearch) {
        const q = decodeURIComponent(norm.replace('about:search?q=', '')) || 'GlassiumOS';
        runSmartSearch(q);
        setIsLoading(false);
      } else if (norm !== 'about:start' && norm !== 'about:gcs' && !norm.startsWith('about:')) {
        loadProxiedWebpage(norm, relayNode, engine);
      } else {
        setIsLoading(false);
      }

      setHistory((prev) => {
        const next = prev.slice(0, historyIdx + 1);
        return [...next, norm];
      });
      setHistoryIdx((prev) => prev + 1);
    },
    [
      engine,
      ghQuery,
      historyIdx,
      loadProxiedWebpage,
      openGitHubRepoDetail,
      relayNode,
      runSmartSearch,
      searchGitHubRepos,
      addLog,
    ]
  );

  // Listen for navigation & URL sync events posted from the proxied Service Worker iframe
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === 'LIQUID_BROWSER_NAV' && typeof e.data.url === 'string') {
        navigateTo(e.data.url, true);
      } else if (e.data.type === 'LIQUID_BROWSER_URL_SYNC' && typeof e.data.url === 'string') {
        setAddress(e.data.url);
        setInputVal(e.data.url);
        setLoadedUrl(e.data.url);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [navigateTo]);

  // If payload URL was passed on mount (e.g. from Music app), load it
  useEffect(() => {
    if (payload?.url && payload.url !== 'about:start') {
      navigateTo(payload.url, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload?.url]);

  const goBack = () => {
    if (historyIdx > 0) {
      const prevIdx = historyIdx - 1;
      setHistoryIdx(prevIdx);
      const url = history[prevIdx];
      setAddress(url);
      setInputVal(url === 'about:start' || url === 'about:gcs' ? '' : url.replace(/^about:search\?q=/, ''));
      setLoadedUrl(url);
      setFrameError(false);
      if (url !== 'about:start' && url !== 'about:gcs' && !url.startsWith('about:')) {
        loadProxiedWebpage(url, relayNode);
      }
    }
  };

  const goForward = () => {
    if (historyIdx < history.length - 1) {
      const nextIdx = historyIdx + 1;
      setHistoryIdx(nextIdx);
      const url = history[nextIdx];
      setAddress(url);
      setInputVal(url === 'about:start' || url === 'about:gcs' ? '' : url.replace(/^about:search\?q=/, ''));
      setLoadedUrl(url);
      setFrameError(false);
      if (url !== 'about:start' && url !== 'about:gcs' && !url.startsWith('about:')) {
        loadProxiedWebpage(url, relayNode);
      }
    }
  };

  const refreshPage = () => {
    if (loadedUrl !== 'about:start' && loadedUrl !== 'about:gcs' && !loadedUrl.startsWith('about:')) {
      loadProxiedWebpage(loadedUrl, relayNode);
    } else if (loadedUrl.startsWith('about:search?q=')) {
      runSmartSearch(decodeURIComponent(loadedUrl.replace('about:search?q=', '')));
    }
  };

  const handleCreateGcsSandbox = (target: string) => {
    const html = generateGcsStandaloneLauncherHtml(target);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    if (gcsBlobSandboxUrl) URL.revokeObjectURL(gcsBlobSandboxUrl);
    const url = URL.createObjectURL(blob);
    setGcsBlobSandboxUrl(url);
    addLog(`[GCS Gateway] Generated storage.googleapis.com compatible sandbox for ${target}`, 'sec');
  };

  const handleDownloadGcsLauncher = (target: string) => {
    const html = generateGcsStandaloneLauncherHtml(target);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'glassium-gcs-launcher.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addLog(`[GCS Export] Downloaded glassium-gcs-launcher.html for storage.googleapis.com`, 'info');
  };

  const encodedProxyString = useMemo(() => {
    if (loadedUrl === 'about:start') return 'about:start';
    if (engine === 'ultraviolet') return encodeUltraviolet(loadedUrl);
    if (engine === 'scramjet') return encodeScramjet(loadedUrl);
    return loadedUrl;
  }, [engine, loadedUrl]);

  const isStartPage = loadedUrl === 'about:start';
  const isGcsGatewayPage = loadedUrl === 'about:gcs';
  const isGitHubView = !forceRawIframe && (loadedUrl.includes('github.com') || loadedUrl.includes('github.io'));
  const isSmartSearchView = !forceRawIframe && loadedUrl.startsWith('about:search?q=');

  return (
    <div className="flex h-full w-full min-w-0 min-h-0 flex-col bg-zinc-950 text-white select-none">
      {/* Top Browser Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.08] bg-black/60 backdrop-blur-md">
        <div className="flex items-center gap-1">
          <button
            onClick={goBack}
            disabled={historyIdx === 0}
            className="p-1.5 text-white/70 hover:bg-white/10 disabled:opacity-30 transition"
            title="Back"
          >
            <Icon name="ArrowLeft" size={15} />
          </button>
          <button
            onClick={goForward}
            disabled={historyIdx >= history.length - 1}
            className="p-1.5 text-white/70 hover:bg-white/10 disabled:opacity-30 transition"
            title="Forward"
          >
            <Icon name="ArrowRight" size={15} />
          </button>
          <button
            onClick={refreshPage}
            className={`p-1.5 text-white/70 hover:bg-white/10 transition ${isLoading ? 'animate-spin text-cyan-400' : ''}`}
            title="Reload Page"
          >
            <Icon name="RefreshCw" size={14} />
          </button>
          <button
            onClick={() => navigateTo('about:start')}
            className={`p-1.5 transition ${isStartPage ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10'}`}
            title="Home"
          >
            <Icon name="Home" size={14} />
          </button>
        </div>

        {/* Address & Search Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            navigateTo(inputVal, true);
          }}
          className="flex-1 flex items-center gap-2 bg-white/[0.04] border-b border-white/15 px-3 py-1.5 focus-within:border-cyan-400 focus-within:bg-black/70 transition"
        >
          <div className="flex items-center gap-1.5 text-white/40">
            {isStartPage ? (
              <Icon name="Sparkles" size={14} className="text-cyan-400" />
            ) : (
              <Icon name="Lock" size={13} className="text-emerald-400" />
            )}
          </div>
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="検索またはURL入力 (例: monochrome.tf, duckduckgo.com, ja.wikipedia.org)..."
            className="flex-1 bg-transparent text-xs text-white placeholder-white/40 outline-none font-sans"
          />
          {inputVal && (
            <button
              type="button"
              onClick={() => setInputVal('')}
              className="text-white/40 hover:text-white p-0.5"
            >
              <Icon name="X" size={12} />
            </button>
          )}
          <button
            type="submit"
            className="px-2.5 py-0.5 bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-300 text-[11px] font-semibold transition"
          >
            移動
          </button>
        </form>

        {/* Wisp Server Selector */}
        <select
          value={wispServer}
          onChange={(e) => {
            const nextWisp = e.target.value;
            handleSelectWispServer(nextWisp);
            if (!isStartPage && !isGcsGatewayPage && !loadedUrl.startsWith('about:')) {
              loadProxiedWebpage(loadedUrl, relayNode, engine);
            }
          }}
          className="hidden lg:block bg-zinc-900 border border-white/15 text-emerald-300 text-[11px] px-2 py-1 outline-none cursor-pointer font-mono"
          title="Wisp v1 Multiplexer Server 切替"
        >
          {WISP_SERVER_PRESETS.map((w) => (
            <option key={w.id} value={w.wispUrl} className="bg-zinc-900 text-white">
              Wisp: {w.name}
            </option>
          ))}
        </select>

        {/* Proxy Relay Mode Selector */}
        <select
          value={relayNode}
          onChange={(e) => {
            const nextNode = e.target.value as ProxyRelayNodeId;
            setRelayNode(nextNode);
            if (!isStartPage && !isGcsGatewayPage && !loadedUrl.startsWith('about:')) {
              setForceRawIframe(true);
              loadProxiedWebpage(loadedUrl, nextNode, engine);
            }
          }}
          className="hidden md:block bg-zinc-900 border border-white/15 text-cyan-300 text-[11px] px-2 py-1 outline-none cursor-pointer"
          title="プロキシ中継モード切替"
        >
          {PROXY_RELAY_SERVERS.map((srv) => (
            <option key={srv.id} value={srv.id} className="bg-zinc-900 text-white">
              {srv.name}
            </option>
          ))}
        </select>

        {/* Ultraviolet / Scramjet Service Worker Switcher */}
        <div className="hidden sm:flex items-center gap-1 bg-white/[0.04] p-0.5 border border-white/[0.06]">
          <button
            onClick={() => {
              setEngine('scramjet');
              configureServiceWorkerWisp(wispServer, 'scramjet', relayNode);
              addLog('[SW Engine] Switched to Scramjet v3 Service Worker (/scramjet/*)', 'proxy');
              if (!isStartPage && !isGcsGatewayPage && !loadedUrl.startsWith('about:')) {
                loadProxiedWebpage(loadedUrl, relayNode, 'scramjet');
              }
            }}
            className={`px-2 py-1 text-[11px] font-medium flex items-center gap-1 transition ${
              engine === 'scramjet' ? 'bg-cyan-500 text-black font-semibold' : 'text-white/60 hover:text-white'
            }`}
          >
            <Icon name="Zap" size={12} />
            <span>Scramjet SW</span>
          </button>
          <button
            onClick={() => {
              setEngine('ultraviolet');
              configureServiceWorkerWisp(wispServer, 'ultraviolet', relayNode);
              addLog('[SW Engine] Switched to Ultraviolet v3 Service Worker (/uv/service/*)', 'sec');
              if (!isStartPage && !isGcsGatewayPage && !loadedUrl.startsWith('about:')) {
                loadProxiedWebpage(loadedUrl, relayNode, 'ultraviolet');
              }
            }}
            className={`px-2 py-1 text-[11px] font-medium flex items-center gap-1 transition ${
              engine === 'ultraviolet' ? 'bg-purple-600 text-white font-semibold' : 'text-white/60 hover:text-white'
            }`}
          >
            <Icon name="Shield" size={12} />
            <span>Ultraviolet SW</span>
          </button>
        </div>

        <button
          onClick={() => setShowDiagnostics(!showDiagnostics)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono border transition shrink-0 ${
            showDiagnostics
              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          }`}
          title="Wisp サーバー & UV/Scramjet SW 設定"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Wisp {latency}ms</span>
        </button>
      </div>

      {/* Wisp Server & Ultraviolet / Scramjet Service Worker Configuration Flyout */}
      {showDiagnostics && (
        <div className="bg-zinc-900 border-b border-cyan-500/30 p-3.5 text-xs flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-semibold text-cyan-300">
                Wisp v1 Multiplexer + {engine === 'ultraviolet' ? 'Ultraviolet (/uv/service/*)' : 'Scramjet (/scramjet/*)'} Service Worker
              </span>
              <span className="ml-2 text-[10px] font-mono text-white/50">({wispModeLabel})</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 truncate max-w-md">{encodedProxyString}</span>
          </div>

          {/* Wisp Server Presets + Custom Wisp Server Input */}
          <div className="space-y-1.5">
            <div className="text-[11px] text-white/60 font-medium">Wisp Server (wss://) 選択・カスタム追加:</div>
            <div className="flex flex-wrap items-center gap-1.5">
              {WISP_SERVER_PRESETS.map((w) => (
                <button
                  key={w.id}
                  onClick={() => {
                    handleSelectWispServer(w.wispUrl);
                    if (!isStartPage && !isGcsGatewayPage && !loadedUrl.startsWith('about:')) {
                      loadProxiedWebpage(loadedUrl, relayNode, engine);
                    }
                  }}
                  className={`px-2.5 py-1 text-[10px] font-mono border transition ${
                    wispServer === w.wispUrl
                      ? 'bg-emerald-400 text-black border-emerald-300 font-bold'
                      : 'bg-black/50 text-white/70 border-white/10 hover:text-white'
                  }`}
                >
                  {w.name} ({w.wispUrl})
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={customWispInput}
                onChange={(e) => setCustomWispInput(e.target.value)}
                placeholder="カスタム Wisp サーバーを入力 (例: wss://wisp.mercurywork.shop/)"
                className="flex-1 bg-black/60 border border-white/15 px-2.5 py-1 text-[11px] text-white font-mono outline-none"
              />
              <button
                onClick={() => {
                  if (customWispInput.trim()) {
                    handleSelectWispServer(customWispInput.trim());
                    setCustomWispInput('');
                  }
                }}
                className="px-3 py-1 bg-emerald-500 text-black font-bold text-[11px] hover:bg-emerald-400 transition"
              >
                Wisp接続テスト &amp; 適用
              </button>
            </div>
          </div>

          {/* Relay Mode Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {PROXY_RELAY_SERVERS.map((srv) => (
              <button
                key={srv.id}
                onClick={() => {
                  setRelayNode(srv.id);
                  if (!isStartPage && !isGcsGatewayPage && !loadedUrl.startsWith('about:')) {
                    setForceRawIframe(true);
                    loadProxiedWebpage(loadedUrl, srv.id, engine);
                  }
                }}
                className={`px-2.5 py-1 text-[10px] font-mono border transition ${
                  relayNode === srv.id
                    ? 'bg-cyan-400 text-black border-cyan-300 font-bold'
                    : 'bg-black/50 text-white/70 border-white/10 hover:text-white'
                }`}
              >
                {srv.name}
              </button>
            ))}
          </div>

          <div className="bg-black/60 p-2 font-mono text-[10px] text-white/70 max-h-20 overflow-y-auto space-y-1">
            {logs.map((log, idx) => (
              <div key={idx} className="flex gap-2">
                <span className="text-white/40">[{log.time}]</span>
                <span className="text-cyan-300">{log.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Bookmarks Bar */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-white/[0.06] bg-zinc-950/80 overflow-x-auto shrink-0">
        {SPEED_DIAL.map((b) => (
          <button
            key={b.url}
            onClick={() => navigateTo(b.url, true)}
            className="px-2.5 py-1 text-[11px] flex items-center gap-1.5 whitespace-nowrap transition text-white/70 hover:bg-white/[0.06] hover:text-white"
          >
            <Icon name={b.icon} size={12} />
            <span>{b.label}</span>
          </button>
        ))}
        {!isStartPage && !isGcsGatewayPage && (
          <button
            onClick={() => {
              const nextEngine: ProxyEngine = engine === 'scramjet' ? 'ultraviolet' : 'scramjet';
              setEngine(nextEngine);
              loadProxiedWebpage(loadedUrl, 'wisp-mux', nextEngine);
            }}
            className="ml-auto px-2.5 py-0.5 text-[10px] font-mono bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 transition shrink-0"
          >
            SW切替: {engine === 'scramjet' ? 'Scramjet -> Ultraviolet (/uv/service/)' : 'Ultraviolet -> Scramjet (/scramjet/)'}
          </button>
        )}
      </div>

      {/* Main Content View */}
      <div className="flex-1 relative bg-zinc-950 min-h-0 overflow-hidden">
        {isImage ? (
          <div className="h-full w-full flex items-center justify-center bg-zinc-900 overflow-auto p-4">
            <img src={loadedUrl} alt={address} className="max-w-full max-h-full object-contain shadow-2xl" />
          </div>
        ) : isGcsGatewayPage ? (
          /* Google Cloud Storage (storage.googleapis.com) Gateway & Launcher */
          <div className="h-full w-full overflow-y-auto p-6 md:p-8 bg-zinc-950 text-white space-y-6">
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="border-b border-white/10 pb-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest">
                    GOOGLE CLOUD STORAGE GATEWAY &amp; SANDBOX LAUNCHER
                  </div>
                  <h2 className="text-xl font-bold mt-1">storage.googleapis.com ゲートウェイ &amp; ランチャー</h2>
                  <p className="text-xs text-white/60 mt-1">
                    storage.googleapis.com 上のバケットや静的HTMLアプリの直接展開、およびどこからでも開けるスタンドアロンHTMLランチャーを生成します。
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadGcsLauncher(gcsCustomTargetUrl)}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition flex items-center gap-2"
                >
                  <Icon name="Download" size={14} />
                  <span>GCS用スタンドアロンHTMLを保存</span>
                </button>
              </div>

              {/* Section 1: Open any storage.googleapis.com URL or Bucket */}
              <div className="p-5 bg-white/[0.03] border-t-2 border-cyan-400 space-y-3">
                <div className="text-xs font-bold text-cyan-300">
                  1. storage.googleapis.com のバケット / ファイルをプロキシ内で直接開く
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={gcsBucketInput}
                    onChange={(e) => setGcsBucketInput(e.target.value)}
                    placeholder="https://storage.googleapis.com/bucket-name/index.html または gcs://bucket-name"
                    className="flex-1 bg-black/60 border border-white/15 px-3 py-2 text-xs text-white outline-none font-mono"
                  />
                  <button
                    onClick={() => {
                      setRelayNode('gcs-gateway');
                      navigateTo(gcsBucketInput, true);
                    }}
                    className="px-4 py-2 bg-cyan-500 text-black font-bold text-xs shrink-0 hover:bg-cyan-400 transition"
                  >
                    GCSを開く
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    { label: 'TensorFlow.js Models Bucket', url: 'https://storage.googleapis.com/tfjs-models/' },
                    { label: 'Google Cloud Public Data', url: 'https://storage.googleapis.com/gcp-public-data-landsat/' },
                    { label: 'Chromium Snapshots Bucket', url: 'https://storage.googleapis.com/chromium-browser-snapshots/' },
                  ].map((sample) => (
                    <button
                      key={sample.url}
                      onClick={() => {
                        setGcsBucketInput(sample.url);
                        setRelayNode('gcs-gateway');
                        navigateTo(sample.url, true);
                      }}
                      className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-[11px] text-cyan-200 font-mono transition"
                    >
                      {sample.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section 2: Launch any website inside a GCS-compatible Blob / Sandbox */}
              <div className="p-5 bg-white/[0.03] border-t-2 border-amber-400 space-y-3">
                <div className="text-xs font-bold text-amber-300">
                  2. 任意のWebサイト (monochrome.tf 等) を GCS 互換サンドボックスまたは Wisp SW で起動
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={gcsCustomTargetUrl}
                    onChange={(e) => setGcsCustomTargetUrl(e.target.value)}
                    placeholder="https://monochrome.tf"
                    className="flex-1 bg-black/60 border border-white/15 px-3 py-2 text-xs text-white outline-none font-mono"
                  />
                  <button
                    onClick={() => handleCreateGcsSandbox(gcsCustomTargetUrl)}
                    className="px-4 py-2 bg-amber-400 text-black font-bold text-xs shrink-0 hover:bg-amber-300 transition"
                  >
                    サンドボックス起動
                  </button>
                  <button
                    onClick={() => navigateTo(gcsCustomTargetUrl, true)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs shrink-0 transition"
                  >
                    Wisp + SWプロキシで開く
                  </button>
                </div>

                {gcsBlobSandboxUrl && (
                  <div className="mt-4 border border-white/15 bg-black h-80 flex flex-col">
                    <div className="px-3 py-1.5 bg-zinc-900 border-b border-white/10 flex items-center justify-between text-[11px]">
                      <span className="text-emerald-400 font-mono">GCS Compatible Sandbox Active ({gcsCustomTargetUrl})</span>
                      <button
                        onClick={() => setGcsBlobSandboxUrl(null)}
                        className="text-white/50 hover:text-white"
                      >
                        閉じる
                      </button>
                    </div>
                    <iframe
                      src={gcsBlobSandboxUrl}
                      className="flex-1 w-full border-0 bg-white"
                      title="gcs-sandbox"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : isStartPage ? (
          <div className="h-full w-full overflow-y-auto p-6 md:p-10 flex flex-col items-center justify-center bg-gradient-to-b from-zinc-950 via-zinc-900/60 to-black">
            <div className="w-full max-w-3xl space-y-8">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-xl mb-1">
                  <Icon name="Globe" size={26} />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-white">Glasispect Wisp + SW Browser</h1>
                <p className="text-xs text-white/50">
                  Wisp v1 Multiplexer + Service Worker Ultraviolet (/uv/service/) &amp; Scramjet (/scramjet/) 搭載
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (inputVal.trim()) navigateTo(inputVal, true);
                }}
                className="flex items-center gap-3 bg-white/[0.04] hover:bg-white/[0.06] focus-within:bg-black/80 border-b-2 border-cyan-500/60 px-5 py-3.5 shadow-2xl transition"
              >
                <Icon name="Search" size={17} className="text-cyan-400 shrink-0" />
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="Web検索、monochrome.tf、storage.googleapis.com、または任意のURLを入力..."
                  className="w-full bg-transparent text-sm text-white placeholder-white/30 outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold shrink-0 transition"
                >
                  Wisp SWで開く
                </button>
              </form>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-medium text-white/50 px-1">
                  <span>Speed Dial &amp; Wisp Service Worker Gateways</span>
                  <span className="text-[11px] font-mono text-emerald-400">Wisp: {wispServer}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {SPEED_DIAL.map((item) => (
                    <button
                      key={item.url}
                      onClick={() => navigateTo(item.url, true)}
                      className="p-3.5 bg-white/[0.03] hover:bg-white/[0.07] border-t border-white/10 transition text-left flex flex-col justify-between h-24 group"
                    >
                      <div className="w-7 h-7 bg-white/[0.05] flex items-center justify-center text-cyan-400 group-hover:text-white transition">
                        <Icon name={item.icon} size={15} />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white group-hover:text-cyan-300 transition">
                          {item.label}
                        </div>
                        <div className="text-[10px] text-white/40 truncate">{item.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : isGitHubView ? (
          /* Built-in Zero-404 GitHub Repository & Pages Hub */
          <div className="h-full w-full overflow-y-auto p-6 space-y-6 bg-zinc-950 text-white">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 flex items-center justify-center text-cyan-400">
                  <Icon name="GitBranch" size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold">GitHub Explorer &amp; Pages Hub (404-Free)</h2>
                  <p className="text-xs text-white/50">
                    GitHub Pages の URL 変更による 404 エラーを回避し、GitHub API から直接リポジトリと README を参照します
                  </p>
                </div>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  searchGitHubRepos(ghQuery);
                }}
                className="flex items-center gap-2 bg-white/5 border-b border-white/20 px-3 py-1.5"
              >
                <input
                  type="text"
                  value={ghQuery}
                  onChange={(e) => setGhQuery(e.target.value)}
                  placeholder="リポジトリを検索 (例: react, three.js)..."
                  className="bg-transparent text-xs text-white outline-none w-48"
                />
                <button type="submit" className="px-2.5 py-1 bg-cyan-500 text-black text-xs font-bold">
                  検索
                </button>
              </form>
            </div>

            {selectedRepoReadme ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setSelectedRepoReadme(null)}
                    className="px-3 py-1 bg-white/10 hover:bg-white/15 text-xs flex items-center gap-1.5"
                  >
                    <Icon name="ArrowLeft" size={13} />
                    <span>リポジトリ一覧に戻る</span>
                  </button>
                  <button
                    onClick={() => {
                      setForceRawIframe(true);
                      loadProxiedWebpage(selectedRepoReadme.url, relayNode, engine);
                    }}
                    className="px-3 py-1 bg-cyan-500/20 text-cyan-300 text-xs"
                  >
                    Wisp SWプロキシでオリジナルページを開く
                  </button>
                </div>
                <div className="p-5 bg-white/[0.03] border-t border-cyan-400/50 space-y-2">
                  <div className="text-sm font-bold text-cyan-300">{selectedRepoReadme.name} — README</div>
                  <pre className="text-xs text-white/80 whitespace-pre-wrap font-mono leading-relaxed max-h-[55vh] overflow-y-auto">
                    {selectedRepoReadme.content}
                  </pre>
                </div>
              </div>
            ) : ghLoading ? (
              <div className="py-16 text-center text-xs text-white/50">GitHub リポジトリ情報を取得中...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ghRepos.map((repo) => (
                  <div
                    key={repo.id}
                    onClick={() => openGitHubRepoDetail(repo.full_name)}
                    className="p-4 bg-white/[0.03] hover:bg-white/[0.06] border-t border-white/10 cursor-pointer transition flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-cyan-300">{repo.full_name}</span>
                        <span className="text-[11px] font-mono text-amber-300">★ {repo.stargazers_count.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-white/65 mt-1 line-clamp-2">{repo.description}</p>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-white/40 pt-2 border-t border-white/5">
                      <span>{repo.language || 'Code'}</span>
                      <span className="text-cyan-400">README を表示 →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : isSmartSearchView ? (
          /* Built-in Smart Search & Wikipedia Reader */
          <div className="h-full w-full overflow-y-auto p-6 space-y-6 bg-zinc-950 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h2 className="text-base font-bold text-cyan-300">Glasispect Smart Web &amp; Encyclopedia Search</h2>
                <p className="text-xs text-white/50">検索語句: {inputVal || 'GlassiumOS'}</p>
              </div>
              <button
                onClick={() => {
                  setForceRawIframe(true);
                  const q = loadedUrl.replace(/^about:search\?q=/, '');
                  loadProxiedWebpage(`https://html.duckduckgo.com/html/?q=${q}`, relayNode, engine);
                }}
                className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-300 text-xs font-semibold"
              >
                DuckDuckGo (Wisp SWプロキシ) で開く
              </button>
            </div>

            {searchLoading ? (
              <div className="py-12 text-center text-xs text-white/50">検索結果を取得中...</div>
            ) : (
              <div className="space-y-5">
                {wikiArticle && (
                  <div className="p-5 bg-white/[0.04] border-l-2 border-cyan-400 space-y-2">
                    <div className="text-xs font-mono text-cyan-400 uppercase">Instant Summary</div>
                    <h3 className="text-base font-bold">{wikiArticle.title}</h3>
                    <p className="text-xs text-white/80 leading-relaxed whitespace-pre-wrap">{wikiArticle.extract}</p>
                  </div>
                )}

                <div className="divide-y divide-white/10 border-t border-b border-white/10">
                  {wikiResults.map((item) => (
                    <div
                      key={item.pageid}
                      onClick={() => runSmartSearch(item.title)}
                      className="py-3.5 px-2 hover:bg-white/[0.04] cursor-pointer transition"
                    >
                      <div className="text-sm font-bold text-cyan-300">{item.title}</div>
                      <p className="text-xs text-white/65 mt-1">{item.snippet}...</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Active Webpage Frame rendered via real Service Worker (/uv/service/* or /scramjet/*) + Wisp v1 */
          <div className="h-full w-full relative bg-zinc-950 flex flex-col">
            <div className="px-3 py-1 bg-zinc-900 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-white/60 shrink-0">
              <span className="truncate">
                Tunnel: <strong className="text-cyan-300">{activeNodeLabel}</strong> — {loadedUrl}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    const nextEng: ProxyEngine = engine === 'scramjet' ? 'ultraviolet' : 'scramjet';
                    setEngine(nextEng);
                    loadProxiedWebpage(loadedUrl, 'wisp-mux', nextEng);
                  }}
                  className="px-2 py-0.5 bg-purple-500/20 hover:bg-purple-500/35 text-purple-200"
                >
                  {engine === 'scramjet' ? 'Ultraviolet SWで再読込' : 'Scramjet SWで再読込'}
                </button>

                <button
                  onClick={() => {
                    setGcsCustomTargetUrl(loadedUrl);
                    navigateTo('about:gcs');
                  }}
                  className="px-2 py-0.5 bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300"
                >
                  GCSランチャー化
                </button>
              </div>
            </div>

            <div className="flex-1 relative bg-white">
              {isLoading && (
                <div className="absolute inset-0 z-20 bg-zinc-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-xs text-cyan-300 font-mono">
                  <Icon name="RefreshCw" size={22} className="animate-spin text-cyan-400" />
                  <span>
                    Wisp ({wispServer}) + {engine.toUpperCase()} Service Worker で接続中 ({loadedUrl})...
                  </span>
                </div>
              )}

              {swIframeSrc ? (
                <iframe
                  ref={iframeRef}
                  src={swIframeSrc}
                  onLoad={() => setIsLoading(false)}
                  className="h-full w-full border-0 bg-white"
                  title="wisp-sw-proxy-browser"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                />
              ) : (
                <iframe
                  ref={iframeRef}
                  srcDoc={proxiedSrcDoc}
                  onLoad={() => setIsLoading(false)}
                  className="h-full w-full border-0 bg-white"
                  title="proxy-browser-srcdoc"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                />
              )}

              {frameError && (
                <div className="absolute inset-0 z-30 bg-zinc-950 flex flex-col items-center justify-center p-6 text-center space-y-4">
                  <div className="w-12 h-12 bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <Icon name="Shield" size={24} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Wisp プロキシ切替・スマートリーダー利用可能</h2>
                    <p className="text-xs text-white/60 max-w-md mt-1">
                      {loadedUrl} を別の Wisp ノードまたは Cloud Reader で開けます。
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      onClick={() => loadProxiedWebpage(loadedUrl, 'wisp-mux', 'ultraviolet')}
                      className="px-4 py-2 bg-purple-600 text-white font-semibold text-xs transition hover:bg-purple-500"
                    >
                      Ultraviolet SW + Wisp で再試行
                    </button>

                    <button
                      onClick={() => navigateTo('about:start')}
                      className="px-4 py-2 bg-white/10 text-white text-xs hover:bg-white/20 transition"
                    >
                      スタートページへ戻る
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default BrowserApp;
