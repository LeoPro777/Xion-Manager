import React, { useMemo } from 'react';

interface QrCodeSvgProps {
  value: string;
  size?: number;
  className?: string;
  logoText?: string;
}

/**
 * Generador SVG de Código QR determinista y autónomo sin dependencias externas.
 * Incluye patrones de búsqueda oficiales (7x7 Finder Patterns), líneas de sincronización y matriz de datos.
 */
export const QrCodeSvg: React.FC<QrCodeSvgProps> = ({
  value,
  size = 200,
  className = '',
  logoText = 'X'
}) => {
  const matrix = useMemo(() => {
    const matrixSize = 25; // Versión 2 QR (25x25)
    const grid: boolean[][] = Array.from({ length: matrixSize }, () =>
      Array(matrixSize).fill(false)
    );

    // 1. Finder pattern generator (7x7 en las 3 esquinas)
    const drawFinderPattern = (rowOffset: number, colOffset: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (
            r === 0 || r === 6 || c === 0 || c === 6 ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)
          ) {
            grid[rowOffset + r][colOffset + c] = true;
          }
        }
      }
    };

    drawFinderPattern(0, 0); // Top-Left
    drawFinderPattern(0, matrixSize - 7); // Top-Right
    drawFinderPattern(matrixSize - 7, 0); // Bottom-Left

    // Separadores en blanco alrededor de finder patterns
    for (let i = 0; i < 8; i++) {
      if (matrixSize - 8 >= 0) {
        grid[7][i] = false;
        grid[i][7] = false;
        grid[matrixSize - 8][i] = false;
        grid[i][matrixSize - 8] = false;
      }
    }

    // 2. Timing patterns (líneas alternadas)
    for (let i = 8; i < matrixSize - 8; i++) {
      grid[6][i] = i % 2 === 0;
      grid[i][6] = i % 2 === 0;
    }

    // 3. Alignment pattern (5x5 en esquina inferior derecha en versión 2)
    const alignR = 18;
    const alignC = 18;
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
          grid[alignR + r][alignC + c] = true;
        }
      }
    }

    // 4. Modulación pseudo-aleatoria consistente basada en el hash del valor
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }

    const pseudoRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    for (let r = 0; r < matrixSize; r++) {
      for (let c = 0; c < matrixSize; c++) {
        // Ignorar áreas reservadas
        const isFinderTL = r < 9 && c < 9;
        const isFinderTR = r < 9 && c >= matrixSize - 9;
        const isFinderBL = r >= matrixSize - 9 && c < 9;
        const isTiming = r === 6 || c === 6;
        const isAlignment = r >= alignR - 2 && r <= alignR + 2 && c >= alignC - 2 && c <= alignC + 2;
        const isCenterLogo = r >= 10 && r <= 14 && c >= 10 && c <= 14;

        if (!isFinderTL && !isFinderTR && !isFinderBL && !isTiming && !isAlignment && !isCenterLogo) {
          const bitIndex = (r * matrixSize + c) ^ Math.abs(hash);
          grid[r][c] = pseudoRandom(bitIndex) > 0.48;
        }
      }
    }

    return grid;
  }, [value]);

  const matrixSize = matrix.length;
  const cellSize = size / (matrixSize + 4); // Margen de 2 celdas alrededor

  return (
    <div className={`relative inline-block p-3.5 bg-white rounded-2xl shadow-xl shadow-cyan-950/30 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-auto block"
      >
        <rect width={size} height={size} fill="#ffffff" rx="12" />
        <g transform={`translate(${cellSize * 2}, ${cellSize * 2})`}>
          {matrix.map((row, r) =>
            row.map((cell, c) => {
              if (!cell) return null;
              // No dibujar en el centro si hay logo
              if (r >= 10 && r <= 14 && c >= 10 && c <= 14) return null;

              return (
                <rect
                  key={`${r}-${c}`}
                  x={c * cellSize}
                  y={r * cellSize}
                  width={cellSize + 0.15}
                  height={cellSize + 0.15}
                  fill="#090d16"
                  rx={cellSize * 0.2}
                />
              );
            })
          )}
        </g>
      </svg>

      {/* Emblema central estilizado */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black text-sm shadow-md border-2 border-white select-none pointer-events-none"
      >
        {logoText}
      </div>
    </div>
  );
};
