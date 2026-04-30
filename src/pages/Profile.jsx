import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Profile.css";

const R18_ENABLED_KEY = "r18Enabled";
const OPEN_POSTS_KEY = "openPosts";
const OPEN_R18_POSTS_KEY = "openR18Posts";
const GROUP_POSTS_KEY = "groupPosts";
const CLOSED_POSTS_KEY = "closedPosts";
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

function formatJoinedDate(value) {
  if (!value) return "未設定";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return String(value);
  }
}

function formatDateTime(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function normalizePost(post, replyCountMap = {}) {
  const fallbackReplyCount = Number(post?.replyCount ?? post?.comments ?? 0);
  const scannedReplyCount = Number(replyCountMap[String(post?.id)] ?? 0);
  const finalReplyCount =
    scannedReplyCount > 0 ? scannedReplyCount : fallbackReplyCount;

  return {
    ...post,
    id: post?.id ?? `${Date.now()}-${Math.random()}`,
    accountId: post?.accountId ?? "",
    author: post?.author ?? post?.userName ?? post?.name ?? "名前未設定",
    userName: post?.userName ?? post?.author ?? post?.name ?? "名前未設定",
    name: post?.name ?? post?.author ?? post?.userName ?? "名前未設定",
    handle: post?.handle ?? post?.userId ?? (post?.accountId ?? "---"),
    userId: post?.userId ?? post?.handle ?? `@${post?.accountId ?? "---"}`,
    avatarImage: post?.avatarImage ?? post?.profileImage ?? "",
    profileImage: post?.profileImage ?? post?.avatarImage ?? "",
    avatar:
      post?.avatar ??
      post?.icon ??
      post?.name?.charAt(0) ??
      post?.author?.charAt(0) ??
      "?",
    text: post?.text ?? post?.content ?? "本文なし",
    content: post?.content ?? post?.text ?? "本文なし",
    timestamp: post?.timestamp ?? post?.createdAt ?? Date.now(),
    createdAt: post?.createdAt ?? post?.timestamp ?? Date.now(),
    tags: Array.isArray(post?.tags) ? post.tags : [],
    media: Array.isArray(post?.media)
      ? post.media
      : post?.image
      ? [post.image]
      : [],
    image: post?.image ?? (Array.isArray(post?.media) ? post.media[0] : null),
    video: post?.video ?? null,
    replyCount: finalReplyCount,
    comments: finalReplyCount,
    resignalCount: Number(post?.resignalCount ?? post?.resignals ?? 0),
    resignals: Number(post?.resignals ?? post?.resignalCount ?? 0),
    likeCount: Number(post?.likeCount ?? post?.likes ?? 0),
    likes: Number(post?.likes ?? post?.likeCount ?? 0),
    saved: Boolean(post?.saved),
    likedUserIds: Array.isArray(post?.likedUserIds) ? post.likedUserIds : [],
    resignaled: Boolean(post?.resignaled),
    isR18: Boolean(post?.isR18),
    isReply: Boolean(post?.isReply || post?.replyToName || post?.replyToUserId),
  };
}

function findPostStorage(post) {
  if (post?.isR18) return OPEN_R18_POSTS_KEY;
  return OPEN_POSTS_KEY;
}

function readPosts(key) {
  return safeParse(localStorage.getItem(key), {});
}

function savePosts(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function collectPostsForAccount(accountId) {
  if (!accountId) {
    return {
      regularPosts: [],
      r18Posts: [],
    };
  }

  const open = safeParse(localStorage.getItem(OPEN_POSTS_KEY), {});
  const group = safeParse(localStorage.getItem(GROUP_POSTS_KEY), {});
  const closed = safeParse(localStorage.getItem(CLOSED_POSTS_KEY), {});
  const openR18 = safeParse(localStorage.getItem(OPEN_R18_POSTS_KEY), {});

  const regularPosts = [
    ...(Array.isArray(open[accountId]) ? open[accountId] : []),
    ...(Array.isArray(group[accountId]) ? group[accountId] : []),
    ...(Array.isArray(closed[accountId]) ? closed[accountId] : []),
  ].filter(Boolean);

  const r18Posts = (Array.isArray(openR18[accountId]) ? openR18[accountId] : []).filter(
    Boolean
  );

  return {
    regularPosts,
    r18Posts,
  };
}

function buildReplyIndex(myPosts) {
  const myPostIds = new Set(myPosts.map((post) => String(post?.id)));
  const parentPostMap = new Map(
    myPosts.map((post) => [String(post?.id), post])
  );

  const replyCountMap = {};
  const incomingReplies = [];

  if (myPostIds.size === 0) {
    return { replyCountMap, incomingReplies };
  }

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith("signalReplies-")) continue;

    const replies = safeParse(localStorage.getItem(key), []);
    if (!Array.isArray(replies)) continue;

    replies.forEach((reply) => {
      const parentId = String(reply?.parentId ?? "");
      if (!myPostIds.has(parentId)) return;

      replyCountMap[parentId] = Number(replyCountMap[parentId] ?? 0) + 1;

      const parentPost = parentPostMap.get(parentId) || null;

      incomingReplies.push({
        ...reply,
        id: reply?.id ?? `${Date.now()}-${Math.random()}`,
        name: reply?.name ?? "名前未設定",
        author: reply?.name ?? "名前未設定",
        userName: reply?.name ?? "名前未設定",
        handle: reply?.handle ?? reply?.userId ?? "@unknown",
        userId: reply?.userId ?? reply?.handle ?? "@unknown",
        avatarImage: reply?.avatarImage ?? reply?.profileImage ?? "",
        profileImage: reply?.profileImage ?? reply?.avatarImage ?? "",
        avatar:
          reply?.avatar ??
          reply?.icon ??
          reply?.name?.charAt(0) ??
          "?",
        text: reply?.text ?? reply?.content ?? "本文なし",
        content: reply?.content ?? reply?.text ?? "本文なし",
        timestamp: reply?.timestamp ?? reply?.createdAt ?? Date.now(),
        createdAt: reply?.createdAt ?? reply?.timestamp ?? Date.now(),
        tags: Array.isArray(reply?.tags) ? reply.tags : [],
        media: Array.isArray(reply?.media)
          ? reply.media
          : reply?.image
          ? [reply.image]
          : [],
        image:
          reply?.image ??
          (Array.isArray(reply?.media) ? reply.media[0] : null),
        replyCount: Number(reply?.replyCount ?? reply?.comments ?? 0),
        comments: Number(reply?.comments ?? reply?.replyCount ?? 0),
        resignalCount: Number(reply?.resignalCount ?? reply?.resignals ?? 0),
        resignals: Number(reply?.resignals ?? reply?.resignalCount ?? 0),
        likeCount: Number(reply?.likeCount ?? reply?.likes ?? 0),
        likes: Number(reply?.likes ?? reply?.likeCount ?? 0),
        isIncomingReply: true,
        parentPostId: parentId,
        parentPost,
        parentPostAuthor:
          parentPost?.author ?? parentPost?.name ?? "名前未設定",
        parentPostText:
          parentPost?.text ?? parentPost?.content ?? "本文なし",
      });
    });
  }

  incomingReplies.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  return { replyCountMap, incomingReplies };
}

function buildProfileSnapshot(accountId) {
  const { regularPosts, r18Posts } = collectPostsForAccount(accountId);

  return {
    regularPosts,
    r18Posts,
    likedPosts: safeParse(localStorage.getItem(`likedPosts-${accountId}`), []),
    savedPostsById: safeParse(localStorage.getItem(`savedPosts-${accountId}`), []),
    savedPostsLegacy: safeParse(localStorage.getItem("savedPosts"), []),
  };
}

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("signals");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const currentAccount = useMemo(
    () => resolveCurrentAccount(location.pathname),
    [location.pathname]
  );
  const currentId = String(currentAccount?.id || "");

  const [snapshot, setSnapshot] = useState(() => buildProfileSnapshot(currentId));

  const isR18Enabled = localStorage.getItem(R18_ENABLED_KEY) === "true";

  const followingCount = safeParse(
    localStorage.getItem(`followingList-${currentId}`),
    []
  ).length;

  const followerCount = safeParse(
    localStorage.getItem(`followersList-${currentId}`),
    []
  ).length;

  const profileSettings = useMemo(
    () => safeParse(localStorage.getItem("profileSettings"), {}),
    []
  );

  const syncProfilePosts = () => {
    setSnapshot(buildProfileSnapshot(currentId));
  };

  useEffect(() => {
    syncProfilePosts();

    const handleStorage = () => {
      syncProfilePosts();
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [currentId]);

  const replyFeatures = useMemo(() => {
    const needsReplyData =
      activeTab === "signals" ||
      activeTab === "replies" ||
      activeTab === "media" ||
      activeTab === "videos" ||
      Boolean(profileSettings?.[currentAccount?.id]?.pinnedPostId);

    if (!needsReplyData) {
      return {
        replyCountMap: {},
        incomingReplies: [],
      };
    }

    return buildReplyIndex(snapshot.regularPosts);
  }, [activeTab, snapshot.regularPosts, profileSettings, currentAccount]);

  const myPosts = useMemo(() => {
    if (!currentAccount?.id) return [];
    return snapshot.regularPosts
      .filter((post) => !post.isR18)
      .map((post) => normalizePost(post, replyFeatures.replyCountMap))
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [snapshot.regularPosts, replyFeatures.replyCountMap, currentAccount]);

  const r18Posts = useMemo(() => {
    if (activeTab !== "r18") return [];
    return snapshot.r18Posts
      .map((post) => ({
        ...normalizePost(post, replyFeatures.replyCountMap),
        isR18: true,
      }))
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [activeTab, snapshot.r18Posts, replyFeatures.replyCountMap]);

  const incomingReplies = useMemo(() => {
    if (activeTab !== "replies") return [];
    return replyFeatures.incomingReplies;
  }, [activeTab, replyFeatures]);

  const mediaPosts = useMemo(() => {
    if (activeTab !== "media") return [];
    return myPosts.filter((post) => post.image && !post.video);
  }, [activeTab, myPosts]);

  const videoPosts = useMemo(() => {
    if (activeTab !== "videos") return [];
    return myPosts.filter((post) => post.video);
  }, [activeTab, myPosts]);

  const likedPosts = useMemo(() => {
    if (activeTab !== "likes") return [];
    return snapshot.likedPosts
      .filter(Boolean)
      .map((post) => normalizePost(post, replyFeatures.replyCountMap))
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [activeTab, snapshot.likedPosts, replyFeatures.replyCountMap]);

  const savedPosts = useMemo(() => {
    if (activeTab !== "saved") return [];
    const source =
      snapshot.savedPostsById.length > 0
        ? snapshot.savedPostsById
        : snapshot.savedPostsLegacy;

    return source
      .filter(Boolean)
      .map((post) => normalizePost(post, replyFeatures.replyCountMap))
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [
    activeTab,
    snapshot.savedPostsById,
    snapshot.savedPostsLegacy,
    replyFeatures.replyCountMap,
  ]);

  const profile = useMemo(() => {
    const byAccount = profileSettings?.[currentAccount?.id] || {};

    return {
      displayName: currentAccount?.name || "名前未設定",
      handle: currentAccount?.handle || currentAccount?.id || "---",
      bio: byAccount.bio || "自己紹介はまだありません。",
      place: byAccount.place || "未設定",
      birthday: byAccount.birthday || "未設定",
      birthdayVisibility: byAccount.birthdayVisibility || "非公開",
      joinedAt: byAccount.joinedAt || currentAccount?.createdAt || Date.now(),
      links: Array.isArray(byAccount.links)
        ? byAccount.links.filter(Boolean).slice(0, 3)
        : [],
      favoriteTags: Array.isArray(byAccount.favoriteTags)
        ? byAccount.favoriteTags.slice(0, 5)
        : [],
      showFollowCounts:
        typeof byAccount.showFollowCounts === "boolean"
          ? byAccount.showFollowCounts
          : true,
      headerImage: byAccount.headerImage || "",
      avatarImage: byAccount.avatarImage || currentAccount?.avatarImage || "",
      pinnedPostId: byAccount.pinnedPostId || null,
      isPrivate: !!byAccount.isPrivate,
    };
  }, [profileSettings, currentAccount]);

  const pinnedPost = useMemo(() => {
    if (!profile.pinnedPostId) return null;
    return (
      myPosts.find((post) => String(post.id) === String(profile.pinnedPostId)) ||
      null
    );
  }, [profile, myPosts]);

  const currentTabItems = useMemo(() => {
    switch (activeTab) {
      case "signals":
        return myPosts;
      case "replies":
        return incomingReplies;
      case "media":
        return mediaPosts;
      case "videos":
        return videoPosts;
      case "likes":
        return likedPosts;
      case "saved":
        return savedPosts;
      case "r18":
        return r18Posts;
      default:
        return myPosts;
    }
  }, [
    activeTab,
    myPosts,
    incomingReplies,
    mediaPosts,
    videoPosts,
    likedPosts,
    savedPosts,
    r18Posts,
  ]);

  const tabLabelMap = {
    signals: "シグナル",
    replies: "返信",
    media: "メディア",
    videos: "動画",
    likes: "いいね",
    saved: "保存",
    r18: "R18",
  };

  const handleToggleLike = (post) => {
    if (!currentAccount?.id) return;

    const storageKey = findPostStorage(post);
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

    syncProfilePosts();
  };

  const handleToggleSave = (post) => {
    if (!currentAccount?.id) return;

    const storageKey = findPostStorage(post);
    const stored = readPosts(storageKey);

    const updated = Object.fromEntries(
      Object.entries(stored).map(([accountId, list]) => [
        accountId,
        (Array.isArray(list) ? list : []).map((item) => {
          if (String(item.id) !== String(post.id)) return item;

          return {
            ...item,
            saved: !Boolean(item.saved),
          };
        }),
      ])
    );

    savePosts(storageKey, updated);

    const mySavedKey = `savedPosts-${currentId}`;
    const savedPostsStored = safeParse(localStorage.getItem(mySavedKey), []);
    const exists = savedPostsStored.some((p) => String(p.id) === String(post.id));
    const targetAfter = Object.values(updated)
      .flat()
      .find((p) => String(p.id) === String(post.id));

    if (targetAfter?.saved && !exists) {
      localStorage.setItem(
        mySavedKey,
        JSON.stringify([targetAfter, ...savedPostsStored])
      );
    }

    if (!targetAfter?.saved && exists) {
      localStorage.setItem(
        mySavedKey,
        JSON.stringify(
          savedPostsStored.filter((p) => String(p.id) !== String(post.id))
        )
      );
    }

    syncProfilePosts();
  };

  const handleToggleResignal = (post) => {
    if (!currentAccount?.id) return;

    const storageKey = findPostStorage(post);

    if (storageKey !== OPEN_POSTS_KEY && storageKey !== OPEN_R18_POSTS_KEY) {
      window.alert("このカードではまだリシグナルできません");
      return;
    }

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
        avatarImage: currentAccount.avatarImage || "",
        profileImage: currentAccount.avatarImage || "",
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
    syncProfilePosts();
  };

  const handleBack = () => {
    const fromPath = location.state?.from;

    if (fromPath) {
      navigate(fromPath, { replace: true });
      return;
    }

    navigate(-1);
  };

  if (!currentAccount) {
    return (
      <div className="profile-page">
        <div className="profile-topbar">
          <button
            type="button"
            className="profile-back"
            onClick={handleBack}
          >
            ← 戻る
          </button>
          <h2 className="profile-title">プロフィール</h2>
          <div className="profile-topbarRight" />
        </div>

        <div className="profile-emptyWrap">
          <div className="profile-emptyCard">
            アカウント情報が見つかりません。
          </div>
        </div>
      </div>
    );
  }

  const renderProfileSignalCard = (post, { r18 = false } = {}) => {
    const liked = Array.isArray(post.likedUserIds)
      ? post.likedUserIds.map(String).includes(currentId)
      : false;

    return (
      <div
        key={post.id}
        className={`profile-signalCard ${r18 ? "profile-postCard-r18" : ""}`}
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
              <span>
                @{String(post.userId || post.handle).replace(/^@/, "")}
              </span>
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

        <div
          className="profile-signalActions"
          onClick={(e) => e.stopPropagation()}
        >
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

          <button
            type="button"
            className={`profile-signalActionBtn ${post.saved ? "active" : ""}`}
            onClick={() => handleToggleSave(post)}
          >
            🔖
          </button>
        </div>
      </div>
    );
  };

  const renderIncomingReplyCard = (reply) => (
    <button
      type="button"
      key={reply.id}
      className="profile-postCard"
      onClick={() =>
        navigate(`/signal/${reply.parentPostId}`, {
          state: { post: reply.parentPost, from: location.pathname },
        })
      }
    >
      <div className="profile-postCardHead">
        <strong>{reply.name || "名前未設定"}</strong>
        <span>{formatDateTime(reply.timestamp)}</span>
      </div>

      <p>{reply.text || "本文なし"}</p>

      <div className="profile-replyMeta">
        <span className="profile-replyTo">
          ↪ {reply.parentPostAuthor || "あなた"} のシグナルへの返信
        </span>
      </div>

      {reply.parentPostText && (
        <div className="profile-replyParentPreview">
          元シグナル: {reply.parentPostText}
        </div>
      )}
    </button>
  );

  return (
    <div className="profile-page">
      <div className="profile-topbar">
        <button
          type="button"
          className="profile-back"
          onClick={handleBack}
        >
          ← 戻る
        </button>

        <h2 className="profile-title">プロフィール</h2>

        <div className="profile-topbarRight">
          <button
            type="button"
            className="profile-topAction"
            onClick={() => navigate("/profile/edit")}
          >
            編集
          </button>

          <button
            type="button"
            className="profile-topAction"
            onClick={() => setIsSettingsOpen(true)}
          >
            ⚙
          </button>
        </div>
      </div>

      <div className="profile-content">
        <section className="profile-card">
          <div className="profile-headerVisual">
            {profile.headerImage ? (
              <img
                src={profile.headerImage}
                alt="ヘッダー"
                className="profile-headerImage"
              />
            ) : (
              <div className="profile-headerPlaceholder" />
            )}
          </div>

          <div className="profile-mainBlock">
            <div className="profile-avatarWrap">
              {profile.avatarImage ? (
                <img
                  src={profile.avatarImage}
                  alt="アイコン"
                  className="profile-avatarImage"
                />
              ) : (
                <div className="profile-avatar">
                  {(profile.displayName || "?").charAt(0)}
                </div>
              )}
            </div>

            <div className="profile-nameArea">
              <h1 className="profile-name">{profile.displayName}</h1>
              <div className="profile-handle">
                @{String(profile.handle).replace(/^@/, "")}
              </div>

              {isR18Enabled && (
                <div className="profile-r18-mode-badge">R18モードON</div>
              )}
            </div>

            <div className="profile-bio">{profile.bio}</div>

            <div className="profile-infoList">
              <div className="profile-infoItem">
                <span className="profile-infoLabel">居場所</span>
                <span className="profile-infoValue">{profile.place}</span>
              </div>

              <div className="profile-infoItem">
                <span className="profile-infoLabel">誕生日</span>
                <span className="profile-infoValue">
                  {profile.birthdayVisibility === "非公開"
                    ? "非公開"
                    : profile.birthday}
                </span>
              </div>

              <div className="profile-infoItem">
                <span className="profile-infoLabel">ROAD3開始日</span>
                <span className="profile-infoValue">
                  {formatJoinedDate(profile.joinedAt)}
                </span>
              </div>
            </div>

            {profile.links.length > 0 && (
              <div className="profile-links">
                <div className="profile-sectionTitle">リンク</div>
                <div className="profile-linkList">
                  {profile.links.map((link, index) => (
                    <a
                      key={`${link}-${index}`}
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="profile-linkItem"
                    >
                      🔗 {link}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {profile.showFollowCounts && (
              <div className="profile-followInfo">
                <button
                  type="button"
                  className="profile-followBtn"
                  onClick={() =>
                    navigate("/profile/follow?tab=followers", {
                      state: {
                        from: "/profile",
                        profileReturnTo: location.state?.from || "/open",
                      },
                    })
                  }
                >
                  フォロワー {followerCount}
                </button>

                <button
                  type="button"
                  className="profile-followBtn"
                  onClick={() =>
                    navigate("/profile/follow?tab=following", {
                      state: {
                        from: "/profile",
                        profileReturnTo: location.state?.from || "/open",
                      },
                    })
                  }
                >
                  フォロー中 {followingCount}
                </button>
              </div>
            )}

            {profile.favoriteTags.length > 0 && (
              <div className="profile-tags">
                <div className="profile-sectionTitle">よく使うタグ</div>
                <div className="profile-tagList">
                  {profile.favoriteTags.map((tag, index) => (
                    <button
                      type="button"
                      key={`${tag}-${index}`}
                      className="profile-tag"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {pinnedPost && (
              <div className="profile-pinned">
                <div className="profile-sectionTitle">📌 固定シグナル</div>
                {renderProfileSignalCard(pinnedPost)}
              </div>
            )}
          </div>
        </section>

        <section className="profile-tabsSection">
          <div className="profile-tabs profile-tabs-scroll">
            <button
              type="button"
              className={`profile-tab ${
                activeTab === "signals" ? "active" : ""
              }`}
              onClick={() => setActiveTab("signals")}
            >
              シグナル {myPosts.length}
            </button>

            <button
              type="button"
              className={`profile-tab ${
                activeTab === "replies" ? "active" : ""
              }`}
              onClick={() => setActiveTab("replies")}
            >
              返信 {activeTab === "replies" ? incomingReplies.length : "…"}
            </button>

            <button
              type="button"
              className={`profile-tab ${activeTab === "media" ? "active" : ""}`}
              onClick={() => setActiveTab("media")}
            >
              メディア {activeTab === "media" ? mediaPosts.length : "…"}
            </button>

            <button
              type="button"
              className={`profile-tab ${
                activeTab === "videos" ? "active" : ""
              }`}
              onClick={() => setActiveTab("videos")}
            >
              動画 {activeTab === "videos" ? videoPosts.length : "…"}
            </button>

            <button
              type="button"
              className={`profile-tab ${activeTab === "likes" ? "active" : ""}`}
              onClick={() => setActiveTab("likes")}
            >
              いいね {activeTab === "likes" ? likedPosts.length : "…"}
            </button>

            <button
              type="button"
              className={`profile-tab ${activeTab === "saved" ? "active" : ""}`}
              onClick={() => setActiveTab("saved")}
            >
              保存 {activeTab === "saved" ? savedPosts.length : "…"}
            </button>

            {isR18Enabled && (
              <button
                type="button"
                className={`profile-tab ${activeTab === "r18" ? "active" : ""}`}
                onClick={() => setActiveTab("r18")}
              >
                R18 {activeTab === "r18" ? r18Posts.length : "…"}
              </button>
            )}
          </div>

          <div className="profile-tabContent profile-tabContent-scroll">
            {currentTabItems.length === 0 ? (
              <div className="profile-emptyCard">
                {tabLabelMap[activeTab]}はまだありません。
              </div>
            ) : activeTab === "replies" ? (
              currentTabItems.map((reply) => renderIncomingReplyCard(reply))
            ) : (
              currentTabItems.map((post) =>
                renderProfileSignalCard(post, {
                  r18: activeTab === "r18",
                })
              )
            )}
          </div>
        </section>
      </div>

      {isSettingsOpen && (
        <div
          className="profile-overlay"
          onClick={() => setIsSettingsOpen(false)}
        >
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <h3>個人設定</h3>

            <label className="profile-settingRow">
              <span>アカウントの状態</span>
              <strong>{profile.isPrivate ? "非公開" : "公開"}</strong>
            </label>

            <label className="profile-settingRow">
              <span>フォロー数表示</span>
              <div className="profile-followSettingCounts">
                <strong>{followingCount}</strong> フォロー /{" "}
                <strong>{followerCount}</strong> フォロワー
              </div>
              <strong>{profile.showFollowCounts ? "表示" : "非表示"}</strong>
            </label>

            {isR18Enabled && (
              <label className="profile-settingRow">
                <span>R18モード</span>
                <strong>ON</strong>
              </label>
            )}

            <button
              type="button"
              className="profile-modalBtn"
              onClick={() => {
                setIsSettingsOpen(false);
                navigate("/profile/edit");
              }}
            >
              設定を編集する
            </button>

            <button
              type="button"
              className="profile-modalBtn"
              onClick={() => {
                setIsSettingsOpen(false);
                navigate("/settings/r18");
              }}
            >
              R18設定を開く
            </button>

            <button
              type="button"
              className="profile-modalBtn secondary"
              onClick={() => setIsSettingsOpen(false)}
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
