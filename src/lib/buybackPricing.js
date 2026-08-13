export function calculateBuybackPrice(basePrice, answers, rules) {
  let price = basePrice;
  const applied = [];
  for (const rule of rules) {
    const answer = answers[rule.question_key];
    if (answer !== rule.answer_key) continue;
    const before = price;
    price = rule.deduction_type === "percent"
      ? price * (1 - rule.deduction_value / 100)
      : price - rule.deduction_value;
    applied.push({ label: rule.label, before, after: price });
  }
  return { price: Math.max(0, Math.round(price)), applied };
}
