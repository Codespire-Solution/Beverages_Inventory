# Task 4 Report: A5 Split Splash Login Page

## Files Changed

- `src/app/login/page.tsx` -- full JSX rewrite; all logic preserved

## Logic Preservation Confirmed

The following were kept exactly as-is from the original file:

- `useState` hooks: `email`, `password`, `error`, `loading` -- no changes
- `handleSubmit`: POSTs to `/api/auth/login` with `{ email, password }`, sets `localStorage.setItem('token', data.token)` and `localStorage.setItem('user', JSON.stringify(data.user))`, calls `router.push('/dashboard')`
- Error handling: `setError(data.error || 'Login failed')` on non-ok response; `'An error occurred. Please try again.'` on catch
- Loading state: set `true` before fetch, `false` on error paths (router push on success leaves it truthy, same as original)
- `'use client'` directive retained

## New State

One new state variable added: `showPassword` (boolean, default `false`) -- purely controls `input type="password"` vs `type="text"` toggle. Has no effect on submit, validation, or any auth behavior.

## Layout Implemented

- Root: `min-h-screen grid md:grid-cols-2` (single column below md breakpoint)
- Left panel: `bg-ink text-white` with serif wordmark, pitch heading, facts row (15/Items, 3/SKUs, FIFO/Batch tracking), and `<Marquee>` bled to panel edges via `-mx-12 -mb-12`
- Right panel: `flex items-center justify-center` with `max-w-sm` form; email field with `EnvelopeSimple`, password field with `LockSimple` + Eye/EyeSlash toggle, error banner with `WarningCircle`, remember-me row, `<Button variant="primary">` with `SignIn` icon, demo credentials footer
- All inputs use proper `htmlFor`/`id` pairing and `autoComplete` attributes

## Build Result

`npx next build` -- compiled successfully, no type errors, 31 static pages generated. `/login` route: 7.61 kB, 89.8 kB first load JS.

## Concerns

None. The Marquee component uses `bg-ink` as its own background which blends cleanly into the dark panel when bled to edges. The `oklch()` color values used for the radial glow and muted text are inline styles since those specific opacity variants are not in the Tailwind config -- this is intentional to match the mockup exactly.

## Fix wave 1

Removed redundant inline `style={{ accentColor: '#E08A2B' }}` from "Remember me" checkbox (line 176), kept `accent-accent` class; build result: compiled successfully, no type errors.
