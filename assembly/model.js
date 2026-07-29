/* ============================================================
   assembly-model.js
   ------------------------------------------------------------
   ตัวสร้างโมเดลตอม่อสะพานแบบ "แตกเป็น assembly object"
   ใช้ร่วมกันระหว่าง assembly-4d.html (ลำดับเวลา) และ
   assembly-layers.html (เลเยอร์แบบ static)

   ต้องโหลด three.js ไว้ก่อน (global THREE)

   AssemblyModel.build(params) -> {
     root, groups, order, meta, levels, stages
   }
   ============================================================ */
(function(global){
'use strict';

const COL = {
  conc:0xcfcfcf, lean:0xa8a8a8, pile:0xb4b4b4, rebar:0x4f7ea8,
  ply:0xc99a63, timber:0x8a6234, soil:0xa8875d, pitwall:0x7d6340, ped:0xdedede
};

/* หมวดงาน — ใช้จัดเลเยอร์และกำหนดทิศทางการแยกชิ้น */
const CAT = {
  earth:{label:'งานดิน',            color:'#a8875d'},
  pile: {label:'เสาเข็ม',            color:'#b4b4b4'},
  lean: {label:'คอนกรีตหยาบ',        color:'#a8a8a8'},
  rebar:{label:'เหล็กเสริม',         color:'#4f7ea8'},
  form: {label:'แบบหล่อ / ค้ำยัน',   color:'#c99a63'},
  conc: {label:'คอนกรีตโครงสร้าง',   color:'#cfcfcf'}
};

const DEFAULTS = {
  excDepth:3.0, ws:0.6, slope:0.5,
  capL:4.5, capW:4.5, capH:1.5, nPileSide:3,
  colB:1.2, colD:1.2, colH:7.0, lifts:2,
  chL:9.0, chW:1.6, chH:1.4, pedN:6,
  capSp:0.20, tieSp:0.20
};

function build(params){
  const P = Object.assign({}, DEFAULTS, params||{});
  P.lifts     = Math.max(1, Math.round(P.lifts));
  P.nPileSide = Math.max(1, Math.round(P.nPileSide));
  P.pedN      = Math.max(0, Math.round(P.pedN));

  const root   = new THREE.Group();
  const groups = {};
  const order  = [];
  const meta   = {};

  /* ---------- helpers ---------- */
  function newGroup(name, label, cat, level){
    const grp = new THREE.Group();
    grp.name = name; grp.visible = false;
    grp.userData = {mats:[], op:0, target:0};
    root.add(grp);
    groups[name] = grp; order.push(name);
    meta[name] = {label, cat, level, anchor:new THREE.Vector3()};
    return grp;
  }
  function matFor(grp, color, opts){
    const m = new THREE.MeshStandardMaterial(
      Object.assign({color, roughness:0.9, metalness:0.0}, opts||{}));
    grp.userData.mats.push(m); return m;
  }
  function addBox(grp, w,h,d, x,yBot,z, m){
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), m);
    mesh.position.set(x, yBot+h/2, z);
    mesh.castShadow = true; mesh.receiveShadow = true;
    grp.add(mesh); return mesh;
  }
  function addBar(grp, r, len, x,y,z, axis, m){
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,7), m);
    mesh.position.set(x,y,z);
    if(axis==='x') mesh.rotation.z = Math.PI/2;
    else if(axis==='z') mesh.rotation.x = Math.PI/2;
    mesh.castShadow = true;
    grp.add(mesh); return mesh;
  }
  function addStrut(grp, p1, p2, r, m){
    const dir = new THREE.Vector3().subVectors(p2,p1);
    const len = dir.length();
    if(len < 0.05) return null;
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,6), m);
    mesh.position.copy(p1).addScaledVector(dir, 0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.clone().normalize());
    mesh.castShadow = true;
    grp.add(mesh); return mesh;
  }
  const V = (x,y,z)=>new THREE.Vector3(x,y,z);
  function addTie(grp, bx, bz, y, r, m){
    addBar(grp, r, bz, -bx/2, y, 0, 'z', m);
    addBar(grp, r, bz,  bx/2, y, 0, 'z', m);
    addBar(grp, r, bx, 0, y, -bz/2, 'x', m);
    addBar(grp, r, bx, 0, y,  bz/2, 'x', m);
  }
  function addFormBox(grp, L, W, H, yBot, t, mPly, mTim){
    addBox(grp, L+2*t, H, t, 0, yBot, -(W/2+t/2), mPly);
    addBox(grp, L+2*t, H, t, 0, yBot,  (W/2+t/2), mPly);
    addBox(grp, t, H, W, -(L/2+t/2), yBot, 0, mPly);
    addBox(grp, t, H, W,  (L/2+t/2), yBot, 0, mPly);
    const nW = Math.max(1, Math.round(H/0.8));
    for(let i=1;i<=nW;i++){
      const y = yBot + H*i/(nW+1);
      addBox(grp, L+2*t+0.16, 0.09, 0.09, 0, y, -(W/2+t+0.045), mTim);
      addBox(grp, L+2*t+0.16, 0.09, 0.09, 0, y,  (W/2+t+0.045), mTim);
      addBox(grp, 0.09, 0.09, W+0.16, -(L/2+t+0.045), y, 0, mTim);
      addBox(grp, 0.09, 0.09, W+0.16,  (L/2+t+0.045), y, 0, mTim);
    }
  }

  /* ---------- ระดับสำคัญ ---------- */
  const leanT=0.10, leanOver=0.10, cover=0.075, rMain=0.014, rTie=0.008, t=0.05;
  const yPitBot  = -P.excDepth;
  const yLeanTop = yPitBot + leanT;
  const yCapTop  = yLeanTop + P.capH;
  const yColTop  = yCapTop + P.colH;
  const yTop     = yColTop + P.chH;
  const bL=P.capL+2*(P.ws+leanOver), bW=P.capW+2*(P.ws+leanOver);
  const tL=bL+2*P.slope*P.excDepth,  tW=bW+2*P.slope*P.excDepth;
  const colA = P.colB*P.colD;

  /* ---------- ดินเดิม ---------- */
  const gr = newGroup('ground','ระดับดินเดิม','earth','site');
  const mSoil = matFor(gr, COL.soil, {roughness:1});
  const OUT = Math.max(tL, tW, P.chL)/2 + 4.5, th=0.5;
  addBox(gr,(OUT*2),th,(OUT-tW/2), 0,-th,-(tW/2+(OUT-tW/2)/2), mSoil);
  addBox(gr,(OUT*2),th,(OUT-tW/2), 0,-th, (tW/2+(OUT-tW/2)/2), mSoil);
  addBox(gr,(OUT-tL/2),th,tW, -(tL/2+(OUT-tL/2)/2),-th,0, mSoil);
  addBox(gr,(OUT-tL/2),th,tW,  (tL/2+(OUT-tL/2)/2),-th,0, mSoil);

  const glid = newGroup('groundLid','ฝาดินปิดปากบ่อ (ก่อนขุด)','earth','site');
  addBox(glid, tL, th, tW, 0, -th, 0, matFor(glid, COL.soil, {roughness:1}));

  /* ---------- บ่อขุด ---------- */
  const pit = newGroup('pit','บ่อขุด (รวมพื้นที่ทำงาน + ลาดข้าง)','earth','sub');
  const mPit = matFor(pit, COL.pitwall, {roughness:1, side:THREE.DoubleSide});
  const v=[], dd=P.excDepth;
  const T=[[-tL/2,0,-tW/2],[tL/2,0,-tW/2],[tL/2,0,tW/2],[-tL/2,0,tW/2]];
  const B=[[-bL/2,-dd,-bW/2],[bL/2,-dd,-bW/2],[bL/2,-dd,bW/2],[-bL/2,-dd,bW/2]];
  for(let i=0;i<4;i++){
    const j=(i+1)%4;
    v.push(...T[i],...B[i],...B[j]);
    v.push(...T[i],...B[j],...T[j]);
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.Float32BufferAttribute(v,3));
  pg.computeVertexNormals();
  const pw = new THREE.Mesh(pg, mPit); pw.receiveShadow=true; pit.add(pw);
  addBox(pit, bL, 0.3, bW, 0, -dd-0.3, 0, mPit);

  /* ---------- เสาเข็ม + เหล็กหนวดกุ้ง ---------- */
  const pl = newGroup('piles','เสาเข็ม + เหล็กหนวดกุ้ง (สกัดหัวเข็มแล้ว)','pile','sub');
  const mPile = matFor(pl, COL.pile), mDow = matFor(pl, COL.rebar, {metalness:0.45, roughness:0.45});
  const n=P.nPileSide, pd=0.40;
  const pitchX=(P.capL-1.2)/Math.max(1,n-1), pitchZ=(P.capW-1.2)/Math.max(1,n-1);
  for(let i=0;i<n;i++) for(let k=0;k<n;k++){
    const px=(n===1)?0:(-(P.capL-1.2)/2+i*pitchX);
    const pz=(n===1)?0:(-(P.capW-1.2)/2+k*pitchZ);
    const pileTop = yLeanTop+0.10;
    const m2 = new THREE.Mesh(new THREE.CylinderGeometry(pd/2,pd/2,2.6,14), mPile);
    m2.position.set(px, pileTop-1.3, pz); m2.castShadow=true; pl.add(m2);
    for(let a=0;a<6;a++){
      const th2=a/6*Math.PI*2;
      addBar(pl, 0.011, 0.75, px+0.13*Math.cos(th2), pileTop+0.30, pz+0.13*Math.sin(th2), 'y', mDow);
    }
  }

  /* ---------- คอนกรีตหยาบ ---------- */
  const ln = newGroup('lean','คอนกรีตหยาบ','lean','sub');
  addBox(ln, P.capL+2*leanOver, leanT, P.capW+2*leanOver, 0, yPitBot, 0, matFor(ln, COL.lean));

  /* ---------- เหล็กเสริมฐานราก ---------- */
  const cr = newGroup('capRebar','เหล็กเสริมฐานราก (ตะแกรงล่าง–บน + เหล็กข้าง)','rebar','cap');
  const mReb = matFor(cr, COL.rebar, {metalness:0.45, roughness:0.45});
  [yLeanTop+cover, yCapTop-cover].forEach(yy=>{
    const nx=Math.max(2,Math.floor((P.capW-2*cover)/P.capSp))+1;
    for(let i=0;i<nx;i++){
      const z=-(P.capW/2-cover)+i*(P.capW-2*cover)/(nx-1);
      addBar(cr, rMain, P.capL-2*cover, 0, yy, z, 'x', mReb);
    }
    const nz=Math.max(2,Math.floor((P.capL-2*cover)/P.capSp))+1;
    for(let i=0;i<nz;i++){
      const x=-(P.capL/2-cover)+i*(P.capL-2*cover)/(nz-1);
      addBar(cr, rMain, P.capW-2*cover, x, yy+2*rMain, 0, 'z', mReb);
    }
  });
  const nSide=Math.max(2,Math.floor(P.capL/0.45));
  for(let i=0;i<nSide;i++){
    const x=-(P.capL/2-cover)+i*(P.capL-2*cover)/(nSide-1);
    [-(P.capW/2-cover),(P.capW/2-cover)].forEach(z=>
      addBar(cr, rTie, P.capH-2*cover, x, yLeanTop+P.capH/2, z, 'y', mReb));
  }

  /* ---------- แบบหล่อฐานราก ---------- */
  const cf = newGroup('capForm','แบบหล่อฐานราก + คร่าว + ไม้ยันแบบ','form','cap');
  const mPly=matFor(cf,COL.ply,{roughness:0.85}), mTim=matFor(cf,COL.timber,{roughness:0.9});
  addFormBox(cf, P.capL, P.capW, P.capH, yLeanTop, t, mPly, mTim);
  [[-1,0],[1,0],[0,-1],[0,1]].forEach(dir=>{
    for(let s=-1;s<=1;s+=2){
      const ax=dir[0]?dir[0]*(P.capL/2+t):s*P.capL/3.2;
      const az=dir[1]?dir[1]*(P.capW/2+t):s*P.capW/3.2;
      addStrut(cf, V(ax, yLeanTop+P.capH*0.78, az),
                   V(ax+dir[0]*P.capH*0.85, yPitBot+leanT+0.05, az+dir[1]*P.capH*0.85), 0.05, mTim);
    }
  });

  /* ---------- คอนกรีตฐานราก ---------- */
  const cc = newGroup('capConc','คอนกรีตฐานราก','conc','cap');
  addBox(cc, P.capL, P.capH, P.capW, 0, yLeanTop, 0, matFor(cc, COL.conc));

  /* ---------- ถมกลับ ---------- */
  const bf = newGroup('backfill','ดินถมกลับ (แสดงโปร่งแสง)','earth','sub');
  const bfm = addBox(bf, tL, P.excDepth, tW, 0, -P.excDepth, 0,
         matFor(bf, COL.soil, {transparent:true, opacity:0.22, roughness:1, depthWrite:false}));
  bfm.castShadow = false; bfm.receiveShadow = false;

  /* ---------- เสาตอม่อ แยกชั้นเท ---------- */
  const hLift = P.colH/P.lifts;
  for(let L=0; L<P.lifts; L++){
    const y0 = yCapTop + L*hLift;
    const tag = P.lifts>1 ? ` lift ${L+1}/${P.lifts}` : '';
    const lv  = 'col'+L;

    const gRb = newGroup('colRebar'+L, 'เหล็กเสริมเสาตอม่อ'+tag, 'rebar', lv);
    const mR = matFor(gRb, COL.rebar,{metalness:0.45,roughness:0.45});
    const nb = 4;
    const barLen = hLift + (L<P.lifts-1 ? 0.9 : 0.5);   // เผื่อทาบต่อชั้นถัดไป
    for(let i=0;i<nb;i++) for(let k=0;k<nb;k++){
      if(i>0&&i<nb-1&&k>0&&k<nb-1) continue;
      const x=-(P.colB/2-cover)+i*(P.colB-2*cover)/(nb-1);
      const z=-(P.colD/2-cover)+k*(P.colD-2*cover)/(nb-1);
      addBar(gRb, rMain, barLen, x, y0+barLen/2, z, 'y', mR);
    }
    const nt=Math.max(2,Math.floor(hLift/P.tieSp));
    for(let i=0;i<=nt;i++) addTie(gRb, P.colB-2*cover, P.colD-2*cover, y0+i*hLift/nt, rTie, mR);

    const gFm = newGroup('colForm'+L, 'แบบหล่อเสาตอม่อ'+tag, 'form', lv);
    addFormBox(gFm, P.colB, P.colD, hLift, y0, t,
               matFor(gFm,COL.ply,{roughness:0.85}), matFor(gFm,COL.timber,{roughness:0.9}));

    const gCn = newGroup('colConc'+L, 'คอนกรีตเสาตอม่อ'+tag, 'conc', lv);
    addBox(gCn, P.colB, hLift, P.colD, 0, y0, 0, matFor(gCn, COL.conc));
  }

  /* ---------- คานหัวเสา ---------- */
  const hr = newGroup('chRebar','เหล็กเสริมคานหัวเสา (เหล็กนอน + ปลอก)','rebar','ch');
  const mHR = matFor(hr, COL.rebar,{metalness:0.45,roughness:0.45});
  [yColTop+cover, yColTop+P.chH-cover].forEach(yy=>{
    for(let i=0;i<5;i++){
      const z=-(P.chW/2-cover)+i*(P.chW-2*cover)/4;
      addBar(hr, rMain, P.chL-2*cover, 0, yy, z, 'x', mHR);
    }
  });
  const nst=Math.max(2,Math.floor(P.chL/P.tieSp));
  for(let i=0;i<=nst;i++){
    const x=-(P.chL/2-cover)+i*(P.chL-2*cover)/nst;
    const yc=yColTop+P.chH/2, bw=P.chW-2*cover, bh=P.chH-2*cover;
    addBar(hr,rTie,bh,x,yc,-bw/2,'y',mHR); addBar(hr,rTie,bh,x,yc,bw/2,'y',mHR);
    addBar(hr,rTie,bw,x,yc-bh/2,0,'z',mHR); addBar(hr,rTie,bw,x,yc+bh/2,0,'z',mHR);
  }

  const hf = newGroup('chForm','แบบหล่อคานหัวเสา + แบบท้องคาน + เสาค้ำ','form','ch');
  const mHP=matFor(hf,COL.ply,{roughness:0.85}), mHT=matFor(hf,COL.timber,{roughness:0.9});
  addFormBox(hf, P.chL, P.chW, P.chH, yColTop, t, mHP, mHT);
  addBox(hf, P.chL+2*t, t, P.chW+2*t, 0, yColTop-t, 0, mHP);            // แบบท้องคาน
  for(let i=0;i<4;i++){                                                  // คร่าวรับท้องคาน
    const x=-(P.chL/2)+ (i+0.5)*P.chL/4;
    addBox(hf, 0.12, 0.12, P.chW+2*t, x, yColTop-t-0.12, 0, mHT);
  }
  const ySoffit = yColTop-t-0.24;
  for(let s=-1;s<=1;s+=2) for(let i=0;i<3;i++){
    const x=s*(P.chL/2-0.5-i*1.3);
    if(Math.abs(x) < P.colB/2+0.35) continue;
    for(let zz=-1; zz<=1; zz+=2){
      addStrut(hf, V(x, ySoffit, zz*(P.chW/2-0.15)), V(x, yCapTop, zz*(P.chW/2-0.15)), 0.055, mHT);
    }
    addStrut(hf, V(x, yCapTop+0.35, -P.chW/2+0.15),
                 V(x, yCapTop+0.35,  P.chW/2-0.15), 0.045, mHT);
  }

  const hc = newGroup('chConc','คอนกรีตคานหัวเสา','conc','ch');
  addBox(hc, P.chL, P.chH, P.chW, 0, yColTop, 0, matFor(hc, COL.conc));

  /* ---------- แท่นรองรับ ---------- */
  const pdg = newGroup('ped','แท่นรองแผ่นยางรองรับ','conc','ch');
  if(P.pedN>0){
    const mPed=matFor(pdg, COL.ped), span=P.chL-1.2;
    for(let i=0;i<P.pedN;i++){
      const x=(P.pedN===1)?0:(-span/2+i*span/(P.pedN-1));
      addBox(pdg, 0.6, 0.2, 0.6, x, yColTop+P.chH, 0, mPed);
    }
  }

  /* ---------- จุดยึดป้ายกำกับ (กึ่งกลาง bbox ของแต่ละเลเยอร์) ---------- */
  const bb = new THREE.Box3();
  order.forEach(nm=>{
    const grp = groups[nm];
    grp.visible = true;                 // ต้องมองเห็นชั่วคราวเพื่อคำนวณ bbox
    bb.setFromObject(grp);
    if(isFinite(bb.min.x)) bb.getCenter(meta[nm].anchor);
    grp.userData.home = grp.position.clone();
    grp.visible = false;
  });

  /* ---------- ลำดับขั้นตอนก่อสร้าง ---------- */
  const stages = [];
  const add=(t2,d,on,off)=>stages.push({t:t2, d:d, on:on||[], off:off||[]});
  add('สภาพเดิม','ระดับดินเดิมก่อนเริ่มงาน',['ground','groundLid']);
  add('ขุดดินฐานราก','ขุดเผื่อพื้นที่ทำงานและความลาดข้าง — ปริมาตรบ่อ ไม่ใช่ขนาดฐานราก',['pit'],['groundLid']);
  add('ตัดหัวเข็ม','สกัดคอนกรีตหัวเข็ม เหลือเหล็กหนวดกุ้งฝังเข้าฐานราก',['piles']);
  add('เทคอนกรีตหยาบ','ปรับระดับ + เป็นแบบท้องฐานราก',['lean']);
  add('ผูกเหล็กฐานราก','ตะแกรงล่าง–บน + เหล็กข้าง วางบนลูกปูนหนุน',['capRebar']);
  add('ตั้งแบบฐานราก','แบบข้าง + คร่าว + ไม้ยันแบบกันแบบบาน',['capForm']);
  add('เทคอนกรีตฐานราก','1 object = 1 การเท = 1 กิจกรรมในแผน',['capConc']);
  add('ถอดแบบ + ถมกลับ','แบบหล่อหายไป (นำกลับไปใช้ซ้ำ) ดินถมกลับแสดงแบบโปร่งแสง',['backfill'],['capForm']);
  for(let L=0;L<P.lifts;L++){
    const tag=P.lifts>1?` (lift ${L+1}/${P.lifts})`:'';
    add('ผูกเหล็กเสาตอม่อ'+tag,'ต่อทาบกับเหล็กที่ทิ้งไว้จากชั้นล่าง',['colRebar'+L], L>0?['colForm'+(L-1)]:[]);
    add('ตั้งแบบเสา'+tag,'ความสูงแบบต่อครั้งเป็นตัวกำหนดว่าจะแตกกี่ object',['colForm'+L]);
    add('เทคอนกรีตเสา'+tag,'ผิวบนเป็นรอยต่อ ต้องสกัด/ล้าง ก่อนเทชั้นถัดไป',['colConc'+L]);
  }
  add('ผูกเหล็กคานหัวเสา','เหล็กนอน + ปลอก ต่อกับเหล็กเสาที่ยื่นขึ้นมา',['chRebar'],['colForm'+(P.lifts-1)]);
  add('ตั้งแบบคานหัวเสา','รวม “แบบท้องคาน” + คร่าว + เสาค้ำ — รายการที่มักตกหล่นจาก BOQ',['chForm']);
  add('เทคอนกรีตคานหัวเสา','',['chConc']);
  add('ถอดแบบ + หล่อแท่นรองรับ','',['ped'],['chForm']);
  add('เสร็จสมบูรณ์','ตอม่อพร้อมรับคานสะพาน',[]);

  /* เลเยอร์ไหนอยู่ขั้นไหน (ขั้นแรกที่ถูกเปิด) */
  stages.forEach((s,i)=> s.on.forEach(nm=>{
    if(meta[nm] && meta[nm].stage===undefined) meta[nm].stage = i;
  }));

  return {
    root, groups, order, meta, stages, params:P,
    levels:{yPitBot, yLeanTop, yCapTop, yColTop, yTop, tL, tW, bL, bW, colA, hLift},
    countMeshes(){ let c=0; root.traverse(x=>{if(x.isMesh)c++;}); return c; }
  };
}

function dispose(root){
  if(!root) return;
  root.traverse(x=>{
    if(x.isMesh){
      x.geometry.dispose();
      if(x.material && x.material.dispose) x.material.dispose();
    }
  });
}

/* ตั้งความทึบของเลเยอร์ (0..1) — ใช้ทั้งการเฟดและโหมด ghost */
function setOpacity(grp, o){
  grp.visible = o > 0.005;
  grp.userData.mats.forEach(m=>{
    if(m.userData.baseOp===undefined) m.userData.baseOp = m.transparent ? m.opacity : 1;
    const want = m.userData.baseOp * o;
    if(want >= 0.999){ m.transparent=false; m.opacity=1; }
    else { m.transparent=true; m.opacity=want; }
    m.needsUpdate = true;
  });
}

global.AssemblyModel = {build, dispose, setOpacity, COL, CAT, DEFAULTS};

})(window);
