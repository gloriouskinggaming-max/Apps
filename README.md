# Apps

Two iPhone apps built with Expo (React Native + TypeScript).

| Folder | What it is |
| --- | --- |
| `spendly/` | **Spendly** – budgeting app that links your banks through Plaid. Covers checking, savings, credit cards and loans. No investments. |
| `spendly-server/` | The small server Spendly needs to talk to Plaid. It keeps your Plaid keys and bank tokens off the phone. |
| `shuttle/` | **Shuttle** – food and workout tracker. Calorie diary, macros, barcode scanning, cardio and strength logging, stats, and login. |

---

## Spendly

**Features**

- **Dashboard**: spending this month vs. budget, a comparison with last month, income, net, cash, debt, top categories, upcoming bills, goals and recent transactions
- **Accounts**: net worth without investments, accounts grouped into Cash, Credit Cards and Loans, plus connection health with a reconnect option when a bank login expires
- **Transactions**: search, filters, grouped by day. Tap one to recategorize it, add a note, or hide it from reports.
- **Rules**: "Always categorize this merchant as…". Manage them in Settings.
- **Cash Flow**: 6-month income vs. expenses chart, savings rate, and breakdowns by source and category
- **Budget**: monthly budget per category with green, yellow and red progress bars
- **Recurring**: detects subscriptions, bills and paychecks automatically and shows the next due date
- **Goals**: savings goals with progress and the monthly amount needed to stay on track
- **Demo mode**: try everything with realistic fake data before connecting a bank

Investment and brokerage accounts are filtered out on the server and never imported.

### Try it on your iPhone now (demo mode)

1. Install **Expo Go** from the App Store.
2. On a computer: `cd spendly && npm install && npx expo start`
3. Scan the QR code with your iPhone camera.

### Connect your real banks

Plaid's bank-linking screen is native code, so it needs a real build of the app. Expo Go can't run it.

1. **Get Plaid keys**: sign up at <https://dashboard.plaid.com>. *Sandbox* is free and uses test banks (username `user_good`, password `pass_good`). Real banks need Plaid *Production* access, which you request in the dashboard.
2. **Run the server**
   ```bash
   cd spendly-server
   cp .env.example .env      # fill in PLAID_CLIENT_ID, PLAID_SECRET, APP_API_KEY
   npm install
   npm run dev
   ```
   For real use, deploy it to a host that's always on (Render, Railway or Fly.io all work) so your phone can reach it over HTTPS.
3. **Build the app for your iPhone** (no Mac needed; requires an Apple Developer account, $99/yr):
   ```bash
   cd spendly
   npx eas-cli@latest build --profile development --platform ios
   ```
   Install the build on your phone from the link EAS gives you, then run `npx expo start --dev-client`.
4. In the app: **Settings → enter your server URL and APP_API_KEY → Save & connect**, then **Accounts → Link a bank**.

---

## Shuttle

**Design**: black and navy with an electric blue primary color, silver text and green accents. Progress is shown in **red, yellow or green** everywhere.

**Features**

- **Login and sign up**, followed by onboarding that calculates your calorie and macro goals (Mifflin-St Jeor)
- **Today diary**: a calorie ring, **Goal − Food + Exercise = Remaining**, and a banner showing the calories you **earned back** by working out. Also macros, meals (breakfast, lunch, dinner, snacks), exercise and water.
- **Food logging**: built-in food list (works offline), online search of millions of products through Open Food Facts (free), **barcode scanner**, custom foods, recent foods and a servings stepper
- **Cardio**: 18 activities plus a **steps** option. Calories are estimated from MET values (or entered from your watch), with a live "You'll earn back +X cal" preview.
- **Strength workouts**: exercises, sets, reps and weight, a timer, live PR detection, and repeating or editing past workouts. Calories burned are added to your day automatically.
- **Stats**: day streak, average calories, on-target days, protein, workouts and calories earned back, plus a weight trend with goal progress, a daily calorie chart and average macros (7, 30 or 90 days)
- **Profile**: edit goals, log out, delete account

### Turn on Supabase (accounts and cloud sync)

Without Supabase keys, Shuttle stores accounts on the phone only. With them, you get real accounts, **Sign in with Apple**, password reset, and your data syncs across devices. It works offline-first: changes save on the phone instantly and upload in the background.

1. Create a free project at <https://supabase.com/dashboard>.
2. **SQL Editor → New query**: paste `supabase/migrations/20261107000000_shuttle.sql` and click **Run**. This creates the tables, the security rules (each user can only see their own data) and the delete-account function.
3. **Project Settings → API**: copy the Project URL and the anon (publishable) key into `shuttle/.env`:
   ```bash
   cp shuttle/.env.example shuttle/.env   # then paste the two values
   ```
4. **Authentication → Email Templates → Reset Password**: add `{{ .Token }}` to the email so it includes the 6-digit code the app asks for.
5. *(Optional)* **Authentication → Sign In / Providers → Apple**: enable it and add `com.gloriouskinggaming.shuttle` as a Client ID. To test inside Expo Go, also add `host.exp.Exponent`.
6. *(Optional)* **Authentication → Sign In / Providers → Email**: turn off "Confirm email" if you don't want new users to have to click a confirmation link first.

Restart `npx expo start` after editing `.env`.

### Try it on your iPhone

Everything in Shuttle runs in **Expo Go**:

```bash
cd shuttle && npm install && npx expo start
```

Scan the QR code with your iPhone. To install it as a standalone app, use `npx eas-cli@latest build --platform ios`.

---

## Do you need a database?

| | Spendly | Shuttle |
| --- | --- | --- |
| Right now | The server saves bank data in a JSON file (`spendly-server/data/db.json`). Budgets, rules and goals are saved on the phone. | **Supabase** when keys are set (accounts and synced data). Otherwise everything stays on the iPhone. |
| Good enough for | Just you | Just you, on one phone |
| Upgrade when | You want several users, or you want backups | You want to log in on a new phone and keep your data, or share with friends |

**Options, simplest first:**

1. **Stay on-device (current setup)**: free, private, nothing to manage. Downside: delete the app and the data is gone, and there's no syncing between devices.
2. **Supabase (recommended upgrade)**: hosted Postgres database plus login (email, **Sign in with Apple**, Google). The free tier is generous. Shuttle's `src/lib/auth.ts` and `store.tsx` are small, self-contained layers you can swap for Supabase calls. Spendly's server can store its data in the same Supabase Postgres.
3. **Firebase**: Google's Firestore database plus Auth. Similar to Supabase, with a NoSQL document model.
4. **Your own SQLite or Postgres**: for Spendly, replace `JsonFileStore` in `spendly-server/src/store.ts` with a class that implements the same `Store` interface.

> Note: if you publish Shuttle on the App Store with email login, Apple also requires **Sign in with Apple** and an in-app delete-account option (the delete option is already built in).
