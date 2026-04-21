export const Logo = ({ className = "" }: { className?: string }) => (
  <div className={`inline-flex items-center gap-2 ${className}`}>
    <div className="relative h-9 w-9">
      <div className="absolute inset-0 rotate-3 rounded-lg bg-gradient-hero shadow-glow" />
      <div className="absolute inset-0 grid place-items-center font-display text-lg font-bold text-primary-foreground">
        Q
      </div>
    </div>
    <span className="font-display text-xl font-bold tracking-tight">
      Quiz<span className="text-primary">Arena</span>
    </span>
  </div>
);
