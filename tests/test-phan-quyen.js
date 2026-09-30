// Ai xem được gì. Sai ở đây là lộ dữ liệu học sinh của nhà khác.
const fs=require('fs'), path=require('path');
const GOC=path.join(__dirname,'..');
const code=fs.readFileSync(path.join(GOC,'apps-script','Code.gs'),'utf8');

let pass=0,fail=0;
const kt=(ten,dung,ct)=>{ if(dung){pass++;console.log('  ok   '+ten);} else {fail++;console.log('  FAIL '+ten+(ct?' -> '+ct:''));} };

// --- Mô phỏng canQuyen ---
function canQuyen(phien, ds){
  if(!phien) throw new Error('Cần đăng nhập');
  if(ds.indexOf(phien.vaiTro)<0) throw new Error('Không đủ quyền');
  return phien;
}
const XEM=['PHU_HUYNH','TO_TRUONG','LOP_TRUONG','GVCN'];
const CBL=['TO_TRUONG','LOP_TRUONG','GVCN'];
const chan=(phien,ds)=>{ try{canQuyen(phien,ds);return null;}catch(e){return e.message;} };

const khach=null;
const ph   ={vaiTro:'PHU_HUYNH',maHS:'10A0_01',ten:'ph1'};
const tt   ={vaiTro:'TO_TRUONG',to:'Tổ 1',ten:'tt1'};
const gv   ={vaiTro:'GVCN',ten:'gvcn'};

console.log('=== Khách chưa đăng nhập: không xem được gì ===');
kt('chiTietHS bị chặn',  chan(khach,XEM)==='Cần đăng nhập');
kt('bangLop bị chặn',    chan(khach,CBL)==='Cần đăng nhập');
kt('dsHocSinh bị chặn',  chan(khach,XEM)==='Cần đăng nhập');
kt('lichTuan bị chặn',   chan(khach,XEM)==='Cần đăng nhập');

console.log('\n=== Phụ huynh ===');
kt('xem được chi tiết',       chan(ph,XEM)===null);
kt('KHÔNG xem được bảng lớp', chan(ph,CBL)==='Không đủ quyền');
kt('KHÔNG ghi sổ được',       chan(ph,CBL)==='Không đủ quyền');
kt('KHÔNG vào quản trị được', chan(ph,['GVCN'])==='Không đủ quyền');

console.log('\n=== Phụ huynh chỉ thấy con mình ===');
// đúng logic trong apiChiTietHS
function chiTietHS(phien, maHS){
  if(phien.vaiTro==='PHU_HUYNH'){
    if(!phien.maHS) throw new Error('Tài khoản chưa gắn với học sinh nào');
    maHS = phien.maHS;
  }
  return maHS;
}
kt('xin xem con mình -> đúng con mình', chiTietHS(ph,'10A0_01')==='10A0_01');
kt('xin xem HS khác -> vẫn trả con mình', chiTietHS(ph,'10A0_25')==='10A0_01');
kt('không truyền mã -> vẫn ra con mình', chiTietHS(ph,'')==='10A0_01');
let loi=null; try{ chiTietHS({vaiTro:'PHU_HUYNH',maHS:''},'10A0_01'); }catch(e){ loi=e.message; }
kt('tài khoản chưa gắn HS -> báo lỗi rõ ràng', /chưa gắn/.test(loi||''), loi);
kt('GVCN xem được bất kỳ ai', chiTietHS(gv,'10A0_25')==='10A0_25');

console.log('\n=== Tổ trưởng / GVCN ===');
kt('tổ trưởng xem được bảng lớp', chan(tt,CBL)===null);
kt('tổ trưởng KHÔNG vào quản trị', chan(tt,['GVCN'])==='Không đủ quyền');
kt('GVCN vào được quản trị',       chan(gv,['GVCN'])===null);

console.log('\n=== Kiểm tra code thật trong Code.gs ===');
const dinhTuyen = code.slice(code.indexOf('function xuLy'), code.indexOf('// =============== CÔNG KHAI'));
const congKhai = [...dinhTuyen.matchAll(/case '(\w+)':\s*return api(\w+)\(\s*\)?[^;]*;/g)]
  .filter(m => !/canQuyen/.test(m[0])).map(m=>m[1])
  .filter(a => a !== 'dangNhap');   // dangNhap tất nhiên phải mở
kt('Chỉ thongTinLop là không cần đăng nhập',
   congKhai.length===1 && congKhai[0]==='thongTinLop', congKhai.join(', ') || '(không có)');
kt('chiTietHS có canQuyen', /case 'chiTietHS':[^;]*canQuyen/.test(dinhTuyen));
kt('bangLop có canQuyen',   /case 'bangLop':[^;]*canQuyen/.test(dinhTuyen));
kt('dsHocSinh có canQuyen', /case 'dsHocSinh':[^;]*canQuyen/.test(dinhTuyen));
kt('apiChiTietHS ép maHS về con mình',
   /vaiTro === 'PHU_HUYNH'[\s\S]{0,220}maHS = phien\.maHS/.test(code));
kt('thongTinLop không trả dữ liệu học sinh',
   !/to: Object\.keys\(to\)/.test(code));

console.log('\n'+pass+' đạt, '+fail+' lỗi');
process.exit(fail?1:0);
