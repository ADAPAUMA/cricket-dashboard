require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    /\.vercel\.app$/,          // any Vercel deployment
    process.env.FRONTEND_URL,  // set this in Render dashboard
  ].filter(Boolean),
  credentials: true,
}));
app.use(express.json());

// ─── MongoDB Connection ───────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cricket_dashboard')
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err));

// ─── Schemas ──────────────────────────────────────────────────────────────────

// Admin Schema
const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});
const Admin = mongoose.model('Admin', adminSchema);

// Member Schema
const memberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, default: '' },
  team: { type: String, enum: ['Team A', 'Team B'], required: true },
  isFavorite: { type: Boolean, default: false },
  subscriptionAmount: { type: Number, default: 0 },
  subscriptionPaid: { type: Boolean, default: false },
  matchFees: { type: Number, default: 0 },
  matchFeesPaid: { type: Boolean, default: false },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});
const Member = mongoose.model('Member', memberSchema);

// ─── JWT Middleware ───────────────────────────────────────────────────────────
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET || 'cricket_secret_key');
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// ─── Seed Admin ───────────────────────────────────────────────────────────────
const seedAdmin = async () => {
  const exists = await Admin.findOne({ username: 'admin' });
  if (!exists) {
    const hashed = await bcrypt.hash('cricket@123', 10);
    await Admin.create({ username: 'admin', password: hashed });
    console.log('✅ Default admin created: admin / cricket@123');
  }
};
seedAdmin();

// ─── Routes ──────────────────────────────────────────────────────────────────

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ username });
  if (!admin) return res.status(401).json({ message: 'Invalid credentials' });
  const match = await bcrypt.compare(password, admin.password);
  if (!match) return res.status(401).json({ message: 'Invalid credentials' });
  const token = jwt.sign({ id: admin._id, username }, process.env.JWT_SECRET || 'cricket_secret_key', { expiresIn: '8h' });
  res.json({ token, username });
});

// Change Password
app.put('/api/change-password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const admin = await Admin.findById(req.admin.id);
  const match = await bcrypt.compare(currentPassword, admin.password);
  if (!match) return res.status(400).json({ message: 'Current password incorrect' });
  admin.password = await bcrypt.hash(newPassword, 10);
  await admin.save();
  res.json({ message: 'Password updated' });
});

// Get all members
app.get('/api/members', auth, async (req, res) => {
  const { team, favorite } = req.query;
  const filter = {};
  if (team) filter.team = team;
  if (favorite === 'true') filter.isFavorite = true;
  const members = await Member.find(filter).sort({ createdAt: -1 });
  res.json(members);
});

// Add member
app.post('/api/members', auth, async (req, res) => {
  try {
    const member = await Member.create(req.body);
    res.status(201).json(member);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update member
app.put('/api/members/:id', auth, async (req, res) => {
  try {
    const member = await Member.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(member);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete member
app.delete('/api/members/:id', auth, async (req, res) => {
  await Member.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// Dashboard stats
app.get('/api/stats', auth, async (req, res) => {
  const all = await Member.find();
  const teamA = all.filter(m => m.team === 'Team A');
  const teamB = all.filter(m => m.team === 'Team B');

  const calc = (arr) => ({
    total: arr.length,
    favorites: arr.filter(m => m.isFavorite).length,
    totalSubscription: arr.reduce((s, m) => s + m.subscriptionAmount, 0),
    paidSubscription: arr.filter(m => m.subscriptionPaid).reduce((s, m) => s + m.subscriptionAmount, 0),
    totalMatchFees: arr.reduce((s, m) => s + m.matchFees, 0),
    paidMatchFees: arr.filter(m => m.matchFeesPaid).reduce((s, m) => s + m.matchFees, 0),
    totalWins: arr.reduce((s, m) => s + m.wins, 0),
    totalLosses: arr.reduce((s, m) => s + m.losses, 0),
  });

  res.json({
    overall: calc(all),
    teamA: calc(teamA),
    teamB: calc(teamB),
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🏏 Server running on port ${PORT}`));
