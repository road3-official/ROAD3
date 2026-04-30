import "./FooterNav.css";

function FooterNav({
  onOpenSignals,
  onOpenSaved,
  onOpenAccount,
  onOpenNotifications,
  onOpenLayer,
  notifications = [],
  activeTab = "",
}) {
  const unreadCount = notifications.filter((n) => !n.read && !n.isRead).length;

  return (
    <nav className="footer-nav" role="navigation" aria-label="Closed footer">
      <button
        type="button"
        className={`footer-nav-item ${activeTab === "signals" ? "active" : ""}`}
        onClick={onOpenSignals}
      >
        <span className="nav-icon" aria-hidden="true">
          📡
        </span>
        <span className="nav-label">シグナル</span>
      </button>

      <button
        type="button"
        className={`footer-nav-item ${activeTab === "saved" ? "active" : ""}`}
        onClick={onOpenSaved}
      >
        <span className="nav-icon" aria-hidden="true">
          ❤️
        </span>
        <span className="nav-label">保存</span>
      </button>

      <button
        type="button"
        className={`footer-nav-item ${activeTab === "account" ? "active" : ""}`}
        onClick={onOpenAccount}
      >
        <span className="nav-icon" aria-hidden="true">
          👤
        </span>
        <span className="nav-label">アカウント</span>
      </button>

      <button
        type="button"
        className={`footer-nav-item footer-nav-notification ${
          activeTab === "notifications" ? "active" : ""
        }`}
        onClick={onOpenNotifications}
      >
        <span className="nav-icon" aria-hidden="true">
          🔔
        </span>
        <span className="nav-label">通知</span>
        {unreadCount > 0 && (
          <span className="footer-nav-badge">{unreadCount}</span>
        )}
      </button>

      <button
        type="button"
        className={`footer-nav-item ${activeTab === "layer" ? "active" : ""}`}
        onClick={onOpenLayer}
      >
        <span className="nav-icon" aria-hidden="true">
          🪜
        </span>
        <span className="nav-label">階層</span>
      </button>
    </nav>
  );
}

export default FooterNav;