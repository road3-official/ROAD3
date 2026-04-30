import { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import OpenPostCard from "../components/OpenPostCard";
import "./SearchTag.css";

const OPEN_POSTS_KEY = "openPosts";
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

function normalizePost(post) {
  return {
    ...post,
    id: post?.id ?? `${Date.now()}-${Math.random()}`,
    author: post?.author ?? post?.userName ?? post?.name ?? "名前未設定",
    userName: post?.userName ?? post?.author ?? post?.name ?? "名前未設定",
    name: post?.name ?? post?.author ?? post?.userName ?? "名前未設定",
    text: post?.text ?? post?.content ?? "",
    content: post?.content ?? post?.text ?? "",
    timestamp: post?.timestamp ?? post?.createdAt ?? Date.now(),
    createdAt: post?.createdAt ?? post?.timestamp ?? Date.now(),
    handle: post?.handle ?? `@${post?.accountId ?? "unknown"}`,
    userId: post?.userId ?? post?.handle ?? `@${post?.accountId ?? "unknown"}`,
    tags: Array.isArray(post?.tags) ? post.tags : [],
    media: Array.isArray(post?.media)
      ? post.media
      : post?.image
      ? [post.image]
      : [],
    image: post?.image ?? (Array.isArray(post?.media) ? post.media[0] : null),
    likedUserIds: Array.isArray(post?.likedUserIds) ? post.likedUserIds : [],
    likeCount: Number(post?.likeCount ?? 0),
    replyCount: Number(post?.replyCount ?? 0),
    resignalCount: Number(post?.resignalCount ?? 0),
    isR18: Boolean(post?.isR18),
    saved: Boolean(post?.saved),
    liked: Boolean(post?.liked),
    resignaled: Boolean(post?.resignaled),
  };
}

function flattenPostsObject(stored) {
  if (!stored || typeof stored !== "object") return [];
  return Object.values(stored).flat().filter(Boolean).map(normalizePost);
}

export default function SearchTag() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tagName } = useParams();

  const decodedTag = `#${decodeURIComponent(tagName || "").replace(/^#/, "")}`;

  const [currentAccount, setCurrentAccount] = useState(() =>
    resolveCurrentAccount(location.pathname)
  );

  const [openPosts, setOpenPosts] = useState(() => {
    const stored = safeParse(localStorage.getItem(OPEN_POSTS_KEY), {});
    return flattenPostsObject(stored);
  });

  useEffect(() => {
    const syncAll = () => {
      setCurrentAccount(resolveCurrentAccount(location.pathname));
      const stored = safeParse(localStorage.getItem(OPEN_POSTS_KEY), {});
      setOpenPosts(flattenPostsObject(stored));
    };

    syncAll();
    window.addEventListener("storage", syncAll);

    return () => {
      window.removeEventListener("storage", syncAll);
    };
  }, [location.pathname]);

  const reloadPostsFromStorage = () => {
    const stored = safeParse(localStorage.getItem(OPEN_POSTS_KEY), {});
    setOpenPosts(flattenPostsObject(stored));
    setCurrentAccount(resolveCurrentAccount(location.pathname));
  };

  const tagPosts = useMemo(() => {
    return [...openPosts]
      .filter((post) =>
        (post.tags || []).some(
          (tag) => `#${String(tag).replace(/^#/, "")}` === decodedTag
        )
      )
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [openPosts, decodedTag]);

  const formatTime = (timestamp) => {
    if (!timestamp) return "";

    const diffMs = Date.now() - Number(timestamp);
    const diffMin = Math.floor(diffMs / (1000 * 60));
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return "たった今";
    if (diffMin < 60) return `${diffMin}分前`;
    if (diffHour < 24) return `${diffHour}時間前`;
    return `${diffDay}日前`;
  };

  const handleToggleLike = (postId) => {
    if (!currentAccount?.id) return;

    const stored = safeParse(localStorage.getItem(OPEN_POSTS_KEY), {});
    let targetPost = null;
    let addedLike = false;

    const updated = Object.fromEntries(
      Object.entries(stored).map(([accountId, posts]) => {
        const nextPosts = (posts || []).map((post) => {
          if (String(post.id) !== String(postId)) return post;

          const currentLikedUserIds = Array.isArray(post.likedUserIds)
            ? post.likedUserIds.map(String)
            : [];

          const myId = String(currentAccount.id);
          const alreadyLiked = currentLikedUserIds.includes(myId);

          const nextLikedUserIds = alreadyLiked
            ? currentLikedUserIds.filter((id) => id !== myId)
            : [...currentLikedUserIds, myId];

          addedLike = !alreadyLiked;

          targetPost = {
            ...post,
            likedUserIds: nextLikedUserIds,
            liked: !alreadyLiked,
            likeCount: nextLikedUserIds.length,
          };

          return targetPost;
        });

        return [accountId, nextPosts];
      })
    );

    localStorage.setItem(OPEN_POSTS_KEY, JSON.stringify(updated));

    if (!targetPost) {
      reloadPostsFromStorage();
      return;
    }

    const myLikedKey = `likedPosts-${currentAccount.id}`;
    const likedPosts = safeParse(localStorage.getItem(myLikedKey), []);
    const exists = likedPosts.some((p) => String(p.id) === String(postId));

    const iLikedThisPost = (targetPost.likedUserIds || [])
      .map(String)
      .includes(String(currentAccount.id));

    if (iLikedThisPost && !exists) {
      localStorage.setItem(myLikedKey, JSON.stringify([targetPost, ...likedPosts]));
    }

    if (!iLikedThisPost && exists) {
      localStorage.setItem(
        myLikedKey,
        JSON.stringify(likedPosts.filter((p) => String(p.id) !== String(postId)))
      );
    }

    if (addedLike && String(targetPost.accountId) !== String(currentAccount.id)) {
      const currentNotifications = safeParse(
        localStorage.getItem("notifications"),
        []
      );

      const nextNotifications = [
        {
          id: Date.now(),
          accountId: targetPost.accountId,
          type: "like",
          from: currentAccount.name || "ユーザー",
          fromUser: currentAccount.name || "ユーザー",
          fromUserId: currentAccount.handle || `@${currentAccount.id}`,
          postId: targetPost.id,
          link: `/signal/${targetPost.id}`,
          read: false,
          isRead: false,
          createdAt: Date.now(),
        },
        ...currentNotifications,
      ].slice(0, 250);

      localStorage.setItem("notifications", JSON.stringify(nextNotifications));
    }

    reloadPostsFromStorage();
  };

  const handleToggleSave = (postId) => {
    if (!currentAccount?.id) return;

    const stored = safeParse(localStorage.getItem(OPEN_POSTS_KEY), {});
    const mySavedKey = `savedPosts-${currentAccount.id}`;
    const savedPosts = safeParse(localStorage.getItem(mySavedKey), []);
    let targetPost = null;

    const updated = Object.fromEntries(
      Object.entries(stored).map(([accountId, posts]) => {
        const nextPosts = (posts || []).map((post) => {
          if (String(post.id) !== String(postId)) return post;

          const nextSaved = !post.saved;
          targetPost = {
            ...post,
            saved: nextSaved,
          };

          return targetPost;
        });

        return [accountId, nextPosts];
      })
    );

    localStorage.setItem(OPEN_POSTS_KEY, JSON.stringify(updated));

    if (!targetPost) {
      reloadPostsFromStorage();
      return;
    }

    const exists = savedPosts.some((p) => String(p.id) === String(postId));

    if (targetPost.saved && !exists) {
      localStorage.setItem(mySavedKey, JSON.stringify([targetPost, ...savedPosts]));
    }

    if (!targetPost.saved && exists) {
      localStorage.setItem(
        mySavedKey,
        JSON.stringify(savedPosts.filter((p) => String(p.id) !== String(postId)))
      );
    }

    reloadPostsFromStorage();
  };

  const handleToggleResignal = (postId) => {
    if (!currentAccount?.id) return;

    const ownerId = String(currentAccount.id);
    const stored = safeParse(localStorage.getItem(OPEN_POSTS_KEY), {});
    let targetPost = null;

    Object.values(stored)
      .flat()
      .forEach((post) => {
        if (String(post.id) === String(postId)) {
          targetPost = post;
        }
      });

    if (!targetPost) return;

    const myPosts = stored[ownerId] || [];
    const existingResignal = myPosts.find(
      (post) =>
        post.isResignal &&
        String(post.originalPost?.id) === String(postId)
    );

    let updated = { ...stored };

    if (existingResignal) {
      updated[ownerId] = myPosts.filter(
        (post) => String(post.id) !== String(existingResignal.id)
      );

      updated = Object.fromEntries(
        Object.entries(updated).map(([accountId, posts]) => [
          accountId,
          posts.map((post) => {
            if (String(post.id) !== String(postId)) return post;
            return {
              ...post,
              resignaled: false,
              resignalCount: Math.max(0, (post.resignalCount ?? 0) - 1),
            };
          }),
        ])
      );
    } else {
      const newResignal = {
        id: Date.now(),
        text: targetPost.text,
        timestamp: Date.now(),
        author: currentAccount.name || "名前未設定",
        accountId: currentAccount.id,
        handle: currentAccount.handle || `@${currentAccount.id}`,
        space: "open",
        tags: targetPost.tags || [],
        image: null,
        mediaName: null,
        recommendToOpen: true,
        likeCount: 0,
        liked: false,
        saved: false,
        replyCount: 0,
        resignalCount: 0,
        resignaled: false,
        isResignal: true,
        originalPost: {
          id: targetPost.id,
          author: targetPost.author,
          handle: targetPost.handle,
          text: targetPost.text,
          timestamp: targetPost.timestamp,
        },
      };

      updated[ownerId] = [newResignal, ...myPosts];

      if (String(targetPost.accountId) !== String(currentAccount.id)) {
        const currentNotifications = safeParse(
          localStorage.getItem("notifications"),
          []
        );

        const nextNotifications = [
          {
            id: Date.now() + 1,
            accountId: targetPost.accountId,
            type: "resignal",
            from: currentAccount.name || "ユーザー",
            fromUser: currentAccount.name || "ユーザー",
            fromUserId: currentAccount.handle || `@${currentAccount.id}`,
            postId: targetPost.id,
            link: `/signal/${targetPost.id}`,
            read: false,
            isRead: false,
            createdAt: Date.now(),
          },
          ...currentNotifications,
        ].slice(0, 250);

        localStorage.setItem("notifications", JSON.stringify(nextNotifications));
      }

      updated = Object.fromEntries(
        Object.entries(updated).map(([accountId, posts]) => [
          accountId,
          posts.map((post) => {
            if (String(post.id) !== String(postId)) return post;
            return {
              ...post,
              resignaled: true,
              resignalCount: (post.resignalCount ?? 0) + 1,
            };
          }),
        ])
      );
    }

    localStorage.setItem(OPEN_POSTS_KEY, JSON.stringify(updated));
    reloadPostsFromStorage();
  };

  const handleDelete = (postId) => {
    const confirmed = window.confirm("このシグナルを削除しますか？");
    if (!confirmed) return;

    const stored = safeParse(localStorage.getItem(OPEN_POSTS_KEY), {});
    const updated = {};

    Object.keys(stored).forEach((accountId) => {
      updated[accountId] = (stored[accountId] || []).filter(
        (post) => String(post.id) !== String(postId)
      );
    });

    localStorage.setItem(OPEN_POSTS_KEY, JSON.stringify(updated));
    reloadPostsFromStorage();
  };

  return (
    <div className="search-tag-page">
      <div className="search-tag-header">
        <button
          type="button"
          className="search-tag-back"
          onClick={() => navigate(-1)}
        >
          ←
        </button>

        <div className="search-tag-header-text">
          <h2>{decodedTag}</h2>
          <p>{tagPosts.length}件のシグナル</p>
        </div>
      </div>

      <div className="search-tag-content">
        {tagPosts.length > 0 ? (
          tagPosts.map((post) => (
            <OpenPostCard
              key={post.id}
              post={post}
              formatTime={formatTime}
              onToggleLike={handleToggleLike}
              onToggleSave={handleToggleSave}
              onToggleResignal={handleToggleResignal}
              onDelete={handleDelete}
            />
          ))
        ) : (
          <p className="search-tag-empty">
            このタグのシグナルはまだありません
          </p>
        )}
      </div>
    </div>
  );
}
