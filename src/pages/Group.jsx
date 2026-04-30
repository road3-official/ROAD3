import { useEffect, useMemo, useState } from "react";
import "./Group.css";
import GroupPage from "./GroupPage";

function Group({
  currentAccount,
  setNotifications,
  setHideBottomNavForComposer,
  setHideBottomNav,
}) {
  const [searchWord, setSearchWord] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [isReady, setIsReady] = useState(false);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [leaveTarget, setLeaveTarget] = useState(null);

  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [newGroupIcon, setNewGroupIcon] = useState("");
  const [newGroupIsPrivate, setNewGroupIsPrivate] = useState(false);

  const defaultGroups = useMemo(() => [], []);
  const defaultInvites = useMemo(() => [], []);

  const [groups, setGroups] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);

  useEffect(() => {
    const storedGroups = localStorage.getItem("groupListData");
    const storedInvites = localStorage.getItem("groupPendingInvites");

    const legacyGroupNames = [
      "ROAD3開発チーム",
      "博士のたまり場",
      "創作と配信の会",
      "インフラ研究メモ",
      "お悩み相談室",
    ];

    const legacyInviteNames = ["SF好きの会", "研究雑談ラボ"];

    let parsedGroups = defaultGroups;

    if (storedGroups) {
      try {
        const rawGroups = JSON.parse(storedGroups);
        const safeGroups = Array.isArray(rawGroups) ? rawGroups : [];

        const cleanedGroups = safeGroups
          .filter((group) => !legacyGroupNames.includes(group?.name))
          .map((group) => ({
            ...group,
            isPrivate: Boolean(group?.isPrivate),
          }));

        parsedGroups = cleanedGroups;
        setGroups(cleanedGroups);

        if (JSON.stringify(cleanedGroups) !== JSON.stringify(safeGroups)) {
          localStorage.setItem("groupListData", JSON.stringify(cleanedGroups));
        }
      } catch (error) {
        console.error("group list parse error:", error);
        parsedGroups = defaultGroups;
        setGroups(defaultGroups);
      }
    } else {
      setGroups(defaultGroups);
    }

    if (storedInvites) {
      try {
        const rawInvites = JSON.parse(storedInvites);
        const safeInvites = Array.isArray(rawInvites) ? rawInvites : [];

        const cleanedInvites = safeInvites
          .filter((invite) => !legacyInviteNames.includes(invite?.name))
          .map((invite) => ({
            ...invite,
            isPrivate: Boolean(invite?.isPrivate),
          }));

        setPendingInvites(cleanedInvites);

        if (JSON.stringify(cleanedInvites) !== JSON.stringify(safeInvites)) {
          localStorage.setItem(
            "groupPendingInvites",
            JSON.stringify(cleanedInvites)
          );
        }
      } catch (error) {
        console.error("group invites parse error:", error);
        setPendingInvites(defaultInvites);
      }
    } else {
      setPendingInvites(defaultInvites);
    }

    setSelectedGroup(null);
    localStorage.removeItem("selectedGroupId");
    setIsReady(true);
  }, [defaultGroups, defaultInvites]);

  useEffect(() => {
    if (!isReady) return;
    localStorage.setItem("groupListData", JSON.stringify(groups));
  }, [groups, isReady]);

  useEffect(() => {
    if (!isReady) return;
    localStorage.setItem("groupPendingInvites", JSON.stringify(pendingInvites));
  }, [pendingInvites, isReady]);

  useEffect(() => {
    localStorage.removeItem("selectedGroupId");
  }, [selectedGroup]);

  useEffect(() => {
    setHideBottomNav(!!selectedGroup);
    return () => setHideBottomNav(false);
  }, [selectedGroup, setHideBottomNav]);

  useEffect(() => {
    return () => {
      setHideBottomNavForComposer(false);
    };
  }, [setHideBottomNavForComposer]);

  const getInitial = (name) => {
    return name?.charAt(0) || "G";
  };

  const getGroupIconLabel = (group) => {
    return group?.icon || getInitial(group?.name);
  };

  const getAccountInitial = () => {
    return currentAccount?.name?.charAt(0) || "ユ";
  };

  const getAccountImage = () => {
    const candidates = [
      currentAccount?.avatar,
      currentAccount?.avatarUrl,
      currentAccount?.icon,
      currentAccount?.iconUrl,
      currentAccount?.photo,
      currentAccount?.photoURL,
      currentAccount?.image,
      currentAccount?.imageUrl,
      currentAccount?.avatarImage,
      currentAccount?.profileImage,
    ];

    const found = candidates.find(
      (value) => typeof value === "string" && value.trim() !== ""
    );

    return found || "";
  };

  const accountImage = getAccountImage();

  const handleOpenGroup = (group) => {
    const updatedGroups = groups.map((item) =>
      item.id === group.id ? { ...item, unread: 0 } : item
    );

    setGroups(updatedGroups);

    const openedGroup =
      updatedGroups.find((item) => item.id === group.id) || group;

    setSelectedGroup(openedGroup);
  };

  const resetCreateForm = () => {
    setNewGroupName("");
    setNewGroupDescription("");
    setNewGroupIcon("");
    setNewGroupIsPrivate(false);
  };

  const handleCreateGroup = () => {
    const trimmedName = newGroupName.trim();
    const trimmedDescription = newGroupDescription.trim();
    const trimmedIcon = newGroupIcon.trim();

    if (!trimmedName) return;

    const newGroup = {
      id: Date.now(),
      name: trimmedName,
      latest: "#雑談 が最新",
      unread: 0,
      description: trimmedDescription,
      icon: trimmedIcon || trimmedName.charAt(0) || "G",
      isPrivate: Boolean(newGroupIsPrivate),
    };

    const updatedGroups = [newGroup, ...groups];
    setGroups(updatedGroups);

    localStorage.setItem(
      `groupChannels_${newGroup.id}`,
      JSON.stringify(["雑談"])
    );
    localStorage.setItem(
      `groupPosts_${newGroup.id}`,
      JSON.stringify({ 雑談: [] })
    );

    resetCreateForm();
    setIsCreateModalOpen(false);
    setMenuOpen(false);
    setSelectedGroup(newGroup);
  };

  const handleAcceptInvite = (invite) => {
    const newGroup = {
      id: Date.now(),
      name: invite.name,
      latest: "#雑談 が最新",
      unread: 0,
      description: invite.description || "",
      icon: invite.icon || getInitial(invite.name),
      isPrivate: Boolean(invite.isPrivate),
    };

    setGroups((prev) => [newGroup, ...prev]);
    setPendingInvites((prev) => prev.filter((item) => item.id !== invite.id));

    localStorage.setItem(
      `groupChannels_${newGroup.id}`,
      JSON.stringify(["雑談"])
    );
    localStorage.setItem(
      `groupPosts_${newGroup.id}`,
      JSON.stringify({ 雑談: [] })
    );
  };

  const handleDeclineInvite = (inviteId) => {
    setPendingInvites((prev) => prev.filter((item) => item.id !== inviteId));
  };

  const moveGroup = (index, direction) => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= groups.length) return;

    const updated = [...groups];
    const [movedItem] = updated.splice(index, 1);
    updated.splice(newIndex, 0, movedItem);
    setGroups(updated);
  };

  const handleLeaveGroup = () => {
    if (!leaveTarget) return;

    const updated = groups.filter((g) => g.id !== leaveTarget.id);
    setGroups(updated);

    localStorage.removeItem(`groupChannels_${leaveTarget.id}`);
    localStorage.removeItem(`groupPosts_${leaveTarget.id}`);

    if (selectedGroup?.id === leaveTarget.id) {
      setSelectedGroup(null);
    }

    setLeaveTarget(null);
    setIsLeaveModalOpen(false);
  };

  const handleUpdateGroup = (updatedGroup) => {
    const normalizedGroup = {
      ...updatedGroup,
      isPrivate: Boolean(updatedGroup?.isPrivate),
    };

    setGroups((prev) =>
      prev.map((group) =>
        group.id === normalizedGroup.id ? { ...group, ...normalizedGroup } : group
      )
    );
    setSelectedGroup(normalizedGroup);
  };

  const filteredGroups = useMemo(() => {
  const keyword = searchWord.trim().toLowerCase();

  if (!keyword) return groups;

  return groups.filter((group) =>
    group.name.toLowerCase().includes(keyword)
  );
}, [groups, searchWord]);

  if (selectedGroup) {
    return (
      <GroupPage
        group={selectedGroup}
        onBack={() => setSelectedGroup(null)}
        onUpdateGroup={handleUpdateGroup}
        setHideBottomNavForComposer={setHideBottomNavForComposer}
        setNotifications={setNotifications}
        currentAccount={currentAccount}
      />
    );
  }

  return (
    <div className="group-page">
      <header className="group-header">
        <div className="group-account-area" aria-label="現在のアカウント">
          {accountImage ? (
            <>
              <img
                src={accountImage}
                alt={currentAccount?.name || "アカウント"}
                className="group-account-avatar"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const fallback = e.currentTarget.parentElement?.querySelector(
                    ".group-account-fallback"
                  );
                  if (fallback) fallback.style.display = "flex";
                }}
              />
              <div
                className="group-account-avatar group-account-fallback"
                style={{ display: "none" }}
              >
                {getAccountInitial()}
              </div>
            </>
          ) : (
            <div className="group-account-avatar group-account-fallback">
              {getAccountInitial()}
            </div>
          )}
        </div>

        <h1 className="app-logo">ROAD3</h1>

        <div className="group-menu-wrapper">
          <button
            className="group-header-btn"
            type="button"
            aria-label="メニュー"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            ⋯
          </button>

          {menuOpen && (
            <div className="group-menu">
              <button
                type="button"
                className="group-menu-item"
                onClick={() => {
                  setIsCreateModalOpen(true);
                  setMenuOpen(false);
                }}
              >
                グループ作成
              </button>

              <button
                type="button"
                className="group-menu-item"
                onClick={() => {
                  setIsSortModalOpen(true);
                  setMenuOpen(false);
                }}
              >
                グループ並べ替え
              </button>

              <button
                type="button"
                className="group-menu-item"
                onClick={() => {
                  setIsLeaveModalOpen(true);
                  setMenuOpen(false);
                }}
              >
                グループ退会
              </button>

              <button
                type="button"
                className="group-menu-item"
                onClick={() => {
                  setIsInviteModalOpen(true);
                  setMenuOpen(false);
                }}
              >
                グループ招待待ち
                {pendingInvites.length > 0 && (
                  <span className="group-menu-badge">
                    {pendingInvites.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                className="group-menu-item"
                onClick={() => {
                  setIsSettingsOpen(true);
                  setMenuOpen(false);
                }}
              >
                設定
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="group-main">
        <section className="group-search-section">
          <input
            type="text"
            className="group-search"
            placeholder="公開グループを検索"
            value={searchWord}
            onChange={(e) => setSearchWord(e.target.value)}
          />
          <p className="group-search-note">
  参加中のグループを検索できます
</p>
        </section>

        <section className="group-list-section">
          <div className="group-section-header">
            <h2>参加中のグループ</h2>
            <p>
              {currentAccount?.name
                ? `${currentAccount.name}さんのグループ`
                : ""}
            </p>
          </div>

          {groups.length === 0 ? (
            <div className="group-empty group-empty-large">
              <p className="group-empty-title">まだグループがありません</p>
              <p className="group-empty-sub">
                グループを作成して、仲間と会話を始めましょう
              </p>
              <button
                type="button"
                className="group-create-first-btn"
                onClick={() => setIsCreateModalOpen(true)}
              >
                ＋ グループを作成
              </button>
            </div>
          ) : (
            <div className="group-list">
              {filteredGroups.length > 0 ? (
                filteredGroups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    className="group-card"
                    onClick={() => handleOpenGroup(group)}
                  >
                    <div className="group-card-icon">
                      {getGroupIconLabel(group)}
                    </div>

                    <div className="group-card-body">
                      <div className="group-card-top">
                        <h3 className="group-card-name">
                          {group.name}
                          {group.isPrivate && (
                            <span className="group-private-badge">🔒</span>
                          )}
                        </h3>
                        {group.unread > 0 && (
                          <span className="group-card-badge">{group.unread}</span>
                        )}
                      </div>

                      <p className="group-card-latest">
                        {group.isPrivate
                          ? "招待された人だけが参加できる非公開グループ"
                          : group.latest}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="group-empty">
                  <p>該当する公開グループがありません</p>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {isCreateModalOpen && (
        <div
          className="group-invite-modal-overlay"
          onClick={() => {
            setIsCreateModalOpen(false);
            resetCreateForm();
          }}
        >
          <div
            className="group-invite-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="group-invite-modal-header">
              <h3>グループ作成</h3>
              <button
                type="button"
                className="group-invite-close-btn"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  resetCreateForm();
                }}
              >
                ×
              </button>
            </div>

            <div className="group-invite-modal-body">
              <div className="group-create-form">
                <label className="group-create-label">
                  グループ名
                  <input
                    type="text"
                    className="group-create-input"
                    placeholder="グループ名を入力"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    maxLength={40}
                  />
                </label>

                <label className="group-create-label">
                  グループアイコン（1〜2文字推奨）
                  <input
                    type="text"
                    className="group-create-input"
                    placeholder="例：開 / 研 / 🎨"
                    value={newGroupIcon}
                    onChange={(e) => setNewGroupIcon(e.target.value)}
                    maxLength={2}
                  />
                </label>

                <label className="group-create-label">
                  グループ説明（任意）
                  <textarea
                    className="group-create-textarea"
                    placeholder="どんなグループか一言で"
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    maxLength={120}
                    rows={4}
                  />
                </label>

                <div className="group-privacy-box">
                  <p className="group-create-label">公開設定</p>

                  <div className="group-privacy-toggle">
                    <button
                      type="button"
                      className={`group-privacy-btn ${
                        !newGroupIsPrivate ? "active" : ""
                      }`}
                      onClick={() => setNewGroupIsPrivate(false)}
                    >
                      公開
                    </button>

                    <button
                      type="button"
                      className={`group-privacy-btn ${
                        newGroupIsPrivate ? "active" : ""
                      }`}
                      onClick={() => setNewGroupIsPrivate(true)}
                    >
                      非公開 🔒
                    </button>
                  </div>

                  <p className="group-privacy-note">
                    非公開グループは検索に表示されず、招待された人だけが参加できます。
                  </p>
                </div>
              </div>

              <div className="group-leave-actions">
                <button
                  type="button"
                  className="group-invite-decline"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    resetCreateForm();
                  }}
                >
                  キャンセル
                </button>

                <button
                  type="button"
                  className="group-invite-accept"
                  disabled={!newGroupName.trim()}
                  onClick={handleCreateGroup}
                >
                  作成する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isInviteModalOpen && (
        <div
          className="group-invite-modal-overlay"
          onClick={() => setIsInviteModalOpen(false)}
        >
          <div
            className="group-invite-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="group-invite-modal-header">
              <h3>グループ招待待ち</h3>
              <button
                type="button"
                className="group-invite-close-btn"
                onClick={() => setIsInviteModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="group-invite-modal-body">
              {pendingInvites.length > 0 ? (
                pendingInvites.map((invite) => (
                  <div className="group-invite-card" key={invite.id}>
                    <div className="group-invite-info">
                      <div className="group-invite-icon">
                        {invite.icon || getInitial(invite.name)}
                      </div>
                      <div className="group-invite-text">
                        <h4>
                          {invite.name}
                          {invite.isPrivate && (
                            <span className="group-private-badge">🔒</span>
                          )}
                        </h4>
                        <p>
                          {invite.from} からの招待
                          {invite.isPrivate
                            ? " ・ 非公開グループ"
                            : ""}
                        </p>
                      </div>
                    </div>

                    <div className="group-invite-actions">
                      <button
                        type="button"
                        className="group-invite-decline"
                        onClick={() => handleDeclineInvite(invite.id)}
                      >
                        辞退
                      </button>
                      <button
                        type="button"
                        className="group-invite-accept"
                        onClick={() => handleAcceptInvite(invite)}
                      >
                        承認
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="group-empty">
                  <p>現在、招待待ちはありません</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isSortModalOpen && (
        <div
          className="group-invite-modal-overlay"
          onClick={() => setIsSortModalOpen(false)}
        >
          <div
            className="group-invite-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="group-invite-modal-header">
              <h3>グループ並べ替え</h3>
              <button
                type="button"
                className="group-invite-close-btn"
                onClick={() => setIsSortModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="group-invite-modal-body">
              {groups.length > 0 ? (
                groups.map((group, index) => (
                  <div className="group-sort-card" key={group.id}>
                    <div className="group-invite-info">
                      <div className="group-invite-icon">
                        {getGroupIconLabel(group)}
                      </div>
                      <div className="group-invite-text">
                        <h4>
                          {group.name}
                          {group.isPrivate && (
                            <span className="group-private-badge">🔒</span>
                          )}
                        </h4>
                        <p>{group.latest}</p>
                      </div>
                    </div>

                    <div className="group-sort-actions">
                      <button
                        type="button"
                        className="group-sort-btn"
                        onClick={() => moveGroup(index, "up")}
                        disabled={index === 0}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="group-sort-btn"
                        onClick={() => moveGroup(index, "down")}
                        disabled={index === groups.length - 1}
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="group-empty">
                  <p>並べ替えできるグループがありません</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isLeaveModalOpen && (
        <div
          className="group-invite-modal-overlay"
          onClick={() => {
            setIsLeaveModalOpen(false);
            setLeaveTarget(null);
          }}
        >
          <div
            className="group-invite-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="group-invite-modal-header">
              <h3>グループ退会</h3>
              <button
                type="button"
                className="group-invite-close-btn"
                onClick={() => {
                  setIsLeaveModalOpen(false);
                  setLeaveTarget(null);
                }}
              >
                ×
              </button>
            </div>

            <div className="group-invite-modal-body">
              {groups.length > 0 ? (
                groups.map((group) => (
                  <div
                    key={group.id}
                    className={`group-leave-card ${
                      leaveTarget?.id === group.id ? "active" : ""
                    }`}
                    onClick={() => setLeaveTarget(group)}
                  >
                    <div className="group-invite-info">
                      <div className="group-invite-icon">
                        {getGroupIconLabel(group)}
                      </div>
                      <div className="group-invite-text">
                        <h4>
                          {group.name}
                          {group.isPrivate && (
                            <span className="group-private-badge">🔒</span>
                          )}
                        </h4>
                        <p>{group.latest}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="group-empty">
                  <p>参加中のグループがありません</p>
                </div>
              )}

              <div className="group-leave-actions">
                <button
                  type="button"
                  className="group-invite-decline"
                  onClick={() => {
                    setIsLeaveModalOpen(false);
                    setLeaveTarget(null);
                  }}
                >
                  キャンセル
                </button>

                <button
                  type="button"
                  className="group-leave-confirm"
                  disabled={!leaveTarget}
                  onClick={handleLeaveGroup}
                >
                  退会する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isSettingsOpen && (
        <div
          className="group-invite-modal-overlay"
          onClick={() => setIsSettingsOpen(false)}
        >
          <div
            className="group-invite-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="group-invite-modal-header">
              <h3>グループ設定</h3>
              <button
                type="button"
                className="group-invite-close-btn"
                onClick={() => setIsSettingsOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="group-invite-modal-body">
              <div className="group-empty group-empty-large">
                <p className="group-empty-title">設定は準備中です</p>
                <p className="group-empty-sub">
                  今後ここに、表示や通知などの設定を追加予定です
                </p>
                <button
                  type="button"
                  className="group-create-first-btn"
                  onClick={() => setIsSettingsOpen(false)}
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Group;