import "./FooterNav.css";
import { useNavigate, useLocation } from "react-router-dom";
import { useMemo } from "react";

export default function PersonalFooterNav({
  onOpenLayer,
  onOpenAccount,
  notifications = [],
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read && !n.isRead).length,
    [notifications]
  );

  const pathname = location.pathname;

  const activeTab = useMemo(() => {
    if (pathname.startsWith("/activity/signals")) return "signals";
    if (pathname.startsWith("/activity/saved")) return "saved";
    if (pathname.startsWith("/activity/notifications")) return "notifications";
    return "";
  }, [pathname]);

  const handleOpenAccount = () => {
    if (onOpenAccount) {
      onOpenAccount();
      return;
    }

    navigate("/personal", { state: { openAccount: true } });
  };

  const handleOpenLayer = () => {
    if (onOpenLayer) {
      onOpenLayer();
      return;
    }

    navigate("/personal", { state: { openLayer: true } });
  };

  return (
    <nav className="footer-nav" role="navigation" aria-label="Personal footer">
      <button
        type="button"
        className={`footer-nav-item ${activeTab === "signals" ? "active" : ""}`}
        onClick={() =>
          navigate("/activity/signals", { state: { from: "/personal" } })
        }
      >
        <span className="nav-icon" aria-hidden="true">📡</span>
        <span className="nav-label">シグナル</span>
      </button>

      <button
        type="button"
        className={`footer-nav-item ${activeTab === "saved" ? "active" : ""}`}
        onClick={() =>
          navigate("/activity/saved", { state: { from: "/personal" } })
        }
      >
        <span className="nav-icon" aria-hidden="true">❤️</span>
        <span className="nav-label">保存</span>
      </button>

      <button type="button" className="footer-nav-item" onClick={handleOpenAccount}>
        <span className="nav-icon" aria-hidden="true">👤</span>
        <span className="nav-label">アカウント</span>
      </button>

      <button
        type="button"
        className={`footer-nav-item footer-nav-notification ${
          activeTab === "notifications" ? "active" : ""
        }`}
        onClick={() =>
          navigate("/activity/notifications", { state: { from: "/personal" } })
        }
      >
        <span className="nav-icon" aria-hidden="true">🔔</span>
        <span className="nav-label">通知</span>
        {unreadCount > 0 && <span className="footer-nav-badge">{unreadCount}</span>}
      </button>

      <button type="button" className="footer-nav-item" onClick={handleOpenLayer}>
        <span className="nav-icon" aria-hidden="true">🪜</span>
        <span className="nav-label">階層</span>
      </button>
    </nav>
  );
}
