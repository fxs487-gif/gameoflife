export default function ScreenShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  className = '',
}) {
  return (
    <main className={`screen-shell ${className}`.trim()}>
      <div className="brand-lockup">
        <span className="brand-mark">Game of Life</span>
      </div>

      <section className="screen-copy">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="screen-title">{title}</h1>
        {subtitle ? <p className="screen-subtitle">{subtitle}</p> : null}
      </section>

      <section className="screen-body">{children}</section>

      {footer ? <footer className="screen-footer">{footer}</footer> : null}
    </main>
  );
}
