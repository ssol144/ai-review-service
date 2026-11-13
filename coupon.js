/* ReviewMate channel coupon manager
   Demo: campaign planning + manual platform-registration tracking.
   Does NOT claim to issue coupons inside external apps. */
(() => {
  'use strict';
  const KEY='rm_channel_coupon_campaigns_v2';
  const $=s=>document.querySelector(s);
  const today=()=>new Date().toISOString().slice(0,10);
  const days=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const won=n=>new Intl.NumberFormat('ko-KR').format(Number(n||0))+'원';
  const platforms={
    naver:{name:'네이버 플레이스',kind:'방문 고객',hint:'네이버 플레이스의 매장 쿠폰 기능에서 별도로 등록'},
    baemin:{name:'배달의민족',kind:'배달 주문',hint:'배민 사장님 관리 화면의 쿠폰/할인 메뉴에서 별도로 등록'},
    yogiyo:{name:'요기요',kind:'배달 주문',hint:'요기요 매장 관리 화면에서 제공되는 쿠폰/할인 기능 확인 후 등록'},
    coupang:{name:'쿠팡이츠',kind:'배달 주문',hint:'쿠팡이츠 매장 관리 화면에서 제공되는 쿠폰/할인 기능 확인 후 등록'},
    store:{name:'매장 자체 쿠폰',kind:'매장 방문·POS',hint:'매장 POS 또는 직원 확인 절차로 자체 운영'}
  };
  const seed=[
    {id:'RMCP-001',name:'단골 감사 10% 할인',platform:'naver',type:'percent',value:10,min:15000,cap:5000,limit:30,issued:0,used:0,target:'리뷰 10회 작성 고객',start:today(),end:days(20),code:'RMTHANKS10',registration:'pending',memo:'네이버 플레이스 쿠폰에 수동 등록 후 사용'},
    {id:'RMCP-002',name:'배달 재주문 2,000원 할인',platform:'baemin',type:'fixed',value:2000,min:18000,cap:0,limit:100,issued:0,used:0,target:'배달 재주문 고객',start:today(),end:days(30),code:'RMAGAIN2000',registration:'pending',memo:'배민 쿠폰 정책과 최소 주문 금액 확인'}
  ];
  let rows=load(),filter='all';
  function load(){try{const x=JSON.parse(localStorage.getItem(KEY));return Array.isArray(x)?x:seed}catch{return seed}}
  function save(){localStorage.setItem(KEY,JSON.stringify(rows))}
  function state(c){if(c.registration==='paused')return'paused';if(c.end<today())return'ended';if(c.start>today())return'scheduled';return c.registration==='registered'?'registered':'pending'}
  function stateLabel(s){return({paused:'중지',ended:'기간 종료',scheduled:'시작 예정',registered:'플랫폼 등록 확인',pending:'플랫폼 등록 필요'})[s]||s}
  function benefit(c){return c.type==='percent'?`${c.value}% 할인`:c.type==='fixed'?`${won(c.value)} 할인`:`${esc(c.gift||'지정 상품')} 증정`}
  function ensurePage(){
    const nav=$('.side-nav');
    if(nav&&!nav.querySelector('[data-page="coupons"]'))nav.insertAdjacentHTML('beforeend','<button class="nav-item" data-page="coupons"><i>▣</i>쿠폰 관리 <span class="pro-tag">PRO</span></button>');
    const mobile=$('.mobile-nav');
    if(mobile&&!mobile.querySelector('[data-page="coupons"]'))mobile.insertAdjacentHTML('beforeend','<button data-page="coupons"><i>▣</i><span>쿠폰</span></button>');
    const main=$('.main-area');
    if(main&&!$('#page-coupons')){
      const page=document.createElement('section');page.className='page';page.id='page-coupons';
      page.innerHTML=`<div class="page-heading simple"><div><p class="eyebrow">CHANNEL COUPON MANAGER · PRO</p><h1>채널별 쿠폰 관리</h1><p class="subheading">쿠폰을 기획하고, 네이버·배달앱·매장별 등록 상태와 성과를 관리하세요.</p></div><button class="button button-dark" id="newCouponBtn">＋ 쿠폰 캠페인 만들기</button></div>
      <div class="coupon-stats" id="couponStats"></div>
      <div class="coupon-platforms">${Object.entries(platforms).map(([k,p])=>`<article class="platform-card"><b>${p.name}</b><small>${p.kind} 쿠폰</small><em>외부 플랫폼 등록 확인 필요</em></article>`).join('')}</div>
      <section class="panel coupon-create-banner"><div><p class="eyebrow">RETENTION CAMPAIGN</p><h3>리뷰 10회 고객에게 감사 혜택을 제공하세요.</h3><p>ReviewMate는 캠페인과 대상·조건을 관리합니다. 실제 쿠폰 등록과 할인 적용은 각 플랫폼에서 진행합니다.</p></div><button class="button button-dark" id="newCouponBtn2">새 캠페인 만들기</button></section>
      <div class="coupon-toolbar"><div class="filter-row"><button class="filter-chip selected" data-coupon-filter="all">전체</button><button class="filter-chip" data-coupon-filter="pending">등록 필요</button><button class="filter-chip" data-coupon-filter="registered">등록 확인</button><button class="filter-chip" data-coupon-filter="paused">중지</button><button class="filter-chip" data-coupon-filter="ended">종료</button></div><input id="couponSearch" class="coupon-search" placeholder="쿠폰명·코드·플랫폼 검색"></div>
      <div id="couponList" class="coupon-list"></div>
      <section class="panel coupon-history-panel"><div class="panel-heading"><div><p class="eyebrow">CAMPAIGN LOG</p><h3>플랫폼 등록·사용 현황</h3></div><span class="muted">외부 플랫폼 실적 수동 입력</span></div><div class="coupon-log-wrap"><table class="coupon-table"><thead><tr><th>쿠폰</th><th>플랫폼</th><th>발급/사용</th><th>등록 상태</th><th>관리</th></tr></thead><tbody id="couponLog"></tbody></table></div></section>
      <p class="coupon-note">중요: 현재 버전은 쿠폰 캠페인 기획·등록 체크리스트·실적 수기 관리 데모입니다. 네이버·배달의민족·요기요·쿠팡이츠의 실제 쿠폰 발급 API가 연결된 상태가 아닙니다. 플랫폼에서 쿠폰을 만든 뒤 '플랫폼 등록 완료'로 표시하고, 발급·사용 수치를 입력해 관리하세요. 리뷰 작성자 닉네임과 주문 고객 정보가 실제로 연결되는 범위는 각 플랫폼의 공식 제공 권한에 따릅니다.</p>
      <p class="privacy-note">고객의 실명·전화번호·주문정보를 임의로 수집하지 마세요. 플랫폼이 허용한 식별 범위와 고객 동의에 따라 관리해야 합니다.</p>`;
      const footer=$('.footer');if(footer)main.insertBefore(page,footer);else main.appendChild(page);
    }
  }
  function render(){
    if(!$('#couponStats'))return;
    const pending=rows.filter(c=>state(c)==='pending').length,registered=rows.filter(c=>state(c)==='registered').length,issued=rows.reduce((a,c)=>a+Number(c.issued||0),0),used=rows.reduce((a,c)=>a+Number(c.used||0),0);
    $('#couponStats').innerHTML=`<article class="coupon-stat"><small>전체 캠페인</small><strong>${rows.length}개</strong><em>생성한 쿠폰 기획</em></article><article class="coupon-stat"><small>플랫폼 등록 필요</small><strong>${pending}개</strong><em>외부 앱에서 등록해야 함</em></article><article class="coupon-stat"><small>등록 확인</small><strong>${registered}개</strong><em>사장님이 등록 상태 확인</em></article><article class="coupon-stat"><small>누적 사용률</small><strong>${issued?Math.round(used/issued*100):0}%</strong><em>${used} / ${issued}건 · 수기 집계</em></article>`;
    const q=($('#couponSearch')?.value||'').toLowerCase();
    const visible=rows.filter(c=>(filter==='all'||state(c)===filter)&&(`${c.name} ${c.code} ${platforms[c.platform].name}`.toLowerCase().includes(q)));
    $('#couponList').innerHTML=visible.length?visible.map(c=>{const st=state(c),p=platforms[c.platform],rate=c.issued?Math.min(100,Math.round(c.used/c.issued*100)):0;return `<article class="coupon-card"><div class="coupon-card-top"><span class="coupon-kind">${esc(p.name)} · ${p.kind}</span><span class="coupon-state ${st}">${stateLabel(st)}</span></div><h3>${esc(c.name)}</h3><div class="coupon-discount">${benefit(c)}</div><div class="coupon-meta"><span>대상 ${esc(c.target)}</span><span>최소 주문 ${c.min?won(c.min):'제한 없음'}</span><span>기간 ${esc(c.start)} ~ ${esc(c.end)}</span><span>발급 한도 ${c.limit?c.limit+'건':'무제한'}</span><span>발급 ${c.issued||0}건</span><span>사용 ${c.used||0}건 (${rate}%)</span></div><div class="coupon-progress"><span style="width:${rate}%"></span></div><div class="coupon-card-foot"><span class="coupon-code">${esc(c.code)}</span><div class="coupon-actions"><button data-act="guide" data-id="${c.id}">등록 안내</button><button data-act="counts" data-id="${c.id}">실적 입력</button><button data-act="registered" data-id="${c.id}">${c.registration==='registered'?'등록 확인됨':'등록 완료'}</button><button data-act="edit" data-id="${c.id}">수정</button><button class="danger" data-act="delete" data-id="${c.id}">삭제</button></div></div></article>`}).join(''):'<div class="coupon-empty">조건에 맞는 캠페인이 없습니다.</div>';
    $('#couponLog').innerHTML=rows.slice().reverse().map(c=>`<tr><td><b>${esc(c.name)}</b><br><small>${esc(c.code)}</small></td><td>${esc(platforms[c.platform].name)}</td><td>${c.issued||0} / ${c.used||0}</td><td>${stateLabel(state(c))}</td><td><button class="coupon-log-action" data-act="guide" data-id="${c.id}">등록 안내</button></td></tr>`).join('');
  }
  function openForm(c){
    let dlg=$('#couponDialog');if(!dlg){dlg=document.createElement('dialog');dlg.id='couponDialog';dlg.className='coupon-dialog';document.body.appendChild(dlg)}
    const val=c||{};
    dlg.innerHTML=`<div class="coupon-dialog-inner"><button class="coupon-dialog-x" type="button" data-close>×</button><h2>${c?'캠페인 수정':'쿠폰 캠페인 만들기'}</h2><p class="muted">사용할 플랫폼과 쿠폰 조건을 설정하세요.</p><form id="couponForm"><div class="coupon-form-grid">
    <div class="coupon-field full"><label>캠페인 이름 *</label><input id="cfName" required maxlength="45" value="${esc(val.name||'')}" placeholder="예: 리뷰 10회 감사 쿠폰"></div>
    <div class="coupon-field"><label>사용 플랫폼 *</label><select id="cfPlatform">${Object.entries(platforms).map(([k,p])=>`<option value="${k}" ${val.platform===k?'selected':''}>${p.name} · ${p.kind}</option>`).join('')}</select></div>
    <div class="coupon-field"><label>혜택 유형</label><select id="cfType"><option value="percent" ${val.type==='percent'?'selected':''}>정률 할인</option><option value="fixed" ${val.type==='fixed'?'selected':''}>금액 할인</option><option value="gift" ${val.type==='gift'?'selected':''}>제품·서비스 증정</option></select></div>
    <div class="coupon-field"><label>할인율 / 금액</label><input id="cfValue" type="number" min="0" value="${val.value??10}"></div>
    <div class="coupon-field"><label>증정 상품명 (증정형)</label><input id="cfGift" value="${esc(val.gift||'')}" placeholder="예: 아메리카노 1잔"></div>
    <div class="coupon-field"><label>최소 주문 금액 (원)</label><input id="cfMin" type="number" min="0" value="${val.min??10000}"></div>
    <div class="coupon-field"><label>최대 할인 금액 (원)</label><input id="cfCap" type="number" min="0" value="${val.cap??5000}"></div>
    <div class="coupon-field"><label>발급 수량 제한 (0은 무제한)</label><input id="cfLimit" type="number" min="0" value="${val.limit??100}"></div>
    <div class="coupon-field"><label>발급 대상 그룹</label><select id="cfTarget">${['전체 고객','신규 고객','재방문 고객','리뷰 10회 작성 고객','단골 고객','불만 이력 고객'].map(x=>`<option ${val.target===x?'selected':''}>${x}</option>`).join('')}</select></div>
    <div class="coupon-field"><label>시작일</label><input id="cfStart" type="date" value="${val.start||today()}" required></div>
    <div class="coupon-field"><label>종료일</label><input id="cfEnd" type="date" value="${val.end||days(30)}" required></div>
    <div class="coupon-field full"><label>사용 조건 / 메모</label><textarea id="cfMemo">${esc(val.memo||'')}</textarea></div>
    </div><p class="coupon-alert">쿠폰 코드는 매장 내부 캠페인 식별용입니다. 외부 플랫폼의 실제 쿠폰 코드나 할인 적용 코드는 해당 플랫폼에서 별도로 발급해야 합니다.</p><div class="coupon-dialog-actions"><button class="button button-outline" type="button" data-close>취소</button><button class="button button-dark" type="submit">저장</button></div></form></div>`;
    dlg.showModal();dlg.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>dlg.close());
    dlg.querySelector('#cfType').onchange=e=>{dlg.querySelector('#cfValue').disabled=e.target.value==='gift'};
    dlg.querySelector('#couponForm').onsubmit=e=>{e.preventDefault();const name=$('#cfName').value.trim(),type=$('#cfType').value,value=Number($('#cfValue').value||0),start=$('#cfStart').value,end=$('#cfEnd').value,limit=Number($('#cfLimit').value||0);if(!name||!start||!end||end<start||limit<0||(type==='percent'&&(value<=0||value>100))||(type==='fixed'&&value<=0)){alert('쿠폰 이름, 할인 값, 수량 및 기간을 확인해 주세요.');return}
    const data={name,platform:$('#cfPlatform').value,type,value,gift:$('#cfGift').value.trim(),min:Number($('#cfMin').value||0),cap:Number($('#cfCap').value||0),limit,target:$('#cfTarget').value,start,end,memo:$('#cfMemo').value.trim()};
    if(c)Object.assign(c,data);else rows.push({...data,id:'RMCP-'+Date.now(),issued:0,used:0,registration:'pending',code:'RM-'+Math.random().toString(36).slice(2,8).toUpperCase()});
    save();dlg.close();render();toast(c?'캠페인을 수정했습니다.':'쿠폰 캠페인을 저장했습니다. 플랫폼에 등록해야 실제 사용 가능합니다.');};
  }
  function guide(c){
    const p=platforms[c.platform];
    const msg=`[ReviewMate 쿠폰 등록 체크리스트]\n플랫폼: ${p.name}\n캠페인: ${c.name}\n혜택: ${c.type==='gift'?(c.gift||'증정 상품')+' 증정':c.type==='percent'?c.value+'% 할인':won(c.value)+' 할인'}\n최소 주문 금액: ${c.min?won(c.min):'제한 없음'}\n최대 할인: ${c.cap?won(c.cap):'제한 없음'}\n대상: ${c.target}\n기간: ${c.start} ~ ${c.end}\n발급 한도: ${c.limit||'무제한'}\n\n등록 안내: ${p.hint}\n※ 외부 플랫폼에서 동일 조건으로 등록한 뒤 ReviewMate에서 '등록 완료'로 표시하세요.`;
    alert(msg);
  }
  function counts(c){
    const issued=prompt('플랫폼에서 확인한 누적 발급 수를 입력하세요.',String(c.issued||0));if(issued===null)return;
    const used=prompt('플랫폼에서 확인한 누적 사용 수를 입력하세요.',String(c.used||0));if(used===null)return;
    const a=Number(issued),b=Number(used);if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||b>a){alert('발급/사용 수량을 다시 확인해 주세요.');return}
    c.issued=a;c.used=b;save();render();toast('플랫폼 실적을 업데이트했습니다.');
  }
  function toast(s){const t=$('#toast');if(t){t.textContent=s;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2400)}else alert(s)}
  function bind(){
    document.addEventListener('click',e=>{
      const create=e.target.closest('#newCouponBtn,#newCouponBtn2');if(create){openForm();return}
      const f=e.target.closest('[data-coupon-filter]');if(f){filter=f.dataset.couponFilter;document.querySelectorAll('[data-coupon-filter]').forEach(x=>x.classList.toggle('selected',x===f));render();return}
      const b=e.target.closest('[data-act]');if(!b)return;const c=rows.find(x=>x.id===b.dataset.id);if(!c)return;
      if(b.dataset.act==='guide')guide(c);
      if(b.dataset.act==='counts')counts(c);
      if(b.dataset.act==='registered'){c.registration=c.registration==='registered'?'pending':'registered';save();render();toast('플랫폼 등록 상태를 변경했습니다.')}
      if(b.dataset.act==='edit')openForm(c);
      if(b.dataset.act==='delete'&&confirm('이 쿠폰 캠페인을 삭제할까요?')){rows=rows.filter(x=>x.id!==c.id);save();render()}
    });
    document.addEventListener('input',e=>{if(e.target.id==='couponSearch')render()});
  }
  function init(){ensurePage();render();bind()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();