import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./QuoteResignal.css";

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

function normalizeTags(input) {
  return input
    .split(/[,\s、]+/)
    .map((tag) => tag.replace(/^#/, "").trim())
    .filter(Boolean)
    .slice(0, 5);
}

function normalizeSourcePost(sourcePost) {
  if (!sourcePost) return null;

  return {
    ...sourcePost,
    author:
      sourcePost.author ??
      sourcePost.userName ??
      sourcePost.name ??
      "ユーザー名",
    userName:
      sourcePost.userName ??
      sourcePost.author ??
      sourcePost.name ??
      "ユーザー名",
    name:
      sourcePost.name ??
      sourcePost.userName ??
      sourcePost.author ??
      "ユーザー名",
    handle:
      sourcePost.handle ??
      sourcePost.userId ??
      `@${sourcePost.accountId ?? "unknown"}`,
    userId:
      sourcePost.userId ??
      sourcePost.handle ??
      `@${sourcePost.accountId ?? "unknown"}`,
    text: sourcePost.text ?? sourcePost.content ?? "",
    content: sourcePost.content ?? sourcePost.text ?? "",
    image:
      sourcePost.image ??
      (Array.isArray(sourcePost.media) ? sourcePost.media[0] : null),
    media: Array.isArray(sourcePost.media)
      ? sourcePost.media
      : sourcePost.image
      ? [sourcePost.image]
      : [],
    tags: Array.isArray(sourcePost.tags) ? sourcePost.tags : [],
    isR18: Boolean(sourcePost.isR18),
  };
}

export default function QuoteResignal() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentAccount = useMemo(() => {
    return resolveCurrentAccount(location.pathname);
  }, [location.pathname]);

  const sourcePost = useMemo(() => {
    return normalizeSourcePost(location.state?.post || null);
  }, [location.state]);

  const [text, setText] = useState("");
  const [tagInput, setTagInput] = useState(
    sourcePost?.tags
      ?.map((tag) => `#${String(tag).replace(/^#/, "")}`)
      .join(" ") || "#Now"
  );

  const maxLength = 300;
  const textCount = text.length;
  const tags = normalizeTags(tagInput);

  const handleSubmit = () => {
    try {
      if (!currentAccount) {
        window.alert("アカウント情報が見つかりません。");
        return;
      }

      if (!sourcePost) {
        window.alert("引用元のシグナルが見つかりません。");
        return;
      }

      const isR18Quote = Boolean(sourcePost.isR18);
      const storageKey = isR18Quote ? OPEN_R18_POSTS_KEY : OPEN_POSTS_KEY;

      const stored = safeParse(localStorage.getItem(storageKey), {});
      const myPosts = Array.isArray(stored[currentAccount.id])
        ? stored[currentAccount.id]
        : [];

      const finalTags = isR18Quote
        ? Array.from(new Set(["R-18", ...tags]))
        : tags;

      const newQuoteResignal = {
        id: Date.now(),
        text: text.trim(),
        content: text.trim(),
        timestamp: Date.now(),
        createdAt: Date.now(),

        author: currentAccount.name || "名前未設定",
        userName: currentAccount.name || "名前未設定",
        name: currentAccount.name || "名前未設定",

        accountId: currentAccount.id,
        handle: currentAccount.handle || `@${currentAccount.id}`,
        userId: currentAccount.handle || `@${currentAccount.id}`,

        avatar: currentAccount.name?.charAt(0) ?? "G",
        avatarImage: currentAccount.avatarImage || "",
        profileImage: currentAccount.profileImage || currentAccount.avatarImage || "",

        space: isR18Quote ? "open-r18" : "open",
        tags: finalTags,
        image: null,
        media: [],
        mediaName: null,
        recommendToOpen: !isR18Quote,

        likeCount: 0,
        liked: false,
        likedUserIds: [],
        saved: false,
        replyCount: 0,
        resignalCount: 0,
        resignaled: false,

        isResignal: true,
        isQuoteResignal: true,
        isR18: isR18Quote,

        originalPost: {
          id: sourcePost.id,
          accountId: sourcePost.accountId,
          author: sourcePost.author,
          userName: sourcePost.userName || sourcePost.author,
          name: sourcePost.name || sourcePost.userName || sourcePost.author,
          handle: sourcePost.handle,
          userId: sourcePost.userId || sourcePost.handle,

          avatar:
            sourcePost.author?.charAt(0) ||
            sourcePost.userName?.charAt(0) ||
            sourcePost.name?.charAt(0) ||
            "U",
          avatarImage: sourcePost.avatarImage || "",
          profileImage: sourcePost.profileImage || sourcePost.avatarImage || "",

          text: sourcePost.text,
          content: sourcePost.content || sourcePost.text,
          timestamp: sourcePost.timestamp,
          createdAt: sourcePost.createdAt || sourcePost.timestamp,
          tags: sourcePost.tags || [],
          image: sourcePost.image || null,
          media: sourcePost.media || [],
          isR18: isR18Quote,
        },
      };

      const updated = {
        ...stored,
        [currentAccount.id]: [newQuoteResignal, ...myPosts],
      };

      const sourcePostId = String(sourcePost.id);

      Object.keys(updated).forEach((accountId) => {
        updated[accountId] = (updated[accountId] || []).map((post) => {
          if (String(post.id) !== sourcePostId) return post;

          return {
            ...post,
            resignaled: true,
            resignalCount: (post.resignalCount || 0) + 1,
          };
        });
      });

      localStorage.setItem(storageKey, JSON.stringify(updated));

      if (String(sourcePost.accountId) !== String(currentAccount.id)) {
        const currentNotifications = safeParse(
          localStorage.getItem("notifications"),
          []
        );

        const nextNotifications = [
          {
            id: Date.now() + 1,
            accountId: sourcePost.accountId,
            type: "quote-resignal",
            from: currentAccount.name || "ユーザー",
            fromUser: currentAccount.name || "ユーザー",
            fromUserId: currentAccount.handle || `@${currentAccount.id}`,
            postId: sourcePost.id,
            link: `/signal/${sourcePost.id}`,
            read: false,
            isRead: false,
            createdAt: Date.now(),
          },
          ...currentNotifications,
        ].slice(0, 250);

        localStorage.setItem("notifications", JSON.stringify(nextNotifications));
      }

      navigate(isR18Quote ? "/open/r18" : "/open");
    } catch (error) {
      console.error("引用リシグナル保存エラー:", error);
      window.alert("引用リシグナルに失敗したよ");
    }
  };

  if (!sourcePost) {
    return (
      <div className="quote-page">
        <div className="quote-topbar">
          <button
            type="button"
            className="quote-back"
            onClick={() => navigate(-1)}
          >
            ← 戻る
          </button>
        </div>

        <div className="quote-content">
          <p className="quote-empty">引用元のシグナルが見つかりません。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="quote-page">
      <div className="quote-topbar">
        <button
          type="button"
          className="quote-back"
          onClick={() => navigate(-1)}
        >
          ← 戻る
        </button>

        <button
          type="button"
          className="quote-submit"
          onClick={handleSubmit}
        >
          引用リシグナル
        </button>
      </div>

      <div className="quote-content">
        <div className="quote-card">
          <div className="quote-head">
            <div className="quote-avatar">
              {currentAccount?.avatarImage ? (
                <img
                  src={currentAccount.avatarImage}
                  alt="avatar"
                  className="quote-avatar-image"
                />
              ) : (
                (currentAccount?.name || "?").charAt(0)
              )}
            </div>

            <div className="quote-account">
              <strong>{currentAccount?.name || "名前未設定"}</strong>
              <span>@{String(currentAccount?.handle || "@---").replace(/^@/, "")}</span>
            </div>
          </div>

          <div className="quote-body">
            <textarea
              className="quote-textarea"
              value={text}
              onChange={(e) => {
                if (e.target.value.length <= maxLength) {
                  setText(e.target.value);
                }
              }}
              placeholder="コメントを追加"
            />

            <div className="quote-metaRow">
              <span
                className={`quote-count ${
                  textCount > maxLength - 50 ? "warn" : ""
                }`}
              >
                {textCount}/{maxLength}
              </span>
            </div>

            <div className="quote-field">
              <label className="quote-label">タグ</label>
              <input
                className="quote-input"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="#Now #引用"
              />
              {tags.length > 0 && (
                <div className="quote-tagsPreview">
                  {tags.map((tag) => (
                    <span key={tag} className="quote-tag">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="quote-originalBox">
              <p className="quote-originalLabel">引用元</p>
              <div className="quote-originalCard">
                <strong>{sourcePost.author || "ユーザー名"}</strong>
                <span>@{String(sourcePost.handle || `@${sourcePost.accountId}`).replace(/^@/, "")}</span>
                <p>{sourcePost.text}</p>

                {sourcePost.image && (
                  <div className="quote-originalImageWrap">
                    <img
                      src={sourcePost.image}
                      alt="引用元画像"
                      className="quote-originalImage"
                    />
                  </div>
                )}

                {sourcePost.tags && sourcePost.tags.length > 0 && (
                  <div className="quote-originalTags">
                    {sourcePost.tags.map((tag) => (
                      <span key={tag}>#{String(tag).replace(/^#/, "")}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {sourcePost.isR18 && (
              <div className="quote-r18Note">
                この引用はR18空間に投稿されます。
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}