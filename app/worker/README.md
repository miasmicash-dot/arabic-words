# Reminder server (Cloudflare Worker)

A tiny free server that sends the daily "N words ready to review" notification. It only stores the phone's push address, the reminder time and time zone, and a due-count number. No names, emails or vocabulary.

You need: Node.js installed, and about 15 minutes. Everything below is free.

All commands are run in a terminal **inside the `worker` folder** of the project:

```bash
cd worker
npm install
```

## 1. Create a free Cloudflare account
Go to https://dash.cloudflare.com/sign-up and sign up (no payment card needed). Verify your email.

## 2. Log in from the terminal
```bash
npx wrangler login
```
A browser tab opens; click **Allow**.

## 3. Create the storage (KV namespace)
```bash
npx wrangler kv namespace create SUBS
```
It prints something like `id = "0123abcd..."`. Open `wrangler.toml` and replace `REPLACE_WITH_KV_ID` with that id.

## 4. Generate the VAPID keys
```bash
node generate-vapid.mjs
```
It prints a **public key** and a **private key**. Keep that window open (or save them somewhere private). The private key is a secret; never put it in the app or share it.

## 5. Store the keys as secrets
Each command asks you to paste a value, then press Enter:

```bash
npx wrangler secret put VAPID_PUBLIC_KEY
```
(paste the public key)

```bash
npx wrangler secret put VAPID_PRIVATE_KEY
```
(paste the private key)

```bash
npx wrangler secret put VAPID_SUBJECT
```
(type `mailto:` followed by your email address, e.g. `mailto:you@example.com`)

If it asks to create the worker first, say yes.

## 6. Deploy
```bash
npx wrangler deploy
```
At the end it prints the worker's address, like `https://arabic-words-reminders.YOURNAME.workers.dev`. Copy it.

## 7. Connect the app
In the app's folder (one level up from `worker`) create or edit the file named `.env` and add:

```
VITE_WORKER_URL=https://arabic-words-reminders.YOURNAME.workers.dev
VITE_VAPID_PUBLIC_KEY=<the public key from step 4>
```

Then rebuild/redeploy the app (`npm run build`, then publish the `dist` folder as you normally do). The values are baked in at build time, so **any change to `.env` needs a rebuild**.

## 8. Lock it to your app (recommended)
Once you know the address where the app is hosted, open `wrangler.toml` and change
`ALLOWED_ORIGIN = "*"` to e.g. `ALLOWED_ORIGIN = "https://your-app.pages.dev"` (no trailing slash), then run `npx wrangler deploy` again.

## Using it on iPhone
1. Open the app in **Safari**, tap Share, then **Add to Home Screen**.
2. Open the app from the Home Screen icon (reminders only work from there; iOS 16.4 or newer).
3. In Settings in the app, turn on reminders and allow notifications when asked.

## Checking it works
- Live logs: `npx wrangler tail`
- The worker runs once an hour, on the hour, and sends each phone a notification during the hour of its chosen reminder time (so "19:00" arrives between 19:00 and 19:05 or so). Once per day per phone.
- To test right away, set the reminder time to the current hour in the app, then in the Cloudflare dashboard go to Workers & Pages, then your worker, then Settings, then Triggers, and use the cron test, or just wait for the next hour mark.

## Turning it off / deleting
Turning reminders off in the app removes the phone from the server. To delete everything: `npx wrangler delete`.
