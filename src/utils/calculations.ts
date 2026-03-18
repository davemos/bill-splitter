import type {
  BillState,
  BillSummary,
  Person,
  MenuItem,
  PersonConsumption,
  PersonPayment,
  PersonItemShare,
  CoveredDetail,
} from '../types';

// ─── Item-level helpers ───────────────────────────────────────────────────────

function getItemAssignees(item: MenuItem, allPeople: Person[]): Person[] {
  if (item.splitMode === 'all' || item.assignedTo.length === 0) {
    return allPeople;
  }
  return allPeople.filter((p) => item.assignedTo.includes(p.id));
}

// ─── Proportional distribution ────────────────────────────────────────────────

function distributeProportionally(
  amount: number,
  personSubtotals: Map<string, number>,
  grandSubtotal: number
): Map<string, number> {
  const result = new Map<string, number>();
  if (grandSubtotal === 0 || amount === 0) {
    personSubtotals.forEach((_, id) => result.set(id, 0));
    return result;
  }
  personSubtotals.forEach((subtotal, id) => {
    result.set(id, amount * (subtotal / grandSubtotal));
  });
  return result;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function computeBillSummary(state: BillState): BillSummary {
  const { people, items, extras, coverages } = state;
  const personalTips: Record<string, number> = state.personalTips ?? {};

  // 1. Per-person item subtotals
  const personSubtotals = new Map<string, number>();
  people.forEach((p) => personSubtotals.set(p.id, 0));

  const consumptionMap = new Map<string, PersonConsumption>(
    people.map((p) => [
      p.id,
      {
        personId: p.id,
        personName: p.name,
        itemShares: [] as PersonItemShare[],
        subtotal: 0,
        taxShare: 0,
        tipShare: 0,
        discountShare: 0,
        total: 0,
      },
    ])
  );

  let grandSubtotal = 0;

  items.forEach((item) => {
    const assignees = getItemAssignees(item, people);
    if (assignees.length === 0) return;
    const sharePerPerson = item.price / assignees.length;
    assignees.forEach((person) => {
      const c = consumptionMap.get(person.id);
      if (!c) return;
      c.itemShares.push({
        itemId: item.id,
        itemName: item.name,
        shareAmount: sharePerPerson,
      });
      c.subtotal += sharePerPerson;
      personSubtotals.set(
        person.id,
        (personSubtotals.get(person.id) ?? 0) + sharePerPerson
      );
    });
    grandSubtotal += item.price;
  });

  // 2. Tip amount
  const tipAmount =
    extras.tipMode === 'percentage'
      ? grandSubtotal * (extras.tipValue / 100)
      : extras.tipValue;

  // 3. Total discounts
  const totalDiscount = extras.discounts.reduce((sum, d) => sum + d.amount, 0);

  // 4. Distribute tax, tip, discounts proportionally
  const taxDist = distributeProportionally(
    extras.taxAmount,
    personSubtotals,
    grandSubtotal
  );
  const tipDist = distributeProportionally(
    tipAmount,
    personSubtotals,
    grandSubtotal
  );
  const discountDist = distributeProportionally(
    totalDiscount,
    personSubtotals,
    grandSubtotal
  );

  // 5. Finalize consumption totals
  consumptionMap.forEach((c, id) => {
    c.taxShare = taxDist.get(id) ?? 0;
    c.tipShare = tipDist.get(id) ?? 0;
    c.discountShare = discountDist.get(id) ?? 0;
    c.total = c.subtotal + c.taxShare + c.tipShare - c.discountShare;
  });

  // 6. Initialize payment records
  const paymentMap = new Map<string, PersonPayment>(
    people.map((p) => {
      const c = consumptionMap.get(p.id)!;
      return [
        p.id,
        {
          personId: p.id,
          personName: p.name,
          itemShares: c.itemShares,
          itemsSubtotal: c.subtotal,
          taxShare: c.taxShare,
          tipShare: c.tipShare,
          discountShare: c.discountShare,
          consumptionTotal: c.total,
          personalTip: personalTips[p.id] ?? 0,
          coveredByOthers: 0,
          coveredBy: null,
          covering: [] as CoveredDetail[],
          amountOwed: c.total + (personalTips[p.id] ?? 0),
        },
      ];
    })
  );

  // 7. Apply coverages
  coverages.forEach(({ coveredPersonId, coveringPersonId }) => {
    const covered = paymentMap.get(coveredPersonId);
    const covering = paymentMap.get(coveringPersonId);
    const coveredConsumption = consumptionMap.get(coveredPersonId);
    if (!covered || !covering || !coveredConsumption) return;

    const amount = coveredConsumption.total;
    covered.coveredByOthers += amount;
    covered.coveredBy = covering.personName;
    covered.amountOwed -= amount;

    covering.covering.push({
      forPersonId: coveredPersonId,
      forPersonName: covered.personName,
      amount,
    });
    covering.amountOwed += amount;
  });

  const grandTotal =
    grandSubtotal + extras.taxAmount + tipAmount - totalDiscount;

  return {
    subtotal: grandSubtotal,
    taxAmount: extras.taxAmount,
    tipAmount,
    totalDiscount,
    grandTotal,
    perPerson: Array.from(paymentMap.values()),
  };
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  return `$${Math.abs(amount).toFixed(2)}`;
}
