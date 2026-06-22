import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Personal.css";
import PersonalFooterNav from "../components/PersonalFooterNav";

function safeParse(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function Personal({
  personalAccount,
  setPersonalAccount,
  openGroupAccounts,
  setOpenGroupAccounts,
  currentOpenGroupAccount,
  setCurrentOpenGroupAccount,
  notifications,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
  if (location.state?.openAccount) {
    setIsAccountOpen(true);

    navigate("/personal", {
      replace: true,
      state: null,
    });
  }

  if (location.state?.openLayer) {
    setIsLayerOpen(true);

    navigate("/personal", {
      replace: true,
      state: null,
    });
  }
}, [location.state, navigate]);

  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isLayerOpen, setIsLayerOpen] = useState(false);

  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [isAddAppOpen, setIsAddAppOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFollowOpen, setIsFollowOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  const [isEditingPersonalOpen, setIsEditingPersonalOpen] = useState(false);
  const [editingPersonalName, setEditingPersonalName] = useState("");
  const [editingPersonalHandle, setEditingPersonalHandle] = useState("");
  const [editingPersonalAvatar, setEditingPersonalAvatar] = useState(null);

  const [editingOgAccountId, setEditingOgAccountId] = useState(null);
  const [editingOgAccountName, setEditingOgAccountName] = useState("");
  const [editingOgAccountHandle, setEditingOgAccountHandle] = useState("");
  const [editingOgAvatar, setEditingOgAvatar] = useState(null);

  const [contactSubject, setContactSubject] = useState("");
  const [contactBody, setContactBody] = useState("");
  const [contactDone, setContactDone] = useState(false);

  const [followTab, setFollowTab] = useState("following");

  const APP_STORAGE_KEY = "personalApps_v1";
  const CONTACT_STORAGE_KEY = "personalContacts_v1";
  const OPEN_GROUP_ACCOUNT_LIMIT = 3;

  const DEFAULT_APPS = useMemo(
    () => [
      {
        id: "calendar",
        label: "カレンダー",
        icon: "📅",
        route: "/personal/calendar",
      },
      {
        id: "memo",
        label: "メモ",
        icon: "📝",
        route: "/personal/memo",
      },
      {
        id: "hint",
        label: "ヒント",
        icon: "💡",
        route: null,
      },
      {
        id: "follow",
        label: "フォロー",
        icon: "👥",
        route: null,
      },
    ],
    []
  );

  const [apps, setApps] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(APP_STORAGE_KEY));
      return Array.isArray(saved) && saved.length > 0 ? saved : DEFAULT_APPS;
    } catch {
      return DEFAULT_APPS;
    }
  });

  useEffect(() => {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(apps));
  }, [apps, APP_STORAGE_KEY]);

  useEffect(() => {
    const openCustomize = () => setIsCustomizeOpen(true);
    const openAddApp = () => setIsAddAppOpen(true);
    const openContact = () => {
      setContactDone(false);
      setIsContactOpen(true);
    };
    const openSettings = () => setIsSettingsOpen(true);

    const openTerms = () => setIsTermsOpen(true);

    const resetAppsFromHeader = () => {
      const ok = window.confirm("アプリ配置を初期化する？");
      if (!ok) return;

      setApps(DEFAULT_APPS);
      localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(DEFAULT_APPS));
      setIsCustomizeOpen(false);
    };

    window.addEventListener("road3-open-customize", openCustomize);
    window.addEventListener("road3-open-add-app", openAddApp);
    window.addEventListener("road3-open-contact", openContact);
    window.addEventListener("road3-open-terms", openTerms);
    window.addEventListener("road3-open-settings", openSettings);
    window.addEventListener("road3-reset-apps", resetAppsFromHeader);

    return () => {
      window.removeEventListener("road3-open-customize", openCustomize);
      window.removeEventListener("road3-open-add-app", openAddApp);
      window.removeEventListener("road3-open-contact", openContact);
      window.removeEventListener("road3-open-terms", openTerms);
      window.removeEventListener("road3-open-settings", openSettings);
      window.removeEventListener("road3-reset-apps", resetAppsFromHeader);
    };
  }, [DEFAULT_APPS, APP_STORAGE_KEY]);

  const [newOgAccountName, setNewOgAccountName] = useState("");
  const [newOgAccountHandle, setNewOgAccountHandle] = useState("");
  const [newOgAvatar, setNewOgAvatar] = useState(null);

  const handleAvatarUpload = (setter) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setter(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const moveApp = (index, direction) => {
    const next = [...apps];
    const target = index + direction;

    if (target < 0 || target >= next.length) return;

    [next[index], next[target]] = [next[target], next[index]];
    setApps(next);
  };

  const removeApp = (id) => {
    const ok = window.confirm("このアプリを外す？");
    if (!ok) return;

    setApps((prev) => prev.filter((app) => app.id !== id));
  };

  const addApp = (app) => {
    const exists = apps.some((a) => a.id === app.id);
    if (exists) return;

    setApps((prev) => [...prev, app]);
    setIsAddAppOpen(false);
  };

  const availableApps = [
    {
      id: "calendar",
      label: "カレンダー",
      icon: "📅",
      route: "/personal/calendar",
    },
    {
      id: "memo",
      label: "メモ",
      icon: "📝",
      route: "/personal/memo",
    },
    {
      id: "hint",
      label: "ヒント",
      icon: "💡",
      route: null,
    },
    {
      id: "follow",
      label: "フォロー",
      icon: "👥",
      route: null,
    },
  ].filter((candidate) => !apps.some((app) => app.id === candidate.id));

  const openApp = (app) => {
    if (app.route) {
      navigate(app.route);
      return;
    }

    if (app.id === "hint") {
      alert("ヒントはこれから中身を作っていくよ。");
      return;
    }

    if (app.id === "follow") {
      setFollowTab("following");
      setIsFollowOpen(true);
      return;
    }
  };

  const renderAccountAvatar = (account) => {
    if (account?.avatarImage) {
      return (
        <img
          src={account.avatarImage}
          alt={account.name || "avatar"}
          className="account-avatar-image"
        />
      );
    }

    return <span>{account?.name?.charAt(0) || "?"}</span>;
  };

  const startEditPersonalAccount = () => {
    setEditingPersonalName(personalAccount?.name || "");
    setEditingPersonalHandle(personalAccount?.handle || "");
    setEditingPersonalAvatar(personalAccount?.avatarImage || null);
    setIsEditingPersonalOpen(true);
  };

  const handleSavePersonalAccount = () => {
    const nextName = editingPersonalName.trim();
    const nextHandle = editingPersonalHandle.trim();

    if (!nextName) return;

    const updatedPersonal = {
      ...personalAccount,
      name: nextName,
      handle: nextHandle || `@${nextName}`,
      avatarImage: editingPersonalAvatar || null,
    };

    setPersonalAccount(updatedPersonal);
    localStorage.setItem("personalAccount", JSON.stringify(updatedPersonal));
    localStorage.setItem("closedSharedAccount", JSON.stringify(updatedPersonal));
    setIsEditingPersonalOpen(false);
  };

  const startEditOgAccount = (account) => {
    setEditingOgAccountId(account.id);
    setEditingOgAccountName(account.name || "");
    setEditingOgAccountHandle(account.handle || "");
    setEditingOgAvatar(account.avatarImage || null);
  };

  const cancelEditOgAccount = () => {
    setEditingOgAccountId(null);
    setEditingOgAccountName("");
    setEditingOgAccountHandle("");
    setEditingOgAvatar(null);
  };

  const handleSaveOgAccount = () => {
    if (!editingOgAccountId) return;

    const nextName = editingOgAccountName.trim();
    const nextHandle = editingOgAccountHandle.trim();

    if (!nextName) return;

    const updatedAccounts = (openGroupAccounts || []).map((acc) =>
      String(acc.id) === String(editingOgAccountId)
        ? {
            ...acc,
            name: nextName,
            handle: nextHandle || `@${nextName}`,
            avatarImage: editingOgAvatar || null,
          }
        : acc
    );

    const updatedCurrent =
      String(currentOpenGroupAccount?.id) === String(editingOgAccountId)
        ? updatedAccounts.find(
            (acc) => String(acc.id) === String(editingOgAccountId)
          ) || currentOpenGroupAccount
        : currentOpenGroupAccount;

    setOpenGroupAccounts(updatedAccounts);
    localStorage.setItem("openGroupAccounts", JSON.stringify(updatedAccounts));

    if (updatedCurrent) {
      setCurrentOpenGroupAccount(updatedCurrent);
      localStorage.setItem(
        "currentOpenGroupAccountId",
        String(updatedCurrent.id)
      );
    }

    cancelEditOgAccount();
  };

  const handleAddOgAccount = () => {
    if ((openGroupAccounts || []).length >= OPEN_GROUP_ACCOUNT_LIMIT) {
      alert(
        `無料で作成できるオープン / グループ用アカウントは${OPEN_GROUP_ACCOUNT_LIMIT}個までだよ。課金枠は今後相談して決めよう。`
      );
      return;
    }

    const name = newOgAccountName.trim();
    const handle = newOgAccountHandle.trim();

    if (!name) return;

    const newAccount = {
      id: String(Date.now()),
      type: "open_group",
      name,
      handle: handle || `@${name}`,
      avatarImage: newOgAvatar || null,
    };

    const updated = [...(openGroupAccounts || []), newAccount];
    setOpenGroupAccounts(updated);
    localStorage.setItem("openGroupAccounts", JSON.stringify(updated));

    if (!currentOpenGroupAccount) {
      setCurrentOpenGroupAccount(newAccount);
      localStorage.setItem("currentOpenGroupAccountId", String(newAccount.id));
    }

    setNewOgAccountName("");
    setNewOgAccountHandle("");
    setNewOgAvatar(null);
    setIsAccountOpen(false);
  };

  const handleUseOgAccount = (account) => {
    setCurrentOpenGroupAccount(account);
    localStorage.setItem("currentOpenGroupAccountId", String(account.id));
  };

  const handleDeleteOgAccount = (account) => {
    if ((openGroupAccounts || []).length <= 1) {
      alert("オープン / グループ用アカウントは最低1つ必要だよ。");
      return;
    }

    const ok = window.confirm(`${account.name} を削除する？`);
    if (!ok) return;

    const updated = (openGroupAccounts || []).filter(
      (acc) => String(acc.id) !== String(account.id)
    );

    setOpenGroupAccounts(updated);
    localStorage.setItem("openGroupAccounts", JSON.stringify(updated));

    if (String(currentOpenGroupAccount?.id) === String(account.id)) {
      const fallback = updated[0] || null;
      setCurrentOpenGroupAccount(fallback);

      if (fallback) {
        localStorage.setItem("currentOpenGroupAccountId", String(fallback.id));
      } else {
        localStorage.removeItem("currentOpenGroupAccountId");
      }
    }
  };

  const handleSubmitContact = () => {
    const subject = contactSubject.trim();
    const body = contactBody.trim();

    if (!subject || !body) {
      alert("件名と内容を入れてね。");
      return;
    }

    const saved = (() => {
      try {
        const raw = JSON.parse(localStorage.getItem(CONTACT_STORAGE_KEY));
        return Array.isArray(raw) ? raw : [];
      } catch {
        return [];
      }
    })();

    const newContact = {
      id: Date.now(),
      subject,
      body,
      accountName: personalAccount?.name || "パーソナル",
      createdAt: Date.now(),
    };

    localStorage.setItem(
      CONTACT_STORAGE_KEY,
      JSON.stringify([newContact, ...saved].slice(0, 100))
    );

    setContactSubject("");
    setContactBody("");
    setContactDone(true);
  };

  const followData = useMemo(() => {
    const activeAccountId = currentOpenGroupAccount?.id;
    if (!activeAccountId) {
      return { following: [], followers: [] };
    }

    const following = safeParse(
      localStorage.getItem(`followingList-${activeAccountId}`),
      []
    );
    const followers = safeParse(
      localStorage.getItem(`followersList-${activeAccountId}`),
      []
    );

    return {
      following: Array.isArray(following) ? following : [],
      followers: Array.isArray(followers) ? followers : [],
    };
  }, [currentOpenGroupAccount]);

  const followList =
    followTab === "following" ? followData.following : followData.followers;

  return (
    <div className="personal-page">
      <main className="personal-main">
        {isCustomizeOpen && (
          <div className="personal-customize-bar">
            <p className="personal-customize-text">
              アプリの並び替えや削除ができます
            </p>
            <button
              type="button"
              className="personal-customize-done"
              onClick={() => setIsCustomizeOpen(false)}
            >
              完了
            </button>
          </div>
        )}

        <div className="app-grid">
          {apps.map((app, index) => (
            <div key={app.id} className="app-tileWrap">
              {isCustomizeOpen && (
                <div className="app-editTools">
                  <button type="button" onClick={() => moveApp(index, -1)}>
                    ↑
                  </button>
                  <button type="button" onClick={() => moveApp(index, 1)}>
                    ↓
                  </button>
                  <button type="button" onClick={() => removeApp(app.id)}>
                    ×
                  </button>
                </div>
              )}

              <button
                type="button"
                className="app-tile"
                onClick={() => openApp(app)}
              >
                <span className="app-icon">{app.icon}</span>
                <span className="app-label">{app.label}</span>
              </button>
            </div>
          ))}

          {isCustomizeOpen && (
            <button
              type="button"
              className="app-tile add-tile"
              onClick={() => setIsAddAppOpen(true)}
            >
              <span className="app-addPlus">＋</span>
              <span className="app-label">アプリ追加</span>
            </button>
          )}
        </div>
      </main>

      {isAccountOpen && (
        <div className="layer-overlay" onClick={() => setIsAccountOpen(false)}>
          <div
            className="layer-modal personal-account-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>アカウント管理</h3>

            <h4>パーソナル / クローズ共通アカウント</h4>

            <div className="account-list">
              <div className="account-item-row">
                <div className="account-item static">
                  <div className="account-avatar">
                    {renderAccountAvatar(personalAccount)}
                  </div>

                  <div className="account-meta">
                    <strong>{personalAccount?.name}</strong>
                    <span>
                      {personalAccount?.handle
                        ? `@${personalAccount.handle.replace(/^@/, "")}`
                        : "@---"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="account-edit-button"
                  onClick={startEditPersonalAccount}
                >
                  編集
                </button>
              </div>
            </div>

            <div className="modal-divider" />

            <h4>
              オープン / グループ用アカウント
              <span className="account-limit-text">
                無料 {(openGroupAccounts || []).length}/{OPEN_GROUP_ACCOUNT_LIMIT}
              </span>
            </h4>

            <div className="account-list">
              {(openGroupAccounts || []).map((acc) => (
                <div key={acc.id} className="account-item-manage-row">
                  <div className="account-item static">
                    <div className="account-avatar">
                      {renderAccountAvatar(acc)}
                    </div>

                    <div className="account-meta">
                      <strong>{acc.name}</strong>
                      <span>
                        {acc.handle
                          ? `@${acc.handle.replace(/^@/, "")}`
                          : "@---"}
                      </span>
                    </div>

                    {String(acc.id) === String(currentOpenGroupAccount?.id) && (
                      <span className="account-current">使用中</span>
                    )}
                  </div>

                  <div className="account-manage-actions">
                    {String(acc.id) !== String(currentOpenGroupAccount?.id) && (
                      <button
                        type="button"
                        className="account-use-button"
                        onClick={() => handleUseOgAccount(acc)}
                      >
                        使用
                      </button>
                    )}

                    <button
                      type="button"
                      className="account-edit-button"
                      onClick={() => startEditOgAccount(acc)}
                    >
                      編集
                    </button>

                    <button
                      type="button"
                      className="account-delete-button"
                      onClick={() => handleDeleteOgAccount(acc)}
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-divider" />

            <h4>オープン / グループ用アカウント追加</h4>

            <input
              className="modal-input"
              type="text"
              placeholder="名前"
              value={newOgAccountName}
              onChange={(e) => setNewOgAccountName(e.target.value)}
            />

            <input
              className="modal-input"
              type="text"
              placeholder="@ID"
              value={newOgAccountHandle}
              onChange={(e) => setNewOgAccountHandle(e.target.value)}
            />

            <input
              className="modal-input"
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload(setNewOgAvatar)}
            />

            {newOgAvatar && (
              <div className="personal-avatar-preview">
                <img
                  src={newOgAvatar}
                  alt="preview"
                  className="personal-avatar-preview-image"
                />
              </div>
            )}

            <div className="modal-actions">
              <button className="modal-primary" onClick={handleAddOgAccount}>
                追加
              </button>
              <button
                className="modal-secondary"
                onClick={() => {
                  setIsAccountOpen(false);
                  setNewOgAvatar(null);
                }}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditingPersonalOpen && (
        <div
          className="layer-overlay"
          onClick={() => setIsEditingPersonalOpen(false)}
        >
          <div className="layer-modal" onClick={(e) => e.stopPropagation()}>
            <h3>共通アカウント編集</h3>

            <input
              className="modal-input"
              type="text"
              placeholder="名前"
              value={editingPersonalName}
              onChange={(e) => setEditingPersonalName(e.target.value)}
            />

            <input
              className="modal-input"
              type="text"
              placeholder="@ID"
              value={editingPersonalHandle}
              onChange={(e) => setEditingPersonalHandle(e.target.value)}
            />

            <input
              className="modal-input"
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload(setEditingPersonalAvatar)}
            />

            {editingPersonalAvatar && (
              <div className="personal-avatar-preview">
                <img
                  src={editingPersonalAvatar}
                  alt="preview"
                  className="personal-avatar-preview-image"
                />
              </div>
            )}

            <div className="modal-actions">
              <button
                className="modal-primary"
                onClick={handleSavePersonalAccount}
              >
                保存
              </button>
              <button
                className="modal-secondary"
                onClick={() => setIsEditingPersonalOpen(false)}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {editingOgAccountId && (
        <div className="layer-overlay" onClick={cancelEditOgAccount}>
          <div className="layer-modal" onClick={(e) => e.stopPropagation()}>
            <h3>オープン / グループ用アカウント編集</h3>

            <input
              className="modal-input"
              type="text"
              placeholder="名前"
              value={editingOgAccountName}
              onChange={(e) => setEditingOgAccountName(e.target.value)}
            />

            <input
              className="modal-input"
              type="text"
              placeholder="@ID"
              value={editingOgAccountHandle}
              onChange={(e) => setEditingOgAccountHandle(e.target.value)}
            />

            <input
              className="modal-input"
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload(setEditingOgAvatar)}
            />

            {editingOgAvatar && (
              <div className="personal-avatar-preview">
                <img
                  src={editingOgAvatar}
                  alt="preview"
                  className="personal-avatar-preview-image"
                />
              </div>
            )}

            <div className="modal-actions">
              <button className="modal-primary" onClick={handleSaveOgAccount}>
                保存
              </button>
              <button className="modal-secondary" onClick={cancelEditOgAccount}>
                閉じる
              </button>
            </div>
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

            <button
              type="button"
              className="layer-modal-item"
              onClick={() => navigate("/open")}
            >
              <div className="layer-modal-accountRow">
                <div className="layer-modal-avatar layer-modal-layerIcon">
                  <span className="layer-modal-avatarFallback">🌐</span>
                </div>
                <div className="layer-modal-main">
                  <strong>オープンスペース</strong>
                  <span>広くつながるタイムライン</span>
                </div>
              </div>
              <span className="layer-modal-arrow">›</span>
            </button>

            <button
              type="button"
              className="layer-modal-item"
              onClick={() => navigate("/group")}
            >
              <div className="layer-modal-accountRow">
                <div className="layer-modal-avatar layer-modal-layerIcon">
                  <span className="layer-modal-avatarFallback">👥</span>
                </div>
                <div className="layer-modal-main">
                  <strong>グループスペース</strong>
                  <span>仲間ごとの場</span>
                </div>
              </div>
              <span className="layer-modal-arrow">›</span>
            </button>

            <button
              type="button"
              className="layer-modal-item"
              onClick={() => navigate("/closed")}
            >
              <div className="layer-modal-accountRow">
                <div className="layer-modal-avatar layer-modal-layerIcon">
                  <span className="layer-modal-avatarFallback">🔒</span>
                </div>
                <div className="layer-modal-main">
                  <strong>クローズドスペース</strong>
                  <span>限られた相手との場</span>
                </div>
              </div>
              <span className="layer-modal-arrow">›</span>
            </button>

            <button
              type="button"
              className="layer-modal-item is-disabled"
              disabled
            >
              <div className="layer-modal-accountRow">
                <div className="layer-modal-avatar layer-modal-layerIcon">
                  <span className="layer-modal-avatarFallback">🏠</span>
                </div>
                <div className="layer-modal-main">
                  <strong>パーソナルスペース</strong>
                  <span>自分の拠点</span>
                </div>
              </div>
              <span className="layer-modal-arrow">現在地</span>
            </button>

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

      {isAddAppOpen && (
        <div className="layer-overlay" onClick={() => setIsAddAppOpen(false)}>
          <div className="layer-modal" onClick={(e) => e.stopPropagation()}>
            <h3>アプリ追加</h3>

            {availableApps.length === 0 ? (
              <p>追加できるアプリはありません。</p>
            ) : (
              <div className="account-list">
                {availableApps.map((app) => (
                  <button
                    key={app.id}
                    className="account-item"
                    onClick={() => addApp(app)}
                  >
                    <div className="account-avatar">{app.icon}</div>
                    <div className="account-meta">
                      <strong>{app.label}</strong>
                      <span>{app.route || "準備中"}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button
              className="modal-secondary"
              onClick={() => setIsAddAppOpen(false)}
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {isContactOpen && (
        <div className="layer-overlay" onClick={() => setIsContactOpen(false)}>
          <div className="layer-modal" onClick={(e) => e.stopPropagation()}>
            <h3>お問い合わせ</h3>

            {contactDone ? (
              <>
                <p className="personal-muted">
                  送信しました。あとでしっかりした送信機能にしていくよ。
                </p>
                <button
                  className="modal-secondary"
                  onClick={() => {
                    setContactDone(false);
                    setIsContactOpen(false);
                  }}
                >
                  閉じる
                </button>
              </>
            ) : (
              <>
                <input
                  className="modal-input"
                  type="text"
                  placeholder="件名"
                  value={contactSubject}
                  onChange={(e) => setContactSubject(e.target.value)}
                />

                <textarea
                  className="modal-textarea"
                  placeholder="お問い合わせ内容"
                  value={contactBody}
                  onChange={(e) => setContactBody(e.target.value)}
                  rows={6}
                />

                <div className="modal-actions">
                  <button
                    className="modal-primary"
                    onClick={handleSubmitContact}
                  >
                    送信
                  </button>
                  <button
                    className="modal-secondary"
                    onClick={() => setIsContactOpen(false)}
                  >
                    閉じる
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {isFollowOpen && (
        <div className="layer-overlay" onClick={() => setIsFollowOpen(false)}>
          <div
            className="layer-modal personal-follow-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>フォロー / フォロワー</h3>

            <div className="personal-follow-tabs">
              <button
                type="button"
                className={`personal-follow-tab ${
                  followTab === "following" ? "active" : ""
                }`}
                onClick={() => setFollowTab("following")}
              >
                フォロー中
              </button>

              <button
                type="button"
                className={`personal-follow-tab ${
                  followTab === "followers" ? "active" : ""
                }`}
                onClick={() => setFollowTab("followers")}
              >
                フォロワー
              </button>
            </div>

            {!currentOpenGroupAccount && (
              <p className="personal-muted">
                先にオープン / グループ用アカウントを選んでね。
              </p>
            )}

            <div className="account-list">
              {followList.length === 0 ? (
                <p className="personal-muted">まだ一覧はありません。</p>
              ) : (
                followList.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className="account-item"
                    onClick={() =>
                      navigate(`/profile/user/${encodeURIComponent(user.id)}`, {
                        state: {
                          from: "/personal",
                          user: {
                            id: user.id,
                            name: user.name,
                            handle: user.handle || user.userId,
                          },
                        },
                      })
                    }
                  >
                    <div className="account-avatar">
                      <span>{user.name?.charAt(0) || "?"}</span>
                    </div>
                    <div className="account-meta">
                      <strong>{user.name}</strong>
                      <span>{user.handle || user.userId || "@---"}</span>
                    </div>
                  </button>
                ))
              )}
            </div>

            <button
              className="modal-secondary"
              onClick={() => setIsFollowOpen(false)}
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {isTermsOpen && (
  <div className="layer-overlay" onClick={() => setIsTermsOpen(false)}>
    <div className="layer-modal" onClick={(e) => e.stopPropagation()}>
      <h3>利用規約・プライバシーポリシー</h3>

      <h4>利用規約</h4>

      <p className="personal-muted">
        ROAD3はユーザー同士が交流し、情報発信やコミュニケーションを行うためのSNSサービスです。
      </p>

      <p className="personal-muted">
        他者への誹謗中傷、嫌がらせ、なりすまし、スパム行為は禁止します。
      </p>

      <p className="personal-muted">
        投稿内容の責任は投稿者本人にあります。
      </p>

      <p className="personal-muted">
        ROAD3 for R18については18歳未満の方の利用を固く禁止します。
      </p>

      <p className="personal-muted">
        運営は必要に応じてサービス内容および規約を変更することがあります。
      </p>

      <h4>プライバシーポリシー</h4>

      <p className="personal-muted">
        ROAD3はサービス提供に必要な範囲で利用者情報を取得します。
      </p>

      <p className="personal-muted">
        取得した情報はアカウント管理、サービス提供、
        不正利用対策、お問い合わせ対応のために利用します。
      </p>

      <p className="personal-muted">
        法令に基づく場合を除き、
        第三者へ販売・提供することはありません。
      </p>

      <button
        className="modal-secondary"
        onClick={() => setIsTermsOpen(false)}
      >
        閉じる
      </button>
    </div>
  </div>
)}

      {isSettingsOpen && (
        <div className="layer-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="layer-modal" onClick={(e) => e.stopPropagation()}>
            <h3>設定</h3>
            <p className="personal-muted">
              パーソナルスペースの設定項目はこれから追加していくよ。
            </p>
            <button
              className="modal-secondary"
              onClick={() => setIsSettingsOpen(false)}
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      <PersonalFooterNav
        onOpenLayer={() => setIsLayerOpen(true)}
        onOpenAccount={() => setIsAccountOpen(true)}
        notifications={notifications}
      />
    </div>
  );
}

export default Personal;
