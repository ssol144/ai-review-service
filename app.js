const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const STORE_KEY = "sajang-demo-v1";
const seed = {
  storeName:"우리동네 김밥집", ownerName:"사장님",
  reviews:[
    {id:1,name:"김**",stars:2,channel:"네이버 플레이스",date:"오늘 10:42",text:"포장이 조금 아쉬웠어요. 소스가 새서 왔네요.",status:"pending",reply:""},
    {id:2,name:"이**",stars:5,channel:"배달앱",date:"오늘 09:18",text:"음식도 맛있고 사장님도 친절해요! 다음에 또 주문할게요.",status:"pending",reply:""},
    {id:3,name:"박**",stars:3,channel:"네이버 플레이스",date:"어제 19:30",text:"음식은 맛있었는데 배달이 조금 늦었어요.",status:"pending",reply:""},
    {id:4,name:"최**",stars:5,channel:"배달앱",date:"어제 13:20",text:"양도 푸짐하고 맛있습니다. 잘 먹었습니다.",status:"done",reply:"소중한 리뷰 남겨주셔서 정말 감사합니다. 맛있게 드셨다니 큰 힘이 됩니다. 다음에도 만족스러운 한 끼를 준비해 기다리겠습니다!"}
  ],
  customers:[
    {id:1,name:"단골 고객 A",visits:12,note:"지난 주문에서 소스 누락 문의. 다음 방문 시 먼저 확인하고 감사 인사 전하기.",kind:"확인 필요"},
    {id:2,name:"단골 고객 B",visits:10,note:"리뷰 10회 작성. 단골 쿠폰 발급 대상입니다.",kind:"쿠폰 대상"},
    {id:3,name:"단골 고객 C",visits:8,note:"김밥 메뉴를 자주 주문하는 고객.",kind:"단골"}
  ],
  tasks:[
    {id:1,title:"포장 용기 밀봉 상태 점검",detail:"최근 포장 관련 의견 반복",done:false},
    {id:2,title:"소스 별도 포장 여부 확인",detail:"누수 방지를 위한 포장 방식 확인",done:false},
    {id:3,title:"답글 대기 리뷰 확인",detail:"이번 주 리뷰 답글 관리",done:true}
  ], sns:[]
};
let state = loadState(), activeFilter="all";
function loadState(){try{return {...seed,...JSON.parse(localStorage.getItem(STORE_KEY)||"{}")}}catch{return structuredClone(seed)}}
function persist(){localStorage.setItem(STORE_KEY,JSON.stringify(state))}
function toast(msg){const el=$("#toast");el.textContent=msg;el.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove("show"),2200)}
function escapeHtml(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
const pageNames={dashboard:"오늘의 매장 현황",reviews:"리뷰 관리",customers:"고객 관리",analytics:"매장 분석",tasks:"개선 과제",assistant:"AI 상담 비서",sns:"SNS 마케팅",settings:"설정"};
function go(page){$$(".page").forEach(p=>p.classList.toggle("active",p.id===`page-${page}`));$$("[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===page));$("#breadcrumbs").textContent=pageNames[page]||"";window.scrollTo({top:0,behavior:"smooth"});render()}
document.addEventListener("click",e=>{const b=e.target.closest("[data-page]");if(b){e.preventDefault();go(b.dataset.page)}});
function render(){renderDashboard();renderReviews();renderCustomers();renderTasks();renderSns();$("#storeNameSide").textContent=state.storeName;$("#storeNameInput").value=state.storeName;$("#ownerNameInput").value=state.ownerName;$("#ownerGreeting").textContent=state.ownerName}
function renderDashboard(){
 const pending=state.reviews.filter(r=>r.status!=="approved"&&r.status!=="done");$("#pendingMetric").innerHTML=`${pending.length}<span class="metric-unit">건</span>`;$("#lowReviewCount").textContent=state.reviews.filter(isNegativeReview).length+"건";$("#reviewBadge").textContent=state.reviews.filter(isNegativeReview).length;
 $("#dashboardReviews").innerHTML=state.reviews.slice(0,3).map(r=>`<div class="compact-review"><div class="review-meta"><span class="stars">${"★".repeat(r.stars)}${"☆".repeat(5-r.stars)}</span><span>${escapeHtml(r.name)} · ${escapeHtml(r.date)}</span><span class="tag ${isNegativeReview(r)?"alert":"good"}">${isNegativeReview(r)?"확인 필요":"긍정 리뷰"}</span></div><p class="review-text">${escapeHtml(r.text)}</p><div class="review-actions"><span class="muted">${escapeHtml(r.channel)}</span><button class="text-button" data-review-open="${r.id}">답글 확인 →</button></div></div>`).join("")||'<p class="empty-state">등록된 리뷰가 없습니다.</p>';
}
function isNegativeReview(r){
 const text=(r.text||"").toLowerCase();
 const negativeWords=["아쉽","불편","늦","지연","식었","차갑","누수","샜","새서","불친절","별로","실망","최악","짜증","문제","부족","상했","누락","잘못","불만","느리","오래","딱딱","눅눅","불량","환불","취소","파손","깨졌","불쾌","불편했"];
 const positiveWords=["맛있","친절","좋았","좋아요","최고","만족","푸짐","추천","감사","훌륭","재주문","또 주문","잘 먹","빠르","깔끔","신선","정성"];
 const neg=negativeWords.filter(w=>text.includes(w)).length;
 const pos=positiveWords.filter(w=>text.includes(w)).length;
 // 별점 1~3점은 우선 확인 대상으로 분류하고, 4~5점도 내용에 불만 표현이 뚜렷하면 주의 리뷰로 분류
 return Number(r.stars)<=3 || neg>pos;
}
function reviewSentiment(r){
 if(isNegativeReview(r)) return "negative";
 const text=(r.text||"").toLowerCase();
 const positiveWords=["맛있","친절","좋았","좋아요","최고","만족","푸짐","추천","감사","훌륭","재주문","또 주문","잘 먹","빠르","깔끔","신선","정성"];
 if(Number(r.stars)>=4 || positiveWords.some(w=>text.includes(w))) return "positive";
 return "neutral";
}
function renderReviews(){
 const list=state.reviews.filter(r=>
  activeFilter==="all" ||
  (activeFilter==="low" && isNegativeReview(r)) ||
  (activeFilter==="pending" && r.status!=="approved" && r.status!=="done") ||
  (activeFilter==="done" && (r.status==="approved" || r.status==="done"))
 );
 $("#reviewList").innerHTML=list.map(r=>{
  const sentiment=reviewSentiment(r), negative=sentiment==="negative";
  const sentimentLabel=negative?"부정 · 확인 필요":sentiment==="positive"?"긍정 리뷰":"중립 리뷰";
  const statusLabel=(r.status==="approved"||r.status==="done")?"검토 완료 · 게시 전":r.aiStatus==="generating"?"AI 답변 생성 중":r.reply?"AI 초안 확인":"AI 초안 준비 중";
  const statusClass=negative?"alert":sentiment==="positive"?"good":"";
  const replyArea=r.reply
   ? `<div class="reply-box"><div class="review-reply-head"><b class="small">AI 답변 초안</b><span class="tag">${r.status==="approved"||r.status==="done"?"검토 완료 · 게시 전":"사장님 확인 필요"}</span></div><textarea id="replybox-${r.id}" aria-label="AI 답변 초안">${escapeHtml(r.reply)}</textarea><div class="button-row"><button class="button button-dark" data-save-reply="${r.id}">${r.status==="approved"||r.status==="done"?"수정 내용 저장":"확인 완료 · 게시 전 저장"}</button><button class="button button-outline" data-copy-reply="${r.id}">답변 복사</button></div><small class="reply-help">저장해도 외부 플랫폼에 자동 게시되지는 않아요. 복사한 답변을 해당 리뷰 채널에 등록해 주세요.</small></div>`
   : `<div class="reply-box"><b class="small">AI 답변 초안</b><p class="muted">${r.aiStatus==="generating"?"리뷰 내용을 분석해 답변을 작성하고 있어요.":"AI 답변을 준비하고 있어요."}</p><button class="button button-outline" data-generate-reply="${r.id}" ${r.aiStatus==="generating"?"disabled":""}>다시 생성하기</button></div>`;
  return `<article class="review-card"><div class="review-card-top"><div class="review-meta"><span class="stars">${"★".repeat(r.stars)}${"☆".repeat(5-r.stars)}</span><b>${escapeHtml(r.name)}</b><span>${escapeHtml(r.channel)}</span><span>${escapeHtml(r.date)}</span></div><span class="tag ${statusClass}">${sentimentLabel}</span></div><p>${escapeHtml(r.text)}</p><div class="review-status-line"><span class="muted">${statusLabel}</span></div>${replyArea}</article>`;
 }).join("")||'<div class="panel empty-state">해당하는 리뷰가 없습니다.</div>';
}
function renderCustomers(){$("#customerList").innerHTML=state.customers.map(c=>`<div class="customer-row"><div class="customer-avatar">${escapeHtml(c.name.slice(-1))}</div><div class="customer-info"><b>${escapeHtml(c.name)} <span class="tag">${escapeHtml(c.kind)}</span></b><small>리뷰 ${c.visits}회 · ${escapeHtml(c.note)}</small></div><button class="text-button" data-coupon="${c.id}">쿠폰 발급</button></div>`).join("")}
function renderTasks(){const done=state.tasks.filter(t=>t.done).length;$("#taskDone").textContent=done;$("#taskOpen").textContent=state.tasks.length-done;$("#taskList").innerHTML=state.tasks.map(t=>`<div class="task-row ${t.done?"done":""}"><input type="checkbox" data-task="${t.id}" ${t.done?"checked":""} aria-label="과제 완료"><span class="task-title">${escapeHtml(t.title)}<small style="display:block">${escapeHtml(t.detail||"")}</small></span><span class="tag">${t.done?"완료":"진행 중"}</span></div>`).join("")}
function renderSns(){$("#snsCalendar").innerHTML=state.sns.length?state.sns.map((s,i)=>`<div class="calendar-item"><b>${escapeHtml(s.platform)} · ${escapeHtml(s.topic)}</b>${escapeHtml(s.text.slice(0,130))}${s.text.length>130?"…":""}</div>`).join(""):'<p class="empty-state">아직 저장된 콘텐츠가 없습니다.</p>'}
function makeReply(r){
 const negative=isNegativeReview(r);
 const text=(r.text||"").toLowerCase();
 let middle;
 if(text.includes("포장")||text.includes("소스")||text.includes("샜")||text.includes("누수")){
  middle=negative
   ?"말씀해 주신 포장 상태와 소스 누수 문제를 가볍게 여기지 않고 확인하겠습니다. 포장 용기와 밀봉 과정을 점검해 같은 불편이 반복되지 않도록 하겠습니다."
   :"포장에 관한 의견도 세심하게 살펴 더 만족스러운 이용 경험을 드릴 수 있도록 하겠습니다.";
 }else if(text.includes("배달")||text.includes("늦")||text.includes("지연")){
  middle=negative
   ?"배달이 늦어진 원인을 확인하고 조리 및 전달 과정을 점검하겠습니다. 기다리시는 동안 불편을 드리지 않도록 개선하겠습니다."
   :"배달 과정에 관한 의견도 참고해 더 안정적으로 음식을 전달해 드릴 수 있도록 노력하겠습니다.";
 }else if(negative){
  middle="남겨주신 내용을 꼼꼼히 확인하고 해당 부분을 점검하겠습니다. 말씀해 주신 불편이 개선될 수 있도록 매장 운영에 반영하겠습니다.";
 }else{
  middle="남겨주신 따뜻한 말씀은 직원들과도 공유하겠습니다. 보내주신 의견을 바탕으로 더 나은 맛과 서비스를 유지하도록 노력하겠습니다.";
 }
 const opening=negative
  ?"먼저 이용에 불편을 드려 죄송합니다. 소중한 의견을 남겨주셔서 감사합니다."
  :"소중한 리뷰를 남겨주셔서 진심으로 감사합니다.";
 const ending=negative
  ?"다시 방문하셨을 때는 더 만족스러운 경험을 드릴 수 있도록 세심하게 살피겠습니다."
  :"앞으로도 기분 좋은 식사 시간을 드릴 수 있도록 정성을 다하겠습니다. 감사합니다.";
 return `${opening} ${middle} ${ending}`;
}
async function requestAI(prompt,kind){
 try{
  const res=await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,kind})});
  if(!res.ok)throw new Error("AI API not configured");
  const data=await res.json();
  return typeof data.text==="string"&&data.text.trim()?data.text.trim():null;
 }catch(e){return null}
}
const generatingReviews=new Set();
async function generateReviewReply(r,force=false){
 if(!r||generatingReviews.has(r.id))return;
 if(r.reply&&!force)return;
 generatingReviews.add(r.id);
 r.aiStatus="generating";
 persist();
 renderReviews();
 const sentiment=reviewSentiment(r);
 const guidance=sentiment==="negative"
  ?"부정적이거나 불편을 표현한 리뷰입니다. 먼저 고객의 감정에 공감하고 정중하게 사과한 뒤, 확인 및 개선 의지를 표현하세요. 고객 탓을 하거나 변명하지 말고, 실제로 확인되지 않은 보상·조치·사실을 약속하지 마세요."
  :"긍정적인 리뷰입니다. 감사 인사를 전하고 고객이 언급한 좋은 점을 자연스럽게 짚어 따뜻하게 답변하세요. 과장된 사실은 만들지 마세요.";
 const ai=await requestAI(`당신은 소상공인 매장의 리뷰 답변 담당자입니다. 아래 리뷰에 맞는 자연스럽고 정중한 한국어 사장님 답글을 3~5문장으로 작성하세요. ${guidance} 리뷰 별점: ${r.stars}점. 리뷰 내용: ${r.text}`, "review");
 r.reply=ai||makeReply(r);
 r.aiStatus="ready";
 r.status=(r.status==="approved"||r.status==="done")?"approved":"pending";
 persist();
 generatingReviews.delete(r.id);
 render();
}
function openDialog(html){$("#dialogContent").innerHTML=html;$("#appDialog").showModal()}
document.addEventListener("click",async e=>{
 const gen=e.target.closest("[data-generate-reply]");
 if(gen){
  const id=+gen.dataset.generateReply,r=state.reviews.find(x=>x.id===id);
  if(r){r.reply="";await generateReviewReply(r,true)}
  return;
 }
 const save=e.target.closest("[data-save-reply]");
 if(save){
  const id=+save.dataset.saveReply,r=state.reviews.find(x=>x.id===id);
  r.reply=$(`#replybox-${id}`).value.trim();
  if(r.reply.length<10)return toast("답글을 조금 더 작성해 주세요.");
  r.status="approved";r.aiStatus="ready";persist();render();
  toast("답변을 검토 완료 상태로 저장했어요. 실제 게시 전 채널에서 등록해 주세요.");
  return;
 }
 const copy=e.target.closest("[data-copy-reply]");
 if(copy){
  const r=state.reviews.find(x=>x.id===+copy.dataset.copyReply);
  if(!r?.reply)return;
  try{await navigator.clipboard.writeText(r.reply);toast("답변을 복사했어요. 해당 리뷰 채널에 붙여넣어 주세요.")}
  catch{toast("복사 권한을 허용한 뒤 다시 시도해 주세요.")}
  return;
 }
 const op=e.target.closest("[data-review-open]");
 if(op){go("reviews");const r=state.reviews.find(x=>x.id===+op.dataset.reviewOpen);if(r)toast(`${r.name} 고객의 리뷰를 확인해 주세요.`)}
 const coupon=e.target.closest("[data-coupon]");
 if(coupon){const c=state.customers.find(x=>x.id===+coupon.dataset.coupon);toast(`${c.name} 쿠폰 발급 준비 완료 · 실제 발송은 쿠폰 채널 연동 필요`)}
 const task=e.target.closest("[data-task]");
 if(task){const t=state.tasks.find(x=>x.id===+task.dataset.task);t.done=task.checked;persist();renderTasks()}
});
$$(".filter-chip").forEach(b=>b.addEventListener("click",()=>{activeFilter=b.dataset.filter;$$(".filter-chip").forEach(x=>x.classList.toggle("selected",x===b));renderReviews()}));
$("#addReviewBtn").onclick=()=>openDialog(`<h3>리뷰 추가</h3><label class="field-label">고객 표시명</label><input class="dialog-field" id="newReviewName" value="신규 고객"><label class="field-label">별점 (1~5)</label><select class="dialog-field" id="newReviewStars"><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select><label class="field-label">리뷰 내용</label><textarea class="dialog-field" id="newReviewText" placeholder="리뷰 내용을 입력하세요."></textarea><button class="button button-dark" id="createReview">등록하기</button>`);
$("#dialogContent").addEventListener("click",e=>{if(e.target.id==="createReview"){const text=$("#newReviewText").value.trim();if(!text)return toast("리뷰 내용을 입력해 주세요.");const newReview={id:Date.now(),name:$("#newReviewName").value||"고객",stars:+$("#newReviewStars").value,channel:"직접 등록",date:"방금 전",text,status:"pending",reply:"",aiStatus:"waiting"};state.reviews.unshift(newReview);persist();$("#appDialog").close();render();toast("리뷰를 등록했어요. AI가 답변 초안을 작성합니다.");generateReviewReply(newReview);}});
$("#addCustomerBtn").onclick=()=>openDialog(`<h3>고객 메모 추가</h3><label class="field-label">고객 별칭</label><input class="dialog-field" id="custName" placeholder="예: 단골 고객 D"><label class="field-label">리뷰 횟수</label><input class="dialog-field" id="custVisits" type="number" min="0" value="1"><label class="field-label">메모</label><textarea class="dialog-field" id="custNote" placeholder="필요한 내용만 간단히 기록하세요."></textarea><button class="button button-dark" id="createCustomer">저장하기</button>`);
$("#dialogContent").addEventListener("click",e=>{if(e.target.id==="createCustomer"){const name=$("#custName").value.trim();if(!name)return toast("고객 별칭을 입력해 주세요.");state.customers.push({id:Date.now(),name,visits:+$("#custVisits").value||0,note:$("#custNote").value,kind:"메모 등록"});persist();$("#appDialog").close();renderCustomers();toast("고객 메모를 저장했어요.")}});
$("#addTaskBtn").onclick=()=>openDialog(`<h3>개선 과제 추가</h3><label class="field-label">과제명</label><input class="dialog-field" id="taskName" placeholder="예: 배달 포장 점검"><label class="field-label">상세 내용</label><input class="dialog-field" id="taskDetail" placeholder="실행할 내용을 입력하세요."><button class="button button-dark" id="createTask">과제 등록</button>`);
$("#dialogContent").addEventListener("click",e=>{if(e.target.id==="createTask"){const title=$("#taskName").value.trim();if(!title)return toast("과제명을 입력해 주세요.");state.tasks.unshift({id:Date.now(),title,detail:$("#taskDetail").value,done:false});persist();$("#appDialog").close();renderTasks();toast("개선 과제를 등록했어요.")}});
$("#generateSns").onclick=async()=>{const topic=$("#snsTopic").value.trim()||"오늘의 매장 이야기",platform=$("#snsPlatform").value,tone=$("#snsTone").value;$("#snsOutput").value="콘텐츠를 작성하고 있어요…";const ai=await requestAI(`${platform}용 매장 홍보 게시글을 작성하세요. 주제: ${topic}. 말투: ${tone}. 자연스럽고 과장된 사실은 만들지 마세요. 해시태그도 3~5개 추가하세요.`,"social");$("#snsOutput").value=ai||`${topic} 소식을 전해드려요.\\n\\n오늘도 찾아주시는 한 분 한 분께 정성을 다하겠습니다. 편안한 마음으로 들러주세요.\\n\\n#동네맛집 #오늘의한끼 #우리동네` ;toast("콘텐츠 초안을 만들었어요.")};
$("#copySns").onclick=async()=>{const t=$("#snsOutput").value;if(!t)return toast("복사할 콘텐츠가 없어요.");try{await navigator.clipboard.writeText(t);toast("콘텐츠를 복사했어요.")}catch{toast("브라우저에서 복사를 허용해 주세요.")}};
$("#saveSns").onclick=()=>{const text=$("#snsOutput").value.trim();if(!text)return toast("먼저 콘텐츠를 작성해 주세요.");state.sns.unshift({platform:$("#snsPlatform").value,topic:$("#snsTopic").value||"매장 소식",text,date:new Date().toISOString()});persist();renderSns();toast("콘텐츠 초안을 캘린더에 저장했어요.")};
$("#chatForm").onsubmit=async e=>{e.preventDefault();const input=$("#chatInput"),q=input.value.trim();if(!q)return;addChat(q,"user");input.value="";const response=await requestAI(`다음은 소상공인 매장의 샘플 리뷰 요약입니다: 긍정 키워드 맛/친절/양, 부정 키워드 포장/배달 지연/음식 온도. 질문: ${q}. 리뷰 데이터에 근거해 한국어로 답하고 데이터에 없는 사실은 추측하지 마세요.`,"assistant");addChat(response||localAnswer(q),"ai")};
function addChat(t,type){const d=document.createElement("div");d.className=`chat-bubble ${type}`;d.textContent=t;$("#chatMessages").append(d);$("#chatMessages").scrollTop=$("#chatMessages").scrollHeight}
function localAnswer(q){if(q.includes("불만"))return"최근 샘플 리뷰에서 반복적으로 언급된 불만은 포장 상태, 배달 지연, 음식 온도예요. 우선 포장 용기 밀봉 상태와 소스 분리 포장을 점검해 보시는 것을 추천해요.";if(q.includes("장점"))return"고객은 음식 맛과 친절한 응대를 긍정적으로 언급하고 있어요. 이 두 가지를 매장의 강점으로 유지하고 SNS 콘텐츠에도 자연스럽게 소개해 보세요.";return"샘플 리뷰 기준으로 포장 상태 점검을 우선 추천해요. 반복 언급되는 문제를 개선 과제로 등록하고, 이후 리뷰에서 같은 표현이 줄어드는지 확인해 보세요."}
$$(".suggestion").forEach(b=>b.onclick=()=>{$("#chatInput").value=b.textContent;$("#chatForm").requestSubmit()});
$("#saveSettings").onclick=()=>{state.storeName=$("#storeNameInput").value.trim()||"내 매장";state.ownerName=$("#ownerNameInput").value.trim()||"사장님";persist();render();toast("매장 정보를 저장했어요.")};
$("#resetDemo").onclick=()=>{if(confirm("저장된 데모 데이터를 초기화할까요?")){localStorage.removeItem(STORE_KEY);state=structuredClone(seed);render();toast("샘플 데이터를 초기화했어요.")}};
$("#noticeBtn").onclick=()=>{go("reviews");toast("답글 대기 리뷰를 확인해 주세요.")};
const now=new Date();$("#todayLabel").textContent=now.toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric"});$("#dateLarge").textContent=now.toLocaleDateString("ko-KR",{month:"long",day:"numeric",weekday:"short"});render();
// 리뷰가 등록되거나 앱을 열 때 답변 초안이 없는 리뷰는 자동으로 생성합니다.
// 실제 플랫폼 게시 전에는 반드시 사장님이 내용을 확인하고 승인해야 합니다.
state.reviews.forEach(r=>{
 if(!r.reply && r.status!=="approved" && r.status!=="done") generateReviewReply(r);
});
