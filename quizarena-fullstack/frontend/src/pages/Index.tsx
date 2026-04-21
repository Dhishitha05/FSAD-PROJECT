import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";
import { Ticker } from "@/components/Ticker";
import { getSocket, Player, Question, RoundResult, GameOver } from "@/lib/socket";
import { toast } from "sonner";

type View = "home" | "lobby" | "playing" | "round-result" | "gameover";

type Lobby = { code: string; isPublic: boolean; players: Player[]; hostId: string };

const Index = () => {
  const [view, setView] = useState<View>("home");
  const [nickname, setNickname] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [me, setMe] = useState<Player | null>(null);
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [finalBoard, setFinalBoard] = useState<Player[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const s = getSocket();
    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));
    s.on("lobby:update", (l: Lobby) => setLobby(l));
    s.on("game:question", (q: Question) => {
      setQuestion(q);
      setPicked(null);
      setRoundResult(null);
      setView("playing");
    });
    s.on("game:round-result", (r: RoundResult) => {
      setRoundResult(r);
      setView("round-result");
    });
    s.on("game:over", (g: GameOver) => {
      setFinalBoard(g.leaderboard);
      setView("gameover");
    });
    s.on("error:msg", (m: string) => toast.error(m));
    return () => {
      s.off("connect"); s.off("disconnect");
      s.off("lobby:update"); s.off("game:question");
      s.off("game:round-result"); s.off("game:over"); s.off("error:msg");
    };
  }, []);

  // Synchronized countdown
  useEffect(() => {
    if (view !== "playing" || !question) return;
    const tick = () => {
      const remaining = Math.max(0, question.startedAt + question.durationMs - Date.now());
      setSecondsLeft(Math.ceil(remaining / 1000));
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [view, question]);

  const join = (mode: "code" | "public") => {
    if (!nickname.trim()) return toast.error("Enter a nickname first");
    const s = getSocket();
    s.emit(
      mode === "code" ? "lobby:join-code" : "lobby:join-public",
      { nickname: nickname.trim(), code: joinCode.trim().toUpperCase() || undefined },
      (resp: { ok: boolean; player?: Player; lobby?: Lobby; error?: string }) => {
        if (!resp.ok) return toast.error(resp.error ?? "Join failed");
        setMe(resp.player!);
        setLobby(resp.lobby!);
        setView("lobby");
      },
    );
  };

  const ready = () => getSocket().emit("lobby:ready");
  const answer = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    getSocket().emit("game:answer", { choice: i });
  };
  const leave = () => {
    getSocket().emit("lobby:leave");
    setLobby(null); setMe(null); setView("home");
  };

  return (
    <main className="min-h-screen">
      <header className="container flex items-center justify-between py-6">
        <Logo />
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          <span className={`h-2 w-2 rounded-full ${connected ? "bg-primary animate-pulse-ring" : "bg-destructive"}`} />
          {connected ? "Connected" : "Offline"}
        </div>
      </header>

      {view === "home" && (
        <Home nickname={nickname} setNickname={setNickname} joinCode={joinCode} setJoinCode={setJoinCode} onJoin={join} />
      )}
      {view === "lobby" && lobby && me && (
        <Lobby lobby={lobby} me={me} onReady={ready} onLeave={leave} />
      )}
      {view === "playing" && question && (
        <Play question={question} picked={picked} secondsLeft={secondsLeft} onAnswer={answer} />
      )}
      {view === "round-result" && roundResult && (
        <RoundResultView result={roundResult} meId={me?.id} />
      )}
      {view === "gameover" && (
        <GameOverView leaderboard={finalBoard} meId={me?.id} onPlayAgain={leave} />
      )}
    </main>
  );
};

/* ---------------- Subviews ---------------- */

const Home = ({ nickname, setNickname, joinCode, setJoinCode, onJoin }: any) => (
  <>
    <section className="container grid gap-12 py-10 md:grid-cols-[1.2fr_1fr] md:py-16">
      <div className="animate-float-in">
        <p className="font-mono text-xs uppercase tracking-[0.4em] text-primary">Real-time · Multiplayer · Live</p>
        <h1 className="mt-4 font-display text-5xl font-bold leading-[0.95] md:text-7xl">
          Think fast.<br />
          <span className="text-stroke">Score</span> faster.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Synchronized timers, instant scoring, head-to-head leaderboards.
          Drop in with a room code or get matched in a public lobby.
        </p>

        <div className="mt-8 grid max-w-xl gap-4 rounded-2xl bg-gradient-card p-6 shadow-elevated">
          <div>
            <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Your nickname</label>
            <Input
              value={nickname}
              maxLength={16}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. NeonFox"
              className="mt-2 h-12 border-border bg-input font-display text-lg"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Input
              value={joinCode}
              maxLength={6}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ROOM CODE"
              className="h-12 border-border bg-input text-center font-mono text-lg tracking-[0.5em]"
            />
            <Button onClick={() => onJoin("code")} size="lg" className="h-12 bg-primary font-display text-base text-primary-foreground hover:bg-primary/90">
              Join Room →
            </Button>
          </div>
          <div className="relative my-1 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          <Button onClick={() => onJoin("public")} variant="outline" size="lg" className="h-12 border-secondary bg-secondary/10 font-display text-base text-secondary hover:bg-secondary/20">
            ⚡ Quick Match — Join Public Lobby
          </Button>
        </div>
      </div>

      <aside className="relative">
        <div className="sticky top-8 space-y-4">
          <FeatureCard num="01" title="Live broadcast" body="Questions push to every device in the same millisecond over WebSocket." />
          <FeatureCard num="02" title="Synced timers" body="Countdown is server-anchored — no one gets a head start." accent />
          <FeatureCard num="03" title="Live leaderboard" body="Scores update the instant the round ends. Watch the rankings flip." />
        </div>
      </aside>
    </section>
    <Ticker />
  </>
);

const FeatureCard = ({ num, title, body, accent }: { num: string; title: string; body: string; accent?: boolean }) => (
  <div className={`rounded-2xl border border-border bg-gradient-card p-6 ${accent ? "shadow-glow" : ""}`}>
    <div className="flex items-baseline gap-3">
      <span className="font-mono text-xs text-primary">{num}</span>
      <h3 className="font-display text-xl font-bold">{title}</h3>
    </div>
    <p className="mt-2 text-sm text-muted-foreground">{body}</p>
  </div>
);

const Lobby = ({ lobby, me, onReady, onLeave }: { lobby: Lobby; me: Player; onReady: () => void; onLeave: () => void }) => {
  const meInLobby = lobby.players.find(p => p.id === me.id);
  return (
    <section className="container py-10 animate-float-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.4em] text-muted-foreground">Lobby · {lobby.isPublic ? "Public match" : "Private room"}</p>
          <h2 className="mt-2 font-display text-4xl font-bold md:text-5xl">
            Code <span className="font-mono text-primary">{lobby.code}</span>
          </h2>
        </div>
        <Button variant="ghost" onClick={onLeave} className="text-muted-foreground">← Leave</Button>
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-2">
        {lobby.players.map(p => (
          <div key={p.id} className={`flex items-center justify-between rounded-2xl border bg-gradient-card p-4 ${p.id === me.id ? "border-primary shadow-glow" : "border-border"}`}>
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-secondary/30 font-display font-bold text-secondary">
                {p.nickname.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-display font-semibold">{p.nickname}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {p.id === lobby.hostId ? "HOST" : "PLAYER"}
                </p>
              </div>
            </div>
            <span className="font-mono text-sm text-primary">●</span>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-col items-center gap-3">
        <Button onClick={onReady} size="lg" className="h-14 w-full max-w-md bg-primary font-display text-lg text-primary-foreground hover:bg-primary/90">
          {me.id === lobby.hostId ? "Start Match →" : "I'm Ready"}
        </Button>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {meInLobby ? `${lobby.players.length} player${lobby.players.length === 1 ? "" : "s"} in lobby` : ""}
        </p>
      </div>
    </section>
  );
};

const Play = ({ question, picked, secondsLeft, onAnswer }: { question: Question; picked: number | null; secondsLeft: number; onAnswer: (i: number) => void }) => {
  const colors = ["bg-primary text-primary-foreground", "bg-secondary text-secondary-foreground", "bg-accent text-accent-foreground", "bg-destructive text-destructive-foreground"];
  return (
    <section className="container py-8 animate-float-in">
      <div className="flex items-center justify-between font-mono text-xs uppercase tracking-widest text-muted-foreground">
        <span>Question {question.index + 1} / {question.total}</span>
        <span className={`text-2xl font-bold tabular-nums ${secondsLeft <= 5 ? "text-destructive" : "text-primary"}`}>
          {secondsLeft}s
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-100"
          style={{ width: `${Math.max(0, (secondsLeft * 1000) / question.durationMs * 100)}%` }}
        />
      </div>

      <h2 className="mt-10 font-display text-3xl font-bold leading-tight md:text-5xl">
        {question.prompt}
      </h2>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {question.choices.map((c, i) => {
          const isPicked = picked === i;
          const dim = picked !== null && !isPicked;
          return (
            <button
              key={i}
              disabled={picked !== null}
              onClick={() => onAnswer(i)}
              className={`group relative overflow-hidden rounded-2xl border-2 border-transparent p-6 text-left font-display text-xl transition-all
                ${colors[i]} ${dim ? "opacity-30" : "hover:scale-[1.02]"} ${isPicked ? "ring-4 ring-foreground" : ""}`}
            >
              <span className="font-mono text-xs uppercase tracking-widest opacity-60">{String.fromCharCode(65 + i)}</span>
              <p className="mt-2">{c}</p>
            </button>
          );
        })}
      </div>

      {picked !== null && (
        <p className="mt-8 text-center font-mono text-sm uppercase tracking-widest text-muted-foreground">
          Locked in · waiting for other players…
        </p>
      )}
    </section>
  );
};

const RoundResultView = ({ result, meId }: { result: RoundResult; meId?: string }) => (
  <section className="container py-10 animate-float-in">
    <p className="font-mono text-xs uppercase tracking-[0.4em] text-primary">Round result</p>
    <h2 className="mt-3 font-display text-4xl font-bold">
      Correct answer was <span className="text-primary">{String.fromCharCode(65 + result.correctIndex)}</span>
    </h2>
    <Leaderboard players={result.leaderboard} meId={meId} />
    <p className="mt-8 text-center font-mono text-sm uppercase tracking-widest text-muted-foreground">
      Next question incoming…
    </p>
  </section>
);

const GameOverView = ({ leaderboard, meId, onPlayAgain }: { leaderboard: Player[]; meId?: string; onPlayAgain: () => void }) => (
  <section className="container py-12 animate-float-in">
    <p className="font-mono text-xs uppercase tracking-[0.4em] text-secondary">Game over</p>
    <h2 className="mt-3 font-display text-5xl font-bold md:text-7xl">Final Standings</h2>
    <Leaderboard players={leaderboard} meId={meId} podium />
    <div className="mt-10 text-center">
      <Button onClick={onPlayAgain} size="lg" className="h-14 bg-primary px-8 font-display text-lg text-primary-foreground">
        Play again →
      </Button>
    </div>
  </section>
);

const Leaderboard = ({ players, meId, podium }: { players: Player[]; meId?: string; podium?: boolean }) => (
  <ol className="mt-8 space-y-2">
    {players.map((p, i) => {
      const isMe = p.id === meId;
      const medal = podium && i < 3 ? ["🥇", "🥈", "🥉"][i] : null;
      return (
        <li
          key={p.id}
          className={`flex items-center justify-between rounded-xl border bg-gradient-card p-4 transition-all
            ${isMe ? "border-primary shadow-glow" : "border-border"} ${podium && i === 0 ? "scale-[1.02] bg-stripes" : ""}`}
        >
          <div className="flex items-center gap-4">
            <span className="w-8 font-mono text-lg text-muted-foreground">{medal ?? `#${i + 1}`}</span>
            <span className="font-display text-lg font-semibold">{p.nickname}{isMe && <span className="ml-2 font-mono text-xs text-primary">YOU</span>}</span>
          </div>
          <span className="font-mono text-xl font-bold tabular-nums text-primary">{p.score}</span>
        </li>
      );
    })}
  </ol>
);

export default Index;
