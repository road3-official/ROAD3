import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Activity.css";
import PersonalFooterNav from "../components/PersonalFooterNav";

function getTabFromPath(pathname) {
  if (pathname.startsWith("/activity/signals")) return "signals";
  if (pathname.startsWith("/activity/saved")) return "saved";
  return "notifications";
}

function safeJsonParse(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function collectAllPosts() {
  const open = safeJsonParse(localStorage.getItem("openPosts"), {});
  const openR18 = safeJsonParse(localStorage.getItem("openR18Posts"), {});
  const group = safeJsonParse(localStorage.getItem("groupPosts"), {});
  const closed = safeJsonParse(localStorage.getItem("closedPosts"), {});

  const all = [
    ...Object.values(open).flat(),
    ...Object.values(openR18).flat(),
    ...Object.values(group).flat(),
    ...Object.values(closed).flat(),
  ];

  return all
    .filter(Boolean)
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

function formatTime(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString("ja-JP");
  } catch {
    return "";
  }
}

function buildNotificationMessage(item) {
  const fromName =
    item.from ||
    item.fromUser ||
    item.userName ||
    "ユーザー";

  switch (item.type) {
    case "like":
      return `${fromName}さんがいいねしました`;
    case "resignal":
      return `${fromName}さんがリシグナルしました`;
    case "quote":
    case "quote-resignal":
      return `${fromName}さんが引用しました`;
    case "reply":
      return `${fromName}さんが返信しました`;
    case "group_reply":
      return `${fromName}さんがグループで返信しました`;
    case "follow":
      return `${fromName}さんにフォローされました`;
    case "signal":
      return `${fromName}さんが投稿しました`;
    case "group_post":
      return `${fromName}さんがグループに投稿しました`;
    default:
      return item.message || "通知があります。";
  }
}

export default function Activity({
  accounts = [],
  currentAccount,
  notifications = [],
  setNotifications,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const backPath = location.state?.from || "/personal";
  const tab = getTabFromPath(location.pathname);
  const [accountFilter, setAccountFilter] = useState("all");

  const title =
    tab === "signals"
      ? "シグナル確認"
      : tab === "saved"
      ? "保存・いいね確認"
      : "通知";

  const accountMap = useMemo(() => {
    const map = new Map();

    (accounts || []).forEach((acc) => {
      map.set(String(acc.id), {
        id: String(acc.id),
        name: acc.name || "名称未設定",
      });
    });

    if (currentAccount?.id !== undefined && currentAccount?.id !== null) {
      map.set(String(currentAccount.id), {
        id: String(currentAccount.id),
        name: currentAccount.name || "名称未設定",
      });
    }

    return map;
  }, [accounts, currentAccount]);

  const accountTabs = useMemo(() => {
    return [
      { id: "all", name: "全アカウント" },
      ...Array.from(accountMap.values()),
    ];
  }, [accountMap]);

  const allPosts = useMemo(() => collectAllPosts(), []);

  const postMap = useMemo(() => {
    const map = new Map();
    allPosts.forEach((post) => {
      map.set(String(post.id), post);
    });
    return map;
  }, [allPosts]);

  const signalItems = useMemo(() => {
    const mine = allPosts.filter((post) => {
      const authorId = String(post.accountId ?? "");
      if (accountFilter === "all") {
        return Array.from(accountMap.keys()).includes(authorId);
      }
      return authorId === accountFilter;
    });

    return mine.map((post) => ({
      id: post.id,
      title: post.author || post.name || "名前未設定",
      handle: post.handle || post.userId || "@---",
      text: post.text || post.content || "本文なし",
      image: post.image || null,
      time: post.timestamp,
      raw: post,
    }));
  }, [allPosts, accountFilter, accountMap]);

  const savedItems = useMemo(() => {
    const targetIds =
      accountFilter === "all"
        ? Array.from(accountMap.keys())
        : [accountFilter];

    const mergedMap = new Map();

    targetIds.forEach((accountId) => {
      const savedPosts = safeJsonParse(
        localStorage.getItem(`savedPosts-${accountId}`),
        []
      );
      const likedPosts = safeJsonParse(
        localStorage.getItem(`likedPosts-${accountId}`),
        []
      );

      savedPosts.forEach((post) => {
        if (!post?.id) return;
        const key = `${accountId}-${post.id}`;

        mergedMap.set(key, {
          id: post.id,
          title: post.author || post.name || "名前未設定",
          handle: post.handle || post.userId || "@---",
          text: post.text || post.content || "本文なし",
          image: post.image || null,
          time: post.timestamp,
          liked: false,
          bookmarked: true,
          accountId: String(accountId),
          accountName: accountMap.get(String(accountId))?.name || "アカウント",
          raw: post,
        });
      });

      likedPosts.forEach((post) => {
        if (!post?.id) return;
        const key = `${accountId}-${post.id}`;

        if (mergedMap.has(key)) {
          const existing = mergedMap.get(key);
          mergedMap.set(key, {
            ...existing,
            liked: true,
          });
        } else {
          mergedMap.set(key, {
            id: post.id,
            title: post.author || post.name || "名前未設定",
            handle: post.handle || post.userId || "@---",
            text: post.text || post.content || "本文なし",
            image: post.image || null,
            time: post.timestamp,
            liked: true,
            bookmarked: false,
            accountId: String(accountId),
            accountName: accountMap.get(String(accountId))?.name || "アカウント",
            raw: post,
          });
        }
      });
    });

    return Array.from(mergedMap.values()).sort(
      (a, b) => (b.time || 0) - (a.time || 0)
    );
  }, [accountFilter, accountMap]);

  const notificationItems = useMemo(() => {
    const normalized = (notifications || []).map((n) => {
      const normalizedAccountId = String(n.accountId ?? "");
      const resolvedAccountName =
        n.accountName ||
        accountMap.get(normalizedAccountId)?.name ||
        (normalizedAccountId === String(currentAccount?.id ?? "")
          ? currentAccount?.name
          : "") ||
        "アカウント";

      return {
        ...n,
        isRead: typeof n.isRead === "boolean" ? n.isRead : !!n.read,
        accountId: normalizedAccountId,
        accountName: resolvedAccountName,
        message: n.message || buildNotificationMessage(n),
      };
    });

    const filtered =
      accountFilter === "all"
        ? normalized
        : normalized.filter((n) => n.accountId === accountFilter);

    return filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [notifications, accountFilter, accountMap, currentAccount]);

  const markAllRead = () => {
    if (!setNotifications) return;

    setNotifications((prev) =>
      (prev || []).map((n) => {
        const accId = String(n.accountId ?? "");
        if (accountFilter !== "all" && accId !== accountFilter) return n;
        return { ...n, isRead: true, read: true };
      })
    );
  };

  const handleOpenNotification = (item) => {
    if (item.type === "follow") {
      if (item.fromUserId) {
        const normalizedId = String(item.fromUserId).replace(/^@/, "");
        navigate(`/profile/user/${encodeURIComponent(normalizedId)}`, {
          state: { from: location.pathname, fromRoot: backPath },
        });
        return;
      }

      navigate("/profile/follow?tab=followers", {
        state: { from: location.pathname, fromRoot: backPath },
      });
      return;
    }

    if (item.postId) {
      const originalPost = postMap.get(String(item.postId));

      if (originalPost) {
        navigate(`/signal/${item.postId}`, {
          state: {
            from: location.pathname,
            fromRoot: backPath,
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
              image: originalPost.image || null,
              tags: originalPost.tags || [],
              space: originalPost.space || item.source || "open",
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
        state: { from: location.pathname, fromRoot: backPath },
      });
      return;
    }

    if (
      item.source === "group" ||
      item.type === "group_post" ||
      item.type === "group_reply"
    ) {
      navigate("/group", {
        state: { from: location.pathname, fromRoot: backPath },
      });
      return;
    }

    navigate("/open", {
      state: { from: location.pathname, fromRoot: backPath },
    });
  };

  return (
    <div className="activity-page">
      <div className="activity-topbar">
        <button
          type="button"
          className="activity-back"
          onClick={() => navigate(backPath)}
        >
          ← 戻る
        </button>

        <h2 className="activity-title">{title}</h2>

        <div className="activity-topbar-right">
          {tab === "notifications" && (
            <button
              type="button"
              className="activity-smallBtn"
              onClick={markAllRead}
            >
              全て既読
            </button>
          )}
        </div>
      </div>

      <div className="activity-filterRow">
        <div className="activity-chipScroll">
          {accountTabs.map((acc) => (
            <button
              key={acc.id}
              type="button"
              className={`activity-chip ${
                accountFilter === acc.id ? "active" : ""
              }`}
              onClick={() => setAccountFilter(acc.id)}
            >
              {acc.name}
            </button>
          ))}
        </div>
      </div>

      <div className="activity-content">
        {tab === "signals" && (
          <>
            {signalItems.length === 0 ? (
              <div className="activity-empty">
                表示できるシグナルがまだありません。
              </div>
            ) : (
              signalItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="activity-card signal-card"
                  onClick={() =>
                    navigate(`/posts/${item.id}`, {
                      state: { from: location.pathname, fromRoot: backPath },
                    })
                  }
                >
                  <div className="activity-cardHead">
                    <div className="activity-avatar">
                      {(item.title || "?").charAt(0)}
                    </div>
                    <div className="activity-cardMeta">
                      <strong>{item.title}</strong>
                      <span>{item.handle}</span>
                    </div>
                    <div className="activity-time">{formatTime(item.time)}</div>
                  </div>

                  <div className="activity-cardBody">
                    <p>{item.text}</p>
                    {item.image && (
                      <div className="activity-imageBox">画像あり</div>
                    )}
                  </div>

                  <div className="activity-cardFoot">
                    <span>シグナル</span>
                    <span>開く</span>
                  </div>
                </button>
              ))
            )}
          </>
        )}

        {tab === "saved" && (
          <>
            {savedItems.length === 0 ? (
              <div className="activity-empty">
                保存・いいねしたものはまだありません。
              </div>
            ) : (
              savedItems.map((item, index) => (
                <button
                  key={`${item.accountId}-${item.id}-${index}`}
                  type="button"
                  className="activity-card saved-card"
                  onClick={() =>
                    navigate(`/posts/${item.id}`, {
                      state: { from: location.pathname, fromRoot: backPath },
                    })
                  }
                >
                  <div className="activity-cardHead">
                    <div className="activity-avatar">
                      {(item.title || "?").charAt(0)}
                    </div>
                    <div className="activity-cardMeta">
                      <strong>{item.title}</strong>
                      <span>{item.handle}</span>
                    </div>
                    <div className="activity-time">{formatTime(item.time)}</div>
                  </div>

                  <div className="activity-cardBody">
                    <p>{item.text}</p>
                    {item.image && (
                      <div className="activity-imageBox">画像あり</div>
                    )}
                  </div>

                  <div className="activity-cardFoot">
                    <span>
                      {item.accountName}
                      {" ・ "}
                      {item.bookmarked ? "保存" : ""}
                      {item.bookmarked && item.liked ? " / " : ""}
                      {item.liked ? "いいね" : ""}
                    </span>
                    <span>開く</span>
                  </div>
                </button>
              ))
            )}
          </>
        )}

        {tab === "notifications" && (
          <>
            {notificationItems.length === 0 ? (
              <div className="activity-empty">通知はありません。</div>
            ) : (
              notificationItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`activity-card notification-card ${
                    item.isRead ? "read" : "unread"
                  }`}
                  onClick={() => handleOpenNotification(item)}
                >
                  <div className="activity-cardHead">
                    <div className="activity-avatar">
                      {(item.accountName || "通").charAt(0)}
                    </div>
                    <div className="activity-cardMeta">
                      <strong>{item.accountName || "アカウント"}</strong>
                      <span>{item.type || "notification"}</span>
                    </div>
                    <div className="activity-time">
                      {formatTime(item.createdAt)}
                    </div>
                  </div>

                  <div className="activity-cardBody">
                    <p>{item.message || "通知があります。"}</p>
                  </div>

                  <div className="activity-cardFoot">
                    <span>{item.isRead ? "既読" : "未読"}</span>
                    <span>詳細</span>
                  </div>
                </button>
              ))
            )}
          </>
        )}
      </div>
          <PersonalFooterNav notifications={[]} />
    </div>
  );
}
