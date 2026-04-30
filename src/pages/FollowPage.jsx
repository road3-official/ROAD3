import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./FollowPage.css";

const CURRENT_OPEN_GROUP_ACCOUNT_ID_KEY = "currentOpenGroupAccountId";

function safeParse(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function getSearchTab(search) {
  const params = new URLSearchParams(search);
  const tab = params.get("tab");
  return tab === "followers" ? "followers" : "following";
}

function normalizeAccount(account) {
  if (!account || typeof account !== "object") return null;
  if (account.id === undefined || account.id === null || account.id === "") {
    return null;
  }

  return {
    ...account,
    id: String(account.id),
    name: account.name || "ユーザー",
    handle: account.handle || account.userId || `@${account.id}`,
    userId: account.userId || account.handle || `@${account.id}`,
    avatar: account.avatar || account.name?.charAt(0) || "U",
    avatarImage: account.avatarImage || account.profileImage || "",
    profileImage: account.profileImage || account.avatarImage || "",
  };
}

function resolveCurrentAccount() {
  const openGroupAccounts = safeParse(
    localStorage.getItem("openGroupAccounts"),
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

  const legacyCurrent = safeParse(localStorage.getItem("currentAccount"), null);
  if (legacyCurrent?.id) {
    return normalizeAccount(legacyCurrent);
  }

  return null;
}

function sanitizeUser(user) {
  return {
    ...user,
    id: String(user.id),
    name: user.name || "名前未設定",
    userId: user.userId || user.handle || `@${user.id}`,
    handle: user.handle || user.userId || `@${user.id}`,
    bio: user.bio || "自己紹介はまだありません。",
    following: user.following ?? 0,
    followers: user.followers ?? 0,
    place: user.place || "未設定",
    links: user.links || [],
    birthday: user.birthday || "非公開",
    joined: user.joined || "ROAD3利用開始日",
    tags: user.tags || [],
    avatar: user.avatar || user.name?.charAt(0) || "?",
    avatarImage: user.avatarImage || user.profileImage || "",
    profileImage: user.profileImage || user.avatarImage || "",
  };
}

export default function FollowPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState(getSearchTab(location.search));
  const [keyword, setKeyword] = useState("");
  const [currentAccount, setCurrentAccount] = useState(() => resolveCurrentAccount());

  const [followingUsers, setFollowingUsers] = useState([]);
  const [followerUsers, setFollowerUsers] = useState([]);

  useEffect(() => {
    setActiveTab(getSearchTab(location.search));
  }, [location.search]);

  useEffect(() => {
    const syncCurrent = () => {
      setCurrentAccount(resolveCurrentAccount());
    };

    syncCurrent();
    window.addEventListener("storage", syncCurrent);

    return () => {
      window.removeEventListener("storage", syncCurrent);
    };
  }, []);

  const currentId = String(currentAccount?.id || "");
  const fromPath = location.state?.from || "/profile";
  const profileReturnTo =
    location.state?.profileReturnTo || location.state?.from || "/open";

  useEffect(() => {
    if (!currentId) {
      setFollowingUsers([]);
      setFollowerUsers([]);
      return;
    }

    const following = safeParse(localStorage.getItem(`followingList-${currentId}`), []);
    const followers = safeParse(localStorage.getItem(`followersList-${currentId}`), []);

    setFollowingUsers(Array.isArray(following) ? following.map(sanitizeUser) : []);
    setFollowerUsers(Array.isArray(followers) ? followers.map(sanitizeUser) : []);
  }, [currentId]);

  const visibleUsers = useMemo(() => {
    const base = activeTab === "followers" ? followerUsers : followingUsers;
    const q = keyword.trim().toLowerCase();

    if (!q) return base;

    return base.filter((user) => {
      const name = String(user.name || "").toLowerCase();
      const handle = String(
        user.userId || user.handle || `@${user.id}`
      ).toLowerCase();
      return name.includes(q) || handle.includes(q);
    });
  }, [activeTab, followerUsers, followingUsers, keyword]);

  const handleBack = () => {
    navigate("/profile", {
      replace: true,
      state: { from: profileReturnTo },
    });
  };

  const updateTab = (tab) => {
    setActiveTab(tab);

    const nextUrl = `/profile/follow?tab=${tab}`;
    window.history.replaceState(
      {
        ...(window.history.state || {}),
        usr: {
          ...(window.history.state?.usr || {}),
          from: fromPath,
          profileReturnTo,
        },
      },
      "",
      nextUrl
    );
  };

  const refreshFollowLists = () => {
    if (!currentId) return;

    const nextFollowing = safeParse(
      localStorage.getItem(`followingList-${currentId}`),
      []
    );
    const nextFollowers = safeParse(
      localStorage.getItem(`followersList-${currentId}`),
      []
    );

    setFollowingUsers(
      Array.isArray(nextFollowing) ? nextFollowing.map(sanitizeUser) : []
    );
    setFollowerUsers(
      Array.isArray(nextFollowers) ? nextFollowers.map(sanitizeUser) : []
    );
  };

  const toggleFollow = (targetUser) => {
    if (!currentId) return;

    const targetId = String(targetUser.id);
    if (targetId === currentId) return;

    const myFollowingKey = `followingList-${currentId}`;
    const targetFollowersKey = `followersList-${targetId}`;
    const followKey = `follow-${currentId}-${targetId}`;
    const targetFollowerCountKey = `followers-count-${targetId}`;

    const currentFollowingList = safeParse(
      localStorage.getItem(myFollowingKey),
      []
    );
    const currentFollowersList = safeParse(
      localStorage.getItem(targetFollowersKey),
      []
    );

    const alreadyFollowing = currentFollowingList.some(
      (item) => String(item.id) === targetId
    );

    const meData = {
      id: currentAccount.id,
      name: currentAccount.name || "ユーザー",
      userId: currentAccount.handle || `@${currentAccount.id}`,
      handle: currentAccount.handle || `@${currentAccount.id}`,
      avatar: currentAccount.avatar || currentAccount.name?.charAt(0) || "U",
      avatarImage:
        currentAccount.avatarImage || currentAccount.profileImage || "",
    };

    if (alreadyFollowing) {
      const nextFollowingList = currentFollowingList.filter(
        (item) => String(item.id) !== targetId
      );
      const nextFollowersList = currentFollowersList.filter(
        (item) => String(item.id) !== currentId
      );

      localStorage.setItem(myFollowingKey, JSON.stringify(nextFollowingList));
      localStorage.setItem(targetFollowersKey, JSON.stringify(nextFollowersList));
      localStorage.setItem(followKey, "false");

      const currentCount = Number(
        localStorage.getItem(targetFollowerCountKey) ??
          targetUser.followers ??
          0
      );
      localStorage.setItem(
        targetFollowerCountKey,
        String(Math.max(0, currentCount - 1))
      );
    } else {
      const normalizedTargetUser = sanitizeUser(targetUser);

      const nextFollowingList = currentFollowingList.some(
        (item) => String(item.id) === targetId
      )
        ? currentFollowingList
        : [normalizedTargetUser, ...currentFollowingList];

      const nextFollowersList = currentFollowersList.some(
        (item) => String(item.id) === currentId
      )
        ? currentFollowersList
        : [meData, ...currentFollowersList];

      localStorage.setItem(myFollowingKey, JSON.stringify(nextFollowingList));
      localStorage.setItem(targetFollowersKey, JSON.stringify(nextFollowersList));
      localStorage.setItem(followKey, "true");

      const currentCount = Number(
        localStorage.getItem(targetFollowerCountKey) ??
          targetUser.followers ??
          0
      );
      localStorage.setItem(targetFollowerCountKey, String(currentCount + 1));
    }

    refreshFollowLists();
  };

  const openProfile = (user) => {
    const targetId = String(user.id);

    if (targetId === currentId) {
      navigate("/profile");
      return;
    }

    navigate(`/profile/user/${targetId}`, {
      state: {
        from: "/profile/follow",
        profileReturnTo,
        user: {
          id: user.id,
          name: user.name || "名前未設定",
          userId: user.userId || user.handle || `@${user.id}`,
          handle: user.handle || user.userId || `@${user.id}`,
          bio: user.bio || "自己紹介はまだありません。",
          following: user.following ?? 0,
          followers:
            Number(localStorage.getItem(`followers-count-${user.id}`)) ||
            user.followers ||
            0,
          place: user.place || "未設定",
          links: user.links || [],
          birthday: user.birthday || "非公開",
          joined: user.joined || "ROAD3利用開始日",
          tags: user.tags || [],
          avatar: user.avatar || user.name?.charAt(0) || "?",
          avatarImage: user.avatarImage || user.profileImage || "",
          profileImage: user.profileImage || user.avatarImage || "",
        },
      },
    });
  };

  const getRelationshipText = (targetId) => {
    const target = String(targetId);
    const iFollow = followingUsers.some((user) => String(user.id) === target);
    const followsMe = followerUsers.some((user) => String(user.id) === target);

    if (iFollow && followsMe) return "相互";
    if (iFollow) return "フォロー中";
    if (followsMe) return "フォロワー";
    return "";
  };

  if (!currentAccount) {
    return (
      <div className="followPage-page">
        <div className="followPage-topbar">
          <button
            type="button"
            className="followPage-back"
            onClick={handleBack}
          >
            ← 戻る
          </button>
          <h2 className="followPage-title">フォロー</h2>
          <div className="followPage-right" />
        </div>

        <div className="followPage-empty">
          アカウント情報が見つかりません。
        </div>
      </div>
    );
  }

  return (
    <div className="followPage-page">
      <div className="followPage-topbar">
        <button
          type="button"
          className="followPage-back"
          onClick={handleBack}
        >
          ← 戻る
        </button>

        <h2 className="followPage-title">フォロー / フォロワー</h2>

        <div className="followPage-right" />
      </div>

      <div className="followPage-content">
        <div className="followPage-searchWrap">
          <input
            type="text"
            className="followPage-search"
            placeholder="@ID / ユーザー名で検索"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        <div className="followPage-tabs">
          <button
            type="button"
            className={`followPage-tab ${
              activeTab === "followers" ? "active" : ""
            }`}
            onClick={() => updateTab("followers")}
          >
            フォロワー {followerUsers.length}
          </button>

          <button
            type="button"
            className={`followPage-tab ${
              activeTab === "following" ? "active" : ""
            }`}
            onClick={() => updateTab("following")}
          >
            フォロー中 {followingUsers.length}
          </button>
        </div>

        <div className="followPage-list">
          {visibleUsers.length === 0 ? (
            <div className="followPage-empty">
              {activeTab === "followers"
                ? "フォロワーはいません。"
                : "フォロー中のユーザーはいません。"}
            </div>
          ) : (
            visibleUsers.map((user) => {
              const userId = String(user.id);
              const isFollowing = followingUsers.some(
                (item) => String(item.id) === userId
              );

              return (
                <div key={user.id} className="followPage-item">
                  <button
                    type="button"
                    className="followPage-userArea"
                    onClick={() => openProfile(user)}
                  >
                    <div className="followPage-avatar">
                      {user.avatarImage ? (
                        <img
                          src={user.avatarImage}
                          alt={user.name || "avatar"}
                          className="followPage-avatar-image"
                        />
                      ) : (
                        (user.name || "?").charAt(0)
                      )}
                    </div>

                    <div className="followPage-meta">
                      <div className="followPage-nameRow">
                        <strong>{user.name || "名前未設定"}</strong>
                      </div>
                      <span>{user.userId || user.handle || `@${user.id}`}</span>
                      {getRelationshipText(user.id) && (
                        <small>{getRelationshipText(user.id)}</small>
                      )}
                    </div>
                  </button>

                  {userId !== currentId && (
                    <button
                      type="button"
                      className={`followPage-followBtn ${
                        isFollowing ? "following" : ""
                      }`}
                      onClick={() => toggleFollow(user)}
                    >
                      {isFollowing ? "フォロー中" : "フォローする"}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}