import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./FriendAdd.css";

function safeParse(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function sanitizeFriends(list) {
  return (Array.isArray(list) ? list : [])
    .filter(Boolean)
    .filter(
      (friend) =>
        !friend?.isDemo &&
        !friend?.isSample &&
        !friend?.sample &&
        !friend?.demo
    )
    .map((friend) => ({
      ...friend,
      id: String(friend.id),
      name: friend.name ?? "友だち",
      handle: friend.handle ?? friend.userId ?? `@${friend.id}`,
      avatar: friend.avatar ?? friend.name?.charAt(0) ?? "友",
      avatarImage:
        typeof friend.avatarImage === "string" &&
        friend.avatarImage.startsWith("data:")
          ? null
          : (friend.avatarImage ?? null),
    }));
}

function sanitizeDirectory(list) {
  return (Array.isArray(list) ? list : [])
    .filter(Boolean)
    .map((friend) => ({
      ...friend,
      id: String(friend.id),
      name: friend.name ?? "ユーザー",
      handle: friend.handle ?? friend.userId ?? `@${friend.id}`,
      avatar: friend.avatar ?? friend.name?.charAt(0) ?? "友",
      avatarImage:
        typeof friend.avatarImage === "string" &&
        friend.avatarImage.startsWith("data:")
          ? null
          : (friend.avatarImage ?? null),
    }));
}

function addUniqueUser(map, user) {
  if (!user?.id && user?.id !== 0) return;

  const id = String(user.id);
  if (map.has(id)) return;

  map.set(id, {
    id,
    name: user.name ?? user.author ?? user.userName ?? "ユーザー",
    handle:
      user.handle ??
      user.userId ??
      (user.accountId ? `@${user.accountId}` : `@${id}`),
    avatar: user.avatar ?? user.name?.charAt(0) ?? "友",
    avatarImage:
      typeof user.avatarImage === "string" &&
      user.avatarImage.startsWith("data:")
        ? null
        : typeof user.profileImage === "string" &&
          user.profileImage.startsWith("data:")
        ? null
        : user.avatarImage ?? user.profileImage ?? null,
  });
}

function buildCandidateDirectory() {
  const map = new Map();

  const storedDirectory = safeParse(
    localStorage.getItem("closedFriendDirectory"),
    []
  );
  sanitizeDirectory(storedDirectory).forEach((user) => addUniqueUser(map, user));

  const accounts = safeParse(localStorage.getItem("accounts"), []);
  sanitizeDirectory(accounts).forEach((user) => addUniqueUser(map, user));

  const openGroupAccounts = safeParse(
    localStorage.getItem("openGroupAccounts"),
    []
  );
  sanitizeDirectory(openGroupAccounts).forEach((user) =>
    addUniqueUser(map, user)
  );

  const openPosts = safeParse(localStorage.getItem("openPosts"), {});
  Object.values(openPosts)
    .flat()
    .forEach((post) => {
      addUniqueUser(map, {
        id: post?.accountId,
        name: post?.author ?? post?.userName ?? post?.name,
        handle: post?.handle ?? post?.userId,
        avatarImage: post?.avatarImage ?? post?.profileImage ?? null,
      });

      if (post?.originalPost) {
        addUniqueUser(map, {
          id: post.originalPost?.accountId,
          name:
            post.originalPost?.author ??
            post.originalPost?.userName ??
            post.originalPost?.name,
          handle: post.originalPost?.handle ?? post.originalPost?.userId,
          avatarImage:
            post.originalPost?.avatarImage ??
            post.originalPost?.profileImage ??
            null,
        });
      }
    });

  const openR18Posts = safeParse(localStorage.getItem("openR18Posts"), {});
  Object.values(openR18Posts)
    .flat()
    .forEach((post) => {
      addUniqueUser(map, {
        id: post?.accountId,
        name: post?.author ?? post?.userName ?? post?.name,
        handle: post?.handle ?? post?.userId,
        avatarImage: post?.avatarImage ?? post?.profileImage ?? null,
      });

      if (post?.originalPost) {
        addUniqueUser(map, {
          id: post.originalPost?.accountId,
          name:
            post.originalPost?.author ??
            post.originalPost?.userName ??
            post.originalPost?.name,
          handle: post.originalPost?.handle ?? post.originalPost?.userId,
          avatarImage:
            post.originalPost?.avatarImage ??
            post.originalPost?.profileImage ??
            null,
        });
      }
    });

  const currentClosed = safeParse(localStorage.getItem("closedSharedAccount"), null);
  const currentPersonal = safeParse(localStorage.getItem("personalAccount"), null);
  const currentId =
    currentClosed?.id != null
      ? String(currentClosed.id)
      : currentPersonal?.id != null
      ? String(currentPersonal.id)
      : null;

  const result = Array.from(map.values());

  return sanitizeDirectory(
    currentId
      ? result.filter((user) => String(user.id) !== currentId)
      : result
  );
}

function FriendAdd() {
  const navigate = useNavigate();

  const [searchText, setSearchText] = useState("");
  const [idText, setIdText] = useState("");
  const [closedFriends, setClosedFriends] = useState([]);

  const [candidateDirectory, setCandidateDirectory] = useState(() =>
    buildCandidateDirectory()
  );

  useEffect(() => {
    const stored = safeParse(localStorage.getItem("closedFriends"), []);
    const sanitized = sanitizeFriends(stored);
    setClosedFriends(sanitized);

    if (JSON.stringify(stored) !== JSON.stringify(sanitized)) {
      localStorage.setItem("closedFriends", JSON.stringify(sanitized));
    }

    const nextDirectory = buildCandidateDirectory();
    setCandidateDirectory(nextDirectory);

    localStorage.setItem(
      "closedFriendDirectory",
      JSON.stringify(nextDirectory)
    );
  }, []);

  const filteredCandidates = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return candidateDirectory.filter((friend) => {
      const alreadyAdded = closedFriends.some(
        (item) => String(item.id) === String(friend.id)
      );
      if (alreadyAdded) return false;

      if (!keyword) return true;

      return (
        friend.name.toLowerCase().includes(keyword) ||
        String(friend.id).toLowerCase().includes(keyword) ||
        String(friend.handle || "").toLowerCase().includes(keyword)
      );
    });
  }, [searchText, candidateDirectory, closedFriends]);

  const saveFriends = (updatedFriends) => {
    const sanitized = sanitizeFriends(updatedFriends);
    setClosedFriends(sanitized);
    localStorage.setItem("closedFriends", JSON.stringify(sanitized));
  };

  const addFriendToClosed = (friend) => {
    const current = sanitizeFriends(
      safeParse(localStorage.getItem("closedFriends"), [])
    );

    const exists = current.some(
      (item) => String(item.id) === String(friend.id)
    );
    if (exists) {
      alert("この友だちはすでに追加されています");
      return;
    }

    const sanitizedFriend = {
      ...friend,
      id: String(friend.id),
      handle: friend.handle ?? friend.userId ?? `@${friend.id}`,
      avatar: friend.avatar ?? friend.name?.charAt(0) ?? "友",
      avatarImage:
        typeof friend.avatarImage === "string" &&
        friend.avatarImage.startsWith("data:")
          ? null
          : (friend.avatarImage ?? null),
    };

    const updated = [...current, sanitizedFriend];
    saveFriends(updated);

    setIdText("");
    setSearchText("");

    alert(`${sanitizedFriend.name} を友だちに追加しました`);
    navigate("/closed");
  };

  const handleAddCandidate = (friend) => {
    addFriendToClosed(friend);
  };

  const handleAddById = () => {
    const trimmedId = idText.trim();
    if (!trimmedId) {
      alert("IDを入力してください");
      return;
    }

    const found = candidateDirectory.find(
      (friend) => String(friend.id) === String(trimmedId)
    );

    if (!found) {
      alert("そのIDのユーザーは見つかりませんでした");
      return;
    }

    addFriendToClosed(found);
  };

  return (
    <div className="friend-add-page">
      <div className="friend-add-topbar">
        <button
          type="button"
          className="friend-add-back"
          onClick={() => navigate("/closed")}
        >
          ←
        </button>

        <h2 className="friend-add-title">友だち追加</h2>
      </div>

      <section className="friend-add-section">
        <div className="friend-add-section-head">
          <h3>検索して追加</h3>
          <span>名前 / ID / @IDで検索</span>
        </div>

        <input
          type="text"
          className="friend-add-search"
          placeholder="名前またはIDを入力"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />

        <div className="friend-add-list">
          {filteredCandidates.length === 0 ? (
            <p className="friend-add-empty">
              追加できる候補がありません。ID検索や招待も試してみてね。
            </p>
          ) : (
            filteredCandidates.map((friend) => (
              <div key={friend.id} className="friend-add-item">
                <div className="friend-add-item-left">
                  <div className="friend-add-avatar">
                    {friend.avatarImage ? (
                      <img
                        src={friend.avatarImage}
                        alt={friend.name}
                        className="friend-add-avatar-image"
                      />
                    ) : (
                      <span>{friend.avatar}</span>
                    )}
                  </div>

                  <div className="friend-add-meta">
                    <strong>{friend.name}</strong>
                    <span>
                      {friend.handle
                        ? `@${String(friend.handle).replace(/^@/, "")}`
                        : `ID: ${friend.id}`}
                    </span>
                    <span>ID: {friend.id}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="friend-add-action"
                  onClick={() => handleAddCandidate(friend)}
                >
                  追加
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="friend-add-section">
        <div className="friend-add-section-head center">
          <h3>IDで追加</h3>
        </div>

        <div className="friend-add-id-row">
          <input
            type="text"
            className="friend-add-id-input"
            placeholder="IDを入力"
            value={idText}
            onChange={(e) => setIdText(e.target.value)}
          />

          <button
            type="button"
            className="friend-add-id-button"
            onClick={handleAddById}
          >
            追加
          </button>
        </div>
      </section>

      <section className="friend-add-section">
        <div className="friend-add-section-head center">
          <h3>その他の追加方法</h3>
        </div>

        <button
          type="button"
          className="friend-add-method"
          onClick={() => alert("QRコード機能はこれから実装")}
        >
          QRコード
        </button>

        <button
          type="button"
          className="friend-add-method"
          onClick={() => alert("招待URL機能はこれから実装")}
        >
          招待URL
        </button>
      </section>
    </div>
  );
}

export default FriendAdd;