import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useState, useEffect, useMemo } from "react";

import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

import Personal from "./pages/Personal";
import Layers from "./pages/Layers";
import Open from "./pages/Open";
import Group from "./pages/Group";
import Closed from "./pages/Closed";
import Chat from "./pages/Chat";
import Posts from "./pages/Posts";
import PostDetail from "./pages/PostDetail";
import Notifications from "./pages/Notifications";

import Header from "./components/Header";
import BottomNav from "./components/BottomNav";

import "./App.css";

import Memo from "./pages/Memo";
import Calendar from "./pages/Calendar";
import Activity from "./pages/Activity";
import Profile from "./pages/Profile";
import ProfileEdit from "./pages/ProfileEdit";
import FollowPage from "./pages/FollowPage";
import OtherProfile from "./pages/OtherProfile";
import SignalThread from "./pages/SignalThread";
import OpenDM from "./pages/OpenDM";
import OpenDMChat from "./pages/OpenDMChat";
import OpenDMSettings from "./pages/OpenDMSettings";
import Search from "./pages/Search";
import SearchTag from "./pages/SearchTag";
import QuoteResignal from "./pages/QuoteResignal";

import FriendAdd from "./pages/FriendAdd";
import LinkList from "./pages/LinkList";
import MediaList from "./pages/MediaList";
import FileList from "./pages/FileList";

import OpenR18 from "./pages/OpenR18";
import R18Settings from "./pages/R18Settings";

import "./styles/common.css";

const CURRENT_ACCOUNT_ID_KEY = "currentAccountId";
const CURRENT_OPEN_GROUP_ACCOUNT_ID_KEY = "currentOpenGroupAccountId";

/* =========================
   共通ユーティリティ
========================= */
function safeParse(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function normalizePersonalAccount(account) {
  if (!account) return null;

  return {
    id: String(account.id ?? "personal-main"),
    type: "personal_shared",
    name: account.name || "パーソナル",
    handle: account.handle || "personal",
    avatarImage: account.avatarImage || null,
  };
}

function normalizeOpenGroupAccount(account, index = 0) {
  return {
    id: String(account.id ?? `og-${index + 1}`),
    type: "open_group",
    name: account.name || `アカウント${index + 1}`,
    handle: account.handle || `account${index + 1}`,
    avatarImage: account.avatarImage || null,
  };
}

function buildDefaultPersonalAccount() {
  return {
    id: "personal-main",
    type: "personal_shared",
    name: "あなた",
    handle: "user",
    avatarImage: null,
  };
}

function buildDefaultOpenGroupAccounts(personalAccount) {
  return [
    {
      id: "og-1",
      type: "open_group",
      name: personalAccount?.name || "はのん",
      handle: personalAccount?.handle || "hanon",
      avatarImage: personalAccount?.avatarImage || null,
    },
  ];
}

function getInitialPersonalAccount() {
  const storedPersonal = safeParse(localStorage.getItem("personalAccount"), null);
  if (storedPersonal) return normalizePersonalAccount(storedPersonal);

  const storedClosedShared = safeParse(
    localStorage.getItem("closedSharedAccount"),
    null
  );
  if (storedClosedShared) return normalizePersonalAccount(storedClosedShared);

  const legacyAccounts = safeParse(localStorage.getItem("accounts"), []);
  const legacyPersonal =
    Array.isArray(legacyAccounts) &&
    legacyAccounts.find((acc) => acc?.type === "personal");
  if (legacyPersonal) return normalizePersonalAccount(legacyPersonal);

  const legacyCurrent = safeParse(localStorage.getItem("currentAccount"), null);
  if (legacyCurrent) {
    return normalizePersonalAccount({
      ...legacyCurrent,
      type: "personal_shared",
    });
  }

  return buildDefaultPersonalAccount();
}

function getInitialOpenGroupAccounts(personalAccount) {
  const stored = safeParse(localStorage.getItem("openGroupAccounts"), null);
  if (Array.isArray(stored) && stored.length > 0) {
    return stored.map((acc, index) => normalizeOpenGroupAccount(acc, index));
  }

  const legacyAccounts = safeParse(localStorage.getItem("accounts"), []);
  const legacyOpenGroup = (Array.isArray(legacyAccounts) ? legacyAccounts : [])
    .filter((acc) => acc?.type !== "personal")
    .map((acc, index) => normalizeOpenGroupAccount(acc, index));

  if (legacyOpenGroup.length > 0) return legacyOpenGroup;

  return buildDefaultOpenGroupAccounts(personalAccount);
}

function getInitialCurrentOpenGroupAccount(openGroupAccounts) {
  const storedCurrentId = localStorage.getItem(CURRENT_OPEN_GROUP_ACCOUNT_ID_KEY);

  if (storedCurrentId) {
    const found = openGroupAccounts.find(
      (acc) => String(acc.id) === String(storedCurrentId)
    );
    if (found) return found;
  }

  const legacyStoredCurrent = safeParse(
    localStorage.getItem("currentOpenGroupAccount"),
    null
  );
  if (legacyStoredCurrent?.id) {
    const foundLegacyStored = openGroupAccounts.find(
      (acc) => String(acc.id) === String(legacyStoredCurrent.id)
    );
    if (foundLegacyStored) return foundLegacyStored;
  }

  const legacyCurrent = safeParse(localStorage.getItem("currentAccount"), null);
  if (legacyCurrent?.id) {
    const foundLegacy = openGroupAccounts.find(
      (acc) => String(acc.id) === String(legacyCurrent.id)
    );
    if (foundLegacy) return foundLegacy;
  }

  return openGroupAccounts[0] ?? null;
}

/* =========================
   ① Routerラッパー
========================= */
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

/* =========================
   ② 本体（Routerの内側）
========================= */
function AppContent() {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const location = useLocation();
  const pathname = location.pathname;

  const [hideBottomNavForGroupComposer, setHideBottomNavForGroupComposer] =
    useState(false);
  const [hideBottomNav, setHideBottomNav] = useState(false);

  /* ---------- path flags ---------- */
  const isWelcomePage = pathname === "/";
  const isLoginPage = pathname.startsWith("/login");
  const isSignupPage = pathname.startsWith("/signup");
  const isAuthPage = isWelcomePage || isLoginPage || isSignupPage;

  const isPersonal = pathname.startsWith("/personal");
  const isActivity = pathname.startsWith("/activity");
  const isProfile = pathname.startsWith("/profile");

  const isPostsPage = pathname === "/posts";
  const isPostDetail = pathname.startsWith("/posts/");

  const isOpen = pathname.startsWith("/open");
  const isGroup = pathname.startsWith("/group");
  const isClosed = pathname.startsWith("/closed");
  const isChat = pathname.startsWith("/chat");
  const isFriendAddPage = pathname.startsWith("/friend-add");
  const isNotificationsPage = pathname.startsWith("/notifications");
  const isLayersPage = pathname.startsWith("/layers");
  const isSignalThreadPage = pathname.startsWith("/signal/");
  const isOpenDMPage = pathname.startsWith("/dm");
  const isSearchPage = pathname.startsWith("/search");

  /* ---------- Header / BottomNav visibility ---------- */
  const hideHeader =
  isAuthPage ||
  isActivity ||
  isProfile ||
  isPostsPage ||
  isPostDetail ||
  isOpen ||
  isGroup ||
  isClosed ||
  isChat ||
  isFriendAddPage ||
  isNotificationsPage ||
  isLayersPage ||
  isSignalThreadPage ||
  isOpenDMPage ||
  isSearchPage;

  const shouldHideBottomNav =
    isAuthPage ||
    isPersonal ||
    isActivity ||
    isProfile ||
    isPostsPage ||
    isPostDetail ||
    isClosed ||
    isChat ||
    isFriendAddPage ||
    isNotificationsPage ||
    isLayersPage ||
    isSignalThreadPage ||
    isOpenDMPage ||
    hideBottomNavForGroupComposer ||
    hideBottomNav;

  /* ---------- personal / closed shared account ---------- */
  const [personalAccount, setPersonalAccount] = useState(() =>
    getInitialPersonalAccount()
  );

  useEffect(() => {
    if (!personalAccount) return;
    localStorage.setItem("personalAccount", JSON.stringify(personalAccount));
    localStorage.setItem("closedSharedAccount", JSON.stringify(personalAccount));
  }, [personalAccount]);

  /* ---------- open / group accounts ---------- */
  const [openGroupAccounts, setOpenGroupAccounts] = useState(() =>
    getInitialOpenGroupAccounts(getInitialPersonalAccount())
  );

  useEffect(() => {
    if (!Array.isArray(openGroupAccounts) || openGroupAccounts.length === 0) {
      const fallback = buildDefaultOpenGroupAccounts(personalAccount);
      setOpenGroupAccounts(fallback);
      return;
    }

    localStorage.setItem("openGroupAccounts", JSON.stringify(openGroupAccounts));
  }, [openGroupAccounts, personalAccount]);

  /* ---------- current open / group account ---------- */
  const [currentOpenGroupAccount, setCurrentOpenGroupAccount] = useState(() =>
    getInitialCurrentOpenGroupAccount(
      getInitialOpenGroupAccounts(getInitialPersonalAccount())
    )
  );

  useEffect(() => {
    if (!currentOpenGroupAccount && openGroupAccounts.length > 0) {
      setCurrentOpenGroupAccount(openGroupAccounts[0]);
      return;
    }

    if (currentOpenGroupAccount?.id) {
      localStorage.setItem(
        CURRENT_OPEN_GROUP_ACCOUNT_ID_KEY,
        String(currentOpenGroupAccount.id)
      );
      localStorage.setItem(
        CURRENT_ACCOUNT_ID_KEY,
        String(currentOpenGroupAccount.id)
      );
    }
  }, [currentOpenGroupAccount, openGroupAccounts]);

  useEffect(() => {
    if (!currentOpenGroupAccount || openGroupAccounts.length === 0) return;

    const exists = openGroupAccounts.some(
      (acc) => String(acc.id) === String(currentOpenGroupAccount.id)
    );

    if (!exists) {
      const fallback = openGroupAccounts[0] ?? null;
      setCurrentOpenGroupAccount(fallback);

      if (fallback?.id) {
        localStorage.setItem(
          CURRENT_OPEN_GROUP_ACCOUNT_ID_KEY,
          String(fallback.id)
        );
        localStorage.setItem(CURRENT_ACCOUNT_ID_KEY, String(fallback.id));
      }
    }
  }, [openGroupAccounts, currentOpenGroupAccount]);

  useEffect(() => {
    const syncOpenGroupAccountFromStorage = () => {
      const storedAccounts = safeParse(
        localStorage.getItem("openGroupAccounts"),
        []
      );

      if (!Array.isArray(storedAccounts) || storedAccounts.length === 0) return;

      const currentId = localStorage.getItem(CURRENT_OPEN_GROUP_ACCOUNT_ID_KEY);

      const matched =
        storedAccounts.find((acc) => String(acc.id) === String(currentId)) ||
        storedAccounts[0] ||
        null;

      if (matched) {
        setOpenGroupAccounts(storedAccounts);
        setCurrentOpenGroupAccount(matched);
      }
    };

    window.addEventListener(
      "road3-account-changed",
      syncOpenGroupAccountFromStorage
    );
    window.addEventListener("focus", syncOpenGroupAccountFromStorage);

    return () => {
      window.removeEventListener(
        "road3-account-changed",
        syncOpenGroupAccountFromStorage
      );
      window.removeEventListener("focus", syncOpenGroupAccountFromStorage);
    };
  }, []);

  /* ---------- notifications ---------- */
  const [notifications, setNotifications] = useState(() => {
    return safeParse(localStorage.getItem("notifications"), []);
  });

  useEffect(() => {
    localStorage.setItem("notifications", JSON.stringify(notifications));
  }, [notifications]);

  const [closedNotifications, setClosedNotifications] = useState(() => {
    return safeParse(localStorage.getItem("closedNotifications"), []);
  });

  useEffect(() => {
    localStorage.setItem(
      "closedNotifications",
      JSON.stringify(closedNotifications)
    );
  }, [closedNotifications]);

  const mergedActivityNotifications = useMemo(() => {
    return [...(notifications || []), ...(closedNotifications || [])].sort(
      (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
    );
  }, [notifications, closedNotifications]);

  const setMergedActivityNotifications = (updater) => {
    const currentMerged = [
      ...(notifications || []),
      ...(closedNotifications || []),
    ].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const nextMerged =
      typeof updater === "function" ? updater(currentMerged) : updater || [];

    const personalId = String(personalAccount?.id || "");

    const nextClosed = [];
    const nextNormal = [];

    (nextMerged || []).forEach((item) => {
      const accountId = String(item?.accountId || "");
      if (accountId === personalId) {
        nextClosed.push(item);
      } else {
        nextNormal.push(item);
      }
    });

    setClosedNotifications(nextClosed);
    setNotifications(nextNormal);
  };

  /* ---------- display account by space ---------- */
  const isPersonalLikePage =
    pathname.startsWith("/personal") ||
    pathname.startsWith("/closed") ||
    pathname.startsWith("/chat") ||
    pathname.startsWith("/friend-add");

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

  const displayAccount = isPersonalLikePage
    ? personalAccount
    : isOpenGroupLikePage
    ? currentOpenGroupAccount || personalAccount
    : currentOpenGroupAccount || personalAccount;

  return (
    <>
      {!hideHeader && isLoggedIn && displayAccount && (
       <Header
        spaceName={isPersonalLikePage ? "Personal Space" : "Open Space"}
  currentAccount={displayAccount}
  setCurrentAccount={
    isPersonalLikePage ? setPersonalAccount : setCurrentOpenGroupAccount
  }
  accounts={isPersonalLikePage ? [personalAccount] : openGroupAccounts}
  setAccounts={
    isPersonalLikePage
      ? (updatedAccounts) => {
          const nextPersonal = updatedAccounts?.[0];
          if (!nextPersonal) return;
          setPersonalAccount(nextPersonal);
        }
      : setOpenGroupAccounts
  }
  onCustomizeApps={() => {
    window.dispatchEvent(new CustomEvent("road3-open-customize"));
  }}
  onAddApp={() => {
    window.dispatchEvent(new CustomEvent("road3-open-add-app"));
  }}
  onResetApps={() => {
    window.dispatchEvent(new CustomEvent("road3-reset-apps"));
  }}
  onOpenContact={() => {
    window.dispatchEvent(new CustomEvent("road3-open-contact"));
  }}
  onOpenSettings={() => {
    window.dispatchEvent(new CustomEvent("road3-open-settings"));
  }}
  onLogout={() => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("personalAccount");
    localStorage.removeItem("closedSharedAccount");
    localStorage.removeItem("openGroupAccounts");
    localStorage.removeItem(CURRENT_OPEN_GROUP_ACCOUNT_ID_KEY);
    localStorage.removeItem(CURRENT_ACCOUNT_ID_KEY);

    localStorage.removeItem("currentOpenGroupAccount");
    localStorage.removeItem("currentAccount");
    localStorage.removeItem("accounts");

    window.location.href = "/ROAD3/#/login";
  }}
/>
      )}

      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route path="/posts" element={<Posts />} />
        <Route path="/posts/:postId" element={<PostDetail />} />
        <Route path="/layers" element={<Layers />} />

        <Route
          path="/profile"
          element={isLoggedIn ? <Profile /> : <Navigate to="/login" />}
        />
        <Route
          path="/profile/edit"
          element={isLoggedIn ? <ProfileEdit /> : <Navigate to="/login" />}
        />
        <Route
          path="/profile/follow"
          element={isLoggedIn ? <FollowPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/profile/user/:userId"
          element={isLoggedIn ? <OtherProfile /> : <Navigate to="/login" />}
        />

        <Route
          path="/signal/:id"
          element={isLoggedIn ? <SignalThread /> : <Navigate to="/login" />}
        />

        <Route
          path="/personal"
          element={
            isLoggedIn ? (
              <Personal
                personalAccount={personalAccount}
                setPersonalAccount={setPersonalAccount}
                openGroupAccounts={openGroupAccounts}
                setOpenGroupAccounts={setOpenGroupAccounts}
                currentOpenGroupAccount={currentOpenGroupAccount}
                setCurrentOpenGroupAccount={setCurrentOpenGroupAccount}
                notifications={mergedActivityNotifications}
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/personal/memo"
          element={
            isLoggedIn ? (
              <Memo currentAccount={personalAccount} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/personal/calendar"
          element={isLoggedIn ? <Calendar /> : <Navigate to="/login" />}
        />

        <Route
          path="/activity/signals"
          element={
            isLoggedIn ? (
              <Activity
                accounts={openGroupAccounts}
                currentAccount={currentOpenGroupAccount}
                notifications={notifications}
                setNotifications={setNotifications}
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/activity/saved"
          element={
            isLoggedIn ? (
              <Activity
                accounts={openGroupAccounts}
                currentAccount={currentOpenGroupAccount}
                notifications={notifications}
                setNotifications={setNotifications}
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/activity/notifications"
          element={
            isLoggedIn ? (
              <Activity
                accounts={[personalAccount, ...openGroupAccounts]}
                currentAccount={personalAccount}
                notifications={mergedActivityNotifications}
                setNotifications={setMergedActivityNotifications}
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/activity"
          element={<Navigate to="/activity/notifications" />}
        />

        <Route
          path="/open"
          element={
            isLoggedIn ? (
              <Open
                currentAccount={currentOpenGroupAccount}
                setNotifications={setNotifications}
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/group"
          element={
            isLoggedIn ? (
              <Group
                currentAccount={currentOpenGroupAccount}
                setNotifications={setNotifications}
                setHideBottomNavForComposer={setHideBottomNavForGroupComposer}
                setHideBottomNav={setHideBottomNav}
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/closed"
          element={
            isLoggedIn ? (
              <Closed
                accounts={openGroupAccounts}
                setAccounts={setOpenGroupAccounts}
                currentAccount={personalAccount}
                notifications={notifications}
                closedNotifications={closedNotifications}
                setNotifications={setNotifications}
                setClosedNotifications={setClosedNotifications}
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/chat/:friendId"
          element={
            isLoggedIn ? (
              <Chat
                currentAccount={personalAccount}
                setClosedNotifications={setClosedNotifications}
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/notifications"
          element={
            isLoggedIn ? (
              <Notifications
                notifications={
                  location.state?.from === "/closed"
                    ? closedNotifications
                    : notifications
                }
                setNotifications={
                  location.state?.from === "/closed"
                    ? setClosedNotifications
                    : setNotifications
                }
                currentAccount={
                  location.state?.from === "/closed"
                    ? personalAccount
                    : currentOpenGroupAccount || personalAccount
                }
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route path="/dm" element={<OpenDM />} />

        <Route
          path="/dm/chat/:userId"
          element={isLoggedIn ? <OpenDMChat /> : <Navigate to="/login" />}
        />

        <Route
          path="/dm/settings"
          element={isLoggedIn ? <OpenDMSettings /> : <Navigate to="/login" />}
        />

        <Route
          path="/search"
          element={isLoggedIn ? <Search /> : <Navigate to="/login" />}
        />

        <Route
          path="/search/tag/:tagName"
          element={isLoggedIn ? <SearchTag /> : <Navigate to="/login" />}
        />

        <Route
          path="/quote-resignal"
          element={isLoggedIn ? <QuoteResignal /> : <Navigate to="/login" />}
        />

        <Route
          path="/friend-add"
          element={isLoggedIn ? <FriendAdd /> : <Navigate to="/login" />}
        />

        <Route
          path="/chat/:friendId/links"
          element={isLoggedIn ? <LinkList /> : <Navigate to="/login" />}
        />

        <Route
          path="/chat/:friendId/media"
          element={isLoggedIn ? <MediaList /> : <Navigate to="/login" />}
        />

        <Route
          path="/chat/:friendId/files"
          element={isLoggedIn ? <FileList /> : <Navigate to="/login" />}
        />

        <Route
  path="/open/r18"
  element={isLoggedIn ? <OpenR18 /> : <Navigate to="/login" />}
/>

<Route
  path="/settings/r18"
  element={isLoggedIn ? <R18Settings /> : <Navigate to="/login" />}
/>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      {!shouldHideBottomNav && (
        <BottomNav
          notifications={
            isPersonalLikePage ? mergedActivityNotifications : notifications
          }
          currentAccount={displayAccount}
        />
      )}
    </>
  );
}

export default App;
