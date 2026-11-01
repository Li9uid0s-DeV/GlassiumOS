import { useEffect, useRef } from 'react';

/**
 * LiquidGlassFilter
 * Injects dynamic SVG displacement and turbulence filters into the DOM.
 * Listens to pointer movement and window dragging velocity to generate authentic
 * liquid refraction ripples across all glass surfaces.
 */
export function LiquidGlassFilter() {
  const turbRef = useRef<SVGFETurbulenceElement>(null);
  const dispRef = useRef<SVGFEDisplacementMapElement>(null);
  const lightRef = useRef<SVGFEPointLightElement>(null);

  useEffect(() => {
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let targetScale = 8;
    let currentScale = 8;
    let baseFreq = 0.015;
    let raf = 0;
    let lastMoveTime = Date.now();

    const handlePointerMove = (e: PointerEvent) => {
      const dx = e.movementX || 0;
      const dy = e.movementY || 0;
      const velocity = Math.min(30, Math.sqrt(dx * dx + dy * dy));
      mouseX = e.clientX;
      mouseY = e.clientY;
      targetScale = 8 + velocity * 0.9;
      lastMoveTime = Date.now();
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    const loop = () => {
      // Smoothly return scale to resting state when pointer stops
      if (Date.now() - lastMoveTime > 120) {
        targetScale = 8;
      }
      currentScale += (targetScale - currentScale) * 0.12;

      if (dispRef.current) {
        dispRef.current.scale.baseVal = 0;
      }
      if (lightRef.current) {
        lightRef.current.setAttribute('x', String(mouseX));
        lightRef.current.setAttribute('y', String(mouseY));
      }
      if (turbRef.current && currentScale > 8.5) {
        baseFreq = 0.015 + (currentScale - 8) * 0.0012;
        turbRef.current.setAttribute('baseFrequency', String(baseFreq.toFixed(4)));
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, []);

  return (
    <svg
      className="pointer-events-none fixed -top-[9999px] -left-[9999px] w-0 h-0 opacity-0 overflow-hidden"
      aria-hidden="true"
    >
      <defs>
        {/* Dynamic Liquid Glass Lens Filter */}
        <filter id="liquid-glass-lens" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feTurbulence
            ref={turbRef}
            type="fractalNoise"
            baseFrequency="0.015"
            numOctaves="2"
            result="noise"
          />
          <feDisplacementMap
            ref={dispRef}
            in="SourceGraphic"
            in2="noise"
            scale="0"
            xChannelSelector="R"
            yChannelSelector="G"
            result="displaced"
          />
          <feSpecularLighting
            in="displaced"
            surfaceScale="2"
            specularConstant="0.8"
            specularExponent="24"
            lightingColor="#ffffff"
            result="specLight"
          >
            <fePointLight ref={lightRef} x="200" y="200" z="80" />
          </feSpecularLighting>
          <feComposite in="displaced" in2="specLight" operator="arithmetic" k1="0" k2="1" k3="0.25" k4="0" />
        </filter>

        {/* Subtle Glass Surface Micro-refraction */}
        <filter id="liquid-glass-subtle" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="1" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}
