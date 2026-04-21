const items = [
  "LIVE NOW",
  "1,284 PLAYERS ONLINE",
  "12 ROOMS ACTIVE",
  "FASTEST ANSWER 0.42s",
  "TODAY'S TOP SCORE 9,820",
  "NEW SEASON DROPS FRIDAY",
];

export const Ticker = () => (
  <div className="overflow-hidden border-y border-border bg-card/60 py-3">
    <div className="animate-ticker flex w-max gap-12 whitespace-nowrap font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
      {[...items, ...items, ...items, ...items].map((t, i) => (
        <span key={i} className="flex items-center gap-12">
          {t}
          <span className="text-primary">◆</span>
        </span>
      ))}
    </div>
  </div>
);
