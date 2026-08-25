import React from 'react';

interface VollenLogoProps {
  className?: string;
  size?: number;
}

export const VollenLogo: React.FC<VollenLogoProps> = ({
  className = '',
  size = 110,
}) => {
  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="filter drop-shadow-xl select-none"
      >
        <defs>
          {/* Gradiente de Fundo do Emblema Vibrante */}
          <linearGradient id="vollenBgGrad" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="50%" stopColor="#0369a1" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Gradiente da Borda Externa */}
          <linearGradient id="vollenBorderGrad" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>

          {/* Gradiente Primário da Asa Esquerda do V em Branco/Ciano Luminoso */}
          <linearGradient id="wingLeftGrad" x1="40" y1="40" x2="100" y2="160" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#e0f2fe" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>

          {/* Gradiente da Asa Direita do V em Verde Esmeralda Luminoso */}
          <linearGradient id="wingRightGrad" x1="160" y1="40" x2="100" y2="160" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          {/* Gradiente do Núcleo Central de Precisão */}
          <linearGradient id="coreGrad" x1="80" y1="70" x2="120" y2="110" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>

          {/* Brilho Suave */}
          <radialGradient id="glowEffect" cx="100" cy="100" r="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Glow de Fundo */}
        <circle cx="100" cy="100" r="80" fill="url(#glowEffect)" />

        {/* Escudo / Base Hexagonal Arredondada */}
        <rect
          x="16"
          y="16"
          width="168"
          height="168"
          rx="44"
          fill="url(#vollenBgGrad)"
          stroke="url(#vollenBorderGrad)"
          strokeWidth="3.5"
        />

        {/* Círculo Guia de Precisão Sutil */}
        <circle
          cx="100"
          cy="100"
          r="62"
          stroke="#334155"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          opacity="0.6"
        />

        {/* Asa Esquerda do "V" */}
        <path
          d="M 52 56 
             L 76 56 
             L 100 138 
             L 84 138 
             Z"
          fill="url(#wingLeftGrad)"
        />

        {/* Asa Direita do "V" com Corte Dinâmico */}
        <path
          d="M 148 56 
             L 124 56 
             L 100 138 
             L 116 138 
             Z"
          fill="url(#wingRightGrad)"
        />

        {/* Elemento de Precisão: Chave / Conector Superior Central */}
        <path
          d="M 100 46
             L 114 60
             L 100 74
             L 86 60
             Z"
          fill="url(#coreGrad)"
          opacity="0.9"
        />

        {/* Vértice Inferior Iluminado */}
        <circle
          cx="100"
          cy="146"
          r="6.5"
          fill="#38bdf8"
          stroke="#ffffff"
          strokeWidth="2"
        />

        {/* Detalhes de Dentes de Engrenagem Modernos no Topo */}
        <rect x="97" y="26" width="6" height="8" rx="2" fill="#38bdf8" opacity="0.8" />
        <rect x="97" y="166" width="6" height="8" rx="2" fill="#10b981" opacity="0.8" />
        <rect x="26" y="97" width="8" height="6" rx="2" fill="#38bdf8" opacity="0.8" />
        <rect x="166" y="97" width="8" height="6" rx="2" fill="#10b981" opacity="0.8" />
      </svg>
    </div>
  );
};
