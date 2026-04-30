import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./OtherProfile.css";

const R18_ENABLED_KEY = "r18Enabled";
const OPEN_POSTS_KEY = "openPosts";
const OPEN_R18_POSTS_KEY = "openR18Posts";
const CURRENT_ACCOUNT_ID_KEY = "currentAccountId";
const CURRENT_OPEN_GROUP_ACCOUNT_ID_KEY = "currentOpenGroupAccountId";

function safeParse(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
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

function resolveCurrentAccount(pathname) {
  const isOpenGroupLikePage =
    pathname.startsWith("/open") ||
    pathname.startsWith("/group") ||
    pathname.startsWith("/activity") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/dm") ||
    pathname.startsWith("/search") ||
    pathname.startsWith("/quote-resignal") ||
    pathname.startsWith("/signal/");

  if (isOpenGroupLikePage) {
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
  }

  const accounts = safeParse(localStorage.getItem("accounts"), []);
  const currentAccountId = localStorage.getItem(CURRENT_ACCOUNT_ID_KEY);

  if (Array.isArray(accounts) && accounts.length > 0) {
    const matched = accounts.find(
      (acc) => String(acc?.id) === String(currentAccountId)
    );
    return normalizeAccount(matched || accounts[0]);
  }

  const personalAccount = safeParse(localStorage.getItem("personalAccount"), null);
  if (personalAccount?.id) {
    return normalizeAccount(personalAccount);
  }

  return null;
}

function formatDateTime(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function formatJoinedDate(value) {
  if (!value) return "未設定";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return String(value);
  }
}

function findReplyCountByScanning(postId) {
  if (postId === undefined || postId === null) return 0;

  let total = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith("signalReplies-")) continue;

    const replies = safeParse(localStorage.getItem(key), []);
    if (!Array.isArray(replies)) continue;

    const matched = replies.filter(
      (reply) => String(reply?.parentId) === String(postId)
    );

    total += matched.length;
  }

  return total;
}

function normalizePost(post, fallbackUser) {
  const fallbackName = fallbackUser?.name || "名前未設定";
  const fallbackHandle =
    fallbackUser?.userId || fallbackUser?.handle || "@unknown";
  const fallbackAccountId =
    fallbackUser?.id ||
    String(fallbackHandle).replace(/^@/, "") ||
    "unknown_user";

  const resolvedName = post?.author ?? post?.userName ?? post?.name ?? fallbackName;
  const resolvedHandle = post?.handle ?? post?.userId ?? fallbackHandle;

  const fallbackReplyCount = Number(post?.replyCount ?? post?.comments ?? 0);
  const scannedReplyCount = findReplyCountByScanning(post?.id);
  const finalReplyCount =
    scannedReplyCount > 0 ? scannedReplyCount : fallbackReplyCount;

  return {
    ...post,
    id: post?.id ?? `${Date.now()}-${Math.random()}`,
    accountId: post?.accountId ?? fallbackAccountId,
    author: resolvedName,
    userName: resolvedName,
    name: resolvedName,
    handle: resolvedHandle,
    userId: resolvedHandle,
    avatarImage: post?.avatarImage ?? post?.profileImage ?? "",
    profileImage: post?.profileImage ?? post?.avatarImage ?? "",
    avatar:
      post?.avatar ??
      post?.icon ??
      resolvedName?.charAt(0) ??
      "?",
    icon:
      post?.icon ??
      post?.avatar ??
      resolvedName?.charAt(0) ??
      "?",
    text: post?.text ?? post?.content ?? "本文なし",
    content: post?.content ?? post?.text ?? "本文なし",
    timestamp: post?.timestamp ?? post?.createdAt ?? Date.now(),
    createdAt: post?.createdAt ?? post?.timestamp ?? Date.now(),
    tags: Array.isArray(post?.tags) ? post.tags : [],
    image: post?.image ?? (Array.isArray(post?.media) ? post.media[0] : null),
    media: Array.isArray(post?.media)
      ? post.media
      : post?.image
      ? [post.image]
      : [],
    likeCount: Number(post?.likeCount ?? post?.likes ?? 0),
    likes: Number(post?.likes ?? post?.likeCount ?? 0),
    replyCount: finalReplyCount,
    comments: finalReplyCount,
    resignalCount: Number(post?.resignalCount ?? post?.resignals ?? 0),
    resignals: Number(post?.resignals ?? post?.resignalCount ?? 0),
    liked: Boolean(post?.liked),
    saved: Boolean(post?.saved),
    resignaled: Boolean(post?.resignaled),
    isR18: Boolean(post?.isR18),
    isReply: Boolean(post?.isReply || post?.replyToName || post?.replyToUserId),
  };
}

function readPosts(key) {
  return safeParse(localStorage.getItem(key), {});
}

function savePosts(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export default function OtherProfile() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentAccount = useMemo(() => {
    return resolveCurrentAccount(location.pathname);
  }, [location.pathname]);

  const isR18Enabled = localStorage.getItem(R18_ENABLED_KEY) === "true";

  const rawUser = location.state?.user || {
    id: "sample_user",
    name: "ユーザー名",
    userId: "@sample_user",
    handle: "@sample_user",
    bio: "ここに自己紹介文が入ります。",
    following: 0,
    followers: 0,
    place: "未設定",
    links: [],
    birthday: "非公開",
    joined: Date.now(),
    tags: [],
    avatarImage: "",
    avatar: "U",
  };

  const user = {
    ...rawUser,
    id:
      rawUser.id ||
      String(rawUser.userId || rawUser.handle || "").replace(/^@/, "") ||
      "unknown_user",
    handle: rawUser.handle || rawUser.userId || "@unknown_user",
    userId: rawUser.userId || rawUser.handle || "@unknown_user",
    avatarImage: rawUser.avatarImage || rawUser.profileImage || "",
    avatar:
      rawUser.avatar ||
      rawUser.icon ||
      rawUser.name?.charAt(0) ||
      "?",
  };

  const [activeTab, setActiveTab] = useState("signal");
  const [showMenu, setShowMenu] = useState(false);
  const [signalOn, setSignalOn] = useState(true);
  const [openPostState, setOpenPostState] = useState(() =>
    safeParse(localStorage.getItem(OPEN_POSTS_KEY), {})
  );
  const [openR18PostState, setOpenR18PostState] = useState(() =>
    safeParse(localStorage.getItem(OPEN_R18_POSTS_KEY), {})
  );

  const followKey = currentAccount
    ? `follow-${currentAccount.id}-${user.id}`
    : null;

  const followerStorageKey = `followers-count-${user.id}`;

  const [isFollowing, setIsFollowing] = useState(() => {
    if (!followKey) return false;
    return localStorage.getItem(followKey) === "true";
  });

  const [followerCount, setFollowerCount] = useState(() => {
    const saved = localStorage.getItem(followerStorageKey);
    if (saved !== null) return Number(saved);
    return user.followers ?? 0;
  });

  useEffect(() => {
    const syncPosts = () => {
      setOpenPostState(safeParse(localStorage.getItem(OPEN_POSTS_KEY), {}));
      setOpenR18PostState(safeParse(localStorage.getItem(OPEN_R18_POSTS_KEY), {}));
    };

    syncPosts();

    window.addEventListener("focus", syncPosts);
    window.addEventListener("storage", syncPosts);
    window.addEventListener("pageshow", syncPosts);

    return () => {
      window.removeEventListener("focus", syncPosts);
      window.removeEventListener("storage", syncPosts);
      window.removeEventListener("pageshow", syncPosts);
    };
  }, []);

  useEffect(() => {
    if (!followKey) {
      setIsFollowing(false);
      return;
    }
    setIsFollowing(localStorage.getItem(followKey) === "true");
  }, [followKey]);

  const signalPosts = useMemo(() => {
    const mine = Array.isArray(openPostState[user.id]) ? openPostState[user.id] : [];

    return mine
      .filter(Boolean)
      .filter((post) => !post.isR18)
      .map((post) => normalizePost(post, user))
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [openPostState, user]);

  const replyPosts = useMemo(() => {
    return signalPosts.filter((post) => post.isReply);
  }, [signalPosts]);

  const mediaPosts = useMemo(() => {
    return signalPosts.filter((post) => post.image && !post.video);
  }, [signalPosts]);

  const videoPosts = useMemo(() => {
    return signalPosts.filter((post) => post.video);
  }, [signalPosts]);

  const r18Posts = useMemo(() => {
    const targetPosts = Array.isArray(openR18PostState[user.id])
      ? openR18PostState[user.id]
      : [];

    return targetPosts
      .filter(Boolean)
      .map((post) => ({
        ...normalizePost(post, user),
        isR18: true,
      }))
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [openR18PostState, user]);

  const tabs = useMemo(() => {
    const baseTabs = [
      { key: "signal", label: "シグナル", count: signalPosts.length },
      { key: "reply", label: "返信", count: replyPosts.length },
      { key: "media", label: "メディア", count: mediaPosts.length },
      { key: "video", label: "動画", count: videoPosts.length },
    ];

    if (isR18Enabled) {
      baseTabs.push({ key: "r18", label: "R18", count: r18Posts.length });
    }

    return baseTabs;
  }, [signalPosts, replyPosts, mediaPosts, videoPosts, r18Posts, isR18Enabled]);

  const currentPosts =
    activeTab === "r18"
      ? r18Posts
      : activeTab === "reply"
      ? replyPosts
      : activeTab === "media"
      ? mediaPosts
      : activeTab === "video"
      ? videoPosts
      : signalPosts;

  const handleToggleFollow = () => {
    if (!currentAccount) return;

    const nextFollowing = !isFollowing;
    const nextFollowerCount = nextFollowing
      ? followerCount + 1
      : Math.max(0, followerCount - 1);

    setIsFollowing(nextFollowing);
    setFollowerCount(nextFollowerCount);

    if (followKey) {
      localStorage.setItem(followKey, String(nextFollowing));
    }
    localStorage.setItem(followerStorageKey, String(nextFollowerCount));

    const myFollowingKey = `followingList-${currentAccount.id}`;
    const targetFollowersKey = `followersList-${user.id}`;

    const currentFollowingList = safeParse(
      localStorage.getItem(myFollowingKey),
      []
    );
    const currentFollowersList = safeParse(
      localStorage.getItem(targetFollowersKey),
      []
    );

    const followUserData = {
      id: user.id,
      name: user.name,
      userId: user.userId,
      handle: user.handle,
      bio: user.bio || "自己紹介はまだありません。",
      following: user.following ?? 0,
      followers: nextFollowerCount,
      place: user.place || "未設定",
      links: user.links || [],
      birthday: user.birthday || "非公開",
      joined: user.joined || "ROAD3利用開始日",
      tags: user.tags || [],
      avatar: user.avatar || (user.name || "?").charAt(0),
      avatarImage: user.avatarImage || "",
    };

    const meData = {
      id: currentAccount.id,
      name: currentAccount.name || "ユーザー",
      userId: currentAccount.handle || `@${currentAccount.id}`,
      handle: currentAccount.handle || `@${currentAccount.id}`,
      avatar: currentAccount.avatar || (currentAccount.name || "?").charAt(0),
      avatarImage: currentAccount.avatarImage || currentAccount.profileImage || "",
    };

    if (nextFollowing) {
      const nextFollowingList = currentFollowingList.some(
        (item) => String(item.id) === String(user.id)
      )
        ? currentFollowingList
        : [followUserData, ...currentFollowingList];

      const nextFollowersList = currentFollowersList.some(
        (item) => String(item.id) === String(currentAccount.id)
      )
        ? currentFollowersList
        : [meData, ...currentFollowersList];

      localStorage.setItem(myFollowingKey, JSON.stringify(nextFollowingList));
      localStorage.setItem(targetFollowersKey, JSON.stringify(nextFollowersList));
    } else {
      const nextFollowingList = currentFollowingList.filter(
        (item) => String(item.id) !== String(user.id)
      );
      const nextFollowersList = currentFollowersList.filter(
        (item) => String(item.id) !== String(currentAccount.id)
      );

      localStorage.setItem(myFollowingKey, JSON.stringify(nextFollowingList));
      localStorage.setItem(targetFollowersKey, JSON.stringify(nextFollowersList));
    }

    if (nextFollowing && String(currentAccount.id) !== String(user.id)) {
      const currentNotifications = safeParse(
        localStorage.getItem("notifications"),
        []
      );

      const nextNotifications = [
        {
          id: Date.now(),
          accountId: user.id,
          type: "follow",
          from: currentAccount.name || "ユーザー",
          fromUser: currentAccount.name || "ユーザー",
          fromUserId: currentAccount.handle || `@${currentAccount.id}`,
          link: `/profile/user/${encodeURIComponent(currentAccount.id)}`,
          read: false,
          isRead: false,
          createdAt: Date.now(),
        },
        ...currentNotifications,
      ].slice(0, 250);

      localStorage.setItem("notifications", JSON.stringify(nextNotifications));
    }
  };

  const handleOpenDM = () => {
    const savedChats = safeParse(localStorage.getItem("dmChats"), []);
    const targetId = String(user.userId);
    const existingChat = savedChats.find(
      (chat) => String(chat.userId) === targetId
    );

    if (existingChat) {
      navigate(`/dm/chat/${encodeURIComponent(existingChat.userId)}`, {
        state: {
          chat: existingChat,
          from: "other-profile",
        },
      });
      return;
    }

    const newChat = {
      userId: user.userId,
      name: user.name,
      handle: user.userId,
      time: "",
      lastMessage: "",
      unread: 0,
      updatedAt: Date.now(),
      messages: [],
    };

    const updatedChats = [newChat, ...savedChats];
    localStorage.setItem("dmChats", JSON.stringify(updatedChats));

    navigate(`/dm/chat/${encodeURIComponent(newChat.userId)}`, {
      state: {
        chat: newChat,
        from: "other-profile",
      },
    });
  };

  const handleToggleLike = (post) => {
    if (!currentAccount?.id) return;

    const storageKey = post.isR18 ? OPEN_R18_POSTS_KEY : OPEN_POSTS_KEY;
    const stored = readPosts(storageKey);
    const myId = String(currentAccount.id);

    const updated = Object.fromEntries(
      Object.entries(stored).map(([accountId, list]) => [
        accountId,
        (Array.isArray(list) ? list : []).map((item) => {
          if (String(item.id) !== String(post.id)) return item;

          const likedUserIds = Array.isArray(item.likedUserIds)
            ? item.likedUserIds.map(String)
            : [];

          const alreadyLiked = likedUserIds.includes(myId);
          const nextLikedUserIds = alreadyLiked
            ? likedUserIds.filter((id) => id !== myId)
            : [...likedUserIds, myId];

          return {
            ...item,
            likedUserIds: nextLikedUserIds,
            liked: !alreadyLiked,
            likeCount: nextLikedUserIds.length,
            likes: nextLikedUserIds.length,
          };
        }),
      ])
    );

    savePosts(storageKey, updated);

    const myLikedKey = `likedPosts-${myId}`;
    const likedPostsStored = safeParse(localStorage.getItem(myLikedKey), []);
    const exists = likedPostsStored.some((p) => String(p.id) === String(post.id));
    const targetAfter = Object.values(updated)
      .flat()
      .find((p) => String(p.id) === String(post.id));

    const targetLiked = Array.isArray(targetAfter?.likedUserIds)
      ? targetAfter.likedUserIds.map(String).includes(myId)
      : false;

    if (targetAfter && targetLiked && !exists) {
      localStorage.setItem(
        myLikedKey,
        JSON.stringify([targetAfter, ...likedPostsStored])
      );
    }

    if (!targetLiked && exists) {
      localStorage.setItem(
        myLikedKey,
        JSON.stringify(
          likedPostsStored.filter((p) => String(p.id) !== String(post.id))
        )
      );
    }

    setOpenPostState(safeParse(localStorage.getItem(OPEN_POSTS_KEY), {}));
    setOpenR18PostState(safeParse(localStorage.getItem(OPEN_R18_POSTS_KEY), {}));
  };

  const handleToggleResignal = (post) => {
    if (!currentAccount?.id) return;

    const storageKey = post.isR18 ? OPEN_R18_POSTS_KEY : OPEN_POSTS_KEY;
    const stored = readPosts(storageKey);
    const myId = String(currentAccount.id);
    const myPostsList = Array.isArray(stored[myId]) ? stored[myId] : [];

    const existingResignal = myPostsList.find(
      (item) =>
        item?.isResignal &&
        String(item?.originalPost?.id) === String(post.id)
    );

    let updated = { ...stored };

    if (existingResignal) {
      updated[myId] = myPostsList.filter(
        (item) => String(item.id) !== String(existingResignal.id)
      );

      updated = Object.fromEntries(
        Object.entries(updated).map(([accountId, list]) => [
          accountId,
          (Array.isArray(list) ? list : []).map((item) => {
            if (String(item.id) !== String(post.id)) return item;
            const nextCount = Math.max(
              Number(item.resignalCount ?? item.resignals ?? 0) - 1,
              0
            );
            return {
              ...item,
              resignaled: false,
              resignalCount: nextCount,
              resignals: nextCount,
            };
          }),
        ])
      );
    } else {
      const now = Date.now();

      const resignalPost = {
        id: now,
        accountId: currentAccount.id,
        author: currentAccount.name || "名前未設定",
        userName: currentAccount.name || "名前未設定",
        name: currentAccount.name || "名前未設定",
        handle: currentAccount.handle || `@${currentAccount.id}`,
        userId: currentAccount.handle || `@${currentAccount.id}`,
        avatarImage: currentAccount.avatarImage || currentAccount.profileImage || "",
        profileImage: currentAccount.avatarImage || currentAccount.profileImage || "",
        avatar:
          currentAccount.avatar ||
          currentAccount.name?.charAt(0) ||
          "G",
        icon:
          currentAccount.avatar ||
          currentAccount.name?.charAt(0) ||
          "G",
        text: "",
        content: "",
        timestamp: now,
        createdAt: now,
        tags: [],
        media: [],
        image: null,
        likeCount: 0,
        likes: 0,
        liked: false,
        likedUserIds: [],
        saved: false,
        replyCount: 0,
        comments: 0,
        resignalCount: 0,
        resignals: 0,
        resignaled: true,
        isResignal: true,
        isQuoteResignal: false,
        isR18: Boolean(post.isR18),
        originalPost: {
          ...post,
          author: post.author || post.name,
          userName: post.userName || post.author || post.name,
          name: post.name || post.author || post.userName,
          handle: post.handle || post.userId,
          userId: post.userId || post.handle,
          avatarImage: post.avatarImage || post.profileImage || "",
          profileImage: post.profileImage || post.avatarImage || "",
          avatar: post.avatar || post.name?.charAt(0) || "?",
          text: post.text || post.content || "",
          content: post.content || post.text || "",
        },
      };

      updated[myId] = [resignalPost, ...myPostsList];

      updated = Object.fromEntries(
        Object.entries(updated).map(([accountId, list]) => [
          accountId,
          (Array.isArray(list) ? list : []).map((item) => {
            if (String(item.id) !== String(post.id)) return item;
            const nextCount = Number(item.resignalCount ?? item.resignals ?? 0) + 1;
            return {
              ...item,
              resignaled: true,
              resignalCount: nextCount,
              resignals: nextCount,
            };
          }),
        ])
      );
    }

    savePosts(storageKey, updated);
    setOpenPostState(safeParse(localStorage.getItem(OPEN_POSTS_KEY), {}));
    setOpenR18PostState(safeParse(localStorage.getItem(OPEN_R18_POSTS_KEY), {}));
  };

  const renderSignalCard = (post, { r18 = false } = {}) => {
    const liked = Array.isArray(post.likedUserIds)
      ? post.likedUserIds.map(String).includes(String(currentAccount?.id || ""))
      : false;

    return (
      <div
        key={post.id}
        className={`profile-signalCard ${
          r18 ? "profile-postCard-r18" : ""
        }`}
        onClick={() =>
          navigate(`/signal/${post.id}`, {
            state: { post, from: location.pathname },
          })
        }
      >
        {r18 && <div className="profile-r18-badge">#R-18</div>}

        <div className="profile-signalHead">
          <div className="profile-signalUser">
            <div className="profile-signalAvatar">
              {post.avatarImage || post.profileImage ? (
                <img
                  src={post.avatarImage || post.profileImage}
                  alt="avatar"
                  className="profile-signalAvatarImage"
                />
              ) : (
                (post.avatar || post.author || post.name || "?").charAt(0)
              )}
            </div>

            <div className="profile-signalMeta">
              <strong>{post.author || post.name || "名前未設定"}</strong>
              <span>{post.userId || post.handle}</span>
            </div>
          </div>

          <span className="profile-signalTime">
            {formatDateTime(post.timestamp)}
          </span>
        </div>

        <p className="profile-signalText">{post.text || "本文なし"}</p>

        {post.tags && post.tags.length > 0 && (
          <div className="profile-postTags">
            {post.tags.map((tag) => (
              <span key={`${post.id}-${tag}`} className="profile-postTag">
                #{String(tag).replace(/^#/, "")}
              </span>
            ))}
          </div>
        )}

        <div className="profile-signalActions" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="profile-signalActionBtn">
            💬 {post.replyCount ?? post.comments ?? 0}
          </button>

          <button
            type="button"
            className={`profile-signalActionBtn ${
              post.resignaled ? "active" : ""
            }`}
            onClick={() => handleToggleResignal(post)}
          >
            🔁 {post.resignalCount ?? post.resignals ?? 0}
          </button>

          <button
            type="button"
            className={`profile-signalActionBtn ${
              liked ? "active liked" : ""
            }`}
            onClick={() => handleToggleLike(post)}
          >
            ❤️ {post.likeCount ?? post.likes ?? 0}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="other-profile-page">
      <div className="other-profile-container">
        <header className="profile-header-area">
          <button className="icon-button" onClick={() => navigate(-1)}>
            ←
          </button>

          <div className="header-actions">
            <button className="icon-button" onClick={handleOpenDM}>
              ✉
            </button>

            <button
              className="icon-button"
              onClick={() => setShowMenu(!showMenu)}
            >
              ⋯
            </button>
          </div>

          {showMenu && (
            <div className="profile-menu-popup">
              <button className="menu-item">プロフィールを共有</button>

              <button
                className="menu-item"
                onClick={() => setSignalOn(!signalOn)}
              >
                シグナル通知 {signalOn ? "OFFにする" : "ONにする"}
              </button>

              <button className="menu-item">ミュート</button>

              <div className="menu-divider"></div>

              <button className="menu-item danger">ブロック</button>
              <button className="menu-item danger">報告</button>
            </div>
          )}
        </header>

        <div className="profile-banner"></div>

        <section className="profile-main">
          <div className="profile-top-row">
            <div className="profile-icon">
              {user.avatarImage ? (
                <img
                  src={user.avatarImage}
                  alt="avatar"
                  className="other-profile-icon-image"
                />
              ) : (
                (user.avatar || user.name || "?").charAt(0)
              )}
            </div>

            <div className="profile-main-actions">
              <button
                className={`follow-button ${isFollowing ? "following" : ""}`}
                onClick={handleToggleFollow}
              >
                {isFollowing ? "フォロー中" : "フォロー"}
              </button>
            </div>
          </div>

          <div className="profile-basic-info">
            <h2 className="profile-name">{user.name}</h2>
            <p className="profile-id">{user.userId}</p>
            <p className="profile-bio">{user.bio}</p>

            {isR18Enabled && r18Posts.length > 0 && (
              <div className="other-profile-r18-mode-badge">
                R18投稿あり
              </div>
            )}
          </div>

          <div className="profile-follow-info">
            <span>
              <strong>{user.following}</strong> フォロー
            </span>
            <span>
              <strong>{followerCount}</strong> フォロワー
            </span>
          </div>

          <div className="profile-detail-list">
            <p>📍 {user.place || "未設定"}</p>
            <p>
              🔗 {user.links && user.links.length > 0 ? user.links.join(" / ") : "未設定"}
            </p>
            <p>🎂 {user.birthday || "非公開"}</p>
            <p>📅 {formatJoinedDate(user.joined)}</p>
          </div>

          <div className="profile-tags">
            <p className="section-label">よく使うタグ</p>
            <div className="tag-list">
              {user.tags && user.tags.length > 0 ? (
                user.tags.map((tag, index) => (
                  <span className="tag" key={index}>
                    {tag}
                  </span>
                ))
              ) : (
                <span className="tag">#Now</span>
              )}
            </div>
          </div>
        </section>

        <section className="profile-tabs profile-tabs-scroll">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`tab-button ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label} {tab.count}
            </button>
          ))}
        </section>

        <section className="profile-post-list profile-post-list-scroll">
          {currentPosts.length === 0 ? (
            <div className="other-profile-empty">
              {activeTab === "r18"
                ? "R18投稿はまだありません。"
                : "投稿はまだありません。"}
            </div>
          ) : (
            currentPosts.map((post) =>
              renderSignalCard(post, {
                r18: activeTab === "r18",
              })
            )
          )}
        </section>
      </div>
    </div>
  );
}