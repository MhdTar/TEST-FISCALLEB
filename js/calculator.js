function fmt(num) {
  return Math.round(num).toLocaleString('en-US') + ' LBP';
}

function runAllCalculations() {
  const salary = parseFloat(document.getElementById('master-salary').value) || 0;
  const status = document.getElementById('tax-status').value;
  // Max 5 children
  const kids = Math.min(Math.max(parseInt(document.getElementById('tax-kids').value) || 0, 0), 5);

  // --- 1. CNSS ---
  const medCeiling = 120000000;
  const medBase = Math.min(salary, medCeiling);
  const famCeiling = 28000000;
  const famBase = Math.min(salary, famCeiling);

  const empMed = medBase * 0.03;
  const patMed = medBase * 0.08;
  const patFam = famBase * 0.06;
  const patEos = salary * 0.085;

  let familyAllowancesPaid = 0;
  if (status === 'married_wife_doesnt_work' || status === 'married_husband_doesnt_work') {
    familyAllowancesPaid = 2100000 + (kids * 1155000);
  } else {
    familyAllowancesPaid = kids * 1155000;
  }

  document.getElementById('cnss-emp-med').innerText = fmt(empMed);
  document.getElementById('cnss-pat-med').innerText = fmt(patMed);
  document.getElementById('cnss-pat-fam').innerText = fmt(patFam);
  document.getElementById('cnss-pat-eos').innerText = fmt(patEos);
  document.getElementById('family-allowances-paid').innerText = fmt(familyAllowancesPaid);
  document.getElementById('cnss-emp-total').innerText = fmt(empMed);
  document.getElementById('cnss-pat-total').innerText = fmt(patMed + patFam + patEos);

  // --- 2. Payroll Tax ---
  let baseMonthlyDeduction = 450000000 / 12;
  if (status === 'married_wife_doesnt_work' || status === 'married_husband_doesnt_work') {
    baseMonthlyDeduction = 675000000 / 12;
  }

  const monthlyKidsAmount = (45000000 / 12) * kids;
  let totalDeduction = 0;
  if (status === 'married_wife_works' || status === 'married_husband_works') {
    totalDeduction = baseMonthlyDeduction + (monthlyKidsAmount / 2);
  } else {
    totalDeduction = baseMonthlyDeduction + monthlyKidsAmount;
  }

  const taxable = (salary > totalDeduction) ? (salary - totalDeduction) : 0;
  let tax = 0;
  const U4 = taxable;

  if (U4 <= 30000000) {
    tax = U4 * 0.02;
  } else if (U4 <= 75000000) {
    tax = (30000000 * 0.02) + ((U4 - 30000000) * 0.04);
  } else if (U4 <= 150000000) {
    tax = (30000000 * 0.02) + (45000000 * 0.04) + ((U4 - 75000000) * 0.07);
  } else if (U4 <= 300000000) {
    tax = (30000000 * 0.02) + (45000000 * 0.04) + (75000000 * 0.07) + ((U4 - 150000000) * 0.11);
  } else if (U4 <= 600000000) {
    tax = (30000000 * 0.02) + (45000000 * 0.04) + (75000000 * 0.07) + (150000000 * 0.11) + ((U4 - 300000000) * 0.15);
  } else if (U4 <= 1125000000) {
    tax = (30000000 * 0.02) + (45000000 * 0.04) + (75000000 * 0.07) + (150000000 * 0.11) + (300000000 * 0.15) + ((U4 - 600000000) * 0.2);
  } else {
    tax = (30000000 * 0.02) + (45000000 * 0.04) + (75000000 * 0.07) + (150000000 * 0.11) + (300000000 * 0.15) + (525000000 * 0.2) + ((U4 - 1125000000) * 0.25);
  }

  document.getElementById('tax-deduction').innerText = fmt(totalDeduction);
  document.getElementById('tax-taxable').innerText = fmt(taxable);
  document.getElementById('tax').innerText = fmt(tax);

  // --- 3. Grand totals ---
  // Net = Family Allowances Paid to Employee - Total Employee Deductions - Monthly Payroll Tax
  const totalEmployeeDeductions = empMed;
  const net = familyAllowancesPaid - totalEmployeeDeductions - tax;
  // Positive result -> Net Balance Due to Employee; negative -> Net Amount Payable by Employee (shown as a positive number)
  document.getElementById('grand-total-employee').innerText = fmt(net > 0 ? net : 0);
  document.getElementById('grand-total-obligation').innerText = fmt(net < 0 ? -net : 0);
  document.getElementById('grand-total-employer').innerText = fmt(patMed + patFam + patEos);
}

// ---------- Calculator switcher (dropdown on the home page) ----------
function switchCalculator(which) {
  const isPen = which === 'penalties';
  document.getElementById('calc-payroll').hidden = isPen;
  document.getElementById('calc-penalties').hidden = !isPen;
  document.getElementById('calc-title').textContent = isPen
    ? 'CNSS Penalties Calculator'
    : 'Payroll Tax & CNSS Calculator';
  if (isPen) runPenaltyCalculation();
}

// ---------- CNSS Penalties Calculator ----------
// Penalty = days late x (0.5 / 1000) x amount   (0.05% per day)
// amount  : amount to be paid (LBP)
// dueDate : original due date of the contributions (Date)
// payDate : payment date (Date)
function calcCnssPenalty(amount, dueDate, payDate) {
  const DAY = 24 * 60 * 60 * 1000;
  const days = Math.round((payDate - dueDate) / DAY);
  if (days <= 0) return 0; // paid on time or early: no penalty
  return days * (0.5 / 1000) * amount;
}

function runPenaltyCalculation() {
  const amount = parseFloat(document.getElementById('pen-amount').value) || 0;
  const dueVal = document.getElementById('pen-due').value;
  const payVal = document.getElementById('pen-paid').value;
  const out = document.getElementById('pen-result');
  if (!dueVal || !payVal) { out.value = fmt(0); return; }
  const penalty = calcCnssPenalty(amount, new Date(dueVal), new Date(payVal));
  out.value = fmt(penalty);
}

document.addEventListener('DOMContentLoaded', runAllCalculations);

// ---------- Dropdown menu behaviour ----------
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('calc-menu-btn');
  const list = document.getElementById('calc-menu-list');
  if (!btn || !list) return;
  const items = [...list.querySelectorAll('li')];

  const setOpen = (open) => {
    list.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
  };
  const choose = (li) => {
    items.forEach(i => i.setAttribute('aria-selected', String(i === li)));
    switchCalculator(li.dataset.value);
    setOpen(false);
    btn.focus();
  };

  btn.addEventListener('click', (e) => { e.stopPropagation(); setOpen(list.hidden); });
  items.forEach(li => {
    li.addEventListener('click', () => choose(li));
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(li); }
    });
  });
  document.addEventListener('click', (e) => { if (!list.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
});
