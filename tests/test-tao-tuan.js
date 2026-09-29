// Kiểm tra quy tắc tạo trang tuần thủ công (thay cho sinh lịch tự động)
const fmtNgay = s => String(s).slice(0,10);
const thangTheoDoiTuan = t => {
  const tu=new Date(t.TuNgay+'T12:00:00'), den=new Date(t.DenNgay+'T12:00:00');
  const a=tu.getMonth()+1, b=den.getMonth()+1;
  return a===b ? a : ([6,7,8].includes(a) ? b : a);
};

function taoTuan(ds, t){
  const soTuan = Number(t.soTuan);
  if(!soTuan||soTuan<1||soTuan>60) throw new Error('Số tuần phải từ 1 đến 60');
  const sTu=fmtNgay(t.tuNgay), sDen=fmtNgay(t.denNgay);
  if(sDen<sTu) throw new Error('Ngày kết thúc phải sau ngày bắt đầu');
  if((new Date(sDen)-new Date(sTu))/86400000>13) throw new Error('Một trang tuần không quá 14 ngày');
  if(ds.some(r=>fmtNgay(r.TuNgay)===sTu)) throw new Error('Đã có trang tuần bắt đầu từ ngày '+sTu);
  if(ds.some(r=>Number(r.SoTuan)===soTuan)) throw new Error('Đã có trang "Tuần '+soTuan+'"');
  const chong=ds.find(r=>fmtNgay(r.TuNgay)<=sDen && sTu<=fmtNgay(r.DenNgay));
  if(chong) throw new Error('Khoảng ngày này trùng với Tuần '+chong.SoTuan);
  const row={MaTuan:'T'+sTu,SoTuan:soTuan,TuNgay:sTu,DenNgay:sDen,
             Thang:thangTheoDoiTuan({TuNgay:sTu,DenNgay:sDen})};
  ds.push(row); return row;
}

let pass=0,fail=0;
const ok=(ten,fn)=>{ try{ fn(); pass++; console.log('  ok   '+ten); }catch(e){ fail++; console.log('  FAIL '+ten+' -> '+e.message); } };
const chan=(ten,fn,chua)=>{ try{ fn(); fail++; console.log('  FAIL '+ten+' -> lẽ ra phải chặn'); }
  catch(e){ if(!chua||e.message.includes(chua)){pass++;console.log('  ok   '+ten);} else {fail++;console.log('  FAIL '+ten+' -> báo sai: '+e.message);} } };

const ds=[];
console.log('=== Tạo các trang tuần bình thường ===');
ok('Tuần 1  (31/8 - 6/9)',  ()=>taoTuan(ds,{soTuan:1,tuNgay:'2026-08-31',denNgay:'2026-09-06'}));
ok('Tuần 2  (7/9 - 13/9)',  ()=>taoTuan(ds,{soTuan:2,tuNgay:'2026-09-07',denNgay:'2026-09-13'}));
ok('Tuần 3  (14/9 - 20/9)', ()=>taoTuan(ds,{soTuan:3,tuNgay:'2026-09-14',denNgay:'2026-09-20'}));

console.log('\n=== Bỏ qua tuần nghỉ Tết: chỉ việc KHÔNG tạo trang ===');
ok('Tuần 22 (25/1 - 31/1)', ()=>taoTuan(ds,{soTuan:22,tuNgay:'2027-01-25',denNgay:'2027-01-31'}));
console.log('   (1/2 - 14/2 nghỉ Tết -> không tạo trang nào)');
ok('Tuần 23 (15/2 - 21/2)', ()=>taoTuan(ds,{soTuan:23,tuNgay:'2027-02-15',denNgay:'2027-02-21'}));
const t22=ds.find(t=>t.SoTuan===22), t23=ds.find(t=>t.SoTuan===23);
if(t23.SoTuan===t22.SoTuan+1){pass++;console.log('  ok   Số tuần vẫn liền mạch qua kỳ nghỉ (22 -> 23)');}
else{fail++;console.log('  FAIL số tuần không liền mạch');}

console.log('\n=== Các trường hợp phải bị chặn ===');
chan('Trùng số tuần',        ()=>taoTuan(ds,{soTuan:3,tuNgay:'2026-10-05',denNgay:'2026-10-11'}),'Tuần 3');
chan('Trùng ngày bắt đầu',   ()=>taoTuan(ds,{soTuan:30,tuNgay:'2026-09-14',denNgay:'2026-09-20'}),'bắt đầu từ ngày');
chan('Chồng ngày tuần khác', ()=>taoTuan(ds,{soTuan:31,tuNgay:'2026-09-16',denNgay:'2026-09-22'}),'trùng với Tuần');
chan('Ngày kết thúc trước',  ()=>taoTuan(ds,{soTuan:32,tuNgay:'2026-11-10',denNgay:'2026-11-03'}),'phải sau');
chan('Khoảng quá dài',       ()=>taoTuan(ds,{soTuan:33,tuNgay:'2026-11-02',denNgay:'2026-11-30'}),'không quá 14 ngày');
chan('Số tuần = 0',          ()=>taoTuan(ds,{soTuan:0,tuNgay:'2026-12-07',denNgay:'2026-12-13'}),'từ 1 đến 60');

console.log('\n=== Tháng theo dõi của tuần vắt tháng ===');
const kt=(ten,got,mong)=>{ if(got===mong){pass++;console.log('  ok   '+ten.padEnd(34)+'-> tháng '+got);} else {fail++;console.log('  FAIL '+ten+' -> '+got+' (mong '+mong+')');} };
kt('31/8 - 6/9  (vắt 8 sang 9)',  thangTheoDoiTuan({TuNgay:'2026-08-31',DenNgay:'2026-09-06'}), 9);
kt('28/9 - 4/10 (vắt 9 sang 10)', thangTheoDoiTuan({TuNgay:'2026-09-28',DenNgay:'2026-10-04'}), 9);
kt('5/10 - 11/10 (trong tháng)',  thangTheoDoiTuan({TuNgay:'2026-10-05',DenNgay:'2026-10-11'}), 10);

console.log('\n=== Trang tuần mới nhất lên đầu ===');
const moiNhat = ds.slice().sort((a,b)=>b.TuNgay.localeCompare(a.TuNgay))[0];
kt('Tuần mở mặc định', moiNhat.SoTuan, 23);

console.log('\n'+pass+' đạt, '+fail+' lỗi');
process.exit(fail?1:0);
