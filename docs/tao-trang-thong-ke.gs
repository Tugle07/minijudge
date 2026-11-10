/**
 * Tạo (hoặc tạo lại) tab "Thống kê" có biểu đồ cho bảng phân công BTL MiniJudge.
 * Cách dùng: Google Sheets → Tiện ích mở rộng → Apps Script → dán toàn bộ file này → Lưu → chọn hàm
 * taoTrangThongKe → Chạy (lần đầu Google hỏi cấp quyền cho chính bảng tính này).
 * Số liệu là công thức trỏ vào tab "Nhiệm vụ" nên tự cập nhật khi đổi Trạng thái; chỉ cần chạy lại khi muốn vẽ lại.
 */
function taoTrangThongKe() {
  const ss = SpreadsheetApp.getActive();
  const NAME = 'Thống kê';
  let sh = ss.getSheetByName(NAME);
  if (sh) {
    sh.getCharts().forEach(function (c) { sh.removeChart(c); });
    sh.clear();
  } else {
    sh = ss.insertSheet(NAME, 1);
  }
  sh.setHiddenGridlines(true);
  sh.getRange('A1:N80').setFontFamily('Arial').setFontSize(10).setVerticalAlignment('middle');

  const NV = "'Nhiệm vụ'!";
  const col = function (c) { return NV + '$' + c + '$2:$' + c + '$37'; };
  const DARK = '#1f2937', LIGHT = '#f3f4f6', ACCENT = '#4f46e5';

  const widths = [130, 95, 95, 95, 95, 24, 120, 90, 100, 90, 90, 80];
  widths.forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });

  sh.getRange('A1').setValue('THỐNG KÊ TIẾN ĐỘ — BTL MINIJUDGE').setFontSize(16).setFontWeight('bold').setFontColor(DARK);
  sh.getRange('A2').setValue('Tự tính từ tab Nhiệm vụ (tuần T1–T4, không tính Mở rộng) — không sửa tay')
    .setFontStyle('italic').setFontColor('#6b7280').setFontSize(9);

  // Ô số tổng quan
  const kpi = [
    ['Nhiệm vụ', '=COUNTIF(' + col('B') + ',"<>MR")', '0'],
    ['Đã xong', '=COUNTIFS(' + col('B') + ',"<>MR",' + col('L') + ',"Done")', '0'],
    ['Đang làm', '=COUNTIFS(' + col('B') + ',"<>MR",' + col('L') + ',"In Progress")', '0'],
    ['% xong (giờ)', '=IFERROR(SUMIFS(' + col('K') + ',' + col('B') + ',"<>MR",' + col('L') + ',"Done")/SUMIFS(' + col('K') + ',' + col('B') + ',"<>MR"),0)', '0%'],
    ['Còn (ngày)', '=MAX(0,DATE(2026,11,8)-TODAY())', '0'],
  ];
  kpi.forEach(function (k, i) {
    sh.getRange(4, i + 1).setValue(k[0]);
    sh.getRange(5, i + 1).setFormula(k[1]).setNumberFormat(k[2]);
  });
  header(sh.getRange('A4:E4'));
  sh.getRange('A5:E5').setFontSize(20).setFontWeight('bold').setFontColor(ACCENT).setBackground(LIGHT)
    .setHorizontalAlignment('center').setBorder(true, true, true, true, true, true, '#d1d5db', SpreadsheetApp.BorderStyle.SOLID);
  sh.setRowHeight(5, 46);

  // Bảng trạng thái
  sh.getRange('A7').setValue('Theo trạng thái').setFontWeight('bold').setFontSize(11);
  sh.getRange('A8:B8').setValues([['Trạng thái', 'Số việc']]);
  header(sh.getRange('A8:B8'));
  const states = ['To do', 'In Progress', 'Done', 'Blocked'];
  states.forEach(function (s, i) {
    const r = 9 + i;
    sh.getRange(r, 1).setValue(s);
    sh.getRange(r, 2).setFormula('=COUNTIFS(' + col('B') + ',"<>MR",' + col('L') + ',"' + s + '")');
  });
  body(sh.getRange('A9:B12'));

  // Bảng thành viên
  sh.getRange('G7').setValue('Theo thành viên (giờ)').setFontWeight('bold').setFontSize(11);
  sh.getRange('G8:L8').setValues([['Thành viên', 'Giờ giao', 'Giờ đã xong', 'Cơ bản', 'Nâng cao', '% xong']]);
  header(sh.getRange('G8:L8'));
  ['TV1', 'TV2', 'TV3', 'TV4'].forEach(function (m, i) {
    const r = 9 + i, g = 'G' + r;
    sh.getRange(r, 7).setValue(m).setFontWeight('bold');
    sh.getRange(r, 8).setFormula('=SUMIF(' + col('F') + ',' + g + ',' + col('K') + ')');
    sh.getRange(r, 9).setFormula('=SUMIFS(' + col('K') + ',' + col('F') + ',' + g + ',' + col('L') + ',"Done")');
    sh.getRange(r, 10).setFormula('=SUMIFS(' + col('K') + ',' + col('F') + ',' + g + ',' + col('O') + ',"*Cơ bản*")');
    sh.getRange(r, 11).setFormula('=SUMIFS(' + col('K') + ',' + col('F') + ',' + g + ',' + col('O') + ',"*Nâng cao*")');
    sh.getRange(r, 12).setFormula('=IFERROR(I' + r + '/H' + r + ',0)').setNumberFormat('0%');
  });
  body(sh.getRange('G9:L12'));

  // Bảng tuần
  sh.getRange('A14').setValue('Theo tuần').setFontWeight('bold').setFontSize(11);
  sh.getRange('A15:E15').setValues([['Tuần', 'Số việc', 'Đã xong', 'Giờ', '% xong']]);
  header(sh.getRange('A15:E15'));
  ['T1', 'T2', 'T3', 'T4', 'MR'].forEach(function (w, i) {
    const r = 16 + i, a = 'A' + r;
    sh.getRange(r, 1).setValue(w).setFontWeight('bold');
    sh.getRange(r, 2).setFormula('=COUNTIF(' + col('B') + ',' + a + ')');
    sh.getRange(r, 3).setFormula('=COUNTIFS(' + col('B') + ',' + a + ',' + col('L') + ',"Done")');
    sh.getRange(r, 4).setFormula('=SUMIF(' + col('B') + ',' + a + ',' + col('K') + ')');
    sh.getRange(r, 5).setFormula('=IFERROR(SUMIFS(' + col('K') + ',' + col('B') + ',' + a + ',' + col('L') + ',"Done")/D' + r + ',0)')
      .setNumberFormat('0%');
  });
  body(sh.getRange('A16:E20'));

  // Biểu đồ
  const base = function (type, range, title, colors) {
    return sh.newChart().setChartType(type).addRange(range)
      .setOption('title', title)
      .setOption('titleTextStyle', { fontSize: 13, bold: true, color: DARK })
      .setOption('colors', colors)
      .setOption('legend', { position: 'bottom' })
      .setOption('backgroundColor', '#ffffff')
      .setOption('fontName', 'Arial');
  };

  sh.insertChart(base(Charts.ChartType.PIE, sh.getRange('A8:B12'), 'Trạng thái nhiệm vụ',
    ['#9ca3af', '#f59e0b', '#10b981', '#ef4444'])
    .setOption('pieHole', 0.55).setOption('pieSliceText', 'value')
    .setOption('width', 430).setOption('height', 300)
    .setPosition(23, 1, 0, 0).build());

  sh.insertChart(base(Charts.ChartType.COLUMN, sh.getRange('G8:I12'), 'Giờ giao & đã xong theo thành viên',
    ['#c7d2fe', ACCENT])
    .setOption('vAxis', { title: 'Giờ', gridlines: { color: '#eeeeee' } })
    .setOption('width', 560).setOption('height', 300)
    .setPosition(23, 7, 0, 0).build());

  sh.insertChart(base(Charts.ChartType.COLUMN, sh.getRange('A15:C20'), 'Số việc & đã xong theo tuần',
    ['#fde68a', '#10b981'])
    .setOption('vAxis', { gridlines: { color: '#eeeeee' } })
    .setOption('width', 430).setOption('height', 300)
    .setPosition(40, 1, 0, 0).build());

  const lvRange = sh.getRange('G8:G12');
  sh.insertChart(base(Charts.ChartType.BAR, lvRange, 'Mức độ công việc theo thành viên (giờ)', ['#34d399', '#f472b6'])
    .addRange(sh.getRange('J8:K12'))
    .setOption('isStacked', true)
    .setOption('hAxis', { title: 'Giờ', gridlines: { color: '#eeeeee' } })
    .setOption('width', 560).setOption('height', 300)
    .setPosition(40, 7, 0, 0).build());

  ss.setActiveSheet(sh);
  ss.toast('Đã tạo tab "Thống kê"', 'Xong ✔', 5);

  function header(r) {
    r.setBackground(DARK).setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center')
      .setBorder(true, true, true, true, true, true, '#d1d5db', SpreadsheetApp.BorderStyle.SOLID);
  }
  function body(r) {
    r.setHorizontalAlignment('center')
      .setBorder(true, true, true, true, true, true, '#d1d5db', SpreadsheetApp.BorderStyle.SOLID);
  }
}
