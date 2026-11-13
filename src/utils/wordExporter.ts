/**
 * Microsoft Word (.doc) Exporter for Bello Fam Executive F&B Reports
 * Formats an executive-grade Word document with standard A4 margins, letterhead,
 * financial KPI scorecard tables, menu/recipe tickets, primary materials audit matrix,
 * management logs, wastage logs, AI auditor forensics, and official sign-off certification blocks.
 */

interface WordReportParams {
  branchName: string;
  branchCode: string;
  selectedDate: string;
  ethiopianDateStr: string;
  selectedShift: string;
  managerName: string;
  totalCashierRevenue: number;
  totalChefRevenue: number;
  cashierVarianceEtb: number;
  totalTheoreticalCost: number;
  theoreticalFoodCostPct: number;
  actualConsumptionCost: number;
  netVarianceEtb: number;
  totalMgmtValue: number;
  totalDamageValue: number;
  aiDiagnosis: string;
  aiReasoning: string;
  menuRows: Array<{
    dishName: string;
    sellingPrice: number;
    chefQty: number;
    cashierQty: number;
    variance: number;
    varianceEtb: number;
    meaning: string;
  }>;
  itemRows: Array<{
    itemCode: string;
    itemName: string;
    countUnit: string;
    unitPrice: number;
    beginningCount: number;
    receivedQty: number;
    runningTotal: number;
    recipeUsageSales: number;
    recipeUsageMgmt: number;
    totalRecipeUsage: number;
    damageQty: number;
    transferOutQty: number;
    expectedEnding: number;
    actualEnding: number;
    varianceQty: number;
    varianceValueEtb: number;
    statusLabel: string;
  }>;
  managementEntries: Array<{
    dishName: string;
    quantity: number;
    beneficiary: string;
    reason: string;
    costEtb?: number;
  }>;
  damageEntries: Array<{
    itemName: string;
    quantity: number;
    unit: string;
    lossEtb: number;
    reason: string;
  }>;
  categoryBreakdown?: Array<{
    labelAm: string;
    itemCount: number;
    beginningValue: number;
    receivedValue: number;
    recipeUsageValue: number;
    expectedValue: number;
    actualValue: number;
    varianceValue: number;
  }>;
}

export function downloadWordDocument(params: WordReportParams): void {
  const {
    branchName,
    branchCode,
    selectedDate,
    ethiopianDateStr,
    selectedShift,
    managerName,
    totalCashierRevenue,
    totalChefRevenue,
    cashierVarianceEtb,
    totalTheoreticalCost,
    theoreticalFoodCostPct,
    actualConsumptionCost,
    netVarianceEtb,
    totalMgmtValue,
    totalDamageValue,
    aiDiagnosis,
    aiReasoning,
    menuRows,
    itemRows,
    managementEntries,
    damageEntries,
    categoryBreakdown = [],
  } = params;

  const docRef = `BF-FNB-${branchCode}-${selectedDate.replace(/-/g, '')}`;
  const shiftText =
    selectedShift === 'ALL_DAY'
      ? 'ሙሉ ቀን (Full Day)'
      : selectedShift === 'MORNING'
      ? 'የጠዋት ፈረቃ (Morning)'
      : 'የማታ ፈረቃ (Evening)';

  const htmlContent = `
    <!-- Letterhead -->
    <table style="width: 100%; border: none; margin-bottom: 12pt;">
      <tr>
        <td style="border: none; vertical-align: top; width: 65%;">
          <div style="font-size: 10pt; font-weight: bold; color: #b45309; text-transform: uppercase; letter-spacing: 1pt;">
            BELLO FAM RESTAURANT GROUP • የቤሎ ፋም ሬስቶራንት ግሩፕ
          </div>
          <div style="font-size: 16pt; font-weight: bold; color: #0f172a; margin-top: 2pt;">
            ይፋዊ የዕለታዊ የውሂብ ድብልቅ F&B ቁጥጥር፣ የሜኑ ሽያጭና የጥሬ ዕቃ ሪኮንሲሊየሽን ሪፖርት
          </div>
          <div style="font-size: 9.5pt; color: #64748b;">
            Executive Daily F&B Data Blend Control, Menu Reconciliation & Stock Variance Audit Report
          </div>
        </td>
        <td style="border: none; vertical-align: top; text-align: right; width: 35%;">
          <div style="font-size: 11pt; font-weight: bold; color: #0f172a;">${branchName} (${branchCode})</div>
          <div style="font-size: 9.5pt; color: #334155;">🇪🇹 ${ethiopianDateStr}</div>
          <div style="font-size: 9pt; color: #64748b;">G.C. ${selectedDate} • ${shiftText}</div>
          <div style="font-size: 8.5pt; font-family: monospace; color: #047857; margin-top: 2pt;">
            ሰነድ ቁጥር፦ ${docRef}
          </div>
        </td>
      </tr>
    </table>

    <hr style="border: none; border-top: 1.5pt solid #d97706; margin-bottom: 12pt;" />

    <!-- Executive Financial Scorecard Table -->
    <div style="font-size: 10.5pt; font-weight: bold; color: #0f172a; margin-bottom: 4pt;">
      1. የፋይናንስና የቁጥጥር ቁልፍ ማጠቃለያ (Executive Financial Scorecard)
    </div>
    <table style="width: 100%; margin-bottom: 12pt;">
      <tr style="background-color: #f8fafc;">
        <td style="width: 25%; padding: 6pt;">
          <div style="font-size: 8pt; color: #64748b; font-weight: bold;">የካሽየር POS ገቢ</div>
          <div style="font-size: 12pt; font-weight: bold; color: #047857;">${totalCashierRevenue.toFixed(2)} ብር</div>
          <div style="font-size: 7.5pt; color: #94a3b8;">የተመዘገበ ህጋዊ ሽያጭ</div>
        </td>
        <td style="width: 25%; padding: 6pt;">
          <div style="font-size: 8pt; color: #64748b; font-weight: bold;">የወጥ ቤት አቅም ገቢ</div>
          <div style="font-size: 12pt; font-weight: bold; color: #3730a3;">${totalChefRevenue.toFixed(2)} ብር</div>
          <div style="font-size: 7.5pt; color: #94a3b8;">በሼፎች የወጣ ጠቅላላ ምግብ</div>
        </td>
        <td style="width: 25%; padding: 6pt;">
          <div style="font-size: 8pt; color: #64748b; font-weight: bold;">ያልተመታ የቲኬት ልዩነት</div>
          <div style="font-size: 12pt; font-weight: bold; color: ${cashierVarianceEtb === 0 ? '#047857' : '#b91c1c'};">
            ${cashierVarianceEtb.toFixed(2)} ብር
          </div>
          <div style="font-size: 7.5pt; color: #94a3b8;">${cashierVarianceEtb === 0 ? 'ንጹህ ባላንስ ✓' : 'ከኩሽና ወጥቶ ያልተመታ 🚨'}</div>
        </td>
        <td style="width: 25%; padding: 6pt;">
          <div style="font-size: 8pt; color: #64748b; font-weight: bold;">ቲዎሪቲካል ሪሲፒ ወጪ</div>
          <div style="font-size: 12pt; font-weight: bold; color: #b45309;">${totalTheoreticalCost.toFixed(2)} ብር</div>
          <div style="font-size: 7.5pt; color: #b45309; font-weight: bold;">Food Cost: ${theoreticalFoodCostPct.toFixed(1)}%</div>
        </td>
      </tr>
      <tr style="background-color: #f8fafc;">
        <td style="width: 25%; padding: 6pt;">
          <div style="font-size: 8pt; color: #64748b; font-weight: bold;">ትክክለኛ ፍጆታ ወጪ</div>
          <div style="font-size: 12pt; font-weight: bold; color: #0f172a;">${actualConsumptionCost.toFixed(2)} ብር</div>
          <div style="font-size: 7.5pt; color: #94a3b8;">መነሻ + የገባ - ቆጠራ</div>
        </td>
        <td style="width: 25%; padding: 6pt;">
          <div style="font-size: 8pt; color: #64748b; font-weight: bold;">የተጣራ ጥሬ ዕቃ ልዩነት</div>
          <div style="font-size: 12pt; font-weight: bold; color: ${netVarianceEtb < -100 ? '#b91c1c' : '#047857'};">
            ${netVarianceEtb >= 0 ? '+' : ''}${netVarianceEtb.toFixed(2)} ብር
          </div>
          <div style="font-size: 7.5pt; color: #94a3b8;">${netVarianceEtb < 0 ? 'ከሪሲፒ በላይ የወጣ/የባከነ' : 'ንጹህ ስቶክ'}</div>
        </td>
        <td style="width: 25%; padding: 6pt;">
          <div style="font-size: 8pt; color: #64748b; font-weight: bold;">የማኔጅመንት መስተንግዶ</div>
          <div style="font-size: 12pt; font-weight: bold; color: #6b21a8;">${totalMgmtValue.toFixed(2)} ብር</div>
          <div style="font-size: 7.5pt; color: #94a3b8;">የሰራተኛና አመራር ምግብ</div>
        </td>
        <td style="width: 25%; padding: 6pt;">
          <div style="font-size: 8pt; color: #64748b; font-weight: bold;">የብልሽትና ስብራት ኪሳራ</div>
          <div style="font-size: 12pt; font-weight: bold; color: #b91c1c;">${totalDamageValue.toFixed(2)} ብር</div>
          <div style="font-size: 7.5pt; color: #94a3b8;">የወጥ ቤት ብክነትና ቆሻሻ</div>
        </td>
      </tr>
    </table>

    <!-- Auditor Narrative Summary -->
    <div style="background-color: #f1f5f9; border-left: 3pt solid #b45309; padding: 8pt; margin-bottom: 14pt;">
      <div style="font-size: 9.5pt; font-weight: bold; color: #0f172a; margin-bottom: 2pt;">
        የF&B ኦዲተር የሙያ ማጠቃለያና ትንታኔ (Executive Auditor Diagnosis):
      </div>
      <div style="font-size: 9pt; color: #334155; line-height: 1.4;">
        ${aiDiagnosis}
      </div>
      <div style="font-size: 8.5pt; color: #64748b; margin-top: 4pt;">
        <strong>የስሌት አመክንዮ፦</strong> ${aiReasoning}
      </div>
    </div>

    <!-- Executive Synthesized Category Breakdown -->
    ${
      categoryBreakdown && categoryBreakdown.length > 0
        ? `
    <div style="font-size: 10.5pt; font-weight: bold; color: #0f172a; margin-bottom: 4pt;">
      2. የተቀነባበረ የውሂብ ድብልቅ ማጠቃለያ በክፍልፋይ (Executive Synthesized Category Breakdown)
    </div>
    <table style="width: 100%; margin-bottom: 14pt;">
      <thead>
        <tr>
          <th>የዲፓርትመንት ክፍልፋይ (Category)</th>
          <th class="text-center">የእቃ ብዛት</th>
          <th class="text-right">መነሻ ዋጋ</th>
          <th class="text-right">የገባ ዋጋ</th>
          <th class="text-right">የሪሲፒ ፍጆታ</th>
          <th class="text-right">መገኘት የነበረበት</th>
          <th class="text-right">የተቆጠረ ዋጋ</th>
          <th class="text-right">የተጣራ ልዩነት</th>
        </tr>
      </thead>
      <tbody>
        ${categoryBreakdown
          .map(
            (c) => `
        <tr>
          <td><strong>${c.labelAm}</strong></td>
          <td class="text-center">${c.itemCount}</td>
          <td class="text-right">${c.beginningValue.toFixed(2)}</td>
          <td class="text-right">${c.receivedValue.toFixed(2)}</td>
          <td class="text-right" style="color: #3730a3; font-weight: bold;">${c.recipeUsageValue.toFixed(2)}</td>
          <td class="text-right" style="background-color: #fef3c7; font-weight: bold;">${c.expectedValue.toFixed(2)}</td>
          <td class="text-right" style="background-color: #d1fae5; font-weight: bold; color: #047857;">${c.actualValue.toFixed(2)}</td>
          <td class="text-right" style="font-weight: bold; color: ${c.varianceValue < -50 ? '#b91c1c' : c.varianceValue > 50 ? '#b45309' : '#047857'};">
            ${c.varianceValue >= 0 ? '+' : ''}${c.varianceValue.toFixed(2)} ብር
          </td>
        </tr>`
          )
          .join('')}
      </tbody>
      <tfoot>
        <tr style="background-color: #f1f5f9; font-weight: bold;">
          <td>አጠቃላይ ድምር</td>
          <td class="text-center">${categoryBreakdown.reduce((s, c) => s + c.itemCount, 0)}</td>
          <td class="text-right">${categoryBreakdown.reduce((s, c) => s + c.beginningValue, 0).toFixed(2)}</td>
          <td class="text-right">${categoryBreakdown.reduce((s, c) => s + c.receivedValue, 0).toFixed(2)}</td>
          <td class="text-right">${categoryBreakdown.reduce((s, c) => s + c.recipeUsageValue, 0).toFixed(2)}</td>
          <td class="text-right">${categoryBreakdown.reduce((s, c) => s + c.expectedValue, 0).toFixed(2)}</td>
          <td class="text-right" style="color: #047857;">${categoryBreakdown.reduce((s, c) => s + c.actualValue, 0).toFixed(2)}</td>
          <td class="text-right" style="color: #b91c1c;">${netVarianceEtb >= 0 ? '+' : ''}${netVarianceEtb.toFixed(2)} ብር</td>
        </tr>
      </tfoot>
    </table>
    `
        : ''
    }

    <!-- Section I: Menu Production vs POS Reconciliation -->
    <div style="font-size: 10.5pt; font-weight: bold; color: #0f172a; margin-bottom: 4pt;">
      3. ክፍል 1፦ የሜኑ ሽያጭና የካሽየር POS ማመሳከሪያ (Menu & POS Reconciliation)
    </div>
    <table>
      <thead>
        <tr>
          <th>የምግብ ስም</th>
          <th class="text-right">የአንዱ ዋጋ</th>
          <th class="text-right">የሼፍ ትእዛዝ (KOT)</th>
          <th class="text-right">የካሽየር POS</th>
          <th class="text-right">ልዩነት (+/-)</th>
          <th class="text-right">የገንዘብ ተጽዕኖ</th>
          <th>የኦዲት ሁኔታና ትርጉም</th>
        </tr>
      </thead>
      <tbody>
        ${menuRows
          .map(
            (m) => `
          <tr>
            <td><strong>${m.dishName}</strong></td>
            <td class="text-right">${m.sellingPrice.toFixed(2)}</td>
            <td class="text-right">${m.chefQty}</td>
            <td class="text-right">${m.cashierQty}</td>
            <td class="text-right" style="font-weight: bold; color: ${m.variance > 0 ? '#b91c1c' : m.variance < 0 ? '#b45309' : '#047857'};">
              ${m.variance > 0 ? '+' : ''}${m.variance}
            </td>
            <td class="text-right" style="font-weight: bold; color: #b91c1c;">
              ${m.variance > 0 ? m.varianceEtb.toFixed(2) + ' ብር' : '-'}
            </td>
            <td style="font-size: 8pt;">${m.meaning}</td>
          </tr>`
          )
          .join('')}
        ${
          menuRows.length === 0
            ? '<tr><td colspan="7" class="text-center" style="padding: 10pt; color: #94a3b8;">በዚህ ቀን ምንም የተመዘገበ የሜኑ ሽያጭ የለም።</td></tr>'
            : ''
        }
      </tbody>
      ${
        menuRows.length > 0
          ? `
      <tfoot>
        <tr style="background-color: #f1f5f9; font-weight: bold;">
          <td>አጠቃላይ ድምር</td>
          <td></td>
          <td class="text-right">${menuRows.reduce((s, r) => s + r.chefQty, 0)}</td>
          <td class="text-right">${menuRows.reduce((s, r) => s + r.cashierQty, 0)}</td>
          <td></td>
          <td class="text-right" style="color: #b91c1c;">${cashierVarianceEtb.toFixed(2)} ብር</td>
          <td></td>
        </tr>
      </tfoot>`
          : ''
      }
    </table>

    <!-- Section II: Primary Materials Matrix -->
    <div style="font-size: 10.5pt; font-weight: bold; color: #0f172a; margin-top: 14pt; margin-bottom: 4pt;">
      3. ክፍል 2፦ የዋና ዋና ጥሬ ዕቃዎች (Primary Materials) ሪኮንሲሊየሽንና የቆጠራ ኦዲት
    </div>
    <table>
      <thead>
        <tr>
          <th>የጥሬ ዕቃ ስም</th>
          <th class="text-right">ዋጋ (ብር)</th>
          <th class="text-center">መለኪያ</th>
          <th class="text-right">መነሻ</th>
          <th class="text-right">የገባ</th>
          <th class="text-right">አጠቃላይ መነሻ</th>
          <th class="text-right">የሪሲፒ ፍጆታ</th>
          <th class="text-right">ማኔጅመንት</th>
          <th class="text-right">ብልሽት</th>
          <th class="text-right" style="background-color: #fef3c7;">መገኘት የነበረበት</th>
          <th class="text-right" style="background-color: #d1fae5;">የጠዋት ቆጠራ</th>
          <th class="text-right">ልዩነት</th>
          <th class="text-right">በብር ልዩነት</th>
          <th class="text-center">ደረጃ</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows
          .map(
            (i) => `
          <tr>
            <td><strong>${i.itemName}</strong> <span style="font-size: 7.5pt; color: #94a3b8;">(${i.itemCode})</span></td>
            <td class="text-right">${i.unitPrice.toFixed(2)}</td>
            <td class="text-center">${i.countUnit}</td>
            <td class="text-right">${i.beginningCount}</td>
            <td class="text-right">${i.receivedQty}</td>
            <td class="text-right" style="font-weight: bold;">${i.runningTotal}</td>
            <td class="text-right">${i.recipeUsageSales}</td>
            <td class="text-right">${i.recipeUsageMgmt}</td>
            <td class="text-right">${i.damageQty}</td>
            <td class="text-right" style="background-color: #fef3c7; font-weight: bold;">${i.expectedEnding}</td>
            <td class="text-right" style="background-color: #d1fae5; font-weight: bold;">${i.actualEnding}</td>
            <td class="text-right" style="font-weight: bold; color: ${i.varianceQty < 0 ? '#b91c1c' : i.varianceQty > 0 ? '#b45309' : '#047857'};">
              ${i.varianceQty > 0 ? '+' : ''}${i.varianceQty}
            </td>
            <td class="text-right" style="font-weight: bold; color: #b91c1c;">
              ${i.varianceQty < 0 ? i.varianceValueEtb.toFixed(2) + ' ብር' : i.varianceQty > 0 ? '+' + i.varianceValueEtb.toFixed(2) + ' ብር' : '-'}
            </td>
            <td class="text-center" style="font-size: 8pt;">${i.statusLabel}</td>
          </tr>`
          )
          .join('')}
      </tbody>
      <tfoot>
        <tr style="background-color: #f1f5f9; font-weight: bold;">
          <td colspan="12">የተጣራ የጥሬ ዕቃ ልዩነት ጠቅላላ ድምር (Net Stock Shortage):</td>
          <td class="text-right" style="color: #b91c1c;">${itemRows.reduce((s, r) => (r.varianceQty < 0 ? s + r.varianceValueEtb : s), 0).toFixed(2)} ብር</td>
          <td></td>
        </tr>
      </tfoot>
    </table>

    <!-- Section III & IV: Management & Damage Logs -->
    <div style="font-size: 10.5pt; font-weight: bold; color: #0f172a; margin-top: 14pt; margin-bottom: 4pt;">
      4. ክፍል 3 & 4፦ የማኔጅመንት መስተንግዶ እና የወጥ ቤት ብክነት መዝገብ
    </div>
    <table style="width: 100%; border: none;">
      <tr>
        <td style="width: 50%; border: none; vertical-align: top; padding-right: 6pt;">
          <div style="font-size: 9.5pt; font-weight: bold; margin-bottom: 3pt;">የማኔጅመንት መስተንግዶ (Management Hospitality)</div>
          <table>
            <thead>
              <tr>
                <th>የምግብ ስም</th>
                <th class="text-right">ብዛት</th>
                <th>ተቀባይ / የፈቀደው</th>
                <th>ምክንያት</th>
              </tr>
            </thead>
            <tbody>
              ${managementEntries
                .map(
                  (m) => `
                <tr>
                  <td>${m.dishName}</td>
                  <td class="text-right" style="font-weight: bold;">${m.quantity}</td>
                  <td>${m.beneficiary}</td>
                  <td>${m.reason}</td>
                </tr>`
                )
                .join('')}
              ${
                managementEntries.length === 0
                  ? '<tr><td colspan="4" class="text-center" style="color: #94a3b8; font-size: 8pt;">ምንም የተመዘገበ መስተንግዶ የለም።</td></tr>'
                  : ''
              }
            </tbody>
          </table>
        </td>
        <td style="width: 50%; border: none; vertical-align: top; padding-left: 6pt;">
          <div style="font-size: 9.5pt; font-weight: bold; margin-bottom: 3pt;">የወጥ ቤት ብልሽትና ስብራት (Wastage & Damage)</div>
          <table>
            <thead>
              <tr>
                <th>የጥሬ ዕቃ ስም</th>
                <th class="text-right">ብዛት</th>
                <th class="text-right">ኪሳራ (ብር)</th>
                <th>ምክንያት / ማስታወሻ</th>
              </tr>
            </thead>
            <tbody>
              ${damageEntries
                .map(
                  (d) => `
                <tr>
                  <td>${d.itemName}</td>
                  <td class="text-right" style="font-weight: bold;">${d.quantity} ${d.unit}</td>
                  <td class="text-right" style="color: #b91c1c; font-weight: bold;">${d.lossEtb.toFixed(2)} ብር</td>
                  <td>${d.reason}</td>
                </tr>`
                )
                .join('')}
              ${
                damageEntries.length === 0
                  ? '<tr><td colspan="4" class="text-center" style="color: #94a3b8; font-size: 8pt;">ምንም አይነት የተበላሸ እቃ አልተመዘገበም።</td></tr>'
                  : ''
              }
            </tbody>
          </table>
        </td>
      </tr>
    </table>

    <!-- Section V: Sign-Off Certifications -->
    <div style="font-size: 10.5pt; font-weight: bold; color: #0f172a; margin-top: 14pt; margin-bottom: 4pt;">
      5. ክፍል 5፦ ይፋዊ የኦዲት ማጽደቂያ ፊርማዎች (Official Certification Sign-Off)
    </div>
    <table style="width: 100%; border-collapse: collapse; margin-top: 6pt;">
      <tr>
        <td style="width: 33.33%; border: 1pt solid #cbd5e1; padding: 8pt; vertical-align: top; background-color: #fafafa;">
          <div style="font-size: 9.5pt; font-weight: bold; color: #0f172a;">1. F&B ቁጥጥር ኦፊሰር (F&B Controller)</div>
          <div style="font-size: 8pt; color: #64748b; margin: 3pt 0 10pt 0;">
            የቀኑ የሜኑ ሽያጭ እና የጥሬ ዕቃዎች ቆጠራ በሬሲፒ ተሰልቶ ትክክለኛነቱ ተረጋግጧል።
          </div>
          <div style="font-size: 8.5pt; line-height: 1.8;">
            <div>ስም፦ _____________________________</div>
            <div>ፊርማ፦ ___________________________</div>
            <div>ቀን፦ ${selectedDate}</div>
          </div>
        </td>
        <td style="width: 33.33%; border: 1pt solid #cbd5e1; padding: 8pt; vertical-align: top; background-color: #fafafa;">
          <div style="font-size: 9.5pt; font-weight: bold; color: #0f172a;">2. የቅርንጫፍ ስራ አስኪያጅ (Branch Manager)</div>
          <div style="font-size: 8pt; color: #64748b; margin: 3pt 0 10pt 0;">
            በኩሽና የወጡ ምግቦች፣ የተቀበሉት እቃዎችና የተመዘገቡት ወጪዎች ትክክል መሆናቸውን አረጋግጣለሁ።
          </div>
          <div style="font-size: 8.5pt; line-height: 1.8;">
            <div>ስም፦ ${managerName}</div>
            <div>ፊርማ፦ ___________________________</div>
            <div>ቀን፦ ${selectedDate}</div>
          </div>
        </td>
        <td style="width: 33.33%; border: 1pt solid #cbd5e1; padding: 8pt; vertical-align: top; background-color: #fafafa;">
          <div style="font-size: 9.5pt; font-weight: bold; color: #0f172a;">3. የድርጅቱ ባለቤት / ጠቅላላ ስራ አስኪያጅ (Owner)</div>
          <div style="font-size: 8pt; color: #64748b; margin: 3pt 0 10pt 0;">
            ይፋዊው ሪፖርት ተገምግሞ በድርጅቱ የበላይ አመራር ዘንድ ተመዝግቧል።
          </div>
          <div style="font-size: 8.5pt; line-height: 1.8;">
            <div style="font-weight: bold; color: #b45309;">[  ] ጸድቋል ✓ &nbsp;&nbsp;&nbsp;&nbsp; [  ] ማጣራት ይደረግ</div>
            <div>ፊርማ፦ ___________________________</div>
            <div>ቀን፦ _____________________________</div>
          </div>
        </td>
      </tr>
    </table>

    <div style="font-size: 8pt; color: #94a3b8; text-align: center; margin-top: 14pt; border-top: 1pt solid #e2e8f0; padding-top: 6pt;">
      BELLO FAM RESTAURANT GROUP • OFFICIAL F&B CONTROL SYSTEM • 24-HOUR HOSPITALITY CYCLE
    </div>
  `;

  const wordDocumentHtml = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>Bello_Fam_FNB_Executive_Report_${branchCode}_${selectedDate}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page Section1 {
      size: 595.3pt 841.9pt; /* A4 Portrait */
      margin: 36.0pt 36.0pt 36.0pt 36.0pt;
      mso-header-margin: 18.0pt;
      mso-footer-margin: 18.0pt;
      mso-paper-source: 0;
    }
    div.Section1 { page: Section1; }
    body {
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.35;
      color: #111827;
      background-color: #ffffff;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10pt;
      font-size: 9pt;
    }
    th {
      background-color: #f1f5f9;
      color: #0f172a;
      font-weight: bold;
      border: 1pt solid #cbd5e1;
      padding: 5pt 6pt;
      text-align: left;
    }
    td {
      border: 1pt solid #e2e8f0;
      padding: 4.5pt 6pt;
      vertical-align: middle;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
  </style>
</head>
<body>
  <div class="Section1">
    ${htmlContent}
  </div>
</body>
</html>`;

  const blob = new Blob(['\ufeff', wordDocumentHtml], {
    type: 'application/msword;charset=utf-8',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Bello_Fam_FNB_Data_Blend_Owner_Report_${branchCode}_${selectedDate}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
