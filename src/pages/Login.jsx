import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Auth.css";

const DEV_CODE = "000000"; // ←開発用：固定コード
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

function normalizePersonalAccount(account) {
  if (!account) return null;

  return {
    id: String(account.id ?? "personal-main"),
    type: "personal_shared",
    name: account.name || "あなた",
    handle: account.handle || "user",
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
      name: personalAccount?.name || "あなた",
      handle: personalAccount?.handle || "user",
      avatarImage: personalAccount?.avatarImage || null,
    },
  ];
}

export default function Login() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1:電話番号 2:コード
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const normalizedPhone = useMemo(() => phone.replace(/[^\d]/g, ""), [phone]);

  useEffect(() => {
    setError("");
  }, [phone, code, step]);

  const sendCode = () => {
    if (normalizedPhone.length < 10) {
      setError("電話番号を正しく入力してね");
      return;
    }

    setStep(2);
    console.log("[DEV] Login code is:", DEV_CODE);
  };

  const ensureDefaultAccounts = () => {
    const storedPersonal = safeParse(localStorage.getItem("personalAccount"), null);
    const storedClosedShared = safeParse(
      localStorage.getItem("closedSharedAccount"),
      null
    );
    const storedOpenGroupAccounts = safeParse(
      localStorage.getItem("openGroupAccounts"),
      []
    );

    const personalAccount = normalizePersonalAccount(
      storedPersonal || storedClosedShared || buildDefaultPersonalAccount()
    );

    localStorage.setItem("personalAccount", JSON.stringify(personalAccount));
    localStorage.setItem("closedSharedAccount", JSON.stringify(personalAccount));

    const openGroupAccounts =
      Array.isArray(storedOpenGroupAccounts) && storedOpenGroupAccounts.length > 0
        ? storedOpenGroupAccounts.map((acc, index) =>
            normalizeOpenGroupAccount(acc, index)
          )
        : buildDefaultOpenGroupAccounts(personalAccount);

    localStorage.setItem("openGroupAccounts", JSON.stringify(openGroupAccounts));

    const currentOpenGroupAccountId = localStorage.getItem(
      CURRENT_OPEN_GROUP_ACCOUNT_ID_KEY
    );

    const resolvedOpenGroupAccount =
      openGroupAccounts.find(
        (acc) => String(acc.id) === String(currentOpenGroupAccountId)
      ) || openGroupAccounts[0];

    if (resolvedOpenGroupAccount?.id) {
      localStorage.setItem(
        CURRENT_OPEN_GROUP_ACCOUNT_ID_KEY,
        String(resolvedOpenGroupAccount.id)
      );
      localStorage.setItem(
        CURRENT_ACCOUNT_ID_KEY,
        String(resolvedOpenGroupAccount.id)
      );
    }

    // 旧キーが残っていたら掃除
    localStorage.removeItem("currentAccount");
    localStorage.removeItem("currentOpenGroupAccount");
  };

  const doLogin = () => {
    if (code.trim() !== DEV_CODE) {
      setError(`開発中はコード「${DEV_CODE}」でログインできるよ`);
      return;
    }

    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("lastLoginAt", String(Date.now()));

    ensureDefaultAccounts();
    navigate("/personal");
  };

  const demoLogin = () => {
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("lastLoginAt", String(Date.now()));

    ensureDefaultAccounts();
    navigate("/personal");
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="auth-topcopy">ROAD3はいつでも帰ってこられる場所</p>
        <h1 className="app-logo">ROAD3</h1>

        <p className="auth-comment">おかえりなさい</p>

        {step === 1 && (
          <>
            <label className="auth-label">電話番号</label>
            <input
              className="auth-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="例：09012345678"
              inputMode="tel"
              autoComplete="tel"
            />

            {error && <p className="auth-error">{error}</p>}

            <button className="auth-primary" type="button" onClick={sendCode}>
              認証コードを送る（開発版）
            </button>

            <button className="auth-ghost" type="button" onClick={demoLogin}>
              デモログイン（ワンクリック）
            </button>

            <button
              className="auth-secondary"
              type="button"
              onClick={() => navigate("/")}
            >
              戻る
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <p className="auth-help">
              SMSにメッセージを送信しました（開発版）
              <br />
              ※ 開発中は <b>{DEV_CODE}</b> を入力すると通るよ
            </p>

            <label className="auth-label">認証コード</label>
            <input
              className="auth-input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6桁"
              inputMode="numeric"
              autoComplete="one-time-code"
            />

            {error && <p className="auth-error">{error}</p>}

            <div className="auth-row">
              <button
                className="auth-secondary"
                type="button"
                onClick={() => setStep(1)}
              >
                戻る
              </button>
              <button className="auth-primary" type="button" onClick={doLogin}>
                ログイン
              </button>
            </div>

            <button className="auth-ghost" type="button" onClick={sendCode}>
              コードを再送（開発版）
            </button>
          </>
        )}
      </div>
    </div>
  );
}