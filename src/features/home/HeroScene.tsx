import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import './HeroScene.css'

/**
 * Hero scene for the landing page — port of design/Wasteland Queen Scene.html.
 *
 * Layered composition:
 *   1. blurred queen-scene.webp as full-bleed backdrop + warm haze
 *   2. four animated zeppelins drifting horizontally with vertical bob
 *   3. the same image, sharp, masked to an ellipse so only the central
 *      figure column shows through
 *   4. title plate at the bottom with subtle navigation links
 *   5. vignette + floating dust
 *
 * CSS is intentionally kept verbatim from the design HTML (with .hero-scene
 * scoping) so the visual fidelity can be diffed against the prototype 1-to-1.
 */
export function HeroScene() {
  const { t } = useTranslation()
  return (
    <div className="hero-scene" data-screen-label="01 Hero">
      {/* Backdrop */}
      <div className="bg" aria-hidden="true" />
      <div className="haze" aria-hidden="true" />

      {/* Floating dust/embers in middle distance */}
      <div className="dust" aria-hidden="true" />

      {/* Mid-distance zeppelins */}
      <div className="sky" aria-hidden="true">
        <div className="zep z1">
          <Zeppelin1 />
        </div>
        <div className="zep z2">
          <Zeppelin2 />
        </div>
        <div className="zep z3">
          <Zeppelin3 />
        </div>
        <div className="zep z4">
          <Zeppelin4 />
        </div>
      </div>

      {/* Soft contact shadow under the figure */}
      <div className="ground" aria-hidden="true" />

      {/* Sharp figure cut-out from the source image */}
      <div className="figureWrap">
        <div
          className="figure"
          role="img"
          aria-label={t('home.figure_aria_label')}
        />
      </div>

      {/* Title plate with navigation */}
      <div className="plate">
        <div className="eyebrow">{t('home.eyebrow')}</div>
        <h1>
          <b>Wasteland</b> Queen
        </h1>
        <div className="nav">
          <hr className="rule" aria-hidden="true" />
          <div className="nav-links">
            <Link to="/plan/new">{t('home.nav_signups')}</Link>
            <Link to="/plan">{t('home.nav_planner')}</Link>
            <Link to="/cheat-sheet">{t('home.nav_cheatsheet')}</Link>
          </div>
          <hr className="rule" aria-hidden="true" />
        </div>
      </div>

      {/* Vignette */}
      <div className="vignette" aria-hidden="true" />
    </div>
  )
}

/* ──────── Zeppelin SVGs (verbatim from design) ──────── */

function Zeppelin1() {
  return (
    <svg className="bob" viewBox="0 0 360 140" width="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hero-hull1" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#f2e6d0" />
          <stop offset="0.55" stopColor="#d8c39e" />
          <stop offset="1" stopColor="#8e7144" />
        </linearGradient>
        <linearGradient id="hero-gond1" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#7a5a30" />
          <stop offset="1" stopColor="#3b2812" />
        </linearGradient>
      </defs>
      <ellipse
        cx="180"
        cy="55"
        rx="160"
        ry="40"
        fill="url(#hero-hull1)"
        stroke="#6b4f29"
        strokeWidth="1.2"
      />
      <path d="M40 55 Q180 28 320 55" fill="none" stroke="rgba(60,40,15,0.35)" strokeWidth="1" />
      <path d="M40 55 Q180 82 320 55" fill="none" stroke="rgba(60,40,15,0.35)" strokeWidth="1" />
      <line x1="120" y1="22" x2="120" y2="88" stroke="rgba(60,40,15,0.3)" strokeWidth="0.8" />
      <line x1="180" y1="16" x2="180" y2="94" stroke="rgba(60,40,15,0.3)" strokeWidth="0.8" />
      <line x1="240" y1="22" x2="240" y2="88" stroke="rgba(60,40,15,0.3)" strokeWidth="0.8" />
      <ellipse cx="36" cy="55" rx="10" ry="14" fill="#6b4f29" />
      <path d="M325 55 L355 30 L348 55 L355 80 Z" fill="#6b4f29" />
      <path
        d="M120 92 L155 110 M180 95 L180 112 M240 92 L210 110"
        stroke="#3b2812"
        strokeWidth="1"
      />
      <path
        d="M140 108 Q180 130 220 108 L210 100 L150 100 Z"
        fill="url(#hero-gond1)"
        stroke="#2a1c0a"
        strokeWidth="1"
      />
      <circle cx="165" cy="111" r="2.6" fill="#fff3d6" stroke="#3b2812" strokeWidth="0.6" />
      <circle cx="180" cy="113" r="2.6" fill="#fff3d6" stroke="#3b2812" strokeWidth="0.6" />
      <circle cx="195" cy="111" r="2.6" fill="#fff3d6" stroke="#3b2812" strokeWidth="0.6" />
      <circle cx="356" cy="55" r="3" fill="#3b2812" />
      <path d="M356 40 L356 70" stroke="#3b2812" strokeWidth="1.4" />
    </svg>
  )
}

function Zeppelin2() {
  return (
    <svg className="bob" viewBox="0 0 360 140" width="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hero-hull2" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ede0c8" />
          <stop offset="0.55" stopColor="#c8b393" />
          <stop offset="1" stopColor="#7a5e34" />
        </linearGradient>
      </defs>
      <ellipse
        cx="180"
        cy="55"
        rx="160"
        ry="36"
        fill="url(#hero-hull2)"
        stroke="#5b421f"
        strokeWidth="1.1"
      />
      <path d="M40 55 Q180 30 320 55" fill="none" stroke="rgba(60,40,15,0.3)" strokeWidth="1" />
      <path d="M40 55 Q180 80 320 55" fill="none" stroke="rgba(60,40,15,0.3)" strokeWidth="1" />
      <ellipse cx="38" cy="55" rx="9" ry="12" fill="#5b421f" />
      <path d="M325 55 L352 33 L346 55 L352 77 Z" fill="#5b421f" />
      <path d="M150 88 L170 102 M210 88 L190 102" stroke="#3b2812" strokeWidth="0.9" />
      <path
        d="M155 102 Q180 118 205 102 L198 96 L162 96 Z"
        fill="#4b341a"
        stroke="#2a1c0a"
        strokeWidth="0.8"
      />
    </svg>
  )
}

function Zeppelin3() {
  return (
    <svg className="bob" viewBox="0 0 360 140" width="100%" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="180" cy="55" rx="158" ry="32" fill="#d4be95" stroke="#5b421f" strokeWidth="1" />
      <ellipse cx="40" cy="55" rx="8" ry="11" fill="#5b421f" />
      <path d="M323 55 L348 36 L342 55 L348 74 Z" fill="#5b421f" />
      <path d="M160 86 L175 100 M200 86 L185 100" stroke="#3b2812" strokeWidth="0.8" />
      <path d="M158 100 Q180 112 202 100 L196 95 L164 95 Z" fill="#4b341a" />
    </svg>
  )
}

function Zeppelin4() {
  return (
    <svg className="bob" viewBox="0 0 360 140" width="100%" xmlns="http://www.w3.org/2000/svg">
      <ellipse
        cx="180"
        cy="55"
        rx="155"
        ry="28"
        fill="#c9b48b"
        stroke="#5b421f"
        strokeWidth="0.9"
      />
      <ellipse cx="42" cy="55" rx="7" ry="9" fill="#5b421f" />
      <path d="M321 55 L344 39 L340 55 L344 71 Z" fill="#5b421f" />
      <path d="M170 84 Q180 96 192 84 L190 90 L172 90 Z" fill="#4b341a" />
    </svg>
  )
}
