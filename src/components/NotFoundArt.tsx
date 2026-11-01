import IllustrationArt from "@/components/IllustrationArt";
import { getIllustration } from "@/lib/illustrations-data";

// 404-only art, split out of __root so the entry chunk does not carry
// IllustrationArt + illustrations-data on every page. Lazy-imported by
// __root; the fallback there preserves this block's layout while it loads.
export default function NotFoundArt() {
  return (
    <IllustrationArt
      entry={getIllustration("flowbite", "laptop-404-not-found-error")}
      color="#0d7a68"
      className="mx-auto mt-7 h-32 w-full max-w-xs sm:h-40 sm:max-w-sm"
      title="Illustration of a laptop showing a 404 error"
    />
  );
}
