// Tạo tai-lieu/CHUC-NANG-NGAN-GON.docx — bảng ngắn: tên chức năng, tác dụng, loại tài khoản dùng được.
//   node scripts/tao-tai-lieu-ngan.cjs [đường-dẫn-ra]
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, BorderStyle, WidthType, ShadingType
} = require('docx');

const FONT = 'Times New Roman', MAU = '3B3FD8';
const run = (t, o) => new TextRun(Object.assign({ text: t, font: FONT, size: 22 }, o || {}));
const vien = { style: BorderStyle.SINGLE, size: 4, color: '999999' };
const viens = { top: vien, bottom: vien, left: vien, right: vien };

const cot = [2500, 4338, 900, 950, 950];   // tổng 9638
const cell = (t, i, o) => {
  o = o || {};
  return new TableCell({
    width: { size: cot[i], type: WidthType.DXA }, borders: viens,
    columnSpan: o.span,
    shading: o.nen ? { fill: o.nen, type: ShadingType.CLEAR, color: 'auto' } : undefined,
    margins: { top: 50, bottom: 50, left: 90, right: 90 },
    children: [new Paragraph({
      alignment: o.giua ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [run(t, { bold: !!o.dam, size: o.co || 21, color: o.mau })]
    })]
  });
};
const dau = new TableRow({
  tableHeader: true,
  children: ['Chức năng', 'Tác dụng', 'Phụ huynh', 'Cán bộ lớp', 'GVCN'].map((t, i) => cell(t, i, { nen: 'DDE0FA', dam: true, giua: i > 1 || i === 0 }))
});
const nhom = (t) => new TableRow({
  children: [new TableCell({
    columnSpan: 5, width: { size: 9638, type: WidthType.DXA }, borders: viens,
    shading: { fill: 'EEEEF8', type: ShadingType.CLEAR, color: 'auto' }, margins: { top: 60, bottom: 60, left: 90, right: 90 },
    children: [new Paragraph({ children: [run(t, { bold: true, color: MAU, size: 23 })] })]
  })]
});
const Y = '✓', N = '';
const hang = (ten, td, ph, cb, gv) => new TableRow({
  cantSplit: true,
  children: [cell(ten, 0, { dam: true }), cell(td, 1), cell(ph, 2, { giua: true, mau: '12935A', dam: true, co: 24 }),
    cell(cb, 3, { giua: true, mau: '12935A', dam: true, co: 24 }), cell(gv, 4, { giua: true, mau: '12935A', dam: true, co: 24 })]
});

const rows = [dau,
  nhom('Chung'),
  hang('Đăng nhập / đăng xuất', 'Vào web bằng tên đăng nhập và mật khẩu; đóng tab là tự thoát.', Y, Y, Y),
  hang('Đổi mật khẩu của mình', 'Tự đặt mật khẩu riêng (bắt buộc ở lần đăng nhập đầu). Bấm tên ở góc phải trên.', Y, Y, Y),

  nhom('Phụ huynh'),
  hang('Kết quả của con', 'Xem điểm cộng/trừ theo tuần, xếp loại các tháng, học kỳ, cả năm của con mình; lọc theo tuần / tháng / cả năm. Chỉ thấy con mình.', Y, N, N),
  hang('Nhận xét', 'Đọc ghi chú của cô và cán bộ lớp trong bảng xếp loại tháng.', Y, N, N),

  nhom('Theo dõi cả lớp'),
  hang('Bảng lớp', 'Xếp loại cả lớp theo tháng, thống kê Tốt/Khá/Đạt/Chưa đạt, tìm theo tên.', N, Y, Y),
  hang('Chi tiết học sinh', 'Xem từng lượt cộng/trừ, xếp loại các tháng của bất kỳ học sinh nào.', N, Y, Y),
  hang('Xếp hạng', 'Bảng xếp hạng điểm thi đua theo tuần hoặc theo tháng, top 3 vinh danh.', N, Y, Y),
  hang('Tổng quan', 'Thống kê mọi lỗi trong tuần hoặc tháng (ngày 1 → cuối tháng): lỗi theo nhóm, lỗi phổ biến, theo học sinh, từng lượt.', N, Y, Y),

  nhom('Ghi sổ và đánh giá'),
  hang('Sổ thi đua', 'Chép lỗi / điểm cộng hằng ngày cho từng học sinh; web tự cộng trừ điểm. Xoá mục ghi nhầm (cán bộ lớp trong 7 ngày).', N, Y, Y),
  hang('Trang tuần', 'Tạo, sửa, xoá trang cho từng tuần học (tuần nghỉ thì bỏ qua).', N, Y, Y),
  hang('Chọn xếp loại tháng', 'Chọn Tốt/Khá/Đạt/Chưa đạt cho từng bạn, có nút điền theo gợi ý của máy.', N, Y, Y),
  hang('Đánh giá tháng', 'Bảng giống mẫu của trường: toàn bộ lỗi trong tháng, tự điền kết quả và ghi chú.', N, Y, Y),
  hang('Xuất Excel một tháng', 'Tải file Excel đúng bố cục mẫu của trường cho tháng đang xem.', N, Y, Y),

  nhom('Quản trị (chỉ GVCN)'),
  hang('Chốt / mở chốt tháng', 'Khoá tháng đã xong, không ai sửa được nữa; mở lại khi cần.', N, N, Y),
  hang('Xuất Excel cả năm', 'Tải file gồm tất cả các tháng cùng HK1, HK2 theo mẫu của trường.', N, N, Y),
  hang('Học sinh', 'Thêm danh sách lớp, sửa họ tên / chức vụ, đánh dấu bạn nghỉ hoặc chuyển.', N, N, Y),
  hang('Tài khoản', 'Tạo tài khoản phụ huynh cả lớp, in bảng phát; thêm cán bộ lớp; sửa; khoá / mở khoá.', N, N, Y),
  hang('Đặt lại mật khẩu', 'Đặt lại mật khẩu cho mọi tài khoản khác khi quên.', N, N, Y),
  hang('Cấu hình', 'Đổi ngưỡng điểm, trần ghi sổ, học kỳ, năm học…; số liệu tự cập nhật theo.', N, N, Y),
  hang('Danh mục lỗi', 'Sửa tên / điểm / mức của lỗi và điểm cộng, ẩn hoặc thêm mục mới.', N, N, Y),
  hang('Nhật ký', 'Xem ai đã làm gì, lúc nào (150 thao tác gần nhất).', N, N, Y),
  hang('Năm học mới', 'Tải bản sao lưu rồi dọn dữ liệu năm cũ để bắt đầu năm mới.', N, N, Y)
];

const doc = new Document({
  creator: 'So thi dua 10A0-K67', title: 'Chức năng — Sổ điện tử theo dõi thi đua',
  styles: { default: { document: { run: { font: FONT, size: 22 } } } },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1000, bottom: 1000, left: 1134, right: 1134 } } },
    children: [
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [run('SỔ ĐIỆN TỬ THEO DÕI THI ĐUA – HẠNH KIỂM', { size: 32, bold: true, color: MAU })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [run('Lớp 10A0-K67 · Danh sách chức năng và ai dùng được', { size: 22, italics: true })] }),
      new Paragraph({ spacing: { after: 160 }, children: [
        run('Ba loại tài khoản: ', { bold: true }), run('Phụ huynh (chỉ xem con mình) · Cán bộ lớp (lớp trưởng, lớp phó, thư ký — quyền ngang nhau) · GVCN (toàn quyền, có thêm Quản trị). ✓ = dùng được.')] }),
      new Table({ width: { size: 9638, type: WidthType.DXA }, columnWidths: cot, rows })
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  const out = process.argv[2] || path.join(__dirname, '..', 'tai-lieu', 'CHUC-NANG-NGAN-GON.docx');
  fs.writeFileSync(out, buf);
  console.log('Đã tạo ' + out);
});
