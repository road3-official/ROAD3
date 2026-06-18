import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Open.css";
import OpenPostCard from "../components/OpenPostCard";

const R18_ENABLED_KEY = "r18Enabled";
const MUTED_ACCOUNTS_KEY = "mutedAccounts";
const BLOCKED_ACCOUNTS_KEY = "blockedAccounts";
const REPORTED_POSTS_KEY = "reportedPosts";
const OPEN_GROUP_ACCOUNTS_KEY = "openGroupAccounts";
const CURRENT_OPEN_GROUP_ACCOUNT_KEY = "currentOpenGroupAccount";

function formatTime(timestamp) {
  const now = Date.now();
  const diff = Math.floor((now - timestamp) / 1000);

  if (diff < 60) return `${diff}秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
  return `${Math.floor(diff / 86400)}日前`;
}

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

function isHeavyDataImage(value) {
  return typeof value === "string" && value.startsWith("data:image/");
}

function sanitizeMediaArray(media) {
  if (!Array.isArray(media)) return [];
  return media.filter((item) => typeof item === "string" && !isHeavyDataImage(item));
}

function sanitizeOriginalPost(post) {
  if (!post) return null;

  const cleanedMedia = sanitizeMediaArray(post.media);
  const cleanedImage =
    typeof post.image === "string" && !isHeavyDataImage(post.image)
      ? post.image
      : cleanedMedia[0] || null;

  return {
    ...post,
    image: cleanedImage,
    media: cleanedMedia,
    imageUnavailable:
      Boolean(post.image || (Array.isArray(post.media) && post.media.length > 0)) &&
      !cleanedImage,
    isR18: Boolean(post.isR18),
  };
}

function sanitizeStoredPost(post) {
  const cleanedMedia = sanitizeMediaArray(post?.media);
  const cleanedImage =
    typeof post?.image === "string" && !isHeavyDataImage(post.image)
      ? post.image
      : cleanedMedia[0] || null;

  return {
    ...post,
    image: cleanedImage,
    media: cleanedMedia,
    imageUnavailable:
      Boolean(post?.image || (Array.isArray(post?.media) && post.media.length > 0)) &&
      !cleanedImage,
    originalPost: sanitizeOriginalPost(post?.originalPost),
  };
}

function sanitizePostsByAccount(stored) {
  return Object.fromEntries(
    Object.entries(stored || {}).map(([accountId, posts]) => [
      accountId,
      (Array.isArray(posts) ? posts : []).map(sanitizeStoredPost),
    ])
  );
}

function getAccountAvatarImage(account) {
  return (
    account?.avatarImage ??
    account?.profileImage ??
    (isImageLike(account?.avatar) ? account.avatar : "") ??
    ""
  );
}

function getAccountAvatarValue(account) {
  return (
    getAccountAvatarImage(account) ||
    account?.avatar ||
    account?.icon ||
    account?.name?.charAt(0) ||
    "G"
  );
}

function addAccountToDirectory(map, account) {
  if (!account?.id && account?.id !== 0) return;

  const id = String(account.id);
  const avatarImage =
    account?.avatarImage ??
    account?.profileImage ??
    (isImageLike(account?.avatar) ? account.avatar : "") ??
    "";

  const fallback =
    account?.name?.charAt(0) ??
    account?.avatar ??
    account?.icon ??
    "?";

  map[id] = {
    id,
    name: account?.name ?? "ユーザー",
    handle: account?.handle ?? account?.userId ?? `@${id}`,
    avatarImage,
    avatarFallback: String(fallback).charAt(0),
  };
}

function buildAccountDirectory(currentAccount) {
  const map = {};

  addAccountToDirectory(map, currentAccount);

  const savedAccounts = safeParse(localStorage.getItem(OPEN_GROUP_ACCOUNTS_KEY), []);
  if (Array.isArray(savedAccounts)) {
    savedAccounts.forEach((account) => addAccountToDirectory(map, account));
  }

  const currentStored = safeParse(
    localStorage.getItem(CURRENT_OPEN_GROUP_ACCOUNT_KEY),
    null
  );
  if (currentStored) {
    addAccountToDirectory(map, currentStored);
  }

  const openPosts = sanitizePostsByAccount(
    safeParse(localStorage.getItem("openPosts"), {})
  );
  const openR18Posts = sanitizePostsByAccount(
    safeParse(localStorage.getItem("openR18Posts"), {})
  );

  [openPosts, openR18Posts].forEach((stored) => {
    Object.values(stored)
      .flat()
      .forEach((post) => {
        addAccountToDirectory(map, {
          id: post?.accountId,
          name: post?.author ?? post?.userName ?? post?.name,
          handle: post?.handle ?? post?.userId,
          avatarImage: post?.avatarImage,
          profileImage: post?.profileImage,
          avatar: post?.avatar,
          icon: post?.icon,
        });

        if (post?.originalPost) {
          addAccountToDirectory(map, {
            id: post.originalPost?.accountId,
            name:
              post.originalPost?.author ??
              post.originalPost?.userName ??
              post.originalPost?.name,
            handle: post.originalPost?.handle ?? post.originalPost?.userId,
            avatarImage: post.originalPost?.avatarImage,
            profileImage: post.originalPost?.profileImage,
            avatar: post.originalPost?.avatar,
            icon: post.originalPost?.icon,
          });
        }
      });
  });

  return map;
}

function normalizePost(post) {
  const sanitized = sanitizeStoredPost(post);

  const resolvedName =
    sanitized?.author ?? sanitized?.userName ?? sanitized?.name ?? "ユーザー";
  const resolvedHandle =
    sanitized?.handle ?? sanitized?.userId ?? `@${sanitized?.accountId ?? "unknown"}`;
  const resolvedAvatarImage =
    sanitized?.avatarImage ??
    sanitized?.profileImage ??
    (isImageLike(sanitized?.avatar) ? sanitized.avatar : "") ??
    "";
  const resolvedAvatar =
    resolvedAvatarImage ||
    sanitized?.avatar ||
    sanitized?.icon ||
    resolvedName;

  return {
    ...sanitized,
    id: sanitized?.id ?? Date.now(),
    accountId: sanitized?.accountId ?? "unknown",
    author: resolvedName,
    userName: resolvedName,
    name: resolvedName,
    handle: resolvedHandle,
    userId: sanitized?.userId ?? resolvedHandle,
    avatar: resolvedAvatar,
    avatarImage: resolvedAvatarImage,
    profileImage: sanitized?.profileImage ?? resolvedAvatarImage,
    icon: sanitized?.icon ?? resolvedAvatar,
    text: sanitized?.text ?? sanitized?.content ?? "",
    content: sanitized?.content ?? sanitized?.text ?? "",
    timestamp: sanitized?.timestamp ?? sanitized?.createdAt ?? Date.now(),
    createdAt: sanitized?.createdAt ?? sanitized?.timestamp ?? Date.now(),
    tags: Array.isArray(sanitized?.tags) ? sanitized.tags : [],
    media: Array.isArray(sanitized?.media) ? sanitized.media : [],
    image: sanitized?.image ?? null,
    likedUserIds: Array.isArray(sanitized?.likedUserIds)
      ? sanitized.likedUserIds
      : [],
    likeCount: Number(sanitized?.likeCount ?? 0),
    replyCount: Number(sanitized?.replyCount ?? 0),
    resignalCount: Number(sanitized?.resignalCount ?? 0),
    saved: Boolean(sanitized?.saved),
    isR18: Boolean(sanitized?.isR18),
    imageUnavailable: Boolean(sanitized?.imageUnavailable),
    originalPost: sanitized?.originalPost
      ? {
          ...sanitizeOriginalPost(sanitized.originalPost),
          author:
            sanitized.originalPost.author ??
            sanitized.originalPost.userName ??
            sanitized.originalPost.name ??
            "ユーザー",
          userName:
            sanitized.originalPost.userName ??
            sanitized.originalPost.author ??
            sanitized.originalPost.name ??
            "ユーザー",
          name:
            sanitized.originalPost.name ??
            sanitized.originalPost.userName ??
            sanitized.originalPost.author ??
            "ユーザー",
          handle:
            sanitized.originalPost.handle ??
            sanitized.originalPost.userId ??
            `@${sanitized.originalPost.accountId ?? "unknown"}`,
          userId:
            sanitized.originalPost.userId ??
            sanitized.originalPost.handle ??
            `@${sanitized.originalPost.accountId ?? "unknown"}`,
          avatarImage:
            sanitized.originalPost.avatarImage ??
            sanitized.originalPost.profileImage ??
            (isImageLike(sanitized.originalPost.avatar)
              ? sanitized.originalPost.avatar
              : "") ??
            "",
          profileImage:
            sanitized.originalPost.profileImage ??
            sanitized.originalPost.avatarImage ??
            "",
          avatar:
            sanitized.originalPost.avatarImage ??
            sanitized.originalPost.profileImage ??
            sanitized.originalPost.avatar ??
            sanitized.originalPost.icon ??
            sanitized.originalPost.author ??
            "U",
          icon:
            sanitized.originalPost.icon ??
            sanitized.originalPost.avatar ??
            sanitized.originalPost.author ??
            "U",
          text: sanitized.originalPost.text ?? sanitized.originalPost.content ?? "",
          content:
            sanitized.originalPost.content ?? sanitized.originalPost.text ?? "",
          tags: Array.isArray(sanitized.originalPost.tags)
            ? sanitized.originalPost.tags
            : [],
          media: Array.isArray(sanitized.originalPost.media)
            ? sanitized.originalPost.media
            : [],
          image: sanitized.originalPost.image ?? null,
          isR18: Boolean(sanitized.originalPost.isR18),
          imageUnavailable: Boolean(sanitized.originalPost.imageUnavailable),
        }
      : null,
  };
}

function HiddenAccountsModal({
  title,
  ids,
  accountDirectory,
  onClose,
  onRemove,
  emptyText,
}) {
  return (
    <div className="open-r18-confirm-overlay" onClick={onClose}>
      <div
        className="open-r18-confirm-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 460 }}
      >
        <div className="open-r18-confirm-badge">管理</div>
        <h3 className="open-r18-confirm-title">{title}</h3>
        <p className="open-r18-confirm-text">ここから解除できます。</p>

        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          {ids.length === 0 ? (
            <div
              style={{
                border: "1px dashed #ddd",
                borderRadius: 12,
                padding: "16px 14px",
                color: "#666",
                textAlign: "center",
                fontSize: 14,
              }}
            >
              {emptyText}
            </div>
          ) : (
            ids.map((id) => {
              const account = accountDirectory[String(id)] || {
                id: String(id),
                name: "不明なアカウント",
                handle: `@${String(id)}`,
                avatarImage: "",
                avatarFallback: "?",
              };

              return (
                <div
                  key={id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    border: "1px solid #eee",
                    borderRadius: 14,
                    padding: "10px 12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 999,
                        overflow: "hidden",
                        background: "#eef2f7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        fontWeight: 700,
                        color: "#2f80ed",
                      }}
                    >
                      {account.avatarImage ? (
                        <img
                          src={account.avatarImage}
                          alt="avatar"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        account.avatarFallback
                      )}
                    </div>

                    <div
                      style={{
                        minWidth: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <strong
                        style={{
                          fontSize: 14,
                          color: "#222",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {account.name}
                      </strong>
                      <span
                        style={{
                          fontSize: 12,
                          color: "#777",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        @{account.handle}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemove(id)}
                    style={{
                      border: "1px solid #ddd",
                      background: "#fff",
                      color: "#333",
                      borderRadius: 10,
                      padding: "8px 12px",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    解除
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="open-r18-confirm-actions">
          <button
            type="button"
            className="open-r18-confirm-ok"
            onClick={onClose}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportsModal({ reports, onClose, emptyText }) {
  const formatReportDate = (timestamp) => {
    if (!timestamp) return "-";
    try {
      return new Date(timestamp).toLocaleString("ja-JP");
    } catch {
      return "-";
    }
  };

  return (
    <div className="open-r18-confirm-overlay" onClick={onClose}>
      <div
        className="open-r18-confirm-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 520 }}
      >
        <div className="open-r18-confirm-badge">通報</div>
        <h3 className="open-r18-confirm-title">通報一覧</h3>
        <p className="open-r18-confirm-text">自分が送った通報の一覧です。</p>

        <div style={{ marginTop: 14, display: "grid", gap: 10, maxHeight: 420, overflowY: "auto" }}>
          {reports.length === 0 ? (
            <div
              style={{
                border: "1px dashed #ddd",
                borderRadius: 12,
                padding: "16px 14px",
                color: "#666",
                textAlign: "center",
                fontSize: 14,
              }}
            >
              {emptyText}
            </div>
          ) : (
            reports.map((report) => (
              <div
                key={report.id}
                style={{
                  border: "1px solid #eee",
                  borderRadius: 14,
                  padding: "12px 14px",
                  display: "grid",
                  gap: 6,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <strong style={{ fontSize: 14, color: "#222" }}>
                    {report.targetName || "不明なアカウント"}
                  </strong>
                  <span style={{ fontSize: 12, color: "#777", flexShrink: 0 }}>
                    {report.isR18 ? "R18" : "通常"}
                  </span>
                </div>

                <div style={{ fontSize: 12, color: "#777" }}>
                  {report.targetHandle || "@unknown"}
                </div>

                <div style={{ fontSize: 13, color: "#333" }}>
                  理由: {report.reason || "-"}
                </div>

                <div style={{ fontSize: 13, color: "#555", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  補足: {report.detail ? report.detail : "なし"}
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: "#666",
                    background: "#fafafa",
                    borderRadius: 10,
                    padding: "8px 10px",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  投稿内容: {report.postText ? report.postText : "なし"}
                </div>

                <div style={{ fontSize: 12, color: "#999" }}>
                  通報日時: {formatReportDate(report.createdAt)}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="open-r18-confirm-actions">
          <button
            type="button"
            className="open-r18-confirm-ok"
            onClick={onClose}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Open({ currentAccount, setNotifications }) {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("recommended");
  const [allPostsByAccount, setAllPostsByAccount] = useState({});
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isR18Enabled, setIsR18Enabled] = useState(
    localStorage.getItem(R18_ENABLED_KEY) === "true"
  );
  const [mutedAccounts, setMutedAccounts] = useState(() =>
    safeParse(localStorage.getItem(MUTED_ACCOUNTS_KEY), []).map(String)
  );
  const [blockedAccounts, setBlockedAccounts] = useState(() =>
    safeParse(localStorage.getItem(BLOCKED_ACCOUNTS_KEY), []).map(String)
  );
  const [reportedPosts, setReportedPosts] = useState(() =>
    safeParse(localStorage.getItem(REPORTED_POSTS_KEY), [])
  );
  const [hiddenModalType, setHiddenModalType] = useState(null);

  useEffect(() => {
    const stored = safeParse(localStorage.getItem("openPosts"), {});
    const sanitized = sanitizePostsByAccount(stored);
    setAllPostsByAccount(sanitized);

    if (JSON.stringify(stored) !== JSON.stringify(sanitized)) {
      localStorage.setItem("openPosts", JSON.stringify(sanitized));
    }
  }, []);

  useEffect(() => {
    const syncSettings = () => {
      setIsR18Enabled(localStorage.getItem(R18_ENABLED_KEY) === "true");
      setMutedAccounts(
        safeParse(localStorage.getItem(MUTED_ACCOUNTS_KEY), []).map(String)
      );
      setBlockedAccounts(
        safeParse(localStorage.getItem(BLOCKED_ACCOUNTS_KEY), []).map(String)
      );
      setReportedPosts(safeParse(localStorage.getItem(REPORTED_POSTS_KEY), []));
    };

    window.addEventListener("focus", syncSettings);
    window.addEventListener("storage", syncSettings);

    return () => {
      window.removeEventListener("focus", syncSettings);
      window.removeEventListener("storage", syncSettings);
    };
  }, []);

  const normalizedCurrentAccount = useMemo(() => {
    const avatarImage = getAccountAvatarImage(currentAccount);
    const avatar = getAccountAvatarValue(currentAccount);

    return {
      ...currentAccount,
      avatarImage,
      profileImage: currentAccount?.profileImage ?? avatarImage,
      avatar,
      icon: currentAccount?.icon ?? avatar,
    };
  }, [currentAccount]);

  const accountDirectory = useMemo(() => {
    return buildAccountDirectory(normalizedCurrentAccount);
  }, [normalizedCurrentAccount, allPostsByAccount]);

  const hiddenAccountIds = useMemo(() => {
    return new Set([...mutedAccounts, ...blockedAccounts].map(String));
  }, [mutedAccounts, blockedAccounts]);

  const myReports = useMemo(() => {
    const myId = String(normalizedCurrentAccount?.id ?? "");
    return reportedPosts
      .filter((report) => String(report.reportedByAccountId ?? "") === myId)
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
  }, [reportedPosts, normalizedCurrentAccount]);

  const allPosts = useMemo(() => {
    return Object.values(allPostsByAccount)
      .flat()
      .filter((post) => post && !post.isR18)
      .map(normalizePost)
      .filter((post) => !hiddenAccountIds.has(String(post.accountId)))
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [allPostsByAccount, hiddenAccountIds]);

  const followingPosts = useMemo(() => {
    if (!normalizedCurrentAccount?.id) return [];

    return allPosts
      .filter(
        (post) =>
          String(post.accountId) === String(normalizedCurrentAccount.id)
      )
      .map((post) => {
        const likedUserIds = Array.isArray(post.likedUserIds)
          ? post.likedUserIds.map(String)
          : [];

        return {
          ...post,
          liked: likedUserIds.includes(String(normalizedCurrentAccount.id)),
          likeCount: likedUserIds.length,
          saved: Boolean(post.saved),
        };
      });
  }, [allPosts, normalizedCurrentAccount]);

  const recommendedPosts = useMemo(() => {
    if (!normalizedCurrentAccount?.id) return allPosts;

    return allPosts.map((post) => {
      const likedUserIds = Array.isArray(post.likedUserIds)
        ? post.likedUserIds.map(String)
        : [];

      return {
        ...post,
        liked: likedUserIds.includes(String(normalizedCurrentAccount.id)),
        likeCount: likedUserIds.length,
        saved: Boolean(post.saved),
      };
    });
  }, [allPosts, normalizedCurrentAccount]);

  const visiblePosts =
    activeTab === "following" ? followingPosts : recommendedPosts;

  const openMyPage = () => {
    navigate("/profile");
  };

  const openDmList = () => {
    navigate("/dm");
  };

  const openR18Page = () => {
    setIsMenuOpen(false);
    navigate("/open/r18");
  };

  const openR18Settings = () => {
    setIsMenuOpen(false);
    navigate("/settings/r18");
  };

  const openMutedAccounts = () => {
    setIsMenuOpen(false);
    setHiddenModalType("muted");
  };

  const openBlockedAccounts = () => {
    setIsMenuOpen(false);
    setHiddenModalType("blocked");
  };

  const openReports = () => {
    setIsMenuOpen(false);
    setHiddenModalType("reports");
  };

  const closeHiddenModal = () => {
    setHiddenModalType(null);
  };

  const unmuteAccount = (accountId) => {
    const next = mutedAccounts.filter((id) => String(id) !== String(accountId));
    setMutedAccounts(next);
    localStorage.setItem(MUTED_ACCOUNTS_KEY, JSON.stringify(next));
  };

  const unblockAccount = (accountId) => {
    const next = blockedAccounts.filter((id) => String(id) !== String(accountId));
    setBlockedAccounts(next);
    localStorage.setItem(BLOCKED_ACCOUNTS_KEY, JSON.stringify(next));
  };

  const toggleLike = (postId) => {
    if (!normalizedCurrentAccount?.id) return;

    let targetPost = null;
    let addedLike = false;

    const updated = Object.fromEntries(
      Object.entries(allPostsByAccount).map(([accountId, posts]) => {
        const nextPosts = posts.map((post) => {
          if (String(post.id) !== String(postId)) return post;

          const currentLikedUserIds = Array.isArray(post.likedUserIds)
            ? post.likedUserIds.map(String)
            : [];

          const myId = String(normalizedCurrentAccount.id);
          const alreadyLiked = currentLikedUserIds.includes(myId);

          const nextLikedUserIds = alreadyLiked
            ? currentLikedUserIds.filter((id) => id !== myId)
            : [...currentLikedUserIds, myId];

          addedLike = !alreadyLiked;

          targetPost = normalizePost({
            ...post,
            likedUserIds: nextLikedUserIds,
            likeCount: nextLikedUserIds.length,
          });

          return {
            ...post,
            likedUserIds: nextLikedUserIds,
            likeCount: nextLikedUserIds.length,
          };
        });

        return [accountId, nextPosts];
      })
    );

    setAllPostsByAccount(updated);
    localStorage.setItem("openPosts", JSON.stringify(updated));

    if (!targetPost) return;

    const myLikedKey = `likedPosts-${normalizedCurrentAccount.id}`;
    const likedPosts = safeParse(localStorage.getItem(myLikedKey), []);
    const exists = likedPosts.some((p) => String(p.id) === String(postId));

    const iLikedThisPost = (targetPost.likedUserIds || [])
      .map(String)
      .includes(String(normalizedCurrentAccount.id));

    if (iLikedThisPost && !exists) {
      localStorage.setItem(
        myLikedKey,
        JSON.stringify([
          {
            ...targetPost,
            image: null,
            media: [],
            imageUnavailable:
              targetPost.imageUnavailable ||
              Boolean(targetPost.image || targetPost.media?.length),
          },
          ...likedPosts,
        ])
      );
    }

    if (!iLikedThisPost && exists) {
      localStorage.setItem(
        myLikedKey,
        JSON.stringify(likedPosts.filter((p) => String(p.id) !== String(postId)))
      );
    }

    if (
      addedLike &&
      String(targetPost.accountId) !== String(normalizedCurrentAccount.id)
    ) {
      setNotifications?.((prev) => [
        {
          id: Date.now(),
          accountId: targetPost.accountId,
          accountName: targetPost.author || "アカウント",
          type: "like",
          source: "open",
          from: normalizedCurrentAccount.name || "ユーザー",
          fromUser: normalizedCurrentAccount.name || "ユーザー",
          fromUserId: normalizedCurrentAccount.id,
          postId: targetPost.id,
          link: `/signal/${targetPost.id}`,
          read: false,
          isRead: false,
          createdAt: Date.now(),
        },
        ...prev,
      ]);
    }
  };

  const toggleSave = (postId) => {
    if (!normalizedCurrentAccount?.id) return;

    const mySavedKey = `savedPosts-${normalizedCurrentAccount.id}`;
    const savedPosts = safeParse(localStorage.getItem(mySavedKey), []);
    let targetPost = null;

    const updated = Object.fromEntries(
      Object.entries(allPostsByAccount).map(([accountId, posts]) => {
        const nextPosts = posts.map((post) => {
          if (String(post.id) !== String(postId)) return post;

          const nextSaved = !Boolean(post.saved);

          targetPost = normalizePost({
            ...post,
            saved: nextSaved,
          });

          return {
            ...post,
            saved: nextSaved,
          };
        });

        return [accountId, nextPosts];
      })
    );

    setAllPostsByAccount(updated);
    localStorage.setItem("openPosts", JSON.stringify(updated));

    if (!targetPost) return;

    const exists = savedPosts.some((p) => String(p.id) === String(postId));

    if (targetPost.saved && !exists) {
      localStorage.setItem(
        mySavedKey,
        JSON.stringify([
          {
            ...targetPost,
            image: null,
            media: [],
            imageUnavailable:
              targetPost.imageUnavailable ||
              Boolean(targetPost.image || targetPost.media?.length),
          },
          ...savedPosts,
        ])
      );
    }

    if (!targetPost.saved && exists) {
      localStorage.setItem(
        mySavedKey,
        JSON.stringify(savedPosts.filter((p) => String(p.id) !== String(postId)))
      );
    }
  };

  const toggleResignal = (postId) => {
  if (!normalizedCurrentAccount) return;

  const ownerId = String(normalizedCurrentAccount.id);
  const stored = sanitizePostsByAccount(
    safeParse(localStorage.getItem("openPosts"), {})
  );

  let targetPost = null;

  Object.values(stored)
    .flat()
    .forEach((post) => {
      if (String(post.id) === String(postId)) {
        targetPost = normalizePost(post);
      }
    });

  if (!targetPost) return;

  const sourceOriginalPost =
    targetPost.isResignal && targetPost.originalPost
      ? sanitizeOriginalPost(targetPost.originalPost)
      : sanitizeOriginalPost({
          id: targetPost.id,
          accountId: targetPost.accountId,
          author: targetPost.author,
          userName: targetPost.userName || targetPost.author,
          name: targetPost.name || targetPost.userName || targetPost.author,
          handle: targetPost.handle,
          userId: targetPost.userId || targetPost.handle,
          avatar:
            targetPost.avatarImage ||
            targetPost.profileImage ||
            targetPost.avatar ||
            targetPost.icon ||
            targetPost.author,
          avatarImage:
            targetPost.avatarImage ||
            targetPost.profileImage ||
            "",
          profileImage:
            targetPost.profileImage ||
            targetPost.avatarImage ||
            "",
          icon:
            targetPost.icon ||
            targetPost.avatar ||
            targetPost.author,
          text: targetPost.text ?? targetPost.content ?? "",
          content: targetPost.content ?? targetPost.text ?? "",
          timestamp: targetPost.timestamp,
          createdAt: targetPost.createdAt || targetPost.timestamp,
          tags: targetPost.tags || [],
          image: targetPost.image ?? null,
          media: Array.isArray(targetPost.media) ? targetPost.media : [],
          imageUnavailable: Boolean(targetPost.imageUnavailable),
          isR18: Boolean(targetPost.isR18),
          likeCount: Number(targetPost.likeCount ?? 0),
          replyCount: Number(targetPost.replyCount ?? 0),
          resignalCount: Number(targetPost.resignalCount ?? 0),
          likedUserIds: Array.isArray(targetPost.likedUserIds)
            ? targetPost.likedUserIds
            : [],
          saved: Boolean(targetPost.saved),
        });

  const myPosts = Array.isArray(stored[ownerId]) ? stored[ownerId] : [];

  const existingResignal = myPosts.find(
    (post) =>
      post.isResignal &&
      String(post.originalPost?.id) === String(sourceOriginalPost?.id)
  );

  let updated = { ...stored };

  if (existingResignal) {
    updated[ownerId] = myPosts.filter(
      (post) => String(post.id) !== String(existingResignal.id)
    );

    updated = Object.fromEntries(
      Object.entries(updated).map(([accountId, posts]) => [
        accountId,
        posts.map((post) => {
          if (String(post.id) !== String(sourceOriginalPost.id)) return post;
          return {
            ...post,
            resignaled: false,
            resignalCount: Math.max(0, Number(post.resignalCount ?? 0) - 1),
          };
        }),
      ])
    );
  } else {
    const now = Date.now();

    const newResignal = sanitizeStoredPost({
      id: now,
      timestamp: now,
      createdAt: now,

      // 通常リシグナルは本文なし
      text: "",
      content: "",

      // 投稿主は「元投稿」ではなく「リシグナルした人」
      // ただし詳細では originalPost を見れば元投稿者を出せるようにする
      author: normalizedCurrentAccount.name || "名前未設定",
      userName: normalizedCurrentAccount.name || "名前未設定",
      name: normalizedCurrentAccount.name || "名前未設定",

      accountId: normalizedCurrentAccount.id,
      handle:
        normalizedCurrentAccount.handle || `@${normalizedCurrentAccount.id}`,
      userId:
        normalizedCurrentAccount.handle || `@${normalizedCurrentAccount.id}`,

      avatar:
        normalizedCurrentAccount.avatarImage ||
        normalizedCurrentAccount.profileImage ||
        normalizedCurrentAccount.avatar ||
        normalizedCurrentAccount.icon ||
        normalizedCurrentAccount.name,

      avatarImage:
        normalizedCurrentAccount.avatarImage ||
        normalizedCurrentAccount.profileImage ||
        "",

      profileImage:
        normalizedCurrentAccount.profileImage ||
        normalizedCurrentAccount.avatarImage ||
        "",

      icon:
        normalizedCurrentAccount.icon ||
        normalizedCurrentAccount.avatar ||
        normalizedCurrentAccount.name,

      space: "open",
      tags: sourceOriginalPost?.tags || [],
      image: null,
      media: [],
      mediaName: null,
      imageUnavailable: false,
      recommendToOpen: true,
      likeCount: 0,
      liked: false,
      likedUserIds: [],
      saved: false,
      replyCount: 0,
      resignalCount: 0,
      resignaled: false,
      isResignal: true,
      isR18: false,

      // 誰がリシグナルしたかも明示で持つ
      resignalBy: {
        id: String(normalizedCurrentAccount.id),
        name: normalizedCurrentAccount.name || "名前未設定",
        handle:
          normalizedCurrentAccount.handle || `@${normalizedCurrentAccount.id}`,
        avatarImage:
          normalizedCurrentAccount.avatarImage ||
          normalizedCurrentAccount.profileImage ||
          "",
        profileImage:
          normalizedCurrentAccount.profileImage ||
          normalizedCurrentAccount.avatarImage ||
          "",
        avatar:
          normalizedCurrentAccount.avatar ||
          normalizedCurrentAccount.icon ||
          normalizedCurrentAccount.name?.charAt(0) ||
          "U",
      },

      // 元投稿は丸ごと残す
      originalPost: {
        ...sourceOriginalPost,
        id: sourceOriginalPost?.id,
        accountId: sourceOriginalPost?.accountId,
        author:
          sourceOriginalPost?.author ??
          sourceOriginalPost?.userName ??
          sourceOriginalPost?.name ??
          "ユーザー",
        userName:
          sourceOriginalPost?.userName ??
          sourceOriginalPost?.author ??
          sourceOriginalPost?.name ??
          "ユーザー",
        name:
          sourceOriginalPost?.name ??
          sourceOriginalPost?.userName ??
          sourceOriginalPost?.author ??
          "ユーザー",
        handle:
          sourceOriginalPost?.handle ??
          sourceOriginalPost?.userId ??
          `@${sourceOriginalPost?.accountId ?? "unknown"}`,
        userId:
          sourceOriginalPost?.userId ??
          sourceOriginalPost?.handle ??
          `@${sourceOriginalPost?.accountId ?? "unknown"}`,
        avatarImage:
          sourceOriginalPost?.avatarImage ??
          sourceOriginalPost?.profileImage ??
          "",
        profileImage:
          sourceOriginalPost?.profileImage ??
          sourceOriginalPost?.avatarImage ??
          "",
        avatar:
          sourceOriginalPost?.avatarImage ??
          sourceOriginalPost?.profileImage ??
          sourceOriginalPost?.avatar ??
          sourceOriginalPost?.icon ??
          sourceOriginalPost?.author ??
          "U",
        icon:
          sourceOriginalPost?.icon ??
          sourceOriginalPost?.avatar ??
          sourceOriginalPost?.author ??
          "U",
        text: sourceOriginalPost?.text ?? sourceOriginalPost?.content ?? "",
        content: sourceOriginalPost?.content ?? sourceOriginalPost?.text ?? "",
        image: sourceOriginalPost?.image ?? null,
        media: Array.isArray(sourceOriginalPost?.media)
          ? sourceOriginalPost.media
          : [],
        imageUnavailable: Boolean(sourceOriginalPost?.imageUnavailable),
        tags: Array.isArray(sourceOriginalPost?.tags)
          ? sourceOriginalPost.tags
          : [],
        isR18: Boolean(sourceOriginalPost?.isR18),
      },
    });

    updated[ownerId] = [newResignal, ...myPosts];

    if (
      String(sourceOriginalPost.accountId) !==
      String(normalizedCurrentAccount.id)
    ) {
      setNotifications?.((prev) => [
        {
          id: Date.now(),
          accountId: sourceOriginalPost.accountId,
          accountName: sourceOriginalPost.author || "アカウント",
          type: "resignal",
          source: "open",
          from: normalizedCurrentAccount.name || "ユーザー",
          fromUser: normalizedCurrentAccount.name || "ユーザー",
          fromUserId: normalizedCurrentAccount.id,
          postId: sourceOriginalPost.id,
          link: `/signal/${sourceOriginalPost.id}`,
          read: false,
          isRead: false,
          createdAt: Date.now(),
        },
        ...prev,
      ]);
    }

    updated = Object.fromEntries(
      Object.entries(updated).map(([accountId, posts]) => [
        accountId,
        posts.map((post) => {
          if (String(post.id) !== String(sourceOriginalPost.id)) return post;
          return {
            ...post,
            resignaled: true,
            resignalCount: Number(post.resignalCount ?? 0) + 1,
          };
        }),
      ])
    );
  }

  const sanitizedUpdated = sanitizePostsByAccount(updated);
  setAllPostsByAccount(sanitizedUpdated);
  localStorage.setItem("openPosts", JSON.stringify(sanitizedUpdated));
};

  const handleDelete = (postId) => {
    const ok = window.confirm("このシグナルを削除する？");
    if (!ok) return;

    const updated = Object.fromEntries(
      Object.entries(allPostsByAccount).map(([accountId, posts]) => [
        accountId,
        posts.filter((post) => String(post.id) !== String(postId)),
      ])
    );

    setAllPostsByAccount(updated);
    localStorage.setItem("openPosts", JSON.stringify(updated));

    const myLikedKey = `likedPosts-${normalizedCurrentAccount?.id || "user"}`;
    const mySavedKey = `savedPosts-${normalizedCurrentAccount?.id || "user"}`;

    const likedPosts = safeParse(localStorage.getItem(myLikedKey), []).filter(
      (p) => String(p.id) !== String(postId)
    );
    const savedPosts = safeParse(localStorage.getItem(mySavedKey), []).filter(
      (p) => String(p.id) !== String(postId)
    );

    localStorage.setItem(myLikedKey, JSON.stringify(likedPosts));
    localStorage.setItem(mySavedKey, JSON.stringify(savedPosts));
  };

  return (
    <div className="open-page">
      <header className="open-header">
        <button
          type="button"
          className="open-profileBtn"
          onClick={openMyPage}
          title="マイページ"
        >
          {normalizedCurrentAccount?.avatarImage ? (
            <img
              src={normalizedCurrentAccount.avatarImage}
              alt="avatar"
              className="open-profileAvatarImage"
            />
          ) : (
            <span className="open-profileAvatar">
              {(normalizedCurrentAccount?.name || "?").charAt(0)}
            </span>
          )}
        </button>

        <div className="app-logoBlock">
  <h1 className="app-logo">ROAD3</h1>
  <span className="app-spaceName">Open Space</span>
</div>

        <div className="open-headerRight">
          <button
            type="button"
            className="open-iconBtn"
            onClick={openDmList}
            title="DM"
          >
            ✉️
          </button>

          <div className="open-menuWrap">
            <button
              type="button"
              className="open-iconBtn"
              onClick={() => setIsMenuOpen((v) => !v)}
              title="メニュー"
            >
              ⋯
            </button>

            {isMenuOpen && (
              <div className="open-menuDropdown">
                <button
                  type="button"
                  className="open-menuItem"
                  onClick={openMutedAccounts}
                >
                  ミュート中アカウント
                </button>

                <button
                  type="button"
                  className="open-menuItem"
                  onClick={openBlockedAccounts}
                >
                  ブロック中アカウント
                </button>

                <button
                  type="button"
                  className="open-menuItem"
                  onClick={openReports}
                >
                  通報一覧
                </button>

                <button
                  type="button"
                  className="open-menuItem"
                  onClick={openR18Settings}
                >
                  R18設定
                </button>

                {isR18Enabled && (
                  <button
                    type="button"
                    className="open-menuItem open-menuItem-r18"
                    onClick={openR18Page}
                  >
                    R18空間へ
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="open-tabs">
        <button
          type="button"
          className={`open-tab ${activeTab === "recommended" ? "active" : ""}`}
          onClick={() => setActiveTab("recommended")}
        >
          おすすめ
        </button>

        <button
          type="button"
          className={`open-tab ${activeTab === "following" ? "active" : ""}`}
          onClick={() => setActiveTab("following")}
        >
          フォロー
        </button>
      </div>

      {isR18Enabled && (
        <section className="open-r18-entry">
          <div className="open-r18-entryText">
            <div className="open-r18-entryBadge">R-18</div>
            <div className="open-r18-entryTitle">18禁空間はこちら</div>
            <div className="open-r18-entrySub">
              通常タイムラインとは分離された専用空間
            </div>
          </div>

          <button
            type="button"
            className="open-r18-entryBtn"
            onClick={openR18Page}
          >
            入る
          </button>
        </section>
      )}

      <main className="open-posts">
        {visiblePosts.length === 0 ? (
          <div className="open-empty">
            {activeTab === "following"
              ? "フォローのシグナルはまだありません。"
              : "おすすめのシグナルはまだありません。"}
          </div>
        ) : (
          visiblePosts.map((post) => (
            <OpenPostCard
              key={post.id}
              post={post}
              currentAccount={normalizedCurrentAccount}
              formatTime={formatTime}
              onToggleLike={toggleLike}
              onToggleSave={toggleSave}
              onToggleResignal={toggleResignal}
              onDelete={handleDelete}
            />
          ))
        )}
      </main>

      <button
        className="floating-button"
        onClick={() => navigate("/posts")}
        type="button"
        title="投稿する"
      >
        ＋
      </button>

      {hiddenModalType === "muted" && (
        <HiddenAccountsModal
          title="ミュート中アカウント"
          ids={mutedAccounts}
          accountDirectory={accountDirectory}
          onClose={closeHiddenModal}
          onRemove={unmuteAccount}
          emptyText="ミュート中のアカウントはありません"
        />
      )}

      {hiddenModalType === "blocked" && (
        <HiddenAccountsModal
          title="ブロック中アカウント"
          ids={blockedAccounts}
          accountDirectory={accountDirectory}
          onClose={closeHiddenModal}
          onRemove={unblockAccount}
          emptyText="ブロック中のアカウントはありません"
        />
      )}

      {hiddenModalType === "reports" && (
        <ReportsModal
          reports={myReports}
          onClose={closeHiddenModal}
          emptyText="まだ通報はありません"
        />
      )}
    </div>
  );
}
