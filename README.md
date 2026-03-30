# 🏏 Cricket Dashboard - Complete Setup Guide

## What's included
- ✅ Admin Login (MongoDB lo password store)
- ✅ Member Management (Add, Edit, Delete)
- ✅ Team A / Team B filtering
- ✅ Favorite ⭐ marking
- ✅ Subscription & Match Fees tracking (Paid/Pending)
- ✅ Wins & Losses tracking
- ✅ 🧮 Calculator with financial summary
- ✅ 📥 Excel Export (2 sheets: Members + Summary)
- ✅ Stats Dashboard

---

## ⚙️ Setup Steps

### Step 1: Install MongoDB
- Download from: https://www.mongodb.com/try/download/community
- Install and start MongoDB service

### Step 2: Backend Setup
```bash
cd cricket-dashboard/backend
npm install
node server.js
```
Server starts on: http://localhost:5000

### Step 3: Frontend Setup
```bash
cd cricket-dashboard/frontend
npm install
npm run dev
```
App opens on: http://localhost:5173

---

## 🔐 Default Login
- Username: **admin**
- Password: **cricket@123**

> First run లో automatically admin create అవుతుంది!

---

## 🌐 MongoDB Atlas (Online Hosting - Free)
1. Go to https://cloud.mongodb.com
2. Create free cluster
3. Get connection string
4. Open `backend/.env` and replace MONGO_URI:
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/cricket_dashboard
```

---

## 📁 Project Structure
```
cricket-dashboard/
├── backend/
│   ├── server.js       ← Express API + MongoDB
│   ├── .env            ← DB config
│   └── package.json
└── frontend/
    ├── src/
    │   ├── App.jsx           ← Main routing
    │   ├── pages/
    │   │   ├── Login.jsx     ← Login page
    │   │   └── Dashboard.jsx ← Main dashboard
    │   ├── components/
    │   │   ├── MemberForm.jsx  ← Add/Edit form
    │   │   └── Calculator.jsx  ← Calculator modal
    │   └── utils/
    │       ├── api.js      ← API calls
    │       └── excel.js    ← Excel export
    └── package.json
```

---

## 🚀 Deploy to Render (Free Hosting)
- Backend: https://render.com → New Web Service → Node.js
- Frontend: https://vercel.com → Import from GitHub

---

## Excel Export కి ఏం వస్తుంది?
- Sheet 1 "Members": అన్ని members తో complete details
- Sheet 2 "Summary": Team A vs Team B comparison totals

---

## Password Change కి
Backend API: PUT /api/change-password
Body: { currentPassword, newPassword }
