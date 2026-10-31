// IconVault v56 - ambient types for the Vanta effect bundles used ONLY by
// the /animated-backgrounds demo page. Vanta (MIT, tengbao/vanta) ships no
// TypeScript declarations, and three.js is passed in through options, so
// each effect bundle is typed here as a factory with the options this demo
// actually uses. No other page imports these modules.

type VantaEffectInstance = {
  destroy: () => void;
};

type VantaEffectFactory = (options: {
  el: HTMLElement;
  THREE: typeof import("three");
  mouseControls?: boolean;
  touchControls?: boolean;
  gyroControls?: boolean;
  minHeight?: number;
  minWidth?: number;
  scale?: number;
  scaleMobile?: number;
  // Waves options
  color?: number;
  shininess?: number;
  waveHeight?: number;
  waveSpeed?: number;
  zoom?: number;
  // Birds options
  backgroundColor?: number;
  backgroundAlpha?: number;
  color1?: number;
  color2?: number;
  birdSize?: number;
  wingSpan?: number;
  speedLimit?: number;
  separation?: number;
  alignment?: number;
  cohesion?: number;
  quantity?: number;
  // Fog options
  highlightColor?: number;
  midtoneColor?: number;
  lowlightColor?: number;
  baseColor?: number;
  blurFactor?: number;
  speed?: number;
}) => VantaEffectInstance;

declare module "vanta/dist/vanta.waves.min" {
  const factory: VantaEffectFactory;
  export default factory;
}

declare module "vanta/dist/vanta.birds.min" {
  const factory: VantaEffectFactory;
  export default factory;
}

declare module "vanta/dist/vanta.fog.min" {
  const factory: VantaEffectFactory;
  export default factory;
}
