import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PostCard.css";

const R18_REVEALED_TEXTS_KEY = "road3_r18_revealed_texts";
const R18_REVEALED_MEDIA_KEY = "road3_r18_revealed_media";
const R18_WARNING_ACK_KEY = "road3_r18_warning_acknowledged";
const MUTED_ACCOUNTS_KEY = "mutedAccounts";
const BLOCKED_ACCOUNTS_KEY = "blockedAccounts";
const REPORTED_POSTS_KEY = "reportedPosts";
const OPEN_GROUP_ACCOUNTS_KEY = "openGroupAccounts";
const CURRENT_OPEN_GROUP_ACCOUNT_ID_KEY = "currentOpenGroupAccountId";
const CURRENT_ACCOUNT_ID_KEY = "currentAccountId";

const REPORT_REASONS = [
  "スパム",
  "嫌がらせ・暴言",
  "不適切な画像・動画",
  "R18ルール違反",
  "なりすまし",
  "その他",
];

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
  return /^(https?:\/\/|blob:|\/)/i.test(value);
}

function sanitizeMediaArray(media) {
  if (!Array.isArray(media)) return [];
  return media.filter(
    (item) => typeof item === "string" && isDisplayableImage(item)
  );
}

function sanitizePostForDisplay(post) {
  if (!post) return post;

  const cleanedMedia = sanitizeMediaArray(post.media);
  const cleanedImage =
    typeof post.image === "string" && isDisplayableImage(post.image)
      ? post.image
      : cleanedMedia[0] || null;

  return {
    ...post,
    image: cleanedImage,
    media: cleanedMedia,
    imageUnavailable:
      Boolean(post.imageUnavailable) ||
      (Boolean(post.image || (Array.isArray(post.media) && post.media.length > 0)) &&
        !cleanedImage),
  };
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
    avatarImage: account.avatarImage || account.profileImage || "",
    profileImage: account.profileImage || account.avatarImage || "",
    avatar:
      account.avatar ||
      account.icon ||
      account.name?.charAt(0) ||
      "U",
  };
}

function resolveCurrentAccountFromStorage() {
  const openGroupAccounts = safeParse(
    localStorage.getItem(OPEN_GROUP_ACCOUNTS_KEY),
    []
  );
  const currentOpenGroupAccountId = localStorage.getItem(
    CURRENT_OPEN_GROUP_ACCOUNT_ID_KEY
  );

  if (Array.isArray(openGroupAccounts) && openGroupAccounts.length > 0) {
    const matched = openGroupAccounts.find(
      (acc) => String(acc?.id) === String(currentOpenGroupAccountId)
    );
    const normalized = normalizeAccount(matched || openGroupAccounts[0]);
    if (normalized) return normalized;
  }

  const accounts = safeParse(localStorage.getItem("accounts"), []);
  const currentAccountId = localStorage.getItem(CURRENT_ACCOUNT_ID_KEY);

  if (Array.isArray(accounts) && accounts.length > 0) {
    const matched = accounts.find(
      (acc) => String(acc?.id) === String(currentAccountId)
    );
    const normalized = normalizeAccount(matched || accounts[0]);
    if (normalized) return normalized;
  }

  const personalAccount = safeParse(localStorage.getItem("personalAccount"), null);
  const normalizedPersonal = normalizeAccount(personalAccount);
  if (normalizedPersonal) return normalizedPersonal;

  return null;
}

function getStoredAccountById(accountId) {
  if (accountId === undefined || accountId === null) return null;

  const currentId = localStorage.getItem(CURRENT_OPEN_GROUP_ACCOUNT_ID_KEY);
  const accounts = safeParse(localStorage.getItem(OPEN_GROUP_ACCOUNTS_KEY), []);

  if (Array.isArray(accounts)) {
    const current = accounts.find(
      (account) => String(account.id) === String(currentId)
    );
    if (current && String(current.id) === String(accountId)) {
      return current;
    }

    const found = accounts.find(
      (account) => String(account.id) === String(accountId)
    );
    if (found) return found;
  }

  return null;
}

function getResolvedAvatar(post) {
  const linkedAccount = getStoredAccountById(post?.accountId);

  const accountImage =
    linkedAccount?.avatarImage && isDisplayableImage(linkedAccount.avatarImage)
      ? linkedAccount.avatarImage
      : linkedAccount?.profileImage &&
        isDisplayableImage(linkedAccount.profileImage)
      ? linkedAccount.profileImage
      : isDisplayableImage(linkedAccount?.avatar)
      ? linkedAccount.avatar
      : "";

  const accountFallback =
    linkedAccount?.avatar ??
    linkedAccount?.icon ??
    linkedAccount?.name?.charAt(0) ??
    "";

  const postImage =
    post?.avatarImage && isDisplayableImage(post.avatarImage)
      ? post.avatarImage
      : post?.profileImage && isDisplayableImage(post.profileImage)
      ? post.profileImage
      : isDisplayableImage(post?.avatar)
      ? post.avatar
      : "";

  const postFallback =
    post?.avatar ??
    post?.icon ??
    post?.author ??
    post?.userName ??
    post?.name ??
    "?";

  return {
    image: accountImage || postImage || "",
    fallback: accountFallback || postFallback || "?",
  };
}

function AvatarView({ post, className = "avatar-dot" }) {
  const avatar = getResolvedAvatar(post);

  if (avatar.image) {
    return (
      <img
        src={avatar.image}
        alt="avatar"
        className={`${className} avatar-image`}
        draggable={false}
      />
    );
  }

  return <span className={className}>{String(avatar.fallback).charAt(0)}</span>;
}

function OpenPostCard({
  post,
  currentAccount,
  formatTime,
  onToggleLike,
  onToggleSave,
  onToggleResignal,
  onDelete,
  r18Mode = false,
}) {
  const displayPost = useMemo(() => sanitizePostForDisplay(post), [post]);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isResignalMenuOpen, setIsResignalMenuOpen] = useState(false);
  const [expandedImage, setExpandedImage] = useState(null);
  const [revealedTextMap, setRevealedTextMap] = useState(() =>
    safeParse(localStorage.getItem(R18_REVEALED_TEXTS_KEY), {})
  );
  const [revealedMediaMap, setRevealedMediaMap] = useState(() =>
    safeParse(localStorage.getItem(R18_REVEALED_MEDIA_KEY), {})
  );
  const [warningState, setWarningState] = useState({
    open: false,
    kind: null,
    mediaIndex: null,
  });
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportDetail, setReportDetail] = useState("");

  const navigate = useNavigate();
  const resignalMenuRef = useRef(null);
  const menuRef = useRef(null);

  const resolvedCurrentAccount = useMemo(() => {
  return normalizeAccount(currentAccount) || resolveCurrentAccountFromStorage();
}, [currentAccount]);

const currentAccountId = String(resolvedCurrentAccount?.id ?? "");

  const isMyPost =
    currentAccountId !== "" &&
    currentAccountId === String(displayPost?.accountId ?? "");

  const isR18Post = Boolean(displayPost?.isR18);
  const useR18Blur = r18Mode && isR18Post;

  const textRevealed = Boolean(revealedTextMap[displayPost?.id]);
  const shouldBlurText = useR18Blur && !textRevealed;

  const likedUserIds = useMemo(() => {
    return Array.isArray(displayPost?.likedUserIds)
      ? displayPost.likedUserIds.map(String)
      : [];
  }, [displayPost?.likedUserIds]);

  const isLiked =
    typeof displayPost?.liked === "boolean"
      ? displayPost.liked
      : likedUserIds.includes(currentAccountId);

  const isSaved = Boolean(displayPost?.saved);

  const sourcePost =
  displayPost?.isResignal && displayPost?.originalPost
    ? sanitizePostForDisplay(displayPost.originalPost)
    : displayPost;

  useEffect(() => {
    localStorage.setItem(
      R18_REVEALED_TEXTS_KEY,
      JSON.stringify(revealedTextMap)
    );
  }, [revealedTextMap]);

  useEffect(() => {
    localStorage.setItem(
      R18_REVEALED_MEDIA_KEY,
      JSON.stringify(revealedMediaMap)
    );
  }, [revealedMediaMap]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        resignalMenuRef.current &&
        !resignalMenuRef.current.contains(e.target)
      ) {
        setIsResignalMenuOpen(false);
      }

      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };

    if (isResignalMenuOpen || isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isResignalMenuOpen, isMenuOpen]);

  const displayHeaderUser = (() => {
  const avatar = getResolvedAvatar(displayPost);

  return {
    name:
      displayPost?.author ||
      displayPost?.userName ||
      displayPost?.name ||
      "ユーザー名",
    handle:
      displayPost?.handle ||
      displayPost?.userId ||
      `@${displayPost?.accountId ?? "unknown"}`,
    avatar: avatar.image || avatar.fallback,
    avatarImage: avatar.image,
  };
})();

  const normalizedUser = (() => {
  const linkedAccount = getStoredAccountById(sourcePost?.accountId);
  const avatar = getResolvedAvatar(sourcePost);

  return {
    id: sourcePost?.accountId,
    name:
      sourcePost?.author ||
      sourcePost?.userName ||
      sourcePost?.name ||
      linkedAccount?.name ||
      "ユーザー名",
    userId:
      sourcePost?.handle ||
      sourcePost?.userId ||
      linkedAccount?.handle ||
      `@${sourcePost?.accountId}`,
    handle:
      sourcePost?.handle ||
      sourcePost?.userId ||
      linkedAccount?.handle ||
      `@${sourcePost?.accountId}`,
    bio: sourcePost?.bio || "自己紹介はまだありません。",
    following: sourcePost?.following ?? 0,
    followers: sourcePost?.followers ?? 0,
    place: sourcePost?.place || "未設定",
    links: sourcePost?.links || [],
    birthday: sourcePost?.birthday || "非公開",
    joined: sourcePost?.joined || "ROAD3利用開始日",
    tags: sourcePost?.tags || [],
    avatar: avatar.image || avatar.fallback,
    avatarImage: avatar.image,
  };
})();

  const stopMediaSaveActions = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const markTextRevealed = () => {
    setRevealedTextMap((prev) => ({
      ...prev,
      [displayPost.id]: true,
    }));
  };

  const markMediaRevealed = (index) => {
    const key = `${displayPost.id}-${index}`;
    setRevealedMediaMap((prev) => ({
      ...prev,
      [key]: true,
    }));
  };

  const requestRevealText = (e) => {
    if (e) e.stopPropagation();

    const warningAccepted =
      localStorage.getItem(R18_WARNING_ACK_KEY) === "true";

    if (!warningAccepted) {
      setWarningState({
        open: true,
        kind: "text",
        mediaIndex: null,
      });
      return;
    }

    markTextRevealed();
  };

  const requestRevealMedia = (e, index) => {
    e.stopPropagation();

    const warningAccepted =
      localStorage.getItem(R18_WARNING_ACK_KEY) === "true";

    if (!warningAccepted) {
      setWarningState({
        open: true,
        kind: "media",
        mediaIndex: index,
      });
      return;
    }

    markMediaRevealed(index);
  };

  const confirmReveal = () => {
    localStorage.setItem(R18_WARNING_ACK_KEY, "true");

    if (warningState.kind === "text") {
      markTextRevealed();
    }

    if (warningState.kind === "media" && warningState.mediaIndex !== null) {
      markMediaRevealed(warningState.mediaIndex);
    }

    setWarningState({
      open: false,
      kind: null,
      mediaIndex: null,
    });
  };

  const cancelReveal = () => {
    setWarningState({
      open: false,
      kind: null,
      mediaIndex: null,
    });
  };

  const openUserProfile = (e) => {
  e.stopPropagation();

  if (!sourcePost?.accountId) return;

  const postAccountId = String(sourcePost.accountId);

  if (currentAccountId && currentAccountId === postAccountId) {
    navigate("/profile", {
      state: { from: useR18Blur ? "/open/r18" : "/open" },
    });
    return;
  }

  navigate(`/profile/user/${sourcePost.accountId}`, {
    state: {
      from: useR18Blur ? "/open/r18" : "/open",
      user: normalizedUser,
      posts: {
        signal: [
          {
            ...sourcePost,
            id: sourcePost.id,
            accountId: sourcePost.accountId,
            author: normalizedUser.name,
            userName: normalizedUser.name,
            name: normalizedUser.name,
            handle: normalizedUser.handle,
            userId: normalizedUser.userId,
            avatar: normalizedUser.avatar,
            avatarImage: normalizedUser.avatarImage,
            profileImage: normalizedUser.avatarImage,
            icon: normalizedUser.avatar,
            text: sourcePost.text ?? sourcePost.content ?? "",
            content: sourcePost.content ?? sourcePost.text ?? "",
            timestamp: sourcePost.timestamp,
            image: sourcePost.image ?? null,
            media: Array.isArray(sourcePost.media) ? sourcePost.media : [],
            imageUnavailable: Boolean(sourcePost.imageUnavailable),
            tags: sourcePost.tags || [],
            isR18: Boolean(sourcePost.isR18),
          },
        ],
        reply: [],
        media: [],
        video: [],
      },
    },
  });
};

 const openSignalThread = () => {
  if (shouldBlurText) {
    requestRevealText();
    return;
  }

  const isQuoteResignal = Boolean(displayPost?.isQuoteResignal);
  const isNormalResignal =
    Boolean(displayPost?.isResignal) && !isQuoteResignal;

  const threadPost = isNormalResignal
    ? displayPost?.originalPost || displayPost
    : displayPost;

  const threadUser = isNormalResignal ? normalizedUser : displayHeaderUser;

  navigate(`/signal/${threadPost.id}`, {
    state: {
      from: useR18Blur ? "/open/r18" : "/open",
      post: {
        ...threadPost,
        id: threadPost.id,
        accountId: threadPost.accountId,
        author: threadUser.name,
        userName: threadUser.name,
        name: threadUser.name,
        handle: threadUser.handle,
        userId: threadUser.handle,
        avatar: threadUser.avatar,
        avatarImage: threadUser.avatarImage,
        profileImage: threadUser.avatarImage,
        icon: threadUser.avatar,
        content: threadPost.content ?? threadPost.text ?? "",
        text: threadPost.text ?? threadPost.content ?? "",
        image: threadPost.image ?? null,
        media: Array.isArray(threadPost.media) ? threadPost.media : [],
        imageUnavailable: Boolean(threadPost.imageUnavailable),
        tags: threadPost.tags || [],
        likeCount: threadPost.likeCount ?? 0,
        replyCount: threadPost.replyCount ?? 0,
        resignalCount: threadPost.resignalCount ?? 0,
        likedUserIds: Array.isArray(threadPost?.likedUserIds)
          ? threadPost.likedUserIds
          : [],
        saved: Boolean(threadPost?.saved),
        isR18: Boolean(threadPost.isR18),
        isResignal: Boolean(threadPost?.isResignal),
        isQuoteResignal: Boolean(threadPost?.isQuoteResignal),
        originalPost: threadPost?.originalPost ?? null,
      },
      resignalMeta: displayPost?.isResignal
        ? {
            id: displayPost.id,
            accountId: displayPost.accountId,
            name:
              displayPost.author ||
              displayPost.userName ||
              displayPost.name ||
              "ユーザー名",
            handle:
              displayPost.handle ||
              displayPost.userId ||
              `@${displayPost.accountId}`,
            avatarImage:
              displayPost.avatarImage ||
              displayPost.profileImage ||
              "",
            avatar:
              displayPost.avatar ||
              displayPost.icon ||
              displayPost.author ||
              "U",
            isQuoteResignal: Boolean(displayPost?.isQuoteResignal),
          }
        : null,
    },
  });
};

  const openTagPage = (e, tag) => {
    e.stopPropagation();
    const normalizedTag = `#${String(tag).replace(/^#/, "")}`;
    navigate(
      `/search/tag/${encodeURIComponent(normalizedTag.replace(/^#/, ""))}`,
      {
        state: {
          from: useR18Blur ? "/open/r18" : "/open",
          isR18: Boolean(displayPost?.isR18),
        },
      }
    );
  };

  const openQuoteResignal = (e) => {
    e.stopPropagation();
    setIsResignalMenuOpen(false);
    navigate("/quote-resignal", {
      state: {
        post: displayPost,
        from: useR18Blur ? "/open/r18" : "/open",
        fromR18: Boolean(displayPost?.isR18 || r18Mode),
      },
    });
  };

  const handleResignalClick = (e) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    setIsResignalMenuOpen((prev) => !prev);
  };

  const handleNormalResignal = (e) => {
    e.stopPropagation();
    setIsResignalMenuOpen(false);
    onToggleResignal?.(displayPost.id);
  };

  const handleReplyClick = (e) => {
    e.stopPropagation();
    openSignalThread();
  };

  const handleLikeClick = (e) => {
    e.stopPropagation();
    onToggleLike?.(displayPost.id);
  };

  const handleSaveClick = (e) => {
    e.stopPropagation();
    onToggleSave?.(displayPost.id);
  };

  const handleImageClick = (e, imageSrc, index = 0) => {
    if (useR18Blur) {
      const key = `${displayPost.id}-${index}`;
      const revealed = Boolean(revealedMediaMap[key]);

      if (!revealed) {
        requestRevealMedia(e, index);
        return;
      }
    }

    if (!imageSrc) return;

    e.stopPropagation();
    setExpandedImage(imageSrc);
  };

  const closeImageModal = (e) => {
    e.stopPropagation();
    setExpandedImage(null);
  };

  const handleMuteAccount = (e) => {
    e.stopPropagation();

    if (!displayPost?.accountId) return;

    const currentMuted = safeParse(
      localStorage.getItem(MUTED_ACCOUNTS_KEY),
      []
    ).map(String);

    const targetId = String(displayPost.accountId);

    if (currentMuted.includes(targetId)) {
      window.alert("このアカウントはすでにミュート済みです");
      setIsMenuOpen(false);
      return;
    }

    const ok = window.confirm(
      `${normalizedUser.name} をミュートしますか？\nタイムラインに表示されなくなります。`
    );
    if (!ok) return;

    const nextMuted = [...currentMuted, targetId];
    localStorage.setItem(MUTED_ACCOUNTS_KEY, JSON.stringify(nextMuted));

    setIsMenuOpen(false);
    window.alert("ミュートしました");
    window.location.reload();
  };

  const handleBlockAccount = (e) => {
    e.stopPropagation();

    if (!displayPost?.accountId) return;

    const currentBlocked = safeParse(
      localStorage.getItem(BLOCKED_ACCOUNTS_KEY),
      []
    ).map(String);

    const targetId = String(displayPost.accountId);

    if (currentBlocked.includes(targetId)) {
      window.alert("このアカウントはすでにブロック済みです");
      setIsMenuOpen(false);
      return;
    }

    const ok = window.confirm(
      `${normalizedUser.name} をブロックしますか？\nタイムラインに表示されなくなります。`
    );
    if (!ok) return;

    const nextBlocked = [...currentBlocked, targetId];
    localStorage.setItem(BLOCKED_ACCOUNTS_KEY, JSON.stringify(nextBlocked));

    setIsMenuOpen(false);
    window.alert("ブロックしました");
    window.location.reload();
  };

  const openReportModal = (e) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    setReportReason(REPORT_REASONS[0]);
    setReportDetail("");
    setReportModalOpen(true);
  };

  const closeReportModal = () => {
    setReportModalOpen(false);
    setReportReason(REPORT_REASONS[0]);
    setReportDetail("");
  };

  const submitReport = () => {
    const storedReports = safeParse(localStorage.getItem(REPORTED_POSTS_KEY), []);

    const newReport = {
      id: Date.now(),
      postId: displayPost?.id ?? null,
      targetAccountId: displayPost?.accountId ?? null,
      targetName: normalizedUser.name,
      targetHandle: normalizedUser.handle,
      reportedByAccountId: currentAccount?.id ?? null,
      reportedByName: currentAccount?.name ?? "ユーザー",
      reason: reportReason,
      detail: reportDetail.trim(),
      postText: displayPost?.text ?? displayPost?.content ?? "",
      isR18: Boolean(displayPost?.isR18),
      createdAt: Date.now(),
    };

    localStorage.setItem(
      REPORTED_POSTS_KEY,
      JSON.stringify([newReport, ...storedReports].slice(0, 300))
    );

    closeReportModal();
    window.alert("通報を受け付けました");
  };

  const renderMediaImage = (src, alt, index = 0, className = "post-image") => {
    const mediaKey = `${displayPost.id}-${index}`;
    const mediaRevealed = Boolean(revealedMediaMap[mediaKey]);
    const shouldBlurMedia = useR18Blur && !mediaRevealed;

    if (!src) {
      return (
        <div className="post-image-missing">
          <div>画像</div>
          <small>再読み込み後は表示されません</small>
        </div>
      );
    }

    return (
      <>
        <img
          src={src}
          alt={alt}
          className={`${className} ${shouldBlurMedia ? "r18-image-blur" : ""}`}
          onClick={(e) => handleImageClick(e, src, index)}
          onContextMenu={useR18Blur ? stopMediaSaveActions : undefined}
          onDragStart={useR18Blur ? stopMediaSaveActions : undefined}
          draggable={false}
        />
        {shouldBlurMedia && (
          <button
            type="button"
            className="r18-overlay image-overlay"
            onClick={(e) => requestRevealMedia(e, index)}
          >
            <div className="r18-overlay-text">
              🔞 R18画像
              <br />
              タップで表示
            </div>
          </button>
        )}
      </>
    );
  };

  const renderMainBody = () => {
    if (displayPost.isResignal && displayPost.originalPost) {
      const originalPost = sanitizePostForDisplay(displayPost.originalPost);
      const originalAvatar = getResolvedAvatar(originalPost);

      return (
        <div className="resignal-box">
          <p className="resignal-label">
            {displayPost.isQuoteResignal ? "✍ 引用リシグナル" : "↻ リシグナル"}
          </p>

          {displayPost.text && displayPost.text !== originalPost.text && (
            <div className={`r18-text-wrap ${!shouldBlurText ? "revealed" : ""}`}>
              <p className={`post-text ${shouldBlurText ? "r18-text-hidden" : ""}`}>
                {displayPost.text}
              </p>

              {shouldBlurText && (
                <button
                  type="button"
                  className="r18-overlay"
                  onClick={requestRevealText}
                >
                  <div className="r18-overlay-text">
                    🔞 R18コンテンツ
                    <br />
                    タップで表示
                  </div>
                </button>
              )}
            </div>
          )}

          {displayPost.tags && displayPost.tags.length > 0 && (
            <div className="post-tags">
              {displayPost.tags.map((tag) => {
                const tagText = `#${String(tag).replace(/^#/, "")}`;
                return (
                  <button
                    key={`${displayPost.id}-quote-${tagText}`}
                    className="post-tag"
                    type="button"
                    onClick={(e) => openTagPage(e, tag)}
                  >
                    {tagText}
                  </button>
                );
              })}
            </div>
          )}

          <div className="resignal-original">
            <div className="resignal-original-top">
              {originalAvatar.image ? (
                <img
                  src={originalAvatar.image}
                  alt="元シグナルのアイコン"
                  className="resignal-original-avatar avatar-image"
                  draggable={false}
                />
              ) : (
                <div className="resignal-original-avatar">
                  {String(originalAvatar.fallback).charAt(0)}
                </div>
              )}

              <div className="resignal-original-head">
                <strong>{originalPost.author}</strong>
                <span>@{originalPost.handle}</span>
              </div>
            </div>

            <p className="resignal-original-text">{originalPost.text}</p>

            {(originalPost.image || originalPost.imageUnavailable) && (
              <div className="post-imageWrap">
                {renderMediaImage(
                  originalPost.image,
                  "元シグナルの画像",
                  0,
                  "post-image"
                )}
              </div>
            )}

            {originalPost.tags && originalPost.tags.length > 0 && (
              <div className="post-tags">
                {originalPost.tags.map((tag) => {
                  const tagText = `#${String(tag).replace(/^#/, "")}`;
                  return (
                    <button
                      key={`${displayPost.id}-origin-${tagText}`}
                      className="post-tag"
                      type="button"
                      onClick={(e) => openTagPage(e, tag)}
                    >
                      {tagText}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <>
        <div className={`r18-text-wrap ${!shouldBlurText ? "revealed" : ""}`}>
          <p className={`post-text ${shouldBlurText ? "r18-text-hidden" : ""}`}>
            {displayPost.text ?? displayPost.content ?? ""}
          </p>

          {shouldBlurText && (
            <button
              type="button"
              className="r18-overlay"
              onClick={requestRevealText}
            >
              <div className="r18-overlay-text">
                🔞 R18コンテンツ
                <br />
                タップで表示
              </div>
            </button>
          )}
        </div>

        {(displayPost.image || displayPost.imageUnavailable) && (
          <div className="post-imageWrap">
            {renderMediaImage(displayPost.image, "投稿画像", 0, "post-image")}
          </div>
        )}

        {Array.isArray(displayPost.media) &&
          displayPost.media.length > 1 &&
          !displayPost.image && (
            <div className={`post-media-grid media-count-${displayPost.media.length}`}>
              {displayPost.media.map((src, index) => {
                const mediaKey = `${displayPost.id}-${index}`;
                const mediaRevealed = Boolean(revealedMediaMap[mediaKey]);

                return (
                  <button
                    key={`${displayPost.id}-media-${index}`}
                    type="button"
                    className="post-media-item"
                    onClick={(e) => handleImageClick(e, src, index)}
                  >
                    <img
                      src={src}
                      alt="投稿メディア"
                      className={`post-media-img ${
                        useR18Blur && !mediaRevealed ? "r18-image-blur" : ""
                      }`}
                      onContextMenu={useR18Blur ? stopMediaSaveActions : undefined}
                      onDragStart={useR18Blur ? stopMediaSaveActions : undefined}
                      draggable={false}
                    />
                    {useR18Blur && !mediaRevealed && (
                      <span className="r18-overlay image-overlay">
                        <span className="r18-overlay-text">
                          🔞 R18画像
                          <br />
                          タップで表示
                        </span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

        {displayPost.tags && displayPost.tags.length > 0 && (
          <div className="post-tags">
            {displayPost.tags.map((tag) => {
              const tagText = `#${String(tag).replace(/^#/, "")}`;
              return (
                <button
                  key={`${displayPost.id}-${tagText}`}
                  className="post-tag"
                  type="button"
                  onClick={(e) => openTagPage(e, tag)}
                >
                  {tagText}
                </button>
              );
            })}
          </div>
        )}
      </>
    );
  };

  return (
    <>
      <div
        className={`open-post ${displayPost?.isR18 ? "open-post-r18" : ""}`}
        onClick={openSignalThread}
      >
        <div className="post-header">
          <div className="post-user">
            <button
              type="button"
              className="avatar-button"
              onClick={openUserProfile}
              title="プロフィールを見る"
            >
              <AvatarView post={{ ...displayPost, ...displayHeaderUser }} />
            </button>

            <button
              type="button"
              className="name-line profile-linkBtn"
              onClick={openUserProfile}
              title="プロフィールを見る"
            >
              <strong className="author">{displayHeaderUser.name}</strong>
<span className="handle">
  @{String(displayHeaderUser.handle).replace(/^@/, "")}
</span>
              <small className="time">・{formatTime?.(displayPost.timestamp)}</small>
            </button>
          </div>

          <div className="post-menu" ref={menuRef}>
            <button
              className="menu-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsResignalMenuOpen(false);
                setIsMenuOpen((v) => !v);
              }}
              aria-label="メニュー"
              type="button"
            >
              ⋯
            </button>

            {isMenuOpen && (
              <div
                className="menu-dropdown"
                onClick={(e) => e.stopPropagation()}
              >
                {isMyPost ? (
                  <button
                    className="menu-item danger"
                    onClick={() => {
                      onDelete?.(displayPost.id);
                      setIsMenuOpen(false);
                    }}
                    type="button"
                  >
                    削除
                  </button>
                ) : (
                  <>
                    <button
                      className="menu-item"
                      onClick={handleMuteAccount}
                      type="button"
                    >
                      ミュート
                    </button>

                    <button
                      className="menu-item danger"
                      onClick={handleBlockAccount}
                      type="button"
                    >
                      ブロック
                    </button>

                    <button
                      className="menu-item"
                      onClick={openReportModal}
                      type="button"
                    >
                      通報
                    </button>
                  </>
                )}

                <button
                  className="menu-item"
                  onClick={() => setIsMenuOpen(false)}
                  type="button"
                >
                  閉じる
                </button>
              </div>
            )}
          </div>
        </div>

        {renderMainBody()}

        <div className="post-actions" onClick={(e) => e.stopPropagation()}>
          <button
            className="action-btn"
            type="button"
            title="返信"
            onClick={handleReplyClick}
          >
            💬
            <span className="count">{displayPost.replyCount ?? 0}</span>
          </button>

          <div className="resignal-action-wrap" ref={resignalMenuRef}>
            <button
              className={`action-btn ${displayPost.resignaled ? "active" : ""}`}
              onClick={handleResignalClick}
              type="button"
              title="リシグナル"
            >
              ↻
              <span className="count">{displayPost.resignalCount ?? 0}</span>
            </button>

            {isResignalMenuOpen && (
              <div
                className="resignal-menu"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="resignal-menu-item"
                  onClick={handleNormalResignal}
                >
                  ↻ リシグナル
                </button>
                <button
                  type="button"
                  className="resignal-menu-item"
                  onClick={openQuoteResignal}
                >
                  ✍ 引用リシグナル
                </button>
              </div>
            )}
          </div>

          <button
            className={`action-btn ${isLiked ? "liked" : ""}`}
            onClick={handleLikeClick}
            type="button"
            title="いいね"
          >
            ♡
            <span className="count">{displayPost.likeCount ?? 0}</span>
          </button>

          <button
            className={`action-btn ${isSaved ? "active" : ""}`}
            onClick={handleSaveClick}
            type="button"
            title="保存"
          >
            🔖
          </button>
        </div>
      </div>

      {expandedImage && (
        <div className="post-image-modal" onClick={closeImageModal}>
          <img
            src={expandedImage}
            alt="拡大画像"
            className="post-image-modal-img"
            onClick={(e) => e.stopPropagation()}
            onContextMenu={useR18Blur ? stopMediaSaveActions : undefined}
            onDragStart={useR18Blur ? stopMediaSaveActions : undefined}
            draggable={false}
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

      {warningState.open && (
        <div className="open-r18-confirm-overlay" onClick={cancelReveal}>
          <div
            className="open-r18-confirm-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="open-r18-confirm-badge">R-18</div>
            <h3 className="open-r18-confirm-title">
              このコンテンツを表示しますか？
            </h3>
            <p className="open-r18-confirm-text">
              センシティブな内容が含まれる可能性があります。
              <br />
              表示する場合は「表示する」を押してください。
            </p>

            <div className="open-r18-confirm-actions">
              <button
                type="button"
                className="open-r18-confirm-cancel"
                onClick={cancelReveal}
              >
                キャンセル
              </button>
              <button
                type="button"
                className="open-r18-confirm-ok"
                onClick={confirmReveal}
              >
                表示する
              </button>
            </div>
          </div>
        </div>
      )}

      {reportModalOpen && (
        <div className="open-r18-confirm-overlay" onClick={closeReportModal}>
          <div
            className="open-r18-confirm-card open-report-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="open-r18-confirm-badge">通報</div>
            <h3 className="open-r18-confirm-title">
              この投稿を通報しますか？
            </h3>
            <p className="open-r18-confirm-text">
              理由を選んで送信してください。
            </p>

            <div className="open-report-form">
              <div className="open-report-field">
                <label className="open-report-label">通報理由</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="open-report-select"
                >
                  {REPORT_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              <div className="open-report-field">
                <label className="open-report-label">補足</label>
                <textarea
                  value={reportDetail}
                  onChange={(e) => setReportDetail(e.target.value)}
                  placeholder="必要なら補足を書いてね"
                  maxLength={300}
                  className="open-report-textarea"
                />
                <div className="open-report-count">
                  {reportDetail.length} / 300
                </div>
              </div>
            </div>

            <div className="open-r18-confirm-actions">
              <button
                type="button"
                className="open-r18-confirm-cancel"
                onClick={closeReportModal}
              >
                キャンセル
              </button>
              <button
                type="button"
                className="open-r18-confirm-ok"
                onClick={submitReport}
              >
                通報する
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default OpenPostCard;