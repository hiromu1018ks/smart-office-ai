# Page snapshot

```yaml
- generic [ref=e4]:
  - generic [ref=e5]:
    - generic [ref=e6]:
      - img [ref=e8]
      - generic [ref=e12]: Smart Office AI
    - heading "Welcome back" [level=1] [ref=e13]
    - paragraph [ref=e14]: Sign in to Smart Office AI to continue
  - generic [ref=e15]:
    - generic [ref=e16]:
      - generic [ref=e17]:
        - text: Email
        - textbox "Email" [ref=e18]:
          - /placeholder: name@example.com
          - text: e2e-test@example.com
      - generic [ref=e19]:
        - text: Password
        - textbox "Password" [active] [ref=e20]:
          - /placeholder: ••••••••
          - text: TestPass123
      - generic [ref=e21]:
        - generic [ref=e22]:
          - checkbox "Remember me" [ref=e23]
          - text: Remember me
        - link "Forgot password?" [ref=e24] [cursor=pointer]:
          - /url: /forgot-password
      - button "Sign in" [ref=e25] [cursor=pointer]:
        - generic [ref=e26]: Sign in
    - generic [ref=e28]:
      - text: Don't have an account?
      - link "Sign up" [ref=e29] [cursor=pointer]:
        - /url: /register
  - paragraph [ref=e30]: AI-powered office suite for self-hosting
```