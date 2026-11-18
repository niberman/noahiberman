// Where the floating iNoah launcher does not appear: /inoah has the surface
// inline, and the app-shell routes have their own focus. Shared by the
// launcher itself and by the footer, which keeps its last line clear of the
// pill on phones wherever the pill shows.
const HIDDEN_PREFIXES = ["/inoah", "/dashboard", "/login", "/logo", "/openclaw"];

export const inoahLauncherHidden = (pathname: string) =>
  HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));
