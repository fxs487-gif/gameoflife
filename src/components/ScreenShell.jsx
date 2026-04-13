export default function ScreenShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  className = '',
  flowStep = 0,
  flowTotal = 0,
  flowLabel = '',
  showBrand = true,
}) {
  const hasFlowProgress = flowStep > 0 && flowTotal > 0;
  const flowRatio = hasFlowProgress
    ? Math.max(0, Math.min(100, (flowStep / flowTotal) * 100))
    : 0;

  return (
    <main className={`screen-shell ${className}`.trim()}>
      {hasFlowProgress ? (
        <div
          className="flow-progress"
          style={{ '--flow-progress': `${flowRatio}%` }}
        >
          <div className="flow-progress-copy">
            <p className="flow-progress-step">
              Step {flowStep} of {flowTotal}
            </p>
            {flowLabel ? <p className="flow-progress-label">{flowLabel}</p> : null}
          </div>
          <div className="flow-progress-track" aria-hidden="true">
            <span className="flow-progress-fill" />
          </div>
        </div>
      ) : null}

      {showBrand ? (
        <div className="brand-lockup">
          <span className="brand-mark">Game of Life</span>
        </div>
      ) : null}

      <section className="screen-copy">
        {!showBrand && eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="screen-title">{title}</h1>
        {showBrand && eyebrow ? <p className="eyebrow is-supporting">{eyebrow}</p> : null}
        {subtitle ? <p className="screen-subtitle">{subtitle}</p> : null}
      </section>

      <section className="screen-body">{children}</section>

      {footer ? <footer className="screen-footer">{footer}</footer> : null}
    </main>
  );
}
