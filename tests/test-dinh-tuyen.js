// Vai trò nào vào được màn nào, và mở link trống thì rơi vào đâu.
// Lỗi thật đã gặp: phụ huynh mở link không có hash -> mặc định 'bang-lop'
// -> backend chặn -> hiện "Không đủ quyền" ngay sau khi đăng nhập.
const fs=require('fs'), path=require('path');
const app=fs.readFileSync(path.join(__dirname,'..','docs','assets','js','app.js'),'utf8');

let VT=null;
const vaiTro=()=>VT;
eval(app.slice(app.indexOf('function manHinhMacDinh'), app.indexOf('function capNhatNav')));

let pass=0,fail=0;
const kt=(ten,got,mong)=>{ if(got===mong){pass++;console.log('  ok   '+ten.padEnd(50)+'= '+got);}
  else{fail++;console.log('  FAIL '+ten.padEnd(50)+'= '+got+' (mong '+mong+')');} };

console.log('=== Mở link không kèm địa chỉ thì vào màn nào ===');
VT=null;          kt('Chưa đăng nhập',      manHinhMacDinh(), 'dang-nhap');
VT='PHU_HUYNH';   kt('Phụ huynh',           manHinhMacDinh(), 'chi-tiet');
VT='TO_TRUONG';   kt('Tổ trưởng',           manHinhMacDinh(), 'cham-diem');
VT='LOP_TRUONG';  kt('Lớp trưởng',          manHinhMacDinh(), 'cham-diem');
VT='GVCN';        kt('GVCN',                manHinhMacDinh(), 'bang-lop');

console.log('\n=== Phụ huynh: chỉ 3 màn hình ===');
VT='PHU_HUYNH';
['chi-tiet','doi-mat-khau','dang-nhap'].forEach(m=> kt('vào được '+m, duocVao(m), true));
['bang-lop','thi-dua','cham-diem','quan-tri'].forEach(m=> kt('BỊ CHẶN '+m, duocVao(m), false));

console.log('\n=== Chưa đăng nhập: chỉ trang đăng nhập ===');
VT=null;
kt('vào được dang-nhap', duocVao('dang-nhap'), true);
['chi-tiet','bang-lop','cham-diem','quan-tri','thi-dua'].forEach(m=> kt('BỊ CHẶN '+m, duocVao(m), false));

console.log('\n=== Cán bộ lớp / GVCN ===');
VT='TO_TRUONG';
kt('tổ trưởng vào được cham-diem', duocVao('cham-diem'), true);
kt('tổ trưởng vào được bang-lop',  duocVao('bang-lop'), true);
kt('tổ trưởng BỊ CHẶN quan-tri',   duocVao('quan-tri'), false);
VT='LOP_TRUONG';
kt('lớp trưởng BỊ CHẶN quan-tri',  duocVao('quan-tri'), false);
VT='GVCN';
kt('GVCN vào được quan-tri',       duocVao('quan-tri'), true);
kt('GVCN vào được mọi màn',        ['chi-tiet','bang-lop','thi-dua','cham-diem','quan-tri'].every(duocVao), true);

console.log('\n=== Đúng ca vừa hỏng ===');
VT='PHU_HUYNH';
kt('PH mở link trống KHÔNG rơi vào bang-lop', manHinhMacDinh()!=='bang-lop', true);
kt('PH gõ tay #/bang-lop thì bị chặn',        duocVao('bang-lop'), false);

console.log('\n=== Mã nguồn có thật sự chuyển hướng không ===');
kt('dinhTuyen gọi duocVao', /if \(vaiTro\(\) && !duocVao\(ten\)\)/.test(app), true);
kt('có chuyển hướng về trang chủ vai trò', /trangChuTheoVaiTro\(\)/.test(app), true);
kt('không còn mặc định cứng "bang-lop"', !/\|\| 'bang-lop';/.test(app), true);

console.log('\n'+pass+' đạt, '+fail+' lỗi');
process.exit(fail?1:0);
