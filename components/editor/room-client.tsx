"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  Bell,
  Bot,
  ChevronRight,
  Copy,
  FileCode2,
  FileText,
  Folder,
  Github,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Radio,
  Save,
  Search,
  Users
} from "lucide-react";
import { motion } from "framer-motion";
import type { OnMount } from "@monaco-editor/react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { languageByMonaco, languages } from "@/lib/languages";
import { OrbitBackground } from "@/components/orbit-background";
import { useToast } from "@/components/ui/toast";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

type Room = {
  id: string;
  name: string;
  language: string;
  code?: string;
  created_at: string;
};

type User = {
  id: string;
  email: string;
  name: string;
  avatar: string;
};

type PresenceUser = User & { color: string };
type AiMessage = {
  role: "user" | "assistant";
  content: string;
};
type Repo = { full_name: string; default_branch: string; private: boolean; updated_at?: string; name?: string };

type TreeEntry = {
  path: string;
  type: "blob" | "tree";
};

type TreeNode = {
  name: string;
  path: string;
  type: "blob" | "tree";
  children?: TreeNode[];
};

const cursorColors = ["#18a999", "#eab308", "#e83e6f", "#38bdf8", "#a3e635"];

export function RoomClient({ room, user }: { room: Room; user: User }) {
  const supabase = useMemo(() => createClient(), []);
  const [code, setCode] = useState(room.code ?? languageByMonaco(room.language).starter);
  const [language, setLanguage] = useState(room.language);
  const [output, setOutput] = useState("Ready.");
  const [stdin, setStdin] = useState("");
  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([
    {
      role: "assistant",
      content: "Ask me to debug, explain, refactor, or generate tests for the current room."
    }
  ]);
  const [aiInput, setAiInput] = useState("");
  const [aiStreaming, setAiStreaming] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [fileSha, setFileSha] = useState<string | undefined>();
  const [activeFilePath, setActiveFilePath] = useState("");
  const [commitMessage, setCommitMessage] = useState("Update file from CodeOrbit");
  const [repoSearch, setRepoSearch] = useState("");
  const [repoLoading, setRepoLoading] = useState(false);
  const [repoError, setRepoError] = useState<string | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [treeRoot, setTreeRoot] = useState<TreeNode | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [explorerOpen, setExplorerOpen] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const broadcastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const applyingRemoteCode = useRef(false);
  const lastSavedCode = useRef(code);
  const lastAutosaveError = useRef(0);
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const channelName = useMemo(() => `room:${room.id}`, [room.id]);
  const selectedLanguage = languageByMonaco(language);
  const currentCode = useRef(code);
  const { toast } = useToast();

  useEffect(() => {
    currentCode.current = code;
  }, [code]);

  const filteredRepos = useMemo(() => {
    if (!repoSearch.trim()) return repos;
    const needle = repoSearch.toLowerCase();
    return repos.filter((repo) => repo.full_name.toLowerCase().includes(needle));
  }, [repoSearch, repos]);

  function buildTree(entries: TreeEntry[]) {
    const root: TreeNode = { name: "", path: "", type: "tree", children: [] };

    entries.forEach((entry) => {
      const parts = entry.path.split("/");
      let current = root;
      let currentPath = "";

      parts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        if (!current.children) current.children = [];
        let node = current.children.find((child) => child.name === part);
        if (!node) {
          node = {
            name: part,
            path: currentPath,
            type: index === parts.length - 1 ? entry.type : "tree",
            children: []
          };
          current.children.push(node);
        }
        if (node.type === "tree") {
          current = node;
        }
      });
    });

    const sortNodes = (node: TreeNode) => {
      if (!node.children) return;
      node.children.sort((a, b) => {
        if (a.type !== b.type) return a.type === "tree" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      node.children.forEach(sortNodes);
    };

    sortNodes(root);
    return root;
  }

  function togglePath(path: string) {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function fileIcon(path: string) {
    const lower = path.toLowerCase();
    if (lower.endsWith(".ts") || lower.endsWith(".tsx") || lower.endsWith(".js") || lower.endsWith(".jsx")) {
      return <FileCode2 className="h-4 w-4 text-cyan-300" />;
    }
    return <FileText className="h-4 w-4 text-slate-400" />;
  }

  useEffect(() => {
    const channel = supabase.channel(channelName, {
      config: { presence: { key: user.id } }
    });
    realtimeChannel.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceUser>();
        setActiveUsers(Object.values(state).flat());
      })
      .on("broadcast", { event: "code-change" }, ({ payload }) => {
        if (payload.userId !== user.id && typeof payload.code === "string") {
          applyingRemoteCode.current = true;
          setCode(payload.code);
          window.setTimeout(() => {
            applyingRemoteCode.current = false;
          }, 0);
        }
      })
      .on("broadcast", { event: "cursor" }, () => undefined)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "code_snapshots", filter: `room_id=eq.${room.id}` },
        (payload) => {
          const snapshot = payload.new as { code?: string };
          if (typeof snapshot.code === "string" && snapshot.code !== currentCode.current && snapshot.code !== lastSavedCode.current) {
            lastSavedCode.current = snapshot.code;
          }
        }
      )
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            ...user,
            color: cursorColors[Math.abs(hashCode(user.id)) % cursorColors.length]
          });
        }
      });

    return () => {
      realtimeChannel.current = null;
      if (broadcastTimer.current) {
        clearTimeout(broadcastTimer.current);
      }
      void supabase.removeChannel(channel);
    };
  }, [channelName, room.id, supabase, user]);

  useEffect(() => {
    if (applyingRemoteCode.current) {
      return;
    }
    if (code === lastSavedCode.current) {
      return;
    }
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }
    saveTimer.current = setTimeout(() => {
      void supabase
        .from("code_snapshots")
        .insert({ room_id: room.id, code })
        .then(({ error }) => {
          if (error) {
            console.warn("[CodeOrbit] Could not autosave code snapshot", error);
            const now = Date.now();
            if (now - lastAutosaveError.current > 10_000) {
              lastAutosaveError.current = now;
              toast({
                title: "Autosave failed",
                description: error.message ?? "Could not save code snapshot.",
                variant: "error"
              });
            }
          }
          else lastSavedCode.current = code;
        });
    }, 1200);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [code, room.id, supabase, toast]);

  const onMount: OnMount = (editor) => {
    editor.onDidChangeCursorPosition((event) => {
      void realtimeChannel.current?.send({
        type: "broadcast",
        event: "cursor",
        payload: { userId: user.id, position: event.position }
      });
    });
  };

  function changeCode(value: string | undefined) {
    const nextCode = value ?? "";
    setCode(nextCode);
    if (broadcastTimer.current) {
      clearTimeout(broadcastTimer.current);
    }
    broadcastTimer.current = setTimeout(() => {
      void realtimeChannel.current?.send({
        type: "broadcast",
        event: "code-change",
        payload: { userId: user.id, code: nextCode }
      });
    }, 180);
  }

  async function runCode() {
    setRunLoading(true);
    setOutput("Running...");
    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, code, stdin })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "Judge0 request failed.");
      }
      setOutput([result.status?.description, result.stdout, result.stderr, result.compile_output].filter(Boolean).join("\n") || "No output.");
    } catch (error) {
      console.error("[CodeOrbit] Run failed", error);
      const message = error instanceof Error ? error.message : "Run failed.";
      setOutput(message);
      toast({ title: "Run failed", description: message, variant: "error" });
    } finally {
      setRunLoading(false);
    }
  }

  async function saveSnapshot() {
    const { error } = await supabase.from("code_snapshots").insert({ room_id: room.id, code });
    if (error) {
      console.error("[CodeOrbit] Snapshot failed", error);
      setOutput(error.message);
      toast({ title: "Snapshot failed", description: error.message, variant: "error" });
      return;
    }
    lastSavedCode.current = code;
    setOutput("Snapshot saved.");
    toast({ title: "Snapshot saved", description: "Code snapshot stored.", variant: "success" });
  }

  async function copyRoomLink() {
    const link = `${window.location.origin}/room/${room.id}`;
    try {
      await navigator.clipboard.writeText(link);
      toast({ title: "Link copied", description: "Room link copied to clipboard.", variant: "success" });
    } catch (error) {
      console.error("[CodeOrbit] Copy link failed", error);
      toast({
        title: "Copy failed",
        description: error instanceof Error ? error.message : "Could not copy the link.",
        variant: "error"
      });
    }
  }

  const loadRepos = useCallback(async () => {
    if (repoLoading) return;
    setRepoLoading(true);
    setRepoError(null);
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      console.log("SESSION:", session);
      const token = session?.provider_token;
      console.log("TOKEN:", token);

      if (!token) {
        console.error("GitHub token missing");
        setRepos([]);
        setRepoError("GitHub token missing. Please re-authenticate.");
        return;
      }

      const response = await fetch("https://api.github.com/user/repos", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("GitHub API error", errorText);
        setRepoError("Could not load repositories.");
        return;
      }

      const data = await response.json();
      console.log("REPOS:", data);
      setRepos(Array.isArray(data) ? data : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load repositories.";
      console.error("[CodeOrbit] Repo load failed", error);
      setRepoError(message);
      toast({
        title: "GitHub error",
        description: message,
        variant: "error"
      });
    } finally {
      setRepoLoading(false);
    }
  }, [repoLoading, supabase, toast]);

  const loadRepoTree = useCallback(async (nextRepo: string) => {
    if (!nextRepo) return;
    setTreeLoading(true);
    setTreeRoot(null);
    setExpandedPaths(new Set());
    setActiveFilePath("");
    setFileSha(undefined);
    try {
      const [owner, repo] = nextRepo.split("/");
      const response = await fetch(`/api/github/files?mode=tree&owner=${owner}&repo=${repo}&branch=main&recursive=true`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Could not load repository tree.");
      }
      const entries = (data.tree ?? []).filter((item: TreeEntry) => item.type === "blob" || item.type === "tree");
      const root = buildTree(entries);
      setTreeRoot(root);
    } catch (error) {
      console.error("[CodeOrbit] Repo tree failed", error);
      toast({
        title: "GitHub error",
        description: error instanceof Error ? error.message : "Could not load repository tree.",
        variant: "error"
      });
    } finally {
      setTreeLoading(false);
    }
  }, [toast]);

  async function openFile(path: string) {
    if (!selectedRepo || !path) return;
    setFileLoading(true);
    try {
      const [owner, repo] = selectedRepo.split("/");
      const response = await fetch(
        `/api/github/files?owner=${owner}&repo=${repo}&path=${encodeURIComponent(path)}&branch=main`
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Could not open file.");
      }
      setCode(data.content ?? "");
      setFileSha(data.sha);
      setActiveFilePath(path);
      setOutput(`Opened ${selectedRepo}/${path}`);
    } catch (error) {
      console.error("[CodeOrbit] Open file failed", error);
      setOutput(error instanceof Error ? error.message : "Could not open file.");
      toast({
        title: "Open file failed",
        description: error instanceof Error ? error.message : "Could not open file.",
        variant: "error"
      });
    } finally {
      setFileLoading(false);
    }
  }

  async function commitFile() {
    if (!selectedRepo || !activeFilePath) return;
    const [owner, repo] = selectedRepo.split("/");
    const response = await fetch("/api/github/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner,
        repo,
        path: activeFilePath,
        content: code,
        message: commitMessage.trim() || `Update ${activeFilePath} from CodeOrbit`,
        sha: fileSha
      })
    });
    const data = await response.json();
    if (!response.ok) {
      const message = data.error ?? "Commit failed.";
      setOutput(message);
      toast({ title: "Commit failed", description: message, variant: "error" });
      return;
    }
    setOutput(data.commit?.html_url ?? "Commit finished.");
    toast({ title: "Commit created", description: data.commit?.html_url ?? "Changes pushed.", variant: "success" });
  }

  useEffect(() => {
    if (!selectedRepo) return;
    void loadRepoTree(selectedRepo);
  }, [loadRepoTree, selectedRepo]);

  useEffect(() => {
    void loadRepos();
  }, [loadRepos]);

  function renderNodes(nodes: TreeNode[], depth: number) {
    return nodes.map((node) => {
      const isFolder = node.type === "tree";
      const isExpanded = expandedPaths.has(node.path);
      const isActive = node.path === activeFilePath;

      return (
        <div key={node.path}>
          <button
            type="button"
            onClick={() => (isFolder ? togglePath(node.path) : void openFile(node.path))}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-blue-500/10 ${
              isActive ? "bg-blue-500/15 text-blue-100" : "text-slate-300"
            }`}
            style={{ paddingLeft: `${depth * 12}px` }}
          >
            {isFolder ? <Folder className="h-4 w-4 text-slate-400" /> : fileIcon(node.path)}
            <span className="truncate">{node.name}</span>
          </button>
          {isFolder && isExpanded && node.children?.length ? (
            <div>{renderNodes(node.children, depth + 1)}</div>
          ) : null}
        </div>
      );
    });
  }

  async function askAssistant() {
    const prompt = aiInput.trim();
    if (!prompt || aiStreaming) return;

    const nextMessages: AiMessage[] = [...aiMessages, { role: "user", content: prompt }];
    setAiMessages([...nextMessages, { role: "assistant", content: "" }]);
    setAiInput("");
    setAiStreaming(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.slice(-12),
          room: {
            language,
            code
          }
        })
      });

      if (!response.ok || !response.body) {
        const error = await response.json().catch(() => ({ error: "AI request failed." }));
        throw new Error(error.error ?? "AI request failed.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setAiMessages([...nextMessages, { role: "assistant", content: assistantText }]);
      }
    } catch (error) {
      console.error("[CodeOrbit] AI request failed", error);
      setAiMessages([
        ...nextMessages,
        { role: "assistant", content: error instanceof Error ? error.message : "AI request failed." }
      ]);
    } finally {
      setAiStreaming(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#0B0F14] text-slate-100">
      <OrbitBackground />
      <header className="z-20 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/70 bg-[#0B0F14]/75 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setExplorerOpen((value) => !value)} className="px-2">
            {explorerOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </Button>
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
            <FileCode2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <Link href="/dashboard" className="flex items-center gap-1 text-xs uppercase tracking-[0.22em] text-cyan-300">
              Dashboard <ChevronRight className="h-3 w-3" />
            </Link>
            <h1 className="text-xl font-black tracking-tight">{room.name}</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
            <Radio className="h-4 w-4 animate-pulse" /> Live
          </div>
          <div className="flex items-center gap-1 rounded-full border border-slate-700/70 bg-slate-950/50 px-3 py-2 text-sm text-slate-300">
            <Users className="h-4 w-4 text-cyan-300" /> {activeUsers.length}
          </div>
          <select value={language} onChange={(event) => setLanguage(event.target.value)} className="h-10 rounded-full border border-slate-700/70 bg-slate-950/60 px-4 text-sm text-slate-100 outline-none transition-all focus:border-blue-400/70">
            {languages.map((item) => <option key={item.monaco} value={item.monaco}>{item.label}</option>)}
          </select>
          <Button variant="outline" size="sm" className="rounded-full px-3"><Bell className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" onClick={copyRoomLink}>
            <Copy className="mr-2 h-4 w-4" /> Copy link
          </Button>
          <Button size="sm" onClick={runCode} disabled={runLoading}>
            <Play className="mr-2 h-4 w-4" />
            {runLoading ? "Running..." : "Run"}
          </Button>
        </div>
      </header>
      <section
        className="grid min-h-0 flex-1 gap-0 p-3 transition-all duration-300 lg:grid-cols-[var(--room-grid)]"
        style={{ "--room-grid": `${explorerOpen ? "300px" : "76px"} minmax(0,1fr) 360px` } as CSSProperties}
      >
        <aside className="glass-panel mr-3 hidden min-h-[calc(100vh-6rem)] rounded-lg p-3 lg:block">
          <div className="mb-4 flex items-center justify-between">
            {explorerOpen ? <h2 className="text-sm font-bold uppercase tracking-[0.22em] text-slate-400">Explorer</h2> : null}
            <Github className="h-4 w-4 text-slate-500" />
          </div>
          {explorerOpen ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Repositories</h3>
                  <Button variant="outline" size="sm" onClick={loadRepos} disabled={repoLoading}>
                    {repoLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Github className="mr-2 h-4 w-4" />}
                    {repoLoading ? "Loading" : "Load"}
                  </Button>
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input value={repoSearch} onChange={(event) => setRepoSearch(event.target.value)} placeholder="Search repos" className="pl-9" />
                </div>
                <div className="max-h-56 space-y-2 overflow-auto pr-1">
                  {repoLoading && repos.length === 0 ? (
                    <p className="rounded-md border border-slate-800/70 bg-slate-950/40 p-3 text-xs text-slate-500">
                      Loading...
                    </p>
                  ) : null}
                  {!repoLoading && repoError ? (
                    <p className="rounded-md border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-200">
                      {repoError}
                    </p>
                  ) : null}
                  {!repoLoading && filteredRepos.length === 0 ? (
                    <p className="rounded-md border border-slate-800/70 bg-slate-950/40 p-3 text-xs text-slate-500">
                      No repositories found.
                    </p>
                  ) : null}
                  {!repoLoading && filteredRepos.map((repo) => (
                    <button
                      key={repo.full_name}
                      type="button"
                      onClick={() => setSelectedRepo(repo.full_name)}
                      className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-all ${
                        selectedRepo === repo.full_name
                          ? "border-blue-400/60 bg-blue-500/10 text-blue-100"
                          : "border-slate-700/60 bg-slate-950/40 text-slate-300 hover:border-blue-400/40 hover:bg-blue-500/10"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold">{repo.full_name}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] ${
                          repo.private ? "bg-rose-500/10 text-rose-200" : "bg-emerald-500/10 text-emerald-200"
                        }`}>
                          {repo.private ? "private" : "public"}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {repo.updated_at ? `Updated ${new Date(repo.updated_at).toLocaleDateString()}` : "Updated recently"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Files</h3>
                  {fileLoading ? <span className="text-[10px] uppercase tracking-[0.2em] text-cyan-300">Loading</span> : null}
                </div>
                <div className="max-h-72 overflow-auto rounded-md border border-slate-800/70 bg-slate-950/40 p-2">
                  {treeLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <div key={index} className="shimmer h-6 rounded-md border border-slate-800/60 bg-slate-950/40" />
                      ))}
                    </div>
                  ) : null}
                  {!treeLoading && !selectedRepo ? (
                    <p className="p-2 text-xs text-slate-500">Select a repository to browse files.</p>
                  ) : null}
                  {!treeLoading && selectedRepo && treeRoot?.children?.length ? (
                    <div className="space-y-1">{renderNodes(treeRoot.children, 0)}</div>
                  ) : null}
                  {!treeLoading && selectedRepo && (!treeRoot || !treeRoot.children?.length) ? (
                    <p className="p-2 text-xs text-slate-500">No files found for this repository.</p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Commit</h3>
                <Input value={activeFilePath} readOnly placeholder="Select a file" />
                <Input value={commitMessage} onChange={(event) => setCommitMessage(event.target.value)} placeholder="Commit message" />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={commitFile}
                  disabled={!selectedRepo || !activeFilePath}
                  className="w-full"
                >
                  Commit changes
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              {[Github, FileCode2, Save, Bot].map((Icon, index) => (
                <div key={index} className="grid h-11 w-11 place-items-center rounded-md border border-slate-700/60 bg-slate-950/50 text-slate-400">
                  <Icon className="h-4 w-4" />
                </div>
              ))}
            </div>
          )}
        </aside>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="glow-border min-h-[calc(100vh-6rem)] overflow-hidden rounded-lg border border-slate-700/70 bg-[#0D1117] shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-rose-400" />
              <span className="h-3 w-3 rounded-full bg-amber-300" />
              <span className="h-3 w-3 rounded-full bg-emerald-400" />
              <span className="ml-3 rounded-full bg-blue-500/10 px-3 py-1 text-xs text-blue-200">{selectedLanguage.label}</span>
            </div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">autosave enabled</p>
          </div>
          <Editor
            height="calc(100% - 41px)"
            theme="vs-dark"
            language={language}
            value={code}
            onChange={changeCode}
            onMount={onMount}
            options={{ minimap: { enabled: false }, fontSize: 14, wordWrap: "on", automaticLayout: true, cursorSmoothCaretAnimation: "on" }}
          />
        </motion.div>
        <aside className="ml-3 hidden min-h-[calc(100vh-6rem)] flex-col gap-3 lg:flex">
          <div className="glass-panel rounded-lg p-4">
            <div className="mb-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={saveSnapshot}><Save className="mr-2 h-4 w-4" /> Snapshot</Button>
            </div>
            <Input value={stdin} onChange={(event) => setStdin(event.target.value)} placeholder="stdin" />
            <pre className="mt-3 max-h-48 overflow-auto rounded-md border border-slate-800 bg-black/40 p-3 text-xs leading-6 text-slate-300">{output}</pre>
          </div>
          <div className="glass-panel rounded-lg p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.22em] text-slate-400">Active crew</h2>
            <div className="space-y-2">
              {activeUsers.map((active) => (
                <div key={active.id} className="flex items-center gap-3 rounded-md bg-slate-950/40 px-3 py-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full shadow-[0_0_16px_currentColor]" style={{ background: active.color, color: active.color }} />
                  <span className="truncate">{active.name}</span>
                </div>
              ))}
              {activeUsers.length === 0 ? <div className="shimmer h-10 rounded-md bg-slate-900/70" /> : null}
            </div>
          </div>
          <div className="glass-panel flex min-h-[260px] flex-col rounded-lg p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-[0.22em] text-slate-400">Groq copilot</h2>
              {aiStreaming ? (
                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-xs text-cyan-200">
                  streaming
                </span>
              ) : null}
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-auto pr-1">
              {aiMessages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`rounded-md border p-3 text-sm leading-6 ${
                    message.role === "user"
                      ? "ml-8 border-blue-400/30 bg-blue-500/10 text-blue-50"
                      : "mr-8 border-violet-300/20 bg-slate-950/55 text-slate-200"
                  }`}
                >
                  <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                    {message.role === "user" ? "You" : "CodeOrbit AI"}
                  </p>
                  <p className="whitespace-pre-wrap">{message.content || "..."}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Input
                value={aiInput}
                onChange={(event) => setAiInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void askAssistant();
                  }
                }}
                placeholder="Ask about this code"
                disabled={aiStreaming}
              />
              <Button onClick={askAssistant} size="sm" disabled={aiStreaming}>
                <Bot className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function hashCode(value: string) {
  return value.split("").reduce((hash, char) => (hash << 5) - hash + char.charCodeAt(0), 0);
}
