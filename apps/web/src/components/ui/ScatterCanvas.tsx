'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

interface DotData {
  w: number;
  h: number;
  dots: [number, number, number, number, number, number, number][]; // [x_ratio, y_ratio, radius, r, g, b, alpha]
}

const VS_SOURCE = `
attribute vec2 a_position;
attribute float a_size;
attribute vec4 a_color;

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_radius;
uniform float u_strength; // 0.0 (resting) to 1.0 (full dent depth)

varying vec4 v_color;

void main() {
  vec2 pos = a_position;
  float size = a_size;
  vec4 color = a_color;

  float d = distance(pos, u_mouse);

  if (d < u_radius && u_strength > 0.001) {
    float s = d / u_radius;
    float oneMinusS = 1.0 - s;

    // Smooth hermite depth dome: 1.0 at center, smoothly tapers to 0.0 at rim
    float depth = oneMinusS * oneMinusS * (1.0 + 2.0 * s) * u_strength;

    // 1. Surrounding dots make space with each other (spacing dilates ~25%)
    // At d=0, push is 0.0, so dots at the center do not move away (no blank hole)
    if (d > 0.01) {
      vec2 dir = (pos - u_mouse) / d;
      float push = d * (oneMinusS * oneMinusS) * 0.25 * u_strength;
      pos += dir * push;
    }

    // 2. 3D depth perspective: dots inside the dent are deeper in 3D, appearing subtly smaller
    size *= (1.0 - 0.22 * depth);

    // 3. 3D depth shading: natural ambient occlusion inside the circular dent
    color.rgb *= (1.0 - 0.16 * depth);
  }

  vec2 zeroToOne = pos / u_resolution;
  vec2 zeroToTwo = zeroToOne * 2.0;
  vec2 clipSpace = zeroToTwo - 1.0;
  gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);
  gl_PointSize = size;
  v_color = color;
}
`;

const FS_SOURCE = `
precision mediump float;
varying vec4 v_color;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  if (dist > 0.5) {
    discard;
  }
  float edge = 0.08;
  float alpha = smoothstep(0.5, 0.5 - edge, dist) * v_color.a;
  gl_FragColor = vec4(v_color.rgb, alpha);
}
`;

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext, vs: WebGLShader, fs: WebGLShader) {
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

export interface ScatterCanvasProps {
  dotsUrl: string;
  fallbackSrc: string;
  alt: string;
  width: number;
  height: number;
  rotationDeg?: number;
  flipH?: boolean;
  containerClassName?: string;
  imgClassName?: string;
  opacityClass?: string;
  priority?: boolean;
  craterRadius?: number;
}

export function ScatterCanvas({
  dotsUrl,
  fallbackSrc,
  alt,
  width,
  height,
  rotationDeg = 0,
  flipH = false,
  containerClassName = '',
  imgClassName = 'object-contain object-right',
  opacityClass = 'opacity-70',
  priority = false,
  craterRadius = 120,
}: ScatterCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isReady, setIsReady] = useState(false);

  const CANVAS_W = width;
  const CANVAS_H = height;

  useEffect(() => {
    // Disable on touch-only devices to save battery and preserve natural touch scrolling
    if (typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
    });
    if (!gl) return;

    let animId: number | null = null;
    let isDestroyed = false;

    fetch(dotsUrl)
      .then((res) => res.json())
      .then((data: DotData) => {
        if (isDestroyed || !canvasRef.current) return;

        const dots = data.dots;
        const count = dots.length;

        const vs = createShader(gl, gl.VERTEX_SHADER, VS_SOURCE);
        const fs = createShader(gl, gl.FRAGMENT_SHADER, FS_SOURCE);
        if (!vs || !fs) return;

        const program = createProgram(gl, vs, fs);
        if (!program) return;

        gl.useProgram(program);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        const aPosLoc = gl.getAttribLocation(program, 'a_position');
        const aSizeLoc = gl.getAttribLocation(program, 'a_size');
        const aColorLoc = gl.getAttribLocation(program, 'a_color');
        const uResLoc = gl.getUniformLocation(program, 'u_resolution');
        const uMouseLoc = gl.getUniformLocation(program, 'u_mouse');
        const uRadiusLoc = gl.getUniformLocation(program, 'u_radius');
        const uStrengthLoc = gl.getUniformLocation(program, 'u_strength');

        gl.uniform2f(uResLoc, CANVAS_W, CANVAS_H);

        const posBufferData = new Float32Array(count * 2);
        const sizeBufferData = new Float32Array(count);
        const colorBufferData = new Float32Array(count * 4);

        for (let i = 0; i < count; i++) {
          const d = dots[i];
          if (!d) continue;

          const ox = d[0] * CANVAS_W;
          const oy = d[1] * CANVAS_H;
          const radius = d[2];
          const r = d[3] / 255.0;
          const g = d[4] / 255.0;
          const b = d[5] / 255.0;
          const a = d[6];

          posBufferData[i * 2] = ox;
          posBufferData[i * 2 + 1] = oy;

          // Adjust point size based on data density
          sizeBufferData[i] = radius < 1.5 ? radius * 3.8 : radius * 1.85;

          colorBufferData[i * 4] = r;
          colorBufferData[i * 4 + 1] = g;
          colorBufferData[i * 4 + 2] = b;
          colorBufferData[i * 4 + 3] = a;
        }

        const sizeBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, sizeBufferData, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(aSizeLoc);
        gl.vertexAttribPointer(aSizeLoc, 1, gl.FLOAT, false, 0, 0);

        const colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, colorBufferData, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(aColorLoc);
        gl.vertexAttribPointer(aColorLoc, 4, gl.FLOAT, false, 0, 0);

        const posBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, posBufferData, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(aPosLoc);
        gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0);

        gl.viewport(0, 0, CANVAS_W, CANVAS_H);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.POINTS, 0, count);

        setIsReady(true);

        const mouse = {
          x: -9999,
          y: -9999,
          active: false,
        };

        const bufferScale = CANVAS_W / 1536.0;
        const R = craterRadius * bufferScale;

        let currentMouseX = -9999;
        let currentMouseY = -9999;
        let currentStrength = 0.0;
        let isSleeping = false;

        const updateAndRender = () => {
          if (isDestroyed) return;

          const targetStrength = mouse.active ? 1.0 : 0.0;
          const diffStrength = targetStrength - currentStrength;
          currentStrength += diffStrength * 0.14;

          if (mouse.active) {
            currentMouseX += (mouse.x - currentMouseX) * 0.20;
            currentMouseY += (mouse.y - currentMouseY) * 0.20;
          }

          gl.uniform2f(uMouseLoc, currentMouseX, currentMouseY);
          gl.uniform1f(uRadiusLoc, R);
          gl.uniform1f(uStrengthLoc, currentStrength);

          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.drawArrays(gl.POINTS, 0, count);

          const isMoving =
            Math.abs(diffStrength) > 0.002 ||
            (mouse.active &&
              (Math.abs(mouse.x - currentMouseX) > 0.1 ||
                Math.abs(mouse.y - currentMouseY) > 0.1)) ||
            currentStrength > 0.002;

          if (!isMoving) {
            isSleeping = true;
            animId = null;
            return;
          }

          animId = requestAnimationFrame(updateAndRender);
        };

        const wakeUp = () => {
          if (isSleeping) {
            isSleeping = false;
            animId = requestAnimationFrame(updateAndRender);
          }
        };

        const interactionZone =
          canvas.closest('section') ||
          canvas.closest('footer') ||
          canvas.closest('header') ||
          canvas.parentElement;

        const handleMouseMove = (e: MouseEvent) => {
          if (!canvasRef.current) return;
          const rect = canvasRef.current.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;

          const dx = e.clientX - cx;
          const dy = e.clientY - cy;

          const rad = -rotationDeg * (Math.PI / 180);
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);

          const unrotX = dx * cos - dy * sin;
          const unrotY = dx * sin + dy * cos;

          const W = canvasRef.current.clientWidth;
          const H = canvasRef.current.clientHeight;

          if (!W || !H) return;

          const adjustedUnrotX = flipH ? -unrotX : unrotX;
          const localX = adjustedUnrotX + W / 2;
          const localY = unrotY + H / 2;

          const mx = (localX / W) * CANVAS_W;
          const my = (localY / H) * CANVAS_H;

          if (!mouse.active) {
            currentMouseX = mx;
            currentMouseY = my;
          }

          mouse.x = mx;
          mouse.y = my;
          mouse.active = true;

          wakeUp();
        };

        const handleMouseLeave = () => {
          mouse.active = false;
          wakeUp();
        };

        if (interactionZone) {
          interactionZone.addEventListener('mousemove', handleMouseMove as EventListener);
          interactionZone.addEventListener('mouseleave', handleMouseLeave as EventListener);
        } else {
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseleave', handleMouseLeave);
        }
        window.addEventListener('blur', handleMouseLeave);

        animId = requestAnimationFrame(updateAndRender);

        return () => {
          isDestroyed = true;
          if (animId) cancelAnimationFrame(animId);
          if (interactionZone) {
            interactionZone.removeEventListener('mousemove', handleMouseMove as EventListener);
            interactionZone.removeEventListener('mouseleave', handleMouseLeave as EventListener);
          } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
          }
          window.removeEventListener('blur', handleMouseLeave);
        };
      })
      .catch((err) => {
        console.error(`Failed to load dots from ${dotsUrl}:`, err);
      });

    return () => {
      isDestroyed = true;
      if (animId) cancelAnimationFrame(animId);
    };
  }, [dotsUrl, CANVAS_W, CANVAS_H, rotationDeg, flipH, craterRadius]);

  return (
    <div className={`relative select-none ${containerClassName}`}>
      {/* Static Fallback Image */}
      <Image
        src={fallbackSrc}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={`w-full h-auto select-none transition-opacity duration-500 ${imgClassName} ${
          isReady ? 'opacity-0 pointer-events-none' : opacityClass
        }`}
      />

      {/* Interactive WebGL Dot Matrix Canvas */}
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className={`absolute inset-0 w-full h-full select-none pointer-events-none transition-opacity duration-500 ${imgClassName} ${
          isReady ? opacityClass : 'opacity-0'
        }`}
      />
    </div>
  );
}
