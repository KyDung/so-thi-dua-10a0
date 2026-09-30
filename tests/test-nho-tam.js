// Đổi tài khoản phải xoá hết dữ liệu nhớ tạm trong trang.
// Lỗi thật: đăng nhập phụ huynh (1 HS) -> thoát -> vào bằng GVCN mà không tải lại
// trang -> Sổ thi đua vẫn chỉ hiện 1 học sinh.
const fs=require('fs'), path=require('path');
const app=fs.readFileSync(path.join(__dirname,'..','docs','assets','js','app.js'),'utf8');

let pass=0,fail=0;
const kt=(ten,dung,ct)=>{ if(dung){pass++;console.log('  ok   '+ten);}
  else{fail++;console.log('  FAIL '+ten+(ct?' -> '+ct:''));} };

console.log('=== Mô phỏng đúng kịch bản đã hỏng ===');
// Bản CŨ: không xoá nhớ tạm
let DSHS=null;
const goiAPI = vaiTro => vaiTro==='PHU_HUYNH' ? ['VŨ HÀ THỦY CHI'] : new Array(41).fill('HS');
const manHinhCu = async vaiTro => { if(!DSHS) DSHS = goiAPI(vaiTro); return DSHS; };
(async()=>{
  DSHS=null;
  await manHinhCu('PHU_HUYNH');
  const cu = await manHinhCu('GVCN');          // thoát rồi vào lại, không tải lại trang
  kt('Bản CŨ: GVCN chỉ thấy '+cu.length+' HS (đúng triệu chứng)', cu.length===1, cu.length+' HS');

  // Bản MỚI: đổi tài khoản thì xoá nhớ tạm
  const xoaNhoTam = ()=>{ DSHS=null; };
  DSHS=null;
  await manHinhCu('PHU_HUYNH');
  xoaNhoTam();
  const moi = await manHinhCu('GVCN');
  kt('Bản MỚI: GVCN thấy đủ '+moi.length+' HS', moi.length===41, moi.length+' HS');

  console.log('\n=== Mã nguồn có gọi đúng chỗ không ===');
  kt('Có hàm xoaNhoTam()', /function xoaNhoTam\(\)/.test(app));
  kt('Xoá cả 3 biến nhớ tạm',
     /DANHMUC = null;\s*DSHS = null;\s*LICHTUAN = null;/.test(app));
  kt('Gọi khi THOÁT', /Store\.xoaHet\(\); xoaNhoTam\(\)/.test(app));
  kt('Gọi khi ĐĂNG NHẬP', /API\.dangNhap[\s\S]{0,120}xoaNhoTam\(\)/.test(app));

  // Mọi biến nhớ tạm khai báo ở đầu file phải nằm trong xoaNhoTam (trừ LOP)
  const khaiBao = (app.match(/^let (LOP.*?);$/m)||['',''])[1]
    .split(',').map(x=>x.trim().split(' ')[0]).filter(Boolean);
  const than = (app.match(/function xoaNhoTam\(\) \{([\s\S]*?)\}/)||['',''])[1];
  const thieu = khaiBao.filter(v=> v!=='LOP' && !than.includes(v));
  kt('Không sót biến nhớ tạm nào', thieu.length===0, 'sót: '+thieu.join(', '));
  console.log('   (LOP giữ lại được vì chỉ chứa tên lớp/trường, không phải dữ liệu học sinh)');

  console.log('\n'+pass+' đạt, '+fail+' lỗi');
  process.exit(fail?1:0);
})();
