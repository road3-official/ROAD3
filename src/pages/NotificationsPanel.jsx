import { useEffect, useMemo, useState } from "react";
import "./NotificationsPanel.css";

function buildNotificationMessage(n) {
  const fromName =
    n.from ||
    n.fromUser ||
    n.userName ||
    "ユーザー";

  switch (n.type) {
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
      return n.message || "通知があります";
  }
}

function formatCreatedAt(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString("ja-JP");
  } catch {
    return "";
  }
}

export default function NotificationsPanel({
  notifications,
  setNotifications,
  accounts,
  currentAccount,
}) {
  const [filter, setFilter] = useState("all");

  const accountMap = useMemo(() => {
    const map = new Map();

    (accounts || []).forEach((a) => {
      map.set(String(a.id), a.name || "名称未設定");
    });

    if (currentAccount?.id !== undefined && currentAccount?.id !== null) {
      map.set(
        String(currentAccount.id),
        currentAccount.name || "名称未設定"
      );
    }

    return map;
  }, [accounts, currentAccount]);

  const accountTabs = useMemo(() => {
    const uniqueAccounts = Array.from(accountMap.entries()).map(
      ([id, name]) => ({
        id,
        name,
      })
    );

    return [{ id: "all", name: "全アカウント" }, ...uniqueAccounts];
  }, [accountMap]);

  const norm = (n) => {
    const normalizedAccountId =
      n.accountId != null ? String(n.accountId) : "unknown";

    return {
      ...n,
      isRead: typeof n.isRead === "boolean" ? n.isRead : !!n.read,
      accountId: normalizedAccountId,
      accountName:
        n.accountName ||
        accountMap.get(normalizedAccountId) ||
        "アカウント",
      message: n.message || buildNotificationMessage(n),
    };
  };

  const list = useMemo(() => {
    const base = (notifications || []).map(norm);

    const filtered =
      filter === "all" ? base : base.filter((n) => n.accountId === filter);

    return filtered.sort((a, b) => {
      const ta = Number(a.createdAt ?? a.id ?? 0);
      const tb = Number(b.createdAt ?? b.id ?? 0);
      return tb - ta;
    });
  }, [notifications, filter, accountMap]);

  useEffect(() => {
    if (!setNotifications) return;

    const targetIds = new Set(list.filter((n) => !n.isRead).map((n) => n.id));
    if (targetIds.size === 0) return;

    setNotifications((prev) =>
      (prev || []).map((n) => {
        const isRead =
          typeof n.isRead === "boolean" ? n.isRead : !!n.read;

        if (isRead) return n;
        if (!targetIds.has(n.id)) return n;

        return {
          ...n,
          isRead: true,
          read: true,
        };
      })
    );
  }, [filter, list, setNotifications]);

  const markAllRead = () => {
    if (!setNotifications) return;

    setNotifications((prev) =>
      (prev || []).map((n) => {
        const acc = n.accountId != null ? String(n.accountId) : "unknown";
        if (filter !== "all" && acc !== filter) return n;
        return { ...n, isRead: true, read: true };
      })
    );
  };

  return (
    <div className="np-wrap">
      <div className="np-tabs">
        {accountTabs.map((t) => (
          <button
            key={t.id}
            className={`np-tab ${String(filter) === String(t.id) ? "active" : ""}`}
            onClick={() => setFilter(String(t.id))}
            type="button"
          >
            {t.name}
          </button>
        ))}
      </div>

      <div className="np-actions">
        <button className="np-markAll" type="button" onClick={markAllRead}>
          全て既読
        </button>
      </div>

      {list.length === 0 ? (
        <div className="np-empty">通知はありません</div>
      ) : (
        <div className="np-list">
          {list.map((n) => (
            <div
              key={n.id}
              className={`np-item ${n.isRead ? "read" : "unread"}`}
              onClick={() => console.log("遷移予定:", n)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  console.log("遷移予定:", n);
                }
              }}
            >
              <div className="np-account">{n.accountName}</div>
              <div className="np-msg">{n.message}</div>
              {n.createdAt && (
                <div className="np-time">
                  {formatCreatedAt(n.createdAt)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}