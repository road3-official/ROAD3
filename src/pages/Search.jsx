import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Search.css";
import OpenPostCard from "../components/OpenPostCard";

const R18_ENABLED_KEY = "r18Enabled";
const OPEN_POSTS_KEY = "openPosts";
const OPEN_R18_POSTS_KEY = "openR18Posts";
const SEARCH_FROM_PATH = "/search";
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
    author: post?.author ?? post?.userName ?? "名前未設定",
    userName: post?.userName ?? post?.author ?? "名前未設定",
    text: post?.text ?? post?.content ?? "",
    content: post?.content ?? post?.text ?? "",
    timestamp: post?.timestamp ?? post?.createdAt ?? Date.now(),
    createdAt: post?.createdAt ?? post?.timestamp ?? Date.now(),
    handle: post?.handle ?? `@${post?.accountId ?? "unknown"}`,
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
  };
}

function flattenPostsObject(stored) {
  if (!stored || typeof stored !== "object") return [];
  return Object.values(stored).flat().filter(Boolean).map(normalizePost);
}

export default function Search() {
  const navigate = useNavigate();
  const location = useLocation();

  const [keyword, setKeyword] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [searchHistory, setSearchHistory] = useState([]);
  const [searchMode, setSearchMode] = useState("normal");

  const [currentAccount, setCurrentAccount] = useState(() =>
    resolveCurrentAccount(location.pathname)
  );

  const isR18Enabled = localStorage.getItem(R18_ENABLED_KEY) === "true";

  const [openPosts, setOpenPosts] = useState(() => {
    const stored = safeParse(localStorage.getItem(OPEN_POSTS_KEY), {});
    return flattenPostsObject(stored).filter((post) => !post.isR18);
  });

  const [openR18Posts, setOpenR18Posts] = useState(() => {
    const stored = safeParse(localStorage.getItem(OPEN_R18_POSTS_KEY), {});
    return flattenPostsObject(stored).map((post) => ({
      ...post,
      isR18: true,
    }));
  });

  useEffect(() => {
    const syncCurrentAccount = () => {
      setCurrentAccount(resolveCurrentAccount(location.pathname));
    };

    syncCurrentAccount();
    window.addEventListener("storage", syncCurrentAccount);

    return () => {
      window.removeEventListener("storage", syncCurrentAccount);
    };
  }, [location.pathname]);

  useEffect(() => {
    if (!currentAccount?.id) return;

    const key = `searchHistory-${currentAccount.id}`;
    const history = safeParse(localStorage.getItem(key), []);
    setSearchHistory(history);
  }, [currentAccount]);

  useEffect(() => {
    if (!isR18Enabled && searchMode === "r18") {
      setSearchMode("normal");
    }
  }, [isR18Enabled, searchMode]);

  const saveSearchHistory = (value) => {
    if (!currentAccount?.id) return;

    const trimmed = String(value || "").trim();
    if (!trimmed) return;

    const key = `searchHistory-${currentAccount.id}`;
    const history = safeParse(localStorage.getItem(key), []);
    const filtered = history.filter((item) => item !== trimmed);
    const updated = [trimmed, ...filtered].slice(0, 10);

    localStorage.setItem(key, JSON.stringify(updated));
    setSearchHistory(updated);
  };

  const allUsers = useMemo(() => {
    const userMap = new Map();
    const sourcePosts = [...openPosts, ...(isR18Enabled ? openR18Posts : [])];

    sourcePosts.forEach((post) => {
      if (!post.accountId) return;

      if (!userMap.has(String(post.accountId))) {
        userMap.set(String(post.accountId), {
          id: post.accountId,
          name: post.author || post.userName || "名前未設定",
          handle: post.handle || `@${post.accountId}`,
          bio: post.bio || "自己紹介はまだありません。",
          following: post.following ?? 0,
          followers:
            Number(localStorage.getItem(`followers-count-${post.accountId}`)) ||
            post.followers ||
            0,
          place: post.place || "未設定",
          links: post.links || [],
          birthday: post.birthday || "非公開",
          joined: post.joined || "ROAD3利用開始日",
          tags: post.tags || [],
        });
      }
    });

    return Array.from(userMap.values());
  }, [openPosts, openR18Posts, isR18Enabled]);

  const suggestedUsers = useMemo(() => {
    const currentId = String(currentAccount?.id || "");
    return allUsers
      .filter((user) => String(user.id) !== currentId)
      .slice(0, 10);
  }, [allUsers, currentAccount]);

  const activePosts = useMemo(() => {
    return searchMode === "r18" ? openR18Posts : openPosts;
  }, [searchMode, openPosts, openR18Posts]);

  const myFrequentTags = useMemo(() => {
    const tagCount = {};

    activePosts.forEach((post) => {
      if (String(post.accountId) !== String(currentAccount?.id)) return;

      (post.tags || []).forEach((tag) => {
        const normalized = `#${String(tag).replace(/^#/, "")}`;
        tagCount[normalized] = (tagCount[normalized] || 0) + 1;
      });
    });

    return Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag)
      .slice(0, 5);
  }, [activePosts, currentAccount]);

  const recommendedTags = useMemo(() => {
    const tagCount = {};

    activePosts.forEach((post) => {
      (post.tags || []).forEach((tag) => {
        const normalized = `#${String(tag).replace(/^#/, "")}`;
        tagCount[normalized] = (tagCount[normalized] || 0) + 1;
      });
    });

    return Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag)
      .slice(0, 10);
  }, [activePosts]);

  const normalizedPosts = useMemo(() => {
    if (!currentAccount?.id) return activePosts;

    return activePosts.map((post) => {
      const likedUserIds = Array.isArray(post.likedUserIds)
        ? post.likedUserIds.map(String)
        : [];

      return {
        ...post,
        liked: likedUserIds.includes(String(currentAccount.id)),
        likeCount: likedUserIds.length,
      };
    });
  }, [activePosts, currentAccount]);

  const latestSignals = useMemo(() => {
    return [...normalizedPosts]
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 10);
  }, [normalizedPosts]);

  const filteredUsers = useMemo(() => {
    if (!keyword.trim()) return suggestedUsers;

    const lower = keyword.toLowerCase();
    return allUsers.filter((user) => {
      return (
        user.name.toLowerCase().includes(lower) ||
        user.handle.toLowerCase().includes(lower)
      );
    });
  }, [keyword, allUsers, suggestedUsers]);

  const filteredTags = useMemo(() => {
    let base = recommendedTags;

    if (keyword.trim()) {
      base = base.filter((tag) =>
        tag.toLowerCase().includes(keyword.toLowerCase())
      );
    }

    return base;
  }, [keyword, recommendedTags]);

  const filteredSignals = useMemo(() => {
    let base = latestSignals;

    if (selectedTag) {
      base = base.filter((post) =>
        (post.tags || []).some(
          (tag) => `#${String(tag).replace(/^#/, "")}` === selectedTag
        )
      );
    }

    if (!keyword.trim()) return base;

    const lower = keyword.toLowerCase();

    return base.filter((post) => {
      const textMatch = (post.text || "").toLowerCase().includes(lower);
      const authorMatch = (post.author || "").toLowerCase().includes(lower);
      const handleMatch = (post.handle || "").toLowerCase().includes(lower);
      const tagMatch = (post.tags || []).some((tag) =>
        `#${String(tag).replace(/^#/, "")}`.toLowerCase().includes(lower)
      );

      return textMatch || authorMatch || handleMatch || tagMatch;
    });
  }, [keyword, selectedTag, latestSignals]);

  const isSearching = keyword.trim() !== "";

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

  const reloadPostsFromStorage = () => {
    const normalStored = safeParse(localStorage.getItem(OPEN_POSTS_KEY), {});
    const r18Stored = safeParse(localStorage.getItem(OPEN_R18_POSTS_KEY), {});

    setOpenPosts(flattenPostsObject(normalStored).filter((post) => !post.isR18));
    setOpenR18Posts(
      flattenPostsObject(r18Stored).map((post) => ({
        ...post,
        isR18: true,
      }))
    );
    setCurrentAccount(resolveCurrentAccount(location.pathname));
  };

  const handleToggleLike = (postId) => {
    if (!currentAccount?.id) return;

    const storageKey = searchMode === "r18" ? OPEN_R18_POSTS_KEY : OPEN_POSTS_KEY;
    const stored = safeParse(localStorage.getItem(storageKey), {});
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
            likeCount: nextLikedUserIds.length,
          };

          return targetPost;
        });

        return [accountId, nextPosts];
      })
    );

    localStorage.setItem(storageKey, JSON.stringify(updated));

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

    const storageKey = searchMode === "r18" ? OPEN_R18_POSTS_KEY : OPEN_POSTS_KEY;
    const stored = safeParse(localStorage.getItem(storageKey), {});
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

    localStorage.setItem(storageKey, JSON.stringify(updated));

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

    if (searchMode === "r18") {
      window.alert("R18検索一覧ではリシグナル連携は後でつなぐ予定だよ");
      return;
    }

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
          tags: targetPost.tags || [],
          image: targetPost.image || null,
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

    const storageKey = searchMode === "r18" ? OPEN_R18_POSTS_KEY : OPEN_POSTS_KEY;
    const stored = safeParse(localStorage.getItem(storageKey), {});
    const updated = {};

    Object.keys(stored).forEach((accountId) => {
      updated[accountId] = (stored[accountId] || []).filter(
        (post) => String(post.id) !== String(postId)
      );
    });

    localStorage.setItem(storageKey, JSON.stringify(updated));
    reloadPostsFromStorage();
  };

  const isFollowingUser = (targetUserId) => {
    if (!currentAccount?.id) return false;

    const followingList = safeParse(
      localStorage.getItem(`followingList-${currentAccount.id}`),
      []
    );

    return followingList.some(
      (user) => String(user.id) === String(targetUserId)
    );
  };

  const handleToggleFollowUser = (e, user) => {
    e.stopPropagation();

    if (!currentAccount?.id) return;

    const currentId = String(currentAccount.id);
    const targetId = String(user.id);

    if (currentId === targetId) return;

    const myFollowingKey = `followingList-${currentId}`;
    const targetFollowersKey = `followersList-${targetId}`;
    const followKey = `follow-${currentId}-${targetId}`;
    const targetFollowerCountKey = `followers-count-${targetId}`;

    const currentFollowingList = safeParse(
      localStorage.getItem(myFollowingKey),
      []
    );
    const currentFollowersList = safeParse(
      localStorage.getItem(targetFollowersKey),
      []
    );

    const alreadyFollowing = currentFollowingList.some(
      (item) => String(item.id) === targetId
    );

    const meData = {
      id: currentAccount.id,
      name: currentAccount.name || "ユーザー",
      userId: currentAccount.handle || `@${currentAccount.id}`,
      handle: currentAccount.handle || `@${currentAccount.id}`,
      avatar: currentAccount.avatar || currentAccount.name?.charAt(0) || "U",
      avatarImage:
        currentAccount.avatarImage || currentAccount.profileImage || "",
    };

    if (alreadyFollowing) {
      const nextFollowingList = currentFollowingList.filter(
        (item) => String(item.id) !== targetId
      );
      const nextFollowersList = currentFollowersList.filter(
        (item) => String(item.id) !== currentId
      );

      localStorage.setItem(myFollowingKey, JSON.stringify(nextFollowingList));
      localStorage.setItem(targetFollowersKey, JSON.stringify(nextFollowersList));
      localStorage.setItem(followKey, "false");

      const currentCount = Number(
        localStorage.getItem(targetFollowerCountKey) ?? user.followers ?? 0
      );
      localStorage.setItem(
        targetFollowerCountKey,
        String(Math.max(0, currentCount - 1))
      );
    } else {
      const normalizedTargetUser = {
        id: user.id,
        name: user.name || "名前未設定",
        userId: user.handle || `@${user.id}`,
        handle: user.handle || `@${user.id}`,
        bio: user.bio || "自己紹介はまだありません。",
        following: user.following ?? 0,
        followers:
          Number(localStorage.getItem(targetFollowerCountKey)) ||
          user.followers ||
          0,
        place: user.place || "未設定",
        links: user.links || [],
        birthday: user.birthday || "非公開",
        joined: user.joined || "ROAD3利用開始日",
        tags: user.tags || [],
      };

      const nextFollowingList = currentFollowingList.some(
        (item) => String(item.id) === targetId
      )
        ? currentFollowingList
        : [normalizedTargetUser, ...currentFollowingList];

      const nextFollowersList = currentFollowersList.some(
        (item) => String(item.id) === currentId
      )
        ? currentFollowersList
        : [meData, ...currentFollowersList];

      localStorage.setItem(myFollowingKey, JSON.stringify(nextFollowingList));
      localStorage.setItem(targetFollowersKey, JSON.stringify(nextFollowersList));
      localStorage.setItem(followKey, "true");

      const currentCount = Number(
        localStorage.getItem(targetFollowerCountKey) ?? user.followers ?? 0
      );
      localStorage.setItem(targetFollowerCountKey, String(currentCount + 1));

      const currentNotifications = safeParse(
        localStorage.getItem("notifications"),
        []
      );

      const nextNotifications = [
        {
          id: Date.now(),
          accountId: user.id,
          type: "follow",
          from: currentAccount.name || "ユーザー",
          fromUser: currentAccount.name || "ユーザー",
          fromUserId: currentAccount.handle || `@${currentAccount.id}`,
          link: `/profile/user/${encodeURIComponent(currentAccount.id)}`,
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

  const handleOpenUser = (user) => {
    navigate(`/profile/user/${encodeURIComponent(user.id)}`, {
      state: {
        from: SEARCH_FROM_PATH,
        user: {
          id: user.id,
          name: user.name,
          userId: user.handle,
          handle: user.handle,
          bio: user.bio || "自己紹介はまだありません。",
          following: user.following ?? 0,
          followers:
            Number(localStorage.getItem(`followers-count-${user.id}`)) ||
            user.followers ||
            0,
          place: user.place || "未設定",
          links: user.links || [],
          birthday: user.birthday || "非公開",
          joined: user.joined || "ROAD3利用開始日",
          tags: user.tags || [],
        },
      },
    });
  };

  const handleSearchHistoryClick = (item) => {
    setKeyword(item);
    saveSearchHistory(item);
  };

  const clearSearchHistory = () => {
    if (!currentAccount?.id) return;
    localStorage.removeItem(`searchHistory-${currentAccount.id}`);
    setSearchHistory([]);
  };

  const handleTagNavigate = (tag) => {
    saveSearchHistory(tag);
    navigate(`/search/tag/${encodeURIComponent(tag.replace(/^#/, ""))}`, {
      state: { from: SEARCH_FROM_PATH },
    });
  };

  return (
    <div className="search-page">
      <div className="search-top">
        <div className="search-avatar">
          {currentAccount?.avatarImage ? (
            <img
              src={currentAccount.avatarImage}
              alt={currentAccount?.name || "ユーザー"}
              className="search-avatar-image"
            />
          ) : (
            (currentAccount?.name || "?").charAt(0)
          )}
        </div>

        <div className="search-bar-wrap">
          <input
            type="text"
            className="search-bar"
            placeholder={searchMode === "r18" ? "R18空間を検索" : "検索"}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onBlur={() => {
              if (keyword.trim()) {
                saveSearchHistory(keyword);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && keyword.trim()) {
                saveSearchHistory(keyword);
              }
            }}
          />
        </div>
      </div>

      {isR18Enabled && (
        <div className="search-mode-switch">
          <button
            type="button"
            className={`search-mode-btn ${searchMode === "normal" ? "active" : ""}`}
            onClick={() => {
              setSearchMode("normal");
              setSelectedTag("");
            }}
          >
            通常
          </button>

          <button
            type="button"
            className={`search-mode-btn ${searchMode === "r18" ? "active" : ""}`}
            onClick={() => {
              setSearchMode("r18");
              setSelectedTag("");
            }}
          >
            R18
          </button>
        </div>
      )}

      <div className="search-content">
        {!isSearching && searchHistory.length > 0 && (
          <section className="search-section">
            <div className="search-historyHead">
              <h2 className="search-section-title">最近の検索</h2>
              <button
                type="button"
                className="search-historyClear"
                onClick={clearSearchHistory}
              >
                クリア
              </button>
            </div>

            <div className="search-history">
              {searchHistory.map((item, index) => (
                <button
                  key={`${item}-${index}`}
                  type="button"
                  className="search-history-item"
                  onClick={() => handleSearchHistoryClick(item)}
                >
                  🔍 {item}
                </button>
              ))}
            </div>
          </section>
        )}

        {selectedTag && (
          <div className="search-selected-tag">
            <span>{selectedTag} で絞り込み中</span>
            <button
              type="button"
              onClick={() => {
                setSelectedTag("");
                setKeyword("");
              }}
            >
              ×
            </button>
          </div>
        )}

        {isSearching ? (
          <>
            <section className="search-section">
              <h2 className="search-section-title">ユーザー</h2>

              <div className="search-user-row">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => {
                    const isFollowing = isFollowingUser(user.id);

                    return (
                      <div className="search-user-card" key={user.id}>
                        <button
                          type="button"
                          className="search-user-main"
                          onClick={() => handleOpenUser(user)}
                        >
                          <div className="search-user-icon">
                            {user.name?.charAt(0)}
                          </div>
                          <p className="search-user-name">{user.name}</p>
                          <p className="search-user-handle">
                            @{String(user.handle).replace(/^@/, "")}
                          </p>
                        </button>

                        <button
                          type="button"
                          className={`search-user-followBtn ${
                            isFollowing ? "following" : ""
                          }`}
                          onClick={(e) => handleToggleFollowUser(e, user)}
                        >
                          {isFollowing ? "フォロー中" : "フォロー"}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <p className="search-empty-text">
                    該当するユーザーがいません
                  </p>
                )}
              </div>
            </section>

            <section className="search-section">
              <h2 className="search-section-title">
                {searchMode === "r18" ? "R18タグ" : "タグ"}
              </h2>

              <div className="search-tag-list vertical">
                {filteredTags.length > 0 ? (
                  filteredTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={`search-tag-item wide ${
                        selectedTag === tag ? "active" : ""
                      }`}
                      onClick={() => {
                        const next = selectedTag === tag ? "" : tag;
                        setSelectedTag(next);
                        setKeyword(next);
                        saveSearchHistory(tag);
                      }}
                    >
                      {tag}
                    </button>
                  ))
                ) : (
                  <p className="search-empty-text">
                    該当するタグがありません
                  </p>
                )}
              </div>
            </section>

            <section className="search-section">
              <h2 className="search-section-title">
                {searchMode === "r18" ? "R18シグナル" : "シグナル"}
              </h2>

              <div className="search-signal-list">
                {filteredSignals.length > 0 ? (
                  filteredSignals.map((post) => (
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
                  <p className="search-empty-text">
                    該当するシグナルがありません
                  </p>
                )}
              </div>
            </section>
          </>
        ) : (
          <>
            <section className="search-section">
              <h2 className="search-section-title">趣味が近そうなユーザー</h2>

              <div className="search-user-row">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => {
                    const isFollowing = isFollowingUser(user.id);

                    return (
                      <div className="search-user-card" key={user.id}>
                        <button
                          type="button"
                          className="search-user-main"
                          onClick={() => handleOpenUser(user)}
                        >
                          <div className="search-user-icon">
                            {user.name?.charAt(0)}
                          </div>
                          <p className="search-user-name">{user.name}</p>
                          <p className="search-user-handle">
                            @{String(user.handle).replace(/^@/, "")}
                          </p>
                        </button>

                        <button
                          type="button"
                          className={`search-user-followBtn ${
                            isFollowing ? "following" : ""
                          }`}
                          onClick={(e) => handleToggleFollowUser(e, user)}
                        >
                          {isFollowing ? "フォロー中" : "フォロー"}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <p className="search-empty-text">
                    該当するユーザーがいません
                  </p>
                )}
              </div>
            </section>

            <section className="search-section">
              <h2 className="search-section-title">
                {searchMode === "r18"
                  ? "あなたがよく使う R18タグ"
                  : "あなたがよく使う #タグ"}
              </h2>

              <div className="search-tag-list">
                {myFrequentTags.length > 0 ? (
                  myFrequentTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={`search-tag-item ${
                        selectedTag === tag ? "active" : ""
                      }`}
                      onClick={() => handleTagNavigate(tag)}
                    >
                      {tag}
                    </button>
                  ))
                ) : (
                  <p className="search-empty-text">
                    まだよく使うタグはありません
                  </p>
                )}
              </div>
            </section>

            <section className="search-section">
              <h2 className="search-section-title">
                {searchMode === "r18" ? "おすすめR18タグ" : "おすすめタグ"}
              </h2>

              <div className="search-tag-list vertical">
                {filteredTags.length > 0 ? (
                  filteredTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={`search-tag-item wide ${
                        selectedTag === tag ? "active" : ""
                      }`}
                      onClick={() => handleTagNavigate(tag)}
                    >
                      {tag}
                    </button>
                  ))
                ) : (
                  <p className="search-empty-text">
                    該当するタグがありません
                  </p>
                )}
              </div>
            </section>

            <section className="search-section">
              <h2 className="search-section-title">
                {searchMode === "r18" ? "新しいR18シグナル" : "新しいシグナル"}
              </h2>

              <div className="search-signal-list">
                {filteredSignals.length > 0 ? (
                  filteredSignals.map((post) => (
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
                  <p className="search-empty-text">
                    該当するシグナルがありません
                  </p>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}