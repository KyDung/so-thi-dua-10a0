// Kiểm tra sinh lịch tuần + bỏ tuần nghỉ Tết
const fmt = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const thangTheoDoiTuan = t => {
  const tu=new Date(t.TuNgay+'T12:00:00'), den=new Date(t.DenNgay+'T12:00:00');
  const a=tu.getMonth()+1, b=den.getMonth()+1;
  if (a===b) return a;
  return [6,7,8].includes(a) ? b : a;
};

// Sinh lịch như sinhLichTuan()
const batDau = new Date(2026,8,5,12);
const thu2 = new Date(batDau); thu2.setDate(thu2.getDate()-((thu2.getDay()+6)%7));
const tuan=[];
for(let i=0;i<46;i++){
  const tu=new Date(thu2); tu.setDate(tu.getDate()+i*7);
  const den=new Date(tu); den.setDate(den.getDate()+6);
  const thang=thangTheoDoiTuan({TuNgay:fmt(tu),DenNgay:fmt(den)});
  if([6,7,8].includes(thang)) continue;
  tuan.push({tuNgay:fmt(tu),denNgay:fmt(den),thang,nghi:false});
}

let pass=0,fail=0;
const kt=(ten,got,mong)=>{ if(got===mong){pass++;console.log('  ok   '+ten.padEnd(42)+'= '+got);} else {fail++;console.log('  FAIL '+ten.padEnd(42)+'= '+got+' (mong '+mong+')');} };

console.log('=== Sinh lịch thô (chưa trừ nghỉ) ===');
kt('Tổng số tuần lịch (T9 -> hết T5)', tuan.length, 40);
kt('Tuần đầu bắt đầu', tuan[0].tuNgay, '2026-08-31');
kt('Tuần cuối kết thúc', tuan[tuan.length-1].denNgay, '2027-06-06');
console.log('  (tuần cuối vắt sang tháng 6 -> tính vào tháng 5; cô tích nghỉ nếu lớp đã nghỉ hè)');
console.log('  (không có tuần nào rơi vào tháng 6,7,8: ' + (tuan.every(t=>![6,7,8].includes(t.thang))?'đúng':'SAI') + ')');

console.log('\n=== Đánh dấu nghỉ Tết (Tết Đinh Mùi 2027 rơi vào 06/02/2027) ===');
// Nghỉ 2 tuần quanh Tết
['2027-02-01','2027-02-08'].forEach(d=>{ const t=tuan.find(x=>x.tuNgay===d); if(t){t.nghi=true;t.ghiChu='Nghỉ Tết';} });
// Thêm 1 tuần nghỉ lễ 30/4
const t304 = tuan.find(x=>x.tuNgay<='2027-04-26'&&x.denNgay>='2027-04-30');
if(t304){t304.nghi=true;t304.ghiChu='Nghỉ lễ 30/4';}

// danhSoLaiTuan()
let dem=0, soNghi=0;
tuan.forEach(t=>{ if(t.nghi){t.ma='';t.so='';soNghi++;} else {dem++;t.ma='T'+String(dem).padStart(2,'0');t.so=dem;} });

kt('Số tuần NGHỈ đã đánh dấu', soNghi, 3);
kt('Số tuần HỌC sau khi trừ 3 tuần nghỉ', dem, 37);
kt('Tuần nghỉ không có mã', tuan.filter(t=>t.nghi).every(t=>t.ma===''), true);
kt('Số thứ tự liên tục, không nhảy cóc',
   tuan.filter(t=>!t.nghi).every((t,i)=>t.so===i+1), true);

console.log('\n=== Quanh Tết, số tuần phải nối tiếp nhau ===');
const quanhTet = tuan.filter(t=>t.tuNgay>='2027-01-18'&&t.tuNgay<='2027-02-22');
quanhTet.forEach(t=>console.log('   '+t.tuNgay+' -> '+t.denNgay+'  '+(t.nghi?'NGHỈ ('+t.ghiChu+')':'tuần '+t.so)));
const soHoc = quanhTet.filter(t=>!t.nghi).map(t=>t.so);
kt('Số tuần quanh Tết liền mạch', soHoc.every((s,i)=>i===0||s===soHoc[i-1]+1), true);

console.log('\n=== Tuần nghỉ bị loại khỏi ô chọn khi ghi sổ ===');
const laTuanHoc = t => !!t.ma && !t.nghi;
kt('Số tuần hiện trong ô chọn', tuan.filter(laTuanHoc).length, 37);
kt('Không tuần nghỉ nào lọt vào', tuan.filter(laTuanHoc).some(t=>t.nghi), false);

console.log('\n'+pass+' đạt, '+fail+' lỗi');
process.exit(fail?1:0);
