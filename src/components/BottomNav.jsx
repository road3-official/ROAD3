import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import "./BottomNav.css";

const OPEN_GROUP_ACCOUNTS_KEY = "openGroupAccounts";
const CURRENT_OPEN_GROUP_ACCOUNT_ID_KEY = "currentOpenGroupAccountId";
const CURRENT_ACCOUNT_ID_KEY = "currentAccountId";
const ACCOUNT_CHANGED_EVENT = "road3-account-changed";

function safeParse(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function isImageLike(value) {
  if (!value || typeof value !== "string") return false;
  return /^(https?:\/\/|data:image\/|blob:|\/)/i.test(value);
}

function getAccountAvatarImage(account) {
  return (
    account?.avatarImage ??
    account?.profileImage ??
    (isImageLike(account?.avatar) ? account.avatar : "") ??
    ""
  );
}

function getAccountAvatarFallback(account) {
  return account?.name?.charAt(0) ?? account?.avatar ?? account?.icon ?? "G";
}

function normalizeAccount(account) {
  if (!account || typeof account !== "object") return null;
  if (account.id === undefined || account.id === null || account.id === "") {
    return null;
  }

  const normalizedId = String(account.id);

  return {
    ...account,
    id: normalizedId,
    name: account.name ?? "ユーザー",
    handle: account.handle ?? account.userId ?? normalizedId,
    avatarImage: account.avatarImage ?? account.profileImage ?? "",
    profileImage: account.profileImage ?? account.avatarImage ?? "",
    avatar:
      account.avatar ??
      account.icon ??
      account.name?.charAt(0) ??
      "G",
    type: account.type ?? "アカウント",
  };
}

function isOpenGroupLikePath(pathname) {
  return (
    pathname.startsWith("/open") ||
    pathname.startsWith("/group") ||
    pathname.startsWith("/activity") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/dm") ||
    pathname.startsWith("/search") ||
    pathname.startsWith("/quote-resignal") ||
    pathname.startsWith("/signal/")
  );
}

function getResolvedCurrentAccount(pathname, currentAccount) {
  if (isOpenGroupLikePath(pathname)) {
    const openGroupAccounts = safeParse(
      localStorage.getItem(OPEN_GROUP_ACCOUNTS_KEY),
      []
    );
    const currentOpenGroupAccountId = localStorage.getItem(
      CURRENT_OPEN_GROUP_ACCOUNT_ID_KEY
    );

    if (Array.isArray(openGroupAccounts) && openGroupAccounts.length > 0) {
      const matched = openGroupAccounts.find(
        (acc) => String(acc?.id) === String(currentOpenGroupAccountId)
      );

      return normalizeAccount(matched || openGroupAccounts[0]);
    }
  }

  const savedAccounts = safeParse(localStorage.getItem("accounts"), []);
  const currentAccountId = localStorage.getItem(CURRENT_ACCOUNT_ID_KEY);

  if (Array.isArray(savedAccounts) && savedAccounts.length > 0) {
    const matched = savedAccounts.find(
      (acc) => String(acc?.id) === String(currentAccountId)
    );
    return normalizeAccount(matched || currentAccount || savedAccounts[0]);
  }

  return normalizeAccount(currentAccount);
}

function buildAccountsForSwitcher(currentAccount, pathname) {
  const merged = [];

  if (isOpenGroupLikePath(pathname)) {
    const openGroupAccounts = safeParse(
      localStorage.getItem(OPEN_GROUP_ACCOUNTS_KEY),
      []
    );

    if (Array.isArray(openGroupAccounts)) {
      merged.push(...openGroupAccounts);
    }
  } else {
    const savedAccounts = safeParse(localStorage.getItem("accounts"), []);
    if (Array.isArray(savedAccounts)) {
      merged.push(...savedAccounts);
    }
  }

  const dedupedMap = new Map();

  merged.forEach((account) => {
    const normalized = normalizeAccount(account);
    if (!normalized) return;

    const key = String(normalized.id);
    if (!dedupedMap.has(key)) {
      dedupedMap.set(key, normalized);
    }
  });

  const dedupedAccounts = Array.from(dedupedMap.values());

  if (dedupedAccounts.length === 0 && currentAccount) {
    const normalizedCurrent = normalizeAccount(currentAccount);
    return normalizedCurrent ? [normalizedCurrent] : [];
  }

  return dedupedAccounts;
}

function BottomNav({ notifications = [], currentAccount }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [isLayerOpen, setIsLayerOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [accountVersion, setAccountVersion] = useState(0);

  const pathname = location.pathname;
  const isGroupMain = pathname === "/group";
  const openGroupLikePage = isOpenGroupLikePath(pathname);

  const normalizedCurrentAccount = useMemo(
    () => normalizeAccount(currentAccount),
    [currentAccount]
  );

  useEffect(() => {
    const syncAccount = () => {
      setAccountVersion((v) => v + 1);
    };

    window.addEventListener(ACCOUNT_CHANGED_EVENT, syncAccount);
    window.addEventListener("focus", syncAccount);

    return () => {
      window.removeEventListener(ACCOUNT_CHANGED_EVENT, syncAccount);
      window.removeEventListener("focus", syncAccount);
    };
  }, []);

  const activeAccount = useMemo(() => {
    return getResolvedCurrentAccount(pathname, normalizedCurrentAccount);
  }, [pathname, normalizedCurrentAccount, accountVersion]);

  const unreadCount = notifications.filter((n) => {
    const sameAccount = String(n.accountId) === String(activeAccount?.id);
    const isUnread = !Boolean(n.read || n.isRead);
    return sameAccount && isUnread;
  }).length;

  const accounts = useMemo(() => {
    return buildAccountsForSwitcher(activeAccount, pathname);
  }, [activeAccount, pathname, accountVersion]);

  const currentLayer = useMemo(() => {
    if (pathname.startsWith("/open")) return "open";
    if (pathname.startsWith("/group")) return "group";
    if (pathname.startsWith("/closed")) return "closed";
    if (pathname.startsWith("/personal")) return "personal";
    return "";
  }, [pathname]);

  const moveToLayer = (path) => {
    setIsLayerOpen(false);
    navigate(path);
  };

  const getNotificationFromPath = () => {
    return pathname || "/open";
  };

  const layerItems = [
    {
      key: "open",
      title: "オープンスペース",
      description: "広くつながるタイムライン",
      path: "/open",
      icon: "🌐",
    },
    {
      key: "group",
      title: "グループスペース",
      description: "仲間ごとの場",
      path: "/group",
      icon: "👥",
    },
    {
      key: "closed",
      title: "クローズドスペース",
      description: "限られた相手との場",
      path: "/closed",
      icon: "🔒",
    },
    {
      key: "personal",
      title: "パーソナルスペース",
      description: "自分の拠点",
      path: "/personal",
      icon: "🏠",
    },
  ];

  const switchAccount = (account) => {
    const normalized = normalizeAccount(account);
    if (!normalized) {
      window.alert("このアカウントには切り替えできません");
      return;
    }

    if (openGroupLikePage) {
      localStorage.setItem(
        CURRENT_OPEN_GROUP_ACCOUNT_ID_KEY,
        String(normalized.id)
      );
      localStorage.setItem(CURRENT_ACCOUNT_ID_KEY, String(normalized.id));
    } else {
      localStorage.setItem(CURRENT_ACCOUNT_ID_KEY, String(normalized.id));
    }

    setIsAccountOpen(false);
    setAccountVersion((v) => v + 1);
    window.dispatchEvent(new Event(ACCOUNT_CHANGED_EVENT));

    navigate(pathname, {
      replace: true,
      state: {
        ...(location.state || {}),
        __accountChangedAt: Date.now(),
      },
    });
  };

  const navItems = [
    {
      key: "signal",
      label: isGroupMain ? "ホーム" : "シグナル",
      icon: isGroupMain ? "🧭" : "📡",
      type: isGroupMain ? "button" : "link",
      to: "/open",
      disabled: isGroupMain,
    },
    ...(!isGroupMain
      ? [
          {
            key: "search",
            label: "検索",
            icon: "🔍",
            type: "button",
            onClick: () => navigate("/search", { state: { from: pathname } }),
          },
        ]
      : []),
    {
      key: "account",
      label: "アカウント",
      icon: "👤",
      type: "button",
      onClick: () => setIsAccountOpen(true),
    },
    {
      key: "notification",
      label: "通知",
      icon: "🔔",
      type: "button",
      onClick: () =>
        navigate("/notifications", {
          state: { from: getNotificationFromPath() },
        }),
      badge: unreadCount,
      extraClass: "nav-notification",
    },
    {
      key: "layer",
      label: "階層",
      icon: "🪜",
      type: "button",
      onClick: () => setIsLayerOpen(true),
    },
  ];

  const renderNavItem = (item) => {
    const content = (
      <>
        <span className="nav-icon" aria-hidden="true">
          {item.icon}
        </span>
        <span className="nav-label">{item.label}</span>
        {item.badge > 0 && <span className="badge">{item.badge}</span>}
      </>
    );

    if (item.type === "link") {
      return (
        <NavLink key={item.key} to={item.to} className="nav-item">
          {content}
        </NavLink>
      );
    }

    return (
      <button
        key={item.key}
        type="button"
        className={`nav-item nav-button ${item.extraClass ?? ""}`.trim()}
        onClick={item.onClick}
        disabled={item.disabled}
      >
        {content}
      </button>
    );
  };

  return (
    <>
      <div className="bottom-nav">{navItems.map(renderNavItem)}</div>

      {isAccountOpen && (
        <div
          className="layer-modal-overlay"
          onClick={() => setIsAccountOpen(false)}
        >
          <div className="layer-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="layer-modal-title">アカウント切替</h3>

            {accounts.length === 0 ? (
              <div className="layer-modal-empty">アカウントがありません</div>
            ) : (
              accounts.map((account) => {
                const isCurrent =
                  String(activeAccount?.id) === String(account.id);
                const avatarImage = getAccountAvatarImage(account);
                const avatarFallback = getAccountAvatarFallback(account);

                return (
                  <button
                    key={account.id}
                    type="button"
                    className={`layer-modal-item ${isCurrent ? "is-current" : ""}`}
                    onClick={() => switchAccount(account)}
                  >
                    <div className="layer-modal-accountRow">
                      <div className="layer-modal-avatar">
                        {avatarImage ? (
                          <img
                            src={avatarImage}
                            alt={`${account.name} avatar`}
                            className="layer-modal-avatarImage"
                          />
                        ) : (
                          <span className="layer-modal-avatarFallback">
                            {String(avatarFallback).charAt(0)}
                          </span>
                        )}
                      </div>

                      <div className="layer-modal-main">
                        <strong>{account.name}</strong>
                        <span>@{String(account.handle).replace(/^@/, "")}</span>
                      </div>
                    </div>

                    <span className="layer-modal-check">
                      {isCurrent ? "✔" : ""}
                    </span>
                  </button>
                );
              })
            )}

            <button
              type="button"
              className="layer-modal-close"
              onClick={() => setIsAccountOpen(false)}
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {isLayerOpen && (
        <div
          className="layer-modal-overlay"
          onClick={() => setIsLayerOpen(false)}
        >
          <div className="layer-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="layer-modal-title">階層移動</h3>

            {layerItems.map((item) => {
              const isCurrent = currentLayer === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  className={`layer-modal-item ${isCurrent ? "is-disabled" : ""}`}
                  onClick={() => {
                    if (!isCurrent) moveToLayer(item.path);
                  }}
                  disabled={isCurrent}
                >
                  <div className="layer-modal-accountRow">
                    <div className="layer-modal-avatar layer-modal-layerIcon">
                      <span className="layer-modal-avatarFallback">
                        {item.icon}
                      </span>
                    </div>

                    <div className="layer-modal-main">
                      <strong>{item.title}</strong>
                      <span>{item.description}</span>
                    </div>
                  </div>

                  <span className="layer-modal-arrow">
                    {isCurrent ? "現在地" : "›"}
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              className="layer-modal-close"
              onClick={() => setIsLayerOpen(false)}
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default BottomNav;