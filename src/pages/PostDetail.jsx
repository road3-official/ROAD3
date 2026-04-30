import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import "./PostDetail.css";

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

function formatDate(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString("ja-JP");
  } catch {
    return "";
  }
}

function formatTimeAgo(ts) {
  if (!ts) return "";
  const diff = Date.now() - Number(ts);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "今";
  if (diff < hour) return `${Math.floor(diff / minute)}分前`;
  if (diff < day) return `${Math.floor(diff / hour)}時間前`;
  return `${Math.floor(diff / day)}日前`;
}

function readAllPosts() {
  const open = safeParse(localStorage.getItem("openPosts"), {});
  const openR18 = safeParse(localStorage.getItem("openR18Posts"), {});
  const group = safeParse(localStorage.getItem("groupPosts"), {});
  const closed = safeParse(localStorage.getItem("closedPosts"), {});

  return [
    ...Object.values(open).flat(),
    ...Object.values(openR18).flat(),
    ...Object.values(group).flat(),
    ...Object.values(closed).flat(),
  ].filter(Boolean);
}

function normalizePost(post) {
  if (!post) return null;

  return {
    ...post,
    id: post?.id ?? "",
    accountId: post?.accountId ?? "",
    author: post?.author ?? post?.userName ?? post?.name ?? "名前未設定",
    userName: post?.userName ?? post?.author ?? post?.name ?? "名前未設定",
    name: post?.name ?? post?.author ?? post?.userName ?? "名前未設定",
    handle: post?.handle ?? post?.userId ?? "@---",
    userId: post?.userId ?? post?.handle ?? "@---",
    text: post?.text ?? post?.content ?? "本文なし",
    content: post?.content ?? post?.text ?? "本文なし",
    timestamp: post?.timestamp ?? post?.createdAt ?? Date.now(),
    createdAt: post?.createdAt ?? post?.timestamp ?? Date.now(),
    image: post?.image ?? (Array.isArray(post?.media) ? post.media[0] : null),
    media: Array.isArray(post?.media)
      ? post.media
      : post?.image
      ? [post.image]
      : [],
    tags: Array.isArray(post?.tags) ? post.tags : [],
    avatarImage: post?.avatarImage ?? post?.profileImage ?? "",
    profileImage: post?.profileImage ?? post?.avatarImage ?? "",
    avatar:
      post?.avatar ??
      post?.icon ??
      post?.author?.charAt(0) ??
      post?.name?.charAt(0) ??
      "?",
    likeCount: Number(post?.likeCount ?? post?.likes ?? 0),
    likes: Number(post?.likes ?? post?.likeCount ?? 0),
    replyCount: Number(post?.replyCount ?? post?.comments ?? 0),
    comments: Number(post?.comments ?? post?.replyCount ?? 0),
    resignalCount: Number(post?.resignalCount ?? post?.resignals ?? 0),
    resignals: Number(post?.resignals ?? post?.resignalCount ?? 0),
    saved: Boolean(post?.saved),
    liked: Boolean(post?.liked),
    likedUserIds: Array.isArray(post?.likedUserIds)
      ? post.likedUserIds.map(String)
      : [],
    space: post?.space ?? "open",
    replies: Array.isArray(post?.replies) ? post.replies : [],
  };
}

function getSpaceLabel(space) {
  if (!space) return "シグナル";
  if (space === "open") return "オープンスペース";
  if (space === "open-r18") return "R18空間";
  if (space === "group") return "グループスペース";
  if (space === "closed") return "クローズドスペース";
  return space;
}

export default function PostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [post, setPost] = useState(null);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedImage, setExpandedImage] = useState(null);
  const [replyText, setReplyText] = useState("");

  const currentAccount = useMemo(
    () => resolveCurrentAccount(location.pathname),
    [location.pathname]
  );
  const currentId = String(currentAccount?.id || "");
  const likedStorageKey = `likedPosts-${currentId}`;
  const savedStorageKey = `savedPosts-${currentId}`;

  useEffect(() => {
    const merged = readAllPosts();
    const found = merged.find((p) => String(p.id) === String(postId));
    setPost(normalizePost(found || null));
  }, [postId]);

  useEffect(() => {
    if (!post) return;

    const likedPosts = safeParse(localStorage.getItem(likedStorageKey), []);
    const savedPostsById = safeParse(localStorage.getItem(savedStorageKey), []);
    const savedPostsLegacy = safeParse(localStorage.getItem("savedPosts"), []);

    const likedIds = Array.isArray(post.likedUserIds)
      ? post.likedUserIds.map(String)
      : [];

    setLiked(
      likedPosts.some((p) => String(p.id) === String(post.id)) ||
        likedIds.includes(currentId)
    );

    setSaved(
      savedPostsById.some((p) => String(p.id) === String(post.id)) ||
        savedPostsLegacy.some((p) => String(p.id) === String(post.id))
    );
  }, [post, likedStorageKey, savedStorageKey, currentId]);

  const spaceLabel = useMemo(() => getSpaceLabel(post?.space), [post]);

  const avatarFallback = useMemo(() => {
    return (post?.author || post?.name || "?").charAt(0);
  }, [post]);

  const handleToggleLike = () => {
    if (!post || !currentId) return;

    const likedPosts = safeParse(localStorage.getItem(likedStorageKey), []);
    const exists = likedPosts.some((p) => String(p.id) === String(post.id));

    if (exists) {
      const updated = likedPosts.filter((p) => String(p.id) !== String(post.id));
      localStorage.setItem(likedStorageKey, JSON.stringify(updated));
      setLiked(false);
    } else {
      localStorage.setItem(
        likedStorageKey,
        JSON.stringify([post, ...likedPosts])
      );
      setLiked(true);
    }
  };

  const handleToggleSave = () => {
    if (!post || !currentId) return;

    const savedPosts = safeParse(localStorage.getItem(savedStorageKey), []);
    const exists = savedPosts.some((p) => String(p.id) === String(post.id));

    if (exists) {
      const updated = savedPosts.filter((p) => String(p.id) !== String(post.id));
      localStorage.setItem(savedStorageKey, JSON.stringify(updated));
      setSaved(false);
    } else {
      localStorage.setItem(
        savedStorageKey,
        JSON.stringify([post, ...savedPosts])
      );
      setSaved(true);
    }
  };

  const handleSubmitReply = () => {
    if (!replyText.trim()) return;
    alert("返信導線は SignalThread 側で本実装していく予定。今は詳細画面の見た目統一を優先中です。");
    setReplyText("");
  };

  const openAuthorProfile = () => {
    if (!post) return;

    const targetAccountId = String(post.accountId || "");
    const myAccountId = String(currentAccount?.id || "");
    const returnFrom = location.state?.from || location.pathname;

    if (targetAccountId && myAccountId && targetAccountId === myAccountId) {
      navigate("/profile", {
        state: { from: returnFrom },
      });
      return;
    }

    navigate(
      `/profile/user/${encodeURIComponent(
        targetAccountId || post.handle || post.userId || "unknown"
      )}`,
      {
        state: {
          from: returnFrom,
          user: {
            id: targetAccountId || post.handle || post.userId || "unknown",
            name: post.author || post.name || "名前未設定",
            userId: post.userId || post.handle || "@---",
            handle: post.handle || post.userId || "@---",
            bio: post.bio || "自己紹介はまだありません。",
            following: post.following ?? 0,
            followers: post.followers ?? 0,
            place: post.place || "未設定",
            links: Array.isArray(post.links) ? post.links : [],
            birthday: post.birthday || "非公開",
            joined: post.joined || post.createdAt || post.timestamp || Date.now(),
            tags: Array.isArray(post.tags) ? post.tags : [],
            avatarImage: post.avatarImage || post.profileImage || "",
            profileImage: post.profileImage || post.avatarImage || "",
            avatar: post.avatar || avatarFallback,
          },
        },
      }
    );
  };

  if (!post) {
    return (
      <div className="postDetail-page unified-detail-page">
        <div className="postDetail-topbar unified-detail-topbar">
          <button
            type="button"
            className="postDetail-back unified-detail-back"
            onClick={() => navigate(-1)}
          >
            ←
          </button>

          <h2 className="postDetail-title unified-detail-title">シグナル</h2>

          <div className="postDetail-right" />
        </div>

        <div className="postDetail-content unified-detail-content">
          <div className="postDetail-empty unified-detail-empty">
            <p>投稿が見つかりません。</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="postDetail-page unified-detail-page">
      <div className="postDetail-topbar unified-detail-topbar">
        <button
          type="button"
          className="postDetail-back unified-detail-back"
          onClick={() => navigate(-1)}
        >
          ←
        </button>

        <h2 className="postDetail-title unified-detail-title">シグナル</h2>

        <div className="postDetail-right" />
      </div>

      <div className="postDetail-content unified-detail-content">
        <article className="postDetail-card unified-detail-card">
          <div className="postDetail-head unified-detail-head">
            <div
              className="postDetail-user unified-detail-user"
              onClick={openAuthorProfile}
              style={{ cursor: "pointer" }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openAuthorProfile();
                }
              }}
            >
              <div className="postDetail-avatar unified-detail-avatar">
                {post.avatarImage || post.profileImage ? (
                  <img
                    src={post.avatarImage || post.profileImage}
                    alt="avatar"
                    className="postDetail-avatarImage unified-detail-avatarImage"
                  />
                ) : (
                  avatarFallback
                )}
              </div>

              <div className="postDetail-meta unified-detail-meta">
                <strong>{post.author || "名前未設定"}</strong>
                <span>
                  @{String(post.handle || "@---").replace(/^@/, "")} ・{" "}
                  {formatTimeAgo(post.timestamp)}
                </span>
              </div>
            </div>
          </div>

          <div className="postDetail-space unified-detail-space">{spaceLabel}</div>

          <div className="postDetail-body unified-detail-body">
            <p>{post.text || "本文なし"}</p>

            {post.image && (
              <div className="postDetail-imageBox unified-detail-imageBox">
                <img
                  src={post.image}
                  alt="投稿画像"
                  className="postDetail-image unified-detail-image"
                  onClick={() => setExpandedImage(post.image)}
                />
              </div>
            )}

            {post.tags && post.tags.length > 0 && (
              <div className="postDetail-tags unified-detail-tags">
                {post.tags.map((tag) => (
                  <span
                    key={`${post.id}-${tag}`}
                    className="postDetail-tag unified-detail-tag"
                  >
                    #{String(tag).replace(/^#/, "")}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="postDetail-stats unified-detail-stats">
            <span>💬 {post.replyCount ?? post.comments ?? 0}</span>
            <span>🔁 {post.resignalCount ?? post.resignals ?? 0}</span>
            <span>❤️ {post.likeCount ?? post.likes ?? 0}</span>
          </div>

          <div className="postDetail-footer unified-detail-footer">
            <button
              type="button"
              className="postDetail-action unified-detail-action"
              onClick={() => {}}
            >
              返信する
            </button>

            <button
              type="button"
              className={`postDetail-action unified-detail-action ${
                liked ? "active liked" : ""
              }`}
              onClick={handleToggleLike}
            >
              {liked ? "❤️ いいね済み" : "♡ いいね"}
            </button>

            <button
              type="button"
              className={`postDetail-action unified-detail-action ${
                saved ? "active" : ""
              }`}
              onClick={handleToggleSave}
            >
              {saved ? "🔖 保存済み" : "🔖 保存"}
            </button>
          </div>
        </article>

        <section className="postDetail-thread unified-detail-thread">
          {Array.isArray(post.replies) && post.replies.length > 0 ? (
            post.replies.map((reply) => (
              <article
                key={reply.id}
                className="postDetail-replyCard unified-detail-replyCard"
              >
                <div className="unified-detail-replyHead">
                  <div className="unified-detail-replyAvatar">
                    {(reply.name || "?").charAt(0)}
                  </div>
                  <div className="unified-detail-replyMeta">
                    <strong>{reply.name || "名前未設定"}</strong>
                    <span>
                      {reply.userId || "@---"} ・ {formatTimeAgo(reply.timestamp)}
                    </span>
                  </div>
                </div>

                <p className="unified-detail-replyText">{reply.text || "本文なし"}</p>

                <div className="unified-detail-replyActions">
                  <button type="button" className="unified-detail-action">
                    返信する
                  </button>
                  <button type="button" className="unified-detail-action">
                    ♡ いいね
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="unified-detail-emptyReply">
              まだ返信はありません
            </div>
          )}
        </section>
      </div>

      <div className="postDetail-replyBox unified-detail-replyBox">
        <input
          type="text"
          className="unified-detail-replyInput"
          placeholder="返信を書く…"
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
        />
        <button
          type="button"
          className="unified-detail-replySubmit"
          onClick={handleSubmitReply}
          disabled={!replyText.trim()}
        >
          送信
        </button>
      </div>

      {expandedImage && (
        <div
          className="postDetail-imageModal unified-detail-imageModal"
          onClick={() => setExpandedImage(null)}
        >
          <img
            src={expandedImage}
            alt="拡大画像"
            className="postDetail-imageModalImg unified-detail-imageModalImg"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            className="postDetail-imageModalClose unified-detail-imageModalClose"
            onClick={() => setExpandedImage(null)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
