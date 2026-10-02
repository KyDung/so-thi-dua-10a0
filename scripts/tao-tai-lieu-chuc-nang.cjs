// Tạo tai-lieu/MO-TA-CHUC-NANG.docx — mô tả chức năng theo từng nhóm người dùng.
//   node scripts/tao-tai-lieu-chuc-nang.cjs
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, LevelFormat,
  BorderStyle, WidthType, ShadingType, PageBreak, Footer, PageNumber, TableOfContents
} = require('docx');

const FONT = 'Times New Roman';
const MAU = '3B3FD8';
const W = 9638;   // A4, lề 2 cm, DXA

const run = (t, o) => new TextRun(Object.assign({ text: t, font: FONT, size: 26 }, o || {}));
const p = (t, o) => new Paragraph({ spacing: { after: 100, line: 300 }, children: Array.isArray(t) ? t : [run(t)], ...(o || {}) });
const b = (t) => run(t, { bold: true });
const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun({ text: t, font: FONT })] });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: t, font: FONT })] });
const h3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: t, font: FONT })] });
const li = (t, nho) => new Paragraph({
  numbering: { reference: 'bullets', level: nho ? 1 : 0 }, spacing: { after: 60, line: 290 },
  children: Array.isArray(t) ? t : [run(t)]
});
const lb = (nhan, nd) => li([b(nhan + ': '), run(nd)]);
const so = (t) => new Paragraph({ numbering: { reference: 'steps', level: 0 }, spacing: { after: 60, line: 290 }, children: Array.isArray(t) ? t : [run(t)] });

const vien = { style: BorderStyle.SINGLE, size: 4, color: '999999' };
const viens = { top: vien, bottom: vien, left: vien, right: vien };
const cell = (t, w, o) => {
  o = o || {};
  return new TableCell({
    width: { size: w, type: WidthType.DXA }, borders: viens,
    shading: o.nen ? { fill: o.nen, type: ShadingType.CLEAR, color: 'auto' } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: String(t).split('\n').map(x => new Paragraph({
      alignment: o.giua ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [run(x, { size: 22, bold: !!o.dam, color: o.mau })]
    }))
  });
};
const bang = (cols, dau, dong) => new Table({
  width: { size: cols.reduce((a, c) => a + c, 0), type: WidthType.DXA }, columnWidths: cols,
  rows: [new TableRow({ tableHeader: true, children: dau.map((t, i) => cell(t, cols[i], { nen: 'DDE0FA', dam: true, giua: true })) })]
    .concat(dong.map(r => new TableRow({ children: r.map((t, i) => cell(t, cols[i], { giua: i > 0 && String(t).length <= 3 })) })))
});
const kc = () => new Paragraph({ spacing: { after: 120 }, children: [] });

const noiDung = [];
const them = (...x) => x.forEach(i => Array.isArray(i) ? noiDung.push(...i) : noiDung.push(i));

// ------------------------------------------------------------------ Trang bìa
them(
  new Paragraph({ spacing: { before: 2400 }, alignment: AlignmentType.CENTER, children: [run('SỔ ĐIỆN TỬ THEO DÕI THI ĐUA – HẠNH KIỂM', { size: 40, bold: true, color: MAU })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [run('Lớp 10A0-K67 · Trường THPT Xuân Đỉnh', { size: 30 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 600 }, children: [run('TÀI LIỆU MÔ TẢ CHỨC NĂNG', { size: 34, bold: true })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [run('Chức năng chung · Phụ huynh · Cán bộ lớp · Giáo viên chủ nhiệm', { size: 26, italics: true })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 3000 }, children: [run('Năm học 2026 – 2027', { size: 26 })] }),
  new Paragraph({ children: [new PageBreak()] }),
  new Paragraph({ spacing: { after: 200 }, children: [run('MỤC LỤC', { size: 30, bold: true, color: MAU })] }),
  new TableOfContents('Mục lục', { hyperlink: true, headingStyleRange: '1-2' })
);

// ------------------------------------------------------------------ 1. Tổng quan
them(
  h1('1. Giới thiệu chung'),
  h2('1.1. Mục đích'),
  p('Web là sổ điện tử của lớp, giúp cán bộ lớp chép lại lỗi vi phạm và điểm cộng/trừ từ sổ chính để phụ huynh tiện theo dõi. ' +
    'Khi có chênh lệch, đối chiếu với sổ chính tại lớp hoặc với giáo viên chủ nhiệm (GVCN). Xếp loại rèn luyện (Tốt / Khá / Đạt / Chưa đạt) ' +
    'do cán bộ lớp hoặc GVCN chọn theo kết quả đã thống nhất; các phép tính của web chỉ hỗ trợ theo dõi và đưa ra gợi ý.'),
  h2('1.2. Ba nhóm người dùng'),
  bang([2000, 2400, 5238], ['Nhóm', 'Tài khoản', 'Vai trò tóm tắt'], [
    ['Phụ huynh', 'Mỗi học sinh một tài khoản', 'Chỉ xem kết quả của đúng con mình'],
    ['Cán bộ lớp\n(lớp trưởng, lớp phó, thư ký…)', 'Do GVCN tạo', 'Xem và ghi cho cả lớp; tạo trang tuần; chọn xếp loại tháng. Mọi cán bộ lớp có quyền như nhau'],
    ['GVCN', 'Tài khoản quản trị', 'Toàn quyền, thêm khu vực Quản trị']
  ]),
  kc(),
  p([b('Lưu ý: '), run('hệ thống chỉ có 3 vai trò. Mọi cán bộ lớp (lớp trưởng, lớp phó, thư ký…) có quyền ngang nhau; chức danh cụ thể chỉ là tên hiển thị do GVCN đặt. Cán bộ lớp không vào được khu Quản trị.')]),
  h2('1.3. Cách hoạt động'),
  li('Web chạy trên trình duyệt (điện thoại hoặc máy tính), không cần cài đặt.'),
  li('Dữ liệu lưu trên Firebase (Authentication + Firestore). Quyền truy cập do bộ quy tắc bảo mật của Firestore kiểm soát, không chỉ dựa vào giao diện.'),
  li('Mọi thao tác ghi/sửa/xoá đều được lưu vết (ai làm gì, lúc nào); mục bị xoá chỉ đổi trạng thái, không mất hẳn.')
);

// ------------------------------------------------------------------ 2. Chung
them(
  h1('2. Chức năng chung (mọi người dùng)'),
  h2('2.1. Đăng nhập'),
  li('Nhập tên đăng nhập và mật khẩu. Có nút hiện/ẩn mật khẩu.'),
  li('Tên đăng nhập phụ huynh: họ tên con viết liền, không dấu + đuôi lớp (ví dụ nguyenvanana0k67). Mật khẩu ban đầu: họ tên con viết liền, không dấu + số 1.'),
  li('Chưa đăng nhập thì chỉ thấy trang đăng nhập; không xem được tên hay kết quả của học sinh nào.'),
  li('Phiên đăng nhập chỉ giữ trong tab hiện tại: đóng tab là tự thoát (an toàn cho máy dùng chung).'),
  li('Sai tên đăng nhập hoặc mật khẩu: báo lỗi chung, không tiết lộ tài khoản có tồn tại hay không. Tài khoản bị khoá không đăng nhập được.'),
  h2('2.2. Đổi mật khẩu lần đầu (bắt buộc với tài khoản mới)'),
  p('Tài khoản vừa được cấp (hoặc vừa được GVCN đặt lại mật khẩu có tích “bắt đổi”) sẽ bị chuyển thẳng tới màn hình đặt mật khẩu riêng; chưa đổi thì chưa vào được chức năng khác.'),
  h2('2.3. Tự đổi mật khẩu'),
  so('Bấm vào tên mình ở góc phải phía trên.'),
  so('Chọn “Đổi mật khẩu”.'),
  so('Nhập mật khẩu hiện tại, mật khẩu mới (từ 6 ký tự) và nhập lại. Mật khẩu mới phải khác mật khẩu cũ.'),
  p('Mọi vai trò (phụ huynh, cán bộ lớp, GVCN) đều tự đổi được mật khẩu của chính mình.'),
  h2('2.4. Đăng xuất'),
  p('Bấm vào tên ở góc phải → “Đăng xuất”. Nếu đang có nội dung chưa lưu, web hỏi xác nhận trước khi rời đi.'),
  h2('2.5. Giao diện'),
  li('Tự thích ứng điện thoại / máy tính: trên điện thoại thanh điều hướng nằm ở cuối màn hình và cuộn ngang được; trên máy tính nằm ở thanh trên.'),
  li('Tự đổi chế độ sáng / tối theo cài đặt của máy.'),
  li('Thông báo ngắn hiện ở dưới màn hình khi lưu thành công hoặc có lỗi; thao tác nguy hiểm (xoá, chốt, khoá tài khoản) luôn có hộp xác nhận.'),
  li('Nếu đang nhập dở mà bấm sang màn hình khác hoặc đóng trang, web nhắc “còn nội dung chưa lưu”.'),
  h2('2.6. Phân loại và nhóm lỗi'),
  p('Các lỗi trong danh mục thuộc ba mức, ảnh hưởng đến xếp loại tháng:'),
  li([b('Nhỏ: '), run('chỉ bị trừ điểm.')]),
  li([b('Hạ bậc: '), run('mỗi lỗi hạ xếp loại tháng một bậc.')]),
  li([b('Chưa đạt (nghiêm trọng): '), run('tháng đó xếp loại Chưa đạt.')])
);

// ------------------------------------------------------------------ 3. Phụ huynh
them(
  h1('3. Chức năng dành cho Phụ huynh'),
  p('Sau khi đăng nhập, phụ huynh vào thẳng trang “Kết quả của con”. Đây là trang duy nhất phụ huynh có; không thấy học sinh khác và không có công cụ quản lý.'),
  h2('3.1. Chọn khoảng thời gian xem'),
  p('Ô “Xem theo” cho chọn:'),
  li('Cả năm học;'),
  li('Từng tháng (tháng 9 → tháng 5);'),
  li('Từng tuần (mỗi trang tuần hiện kèm khoảng ngày).'),
  p('Mặc định mở tháng của tuần hiện tại.'),
  h2('3.2. Số liệu tổng hợp'),
  li('Điểm thi đua của khoảng đang xem (đã tính cả quy tắc “tái phạm trong cùng tuần trừ gấp đôi”).'),
  li('Số lượt vi phạm và số lượt được cộng điểm.'),
  h2('3.3. Chi tiết theo từng tuần'),
  li('Mỗi tuần một thẻ, tuần mới nhất ở trên cùng; đầu thẻ ghi khoảng ngày, điểm của tuần và xếp loại tuần.'),
  li('Chia hai cột “Điểm cộng” và “Điểm trừ”. Mỗi mục ghi: tên lỗi/việc tốt, ngày, môn học (nếu có), nhóm lỗi, ghi chú, số điểm.'),
  li('Các lỗi nặng có huy hiệu “hạ 1 bậc” hoặc “nghiêm trọng”.'),
  li('Tuần không có mục nào hiện gọn “Không có mục nào”.'),
  h2('3.4. Xếp loại các tháng'),
  p('Bảng gồm: tháng, xếp loại (Tốt/Khá/Đạt/Chưa đạt), điểm trung bình, số lần bị ghi sổ đầu bài, số lỗi hạ bậc, nhận xét của GVCN / cán bộ lớp, và tình trạng “đã chốt” hoặc “tạm tính”.'),
  li('“Tạm tính”: tháng còn đang cập nhật, kết quả có thể thay đổi.'),
  li('“Đã chốt”: GVCN đã khoá tháng, kết quả là chính thức.'),
  h2('3.5. Xếp loại học kỳ và cả năm'),
  p('Hiện xếp loại HK1, HK2 và cả năm, kèm “(dự kiến)” cho đến khi có kết quả chính thức.'),
  h2('3.6. Những điều phụ huynh không làm được'),
  li('Không xem được học sinh khác, bảng xếp hạng cả lớp hay tổng quan lớp.'),
  li('Không ghi, sửa hay xoá bất kỳ dữ liệu nào; không xuất file Excel.'),
  li('Quên mật khẩu: nhắn GVCN để được đặt lại.')
);

// ------------------------------------------------------------------ 4. Cán bộ lớp
them(
  h1('4. Chức năng dành cho Cán bộ lớp'),
  p('Gồm lớp trưởng, lớp phó, thư ký… — mọi tài khoản cán bộ lớp có quyền như nhau. Thanh điều hướng có 6 mục: Bảng lớp, Chi tiết, Xếp hạng, Tổng quan, Đánh giá và Sổ thi đua. Cán bộ lớp không có tab Quản trị.'),
  h2('4.1. Bảng lớp'),
  li('Chọn tháng bằng nút T9…T5. Hiện số học sinh Tốt / Khá / Đạt / Chưa đạt / Chưa xếp, kèm thanh tỉ lệ.'),
  li('Danh sách lớp: xếp loại, điểm trung bình, số lần ghi sổ đầu bài, số lỗi hạ bậc. Có ô tìm theo tên.'),
  li('Bấm vào tên để xem chi tiết học sinh đó.'),
  li([b('Chọn xếp loại: '), run('chọn xếp loại từng bạn ở ô thả xuống; cột “Gợi ý” là kết quả máy tính sẵn; nút “Điền theo gợi ý” điền nhanh cả lớp rồi sửa lại bạn cần; bấm “Lưu xếp loại”. Chọn tay luôn có giá trị hơn gợi ý.')]),
  li('Tháng đã chốt thì khoá, không sửa được.'),
  h2('4.2. Chi tiết học sinh'),
  p('Chọn học sinh và khoảng thời gian (cả năm / tháng / tuần) để xem đầy đủ như phụ huynh: điểm cộng, điểm trừ từng tuần, xếp loại các tháng, học kỳ, cả năm.'),
  h2('4.3. Xếp hạng'),
  li('Nút chuyển “Theo tuần | Theo tháng”.'),
  li('Theo tuần: chọn trang tuần, xếp theo điểm cuối tuần (100 điểm đầu tuần, cộng trừ theo sổ) và hiện số lỗi.'),
  li('Theo tháng: xếp theo điểm trung bình các tuần trong tháng.'),
  li('Top 3 hiện dạng bục vinh danh; bấm vào tên để xem chi tiết.'),
  h2('4.4. Tổng quan'),
  p('Giúp nắm bắt nhanh tình hình lỗi của cả lớp trong một tuần hoặc một tháng.'),
  li('Chọn theo tuần (theo trang tuần) hoặc theo tháng dương lịch, tính từ ngày 1 đến ngày cuối tháng (28, 29, 30 hoặc 31 ngày tuỳ tháng).'),
  li('Số liệu: số lượt vi phạm, tổng điểm trừ, số lượt cộng, số bạn bị ghi lỗi trên sĩ số.'),
  li('Lỗi theo nhóm (kèm số lượt, tổng điểm) và 8 lỗi gặp nhiều nhất.'),
  li('Bảng theo học sinh, xếp theo số lỗi nhiều → ít.'),
  li('Bảng chi tiết từng lượt (ngày, học sinh, nội dung, môn, điểm, người ghi) có lọc “Tất cả / Chỉ lỗi / Chỉ điểm cộng” và ô tìm kiếm.'),
  h2('4.5. Đánh giá tháng'),
  p('Bảng giống mẫu của trường: mỗi học sinh một dòng gồm toàn bộ lỗi trong tháng (ngày 1 → ngày cuối), kết quả T/K/Đ/CĐ và ghi chú.'),
  li('Cán bộ lớp chọn kết quả và nhập ghi chú, dòng TỔNG tự cập nhật; có nút “Điền theo gợi ý” và “Lưu đánh giá”.'),
  li('Tháng đã chốt thì khoá, không sửa được nữa.'),
  li('Nút “Xuất Excel tháng N” tạo file đúng bố cục mẫu (xem mục 6.4). Cần lưu trước khi xuất.'),
  li('Kết quả và ghi chú ở đây dùng chung dữ liệu với Bảng lớp.'),
  h2('4.6. Sổ thi đua (ghi lỗi và điểm cộng)'),
  p('Đây là nơi cán bộ lớp chép sổ chính hằng ngày.'),
  h3('Chọn tuần và học sinh'),
  li('Chọn trang tuần và học sinh (có nút ‹ › chuyển nhanh sang bạn trước / sau).'),
  li('Khung bên phải cho biết điểm đầu tuần (100), tổng cộng, tổng trừ, điểm còn lại và xếp loại tuần của học sinh đó.'),
  h3('Thêm một mục'),
  so('Chọn ngày (trong khoảng của trang tuần), loại “Lỗi vi phạm” hoặc “Điểm cộng”.'),
  so('Chọn nội dung trong danh sách theo nhóm; web tự trừ/cộng điểm theo danh mục.'),
  so('Nhập môn học (bắt buộc với các mục cần môn) và ghi chú nếu cần.'),
  so('Không có trong danh sách: chọn “Lỗi khác” hoặc “Điểm cộng khác”, tự ghi nội dung và số điểm.'),
  so('Bấm “Thêm vào sổ”.'),
  p('Dòng gợi ý dưới ô nhập nhắc trước các quy tắc áp dụng: tái phạm trong tuần trừ gấp đôi, tính 1 lần ghi sổ đầu bài, hạ 1 bậc, Chưa đạt…'),
  h3('Danh sách đã ghi và xoá mục'),
  li('Bảng “Đã ghi trong tuần” liệt kê các mục theo ngày.'),
  li('Biểu tượng thùng rác để xoá mục ghi nhầm (có hộp xác nhận). Cán bộ lớp xoá được trong 7 ngày kể từ lúc ghi; sau đó chỉ GVCN xoá được. Mục xoá không còn tính điểm nhưng vẫn lưu vết.'),
  h3('Trang tuần'),
  li([b('Trang tuần mới: '), run('điền tuần thứ mấy, từ ngày – đến ngày, ghi chú. Web gợi ý sẵn tuần kế tiếp.')]),
  li([b('Tuần nghỉ Tết, nghỉ lễ: '), run('không cần tạo trang, cứ bỏ qua, số tuần vẫn liền mạch.')]),
  li([b('Sửa: '), run('đổi số tuần hoặc khoảng ngày; các mục đã ghi tự chuyển theo.')]),
  li([b('Xoá trang: '), run('chỉ xoá được khi trang chưa có mục nào.')]),
  li('Hệ thống chặn trùng số tuần, trùng ngày bắt đầu, hai trang chồng ngày, khoảng quá 14 ngày.'),
  h3('Khi tháng đã chốt'),
  p('Không thêm, không xoá, không sửa trang tuần liên quan; web báo rõ “Tháng N đã chốt”. Cần nhờ GVCN mở chốt.')
);

// ------------------------------------------------------------------ 5. GVCN
them(
  h1('5. Chức năng dành cho Giáo viên chủ nhiệm'),
  p('GVCN có toàn quyền: dùng được mọi chức năng của cán bộ lớp (mục 4.1 – 4.6, riêng việc xoá mục không bị giới hạn 7 ngày) và có thêm tab “Quản trị” gồm 6 mục nhỏ.'),
  h2('5.1. Quản trị → Chốt & xuất'),
  h3('Chốt tháng'),
  li('Chọn tháng rồi bấm “Chốt tháng”: web tính lại số liệu, rồi khoá tháng đó. Cán bộ lớp không ghi, xoá hay đổi xếp loại tháng đã chốt được nữa.'),
  li('Chốt nhầm: bấm “Mở chốt” để mở lại.'),
  h3('Đồng bộ số liệu'),
  p('Số liệu tự cập nhật ngay mỗi khi có người ghi, xoá mục, sửa trang tuần, đổi cấu hình hay mức điểm. Nút “Đồng bộ lại số liệu” chỉ dùng để sửa chữa khi nghi số liệu bị lệch (ví dụ mất mạng giữa chừng).'),
  h3('Xuất Excel'),
  li('“Xuất Excel CẢ NĂM học”: file gồm tất cả các tháng (mỗi tháng một sheet) cùng HK1 và HK2, theo mẫu của trường.'),
  li('Muốn xuất riêng một tháng: tab Đánh giá → “Xuất Excel tháng N”.'),
  h3('Bắt đầu năm học mới'),
  so('Nhập năm học mới (ví dụ 2027-2028) và tích xác nhận.'),
  so('Web tải về file sao lưu toàn bộ dữ liệu năm cũ (cần cất giữ file này).'),
  so('Sau khi xác nhận lần nữa, web xoá trang tuần, nhật ký, xếp loại tháng, nhật ký hệ thống của năm cũ và đổi năm học.'),
  p('Được giữ nguyên: danh mục lỗi, tài khoản, cấu hình, danh sách học sinh.'),
  h2('5.2. Quản trị → Học sinh'),
  li('Thêm học sinh: dán danh sách họ tên (mỗi dòng một tên); mã học sinh tự đánh số nối tiếp.'),
  li('Sửa họ tên, tổ, chức vụ, trạng thái (Đang học / Đã nghỉ, chuyển) rồi “Lưu thay đổi”. Cột tổ chỉ cần nếu lớp thi đua theo tổ.'),
  h2('5.3. Quản trị → Tài khoản'),
  li([b('Tạo tài khoản phụ huynh: '), run('tự tạo cho học sinh chưa có tài khoản; tên đăng nhập và mật khẩu ban đầu theo quy tắc ở mục 2.1. Chạy lại được nhiều lần (chỉ tạo phần còn thiếu); nút tự khoá và ghi “Đã đủ tài khoản phụ huynh” khi mọi học sinh đều đã có tài khoản.')]),
  li([b('In tài khoản phụ huynh: '), run('mở bảng tên đăng nhập + mật khẩu ban đầu để in, cắt rời phát riêng. Phụ huynh đã đổi mật khẩu thì ghi “(phụ huynh đã đổi)”.')]),
  li([b('Thêm cán bộ lớp: '), run('tên đăng nhập, họ tên, vai trò (Cán bộ lớp hoặc GVCN), mật khẩu ban đầu.')]),
  li([b('Sửa: '), run('đổi họ tên hiển thị và vai trò của bất kỳ tài khoản nào (không tự đổi vai trò của chính mình).')]),
  li([b('Đặt lại MK: '), run('đặt mật khẩu mới cho mọi tài khoản khác, có tuỳ chọn bắt đổi lại khi đăng nhập. Mật khẩu của chính GVCN thì đổi ở menu góc phải trên.')]),
  li([b('Khoá / Mở khoá: '), run('tài khoản bị khoá không đăng nhập được nhưng vẫn giữ lịch sử ai đã ghi gì.')]),
  h2('5.4. Quản trị → Cấu hình'),
  p('Sửa các thiết lập của lớp, lưu xong số liệu cả lớp tự cập nhật theo giá trị mới:'),
  li('Tên trường, tên lớp, năm học.'),
  li('Điểm đầu mỗi tuần (mặc định 100) và các ngưỡng xếp loại tuần: Tốt, Khá, Đạt.'),
  li('Tái phạm trong tuần có trừ gấp đôi hay không.'),
  li('Từ N lần ghi sổ đầu bài trở lên: không được Tốt / không được Khá (mặc định 3 và 5).'),
  li('Tự lấy xếp loại theo gợi ý khi chưa ai chọn tay.'),
  li('Số ngày cán bộ lớp được xoá mục đã ghi (mặc định 7).'),
  li('Các tháng thuộc học kỳ I và II.'),
  li('Hậu tố tên đăng nhập và ký tự cuối mật khẩu mặc định của phụ huynh.'),
  h2('5.5. Quản trị → Danh mục lỗi'),
  li('Sửa tên, mức điểm trừ/cộng, mức (nhỏ / hạ bậc / chưa đạt) của từng lỗi và điểm cộng.'),
  li('Bỏ tích “Hiện” để ẩn một mục khỏi ô chọn mà không mất dữ liệu cũ.'),
  li('“Thêm lỗi”, “Thêm điểm cộng” để bổ sung mục mới (mã, tên, nhóm, điểm, có cần môn, có tính ghi sổ đầu bài, có nhân đôi khi tái phạm).'),
  li('Đổi điểm hoặc mức thì số liệu cả lớp tự tính lại.'),
  h2('5.6. Quản trị → Nhật ký'),
  p('Liệt kê 150 thao tác gần nhất của toàn hệ thống: thời gian, người thực hiện, hành động (đăng nhập, thêm mục, xoá mục, chốt tháng, đặt lại mật khẩu…) và chi tiết. Dùng để truy vết ai đã làm gì.'),
  h2('5.7. Quyền GVCN trong các chức năng khác'),
  li('Chọn xếp loại tháng, điền ghi chú đánh giá, xuất Excel như cán bộ lớp.'),
  li('Tạo, sửa, xoá trang tuần; xoá mục đã ghi ở mọi thời điểm (miễn tháng chưa chốt).'),
  li('Xem mọi học sinh, mọi tổ.')
);

// ------------------------------------------------------------------ 6. Quy tắc
them(
  h1('6. Quy tắc tính điểm và xếp loại'),
  h2('6.1. Điểm tuần'),
  li('Mỗi học sinh bắt đầu mỗi tuần với 100 điểm.'),
  li('Vi phạm bị trừ theo danh mục; điểm cộng (điểm tốt, phát biểu, việc tốt…) không giới hạn.'),
  li('Lỗi nề nếp tái phạm lần thứ 2 trở đi trong cùng tuần: trừ gấp đôi (nếu bật trong cấu hình).'),
  li('Một số lỗi (ví dụ không đeo phù hiệu, trang phục) từ lần thứ 2 trong học kỳ bị tính là hạ bậc.'),
  h2('6.2. Xếp loại tuần'),
  bang([4000, 5638], ['Xếp loại', 'Điều kiện'], [
    ['TỐT', 'Từ 100 điểm trở lên và không có lỗi nào'],
    ['KHÁ', 'Từ 80 điểm'],
    ['ĐẠT', 'Từ 50 điểm'],
    ['CHƯA ĐẠT', 'Dưới 50 điểm, hoặc có lỗi mức “Chưa đạt”']
  ]),
  kc(),
  h2('6.3. Xếp loại tháng và học kỳ'),
  li('Gợi ý của máy: lấy điểm trung bình các tuần trong tháng theo ngưỡng trên, mỗi lỗi hạ bậc hạ một bậc, bị ghi sổ đầu bài từ 3 lần thì không quá Khá, từ 5 lần thì không quá Đạt; có lỗi Chưa đạt thì Chưa đạt.'),
  li('Xếp loại chính thức do cán bộ lớp / GVCN chọn tay; ô nào chưa chọn thì lấy theo gợi ý (nếu bật tự động).'),
  li('Học kỳ và cả năm tính theo quy định mục “Đánh giá xếp loại rèn luyện học sinh cuối kỳ” (xét số tháng Tốt/Khá/Đạt/Chưa đạt, đặc biệt hai tháng đầu và hai tháng cuối kỳ); cả năm = thấp hơn giữa hai học kỳ.'),
  h2('6.4. Cách tính “tháng” ở các màn hình'),
  li('Bảng lớp, Xếp hạng theo tháng, xếp loại tháng: tính theo các trang tuần; tuần vắt tháng được tính vào tháng của ngày bắt đầu tuần (tuần mở năm học 31/8 – 6/9 tính vào tháng 9).'),
  li('Tổng quan và Đánh giá tháng (kể cả file Excel): tính theo tháng dương lịch, từ ngày 1 đến ngày cuối tháng, theo ngày xảy ra từng lượt.'),
  p('Hai cách này có thể cho số liệu lệch nhau ở các tuần vắt tháng; đây là chủ ý để mỗi màn hình đúng với mục đích của nó.'),
  h2('6.5. File Excel xuất ra'),
  li('Mỗi tháng một sheet, tên sheet là số tháng, bố cục theo mẫu của trường: TT | Họ tên | Những lỗi vi phạm (Ngày: Lỗi vi phạm) | Kết quả T/K/Đ/CĐ | Ghi chú.'),
  li('Giữ phông Times New Roman, cỡ chữ, màu tiêu đề, đường kẻ, kích thước cột, cố định 2 cột và 4 dòng đầu, khổ A4 dọc; có dòng TỔNG và dòng ký tên (Ban giám hiệu / Khối trưởng chủ nhiệm / Giáo viên chủ nhiệm).'),
  li('Sheet HK1, HK2: kết quả từng tháng, xếp loại học kỳ và cả năm.'),
  li('Cần đối chiếu với mẫu của trường trước khi nộp.')
);

// ------------------------------------------------------------------ 7. Ma trận
const co = 'Có', khong = '—';
them(
  h1('7. Bảng tổng hợp quyền theo vai trò'),
  bang([5038, 1500, 1550, 1550], ['Chức năng', 'Phụ huynh', 'Cán bộ lớp', 'GVCN'], [
    ['Đăng nhập, đổi mật khẩu của mình, đăng xuất', co, co, co],
    ['Xem kết quả của con mình', co, khong, khong],
    ['Xem bảng lớp, xếp hạng, tổng quan', khong, co, co],
    ['Xem chi tiết bất kỳ học sinh', khong, co, co],
    ['Ghi lỗi / điểm cộng', khong, co, co],
    ['Xoá mục đã ghi', khong, '7 ngày', 'Mọi lúc'],
    ['Tạo, sửa, xoá trang tuần', khong, co, co],
    ['Chọn xếp loại tháng, ghi chú đánh giá', khong, co, co],
    ['Xuất Excel một tháng', khong, co, co],
    ['Xuất Excel cả năm', khong, khong, co],
    ['Chốt / mở chốt tháng', khong, khong, co],
    ['Quản lý học sinh', khong, khong, co],
    ['Tạo, sửa, khoá tài khoản; đặt lại mật khẩu người khác', khong, khong, co],
    ['Sửa cấu hình, danh mục lỗi', khong, khong, co],
    ['Xem nhật ký hệ thống', khong, khong, co],
    ['Bắt đầu năm học mới', khong, khong, co]
  ])
);

// ------------------------------------------------------------------ 8. Lưu ý
them(
  h1('8. Lưu ý và xử lý sự cố'),
  h2('8.1. Lưu ý quan trọng'),
  li('Tháng đã chốt thì chỉ GVCN mở chốt mới sửa lại được; không ai khác ghi, xoá hay đổi xếp loại tháng đó.'),
  li('Đặt lại mật khẩu: do giới hạn kỹ thuật của gói miễn phí, hệ thống tạo tài khoản đăng nhập mới cùng tên rồi chuyển hồ sơ sang. Người dùng không thấy khác biệt.'),
  li('Số liệu tổng hợp do trình duyệt của người ghi sổ tính và lưu; phù hợp quy mô một lớp học.'),
  li('Bản in tài khoản phụ huynh chứa mật khẩu ban đầu: cắt rời phát riêng, không đăng nhóm chung. Không đưa file tài khoản lên GitHub.'),
  h2('8.2. Xử lý sự cố thường gặp'),
  bang([3600, 6038], ['Hiện tượng', 'Cách xử lý'], [
    ['Phụ huynh quên mật khẩu', 'GVCN: Quản trị → Tài khoản → Đặt lại MK'],
    ['Nhập sai một lượt lỗi', 'Sổ thi đua → biểu tượng thùng rác ở dòng đó'],
    ['Số liệu bảng lớp có vẻ lệch', 'Quản trị → Chốt & xuất → Đồng bộ lại số liệu'],
    ['Lỡ chốt tháng nhầm', 'Quản trị → Chốt & xuất → chọn tháng → Mở chốt'],
    ['Báo “Không đủ quyền”', 'Vai trò tài khoản chưa đúng, hoặc bộ quy tắc bảo mật Firestore chưa được cập nhật bản mới nhất'],
    ['Đăng nhập báo lỗi khi mở trên GitHub Pages', 'Thêm tên miền kydung.github.io vào Firebase → Authentication → Settings → Authorized domains'],
    ['Tạo tài khoản phụ huynh báo “thử quá nhiều lần”', 'Chờ vài phút rồi bấm lại; chỉ tạo cho học sinh còn thiếu'],
    ['Không thấy mục Quản trị', 'Chỉ tài khoản GVCN mới có']
  ])
);

const doc = new Document({
  creator: 'So thi dua 10A0-K67',
  title: 'Mô tả chức năng — Sổ điện tử theo dõi thi đua',
  styles: {
    default: { document: { run: { font: FONT, size: 26 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 34, bold: true, font: FONT, color: MAU }, paragraph: { spacing: { before: 240, after: 200 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 29, bold: true, font: FONT, color: '222222' }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, italics: true, font: FONT, color: '444444' }, paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 2 } }
    ]
  },
  numbering: {
    config: [
      { reference: 'bullets', levels: [
        { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } },
        { level: 1, format: LevelFormat.BULLET, text: '–', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 270 } } } }] },
      { reference: 'steps', levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] }
    ]
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
      run('Mô tả chức năng · Trang ', { size: 20, color: '777777' }),
      new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 20, color: '777777' })] })] }) },
    children: noiDung
  }]
});

Packer.toBuffer(doc).then(buf => {
  const out = process.argv[2] || path.join(__dirname, '..', 'tai-lieu', 'MO-TA-CHUC-NANG.docx');
  fs.writeFileSync(out, buf);
  console.log('Đã tạo ' + out);
});
