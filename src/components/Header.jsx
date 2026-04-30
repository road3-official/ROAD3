import { useEffect, useMemo, useRef, useState } from "react";
import "./Header.css";

function Header({
  currentAccount,
  setCurrentAccount,
  accounts,
  setAccounts,
  onCustomizeApps,
  onAddApp,
  onResetApps,
  onOpenContact,
  onOpenSettings,
  onLogout,
}) {
  const name = currentAccount?.name || "ゲスト";
  const initial = useMemo(() => (name ? name.charAt(0) : "?"), [name]);
  const handle = currentAccount?.handle || currentAccount?.userId || "";

  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(name);

  useEffect(() => {
    setEditedName(name);
    setIsEditing(false);
  }, [name]);

  const saveName = () => {
    const trimmed = editedName.trim();
    if (!trimmed || !currentAccount) return;

    const updatedAccounts = accounts.map((acc) =>
      acc.id === currentAccount.id ? { ...acc, name: trimmed } : acc
    );

    const nextCurrent =
      updatedAccounts.find((acc) => acc.id === currentAccount.id) || null;

    setAccounts(updatedAccounts);
    setCurrentAccount(nextCurrent);

    localStorage.setItem("accounts", JSON.stringify(updatedAccounts));

    // currentAccount を丸ごと保存せず、IDだけ保存する
    if (nextCurrent?.id != null) {
      localStorage.setItem("currentAccountId", String(nextCurrent.id));
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      saveName();
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      saveName();
      setIsEditing(false);
    }
    if (e.key === "Escape") {
      setEditedName(name);
      setIsEditing(false);
    }
  };

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="app-header">
      <div className="app-header-top">
        <div className="app-header-spacer" />

        <h1 className="app-logo">ROAD3</h1>

        <div className="header-menuWrap" ref={menuRef}>
          <button
            type="button"
            className="menu-icon"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="メニュー"
            title="メニュー"
          >
            ⋮
          </button>

          {menuOpen && (
            <div className="header-dropdown" role="menu">
              <button
                type="button"
                className="menu-item"
                onClick={() => {
                  closeMenu();
                  onCustomizeApps?.();
                }}
              >
                アプリをカスタマイズ
              </button>

              <button
                type="button"
                className="menu-item"
                onClick={() => {
                  closeMenu();
                  onAddApp?.();
                }}
              >
                アプリを追加
              </button>

              <button
                type="button"
                className="menu-item"
                onClick={() => {
                  closeMenu();
                  onResetApps?.();
                }}
              >
                初期配置にリセット
              </button>

              <div className="menu-sep" />

              <button
                type="button"
                className="menu-item"
                onClick={() => {
                  closeMenu();
                  onOpenContact?.();
                }}
              >
                お問い合わせ
              </button>

              <button
                type="button"
                className="menu-item"
                onClick={() => {
                  closeMenu();
                  onOpenSettings?.();
                }}
              >
                設定
              </button>

              <div className="menu-sep" />

              <button
                type="button"
                className="menu-item danger"
                onClick={() => {
                  closeMenu();
                  onLogout?.();
                }}
              >
                ログアウト
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="app-header-divider" />

      <div className="app-header-account">
  <div className="user-avatar" aria-hidden="true">
    {currentAccount?.avatarImage ? (
      <img
        src={currentAccount.avatarImage}
        alt={name}
        className="user-avatar-image"
      />
    ) : (
      initial
    )}
  </div>

  <div className="user-name-block">
    {isEditing ? (
      <input
        value={editedName}
        onChange={(e) => setEditedName(e.target.value)}
        onKeyDown={handleKeyDown}
        className="name-input"
        autoFocus
      />
    ) : (
      <>
        <span className="user-name">{name}</span>
        <span className="user-handle">
          {handle ? `@${String(handle).replace(/^@/, "")}` : ""}
        </span>
      </>
    )}
  </div>

  <button
    type="button"
    className="edit-icon"
    onClick={handleEditToggle}
  >
    ✏️
  </button>
</div>
    </header>
  );
}

export default Header;