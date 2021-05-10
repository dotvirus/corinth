import{c as e,d as t,r as l,o as a,a as s,b as n,e as o,w as r,t as u,f as i,g as d,h as c,D as p,F as m,i as f,T as g,j as v,v as x,k as y,l as w,m as b,n as h,p as q,q as k,s as _}from"./vendor.85673e19.js";!function(e=".",t="__import__"){try{self[t]=new Function("u","return import(u)")}catch(l){const a=new URL(e,location),s=e=>{URL.revokeObjectURL(e.src),e.remove()};self[t]=e=>new Promise(((l,n)=>{const o=new URL(e,a);if(self[t].moduleMap[o])return l(self[t].moduleMap[o]);const r=new Blob([`import * as m from '${o}';`,`${t}.moduleMap['${o}']=m;`],{type:"text/javascript"}),u=Object.assign(document.createElement("script"),{type:"module",src:URL.createObjectURL(r),onerror(){n(new Error(`Failed to import: ${e}`)),s(u)},onload(){l(self[t].moduleMap[o]),s(u)}});document.head.appendChild(u)})),self[t].moduleMap={}}}("/dashboard/assets/");const C=new e.Corinth("");var Q=t({name:"App",setup(){const e=l(""),t=l(!0);return a((async()=>{e.value=await C.version()})),{version:e,dialog:t}}});const D={class:"h-full app"},U={class:"fixed w-full shadow-md p-3 flex justify-center align-center",id:"header"},j=o("div",{class:"font-bold mr-2"}," Corinth ",-1),$={class:"text-medium text-opacity-60"},N=i("Queues"),R={class:"px-3 pt-16",id:"content"},V={class:"mx-auto max-w-screen-lg"},L=o("div",{id:"dialog-target",class:"fixed"},null,-1),M={class:"p-3 bg-gray-200 text-center mt-auto text-gray-600 text-md"},P=i(" Corinth version: "),z={class:"font-semibold"},O=o("div",null,[i("Dashboard version: "),o("span",{class:"font-semibold"},"0.0.1")],-1);Q.render=function(e,t,l,a,i,c){const p=s("router-link"),m=s("router-view");return d(),n("div",D,[o("div",U,[j,o("div",$,[o(p,{to:"/queues"},{default:r((()=>[N])),_:1})])]),o("div",R,[o("div",V,[o(m)])]),L,o("footer",M,[o("div",null,[P,o("span",z,u(e.version),1)]),O])])};var S=t({name:"Queues",setup(){const e=l([]),t=l(!1),s=l(""),n=l(!0),o=l(300),r=l(300),u=l(0),i=c((()=>p(s.value)));return a((async()=>{e.value=await C.listQueues()})),{queues:e,tableHeaders:[{title:"Name"},{title:"Creation date"},{title:"Size"},{title:"In flight",tooltip:"Unacknowledged messages"},{title:"Successful",tooltip:"Acknowledged ('ack') messages"},{title:"Memory size"},{title:"Persistent"}],createDialog:t,queueName:s,queuePersistent:n,slug:i,createQueue:async function(){try{await C.defineQueue(i.value).ensure({deduplication_time:o.value,requeue_time:r.value,persistent:n.value,max_length:u.value}),se.push(`/queue/${i.value}`)}catch(e){}}}}});const F={class:"min-w-max w-full table-auto shadow"},H={class:"\r\n            bg-gray-200\r\n            text-gray-600\r\n            uppercase\r\n            text-sm\r\n            leading-normal\r\n            font-semibold\r\n          "},A={class:"text-gray-600 text-sm"},B={class:"border-b border-gray-200 hover:bg-gray-200"},E={class:"py-3 px-1 text-left whitespace-nowrap font-semibold"},I={class:"hover:text-blue-600"},J={class:"py-3 px-1 text-left whitespace-nowrap"},T={class:"py-3 px-1 text-left whitespace-nowrap"},W={class:"py-3 px-1 text-left whitespace-nowrap"},Y={class:"py-3 px-1 text-left whitespace-nowrap"},G={class:"py-3 px-1 text-left whitespace-nowrap"},K={class:"py-3 px-1 text-left whitespace-nowrap"},X=i("Create queue"),Z=o("div",{style:{"flex-grow":"1"}},null,-1),ee=o("div",{style:{"flex-grow":"1"}},null,-1),te=i(" Will be created as "),le=o("div",{class:"inline-block ml-2 font-semibold text-sm opacity-80"}," Persistent ",-1);S.render=function(e,t,l,a,i,c){const p=s("router-link"),w=s("c-dialog");return d(),n("div",null,[o("table",F,[o("thead",null,[o("tr",H,[(d(!0),n(m,null,f(e.tableHeaders,(e=>(d(),n("td",{class:["py-3 px-1 text-left",{tooltip:!!e.tooltip}],key:e.title,title:e.tooltip},u(e.title),11,["title"])))),128))])]),o("tbody",A,[o("tr",B,[o("td",{onClick:t[1]||(t[1]=t=>e.createDialog=!0),colspan:7,class:"\r\n              py-3\r\n              px-1\r\n              text-left\r\n              whitespace-nowrap\r\n              font-semibold\r\n              cursor-pointer\r\n            "}," + Create new queue ")]),(d(!0),n(m,null,f(e.queues,(e=>(d(),n("tr",{class:"border-b border-gray-200",key:e.name},[o("td",E,[o(p,{to:`/queue/${e.name}`},{default:r((()=>[o("span",I,u(e.name),1)])),_:2},1032,["to"])]),o("td",J,u(new Date(1e3*e.created_at).toLocaleString()),1),o("td",T,u(e.size),1),o("td",W,u(e.num_unacknowledged),1),o("td",Y,u(e.num_acknowledged),1),o("td",G,u(e.memory_size)+" bytes ",1),o("td",K,u(e.persistent?"Yes":"No"),1)])))),128))])]),(d(),n(g,{to:"#dialog-target"},[o(w,{modelValue:e.createDialog,"onUpdate:modelValue":t[5]||(t[5]=t=>e.createDialog=t),"render-target":"#dialog-target"},{title:r((()=>[X])),actions:r((()=>[Z,o("button",{disabled:!e.queueName,class:"\r\n              bg-blue-700\r\n              font-bold\r\n              py-2\r\n              px-5\r\n              rounded-lg\r\n              disabled:bg-gray-300\r\n              text-white\r\n            ",onClick:t[2]||(t[2]=(...t)=>e.createQueue&&e.createQueue(...t))}," Create ",8,["disabled"]),ee])),default:r((()=>[o("div",null,[v(o("input",{type:"text","onUpdate:modelValue":t[3]||(t[3]=t=>e.queueName=t),placeholder:"Queue name",spellcheck:"false",class:"\r\n              rounded\r\n              px-4\r\n              py-3\r\n              focus:outline-none\r\n              bg-gray-200\r\n              w-full\r\n              font-semibold\r\n              text-sm\r\n            "},null,512),[[x,e.queueName]]),o("div",{class:"mt-1 mb-3 text-sm opacity-60 font-medium",style:{opacity:e.queueName!==e.slug?void 0:0}},[te,o("b",null,u(e.slug),1)],4),v(o("input",{type:"checkbox","onUpdate:modelValue":t[4]||(t[4]=t=>e.queuePersistent=t)},null,512),[[y,e.queuePersistent]]),le])])),_:1},8,["modelValue"])]))])};var ae=t({name:"QueueDetails",setup(){const e=se.currentRoute.value.params.id,t=l(null);return a((async()=>{t.value=await C.defineQueue(se.currentRoute.value.params.id).stat()})),{id:e,stat:t}}});ae.render=function(e,t){return d(),n("div",null,[o("div",null,u(e.id),1),o("div",null,u(JSON.stringify(e.stat)),1)])};const se=w({history:b(),routes:[{path:"/",name:"Home",redirect:"/queues"},{path:"/queues",name:"Queues",component:S},{path:"/queue/:id",name:"Queue",component:ae}]});var ne=t({name:"CDialog",props:{modelValue:{type:Boolean,required:!0}},setup:(e,{emit:t})=>({toggle:function(e){t("update:modelValue",e)}})});const oe={key:0,class:"fixed w-full h-full"},re={class:"w-full h-full flex justify-center content-center relative"},ue={class:"absolute w-full h-full",style:{"pointer-events":"none"}},ie={class:"w-full h-full flex justify-center items-center"},de={class:"p-4 bg-white rounded shadow-lg flex flex-col",style:{"min-width":"400px","min-height":"250px","pointer-events":"auto"}},ce={class:"text-lg font-bold mb-4"},pe=o("div",{style:{"flex-grow":"1"}},null,-1),me={class:"flex"};ne.render=function(e,t,l,a,s,u){return d(),n(k,{name:"fade"},{default:r((()=>[e.modelValue?(d(),n("div",oe,[o("div",re,[o("div",{class:"absolute w-full h-full",style:{background:"#00000077","backdrop-filter":"blur(1px)"},onClick:t[1]||(t[1]=t=>e.toggle(!1))}),o("div",ue,[o("div",ie,[o("div",de,[o("div",ce,[h(e.$slots,"title")]),o("div",null,[h(e.$slots,"default")]),pe,o("div",me,[h(e.$slots,"actions")])])])])])])):q("",!0)])),_:3})};const fe=_(Q);fe.use(se),fe.component("CDialog",ne),fe.mount("#app");
