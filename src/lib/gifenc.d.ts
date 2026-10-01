declare module "gifenc" {
  export function GIFEncoder(opts?: Record<string, unknown>): {
    writeFrame(
      index: Uint8Array | number[],
      width: number,
      height: number,
      opts?: { palette?: number[][]; delay?: number; repeat?: number },
    ): void;
    finish(): void;
    bytes(): Uint8Array;
    reset(): void;
  };
  export function quantize(
    rgba: Uint8Array | number[],
    maxColors: number,
    opts?: Record<string, unknown>,
  ): number[][];
  export function applyPalette(
    rgba: Uint8Array | number[],
    palette: number[][],
    format?: "rgb444" | "rgb565" | "rgba4444",
  ): Uint8Array;
}
