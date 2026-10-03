# ☕ DAILY DRIP — FULL-STACK SMART CAFÉ WEB APPLICATION
> **"Your Coffee. Your Way."**

A complete, production-grade, full-stack specialty coffee management and customer experience platform built with React 18, Tailwind CSS, Express, Socket.IO, and persistent SQLite.

---

## 🌟 Architecture & Key Features

### 1. 🧋 Interactive Coffee Builder & Visual Cup Engine
- **Customizable Attributes**: Base drink, Size (Small/Medium/Large), Milk (Dairy/Oat/Almond/Soy), Sweetness (0%/25%/50%/100%), Temperature (Hot/Warm/Iced), Flavors, and Add-ons.
- **Dynamic Pricing Engine**: Price recalculates in real-time as users modify ingredients.
- **Live Cup Mockup**: Renders liquid levels, milk layers, whipped cream, animated rising steam (for hot brews), and floating ice cubes (for iced drinks).

### 2. 🧬 Coffee DNA & Public QR Sharing
- Automatically computes 5 spectral dimensions: **Strength %**, **Sweetness %**, **Creaminess %**, **Chill %**, and **Energy %**.
- Generates personality classifications (e.g. *THE COZY ACHIEVER*, *THE MIDNIGHT CATALYST*).
- **Public Scannable QR Codes**: Encodes real network URLs (`/coffee-dna/:id`). Any phone on the same Wi-Fi can scan the QR code to open the public DNA page without requiring login, vote YES/NO, and order the exact recipe.

### 3. 📱💻 Café Portal — Cross-Device System ("One Website. Two Devices.")
- **Café World (Laptop / Screen)**: Displays the 4-digit temporary session code (e.g. `4827`) + Join QR code, connected device counters, and displays live draft coffee configurations and customer cup art in real-time.
- **Customer Remote (Phone)**: Join using the 4-digit code or QR code.
- **Two-Way Live Sync**: Slide sweetness on the phone -> Café World screen updates immediately. Change temperature on the laptop to Iced -> Phone immediately displays *"🧊 Your coffee is now iced."*
- **Design Your Cup**: Touch/mouse/stylus drawing canvas with brush colors, eraser, size control, and direct transfer to the café screen.
- **Live Status Loop**: Phone sends order -> Barista marks Preparing -> Phone shows *"☕ Your coffee is being prepared..."* -> Barista marks Ready -> Phone triggers confetti celebration *"🎉 YOUR COFFEE IS READY! Table 07"*.

### 4. ⏱️ Smart Café Queue & Live Rush Meter
- **Live Rush Meter**: Workload indicator dynamically calculated from active orders (`🟢 NOT BUSY` [0-2 orders, ~5m wait], `🟠 MODERATELY BUSY` [3-5 orders, ~12m wait], `🔴 VERY BUSY` [6+ orders, ~20m wait]).
- **Smart Queue Position**: Calculates exact tickets ahead of the user (`👥 X orders before you`) and updates in real-time as the barista accepts, prepares, and completes tickets.

### 5. 🎤 Voice Ordering
- Uses the **Web Speech API** (`window.SpeechRecognition` / `webkitSpeechRecognition`) with an automatic graceful text fallback.
- Recognizes natural queries: *"I want something cold, not too sweet, and strong"* -> matches menu items -> 1-click **"MAKE IT THE FIRST ONE"** to order.

### 6. ☕ Digital Coffee Passport
- Tracks discovered drinks across world coffee capitals (Italy 🇮🇹, France 🇫🇷, USA 🇺🇸, India 🇮🇳, Japan 🇯🇵, Belgium 🇧🇪).
- Progress bar automatically stamps new discoveries upon order completion.

### 7. 🏪 Interactive Digital Floor Tables & KDS
- **Interactive Floor Map**: Tables 1–10 with real occupancy status (`🟢 Available`, `🔴 Occupied`, `🟡 Reserved`). Placing an order with a table automatically marks it occupied; completing the ticket frees it.
- **Barista KDS Display**: 5-column live board (`NEW`, `ACCEPTED`, `PREPARING`, `READY`, `COMPLETED`) with urgency flags, custom cup drawings, and emergency announcement broadcast.
- **Admin Dashboard**: Real SQLite analytics (revenue, today's orders, hourly demand trends, bestselling drinks, menu CRUD, and user role controls).

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite 6, Tailwind CSS, Lucide Icons, Canvas Confetti, HTML5 Canvas |
| **Backend** | Node.js, Express.js (REST API), Socket.IO (WebSockets / Fallback Polling) |
| **Database** | SQLite3 via `better-sqlite3` (WAL mode enabled, persistent disk storage) |
| **Authentication**| JWT (JSON Web Tokens), bcryptjs password hashing, RBAC (`customer`, `staff`, `admin`) |
| **QR Code Engine**| `qrcode` (real SVG & PNG data URLs dynamically generated) |

---

## 👥 Demo Accounts

The application includes an instant **1-Click Demo Switcher** in the top navigation bar:

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Customer** | `customer@dailydrip.cafe` | `coffee123` | Browse menu, customize, place orders, Coffee DNA, Passport, join sessions |
| **Lead Barista** | `barista@dailydrip.cafe` | `barista123` | KDS order management, status updates, urgent tickets, table toggles |
| **Café Admin** | `admin@dailydrip.cafe` | `admin123` | Full menu CRUD, analytics, table configuration, user role management |

---

## 🚀 Running Locally

```bash
# 1. Clone or navigate to the project directory
cd C:\Users\DELL\.gemini\antigravity\scratch\daily-drip

# 2. Seed realistic database catalog (menu, tables, historical orders)
npm run seed

# 3. Build frontend bundle
npm run build

# 4. Start the production server
npm run start
```

The application runs on:
- Local browser: `http://localhost:5000`
- Local network access (phones on Wi-Fi): `http://10.221.8.216:5000` (auto-detected)

---

## 🌐 Deployment

To deploy on any cloud platform (Render, Railway, Fly.io, DigitalOcean, VPS):
1. Set Environment Variables:
   - `PORT=5000`
   - `NODE_ENV=production`
   - `JWT_SECRET=your-secure-random-secret`
   - `BASE_URL=https://your-domain.com` (optional; if omitted, automatically uses the request host)
2. Build & Start commands:
   - Build: `npm run build`
   - Start: `npm run start`
