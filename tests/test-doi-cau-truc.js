// Chuyển đổi cấu trúc sheet khi schema đổi: phải xếp lại theo TÊN CỘT, không theo vị trí
function doiCauTruc(headCu, duLieuCu, headMoi){
  const moi = duLieuCu.map(r=>{
    const o={}; headCu.forEach((c,i)=>{ if(c) o[c]=r[i]; });
    return headMoi.map(c=> o[c]!==undefined ? o[c] : '');
  }).filter(r=> r.some(x=>String(x).trim()!==''));
  return {head:headMoi, rows:moi,
    them: headMoi.filter(c=>headCu.indexOf(c)<0),
    bot: headCu.filter(c=>c&&headMoi.indexOf(c)<0)};
}

let pass=0,fail=0;
const kt=(ten,got,mong)=>{ const g=JSON.stringify(got),m=JSON.stringify(mong);
  if(g===m){pass++;console.log('  ok   '+ten);}
  else{fail++;console.log('  FAIL '+ten+'\n         được : '+g+'\n         mong  : '+m);} };

console.log('=== Đúng tình huống vừa hỏng: TaiKhoan 8 cột -> 10 cột ===');
const CU=['TenDangNhap','HoTen','MatKhauMoi','MatKhauHash','VaiTro','ToPhuTrach','TrangThai','GhiChu'];
const MOI=['TenDangNhap','HoTen','MatKhauMoi','MatKhauHash','VaiTro','MaHS','ToPhuTrach','LanDau','TrangThai','GhiChu'];
const cu=[
  ['gvcn','Giáo viên chủ nhiệm','','hash1','GVCN','','HOAT_DONG','ghi chú'],
  ['totruong1','Tổ trưởng tổ 1','','hash2','TO_TRUONG','Tổ 1','HOAT_DONG',''],
];
let r=doiCauTruc(CU,cu,MOI);
kt('Thêm đúng 2 cột mới', r.them, ['MaHS','LanDau']);
kt('Không bỏ cột nào', r.bot, []);
kt('gvcn: TrangThai vẫn ở đúng chỗ',
   r.rows[0], ['gvcn','Giáo viên chủ nhiệm','','hash1','GVCN','','','HOAT_DONG','ghi chú'][0]!==undefined
   ? ['gvcn','Giáo viên chủ nhiệm','','hash1','GVCN','','','','HOAT_DONG','ghi chú'] : null);
kt('totruong1: ToPhuTrach giữ "Tổ 1", không nhảy sang cột khác',
   r.rows[1], ['totruong1','Tổ trưởng tổ 1','','hash2','TO_TRUONG','','Tổ 1','','HOAT_DONG','']);

console.log('\n=== Vì sao ghi theo VỊ TRÍ lại hỏng ===');
// Ghi 10 giá trị vào sheet còn tiêu đề 8 cột
const ghiTheoViTri=['phcon','PH Nguyễn A','','hash','PHU_HUYNH','10A0_01','',true,'HOAT_DONG','mk: abc'];
const docLai={}; CU.forEach((c,i)=> docLai[c]=ghiTheoViTri[i]);
kt('ToPhuTrach bị nhận mã học sinh', docLai.ToPhuTrach, '10A0_01');
kt('TrangThai bị rỗng -> đăng nhập bị chặn', docLai.TrangThai, '');
console.log('   -> đúng triệu chứng: "Sai tên đăng nhập hoặc mật khẩu"');

console.log('\n=== NhatKy: chèn cột Mon vào GIỮA ===');
const NK_CU=['Id','MaHS','Ngay','MaTuan','Thang','HocKy','Loai','Ma','Diem','MoTa','NguoiNhap','ThoiGian','TrangThai'];
const NK_MOI=['Id','MaHS','Ngay','MaTuan','Thang','HocKy','Loai','Ma','Mon','Diem','MoTa','NguoiNhap','ThoiGian','TrangThai'];
r=doiCauTruc(NK_CU,[['id1','10A0_01','2026-09-28','T1',9,'HK1','LOI','RV01',-3,'ghi chú','gvcn','tg','HOAT_DONG']],NK_MOI);
kt('Chèn Mon vào giữa, Diem không bị lệch',
   r.rows[0], ['id1','10A0_01','2026-09-28','T1',9,'HK1','LOI','RV01','',-3,'ghi chú','gvcn','tg','HOAT_DONG']);

console.log('\n=== Đổi thứ tự cột ===');
r=doiCauTruc(['b','a','c'],[['2','1','3']],['a','b','c']);
kt('Giá trị bám theo tên, không theo vị trí', r.rows[0], ['1','2','3']);

console.log('\n=== Bỏ cột ===');
r=doiCauTruc(['a','b','thua'],[['1','2','rác']],['a','b']);
kt('Bỏ cột thừa', r.bot, ['thua']);
kt('Dữ liệu còn lại đúng', r.rows[0], ['1','2']);

console.log('\n=== Dòng rỗng bị loại ===');
r=doiCauTruc(['a','b'],[['1','2'],['',''],['3','4']],['a','b']);
kt('Còn 2 dòng', r.rows.length, 2);

console.log('\n=== Chạy lại lần nữa không đổi gì (idempotent) ===');
const l1=doiCauTruc(CU,cu,MOI);
const l2=doiCauTruc(MOI,l1.rows,MOI);
kt('Lần 2 giữ nguyên', l2.rows, l1.rows);
kt('Lần 2 không thêm cột nào', l2.them, []);

console.log('\n'+pass+' đạt, '+fail+' lỗi');
process.exit(fail?1:0);
