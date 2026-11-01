import { useEffect, useRef } from 'react';
import { useOS } from './OSContext';

export function GlassFilters() {
  const { glassCurvature, glassWobble } = useOS();
  const dispRef = useRef<SVGFEDisplacementMapElement>(null);
  const turbRef = useRef<SVGFETurbulenceElement>(null);
  const lightRef = useRef<SVGFEPointLightElement>(null);
  const currentScaleRef = useRef(12.0);
  const targetScaleRef = useRef(12.0);

  const distortionScale = Math.round((glassCurvature / 100) * 48) + 8;
  const baseFreq = 0.016;

  useEffect(() => {
    let raf = 0;
    let lastX = window.innerWidth / 2;
    let lastY = window.innerHeight / 2;
    let lastTime = performance.now();
    const wobbleFactor = (glassWobble / 100) * 1.5;

    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      const dt = Math.max(1, now - lastTime);
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      const speed = Math.sqrt(dx * dx + dy * dy) / dt;

      // Dynamic liquid glass ripple expansion on velocity
      const dynamicScale = distortionScale + Math.min(speed * 32 * wobbleFactor, 24 * wobbleFactor);
      targetScaleRef.current = dynamicScale;

      if (lightRef.current) {
        lightRef.current.setAttribute('x', String(e.clientX));
        lightRef.current.setAttribute('y', String(e.clientY));
      }

      lastX = e.clientX;
      lastY = e.clientY;
      lastTime = now;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    const updateFilter = () => {
      currentScaleRef.current += (targetScaleRef.current - currentScaleRef.current) * 0.12;
      targetScaleRef.current += (distortionScale - targetScaleRef.current) * 0.04;

      if (dispRef.current) {
        dispRef.current.scale.baseVal = 0;
      }
      if (turbRef.current && currentScaleRef.current > distortionScale + 1) {
        const dynamicFreq = baseFreq + (currentScaleRef.current - distortionScale) * 0.0006;
        turbRef.current.setAttribute('baseFrequency', String(dynamicFreq.toFixed(4)));
      }

      raf = requestAnimationFrame(updateFilter);
    };

    raf = requestAnimationFrame(updateFilter);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, [distortionScale, glassWobble]);

  return (
    <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }} aria-hidden="true">
      <defs>
        {/* Dynamic SVG Liquid Glass Specular & Refraction Filter */}
        <filter id="glass-distortion" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feTurbulence ref={turbRef} type="fractalNoise" baseFrequency="0.016" numOctaves={2} result="noise" />
          <feDisplacementMap
            ref={dispRef}
            in="SourceGraphic"
            in2="noise"
            scale={0}
            xChannelSelector="R"
            yChannelSelector="G"
            result="displaced"
          />
          <feSpecularLighting
            in="displaced"
            surfaceScale="2.5"
            specularConstant="0.9"
            specularExponent="20"
            lightingColor="#ffffff"
            result="specLight"
          >
            <fePointLight ref={lightRef} x="300" y="300" z="90" />
          </feSpecularLighting>
          <feComposite in="displaced" in2="specLight" operator="arithmetic" k1="0" k2="1" k3="0.2" k4="0" />
        </filter>

        {/* Alias for liquid glass window lenses */}
        <filter id="liquid-glass-lens" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.014" numOctaves={2} result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale={0} xChannelSelector="R" yChannelSelector="G" result="displaced" />
          <feSpecularLighting in="displaced" surfaceScale="2" specularConstant="0.75" specularExponent="22" lightingColor="#ffffff" result="specLight">
            <fePointLight x="240" y="160" z="80" />
          </feSpecularLighting>
          <feComposite in="displaced" in2="specLight" operator="arithmetic" k1="0" k2="1" k3="0.22" k4="0" />
        </filter>

        {/* Taskbar & Dock Refraction Filter */}
        <filter id="frosted-dock" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.018" numOctaves={2} result="noise" />
          <feGaussianBlur in="noise" stdDeviation="1.5" result="blurred" />
          <feDisplacementMap in="SourceGraphic" in2="blurred" scale="0" xChannelSelector="R" yChannelSelector="G" />
        </filter>

        {/* Start Menu & Dialog Liquid Filter */}
        <filter id="frosted-menu" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.01 0.015" numOctaves={2} result="noise" />
          <feGaussianBlur in="noise" stdDeviation="1.5" result="blurred" />
          <feDisplacementMap in="SourceGraphic" in2="blurred" scale="10" xChannelSelector="R" yChannelSelector="G" />
        </filter>

        {/* Legacy compatibility alias */}
        <filter id="frosted" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves={2} result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}
