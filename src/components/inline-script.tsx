/**
 * Inline script sesuai pola resmi Next 16 (docs:
 * guides/preventing-flash-before-hydration → "Extracting a reusable
 * component").
 *
 * React memperingatkan setiap <script> yang di-render sebagai komponen
 * ("Encountered a script tag while rendering"). Triknya: saat SSR kita
 * render type="text/javascript" (dieksekusi browser saat parse HTML),
 * lalu saat hidrasi client kita render type="text/plain" — React hanya
 * membandingkan prop, warning hilang, dan DOM asli tidak diubah karena
 * suppressHydrationWarning. Script tetap hanya jalan sekali di hard
 * navigation, persis seperti semula.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
