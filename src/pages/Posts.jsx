import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Posts.css";

const OPEN_POSTS_KEY = "openPosts";
const OPEN_R18_POSTS_KEY = "openR18Posts";
const R18_ENABLED_KEY = "r18Enabled";
const CURRENT_ACCOUNT_ID_KEY = "currentAccountId";
const CURRENT_OPEN_GROUP_ACCOUNT_ID_KEY = "currentOpenGroupAccountId";
const OPEN_GROUP_ACCOUNTS_KEY = "openGroupAccounts";

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

function sanitizeMediaUrls(urls) {
  if (!Array.isArray(urls)) return [];
  return urls
    .map((url) => String(url || "").trim())
    .filter(Boolean)
    .filter((url) => isDisplayableImage(url));
}

function normalizeAccount(saved, fallbackId = "guest") {
  if (!saved || typeof saved !== "object") return null;

  const avatarImage =
    saved.avatarImage && isDisplayableImage(saved.avatarImage)
      ? saved.avatarImage
      : saved.profileImage && isDisplayableImage(saved.profileImage)
      ? saved.profileImage
      : saved.avatar && isDisplayableImage(saved.avatar)
      ? saved.avatar
      : "";

  const fallbackAvatar =
    saved.avatar ??
    saved.icon ??
    saved.name?.charAt(0) ??
    "G";

  return {
    id: String(saved.id ?? fallbackId),
    name: saved.name ?? "ゲスト",
    handle: saved.handle ?? saved.userId ?? `@${String(saved.id ?? fallbackId)}`,
    avatarImage,
    avatar: avatarImage ? avatarImage : fallbackAvatar,
  };
}

function getCurrentAccount() {
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
    const resolved = normalizeAccount(matched || openGroupAccounts[0], "og-1");
    if (resolved) return resolved;
  }

  const accounts = safeParse(localStorage.getItem("accounts"), []);
  const currentAccountId = localStorage.getItem(CURRENT_ACCOUNT_ID_KEY);

  if (Array.isArray(accounts) && accounts.length > 0) {
    const matched = accounts.find(
      (acc) => String(acc?.id) === String(currentAccountId)
    );
    const resolved = normalizeAccount(matched || accounts[0], "guest");
    if (resolved) return resolved;
  }

  const personalAccount = normalizeAccount(
    safeParse(localStorage.getItem("personalAccount"), null),
    "personal-main"
  );
  if (personalAccount) return personalAccount;

  return {
    id: "guest",
    name: "ゲスト",
    handle: "@guest",
    avatarImage: "",
    avatar: "G",
  };
}

function readPosts(key) {
  return safeParse(localStorage.getItem(key), {});
}

function savePosts(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function createPostData({
  currentAccount,
  text,
  tags,
  mediaUrls,
  isR18,
}) {
  const now = Date.now();
  const sanitizedMedia = sanitizeMediaUrls(mediaUrls);

  return {
    id: now,
    text,
    content: text,
    timestamp: now,
    createdAt: now,

    author: currentAccount.name || "名前未設定",
    userName: currentAccount.name || "名前未設定",
    name: currentAccount.name || "名前未設定",

    accountId: String(currentAccount.id),
    handle: currentAccount.handle || `@${currentAccount.id}`,
    userId: currentAccount.handle || `@${currentAccount.id}`,

    avatar:
      currentAccount.avatarImage ||
      currentAccount.avatar ||
      currentAccount.name?.charAt(0) ||
      "G",
    avatarImage: currentAccount.avatarImage || "",
    profileImage: currentAccount.avatarImage || "",

    space: isR18 ? "open-r18" : "open",
    tags,

    image: sanitizedMedia[0] || null,
    media: sanitizedMedia,
    mediaName: sanitizedMedia.length > 0 ? "uploaded-media" : null,
    imageUnavailable: false,

    recommendToOpen: !isR18,

    likeCount: 0,
    liked: false,
    likedUserIds: [],
    saved: false,
    replyCount: 0,
    resignalCount: 0,
    resignaled: false,

    isR18,
  };
}

function upsertPostByAccount(storageKey, accountId, newPost) {
  const stored = readPosts(storageKey);
  const currentPosts = Array.isArray(stored[accountId]) ? stored[accountId] : [];
  const next = {
    ...stored,
    [accountId]: [newPost, ...currentPosts],
  };

  savePosts(storageKey, next);
}

export default function Posts() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentAccount = useMemo(() => getCurrentAccount(), []);
  const isR18Enabled = localStorage.getItem(R18_ENABLED_KEY) === "true";

  const [text, setText] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [isR18, setIsR18] = useState(Boolean(location.state?.defaultIsR18));
  const [mediaUrls, setMediaUrls] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    type: "success",
    message: "",
  });

  useEffect(() => {
    if (!toast.show) return;

    const timer = setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 1800);

    return () => clearTimeout(timer);
  }, [toast.show]);

  const parsedTags = useMemo(() => {
    const rawTags = tagInput
      .split(/[ 　,\n]+/)
      .map((tag) => tag.trim())
      .filter(Boolean);

    const cleaned = rawTags.map((tag) => tag.replace(/^#/, ""));

    if (isR18 && !cleaned.includes("R-18")) {
      cleaned.unshift("R-18");
    }

    return [...new Set(cleaned)];
  }, [tagInput, isR18]);

  const previewMediaUrls = useMemo(() => {
    return sanitizeMediaUrls(mediaUrls);
  }, [mediaUrls]);

  const showToast = (message, type = "success") => {
    setToast({
      show: true,
      type,
      message,
    });
  };

  const handleAddMediaUrl = () => {
    const url = window.prompt("画像URLを入力してね");
    if (!url) return;

    const trimmed = url.trim();
    if (!trimmed) return;

    if (!isDisplayableImage(trimmed)) {
      showToast(
        "このURLは追加できないよ。http / https / blob / / data:image から始まる画像URLを使ってね。",
        "error"
      );
      return;
    }

    setMediaUrls((prev) => [...prev, trimmed]);
  };

  const handleRemoveMedia = (index) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitting) return;

    const trimmedText = text.trim();

    if (!trimmedText) {
      showToast("本文を入力してね", "error");
      return;
    }

    if (isR18 && !isR18Enabled) {
      showToast("R18投稿をするには先にR18モードをONにしてね", "error");
      return;
    }

    setSubmitting(true);

    try {
      const newPost = createPostData({
        currentAccount,
        text: trimmedText,
        tags: parsedTags,
        mediaUrls: previewMediaUrls,
        isR18,
      });

      const targetKey = isR18 ? OPEN_R18_POSTS_KEY : OPEN_POSTS_KEY;

      upsertPostByAccount(targetKey, String(currentAccount.id), newPost);

      showToast(isR18 ? "R18空間に投稿したよ" : "投稿したよ", "success");

      setTimeout(() => {
        navigate(isR18 ? "/open/r18" : "/open");
      }, 700);
    } catch (error) {
      console.error("投稿保存エラー:", error);
      showToast("投稿に失敗したよ", "error");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
  };

  return (
    <div className="posts-page">
      <header className="posts-header">
        <button
          type="button"
          className="posts-backBtn"
          onClick={() => navigate(-1)}
          disabled={submitting}
        >
          ←
        </button>

        <div className="posts-headerTitleArea">
          <h1 className="posts-title">シグナルを投稿</h1>
          <p className="posts-subtitle">
            {isR18 ? "R18空間へ投稿します" : "通常のオープンスペースへ投稿します"}
          </p>
        </div>

        <button
          type="submit"
          form="post-form"
          className={`posts-submitBtn ${submitting ? "is-loading" : ""}`}
          disabled={submitting}
        >
          {submitting ? (
            <span className="posts-submitInner">
              <span className="posts-submitSpinner" />
              投稿中...
            </span>
          ) : (
            "投稿"
          )}
        </button>
      </header>

      <main className="posts-main">
        <form id="post-form" className="posts-form" onSubmit={handleSubmit}>
          <section className="posts-inputCard posts-composerCard">
            <div className="posts-composerHead">
              <div className="posts-avatar">
                {currentAccount.avatarImage ? (
                  <img
                    src={currentAccount.avatarImage}
                    alt="avatar"
                    className="posts-avatarImage"
                  />
                ) : (
                  String(
                    currentAccount.avatar || currentAccount.name?.charAt(0) || "G"
                  ).charAt(0)
                )}
              </div>

              <div className="posts-accountMeta">
                <div className="posts-accountName">
                  {currentAccount.name || "ゲスト"}
                </div>
                <div className="posts-accountHandle">
                  @{String(currentAccount.handle || "@guest").replace(/^@/, "")}
                </div>
              </div>
            </div>

            <textarea
              className="posts-textarea posts-textareaComposer"
              placeholder={
                isR18
                  ? "R18空間に投稿する内容を書いてね"
                  : "いまどうしてる？"
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={1000}
              disabled={submitting}
            />

            <div className="posts-countRow">
              <span className="posts-destination">
                投稿先: {isR18 ? "ROAD3 for R18" : "ROAD3 Open"}
              </span>
              <span className="posts-count">{text.length} / 1000</span>
            </div>
          </section>

          <section className="posts-inputCard">
            <label className="posts-label">タグ</label>
            <input
              type="text"
              className="posts-input"
              placeholder="例: 日常 お知らせ"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              disabled={submitting}
            />

            <div className="posts-tagPreview">
              {parsedTags.length === 0 ? (
                <span className="posts-tagEmpty">タグなし</span>
              ) : (
                parsedTags.map((tag) => (
                  <span className="posts-tagChip" key={tag}>
                    #{tag}
                  </span>
                ))
              )}
            </div>
          </section>

          {isR18Enabled ? (
            <section className="posts-r18Card">
              <label className="posts-r18Toggle">
                <input
                  type="checkbox"
                  checked={isR18}
                  onChange={(e) => setIsR18(e.target.checked)}
                  disabled={submitting}
                />
                <span className="posts-r18ToggleText">この投稿はR-18です</span>
              </label>

              <p className="posts-r18Note">
                ONにすると、通常タイムラインではなくR18空間に投稿されるよ。
              </p>
            </section>
          ) : (
            <section className="posts-r18Card posts-r18Card-disabled">
              <div className="posts-r18LockedTitle">R18投稿はOFFです</div>
              <p className="posts-r18LockedNote">
                R18投稿を使うには、R18設定ページでR18モードをONにしてね。
              </p>
              <button
                type="button"
                className="posts-openR18SettingsBtn"
                onClick={() => navigate("/settings/r18")}
                disabled={submitting}
              >
                R18設定を開く
              </button>
            </section>
          )}

          <section className="posts-inputCard">
            <div className="posts-mediaHeader">
              <span className="posts-label posts-labelLeft">メディア</span>
              <button
                type="button"
                className="posts-addMediaBtn"
                onClick={handleAddMediaUrl}
                disabled={submitting}
              >
                URL追加
              </button>
            </div>

            {previewMediaUrls.length === 0 ? (
              <div className="posts-mediaEmpty">
                まだメディアは追加されていません
              </div>
            ) : (
              <div className="posts-mediaList">
                {previewMediaUrls.map((url, index) => (
                  <div className="posts-mediaItem" key={`${url}-${index}`}>
                    <img
                      src={url}
                      alt="preview"
                      className={`posts-mediaPreview ${isR18 ? "r18" : ""}`}
                    />
                    <div className="posts-mediaInfo">
                      <span className="posts-mediaName">
                        {isR18 ? "R18メディア" : "メディア"}
                      </span>
                      <button
                        type="button"
                        className="posts-removeMediaBtn"
                        onClick={() => handleRemoveMedia(index)}
                        disabled={submitting}
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isR18 && (
              <p className="posts-r18MediaNote">
                R18メディアは、R18空間側で初期ぼかし表示にできます。
              </p>
            )}
          </section>
        </form>
      </main>

      {toast.show && (
        <div className={`posts-toast posts-toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
