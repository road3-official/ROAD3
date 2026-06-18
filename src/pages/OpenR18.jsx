import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./OpenR18.css";
import OpenPostCard from "../components/OpenPostCard";

const R18_GATE_KEY = "road3_r18_gate_accepted";
const R18_ENABLED_KEY = "r18Enabled";
const OPEN_R18_POSTS_KEY = "openR18Posts";
const MUTED_ACCOUNTS_KEY = "mutedAccounts";
const BLOCKED_ACCOUNTS_KEY = "blockedAccounts";
const REPORTED_POSTS_KEY = "reportedPosts";
const OPEN_GROUP_ACCOUNTS_KEY = "openGroupAccounts";
const CURRENT_ACCOUNT_ID_KEY = "currentAccountId";
const CURRENT_OPEN_GROUP_ACCOUNT_ID_KEY = "currentOpenGroupAccountId";
const ACCOUNT_CHANGED_EVENT = "road3-account-changed";

function safeParse(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function isDisplayableImage(value) {
  if (!value || typeof value !== "string") return false;
  return /^(https?:\/\/|blob:|\/|data:image\/)/i.test(value);
}

function isHeavyDataImage(value) {
  return typeof value === "string" && value.startsWith("data:image/");
}

function sanitizeMediaArray(media) {
  if (!Array.isArray(media)) return [];
  return media.filter((item) => typeof item === "string" && !isHeavyDataImage(item));
}

function addAccountToDirectory(map, account) {
  if (!account?.id && account?.id !== 0) return;

  const id = String(account.id);
  const avatarImage =
    account?.avatarImage && isDisplayableImage(account.avatarImage)
      ? account.avatarImage
      : account?.profileImage && isDisplayableImage(account.profileImage)
      ? account.profileImage
      : isDisplayableImage(account?.avatar)
      ? account.avatar
      : "";

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

  const savedAccounts = safeParse(localStorage.getItem("accounts"), []);
  if (Array.isArray(savedAccounts)) {
    savedAccounts.forEach((account) => addAccountToDirectory(map, account));
  }

  const openPosts = safeParse(localStorage.getItem("openPosts"), {});
  const openR18Posts = safeParse(localStorage.getItem(OPEN_R18_POSTS_KEY), {});

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

function formatTimeLabel(timestamp) {
  if (!timestamp) return "Now";
  const diff = Date.now() - Number(timestamp);
  if (diff < 60 * 1000) return "Now";
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}m`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}h`;
  return `${Math.floor(diff / (24 * 60 * 60 * 1000))}d`;
}

function normalizeAccount(account) {
  if (!account || typeof account !== "object") return null;
  if (account.id === undefined || account.id === null || account.id === "") {
    return null;
  }

  const avatarImage =
    account?.avatarImage && isDisplayableImage(account.avatarImage)
      ? account.avatarImage
      : account?.profileImage && isDisplayableImage(account.profileImage)
      ? account.profileImage
      : isDisplayableImage(account?.avatar)
      ? account.avatar
      : "";

  const avatar =
    avatarImage ||
    account?.avatar ||
    account?.icon ||
    account?.name?.charAt(0) ||
    "G";

  return {
    id: String(account.id),
    name: account.name ?? "ゲスト",
    handle: account.handle ?? account.userId ?? `@${String(account.id)}`,
    avatar,
    avatarImage,
    profileImage: avatarImage,
  };
}

function getCurrentAccount(pathname = "/open/r18") {
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
      localStorage.getItem(OPEN_GROUP_ACCOUNTS_KEY),
      []
    );
    const currentOpenGroupAccountId = localStorage.getItem(
      CURRENT_OPEN_GROUP_ACCOUNT_ID_KEY
    );

    if (Array.isArray(openGroupAccounts) && openGroupAccounts.length > 0) {
      const matched =
        openGroupAccounts.find(
          (acc) => String(acc?.id) === String(currentOpenGroupAccountId)
        ) || openGroupAccounts[0];

      const normalized = normalizeAccount(matched);
      if (normalized) return normalized;
    }
  }

  const accounts = safeParse(localStorage.getItem("accounts"), []);
  const currentAccountId = localStorage.getItem(CURRENT_ACCOUNT_ID_KEY);

  if (Array.isArray(accounts) && accounts.length > 0) {
    const matched =
      accounts.find((acc) => String(acc?.id) === String(currentAccountId)) ||
      accounts[0];

    const normalized = normalizeAccount(matched);
    if (normalized) return normalized;
  }

  const personalAccount = safeParse(localStorage.getItem("personalAccount"), null);
  const normalizedPersonal = normalizeAccount(personalAccount);
  if (normalizedPersonal) return normalizedPersonal;

  return {
    id: "guest",
    name: "ゲスト",
    handle: "@guest",
    avatar: "G",
    avatarImage: "",
    profileImage: "",
  };
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
    isR18: true,
  };
}

function normalizeOriginalPost(post) {
  if (!post) return null;

  const sanitized = sanitizeOriginalPost(post);
  const resolvedName = sanitized?.author ?? sanitized?.userName ?? sanitized?.name ?? "ユーザー";
  const resolvedHandle =
    sanitized?.handle ?? sanitized?.userId ?? `@${sanitized?.accountId ?? "unknown"}`;
  const resolvedAvatarImage =
    sanitized?.avatarImage && isDisplayableImage(sanitized.avatarImage)
      ? sanitized.avatarImage
      : sanitized?.profileImage && isDisplayableImage(sanitized.profileImage)
      ? sanitized.profileImage
      : isDisplayableImage(sanitized?.avatar)
      ? sanitized.avatar
      : "";
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
    userId: resolvedHandle,
    avatar: resolvedAvatar,
    avatarImage: resolvedAvatarImage,
    profileImage: sanitized?.profileImage ?? resolvedAvatarImage,
    icon: resolvedAvatar,
    content: sanitized?.content ?? sanitized?.text ?? "",
    text: sanitized?.text ?? sanitized?.content ?? "",
    createdAt: sanitized?.createdAt ?? sanitized?.timestamp ?? Date.now(),
    timestamp: sanitized?.timestamp ?? sanitized?.createdAt ?? Date.now(),
    likeCount: Number(sanitized?.likeCount ?? 0),
    replyCount: Number(sanitized?.replyCount ?? 0),
    resignalCount: Number(sanitized?.resignalCount ?? 0),
    shareCount: Number(sanitized?.shareCount ?? 0),
    likedUserIds: Array.isArray(sanitized?.likedUserIds) ? sanitized.likedUserIds : [],
    media: Array.isArray(sanitized?.media) ? sanitized.media : [],
    image: sanitized?.image ?? null,
    imageUnavailable: Boolean(sanitized?.imageUnavailable),
    tags: Array.isArray(sanitized?.tags) ? sanitized.tags : [],
    saved: Boolean(sanitized?.saved),
    isR18: true,
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
    originalPost: post?.originalPost ? sanitizeOriginalPost(post.originalPost) : null,
  };
}

function normalizePost(post) {
  const sanitized = sanitizeStoredPost(post);
  const resolvedName = sanitized?.author ?? sanitized?.userName ?? sanitized?.name ?? "ユーザー";
  const resolvedHandle =
    sanitized?.handle ?? sanitized?.userId ?? `@${sanitized?.accountId ?? "unknown"}`;
  const resolvedAvatarImage =
    sanitized?.avatarImage && isDisplayableImage(sanitized.avatarImage)
      ? sanitized.avatarImage
      : sanitized?.profileImage && isDisplayableImage(sanitized.profileImage)
      ? sanitized.profileImage
      : isDisplayableImage(sanitized?.avatar)
      ? sanitized.avatar
      : "";
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
    userId: resolvedHandle,
    avatar: resolvedAvatar,
    avatarImage: resolvedAvatarImage,
    profileImage: sanitized?.profileImage ?? resolvedAvatarImage,
    icon: resolvedAvatar,
    content: sanitized?.content ?? sanitized?.text ?? "",
    text: sanitized?.text ?? sanitized?.content ?? "",
    createdAt: sanitized?.createdAt ?? sanitized?.timestamp ?? Date.now(),
    timestamp: sanitized?.timestamp ?? sanitized?.createdAt ?? Date.now(),
    likeCount: Number(sanitized?.likeCount ?? 0),
    replyCount: Number(sanitized?.replyCount ?? 0),
    resignalCount: Number(sanitized?.resignalCount ?? 0),
    shareCount: Number(sanitized?.shareCount ?? 0),
    likedUserIds: Array.isArray(sanitized?.likedUserIds) ? sanitized.likedUserIds : [],
    media: Array.isArray(sanitized?.media) ? sanitized.media : [],
    image: sanitized?.image ?? null,
    imageUnavailable: Boolean(sanitized?.imageUnavailable),
    tags: Array.isArray(sanitized?.tags) ? sanitized.tags : [],
    saved: Boolean(sanitized?.saved),
    resignaled: Boolean(sanitized?.resignaled),
    isResignal: Boolean(sanitized?.isResignal),
    isQuoteResignal: Boolean(sanitized?.isQuoteResignal),
    originalPost: sanitized?.originalPost ? normalizeOriginalPost(sanitized.originalPost) : null,
    isR18: true,
  };
}

function sanitizePostsObject(storedObject) {
  return Object.fromEntries(
    Object.entries(storedObject || {}).map(([accountId, list]) => [
      accountId,
      (Array.isArray(list) ? list : []).map(sanitizeStoredPost),
    ])
  );
}

function flattenR18Posts(storedObject) {
  if (!storedObject || typeof storedObject !== "object") return [];

  return Object.values(storedObject)
    .flat()
    .filter(Boolean)
    .map(normalizePost)
    .filter((post) => post.isR18 !== false)
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
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
                        @{String(account.handle).replace(/^@/, "")}
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

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gap: 10,
            maxHeight: 420,
            overflowY: "auto",
          }}
        >
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
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
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

                <div
                  style={{
                    fontSize: 13,
                    color: "#555",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
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

export default function OpenR18() {
  const navigate = useNavigate();
  const location = useLocation();
const [currentAccount, setCurrentAccount] = useState(() =>
  getCurrentAccount(location.pathname)
);

  const [gateAccepted, setGateAccepted] = useState(
    localStorage.getItem(R18_GATE_KEY) === "true"
  );
  const [tab, setTab] = useState("recommend");
  const [posts, setPosts] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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

  const syncCurrentAccount = useCallback(() => {
  setCurrentAccount(getCurrentAccount(location.pathname));
}, [location.pathname]);

  const reloadPosts = useCallback(() => {
    const stored = safeParse(localStorage.getItem(OPEN_R18_POSTS_KEY), {});
    const sanitized = sanitizePostsObject(stored);
    const flattened = flattenR18Posts(sanitized);
    setPosts(flattened);

    if (JSON.stringify(stored) !== JSON.stringify(sanitized)) {
      localStorage.setItem(OPEN_R18_POSTS_KEY, JSON.stringify(sanitized));
    }
  }, []);

  useEffect(() => {
    syncCurrentAccount();
    reloadPosts();
  }, [reloadPosts, syncCurrentAccount]);

  useEffect(() => {
    const closeMenu = () => setIsMenuOpen(false);
    if (isMenuOpen) {
      window.addEventListener("click", closeMenu);
    }
    return () => {
      window.removeEventListener("click", closeMenu);
    };
  }, [isMenuOpen]);

  useEffect(() => {
  const syncAll = () => {
    syncCurrentAccount();
    setMutedAccounts(
      safeParse(localStorage.getItem(MUTED_ACCOUNTS_KEY), []).map(String)
    );
    setBlockedAccounts(
      safeParse(localStorage.getItem(BLOCKED_ACCOUNTS_KEY), []).map(String)
    );
    setReportedPosts(safeParse(localStorage.getItem(REPORTED_POSTS_KEY), []));
    reloadPosts();
  };

  window.addEventListener("focus", syncAll);
  window.addEventListener("storage", syncAll);
  window.addEventListener(ACCOUNT_CHANGED_EVENT, syncAll);

  return () => {
    window.removeEventListener("focus", syncAll);
    window.removeEventListener("storage", syncAll);
    window.removeEventListener(ACCOUNT_CHANGED_EVENT, syncAll);
  };
}, [reloadPosts, syncCurrentAccount]);

  const accountDirectory = useMemo(() => {
    return buildAccountDirectory(currentAccount);
  }, [currentAccount, posts]);

  const hiddenAccountIds = useMemo(() => {
    return new Set([...mutedAccounts, ...blockedAccounts].map(String));
  }, [mutedAccounts, blockedAccounts]);

  const myReports = useMemo(() => {
    const myId = String(currentAccount?.id ?? "");
    return reportedPosts
      .filter((report) => String(report.reportedByAccountId ?? "") === myId)
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
  }, [reportedPosts, currentAccount]);

  const filteredPosts = useMemo(() => {
    return posts.filter(
      (post) => !hiddenAccountIds.has(String(post.accountId))
    );
  }, [posts, hiddenAccountIds]);

  const visiblePosts = useMemo(() => {
    if (tab === "following") {
      return filteredPosts.filter(
        (post) =>
          post.isFollowingAuthor ||
          String(post.accountId) === String(currentAccount.id)
      );
    }
    return filteredPosts;
  }, [filteredPosts, tab, currentAccount]);

  const acceptGate = () => {
    localStorage.setItem(R18_GATE_KEY, "true");
    localStorage.setItem(R18_ENABLED_KEY, "true");
    setGateAccepted(true);
  };

  const leaveR18 = () => {
    navigate("/open");
  };

  const updateStoredPosts = (updater) => {
    const stored = safeParse(localStorage.getItem(OPEN_R18_POSTS_KEY), {});
    const sanitizedStored = sanitizePostsObject(stored);
    const updated = updater(sanitizedStored);
    const sanitizedUpdated = sanitizePostsObject(updated);
    localStorage.setItem(OPEN_R18_POSTS_KEY, JSON.stringify(sanitizedUpdated));
    reloadPosts();
  };

  const handleToggleLike = (postId) => {
    if (!currentAccount?.id) return;

    updateStoredPosts((stored) =>
      Object.fromEntries(
        Object.entries(stored).map(([accountId, list]) => {
          const nextPosts = (list || []).map((post) => {
            if (String(post.id) !== String(postId)) return post;

            const likedUserIds = Array.isArray(post.likedUserIds)
              ? post.likedUserIds.map(String)
              : [];

            const myId = String(currentAccount.id);
            const alreadyLiked = likedUserIds.includes(myId);

            const nextLikedUserIds = alreadyLiked
              ? likedUserIds.filter((id) => id !== myId)
              : [...likedUserIds, myId];

            return {
              ...post,
              likedUserIds: nextLikedUserIds,
              liked: !alreadyLiked,
              likeCount: nextLikedUserIds.length,
            };
          });

          return [accountId, nextPosts];
        })
      )
    );
  };

  const handleToggleSave = (postId) => {
    updateStoredPosts((stored) =>
      Object.fromEntries(
        Object.entries(stored).map(([accountId, list]) => {
          const nextPosts = (list || []).map((post) => {
            if (String(post.id) !== String(postId)) return post;
            return {
              ...post,
              saved: !Boolean(post.saved),
            };
          });
          return [accountId, nextPosts];
        })
      )
    );
  };

  const handleToggleResignal = (postId) => {
    if (!currentAccount?.id) return;

    const myId = String(currentAccount.id);
    const myName = currentAccount.name ?? "ユーザー";
    const myHandle = currentAccount.handle ?? `@${myId}`;
    const myAvatar =
      currentAccount.avatarImage ??
      currentAccount.profileImage ??
      currentAccount.avatar ??
      (myName ? myName.charAt(0) : "U");
    const myAvatarImage =
      currentAccount.avatarImage ?? currentAccount.profileImage ?? "";

    updateStoredPosts((stored) => {
      const cloned = Object.fromEntries(
        Object.entries(stored).map(([accountId, list]) => [
          String(accountId),
          Array.isArray(list) ? [...list] : [],
        ])
      );

      let foundPost = null;
      let foundOwnerId = null;

      for (const [ownerId, list] of Object.entries(cloned)) {
        for (const item of list) {
          if (String(item.id) === String(postId)) {
            foundPost = item;
            foundOwnerId = String(ownerId);
            break;
          }
        }
        if (foundPost) break;
      }

      if (!foundPost || !foundOwnerId) {
        return stored;
      }

      const sourcePost =
        foundPost.isResignal && foundPost.originalPost
          ? normalizeOriginalPost(foundPost.originalPost)
          : normalizeOriginalPost(foundPost);

      if (!sourcePost) {
        return stored;
      }

      if (String(foundOwnerId) === myId) {
        return stored;
      }

      const fixedSourcePost = {
        ...sourcePost,
        accountId: foundOwnerId,
        image: null,
        media: [],
        imageUnavailable:
          sourcePost.imageUnavailable ||
          Boolean(sourcePost.image || sourcePost.media?.length),
        isR18: true,
      };

      const myPosts = Array.isArray(cloned[myId]) ? [...cloned[myId]] : [];

      const existingIndex = myPosts.findIndex((item) => {
        if (!item?.isResignal || item?.isQuoteResignal) return false;
        if (!item?.originalPost) return false;
        return String(item.originalPost.id) === String(fixedSourcePost.id);
      });

      if (existingIndex >= 0) {
        myPosts.splice(existingIndex, 1);
        cloned[myId] = myPosts;

        cloned[foundOwnerId] = (cloned[foundOwnerId] || []).map((item) => {
          const isSameTarget =
            String(item.id) === String(foundPost.id) ||
            (item?.isResignal &&
              item?.originalPost &&
              String(item.originalPost.id) === String(fixedSourcePost.id));

          if (!isSameTarget) return item;

          return {
            ...item,
            resignalCount: Math.max(Number(item.resignalCount || 0) - 1, 0),
          };
        });

        return cloned;
      }

      const resignalPost = sanitizeStoredPost({
        id: `r18-resignal-${myId}-${fixedSourcePost.id}`,
        accountId: myId,
        author: myName,
        userName: myName,
        name: myName,
        handle: myHandle,
        userId: myHandle,
        avatar: myAvatar,
        avatarImage: myAvatarImage,
        profileImage: myAvatarImage,
        icon: myAvatar,
        content: "",
        text: "",
        createdAt: Date.now(),
        timestamp: Date.now(),
        likeCount: 0,
        replyCount: 0,
        resignalCount: 0,
        shareCount: 0,
        likedUserIds: [],
        media: [],
        image: null,
        imageUnavailable: Boolean(fixedSourcePost.imageUnavailable),
        tags: [],
        saved: false,
        resignaled: true,
        isResignal: true,
        isQuoteResignal: false,
        originalPost: fixedSourcePost,
        isR18: true,
        isFollowingAuthor: true,
      });

      cloned[myId] = [resignalPost, ...myPosts];

      cloned[foundOwnerId] = (cloned[foundOwnerId] || []).map((item) => {
        const isSameTarget =
          String(item.id) === String(foundPost.id) ||
          (item?.isResignal &&
            item?.originalPost &&
            String(item.originalPost.id) === String(fixedSourcePost.id));

        if (!isSameTarget) return item;

        return {
          ...item,
          resignalCount: Number(item.resignalCount || 0) + 1,
        };
      });

      return cloned;
    });
  };

  const handleDelete = (postId) => {
    const confirmed = window.confirm("このシグナルを削除しますか？");
    if (!confirmed) return;

    updateStoredPosts((stored) => {
      const updated = {};
      Object.keys(stored).forEach((accountId) => {
        updated[accountId] = (stored[accountId] || []).filter(
          (post) => String(post.id) !== String(postId)
        );
      });
      return updated;
    });
  };

  const openMyPage = () => {
    navigate("/profile", { state: { from: "/open/r18" } });
  };

  const openDmList = () => {
    navigate("/dm", { state: { from: "/open/r18" } });
  };

  const openR18Settings = () => {
    setIsMenuOpen(false);
    navigate("/settings/r18");
  };

  const openNotifications = () => {
    setIsMenuOpen(false);
    navigate("/notifications", { state: { from: "/open/r18" } });
  };

  const openMySignals = () => {
    setIsMenuOpen(false);
    navigate("/activity/signals", {
      state: { from: "/open/r18", onlyR18: true },
    });
  };

  const openSaved = () => {
    setIsMenuOpen(false);
    navigate("/activity/saved", {
      state: { from: "/open/r18", onlyR18: true },
    });
  };

  const backToOpen = () => {
    setIsMenuOpen(false);
    navigate("/open");
  };

  const openR18PostComposer = () => {
    navigate("/posts", {
      state: { defaultIsR18: true, from: "/open/r18", forceR18: true },
    });
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

  if (!gateAccepted) {
    return (
      <div className="open-r18-gate-wrap">
        <div className="open-r18-gate-card">
          <div className="open-r18-gate-badge">ROAD3 for R18</div>
          <h1 className="open-r18-gate-title">年齢確認</h1>
          <p className="open-r18-gate-text">
            この空間には18歳以上を対象とした表現が含まれる可能性があります。
            <br />
            閲覧するには、18歳以上であることへの確認が必要です。
          </p>

          <div className="open-r18-gate-notes">
            <div>・通常のオープンスペースとは分離された専用空間です</div>
            <div>・R18タグ付き投稿のみ表示されます</div>
            <div>・メディアは初期状態でぼかして表示されます</div>
            <div>・投稿の保存やR18内リシグナルはできます</div>
          </div>

          <div className="open-r18-gate-actions">
            <button className="open-r18-secondary-btn" onClick={leaveR18}>
              戻る
            </button>
            <button className="open-r18-primary-btn" onClick={acceptGate}>
              18歳以上です
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="open-page open-r18-page unified-open-page">
      <header className="open-header">
        <button
          type="button"
          className="open-profileBtn"
          onClick={openMyPage}
          title="マイページ"
        >
          {currentAccount.avatarImage ? (
            <img
              src={currentAccount.avatarImage}
              alt={currentAccount?.name || "avatar"}
              className="open-profileAvatarImage"
            />
          ) : (
            <span className="open-profileAvatar">
              {(currentAccount?.name || "?").charAt(0)}
            </span>
          )}
        </button>

        <div className="app-logoBlock">
  <h2 className="open-logo">ROAD3 for R18</h2>
  <span className="app-spaceName">Open R18 Space</span>
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
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen((v) => !v);
              }}
              title="メニュー"
            >
              ⋯
            </button>

            {isMenuOpen && (
              <div
                className="open-menuDropdown"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="open-menuItem"
                  onClick={openMySignals}
                >
                  自分のR18シグナル
                </button>

                <button
                  type="button"
                  className="open-menuItem"
                  onClick={openSaved}
                >
                  保存・いいね確認
                </button>

                <button
                  type="button"
                  className="open-menuItem"
                  onClick={openNotifications}
                >
                  通知確認
                </button>

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

                <button
                  type="button"
                  className="open-menuItem"
                  onClick={backToOpen}
                >
                  通常Openへ戻る
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="open-tabs">
        <button
          type="button"
          className={`open-tab ${tab === "recommend" ? "active" : ""}`}
          onClick={() => setTab("recommend")}
        >
          おすすめ
        </button>

        <button
          type="button"
          className={`open-tab ${tab === "following" ? "active" : ""}`}
          onClick={() => setTab("following")}
        >
          フォロー
        </button>
      </div>

      <section className="open-r18-entry open-r18-entry-static">
        <div className="open-r18-entryText">
          <div className="open-r18-entryBadge">R-18</div>
          <div className="open-r18-entryTitle">18禁空間です</div>
          <div className="open-r18-entrySub">
            投稿の保存可 / R18内リシグナル可 / 通常空間とは分離
          </div>
        </div>

        <button
          type="button"
          className="open-r18-entryBtn"
          onClick={backToOpen}
        >
          戻る
        </button>
      </section>

      <main className="open-posts open-r18-posts">
        {visiblePosts.length === 0 ? (
          <div className="open-empty">
            {tab === "following"
              ? "フォロー中のR18投稿はまだありません。"
              : "R18投稿はまだありません。"}
          </div>
        ) : (
          visiblePosts.map((post) => (
            <OpenPostCard
              key={post.id}
              post={post}
              formatTime={formatTimeLabel}
              onToggleLike={handleToggleLike}
              onToggleSave={handleToggleSave}
              onToggleResignal={handleToggleResignal}
              onDelete={handleDelete}
              r18Mode
            />
          ))
        )}
      </main>

      <button
        className="floating-button"
        onClick={openR18PostComposer}
        type="button"
        title="R18投稿する"
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
