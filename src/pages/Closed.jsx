import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import "./Closed.css";
import FooterNav from "../components/FooterNav";

function safeParse(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function sanitizeMessages(raw) {
  const next = {};
  Object.entries(raw || {}).forEach(([friendId, list]) => {
    next[friendId] = (Array.isArray(list) ? list : []).map((msg) => {
      if (
        msg?.type === "image" &&
        typeof msg.image === "string" &&
        msg.image.startsWith("data:")
      ) {
        return {
          ...msg,
          image: "",
          imageUnavailable: true,
        };
      }
      return msg;
    });
  });
  return next;
}

function sanitizeFriends(list) {
  return (Array.isArray(list) ? list : [])
    .filter(Boolean)
    .filter(
      (friend) =>
        !friend?.isDemo &&
        !friend?.isSample &&
        !friend?.sample &&
        !friend?.demo
    )
    .map((friend) => ({
      ...friend,
      id: String(friend.id),
      name: friend.name ?? "友だち",
      avatarImage:
        typeof friend.avatarImage === "string" &&
        friend.avatarImage.startsWith("data:")
          ? null
          : (friend.avatarImage ?? null),
    }));
}

function buildClosedIdentity(currentAccount) {
  return {
    id: String(currentAccount?.id || "closed-self"),
    name: currentAccount?.name || "自分",
    handle: currentAccount?.handle || "@me",
    avatarImage:
      typeof currentAccount?.avatarImage === "string" &&
      currentAccount.avatarImage.startsWith("data:")
        ? null
        : (currentAccount?.avatarImage ?? null),
  };
}

function Closed({
  currentAccount,
  notifications = [],
  closedNotifications = [],
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const [friends, setFriends] = useState([]);
  const [allMessages, setAllMessages] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [sortMode, setSortMode] = useState("latest");
  const [deleteMode, setDeleteMode] = useState(false);
  const [muteMode, setMuteMode] = useState(false);
  const [mutedFriendIds, setMutedFriendIds] = useState([]);
  const [isLayerOpen, setIsLayerOpen] = useState(false);

  const [isNameEditOpen, setIsNameEditOpen] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  const [closedIdentity, setClosedIdentity] = useState(() => {
    const stored = safeParse(localStorage.getItem("closedSharedAccount"), null);
    if (stored?.id) {
      return {
        ...stored,
        id: String(stored.id),
        avatarImage:
          typeof stored.avatarImage === "string" &&
          stored.avatarImage.startsWith("data:")
            ? null
            : (stored.avatarImage ?? null),
      };
    }
    return buildClosedIdentity(currentAccount);
  });

  useEffect(() => {
    const storedFriends = sanitizeFriends(
      safeParse(localStorage.getItem("closedFriends"), [])
    );
    setFriends(storedFriends);
    localStorage.setItem("closedFriends", JSON.stringify(storedFriends));

    const storedMessages = safeParse(localStorage.getItem("chatMessages"), {});
    const sanitizedMessages = sanitizeMessages(storedMessages);
    setAllMessages(sanitizedMessages);

    if (JSON.stringify(storedMessages) !== JSON.stringify(sanitizedMessages)) {
      localStorage.setItem("chatMessages", JSON.stringify(sanitizedMessages));
    }

    const storedMuted = safeParse(
      localStorage.getItem("closedMutedFriends"),
      []
    );
    setMutedFriendIds(Array.isArray(storedMuted) ? storedMuted.map(String) : []);
  }, [location.pathname]);

  useEffect(() => {
    const stored = safeParse(localStorage.getItem("closedSharedAccount"), null);

    if (stored?.id) {
      const normalized = {
        ...stored,
        id: String(stored.id),
        avatarImage:
          typeof stored.avatarImage === "string" &&
          stored.avatarImage.startsWith("data:")
            ? null
            : (stored.avatarImage ?? null),
      };
      setClosedIdentity(normalized);
      setEditedName(normalized.name || "");
      return;
    }

    const fallback = buildClosedIdentity(currentAccount);
    setClosedIdentity(fallback);
    setEditedName(fallback.name || "");
    localStorage.setItem("closedSharedAccount", JSON.stringify(fallback));
  }, [currentAccount]);

  const saveFriends = (updatedFriends) => {
    const sanitized = sanitizeFriends(updatedFriends);
    setFriends(sanitized);
    localStorage.setItem("closedFriends", JSON.stringify(sanitized));
  };

  const saveMessages = (updatedMessages) => {
    const sanitized = sanitizeMessages(updatedMessages);
    setAllMessages(sanitized);
    localStorage.setItem("chatMessages", JSON.stringify(sanitized));
  };

  const saveMutedFriendIds = (updatedMutedIds) => {
    const normalized = updatedMutedIds.map(String);
    setMutedFriendIds(normalized);
    localStorage.setItem("closedMutedFriends", JSON.stringify(normalized));
  };

  const isMuted = (friendId) => {
    return mutedFriendIds.includes(String(friendId));
  };

  const getLastMessage = (friendId) => {
    const messages = allMessages[friendId] || [];
    if (messages.length === 0) return "まだメッセージはありません";

    const last = messages[messages.length - 1];

    if (last.type === "stamp") return "スタンプを送信しました";
    if (last.type === "image") return "画像を送信しました";
    if (last.type === "file") return last.fileName || "ファイルを送信しました";

    return last.text || "メッセージ";
  };

  const getLastTime = (friendId) => {
    const messages = allMessages[friendId] || [];
    if (messages.length === 0) return "";

    const last = messages[messages.length - 1];
    return last.time || "";
  };

  const getLastTimestamp = (friendId) => {
    const messages = allMessages[friendId] || [];
    if (messages.length === 0) return 0;

    const last = messages[messages.length - 1];
    return last.timestamp || 0;
  };

  const getUnreadCount = (friendId) => {
    if (isMuted(friendId)) return 0;

    const messages = allMessages[friendId] || [];

    return messages.filter((msg) => {
      const isMine =
        String(msg.senderId ?? "") === String(closedIdentity?.id ?? "");
      return !isMine && msg.read === false;
    }).length;
  };

  const sortedFriends = useMemo(() => {
    const copied = [...friends];

    if (sortMode === "name") {
      return copied.sort((a, b) => a.name.localeCompare(b.name, "ja"));
    }

    return copied.sort(
      (a, b) => getLastTimestamp(b.id) - getLastTimestamp(a.id)
    );
  }, [friends, allMessages, sortMode]);

  const handleMarkAllRead = () => {
    const updatedMessages = { ...allMessages };

    Object.keys(updatedMessages).forEach((friendId) => {
      updatedMessages[friendId] = (updatedMessages[friendId] || []).map(
        (msg) => {
          const isMine =
            String(msg.senderId ?? "") === String(closedIdentity?.id ?? "");

          if (!isMine && msg.read !== true) {
            return {
              ...msg,
              read: true,
              readCount: 1,
            };
          }
          return msg;
        }
      );
    });

    saveMessages(updatedMessages);
    setMenuOpen(false);
  };

  const handleDeleteFriend = (friendId) => {
    const targetFriend = friends.find(
      (friend) => String(friend.id) === String(friendId)
    );
    const confirmDelete = window.confirm(
      `${targetFriend?.name || "このトーク"}を削除しますか？`
    );
    if (!confirmDelete) return;

    const updatedFriends = friends.filter(
      (friend) => String(friend.id) !== String(friendId)
    );

    const updatedMessages = { ...allMessages };
    delete updatedMessages[friendId];

    const updatedMutedIds = mutedFriendIds.filter(
      (id) => String(id) !== String(friendId)
    );

    saveFriends(updatedFriends);
    saveMessages(updatedMessages);
    saveMutedFriendIds(updatedMutedIds);

    setDeleteMode(false);
  };

  const handleToggleMute = (friendId) => {
    const friend = friends.find((item) => String(item.id) === String(friendId));
    const currentlyMuted = isMuted(friendId);

    const updatedMutedIds = currentlyMuted
      ? mutedFriendIds.filter((id) => String(id) !== String(friendId))
      : [...mutedFriendIds, String(friendId)];

    saveMutedFriendIds(updatedMutedIds);

    alert(
      currentlyMuted
        ? `${friend?.name || "このトーク"}のミュートを解除しました`
        : `${friend?.name || "このトーク"}をミュートしました`
    );

    setMuteMode(false);
  };

  const handleFriendClick = (friendId) => {
    if (deleteMode) {
      handleDeleteFriend(friendId);
      return;
    }

    if (muteMode) {
      handleToggleMute(friendId);
      return;
    }

    navigate(`/chat/${friendId}`);
  };

  const handleSaveName = () => {
    const nextName = editedName.trim();
    if (!nextName) return;

    const updatedClosedIdentity = {
      ...closedIdentity,
      name: nextName,
    };

    setClosedIdentity(updatedClosedIdentity);
    setEditedName(nextName);
    localStorage.setItem(
      "closedSharedAccount",
      JSON.stringify(updatedClosedIdentity)
    );
    localStorage.setItem(
      "personalAccount",
      JSON.stringify(updatedClosedIdentity)
    );

    setIsNameEditOpen(false);
  };

  return (
    <div className="closed-page">
      <header className="closed-header">
        <h1 className="app-logo">ROAD3</h1>

        <div className="closed-header-actions">
          <button
            className="icon-button"
            onClick={() => navigate("/friend-add")}
            aria-label="友だち追加"
            title="友だち追加"
          >
            ＋
          </button>

          <button
            className="icon-button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="メニュー"
            title="メニュー"
          >
            ☰
          </button>
        </div>

        {menuOpen && (
          <div className="closed-menu-popup">
            <button
              onClick={() => {
                setSortMode("latest");
                setMenuOpen(false);
                setDeleteMode(false);
                setMuteMode(false);
              }}
            >
              トーク並べ替え（最新順）
            </button>

            <button
              onClick={() => {
                setSortMode("name");
                setMenuOpen(false);
                setDeleteMode(false);
                setMuteMode(false);
              }}
            >
              トーク並べ替え（名前順）
            </button>

            <button onClick={handleMarkAllRead}>全件既読</button>

            <button
              onClick={() => {
                setMuteMode((prev) => !prev);
                setDeleteMode(false);
                setMenuOpen(false);
              }}
            >
              {muteMode ? "ミュート設定終了" : "ミュート設定"}
            </button>

            <button
              onClick={() => {
                setDeleteMode((prev) => !prev);
                setMuteMode(false);
                setMenuOpen(false);
              }}
            >
              {deleteMode ? "削除モード終了" : "トーク削除"}
            </button>
          </div>
        )}
      </header>

      <section className="closed-account-area">
        <div className="closed-account-row">
          <div className="closed-account-badge">
            {closedIdentity?.avatarImage ? (
              <img
                src={closedIdentity.avatarImage}
                alt={closedIdentity?.name || "avatar"}
                className="closed-account-badge avatar-image"
              />
            ) : (
              <span>{(closedIdentity?.name || "個").charAt(0)}</span>
            )}
          </div>

          <p className="closed-account-name">
            {closedIdentity?.name || "個人名"}
          </p>

          <button
            type="button"
            className="closed-account-edit"
            onClick={() => setIsNameEditOpen(true)}
            aria-label="名前変更"
            title="名前変更"
          >
            ✏️
          </button>
        </div>

        {deleteMode && (
          <p className="closed-mode-note">
            削除したいトークをタップしてください
          </p>
        )}

        {muteMode && (
          <p className="closed-mode-note">
            ミュート設定したいトークをタップしてください
          </p>
        )}

        {!deleteMode && !muteMode && sortMode === "latest" && (
          <p className="closed-mode-note subtle">並び順：最新順</p>
        )}

        {!deleteMode && !muteMode && sortMode === "name" && (
          <p className="closed-mode-note subtle">並び順：名前順</p>
        )}
      </section>

      <main className="friend-list">
        {sortedFriends.length === 0 ? (
          <div className="closed-empty">
            <p>まだ友だちがいません</p>
            <p className="closed-empty-sub">
              友だちを追加して、クローズな会話を始めよう
            </p>
            <button
              className="closed-empty-button"
              onClick={() => navigate("/friend-add")}
            >
              友だちを追加する
            </button>
          </div>
        ) : (
          sortedFriends.map((friend) => {
            const unreadCount = getUnreadCount(friend.id);
            const lastMessage = getLastMessage(friend.id);
            const lastTime = getLastTime(friend.id);
            const muted = isMuted(friend.id);

            return (
              <div
                key={friend.id}
                className={`friend-item ${
                  deleteMode ? "delete-mode" : ""
                } ${muteMode ? "mute-mode" : ""} ${
                  muted ? "muted-card" : ""
                }`}
                onClick={() => handleFriendClick(friend.id)}
              >
                <div className="friend-avatar">
                  {friend.avatarImage ? (
                    <img
                      src={friend.avatarImage}
                      alt={friend.name || "avatar"}
                      className="friend-avatar avatar-image"
                    />
                  ) : (
                    <span>{friend.avatar || friend.name?.charAt(0) || "友"}</span>
                  )}
                </div>

                <div className="friend-main">
                  <div className="friend-top-row">
                    <div className="friend-name-wrap">
                      <p className="friend-name">{friend.name}</p>
                      {muted && (
                        <span className="friend-muted-tag">🔕 ミュート中</span>
                      )}
                    </div>
                    <span className="friend-time">{lastTime}</span>
                  </div>

                  <div className="friend-bottom-row">
                    <p
                      className={`friend-last-message ${
                        muted ? "muted-text" : ""
                      }`}
                    >
                      {lastMessage}
                    </p>

                    {deleteMode ? (
                      <span className="friend-delete-badge">削除</span>
                    ) : muteMode ? (
                      <span className="friend-mute-badge">
                        {muted ? "解除" : "ミュート"}
                      </span>
                    ) : muted ? (
                      <span className="friend-muted-badge">🔕</span>
                    ) : (
                      unreadCount > 0 && (
                        <span className="friend-unread-badge">
                          {unreadCount}
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>

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
              className="layer-modal-item is-disabled"
              disabled
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
              <span className="layer-modal-arrow">現在地</span>
            </button>

            <button
              type="button"
              className="layer-modal-item"
              onClick={() => navigate("/personal")}
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
              <span className="layer-modal-arrow">›</span>
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

      {isNameEditOpen && (
        <div
          className="layer-modal-overlay"
          onClick={() => setIsNameEditOpen(false)}
        >
          <div
            className="layer-modal closed-name-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="layer-modal-title">名前変更</h3>

            <input
              className="closed-name-input"
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              placeholder="名前を入力"
            />

            <div className="closed-name-actions">
              <button
                type="button"
                className="closed-name-save"
                onClick={handleSaveName}
              >
                保存
              </button>

              <button
                type="button"
                className="layer-modal-close"
                onClick={() => setIsNameEditOpen(false)}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {isAccountOpen && (
        <div
          className="layer-modal-overlay"
          onClick={() => setIsAccountOpen(false)}
        >
          <div className="layer-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="layer-modal-title">アカウント管理</h3>

            <div className="account-list">
              <div className="account-item static">
                <div className="account-avatar">
                  {closedIdentity?.avatarImage ? (
                    <img
                      src={closedIdentity.avatarImage}
                      alt={closedIdentity?.name || "avatar"}
                      className="account-avatar-image"
                    />
                  ) : (
                    <span>{closedIdentity?.name?.charAt(0) || "?"}</span>
                  )}
                </div>

                <div className="account-meta">
                  <strong>{closedIdentity?.name}</strong>
                  <span>{closedIdentity?.handle || "@---"}</span>
                </div>
              </div>
            </div>

            <p className="closed-empty-sub">
              クローズスペースでは、パーソナル / クローズ共通アカウントを使います。
              オープン / グループ用アカウントの管理はパーソナルスペースから行えます。
            </p>

            <div className="modal-actions">
              <button
                type="button"
                className="modal-primary"
                onClick={() => {
                  setIsAccountOpen(false);
                  setIsNameEditOpen(true);
                }}
              >
                編集する
              </button>

              <button
                type="button"
                className="modal-secondary"
                onClick={() => setIsAccountOpen(false)}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      <FooterNav
  notifications={closedNotifications}
  onOpenSignals={() =>
    navigate("/activity/signals", { state: { from: "/closed" } })
  }
  onOpenSaved={() =>
    navigate("/activity/saved", { state: { from: "/closed" } })
  }
  onOpenAccount={() => setIsAccountOpen(true)}
  onOpenNotifications={() =>
  navigate("/activity/notifications", { state: { from: "/closed" } })
}
  onOpenLayer={() => setIsLayerOpen(true)}
/>
    </div>
  );
}

export default Closed;