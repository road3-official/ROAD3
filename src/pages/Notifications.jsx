import { useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Notifications.css";

const OPEN_POSTS_KEY = "openPosts";
const OPEN_R18_POSTS_KEY = "openR18Posts";
const GROUP_POSTS_KEY = "groupPosts";
const CLOSED_POSTS_KEY = "closedPosts";

function safeParse(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function formatTime(timestamp) {
  if (!timestamp) return "";

  const diffMs = Date.now() - Number(timestamp);
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  if (diffHour < 24) return `${diffHour}時間前`;
  return `${diffDay}日前`;
}

function normalizeRead(notification) {
  return Boolean(notification?.read || notification?.isRead);
}

function getUserName(notification) {
  return (
    notification?.from ||
    notification?.fromUser ||
    notification?.accountName ||
    "ユーザー"
  );
}

function getSpaceLabel(source, rawType, raw) {
  if (raw?.isR18 || source === "open-r18") return "R18";

  if (
    source === "group" ||
    rawType === "group_post" ||
    rawType === "group_reply"
  ) {
    return "グループ";
  }

  if (source === "closed") return "クローズ";
  if (source === "open") return "オープン";

  return "";
}

function buildUserSummary(users) {
  const uniqueUsers = [...new Set((users || []).filter(Boolean))];

  if (uniqueUsers.length === 0) {
    return {
      text: "ユーザーさん",
      count: 0,
    };
  }

  if (uniqueUsers.length === 1) {
    return {
      text: `${uniqueUsers[0]}さん`,
      count: 1,
    };
  }

  if (uniqueUsers.length === 2) {
    return {
      text: `${uniqueUsers[0]}さん、${uniqueUsers[1]}さん`,
      count: 2,
    };
  }

  return {
    text: `${uniqueUsers[0]}さん、${uniqueUsers[1]}さん ほか${uniqueUsers.length - 2}人`,
    count: uniqueUsers.length,
  };
}

function buildActionMessage(item) {
  const userSummary = buildUserSummary(item.users);
  const countSuffix = item.count > 1 ? `（${item.count}件）` : "";

  switch (item.type) {
    case "like":
      return `${userSummary.text}がいいねしました${countSuffix}`;
    case "resignal":
      return `${userSummary.text}がリシグナルしました${countSuffix}`;
    case "quote":
    case "quote-resignal":
      return `${userSummary.text}が引用しました${countSuffix}`;
    case "reply":
      return `${userSummary.text}が返信しました${countSuffix}`;
    case "group_post":
      return `${userSummary.text}が投稿しました${countSuffix}`;
    case "group_reply":
      return `${userSummary.text}が返信しました${countSuffix}`;
    case "follow":
      return `${userSummary.text}にフォローされました${countSuffix}`;
    case "signal":
      return `${userSummary.text}が投稿しました${countSuffix}`;
    default:
      return "通知があります";
  }
}

function collectAllPosts() {
  const openPosts = safeParse(localStorage.getItem(OPEN_POSTS_KEY), {});
  const openR18Posts = safeParse(localStorage.getItem(OPEN_R18_POSTS_KEY), {});
  const groupPosts = safeParse(localStorage.getItem(GROUP_POSTS_KEY), {});
  const closedPosts = safeParse(localStorage.getItem(CLOSED_POSTS_KEY), {});

  return [
    ...Object.values(openPosts).flat(),
    ...Object.values(openR18Posts).flat(),
    ...Object.values(groupPosts).flat(),
    ...Object.values(closedPosts).flat(),
  ].filter(Boolean);
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
      (p) => String(p?.id) === String(postId)
    );

    if (found) return found;
  }

  return null;
}
function getPostPreviewText(item) {
  if (!item?.postId) return "";

  const post = findPostById(item.postId);
  if (!post) return "";

  const text =
    post.content ||
    post.text ||
    post.originalPost?.content ||
    post.originalPost?.text ||
    "";

  return String(text).trim();
}

function shouldHideNotification(notification, currentAccount) {
  if (!notification || !currentAccount) return false;

  const sameAccount =
    String(notification.accountId || "") === String(currentAccount.id || "");

  if (!sameAccount) return false;

  if (notification.type === "signal" || notification.type === "group_post") {
    return true;
  }

  return false;
}

function Notifications({ notifications, setNotifications, currentAccount }) {
  const navigate = useNavigate();
  const location = useLocation();

  const backPath = location.state?.from || "/open";

  const myNotifications = useMemo(() => {
    if (!currentAccount) return [];

    return [...notifications]
      .filter((n) => String(n.accountId) === String(currentAccount.id))
      .filter((n) => !shouldHideNotification(n, currentAccount))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, 250);
  }, [notifications, currentAccount]);

  useEffect(() => {
    if (!currentAccount) return;

    const hasUnread = notifications.some(
      (n) =>
        String(n.accountId) === String(currentAccount.id) &&
        !shouldHideNotification(n, currentAccount) &&
        !normalizeRead(n)
    );

    if (!hasUnread) return;

    const updated = notifications.map((n) =>
      String(n.accountId) === String(currentAccount.id) &&
      !shouldHideNotification(n, currentAccount)
        ? { ...n, read: true, isRead: true }
        : n
    );

    setNotifications(updated);
  }, [notifications, currentAccount, setNotifications]);

  const groupedNotifications = useMemo(() => {
    const groups = [];

    myNotifications.forEach((n) => {
      const canGroup =
        n.type === "like" ||
        n.type === "resignal" ||
        n.type === "reply" ||
        n.type === "group_reply" ||
        n.type === "follow";

      const source = n.source || "";
      const read = normalizeRead(n);

      if (!canGroup) {
        groups.push({
          id: n.id,
          type: n.type,
          source,
          users: [getUserName(n)],
          count: 1,
          createdAt: n.createdAt,
          read,
          link: n.link,
          postId: n.postId,
          fromUserId: n.fromUserId || "",
          raw: [n],
          isR18: Boolean(n.isR18),
          accountName:
            n.accountName || currentAccount?.name || "アカウント",
        });
        return;
      }

      const groupKey =
        n.type === "follow"
          ? `${n.type}-${String(n.fromUserId || "")}-${String(n.link || "")}`
          : `${n.type}-${String(n.postId || "")}-${String(
              n.link || ""
            )}-${source}-${Boolean(n.isR18)}`;

      const existing = groups.find((g) => g.groupKey === groupKey);

      if (existing) {
        existing.users.push(getUserName(n));
        existing.count += 1;
        existing.createdAt = Math.max(existing.createdAt || 0, n.createdAt || 0);
        existing.read = existing.read && read;
        existing.raw.push(n);
      } else {
        groups.push({
          groupKey,
          id: n.id,
          type: n.type,
          source,
          users: [getUserName(n)],
          count: 1,
          createdAt: n.createdAt,
          read,
          link: n.link,
          postId: n.postId,
          fromUserId: n.fromUserId || "",
          raw: [n],
          isR18: Boolean(n.isR18),
          accountName:
            n.accountName || currentAccount?.name || "アカウント",
        });
      }
    });

    return groups.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [myNotifications, currentAccount]);

  const getIcon = (type) => {
    switch (type) {
      case "like":
        return "❤️";
      case "resignal":
        return "🔁";
      case "quote":
      case "quote-resignal":
        return "✍️";
      case "follow":
        return "👤";
      case "reply":
      case "group_reply":
        return "💬";
      case "signal":
      case "group_post":
        return "📣";
      default:
        return "🔔";
    }
  };

  const getIconClass = (type) => {
    switch (type) {
      case "like":
        return "like";
      case "resignal":
        return "resignal";
      case "quote":
      case "quote-resignal":
        return "quote";
      case "follow":
        return "follow";
      case "reply":
      case "group_reply":
        return "reply";
      case "signal":
      case "group_post":
        return "signal";
      default:
        return "default";
    }
  };

  const handleOpenNotification = (item) => {
    if (item.type === "follow") {
      if (item.fromUserId) {
        const normalizedId = String(item.fromUserId).replace(/^@/, "");
        navigate(`/profile/user/${encodeURIComponent(normalizedId)}`, {
          state: { from: backPath },
        });
        return;
      }

      if (item.link) {
        navigate(item.link, { state: { from: backPath } });
        return;
      }

      navigate("/profile/follow?tab=followers", {
        state: { from: backPath },
      });
      return;
    }

    if (item.postId) {
      const originalPost = findPostById(item.postId);

      if (originalPost) {
        const isMine =
          String(currentAccount?.id || "") ===
          String(originalPost.accountId || "");

        navigate(`/signal/${item.postId}`, {
          state: {
            from: backPath,
            post: {
              ...originalPost,
              id: originalPost.id,
              name:
                originalPost.name ||
                originalPost.author ||
                originalPost.userName ||
                "ユーザー名",
              author:
                originalPost.author ||
                originalPost.name ||
                originalPost.userName ||
                "ユーザー名",
              userId:
                originalPost.userId ||
                originalPost.handle ||
                `@${originalPost.accountId}`,
              handle:
                originalPost.handle ||
                originalPost.userId ||
                `@${originalPost.accountId}`,
              time: formatTime(originalPost.timestamp),
              content: originalPost.content || originalPost.text || "",
              text: originalPost.text || originalPost.content || "",
              comments: originalPost.comments ?? originalPost.replyCount ?? 0,
              replyCount: originalPost.replyCount ?? originalPost.comments ?? 0,
              resignals:
                originalPost.resignals ?? originalPost.resignalCount ?? 0,
              resignalCount:
                originalPost.resignalCount ?? originalPost.resignals ?? 0,
              likes: originalPost.likes ?? originalPost.likeCount ?? 0,
              likeCount: originalPost.likeCount ?? originalPost.likes ?? 0,
              level: 0,
              isMine,
              image: originalPost.image || null,
              tags: originalPost.tags || [],
              isResignal: originalPost.isResignal || false,
              isQuoteResignal: originalPost.isQuoteResignal || false,
              originalPost: originalPost.originalPost || null,
              accountId: originalPost.accountId,
              avatarImage:
                originalPost.avatarImage ||
                originalPost.profileImage ||
                "",
              profileImage:
                originalPost.profileImage ||
                originalPost.avatarImage ||
                "",
            },
          },
        });
        return;
      }

      navigate(`/signal/${item.postId}`, {
        state: { from: backPath },
      });
      return;
    }

    if (item.link) {
      navigate(item.link, { state: { from: backPath } });
      return;
    }

    if (
      item.source === "group" ||
      item.type === "group_post" ||
      item.type === "group_reply"
    ) {
      navigate("/group", { state: { from: backPath } });
      return;
    }

    navigate("/open", { state: { from: backPath } });
  };

  if (!currentAccount) {
    return <div className="notifications-page">読み込み中...</div>;
  }

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <button
          type="button"
          className="notifications-back"
          onClick={() => navigate(backPath)}
        >
          ←
        </button>

        <h2 className="notifications-title">通知</h2>

        <div className="notifications-badgeWrap">
          {myNotifications.some((n) => !normalizeRead(n)) && (
            <span className="notifications-badge">新</span>
          )}
        </div>
      </div>

      <div className="notifications-list">
        {groupedNotifications.length === 0 ? (
          <p className="notifications-empty">通知はありません</p>
        ) : (
          groupedNotifications.map((item) => {
            const firstRaw = item.raw?.[0] || {};
            const spaceLabel = getSpaceLabel(item.source, item.type, firstRaw);
            const previewText = getPostPreviewText(item);

            return (
              <div
                key={`${item.type}-${item.id}-${item.createdAt}`}
                className={`notifications-card ${item.read ? "read" : "unread"}`}
                onClick={() => handleOpenNotification(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleOpenNotification(item);
                  }
                }}
              >
                <div
                  className={`notifications-cardIcon ${getIconClass(item.type)}`}
                >
                  {getIcon(item.type)}
                </div>

                <div className="notifications-cardBody">
                  <p className="notifications-cardAccount">
                    {item.accountName || currentAccount?.name || "アカウント"}
                  </p>

                  {spaceLabel && (
                    <p className="notifications-cardSpace">{spaceLabel}</p>
                  )}

                  <p className="notifications-cardText">
                    {buildActionMessage(item)}
                  </p>

                  {previewText && (
                    <p className="notifications-cardPreview">{previewText}</p>
                  )}

                  <div className="notifications-cardMeta">
                    <span className="notifications-cardTime">
                      {formatTime(item.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Notifications;