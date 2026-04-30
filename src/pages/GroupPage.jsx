import { useEffect, useMemo, useRef, useState } from "react";
import "./Group.css";

function safeParse(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function sanitizePost(post) {
  const isHeavyImage =
    typeof post?.imageUrl === "string" && post.imageUrl.startsWith("data:");
  const isHeavyVideo =
    typeof post?.videoUrl === "string" && post.videoUrl.startsWith("data:");

  const normalizedLikedBy = Array.isArray(post?.likedBy)
    ? post.likedBy.map((id) => String(id))
    : [];

  return {
    likedBy: normalizedLikedBy,
    imageName: "",
    imageUrl: "",
    videoName: "",
    videoUrl: "",
    replies: [],
    ...post,
    likedBy: normalizedLikedBy,
    imageUrl: isHeavyImage ? "" : post?.imageUrl || "",
    videoUrl: isHeavyVideo ? "" : post?.videoUrl || "",
    hasImage: isHeavyImage ? false : Boolean(post?.hasImage && post?.imageUrl),
    hasVideo: isHeavyVideo ? false : Boolean(post?.hasVideo && post?.videoUrl),
    imageUnavailable: Boolean(isHeavyImage),
    videoUnavailable: Boolean(isHeavyVideo),
  };
}

function sanitizePostsByChannel(postsByChannel, channels) {
  return channels.reduce((acc, channel) => {
    const savedPosts = postsByChannel?.[channel];
    const source = Array.isArray(savedPosts) ? savedPosts : [];
    acc[channel] = source.map(sanitizePost);
    return acc;
  }, {});
}

function persistablePostsByChannel(postsByChannel) {
  const result = {};

  Object.entries(postsByChannel || {}).forEach(([channel, posts]) => {
    result[channel] = (Array.isArray(posts) ? posts : []).map((post) => {
      const next = sanitizePost(post);

      return {
        ...next,
        imageUrl: "",
        videoUrl: "",
        hasImage: false,
        hasVideo: false,
        imageUnavailable:
          next.imageUnavailable || Boolean(post?.imageUrl || post?.imageName),
        videoUnavailable:
          next.videoUnavailable || Boolean(post?.videoUrl || post?.videoName),
      };
    });
  });

  return result;
}

function GroupPage({
  group,
  onBack,
  onUpdateGroup,
  setHideBottomNavForComposer,
  setNotifications,
  currentAccount,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState("雑談");
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);

  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [postText, setPostText] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);

  const [editingPostId, setEditingPostId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [actionMenuPostId, setActionMenuPostId] = useState(null);

  const [isCreateChannelModalOpen, setIsCreateChannelModalOpen] =
    useState(false);
  const [newChannelName, setNewChannelName] = useState("");

  const [isDeleteChannelModalOpen, setIsDeleteChannelModalOpen] =
    useState(false);
  const [deleteChannelTarget, setDeleteChannelTarget] = useState("");

  const [isSortChannelModalOpen, setIsSortChannelModalOpen] = useState(false);

  const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false);
  const [editGroupName, setEditGroupName] = useState(group?.name || "");
  const [editGroupDescription, setEditGroupDescription] = useState(
    group?.description || ""
  );
  const [editGroupIcon, setEditGroupIcon] = useState(group?.icon || "");
  const [editGroupIsPrivate, setEditGroupIsPrivate] = useState(
    Boolean(group?.isPrivate)
  );

  const [openThreadPostId, setOpenThreadPostId] = useState(null);
  const [replyText, setReplyText] = useState("");

  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editingReplyText, setEditingReplyText] = useState("");
  const [replyActionMenuId, setReplyActionMenuId] = useState(null);

  const [channelsLoaded, setChannelsLoaded] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const actionMenuRef = useRef(null);
  const groupMenuRef = useRef(null);
  const replyMenuRef = useRef(null);

  const defaultChannels = useMemo(() => ["雑談"], []);

  const channelsStorageKey = `groupChannels_${group?.id || "default"}`;
  const postsStorageKey = `groupPosts_${group?.id || "default"}`;

  const [channels, setChannels] = useState(defaultChannels);
  const [channelPosts, setChannelPosts] = useState({});

  useEffect(() => {
    setEditGroupName(group?.name || "");
    setEditGroupDescription(group?.description || "");
    setEditGroupIcon(group?.icon || "");
    setEditGroupIsPrivate(Boolean(group?.isPrivate));
  }, [group]);

  useEffect(() => {
    setHideBottomNavForComposer(isComposerOpen);
    return () => {
      setHideBottomNavForComposer(false);
    };
  }, [isComposerOpen, setHideBottomNavForComposer]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        actionMenuRef.current &&
        !actionMenuRef.current.contains(event.target)
      ) {
        setActionMenuPostId(null);
      }

      if (groupMenuRef.current && !groupMenuRef.current.contains(event.target)) {
        setGroupMenuOpen(false);
      }

      if (replyMenuRef.current && !replyMenuRef.current.contains(event.target)) {
        setReplyActionMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const storedChannels = localStorage.getItem(channelsStorageKey);

    let restoredChannels = defaultChannels;

    if (storedChannels) {
      try {
        const parsedChannels = JSON.parse(storedChannels);
        if (Array.isArray(parsedChannels) && parsedChannels.length > 0) {
          restoredChannels = parsedChannels;
        }
      } catch (error) {
        console.error("group channels parse error:", error);
      }
    } else {
      localStorage.setItem(channelsStorageKey, JSON.stringify(defaultChannels));
    }

    setChannels(restoredChannels);

    setSelectedChannel((prev) => {
      if (restoredChannels.includes(prev)) return prev;
      return restoredChannels[0] || "雑談";
    });

    setChannelsLoaded(true);
  }, [channelsStorageKey, defaultChannels]);

  useEffect(() => {
    if (!channelsLoaded) return;
    localStorage.setItem(channelsStorageKey, JSON.stringify(channels));
  }, [channels, channelsStorageKey, channelsLoaded]);

  useEffect(() => {
    if (!channelsLoaded) return;

    setIsLoaded(false);

    const parsedPosts = safeParse(localStorage.getItem(postsStorageKey), {});
    const mergedPosts = sanitizePostsByChannel(parsedPosts, channels);

    const normalizedPosts = channels.reduce((acc, channel) => {
      acc[channel] = mergedPosts[channel] || [];
      return acc;
    }, {});

    setChannelPosts(normalizedPosts);
    setIsLoaded(true);

    const persistedSanitized = persistablePostsByChannel(normalizedPosts);
    if (JSON.stringify(parsedPosts) !== JSON.stringify(persistedSanitized)) {
      localStorage.setItem(postsStorageKey, JSON.stringify(persistedSanitized));
    }
  }, [postsStorageKey, channels, channelsLoaded]);

  useEffect(() => {
    if (!group?.id || !isLoaded || !channelsLoaded) return;
    const persisted = persistablePostsByChannel(channelPosts);
    localStorage.setItem(postsStorageKey, JSON.stringify(persisted));
  }, [channelPosts, group?.id, postsStorageKey, isLoaded, channelsLoaded]);

  useEffect(() => {
    return () => {
      if (selectedImage?.url?.startsWith("blob:")) {
        URL.revokeObjectURL(selectedImage.url);
      }
      if (selectedVideo?.url?.startsWith("blob:")) {
        URL.revokeObjectURL(selectedVideo.url);
      }
    };
  }, [selectedImage, selectedVideo]);

  const posts = channelPosts[selectedChannel] || [];

  const formatTimeAgo = (timestamp, fallbackTime = "") => {
    if (!timestamp) return fallbackTime || "";

    const diff = Date.now() - timestamp;
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diff < minute) return "たった今";
    if (diff < hour) return `${Math.floor(diff / minute)}分前`;
    if (diff < day) return `${Math.floor(diff / hour)}時間前`;

    return `${Math.floor(diff / day)}日前`;
  };

  const accountKey = String(currentAccount?.id || "user");
  const currentDisplayName = currentAccount?.name || "名前未設定";
  const currentUserId = `@${currentAccount?.id || "user"}`;
  const currentInitial = currentDisplayName?.charAt(0) || "ユ";
  const groupIconLabel = group?.icon || group?.name?.charAt(0) || "G";

  const handleSelectChannel = (channel) => {
    setSelectedChannel(channel);
    setMenuOpen(false);
    setActionMenuPostId(null);
    setEditingPostId(null);
    setEditingText("");
    setOpenThreadPostId(null);
    setReplyText("");
    setEditingReplyId(null);
    setEditingReplyText("");
    setReplyActionMenuId(null);
  };

  const handleOpenComposer = () => {
    setIsComposerOpen(true);
  };

  const handleCloseComposer = () => {
    if (selectedImage?.url?.startsWith("blob:")) {
      URL.revokeObjectURL(selectedImage.url);
    }
    if (selectedVideo?.url?.startsWith("blob:")) {
      URL.revokeObjectURL(selectedVideo.url);
    }

    setIsComposerOpen(false);
    setPostText("");
    setSelectedImage(null);
    setSelectedVideo(null);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("画像サイズが大きすぎます。5MB以下の画像を選んでください。");
      return;
    }

    if (selectedImage?.url?.startsWith("blob:")) {
      URL.revokeObjectURL(selectedImage.url);
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedImage({
      name: file.name,
      url: objectUrl,
      type: file.type,
    });

    e.target.value = "";
  };

  const handleVideoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("動画サイズが大きすぎます。10MB以下の短い動画を選んでください。");
      return;
    }

    if (selectedVideo?.url?.startsWith("blob:")) {
      URL.revokeObjectURL(selectedVideo.url);
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedVideo({
      name: file.name,
      url: objectUrl,
      type: file.type,
    });

    e.target.value = "";
  };

  const handleDeletePost = (postId) => {
    const confirmed = window.confirm("この投稿を削除しますか？");
    if (!confirmed) return;

    const updated = {
      ...channelPosts,
      [selectedChannel]: (channelPosts[selectedChannel] || []).filter(
        (post) => post.id !== postId
      ),
    };

    setChannelPosts(updated);
    setActionMenuPostId(null);

    if (editingPostId === postId) {
      setEditingPostId(null);
      setEditingText("");
    }

    if (openThreadPostId === postId) {
      setOpenThreadPostId(null);
      setReplyText("");
      setEditingReplyId(null);
      setEditingReplyText("");
      setReplyActionMenuId(null);
    }
  };

  const handleToggleLike = (postId) => {
    let targetPost = null;
    let addedLike = false;

    const updated = {
      ...channelPosts,
      [selectedChannel]: (channelPosts[selectedChannel] || []).map((post) => {
        if (post.id !== postId) return post;

        const likedBy = Array.isArray(post.likedBy)
          ? post.likedBy.map((id) => String(id))
          : [];
        const alreadyLiked = likedBy.includes(accountKey);
        addedLike = !alreadyLiked;

        targetPost = {
          ...post,
          likedBy: alreadyLiked
            ? likedBy.filter((id) => id !== accountKey)
            : [...likedBy, accountKey],
        };

        return targetPost;
      }),
    };

    setChannelPosts(updated);

    if (
      addedLike &&
      targetPost &&
      String(targetPost.accountId) !== String(currentAccount?.id)
    ) {
      setNotifications?.((prev) => [
        {
          id: Date.now(),
          type: "like",
          source: "group",
          accountId: targetPost.accountId,
          accountName: targetPost.name || "アカウント",
          from: currentDisplayName,
          fromUser: currentDisplayName,
          fromUserId: currentAccount?.id,
          postId: targetPost.id,
          link: "/group",
          read: false,
          isRead: false,
          createdAt: Date.now(),
        },
        ...prev,
      ]);
    }
  };

  const handleStartEdit = (post) => {
    setEditingPostId(post.id);
    setEditingText(post.text || "");
    setActionMenuPostId(null);
  };

  const handleCancelEdit = () => {
    setEditingPostId(null);
    setEditingText("");
  };

  const handleSaveEdit = (postId) => {
    if (!editingText.trim()) return;

    const updated = {
      ...channelPosts,
      [selectedChannel]: (channelPosts[selectedChannel] || []).map((post) => {
        if (post.id !== postId) return post;
        return {
          ...post,
          text: editingText.trim(),
        };
      }),
    };

    setChannelPosts(updated);
    setEditingPostId(null);
    setEditingText("");
  };

  const handleCreateChannel = () => {
    const trimmed = newChannelName.trim();
    if (!trimmed) return;

    const duplicate = channels.some(
      (channel) => channel.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      alert("同じ名前のチャンネルがすでにあります。");
      return;
    }

    const updatedChannels = [...channels, trimmed];
    setChannels(updatedChannels);

    setChannelPosts((prev) => ({
      ...prev,
      [trimmed]: [],
    }));

    setSelectedChannel(trimmed);
    setNewChannelName("");
    setIsCreateChannelModalOpen(false);
    setGroupMenuOpen(false);
  };

  const handleDeleteChannel = () => {
    if (!deleteChannelTarget) return;

    if (channels.length <= 1) {
      alert("最後の1つのチャンネルは削除できません。");
      return;
    }

    const confirmed = window.confirm(
      `「#${deleteChannelTarget}」を削除しますか？`
    );
    if (!confirmed) return;

    const updatedChannels = channels.filter(
      (channel) => channel !== deleteChannelTarget
    );

    const updatedPosts = { ...channelPosts };
    delete updatedPosts[deleteChannelTarget];

    setChannels(updatedChannels);
    setChannelPosts(updatedPosts);

    if (selectedChannel === deleteChannelTarget) {
      setSelectedChannel(updatedChannels[0] || "雑談");
    }

    setDeleteChannelTarget("");
    setIsDeleteChannelModalOpen(false);
    setGroupMenuOpen(false);
  };

  const moveChannel = (index, direction) => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= channels.length) return;

    const updated = [...channels];
    const [movedItem] = updated.splice(index, 1);
    updated.splice(newIndex, 0, movedItem);
    setChannels(updated);
  };

  const handleSubmitReply = (postId) => {
    if (!replyText.trim()) return;

    let targetPost = null;

    const newReply = {
      id: Date.now(),
      name: currentDisplayName,
      userId: currentUserId,
      text: replyText.trim(),
      timestamp: Date.now(),
    };

    const updated = {
      ...channelPosts,
      [selectedChannel]: (channelPosts[selectedChannel] || []).map((post) => {
        if (post.id !== postId) return post;

        targetPost = post;

        return {
          ...post,
          replies: [...(post.replies || []), newReply],
        };
      }),
    };

    setChannelPosts(updated);

    if (
      targetPost &&
      String(targetPost.accountId) !== String(currentAccount?.id)
    ) {
      setNotifications?.((prev) => [
        {
          id: Date.now() + 1,
          type: "group_reply",
          source: "group",
          accountId: targetPost.accountId,
          accountName: targetPost.name || "アカウント",
          from: currentDisplayName,
          fromUser: currentDisplayName,
          fromUserId: currentAccount?.id,
          postId: targetPost.id,
          link: "/group",
          isRead: false,
          read: false,
          createdAt: Date.now(),
        },
        ...prev,
      ]);
    }

    setReplyText("");
  };

  const handleStartReplyEdit = (reply) => {
    setEditingReplyId(reply.id);
    setEditingReplyText(reply.text || "");
    setReplyActionMenuId(null);
  };

  const handleCancelReplyEdit = () => {
    setEditingReplyId(null);
    setEditingReplyText("");
  };

  const handleSaveReplyEdit = (postId, replyId) => {
    if (!editingReplyText.trim()) return;

    const updated = {
      ...channelPosts,
      [selectedChannel]: (channelPosts[selectedChannel] || []).map((post) => {
        if (post.id !== postId) return post;

        return {
          ...post,
          replies: (post.replies || []).map((reply) => {
            if (reply.id !== replyId) return reply;
            return {
              ...reply,
              text: editingReplyText.trim(),
            };
          }),
        };
      }),
    };

    setChannelPosts(updated);
    setEditingReplyId(null);
    setEditingReplyText("");
  };

  const handleDeleteReply = (postId, replyId) => {
    const confirmed = window.confirm("この返信を削除しますか？");
    if (!confirmed) return;

    const updated = {
      ...channelPosts,
      [selectedChannel]: (channelPosts[selectedChannel] || []).map((post) => {
        if (post.id !== postId) return post;

        return {
          ...post,
          replies: (post.replies || []).filter((reply) => reply.id !== replyId),
        };
      }),
    };

    setChannelPosts(updated);

    if (editingReplyId === replyId) {
      setEditingReplyId(null);
      setEditingReplyText("");
    }

    if (replyActionMenuId === replyId) {
      setReplyActionMenuId(null);
    }
  };

  const handleSubmitPost = () => {
    if (!postText.trim() && !selectedImage && !selectedVideo) return;

    const newPost = sanitizePost({
      id: Date.now(),
      name: currentDisplayName,
      userId: currentUserId,
      accountId: currentAccount?.id,
      time: "",
      timestamp: Date.now(),
      text: postText.trim(),
      hasImage: !!selectedImage,
      hasVideo: !!selectedVideo,
      imageName: selectedImage?.name || "",
      imageUrl: selectedImage?.url || "",
      videoName: selectedVideo?.name || "",
      videoUrl: selectedVideo?.url || "",
      likedBy: [],
      replies: [],
      imageUnavailable: false,
      videoUnavailable: false,
    });

    setChannelPosts((prev) => ({
      ...prev,
      [selectedChannel]: [newPost, ...(prev[selectedChannel] || [])],
    }));

    setPostText("");
    setSelectedImage(null);
    setSelectedVideo(null);
    setIsComposerOpen(false);

    alert(
      "画像・動画は今はこの表示中だけプレビューされます。容量対策のため、本体は保存していません。"
    );
  };

  const handleSaveGroupEdit = () => {
    const trimmedName = editGroupName.trim();
    const trimmedDescription = editGroupDescription.trim();
    const trimmedIcon = editGroupIcon.trim();

    if (!trimmedName) return;

    const updatedGroup = {
      ...group,
      name: trimmedName,
      description: trimmedDescription,
      icon: trimmedIcon || trimmedName.charAt(0) || "G",
      isPrivate: Boolean(editGroupIsPrivate),
    };

    onUpdateGroup?.(updatedGroup);
    setIsEditGroupModalOpen(false);
    setGroupMenuOpen(false);
  };

  if (isComposerOpen) {
    return (
      <div className="group-composer-page openlike-composer-page">
        <header className="group-composer-header openlike-composer-header">
  <button
    className="openlike-back-btn"
    type="button"
    aria-label="戻る"
    onClick={handleCloseComposer}
  >
    ←
  </button>

  <h1 className="group-composer-title">シグナル発信</h1>

  <button
    type="button"
    className="openlike-submit-btn"
    onClick={handleSubmitPost}
    disabled={!postText.trim() && !selectedImage && !selectedVideo}
  >
    投稿
  </button>
</header>

        <main className="group-composer-main openlike-composer-main">
          <div className="openlike-composer-card">
            <div className="openlike-destination">
              <p className="openlike-destination-label">投稿先</p>
              <p className="openlike-destination-value">
                {group?.name || "グループ名"} / #{selectedChannel}
              </p>
            </div>

            <div className="group-composer-user openlike-user">
              <div className="group-signal-icon">{currentInitial}</div>
              <div className="group-composer-user-meta">
                <span className="group-signal-name">{currentDisplayName}</span>
                <span className="group-signal-id">{currentUserId}</span>
              </div>
            </div>

            <div className="openlike-textarea-wrap">
              <textarea
                className="openlike-composer-textarea"
                placeholder="あなたの声を聞かせて"
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                maxLength={500}
              />
              <div className="openlike-char-count">{postText.length}/500</div>
            </div>

            <div className="openlike-section">
              <p className="openlike-section-title">メディア</p>

              <div className="openlike-media-actions">
                <label className="openlike-media-btn">
                  画像を選択
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    hidden
                  />
                </label>

                <label className="openlike-media-btn">
                  動画を選択
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoChange}
                    hidden
                  />
                </label>
              </div>

              {(selectedImage || selectedVideo) && (
                <div className="openlike-selected-files">
                  {selectedImage && (
                    <div className="openlike-preview-block">
                      <p className="openlike-selected-file">
                        画像: {selectedImage.name}
                      </p>
                      <img
                        src={selectedImage.url}
                        alt={selectedImage.name}
                        className="openlike-preview-image"
                      />
                    </div>
                  )}

                  {selectedVideo && (
                    <div className="openlike-preview-block">
                      <p className="openlike-selected-file">
                        動画: {selectedVideo.name}
                      </p>
                      <video
                        src={selectedVideo.url}
                        controls
                        className="openlike-preview-video"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="group-detail-page">
      <header className="group-detail-header">
        <button
          className="group-header-btn"
          type="button"
          aria-label="戻る"
          onClick={onBack}
        >
          ←
        </button>

        <div className="group-detail-title-wrap">
          <div className="group-detail-icon">{groupIconLabel}</div>
          <div className="group-detail-title-text">
            <h2>
              {group?.name || "グループ名"}
              {group?.isPrivate && (
                <span className="group-private-badge">🔒</span>
              )}
            </h2>
            {group?.description ? (
              <p className="group-detail-description">{group.description}</p>
            ) : null}
            {group?.isPrivate && (
              <p className="group-private-note">
                招待された人だけが参加できる非公開グループです
              </p>
            )}
          </div>
        </div>

        <div className="group-detail-menu-wrap" ref={groupMenuRef}>
          <button
            className="group-header-btn"
            type="button"
            aria-label="メニュー"
            onClick={() => setGroupMenuOpen((prev) => !prev)}
          >
            ⋯
          </button>

          {groupMenuOpen && (
            <div className="group-detail-menu">
              <button
                type="button"
                className="group-detail-menu-item"
                onClick={() => {
                  setIsEditGroupModalOpen(true);
                  setGroupMenuOpen(false);
                }}
              >
                グループ情報編集
              </button>

              <button
                type="button"
                className="group-detail-menu-item"
                onClick={() => {
                  setIsCreateChannelModalOpen(true);
                  setGroupMenuOpen(false);
                }}
              >
                チャンネル作成
              </button>

              <button
                type="button"
                className="group-detail-menu-item"
                onClick={() => {
                  setIsSortChannelModalOpen(true);
                  setGroupMenuOpen(false);
                }}
              >
                チャンネル並べ替え
              </button>

              <button
                type="button"
                className="group-detail-menu-item danger"
                onClick={() => {
                  setIsDeleteChannelModalOpen(true);
                  setDeleteChannelTarget(selectedChannel);
                  setGroupMenuOpen(false);
                }}
              >
                チャンネル削除
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="group-channel-bar">
        <div className="group-channel-selector">
          <button
            className="group-channel-button"
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <span># {selectedChannel}</span>
            <span className={`group-channel-arrow ${menuOpen ? "open" : ""}`}>
              ▾
            </span>
          </button>

          {menuOpen && (
            <div className="group-channel-menu">
              {channels.map((channel) => (
                <button
                  key={channel}
                  className={`group-channel-menu-item ${
                    selectedChannel === channel ? "active" : ""
                  }`}
                  type="button"
                  onClick={() => handleSelectChannel(channel)}
                >
                  <span className="group-channel-hash">#</span>
                  <span>{channel}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <main className="group-detail-main">
        {posts.length > 0 ? (
          posts.map((post) => {
            const likedBy = Array.isArray(post.likedBy)
              ? post.likedBy.map((id) => String(id))
              : [];
            const isLikedByCurrentAccount = likedBy.includes(accountKey);

            return (
              <div className="group-signal-card" key={post.id}>
                <div className="group-signal-header">
                  <div className="group-signal-user">
                    <div className="group-signal-icon">
                      {post.name?.charAt(0) || "ア"}
                    </div>
                    <div className="group-signal-meta">
                      <span className="group-signal-name">{post.name}</span>
                      <span className="group-signal-id">{post.userId}</span>
                    </div>
                  </div>

                  <div
                    className="group-post-actions"
                    ref={actionMenuPostId === post.id ? actionMenuRef : null}
                  >
                    <span className="group-signal-time">
                      {formatTimeAgo(post.timestamp, post.time)}
                    </span>

                    <button
                      type="button"
                      className="group-post-menu-btn"
                      onClick={() =>
                        setActionMenuPostId((prev) =>
                          prev === post.id ? null : post.id
                        )
                      }
                    >
                      ⋯
                    </button>

                    {actionMenuPostId === post.id && (
                      <div className="group-post-menu">
                        <button
                          type="button"
                          className="group-post-menu-item"
                          onClick={() => handleStartEdit(post)}
                        >
                          編集
                        </button>
                        <button
                          type="button"
                          className="group-post-menu-item danger"
                          onClick={() => handleDeletePost(post.id)}
                        >
                          削除
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {editingPostId === post.id ? (
                  <div className="group-edit-area">
                    <textarea
                      className="group-edit-textarea"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                    />

                    <div className="group-edit-actions">
                      <button
                        type="button"
                        className="group-edit-cancel"
                        onClick={handleCancelEdit}
                      >
                        キャンセル
                      </button>
                      <button
                        type="button"
                        className="group-edit-save"
                        onClick={() => handleSaveEdit(post.id)}
                      >
                        保存
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="group-signal-body">{post.text}</div>
                )}

                <div className="group-reaction-row">
                  <button
                    type="button"
                    className={`group-like-btn ${
                      isLikedByCurrentAccount ? "liked" : ""
                    }`}
                    onClick={() => handleToggleLike(post.id)}
                  >
                    {isLikedByCurrentAccount ? "♥" : "♡"} {likedBy.length}
                  </button>

                  <button
                    type="button"
                    className="group-reply-btn"
                    onClick={() =>
                      setOpenThreadPostId((prev) =>
                        prev === post.id ? null : post.id
                      )
                    }
                  >
                    返信 {post.replies?.length || 0}
                  </button>
                </div>

                {openThreadPostId === post.id && (
                  <div className="group-thread-box">
                    <div className="group-thread-list">
                      {post.replies && post.replies.length > 0 ? (
                        post.replies.map((reply) => (
                          <div className="group-thread-reply" key={reply.id}>
                            <div className="group-thread-reply-header">
                              <div className="group-thread-reply-meta-left">
                                <span className="group-thread-reply-name">
                                  {reply.name}
                                </span>
                                <span className="group-thread-reply-id">
                                  {reply.userId}
                                </span>
                              </div>

                              <div
                                className="group-thread-reply-meta-right"
                                ref={
                                  replyActionMenuId === reply.id
                                    ? replyMenuRef
                                    : null
                                }
                              >
                                <span className="group-thread-reply-time">
                                  {formatTimeAgo(reply.timestamp)}
                                </span>

                                <button
                                  type="button"
                                  className="group-post-menu-btn"
                                  onClick={() =>
                                    setReplyActionMenuId((prev) =>
                                      prev === reply.id ? null : reply.id
                                    )
                                  }
                                >
                                  ⋯
                                </button>

                                {replyActionMenuId === reply.id && (
                                  <div className="group-post-menu">
                                    <button
                                      type="button"
                                      className="group-post-menu-item"
                                      onClick={() => handleStartReplyEdit(reply)}
                                    >
                                      編集
                                    </button>
                                    <button
                                      type="button"
                                      className="group-post-menu-item danger"
                                      onClick={() =>
                                        handleDeleteReply(post.id, reply.id)
                                      }
                                    >
                                      削除
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {editingReplyId === reply.id ? (
                              <div className="group-reply-edit-area">
                                <textarea
                                  className="group-edit-textarea"
                                  value={editingReplyText}
                                  onChange={(e) =>
                                    setEditingReplyText(e.target.value)
                                  }
                                />
                                <div className="group-edit-actions">
                                  <button
                                    type="button"
                                    className="group-edit-cancel"
                                    onClick={handleCancelReplyEdit}
                                  >
                                    キャンセル
                                  </button>
                                  <button
                                    type="button"
                                    className="group-edit-save"
                                    onClick={() =>
                                      handleSaveReplyEdit(post.id, reply.id)
                                    }
                                  >
                                    保存
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="group-thread-reply-body">
                                {reply.text}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="group-thread-empty">まだ返信はありません</p>
                      )}
                    </div>

                    <div className="group-thread-input-row">
                      <textarea
                        className="group-thread-textarea"
                        placeholder="返信を入力"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                      />
                      <button
                        type="button"
                        className="group-thread-submit"
                        onClick={() => handleSubmitReply(post.id)}
                      >
                        返信する
                      </button>
                    </div>
                  </div>
                )}

                {(post.imageUrl ||
                  post.videoUrl ||
                  post.imageUnavailable ||
                  post.videoUnavailable) && (
                  <div className="group-signal-media">
                    {post.imageUrl ? (
                      <div className="group-signal-media-box media-preview-box">
                        <img
                          src={post.imageUrl}
                          alt={post.imageName || "投稿画像"}
                          className="group-post-image"
                        />
                      </div>
                    ) : post.imageUnavailable ? (
                      <div className="group-signal-media-box media-preview-box">
                        <div className="group-media-missing">
                          <div>画像</div>
                          <small>再読み込み後は表示されません</small>
                        </div>
                      </div>
                    ) : null}

                    {post.videoUrl ? (
                      <div className="group-signal-media-box media-preview-box">
                        <video
                          src={post.videoUrl}
                          controls
                          className="group-post-video"
                        />
                      </div>
                    ) : post.videoUnavailable ? (
                      <div className="group-signal-media-box media-preview-box">
                        <div className="group-media-missing">
                          <div>動画</div>
                          <small>再読み込み後は表示されません</small>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="group-empty-posts">
            <p>このチャンネルにはまだ投稿がありません</p>
          </div>
        )}
      </main>

      <button
        className="group-post-fab"
        type="button"
        aria-label="投稿"
        onClick={handleOpenComposer}
      >
        ＋
      </button>

      {isEditGroupModalOpen && (
        <div
          className="group-invite-modal-overlay"
          onClick={() => setIsEditGroupModalOpen(false)}
        >
          <div
            className="group-invite-modal channel-create-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="group-invite-modal-header">
              <h3>グループ情報編集</h3>
              <button
                type="button"
                className="group-invite-close-btn"
                onClick={() => setIsEditGroupModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="group-invite-modal-body">
              <div className="group-create-form">
                <label className="group-create-label">
                  グループ名
                  <input
                    type="text"
                    className="group-create-input"
                    value={editGroupName}
                    onChange={(e) => setEditGroupName(e.target.value)}
                    maxLength={40}
                  />
                </label>

                <label className="group-create-label">
                  グループアイコン（1〜2文字推奨）
                  <input
                    type="text"
                    className="group-create-input"
                    value={editGroupIcon}
                    onChange={(e) => setEditGroupIcon(e.target.value)}
                    maxLength={2}
                  />
                </label>

                <label className="group-create-label">
                  グループ説明
                  <textarea
                    className="group-create-textarea"
                    value={editGroupDescription}
                    onChange={(e) => setEditGroupDescription(e.target.value)}
                    rows={4}
                    maxLength={120}
                  />
                </label>

                <div className="group-privacy-box">
                  <p className="group-create-label">公開設定</p>

                  <div className="group-privacy-toggle">
                    <button
                      type="button"
                      className={`group-privacy-btn ${
                        !editGroupIsPrivate ? "active" : ""
                      }`}
                      onClick={() => setEditGroupIsPrivate(false)}
                    >
                      公開
                    </button>

                    <button
                      type="button"
                      className={`group-privacy-btn ${
                        editGroupIsPrivate ? "active" : ""
                      }`}
                      onClick={() => setEditGroupIsPrivate(true)}
                    >
                      非公開 🔒
                    </button>
                  </div>

                  <p className="group-privacy-note">
                    非公開グループは検索に表示されず、招待された人だけが参加できます。
                  </p>
                </div>
              </div>

              <div className="group-leave-actions">
                <button
                  type="button"
                  className="group-invite-decline"
                  onClick={() => setIsEditGroupModalOpen(false)}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  className="group-invite-accept"
                  onClick={handleSaveGroupEdit}
                  disabled={!editGroupName.trim()}
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCreateChannelModalOpen && (
        <div
          className="group-invite-modal-overlay"
          onClick={() => {
            setIsCreateChannelModalOpen(false);
            setNewChannelName("");
          }}
        >
          <div
            className="group-invite-modal channel-create-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="group-invite-modal-header">
              <h3>チャンネル作成</h3>
              <button
                type="button"
                className="group-invite-close-btn"
                onClick={() => {
                  setIsCreateChannelModalOpen(false);
                  setNewChannelName("");
                }}
              >
                ×
              </button>
            </div>

            <div className="group-invite-modal-body">
              <div className="group-channel-create-box">
                <label className="group-channel-create-label">
                  チャンネル名
                </label>
                <input
                  type="text"
                  className="group-channel-create-input"
                  placeholder="例：おしらせ / 雑談 / 作業部屋"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  maxLength={30}
                />
                <p className="group-channel-create-help">
                  作成したチャンネルはこのグループ内で使えます。
                </p>
              </div>

              <div className="group-leave-actions">
                <button
                  type="button"
                  className="group-invite-decline"
                  onClick={() => {
                    setIsCreateChannelModalOpen(false);
                    setNewChannelName("");
                  }}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  className="group-invite-accept"
                  onClick={handleCreateChannel}
                  disabled={!newChannelName.trim()}
                >
                  作成
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isDeleteChannelModalOpen && (
        <div
          className="group-invite-modal-overlay"
          onClick={() => {
            setIsDeleteChannelModalOpen(false);
            setDeleteChannelTarget("");
          }}
        >
          <div
            className="group-invite-modal channel-create-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="group-invite-modal-header">
              <h3>チャンネル削除</h3>
              <button
                type="button"
                className="group-invite-close-btn"
                onClick={() => {
                  setIsDeleteChannelModalOpen(false);
                  setDeleteChannelTarget("");
                }}
              >
                ×
              </button>
            </div>

            <div className="group-invite-modal-body">
              <div className="group-channel-delete-box">
                <p className="group-channel-delete-label">削除するチャンネル</p>

                <div className="group-channel-delete-list">
                  {channels.map((channel) => (
                    <button
                      key={channel}
                      type="button"
                      className={`group-channel-delete-item ${
                        deleteChannelTarget === channel ? "active" : ""
                      }`}
                      onClick={() => setDeleteChannelTarget(channel)}
                    >
                      #{channel}
                    </button>
                  ))}
                </div>

                <p className="group-channel-delete-help">
                  ※ このチャンネル内の投稿も一緒に削除されます。
                </p>
              </div>

              <div className="group-leave-actions">
                <button
                  type="button"
                  className="group-invite-decline"
                  onClick={() => {
                    setIsDeleteChannelModalOpen(false);
                    setDeleteChannelTarget("");
                  }}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  className="group-leave-confirm"
                  onClick={handleDeleteChannel}
                  disabled={!deleteChannelTarget || channels.length <= 1}
                >
                  削除する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isSortChannelModalOpen && (
        <div
          className="group-invite-modal-overlay"
          onClick={() => setIsSortChannelModalOpen(false)}
        >
          <div
            className="group-invite-modal channel-create-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="group-invite-modal-header">
              <h3>チャンネル並べ替え</h3>
              <button
                type="button"
                className="group-invite-close-btn"
                onClick={() => setIsSortChannelModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="group-invite-modal-body">
              {channels.map((channel, index) => (
                <div className="group-sort-card" key={channel}>
                  <div className="group-invite-info">
                    <div className="group-invite-icon">#</div>
                    <div className="group-invite-text">
                      <h4>{channel}</h4>
                      <p>{index + 1}番目</p>
                    </div>
                  </div>

                  <div className="group-sort-actions">
                    <button
                      type="button"
                      className="group-sort-btn"
                      onClick={() => moveChannel(index, "up")}
                      disabled={index === 0}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="group-sort-btn"
                      onClick={() => moveChannel(index, "down")}
                      disabled={index === channels.length - 1}
                    >
                      ↓
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GroupPage;