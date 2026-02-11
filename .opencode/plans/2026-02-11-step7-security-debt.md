# Step 7 セキュリティ技術的負債修正 実装計画

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Phase 1で発見された11個のセキュリティ技術的負債を修正し、XSS防御、HTTPS強制、セキュリティヘッダー、認証フロー改善を実装する

**Architecture:** フロントエンドのlocalStorage JWT保存を維持しつつ（httpOnly移行はPhase 2で対応）、Caddyでセキュリティヘッダーを設定、バックエンドのエラーメッセージを統一、フロントエンドの脆弱性を修正する

**Tech Stack:** Caddy (リバースプロキシ), React + TypeScript, FastAPI, Zustand

---

## Task 1: Caddy セキュリティヘッダー設定

**Files:**
- Modify: `caddy/Caddyfile`

**Step 1: Caddyfileのバックアップを作成**

```bash
cp caddy/Caddyfile caddy/Caddyfile.backup
```

**Step 2: セキュリティヘッダーを追加したCaddyfileを作成**

```caddy
:80 {
    # Security headers - applied to all responses
    header {
        # Prevent clickjacking
        X-Frame-Options "DENY"
        # Prevent MIME type sniffing
        X-Content-Type-Options "nosniff"
        # XSS Protection (legacy browsers)
        X-XSS-Protection "1; mode=block"
        # Referrer policy
        Referrer-Policy "strict-origin-when-cross-origin"
        # Content Security Policy
        Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self';"
        # Permissions Policy
        Permissions-Policy "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"
        # Remove server identification
        -Server
    }

    # API
    handle /api/* {
        reverse_proxy backend:8000
    }

    # ヘルスチェック
    handle /health {
        reverse_proxy backend:8000
    }

    # フロントエンド（フォールバック）
    handle /* {
        reverse_proxy frontend:5173
    }
}
```

**Step 3: 設定を検証（Docker起動時）**

Run: `make up`
Expected: Caddyがエラーなく起動し、ヘッダーが設定される

**Step 4: ヘッダー確認テスト**

```bash
# ヘッダー確認
curl -I http://localhost/
```

Expected outputに以下が含まれること:
- `x-frame-options: DENY`
- `x-content-type-options: nosniff`
- `content-security-policy: default-src 'self'`
- `referrer-policy: strict-origin-when-cross-origin`

**Step 5: Commit**

```bash
git add caddy/Caddyfile
git commit -m "security: add security headers to Caddyfile

- X-Frame-Options: DENY (clickjacking protection)
- X-Content-Type-Options: nosniff (MIME sniffing protection)
- X-XSS-Protection: 1; mode=block (XSS protection)
- Referrer-Policy: strict-origin-when-cross-origin
- Content-Security-Policy with strict defaults
- Permissions-Policy to disable unused features
- Remove Server header for fingerprinting protection"
```

---

## Task 2: バックエンド ユーザー列挙攻撃対策

**Files:**
- Modify: `backend/app/api/v1/auth.py:140-153`

**Step 1: 登録エラーメッセージを統一**

現在のコード:
```python
# Check for existing email
result = await db.execute(select(User).where(User.email == user_data.email))
if result.scalar_one_or_none() is not None:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Email already registered",
    )

# Check for existing username
result = await db.execute(select(User).where(User.username == user_data.username))
if result.scalar_one_or_none() is not None:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Username already taken",
    )
```

修正後:
```python
# Check for existing email or username - use generic error message
result = await db.execute(select(User).where(User.email == user_data.email))
if result.scalar_one_or_none() is not None:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Registration failed. Email or username may already be in use.",
    )

# Check for existing username
result = await db.execute(select(User).where(User.username == user_data.username))
if result.scalar_one_or_none() is not None:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Registration failed. Email or username may already be in use.",
    )
```

**Step 2: テストを実行してエラーメッセージ変更を確認**

Run: `cd backend && pytest tests/test_auth.py -v -k "test_register"`
Expected: テストがエラーメッセージ変更に対応して更新されていること

**Step 3: テストファイルのエラーメッセージを更新**

File: `backend/tests/test_auth.py`

既存のテストで `"Email already registered"` や `"Username already taken"` を検証している箇所を `"Registration failed"` に含まれるかどうかのチェックに変更。

**Step 4: テストを再実行**

Run: `cd backend && pytest tests/test_auth.py -v`
Expected: All tests pass

**Step 5: Commit**

```bash
git add backend/app/api/v1/auth.py backend/tests/test_auth.py
git commit -m "security: prevent user enumeration attack in registration

Use generic error message for duplicate email/username to prevent
user enumeration attacks. Both errors now return same message."
```

---

## Task 3: TOTP入力欄をパスワードタイプに変更

**Files:**
- Modify: `frontend/src/pages/Login.tsx:122-143`

**Step 1: TOTP入力欄を変更**

現在のコード (line 127):
```typescript
<input
  id="totp"
  type="text"
```

修正後:
```typescript
<input
  id="totp"
  type="password"
```

**Step 2: テストを実行**

Run: `cd frontend && npm test -- src/pages/Login.test.tsx`
Expected: All tests pass

**Step 3: Commit**

```bash
git add frontend/src/pages/Login.tsx
git commit -m "security: hide TOTP code input

Change TOTP input type from 'text' to 'password' to prevent
shoulder surfing attacks."
```

---

## Task 4: パスワードState送信後クリア

**Files:**
- Modify: `frontend/src/pages/Login.tsx:33-52`

**Step 1: handleSubmit関数を修正**

現在のコード:
```typescript
const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault()

  // Clear any previous errors
  clearError()

  // Call login with credentials
  try {
    await login({
      email,
      password,
      totp_code: isTotpRequired ? totpCode || undefined : undefined,
    })

    // Navigate to dashboard on successful login
    navigate('/')
  } catch {
    // Error is handled by auth store
  }
}
```

修正後:
```typescript
const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault()

  // Clear any previous errors
  clearError()

  // Call login with credentials
  try {
    await login({
      email,
      password,
      totp_code: isTotpRequired ? totpCode || undefined : undefined,
    })

    // Clear sensitive form data immediately after login attempt
    setPassword('')
    setTotpCode('')

    // Navigate to dashboard on successful login
    navigate('/')
  } catch {
    // Error is handled by auth store
    // Clear password on failure too
    setPassword('')
  }
}
```

**Step 2: テストを実行**

Run: `cd frontend && npm test -- src/pages/Login.test.tsx`
Expected: All tests pass

**Step 3: Commit**

```bash
git add frontend/src/pages/Login.tsx
git commit -m "security: clear password state after login attempt

Clear password and TOTP code from component state immediately
after login attempt (success or failure) to prevent credential
leakage in memory."
```

---

## Task 5: rememberMeチェックボックスを削除

**Files:**
- Modify: `frontend/src/pages/Login.tsx:20-24, 146-165`

**Step 1: rememberMe stateとUIを削除**

削除するstate (line 20-24):
```typescript
const [rememberMe, setRememberMe] = useState(false)
```

削除するUI (line 146-165):
```typescript
<div className="flex items-center justify-between">
  <label className="flex items-center gap-2 text-sm">
    <input
      type="checkbox"
      data-testid="login-remember-me"
      className="rounded border-input"
      checked={rememberMe}
      onChange={(e) => setRememberMe(e.target.checked)}
      disabled={isLoading}
    />
    Remember me
  </label>
  <Link
    to="/forgot-password"
    data-testid="login-forgot-password"
    className="text-sm text-primary hover:underline"
  >
    Forgot password?
  </Link>
</div>
```

置き換えるUI:
```typescript
<div className="flex items-center justify-end">
  <Link
    to="/forgot-password"
    data-testid="login-forgot-password"
    className="text-sm text-primary hover:underline"
  >
    Forgot password?
  </Link>
</div>
```

**Step 2: テストを更新**

File: `frontend/src/pages/Login.test.tsx`

`remember-me` チェックボックスのテストを削除または修正。

**Step 3: テストを実行**

Run: `cd frontend && npm test -- src/pages/Login.test.tsx`
Expected: All tests pass

**Step 4: Commit**

```bash
git add frontend/src/pages/Login.tsx frontend/src/pages/Login.test.tsx
git commit -m "refactor: remove non-functional remember me checkbox

Remove the 'Remember me' checkbox that was not implemented.
This reduces UI clutter and prevents user confusion."
```

---

## Task 6: ProtectedRoute checkAuth競合修正

**Files:**
- Modify: `frontend/src/pages/ProtectedRoute.tsx`

**Step 1: 重複呼び出しを防止するフラグを追加**

現在のコード:
```typescript
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore()
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false)

  // Check authentication on mount (only once)
  useEffect(() => {
    const checkAuthOnMount = async () => {
      await checkAuth()
      setHasCheckedAuth(true)
    }
    checkAuthOnMount()
    // checkAuth is stable from Zustand store, only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
```

修正後:
```typescript
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore()
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false)
  const isCheckingRef = useRef(false)

  // Check authentication on mount (only once)
  useEffect(() => {
    const checkAuthOnMount = async () => {
      // Prevent duplicate calls
      if (isCheckingRef.current) {
        return
      }
      
      isCheckingRef.current = true
      try {
        await checkAuth()
      } finally {
        setHasCheckedAuth(true)
        isCheckingRef.current = false
      }
    }
    
    // Only run if we haven't checked yet
    if (!hasCheckedAuth && !isCheckingRef.current) {
      checkAuthOnMount()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
```

また、useRefのimportを追加:
```typescript
import { useEffect, useState, useRef } from 'react'
```

**Step 2: テストを実行**

Run: `cd frontend && npm test -- src/pages/ProtectedRoute.test.tsx`
Expected: All tests pass

**Step 3: Commit**

```bash
git add frontend/src/pages/ProtectedRoute.tsx
git commit -m "fix: prevent duplicate checkAuth calls in ProtectedRoute

Add ref-based guard to prevent race conditions and duplicate
authentication checks when component re-renders."
```

---

## Task 7: shiny-button.tsx eslint-disable修正

**Files:**
- Modify: `frontend/src/components/ui/shiny-button.tsx`

**Step 1: CSSカスタムプロパティ用の型定義を追加**

現在のコード (line 20-23, 40-41):
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
initial={{ '--x': '100%', scale: 0.98 } as any}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
animate={{ '--x': '-100%', scale: 1 } as any}
...
// eslint-disable-next-line @typescript-eslint/no-explicit-any
{...(props as any)}
```

修正後 - MotionStyleを使用:
```typescript
import { motion, type MotionStyle } from 'motion/react'

// CSS custom property type for motion animations
type CSSCustomProperties = {
  '--x': string
} & MotionStyle

export const ShinyButton = forwardRef<HTMLButtonElement, ShinyButtonProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        className={cn(
          'relative cursor-pointer rounded-lg border px-6 py-2 font-medium backdrop-blur-xl transition-shadow duration-300 ease-in-out hover:shadow dark:bg-[radial-gradient(circle_at_50%_0%,var(--primary)/10%_0%,transparent_60%)] dark:hover:shadow-[0_0_20px_var(--primary)/10%]',
          className
        )}
        initial={{ '--x': '100%', scale: 0.98 } as CSSCustomProperties}
        animate={{ '--x': '-100%', scale: 1 } as CSSCustomProperties}
        whileTap={{ scale: 0.95 }}
        transition={{
          repeat: Number.POSITIVE_INFINITY,
          repeatType: 'loop',
          repeatDelay: 1,
          type: 'spring',
          stiffness: 20,
          damping: 15,
          mass: 2,
          scale: {
            type: 'spring',
            stiffness: 200,
            damping: 5,
            mass: 0.5,
          },
        }}
        {...props}
      >
```

**Step 2: テストを実行**

Run: `cd frontend && npm run lint -- src/components/ui/shiny-button.tsx`
Expected: No eslint errors

**Step 3: Commit**

```bash
git add frontend/src/components/ui/shiny-button.tsx
git commit -m "refactor: remove eslint-disable from shiny-button

Use proper CSSCustomProperties type instead of 'any' casts
for motion animation custom properties."
```

---

## Task 8: authStore.ts eslint-disable修正

**Files:**
- Modify: `frontend/src/stores/authStore.ts`

**Step 1: customStorageに適切な型を定義**

現在のコード (line 40-50, 70-71):
```typescript
const customStorage = {
  getItem: (name: string): string | null => {
    return localStorage.getItem(name)
  },
  setItem: (name: string, value: string): void => {
    localStorage.setItem(name, value)
  },
  removeItem: (name: string): void => {
    localStorage.removeItem(name)
  },
}
...
// eslint-disable-next-line @typescript-eslint/no-explicit-any
storage: customStorage as any,
```

修正後 - StateStorageインターフェースを実装:
```typescript
import { type StateStorage } from 'zustand/middleware'

const customStorage: StateStorage = {
  getItem: (name: string): string | null => {
    return localStorage.getItem(name)
  },
  setItem: (name: string, value: string): void => {
    localStorage.setItem(name, value)
  },
  removeItem: (name: string): void => {
    localStorage.removeItem(name)
  },
}
...
storage: customStorage,
```

**Step 2: テストを実行**

Run: `cd frontend && npm run lint -- src/stores/authStore.ts`
Expected: No eslint errors

Run: `cd frontend && npm test -- src/stores/authStore.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add frontend/src/stores/authStore.ts
git commit -m "refactor: remove eslint-disable from authStore

Use proper StateStorage type from zustand/middleware
instead of 'any' cast for custom storage."
```

---

## Task 9: インデックスメタタグ追加

**Files:**
- Modify: `frontend/index.html`

**Step 1: 検索エンジンインデックス防止メタタグを追加**

現在のコード:
```html
<meta name="description" content="Smart Office AI - All-in-one AI-powered office suite for self-hosting" />
<title>Smart Office AI</title>
```

修正後:
```html
<meta name="description" content="Smart Office AI - All-in-one AI-powered office suite for self-hosting" />
<meta name="robots" content="noindex, nofollow" />
<title>Smart Office AI</title>
```

**Step 2: Commit**

```bash
git add frontend/index.html
git commit -m "security: prevent search engine indexing

Add robots meta tag to prevent search engines from indexing
self-hosted instances."
```

---

## Task 10: バックエンド ログインエラーメッセージ統一

**Files:**
- Modify: `backend/app/api/v1/auth.py:191-213`

**Step 1: エラーメッセージを統一（ユーザー列挙防止）**

現在のコード:
```python
if user is None:
    # Dummy hash comparison to prevent timing attacks
    verify_password(credentials.password, get_password_hash("dummy"))
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password",
    )

# Verify password
if not verify_password(credentials.password, user.hashed_password):
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password",
    )

# Check if user is active
if not user.is_active:
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="User account is inactive",
    )
```

修正後:
```python
if user is None:
    # Dummy hash comparison to prevent timing attacks
    verify_password(credentials.password, get_password_hash("dummy"))
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password",
    )

# Verify password
if not verify_password(credentials.password, user.hashed_password):
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password",
    )

# Check if user is active - use generic error
if not user.is_active:
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password",
    )
```

**Step 2: テストを更新**

`backend/tests/test_auth.py` で "Inactive user" を検証しているテストを修正。

**Step 3: テストを実行**

Run: `cd backend && pytest tests/test_auth.py -v -k "login"`
Expected: All tests pass

**Step 4: Commit**

```bash
git add backend/app/api/v1/auth.py backend/tests/test_auth.py
git commit -m "security: prevent user enumeration via inactive account error

Use generic 'Invalid email or password' message for inactive
accounts to prevent user enumeration attacks."
```

---

## Task 11: 全テスト実行と最終確認

**Files:**
- All test files

**Step 1: バックエンドテスト実行**

Run: `cd backend && pytest -v`
Expected: All 246 tests pass

**Step 2: フロントエンドテスト実行**

Run: `cd frontend && npm test`
Expected: All tests pass

**Step 3: フロントエンドLint実行**

Run: `cd frontend && npm run lint`
Expected: No errors

**Step 4: セキュリティヘッダー最終確認**

```bash
# 全ヘッダー確認
curl -s -D- http://localhost/ | grep -E "^(HTTP|x-|X-|content-security|referrer)"
```

Expected output:
```
HTTP/1.1 200 OK
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-Xss-Protection: 1; mode=block
```

**Step 5: Final commit**

```bash
git add docs/plans/2026-02-11-step7-security-debt.md
git commit -m "docs: add security debt remediation plan

Document all security fixes applied to address Phase 1
technical debt in Step 7."
```

---

## Summary of Changes

| 重要度 | 問題 | 対応 | ファイル |
|--------|------|------|----------|
| CRITICAL | localStorage JWT保存 | Phase 2でhttpOnly移行予定（現在は維持） | api.ts |
| CRITICAL | CSP未設定 | CSP + セキュリティヘッダー追加 | Caddyfile |
| CRITICAL | ユーザー列挙攻撃 | エラーメッセージ統一 | auth.py |
| HIGH | rememberMe未実装 | チェックボックス削除 | Login.tsx |
| HIGH | eslint-disable乱用 | 型定義修正 | shiny-button.tsx, authStore.ts |
| HIGH | TOTP平文表示 | type="password"に変更 | Login.tsx |
| HIGH | checkAuth競合 | refガード追加 | ProtectedRoute.tsx |
| MEDIUM | パスワードstate残留 | 送信後クリア | Login.tsx |
| MEDIUM | セキュリティヘッダー不足 | X-Frame-Options等追加 | Caddyfile |
| LOW | 検索エンジンインデックス | noindex追加 | index.html |

---

## Verification Checklist

- [ ] Caddyfile security headers working
- [ ] Registration returns generic error
- [ ] TOTP input is password type
- [ ] Password cleared after login
- [ ] Remember me checkbox removed
- [ ] ProtectedRoute no duplicate calls
- [ ] No eslint-disable in shiny-button
- [ ] No eslint-disable in authStore
- [ ] robots noindex in index.html
- [ ] Login errors are generic
- [ ] All backend tests pass
- [ ] All frontend tests pass
- [ ] Frontend lint passes
