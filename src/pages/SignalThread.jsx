import "./SignalThread.css";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import PostCard from "../components/PostCard";

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

function formatTimeAgo(timestamp) {
  if (!timestamp) return "今";
  const diff = Date.now() - Number(timestamp);

  if (diff < 60 * 1000) return "今";
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}分前`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}時間前`;
  return `${Math.floor(diff / (24 * 60 * 60 * 1000))}日前`;
}

function getSpaceLabel(space) {
  if (!space) return "";
  if (space === "open") return "オープンスペース";
  if (space === "open-r18") return "R18空間";
  if (space === "group") return "グループスペース";
  if (space === "closed") return "クローズドスペース";
  return "";
}

function normalizeAccount(account) {
  if (!account || typeof account !== "object") return null;
  if (account.id === undefined || account.id === null || account.id === "") {
    return null;
  }

  return {
    ...account,
    id: String(account.id),
    name: account.name || "ゲスト",
    handle: account.handle || account.userId || `@${account.id}`,
    userId: account.userId || account.handle || `@${account.id}`,
    avatarImage: account.avatarImage || account.profileImage || "",
    profileImage: account.profileImage || account.avatarImage || "",
    avatar:
      account.avatar ||
      account.icon ||
      account.name?.charAt(0) ||
      "G",
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

  return {
    id: "guest",
    name: "ゲスト",
    handle: "@guest",
    userId: "@guest",
    avatarImage: "",
    profileImage: "",
    avatar: "G",
  };
}

function findPostById(postId) {
  const sources = [
    safeParse(localStorage.getItem("openPosts"), {}),
    safeParse(localStorage.getItem("openR18Posts"), {}),
    safeParse(localStorage.getItem("groupPosts"), {}),
    safeParse(localStorage.getItem("closedPosts"), {}),
  ];

  for (const source of sources) {
    if (!source || typeof source !== "object") continue;

    const allPosts = Object.values(source).flat();

    const found = allPosts.find(
      (post) => String(post?.id) === String(postId)
    );

    if (found) return found;
  }

  return null;
}

function updatePostReplyCountInStorage(postId, nextReplyCount) {
  const keys = [OPEN_POSTS_KEY, OPEN_R18_POSTS_KEY];

  keys.forEach((storageKey) => {
    const stored = safeParse(localStorage.getItem(storageKey), {});
    let changed = false;

    const updated = Object.fromEntries(
      Object.entries(stored).map(([accountId, posts]) => [
        accountId,
        (Array.isArray(posts) ? posts : []).map((post) => {
          if (String(post.id) === String(postId)) {
            changed = true;
            return {
              ...post,
              replyCount: nextReplyCount,
              comments: nextReplyCount,
            };
          }

          if (
            post?.isResignal &&
            post?.originalPost &&
            String(post.originalPost.id) === String(postId)
          ) {
            changed = true;
            return {
              ...post,
              originalPost: {
                ...post.originalPost,
                replyCount: nextReplyCount,
                comments: nextReplyCount,
              },
            };
          }

          return post;
        }),
      ])
    );

    if (changed) {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    }
  });
}

function updatePostLikeInStorage(postId, currentAccountId) {
  const keys = [OPEN_POSTS_KEY, OPEN_R18_POSTS_KEY];
  let targetPost = null;

  keys.forEach((storageKey) => {
    const stored = safeParse(localStorage.getItem(storageKey), {});
    let changed = false;

    const updated = Object.fromEntries(
      Object.entries(stored).map(([accountId, posts]) => [
        accountId,
        (Array.isArray(posts) ? posts : []).map((post) => {
          if (String(post.id) !== String(postId)) return post;

          const likedUserIds = Array.isArray(post.likedUserIds)
            ? post.likedUserIds.map(String)
            : [];

          const myId = String(currentAccountId);
          const alreadyLiked = likedUserIds.includes(myId);

          const nextLikedUserIds = alreadyLiked
            ? likedUserIds.filter((id) => id !== myId)
            : [...likedUserIds, myId];

          changed = true;

          const nextPost = {
            ...post,
            likedUserIds: nextLikedUserIds,
            liked: !alreadyLiked,
            likeCount: nextLikedUserIds.length,
            likes: nextLikedUserIds.length,
          };

          targetPost = nextPost;
          return nextPost;
        }),
      ])
    );

    if (changed) {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    }
  });

  return targetPost;
}

function updatePostSaveInStorage(post, currentAccountId) {
  const key = `savedPosts-${currentAccountId}`;
  const savedPosts = safeParse(localStorage.getItem(key), []);
  const exists = savedPosts.some((p) => String(p.id) === String(post.id));

  if (exists) {
    const updated = savedPosts.filter((p) => String(p.id) !== String(post.id));
    localStorage.setItem(key, JSON.stringify(updated));
    return false;
  }

  localStorage.setItem(key, JSON.stringify([post, ...savedPosts]));
  return true;
}

function toggleReplyLike(
  replyId,
  currentAccountId,
  storageKey,
  replies,
  setReplies
) {
  const nextReplies = replies.map((reply) => {
    if (String(reply.id) !== String(replyId)) return reply;

    const likedUserIds = Array.isArray(reply.likedUserIds)
      ? reply.likedUserIds.map(String)
      : [];

    const myId = String(currentAccountId);
    const alreadyLiked = likedUserIds.includes(myId);
    const nextLikedUserIds = alreadyLiked
      ? likedUserIds.filter((id) => id !== myId)
      : [...likedUserIds, myId];

    return {
      ...reply,
      likedUserIds: nextLikedUserIds,
      liked: !alreadyLiked,
      likeCount: nextLikedUserIds.length,
      likes: nextLikedUserIds.length,
    };
  });

  setReplies(nextReplies);
  localStorage.setItem(storageKey, JSON.stringify(nextReplies));
}

function SignalThread() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const currentAccount = useMemo(
    () => resolveCurrentAccount(location.pathname),
    [location.pathname]
  );

  const [replyText, setReplyText] = useState("");
  const [replyTarget, setReplyTarget] = useState(null);
  const [expandedImage, setExpandedImage] = useState(null);
  const [parentLiked, setParentLiked] = useState(false);
  const [parentSaved, setParentSaved] = useState(false);
  const [parentResignaled, setParentResignaled] = useState(false);

  const baseParentPost =
  location.state?.post ||
  findPostById(id) ||   // ← これ追加
  {
    id: Number(id),
    name: "ユーザー名",
    author: "ユーザー名",
    userId: "@sample_user",
    handle: "@sample_user",
    time: "2時間前",
    timestamp: Date.now() - 2 * 60 * 60 * 1000,
    content: `シグナルID ${id} の投稿です。`,
    text: `シグナルID ${id} の投稿です。`,
    comments: 0,
    replyCount: 0,
    resignals: 0,
    resignalCount: 0,
    likes: 0,
    likeCount: 0,
    likedUserIds: [],
    level: 0,
    isMine: false,
    image: null,
    tags: [],
    avatarImage: "",
    avatar: "ユ",
    space: "open",
  };

  const storageKey = `signalReplies-${id}`;

  const [replies, setReplies] = useState(() => {
    const savedReplies = localStorage.getItem(storageKey);
    return savedReplies ? JSON.parse(savedReplies) : [];
  });

  const [parentPost, setParentPost] = useState({
    ...baseParentPost,
    accountId: baseParentPost.accountId ?? "",
    author: baseParentPost.author || baseParentPost.name,
    name: baseParentPost.name || baseParentPost.author,
    handle: baseParentPost.handle || baseParentPost.userId || "@---",
    userId: baseParentPost.userId || baseParentPost.handle || "@---",
    comments: replies.length,
    replyCount: replies.length,
  });

  const threadReturnTo =
  location.state?.from ||
  (parentPost?.isR18 ? "/open/r18" : "/open");

const handleBackToTimeline = () => {
  if (threadReturnTo) {
    navigate(threadReturnTo, { replace: true });
    return;
  }

  navigate(-1);
};

  const spaceLabel = useMemo(() => {
    return getSpaceLabel(parentPost?.space);
  }, [parentPost]);

    const quotedOriginalPost = useMemo(() => {
    if (!parentPost?.isQuoteResignal || !parentPost?.originalPost) return null;

    const original = parentPost.originalPost;

    return {
      ...original,
      name: original.name || original.author || "名前未設定",
      author: original.author || original.name || "名前未設定",
      handle: original.handle || original.userId || "@---",
      userId: original.userId || original.handle || "@---",
      avatarImage: original.avatarImage || original.profileImage || "",
      profileImage: original.profileImage || original.avatarImage || "",
      avatar:
        original.avatar ||
        original.name?.charAt(0) ||
        original.author?.charAt(0) ||
        "?",
      text: original.text || original.content || "",
      content: original.content || original.text || "",
      tags: Array.isArray(original.tags) ? original.tags : [],
      media: Array.isArray(original.media) ? original.media : [],
      image: original.image || null,
      imageUnavailable: Boolean(original.imageUnavailable),
    };
  }, [parentPost]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(replies));
  }, [replies, storageKey]);

  useEffect(() => {
    updatePostReplyCountInStorage(id, replies.length);
    setParentPost((prev) => ({
      ...prev,
      comments: replies.length,
      replyCount: replies.length,
    }));
  }, [id, replies.length]);

  useEffect(() => {
    const likedPosts = safeParse(
      localStorage.getItem(`likedPosts-${currentAccount.id}`),
      []
    );
    const savedPosts = safeParse(
      localStorage.getItem(`savedPosts-${currentAccount.id}`),
      []
    );

    setParentLiked(
      likedPosts.some((p) => String(p.id) === String(parentPost.id))
    );
    setParentSaved(
      savedPosts.some((p) => String(p.id) === String(parentPost.id))
    );

    const openStored = safeParse(localStorage.getItem(OPEN_POSTS_KEY), {});
    const openR18Stored = safeParse(localStorage.getItem(OPEN_R18_POSTS_KEY), {});
    const mineOpen = Array.isArray(openStored[currentAccount.id])
      ? openStored[currentAccount.id]
      : [];
    const mineR18 = Array.isArray(openR18Stored[currentAccount.id])
      ? openR18Stored[currentAccount.id]
      : [];

    const hasResignal =
      mineOpen.some(
        (post) =>
          post?.isResignal &&
          String(post?.originalPost?.id) === String(parentPost.id)
      ) ||
      mineR18.some(
        (post) =>
          post?.isResignal &&
          String(post?.originalPost?.id) === String(parentPost.id)
      );

    setParentResignaled(hasResignal);
  }, [parentPost.id, currentAccount.id]);

  const openParentProfile = () => {
    const targetAccountId = String(parentPost?.accountId || "");
    const myAccountId = String(currentAccount?.id || "");

    if (targetAccountId && myAccountId && targetAccountId === myAccountId) {
      navigate("/profile", {
        state: { from: location.pathname },
      });
      return;
    }

    navigate(
      `/profile/user/${encodeURIComponent(
        targetAccountId || parentPost?.handle || parentPost?.userId || "unknown"
      )}`,
      {
        state: {
          from: location.pathname,
          user: {
            id:
              targetAccountId ||
              parentPost?.handle ||
              parentPost?.userId ||
              "unknown",
            name: parentPost?.name || parentPost?.author || "名前未設定",
            userId: parentPost?.userId || parentPost?.handle || "@---",
            handle: parentPost?.handle || parentPost?.userId || "@---",
            bio: parentPost?.bio || "自己紹介はまだありません。",
            following: parentPost?.following ?? 0,
            followers: parentPost?.followers ?? 0,
            place: parentPost?.place || "未設定",
            links: Array.isArray(parentPost?.links) ? parentPost.links : [],
            birthday: parentPost?.birthday || "非公開",
            joined:
              parentPost?.joined ||
              parentPost?.createdAt ||
              parentPost?.timestamp ||
              Date.now(),
            tags: Array.isArray(parentPost?.tags) ? parentPost.tags : [],
            avatarImage:
              parentPost?.avatarImage || parentPost?.profileImage || "",
            profileImage:
              parentPost?.profileImage || parentPost?.avatarImage || "",
            avatar:
              parentPost?.avatar ||
              parentPost?.name?.charAt(0) ||
              parentPost?.author?.charAt(0) ||
              "?",
          },
        },
      }
    );
  };

  const handleSendReply = () => {
    if (!replyText.trim()) return;

    const now = Date.now();

    const newReply = {
      id: now,
      name: currentAccount.name || "ゲスト",
      author: currentAccount.name || "ゲスト",
      userId: currentAccount.handle || "@guest",
      handle: currentAccount.handle || "@guest",
      time: "今",
      timestamp: now,
      content: replyText.trim(),
      text: replyText.trim(),
      comments: 0,
      replyCount: 0,
      resignals: 0,
      resignalCount: 0,
      likes: 0,
      likeCount: 0,
      likedUserIds: [],
      level: replyTarget ? (replyTarget.level ?? 0) + 1 : 0,
      isMine: true,
      accountId: currentAccount.id,
      avatarImage: currentAccount.avatarImage || "",
      avatar:
        currentAccount.avatar ||
        currentAccount.name?.charAt(0) ||
        "G",
      parentId: replyTarget ? replyTarget.id : Number(id),
      replyToName: replyTarget ? replyTarget.name : parentPost.name,
      replyToUserId: replyTarget
        ? replyTarget.userId || replyTarget.handle
        : parentPost.userId || parentPost.handle,
    };

    setReplies((prev) => [...prev, newReply]);
    setReplyText("");
    setReplyTarget(null);
  };

  const handleDeleteReply = (replyId) => {
    const confirmed = window.confirm("この返信を削除しますか？");
    if (!confirmed) return;

    setReplies((prev) => prev.filter((reply) => reply.id !== replyId));

    if (replyTarget && replyTarget.id === replyId) {
      setReplyTarget(null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSendReply();
    }
  };

  const handleReplyClick = (targetReply) => {
    setReplyTarget(targetReply);
  };

  const handleToggleParentLike = () => {
    const nextPost = updatePostLikeInStorage(parentPost.id, currentAccount.id);
    if (!nextPost) return;

    const likedPosts = safeParse(
      localStorage.getItem(`likedPosts-${currentAccount.id}`),
      []
    );
    const exists = likedPosts.some((p) => String(p.id) === String(parentPost.id));
    const isLikedNow = Array.isArray(nextPost.likedUserIds)
      ? nextPost.likedUserIds.map(String).includes(String(currentAccount.id))
      : false;

    if (isLikedNow && !exists) {
      localStorage.setItem(
        `likedPosts-${currentAccount.id}`,
        JSON.stringify([nextPost, ...likedPosts])
      );
    }

    if (!isLikedNow && exists) {
      localStorage.setItem(
        `likedPosts-${currentAccount.id}`,
        JSON.stringify(
          likedPosts.filter((p) => String(p.id) !== String(parentPost.id))
        )
      );
    }

    setParentLiked(isLikedNow);
    setParentPost((prev) => ({
      ...prev,
      likedUserIds: nextPost.likedUserIds || [],
      likeCount: nextPost.likeCount ?? 0,
      likes: nextPost.likes ?? 0,
    }));
  };

  const handleToggleParentSave = () => {
    const savedNow = updatePostSaveInStorage(parentPost, currentAccount.id);
    setParentSaved(savedNow);
  };

  const handleToggleParentResignal = () => {
    const storageKeyForParent = parentPost.isR18
      ? OPEN_R18_POSTS_KEY
      : OPEN_POSTS_KEY;

    const stored = safeParse(localStorage.getItem(storageKeyForParent), {});
    const myId = String(currentAccount.id);
    const myPosts = Array.isArray(stored[myId]) ? stored[myId] : [];

    const existingResignal = myPosts.find(
      (post) =>
        post?.isResignal &&
        String(post?.originalPost?.id) === String(parentPost.id)
    );

    let updated = { ...stored };

    if (existingResignal) {
      updated[myId] = myPosts.filter(
        (post) => String(post.id) !== String(existingResignal.id)
      );

      updated = Object.fromEntries(
        Object.entries(updated).map(([accountId, posts]) => [
          accountId,
          (Array.isArray(posts) ? posts : []).map((post) => {
            if (String(post.id) !== String(parentPost.id)) return post;

            const nextCount = Math.max(
              Number(post.resignalCount ?? post.resignals ?? 0) - 1,
              0
            );

            return {
              ...post,
              resignaled: false,
              resignalCount: nextCount,
              resignals: nextCount,
            };
          }),
        ])
      );

      setParentResignaled(false);
      setParentPost((prev) => ({
        ...prev,
        resignalCount: Math.max(
          Number(prev.resignalCount ?? prev.resignals ?? 0) - 1,
          0
        ),
        resignals: Math.max(
          Number(prev.resignals ?? prev.resignalCount ?? 0) - 1,
          0
        ),
      }));
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
        isR18: Boolean(parentPost.isR18),
        originalPost: {
          ...parentPost,
          author: parentPost.author || parentPost.name,
          userName:
            parentPost.userName || parentPost.author || parentPost.name,
          name:
            parentPost.name || parentPost.author || parentPost.userName,
          handle: parentPost.handle || parentPost.userId,
          userId: parentPost.userId || parentPost.handle,
          avatarImage:
            parentPost.avatarImage || parentPost.profileImage || "",
          profileImage:
            parentPost.profileImage || parentPost.avatarImage || "",
          avatar: parentPost.avatar || parentPost.name?.charAt(0) || "?",
          text: parentPost.text || parentPost.content || "",
          content: parentPost.content || parentPost.text || "",
        },
      };

      updated[myId] = [resignalPost, ...myPosts];

      updated = Object.fromEntries(
        Object.entries(updated).map(([accountId, posts]) => [
          accountId,
          (Array.isArray(posts) ? posts : []).map((post) => {
            if (String(post.id) !== String(parentPost.id)) return post;

            const nextCount =
              Number(post.resignalCount ?? post.resignals ?? 0) + 1;

            return {
              ...post,
              resignaled: true,
              resignalCount: nextCount,
              resignals: nextCount,
            };
          }),
        ])
      );

      setParentResignaled(true);
      setParentPost((prev) => ({
        ...prev,
        resignalCount: Number(prev.resignalCount ?? prev.resignals ?? 0) + 1,
        resignals: Number(prev.resignals ?? prev.resignalCount ?? 0) + 1,
      }));
    }

    localStorage.setItem(storageKeyForParent, JSON.stringify(updated));
  };

  return (
    <div className="thread-page">
      <div className="thread-header">
        <button className="back-button" onClick={handleBackToTimeline}>
  ←
</button>
        <h2>シグナル</h2>
      </div>

      <div className="thread-parent">
        <div className="thread-parent-card">
          <div className="thread-parent-main">
            <div className="thread-parent-head">
              <div
                className="thread-parent-user"
                onClick={openParentProfile}
                role="button"
                tabIndex={0}
                style={{ cursor: "pointer" }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openParentProfile();
                  }
                }}
              >
                <div className="thread-parent-avatar">
                  {parentPost.avatarImage ? (
                    <img
                      src={parentPost.avatarImage}
                      alt="avatar"
                      className="thread-parent-avatar-image"
                    />
                  ) : (
                    parentPost.avatar || parentPost.name?.charAt(0) || "?"
                  )}
                </div>

                <div className="thread-parent-meta">
                  <strong>{parentPost.name || parentPost.author || "名前未設定"}</strong>
                  <span>
  @{String(parentPost.handle || parentPost.userId || "")
    .replace(/^@/, "")} ・{" "}
  {parentPost.time || formatTimeAgo(parentPost.timestamp)}
</span>
                </div>
              </div>
            </div>

            {spaceLabel && (
              <div className="thread-space-badge-wrap">
                <span className="thread-space-badge">{spaceLabel}</span>
              </div>
            )}

            <p className="thread-parent-text">
              {parentPost.text || parentPost.content || "本文なし"}
            </p>

                        {quotedOriginalPost && (
              <div className="thread-quoted-box">
                <div className="thread-quoted-head">
                  <div className="thread-quoted-avatar">
                    {quotedOriginalPost.avatarImage ? (
                      <img
                        src={quotedOriginalPost.avatarImage}
                        alt="quoted avatar"
                        className="thread-quoted-avatar-image"
                      />
                    ) : (
                      quotedOriginalPost.avatar ||
                      quotedOriginalPost.name?.charAt(0) ||
                      "?"
                    )}
                  </div>

                  <div className="thread-quoted-meta">
                    <strong>
                      {quotedOriginalPost.name || quotedOriginalPost.author}
                    </strong>
                    <span>
  @{String(quotedOriginalPost.handle || quotedOriginalPost.userId || "")
    .replace(/^@/, "")}
</span>
                  </div>
                </div>

                <p className="thread-quoted-text">
                  {quotedOriginalPost.text ||
                    quotedOriginalPost.content ||
                    "本文なし"}
                </p>

                {quotedOriginalPost.image && (
                  <div className="thread-quoted-imageWrap">
                    <img
                      src={quotedOriginalPost.image}
                      alt="quoted post"
                      className="thread-quoted-image"
                      onClick={() => setExpandedImage(quotedOriginalPost.image)}
                    />
                  </div>
                )}

                {quotedOriginalPost.tags.length > 0 && (
                  <div className="thread-quoted-tags">
                    {quotedOriginalPost.tags.map((tag) => (
                      <span
                        key={`quoted-${quotedOriginalPost.id}-${tag}`}
                        className="thread-quoted-tag"
                      >
                        #{String(tag).replace(/^#/, "")}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="thread-parent-stats">
              <span>💬 {parentPost.replyCount ?? parentPost.comments ?? 0}</span>
              <span>🔁 {parentPost.resignalCount ?? parentPost.resignals ?? 0}</span>
              <span>❤️ {parentPost.likeCount ?? parentPost.likes ?? 0}</span>
            </div>
          </div>

          {parentPost.image && (
            <div className="thread-parent-imageWrap">
              <img
                src={parentPost.image}
                alt="投稿画像"
                className="thread-parent-image"
                onClick={() => setExpandedImage(parentPost.image)}
              />
            </div>
          )}

          {parentPost.tags && parentPost.tags.length > 0 && (
            <div className="thread-parent-tags">
              {parentPost.tags.map((tag) => (
                <span key={tag} className="thread-parent-tag">
                  #{String(tag).replace(/^#/, "")}
                </span>
              ))}
            </div>
          )}

          <div className="thread-card-actions">
            <button
              className="thread-reply-button"
              onClick={() => setReplyTarget(parentPost)}
            >
              返信する
            </button>

            <button
              className={`thread-action-button ${parentLiked ? "liked" : ""}`}
              onClick={handleToggleParentLike}
            >
              {parentLiked ? "❤️ いいね済み" : "♡ いいね"}
            </button>

            <button
              className={`thread-action-button ${parentResignaled ? "active" : ""}`}
              onClick={handleToggleParentResignal}
            >
              {parentResignaled ? "🔁 リシグナル済み" : "🔁 リシグナル"}
            </button>

            <button
              className={`thread-action-button ${parentSaved ? "active" : ""}`}
              onClick={handleToggleParentSave}
            >
              {parentSaved ? "🔖 保存済み" : "🔖 保存"}
            </button>
          </div>
        </div>
      </div>

      <div className="thread-replies">
        {replies.length === 0 ? (
          <p className="thread-empty-text">まだ返信はありません</p>
        ) : (
          replies.map((reply) => {
            const replyLiked = Array.isArray(reply.likedUserIds)
              ? reply.likedUserIds
                  .map(String)
                  .includes(String(currentAccount.id))
              : false;

            return (
              <div
                key={reply.id}
                className={`thread-reply thread-level-${reply.level ?? 0}`}
              >
                <div
                  className="thread-reply-inner"
                  style={{ marginLeft: `${(reply.level ?? 0) * 28}px` }}
                >
                  <div className="thread-reply-card-wrap">
                    <PostCard
                      post={{
                        ...reply,
                        time: reply.time || formatTimeAgo(reply.timestamp),
                      }}
                      clickable={false}
                    />

                    <div className="thread-card-actions">
                      <button
                        className="thread-reply-button"
                        onClick={() => handleReplyClick(reply)}
                      >
                        返信する
                      </button>

                      <button
                        className={`thread-action-button ${replyLiked ? "liked" : ""}`}
                        onClick={() =>
                          toggleReplyLike(
                            reply.id,
                            currentAccount.id,
                            storageKey,
                            replies,
                            setReplies
                          )
                        }
                      >
                        {replyLiked ? "❤️ いいね済み" : "♡ いいね"}
                      </button>

                      {reply.isMine && (
                        <button
                          className="reply-delete-button"
                          onClick={() => handleDeleteReply(reply.id)}
                        >
                          削除
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="thread-input-wrap">
        {replyTarget && (
          <div className="reply-target-bar">
            <span>{replyTarget.name} に返信中</span>
            <button onClick={() => setReplyTarget(null)}>×</button>
          </div>
        )}

        <div className="thread-input">
          <input
            type="text"
            placeholder="返信を書く..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button onClick={handleSendReply} disabled={!replyText.trim()}>
            送信
          </button>
        </div>
      </div>

      {expandedImage && (
        <div
          className="thread-image-modal"
          onClick={() => setExpandedImage(null)}
        >
          <img
            src={expandedImage}
            alt="拡大画像"
            className="thread-image-modal-img"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="thread-image-close"
            onClick={() => setExpandedImage(null)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

export default SignalThread;