import * as XLSX from 'xlsx';

export const exportToExcel = (members, filename = 'cricket_members') => {
  const rows = members.map((m, i) => ({
    '#': i + 1,
    'Member Name': m.name,
    'Phone': m.phone || '-',
    'Team': m.team,
    'Favorite ⭐': m.isFavorite ? 'Yes' : 'No',
    'Subscription (₹)': m.subscriptionAmount,
    'Subscription Paid': m.subscriptionPaid ? 'Paid ✅' : 'Pending ❌',
    'Match Fees (₹)': m.matchFees,
    'Match Fees Paid': m.matchFeesPaid ? 'Paid ✅' : 'Pending ❌',
    'Total Due (₹)': (m.subscriptionPaid ? 0 : m.subscriptionAmount) + (m.matchFeesPaid ? 0 : m.matchFees),
    'Wins': m.wins,
    'Losses': m.losses,
    'Win Rate': m.wins + m.losses > 0
      ? `${Math.round((m.wins / (m.wins + m.losses)) * 100)}%`
      : 'N/A',
    'Notes': m.notes || '-',
    'Added On': new Date(m.createdAt).toLocaleDateString('en-IN'),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  // Column widths
  ws['!cols'] = [
    { wch: 4 }, { wch: 20 }, { wch: 14 }, { wch: 10 }, { wch: 10 },
    { wch: 16 }, { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 14 },
    { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 20 }, { wch: 14 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Members');

  // Summary sheet
  const teamA = members.filter(m => m.team === 'Team A');
  const teamB = members.filter(m => m.team === 'Team B');
  const summary = [
    { 'Summary': 'Total Members', 'Overall': members.length, 'Team A': teamA.length, 'Team B': teamB.length },
    { 'Summary': 'Favorites', 'Overall': members.filter(m => m.isFavorite).length, 'Team A': teamA.filter(m => m.isFavorite).length, 'Team B': teamB.filter(m => m.isFavorite).length },
    { 'Summary': 'Total Subscription (₹)', 'Overall': members.reduce((s,m) => s+m.subscriptionAmount,0), 'Team A': teamA.reduce((s,m) => s+m.subscriptionAmount,0), 'Team B': teamB.reduce((s,m) => s+m.subscriptionAmount,0) },
    { 'Summary': 'Subscription Collected (₹)', 'Overall': members.filter(m=>m.subscriptionPaid).reduce((s,m)=>s+m.subscriptionAmount,0), 'Team A': teamA.filter(m=>m.subscriptionPaid).reduce((s,m)=>s+m.subscriptionAmount,0), 'Team B': teamB.filter(m=>m.subscriptionPaid).reduce((s,m)=>s+m.subscriptionAmount,0) },
    { 'Summary': 'Total Match Fees (₹)', 'Overall': members.reduce((s,m)=>s+m.matchFees,0), 'Team A': teamA.reduce((s,m)=>s+m.matchFees,0), 'Team B': teamB.reduce((s,m)=>s+m.matchFees,0) },
    { 'Summary': 'Match Fees Collected (₹)', 'Overall': members.filter(m=>m.matchFeesPaid).reduce((s,m)=>s+m.matchFees,0), 'Team A': teamA.filter(m=>m.matchFeesPaid).reduce((s,m)=>s+m.matchFees,0), 'Team B': teamB.filter(m=>m.matchFeesPaid).reduce((s,m)=>s+m.matchFees,0) },
    { 'Summary': 'Total Wins', 'Overall': members.reduce((s,m)=>s+m.wins,0), 'Team A': teamA.reduce((s,m)=>s+m.wins,0), 'Team B': teamB.reduce((s,m)=>s+m.wins,0) },
    { 'Summary': 'Total Losses', 'Overall': members.reduce((s,m)=>s+m.losses,0), 'Team A': teamA.reduce((s,m)=>s+m.losses,0), 'Team B': teamB.reduce((s,m)=>s+m.losses,0) },
  ];
  const ws2 = XLSX.utils.json_to_sheet(summary);
  ws2['!cols'] = [{ wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Summary');

  XLSX.writeFile(wb, `${filename}_${new Date().toLocaleDateString('en-IN').replace(/\//g,'-')}.xlsx`);
};
