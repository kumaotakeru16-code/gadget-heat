export const fmt = (n: number) => new Intl.NumberFormat("ja-JP").format(n);

export const signed = (n: number, opts: { fixed?: number } = {}): string => {
  const s = n > 0 ? "+" : n < 0 ? "" : "";
  return s + (opts.fixed != null ? n.toFixed(opts.fixed) : String(n));
};

export const arrowFor = (n: number) =>
  n > 0 ? "arrow-up" : n < 0 ? "arrow-down" : "arrow-flat";
