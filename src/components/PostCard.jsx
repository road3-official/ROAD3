import "./PostCard.css";
import { useNavigate, useLocation } from "react-router-dom";
import { useMemo, useState } from "react";

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
  if (!timestamp) return "";
  const diff = Date.now() - Number(timestamp);

  if (diff < 60 * 1000) return "今";
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}分前`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}時間前`;
  return `${Math.floor(diff / (24 * 60 * 60 * 1000))}日前`;
}

function normalizeAccount(account) {
  if (!account || typeof account !== "object") return null;
  if (account.id === undefined || account.id === null || account.id === "") {
    return null;
  }

  return {
    ...account,
    id: String(account.id),
    name: account.name ?? "ユーザー",
    handle: account.handle ?? account.userId ?? `@${account.id}`,
    avatarImage: account.avatarImage ?? account.profileImage ?? "",
    profileImage: account.profileImage ?? account.avatarImage ?? "",
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

function PostCard({ post, clickable = true }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedImage, setExpandedImage] = useState(null);

  const currentAccount = useMemo(() => {
    return resolveCurrentAccount(location.pathname);
  }, [location.pathname]);

  const isMyPost =
    post.isMine ||
    String(currentAccount?.handle || "").replace(/^@/, "") ===
      String(post.userId || post.handle || "").replace(/^@/, "") ||
    String(currentAccount?.id || "") === String(post.accountId || "");

  const displayTime = useMemo(() => {
    return post.time || formatTimeAgo(post.timestamp);
  }, [post.time, post.timestamp]);

  const replyCount = post.replyCount ?? post.comments ?? 0;
  const resignalCount = post.resignalCount ?? post.resignals ?? 0;
  const likeCount = post.likeCount ?? post.likes ?? 0;

  const handleCardClick = () => {
    if (!clickable) return;

    navigate(`/signal/${post.id}`, {
      state: {
        post,
        from: location.pathname,
      },
    });
  };

  const handleProfileClick = (e) => {
    e.stopPropagation();

    const profileId =
      String(post.accountId || "") ||
      String(post.userId || post.handle || "").replace(/^@/, "");

    navigate(`/profile/user/${encodeURIComponent(profileId)}`, {
      state: {
        from: location.pathname,
        user: {
          id: profileId,
          name: post.name,
          userId: post.userId || post.handle,
          handle: post.handle || post.userId,
          bio: post.bio || "自己紹介はまだありません。",
          following: post.following ?? 0,
          followers: post.followers ?? 0,
          place: post.place || "未設定",
          links: post.links || [],
          birthday: post.birthday || "非公開",
          joined: post.joined || "ROAD3開始日",
          tags: post.tags || [],
          avatarImage: post.avatarImage || post.profileImage || "",
          avatar:
            post.avatar ||
            post.icon ||
            post.name?.charAt(0) ||
            "?",
        },
      },
    });
  };

  const handleImageClick = (e, imageSrc) => {
    e.stopPropagation();
    setExpandedImage(imageSrc);
  };

  const closeImageModal = (e) => {
    e.stopPropagation();
    setExpandedImage(null);
  };

  const renderAvatar = () => {
    const avatarImage = post.avatarImage || post.profileImage || "";

    if (avatarImage) {
      return (
        <img
          src={avatarImage}
          alt="avatar"
          className="post-icon-image"
          draggable={false}
        />
      );
    }

    return (post.avatar || post.icon || post.name || "?").charAt(0);
  };

  return (
    <>
      <div
        className={`post-card ${clickable ? "clickable" : ""}`}
        onClick={handleCardClick}
      >
        {post.pinned && <p className="pinned-label">📌 固定シグナル</p>}

        <div className="post-header">
          <div className="post-icon" onClick={handleProfileClick}>
            {renderAvatar()}
          </div>

          <div className="post-user-info">
            <div className="post-user-top">
              <p className="post-name" onClick={handleProfileClick}>
                {post.name}
                {isMyPost && <span className="post-own-badge">・自分</span>}
              </p>

              <p className="post-id-time">
                {post.userId || post.handle} ・ {displayTime}
              </p>
            </div>

            {post.replyToName && (
              <p className="reply-to-text">
                ↪ {post.replyToUserId} への返信
              </p>
            )}

            {post.isResignal && post.originalPost ? (
              <div className="resignal-box">
                <p className="resignal-label">
                  {post.isQuoteResignal ? "✍ 引用リシグナル" : "↻ リシグナル"}
                </p>

                {post.content && post.content !== post.originalPost.text && (
                  <p className="post-content">{post.content}</p>
                )}

                {post.tags && post.tags.length > 0 && (
                  <div className="post-tags">
                    {post.tags.map((tag) => {
                      const tagText = `#${String(tag).replace(/^#/, "")}`;
                      return (
                        <span
                          key={`${post.id}-quote-${tagText}`}
                          className="post-tag"
                        >
                          {tagText}
                        </span>
                      );
                    })}
                  </div>
                )}

                <div className="resignal-original">
                  <div className="resignal-original-top">
                    <div className="resignal-original-avatar">
                      {post.originalPost.avatarImage ||
                      post.originalPost.profileImage ? (
                        <img
                          src={
                            post.originalPost.avatarImage ||
                            post.originalPost.profileImage
                          }
                          alt="元シグナルのアイコン"
                          className="post-icon-image"
                          draggable={false}
                        />
                      ) : (
                        (post.originalPost.author ||
                          post.originalPost.name ||
                          "?").charAt(0)
                      )}
                    </div>

                    <div className="resignal-original-head">
                      <strong>
                        {post.originalPost.author || post.originalPost.name}
                      </strong>
                      <span>
                        {post.originalPost.handle || post.originalPost.userId}
                      </span>
                    </div>
                  </div>

                  <p className="resignal-original-text">
                    {post.originalPost.text}
                  </p>

                  {post.originalPost.image && (
                    <div className="post-imageWrap">
                      <img
                        src={post.originalPost.image}
                        alt="元シグナルの画像"
                        className="post-image"
                        onClick={(e) =>
                          handleImageClick(e, post.originalPost.image)
                        }
                      />
                    </div>
                  )}

                  {post.originalPost.tags &&
                    post.originalPost.tags.length > 0 && (
                      <div className="post-tags">
                        {post.originalPost.tags.map((tag) => {
                          const tagText = `#${String(tag).replace(/^#/, "")}`;
                          return (
                            <span
                              key={`${post.id}-origin-${tagText}`}
                              className="post-tag"
                            >
                              {tagText}
                            </span>
                          );
                        })}
                      </div>
                    )}
                </div>
              </div>
            ) : (
              <>
                <p className="post-content">{post.content || post.text}</p>

                {post.image && (
                  <div className="post-imageWrap">
                    <img
                      src={post.image}
                      alt="投稿画像"
                      className="post-image"
                      onClick={(e) => handleImageClick(e, post.image)}
                    />
                  </div>
                )}

                {post.tags && post.tags.length > 0 && (
                  <div className="post-tags">
                    {post.tags.map((tag) => {
                      const tagText = `#${String(tag).replace(/^#/, "")}`;
                      return (
                        <span key={tagText} className="post-tag">
                          {tagText}
                        </span>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            <div className="post-actions" onClick={(e) => e.stopPropagation()}>
              <button className="post-action-button">
                💬 {replyCount}
              </button>
              <button className="post-action-button">
                🔁 {resignalCount}
              </button>
              <button className="post-action-button">
                ❤️ {likeCount}
              </button>
              <button className="post-action-button">🏷</button>
              <button className="post-action-button">↗</button>
            </div>
          </div>
        </div>
      </div>

      {expandedImage && (
        <div className="post-image-modal" onClick={closeImageModal}>
          <img
            src={expandedImage}
            alt="拡大画像"
            className="post-image-modal-img"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            className="post-image-modal-close"
            onClick={closeImageModal}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}

export default PostCard;