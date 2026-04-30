import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./ProfileEdit.css";

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

function normalizeTag(tag) {
  return String(tag || "")
    .replace(/^#/, "")
    .trim();
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

export default function ProfileEdit() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentAccount = useMemo(
    () => resolveCurrentAccount(location.pathname),
    [location.pathname]
  );

  const allProfileSettings = useMemo(
    () => safeParse(localStorage.getItem("profileSettings"), {}),
    []
  );

  const accountSettings = useMemo(() => {
    if (!currentAccount?.id) return {};
    return allProfileSettings[currentAccount.id] || {};
  }, [allProfileSettings, currentAccount]);

  const [name, setName] = useState(currentAccount?.name || "");
  const [bio, setBio] = useState(accountSettings.bio || "");
  const [place, setPlace] = useState(accountSettings.place || "");
  const [link1, setLink1] = useState(accountSettings.links?.[0] || "");
  const [link2, setLink2] = useState(accountSettings.links?.[1] || "");
  const [link3, setLink3] = useState(accountSettings.links?.[2] || "");
  const [birthday, setBirthday] = useState(accountSettings.birthday || "");
  const [birthdayVisibility, setBirthdayVisibility] = useState(
    accountSettings.birthdayVisibility || "非公開"
  );
  const [showFollowCounts, setShowFollowCounts] = useState(
    typeof accountSettings.showFollowCounts === "boolean"
      ? accountSettings.showFollowCounts
      : true
  );
  const [favoriteTagsText, setFavoriteTagsText] = useState(
    Array.isArray(accountSettings.favoriteTags)
      ? accountSettings.favoriteTags.join(", ")
      : ""
  );
  const [isPrivate, setIsPrivate] = useState(!!accountSettings.isPrivate);

  const [headerPreview, setHeaderPreview] = useState(
    accountSettings.headerImage || ""
  );
  const [avatarPreview, setAvatarPreview] = useState(
    accountSettings.avatarImage || currentAccount?.avatarImage || ""
  );

  useEffect(() => {
    if (!currentAccount) {
      navigate("/login");
    }
  }, [currentAccount, navigate]);

  useEffect(() => {
    return () => {
      if (headerPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(headerPreview);
      }
      if (avatarPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [headerPreview, avatarPreview]);

  const bioCount = bio.length;

  const handlePreviewImage = (file, currentPreview, setter) => {
    if (!file) return;

    if (currentPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(currentPreview);
    }

    const objectUrl = URL.createObjectURL(file);
    setter(objectUrl);
  };

  const handleSave = () => {
    if (!currentAccount?.id) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      alert("名前を入力してね。");
      return;
    }

    if (bio.length > 200) {
      alert("自己紹介は200文字以内で入力してね。");
      return;
    }

    const tags = favoriteTagsText
      .split(",")
      .map(normalizeTag)
      .filter(Boolean)
      .slice(0, 5);

    const links = [link1.trim(), link2.trim(), link3.trim()].filter(Boolean);

    const nextSettingsForAccount = {
      ...accountSettings,
      bio: bio.trim(),
      place: place.trim(),
      links,
      birthday: birthday.trim(),
      birthdayVisibility,
      showFollowCounts,
      favoriteTags: tags,
      isPrivate,
      joinedAt: accountSettings.joinedAt || currentAccount.createdAt || Date.now(),
    };

    delete nextSettingsForAccount.headerImage;
    delete nextSettingsForAccount.avatarImage;

    const nextProfileSettings = {
      ...allProfileSettings,
      [currentAccount.id]: nextSettingsForAccount,
    };

    localStorage.setItem("profileSettings", JSON.stringify(nextProfileSettings));

    const openGroupAccounts = safeParse(localStorage.getItem("openGroupAccounts"), []);
    const nextOpenGroupAccounts = Array.isArray(openGroupAccounts)
      ? openGroupAccounts.map((acc) =>
          String(acc.id) === String(currentAccount.id)
            ? { ...acc, name: trimmedName }
            : acc
        )
      : [];

    if (nextOpenGroupAccounts.length > 0) {
      localStorage.setItem(
        "openGroupAccounts",
        JSON.stringify(nextOpenGroupAccounts)
      );
    }

    const allAccounts = safeParse(localStorage.getItem("accounts"), []);
    const nextAccounts = Array.isArray(allAccounts)
      ? allAccounts.map((acc) =>
          String(acc.id) === String(currentAccount.id)
            ? { ...acc, name: trimmedName }
            : acc
        )
      : [];

    if (nextAccounts.length > 0) {
      localStorage.setItem("accounts", JSON.stringify(nextAccounts));
    }

    const personalAccount = safeParse(localStorage.getItem("personalAccount"), null);
    if (personalAccount?.id && String(personalAccount.id) === String(currentAccount.id)) {
      localStorage.setItem(
        "personalAccount",
        JSON.stringify({ ...personalAccount, name: trimmedName })
      );
    }

    const closedSharedAccount = safeParse(
      localStorage.getItem("closedSharedAccount"),
      null
    );
    if (
      closedSharedAccount?.id &&
      String(closedSharedAccount.id) === String(currentAccount.id)
    ) {
      localStorage.setItem(
        "closedSharedAccount",
        JSON.stringify({ ...closedSharedAccount, name: trimmedName })
      );
    }

    localStorage.removeItem("currentAccount");
    localStorage.removeItem("currentOpenGroupAccount");

    alert("プロフィールを保存したよ。\n画像は今は端末保存せず、プレビューのみになっているよ。");
    navigate("/profile");
  };

  return (
    <div className="profileEdit-page">
      <div className="profileEdit-topbar">
        <button
          type="button"
          className="profileEdit-back"
          onClick={() => navigate(-1)}
        >
          ← 戻る
        </button>

        <h2 className="profileEdit-title">プロフィール編集</h2>

        <button
          type="button"
          className="profileEdit-save"
          onClick={handleSave}
        >
          保存
        </button>
      </div>

      <div className="profileEdit-content">
        <section className="profileEdit-card">
          <div className="profileEdit-headerArea">
            <div className="profileEdit-headerPreview">
              {headerPreview ? (
                <img
                  src={headerPreview}
                  alt="ヘッダー"
                  className="profileEdit-headerImage"
                />
              ) : (
                <div className="profileEdit-headerPlaceholder" />
              )}
            </div>

            <label className="profileEdit-uploadBtn">
              ヘッダー変更
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) =>
                  handlePreviewImage(
                    e.target.files?.[0],
                    headerPreview,
                    setHeaderPreview
                  )
                }
              />
            </label>
          </div>

          <div className="profileEdit-avatarRow">
            <div className="profileEdit-avatarWrap">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="アイコン"
                  className="profileEdit-avatarImage"
                />
              ) : (
                <div className="profileEdit-avatar">
                  {(name || currentAccount?.name || "?").charAt(0)}
                </div>
              )}
            </div>

            <label className="profileEdit-uploadBtn">
              アイコン変更
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) =>
                  handlePreviewImage(
                    e.target.files?.[0],
                    avatarPreview,
                    setAvatarPreview
                  )
                }
              />
            </label>
          </div>

          <div className="profileEdit-form">
            <label className="profileEdit-field">
              <span className="profileEdit-label">名前</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="名前"
                className="profileEdit-input"
              />
            </label>

            <label className="profileEdit-field">
              <span className="profileEdit-label">自己紹介</span>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="自己紹介"
                className="profileEdit-textarea"
                maxLength={200}
              />
              <div className="profileEdit-count">{bioCount}/200</div>
            </label>

            <label className="profileEdit-field">
              <span className="profileEdit-label">居場所</span>
              <input
                type="text"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="居場所"
                className="profileEdit-input"
              />
            </label>

            <div className="profileEdit-field">
              <span className="profileEdit-label">リンク（最大3つ）</span>

              <input
                type="text"
                value={link1}
                onChange={(e) => setLink1(e.target.value)}
                placeholder="リンク1"
                className="profileEdit-input"
              />
              <input
                type="text"
                value={link2}
                onChange={(e) => setLink2(e.target.value)}
                placeholder="リンク2"
                className="profileEdit-input"
              />
              <input
                type="text"
                value={link3}
                onChange={(e) => setLink3(e.target.value)}
                placeholder="リンク3"
                className="profileEdit-input"
              />
            </div>

            <label className="profileEdit-field">
              <span className="profileEdit-label">誕生日</span>
              <input
                type="text"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                placeholder="例：3月10日"
                className="profileEdit-input"
              />
            </label>

            <div className="profileEdit-field">
              <span className="profileEdit-label">誕生日公開設定</span>
              <div className="profileEdit-options">
                {["非公開", "年非公開", "全公開"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`profileEdit-option ${
                      birthdayVisibility === option ? "active" : ""
                    }`}
                    onClick={() => setBirthdayVisibility(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="profileEdit-field">
              <span className="profileEdit-label">フォロー / フォロワー数表示</span>
              <div className="profileEdit-options">
                <button
                  type="button"
                  className={`profileEdit-option ${showFollowCounts ? "active" : ""}`}
                  onClick={() => setShowFollowCounts(true)}
                >
                  表示
                </button>
                <button
                  type="button"
                  className={`profileEdit-option ${!showFollowCounts ? "active" : ""}`}
                  onClick={() => setShowFollowCounts(false)}
                >
                  非表示
                </button>
              </div>
            </div>

            <label className="profileEdit-field">
              <span className="profileEdit-label">よく使うタグ（最大5つ）</span>
              <input
                type="text"
                value={favoriteTagsText}
                onChange={(e) => setFavoriteTagsText(e.target.value)}
                placeholder="例：音楽, 散歩, 読書"
                className="profileEdit-input"
              />
              <small className="profileEdit-help">
                カンマ区切りで入力してね
              </small>
            </label>

            <div className="profileEdit-field">
              <span className="profileEdit-label">アカウント公開設定</span>
              <div className="profileEdit-options">
                <button
                  type="button"
                  className={`profileEdit-option ${!isPrivate ? "active" : ""}`}
                  onClick={() => setIsPrivate(false)}
                >
                  公開
                </button>
                <button
                  type="button"
                  className={`profileEdit-option ${isPrivate ? "active" : ""}`}
                  onClick={() => setIsPrivate(true)}
                >
                  非公開
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
