/**
 * Subtle build-identification badge so it's always clear which version of the
 * app is running. Saves diagnosis time when the browser cache or a stale
 * deployment URL is in play (see the URL-frozen-cache incident from May).
 */
export function BuildInfo() {
  const sha = __BUILD_SHA__
  const builtAt = __BUILD_TIME__
  const date = new Date(builtAt)
  const stamp = isNaN(date.getTime())
    ? builtAt
    : `${date.toISOString().slice(0, 10)} ${date.toISOString().slice(11, 16)}`
  return (
    <div
      className="pointer-events-none fixed bottom-1 right-2 z-50 select-none text-[10px] font-mono text-zinc-600 opacity-60 hover:opacity-100"
      title={`built ${builtAt}`}
    >
      <span className="pointer-events-auto">
        {sha} · {stamp} UTC
      </span>
    </div>
  )
}
