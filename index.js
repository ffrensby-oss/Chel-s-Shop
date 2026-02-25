// ══════════════════════════════════
// SUPABASE
// ══════════════════════════════════

const SUPA_URL = 'https://biwhblujvlhvdhlxgabt.supabase.co';
const SUPA_KEY = 'sb_publishable_HV1KAe9scUJzefWQdTgEHg_DnU8vecX';

async function supaFetch(path, options = {}) {
  const res = await fetch(SUPA_URL + '/rest/v1/' + path, {
    headers: {
      apikey: SUPA_KEY,
      Authorization: 'Bearer ' + SUPA_KEY,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=representation'
    },
    ...options
  });

  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

// ══════════════════════════════════
// ADMIN
// ══════════════════════════════════

const ADMIN_USER = 'chels';
const ADMIN_PASS = 'shoppinkprojetc';

let productos = [];
let fotosArray = [];
let filtroActivo = 'todos';
let adminOk = sessionStorage.getItem('elara-admin') === '1';

// ══════════════════════════════════
// LOGIN
// ══════════════════════════════════

function iniciarSesion() {
  const u = inp('inp-user').value.trim();
  const p = inp('inp-pass').value;

  if (u === ADMIN_USER && p === ADMIN_PASS) {
    adminOk = true;
    sessionStorage.setItem('elara-admin','1');
    cerrarOverlay('overlay-login');
    refrescarNav();
    renderGrid(); // 🔥 IMPORTANTE
    toast('🌸 Admin activa');
  } else {
    inp('login-error').style.display='block';
  }
}

function cerrarSesion(){
  adminOk=false;
  sessionStorage.removeItem('elara-admin');
  refrescarNav();
  renderGrid(); // 🔥 IMPORTANTE
}

// ══════════════════════════════════
// OVERLAYS
// ══════════════════════════════════

function abrirLogin(){ abrirOverlay('overlay-login'); }
function abrirPanel(){ if(!adminOk) return abrirLogin(); abrirOverlay('overlay-panel'); }

function abrirOverlay(id){ inp(id)?.classList.add('open'); }
function cerrarOverlay(id){ inp(id)?.classList.remove('open'); }

// ══════════════════════════════════
// NAV
// ══════════════════════════════════

function refrescarNav(){
  toggle('badge-admin',adminOk);
  toggle('btn-panel-nav',adminOk);
  toggle('btn-logout',adminOk);
}

// ══════════════════════════════════
// CARGAR PRODUCTOS
// ══════════════════════════════════

async function cargarProductos(){
  try{
    const data =
      await supaFetch('productos?select=*&order=creado.desc');

    productos=data.map(p=>{
      if(!p.fotos && p.foto) p.fotos=[p.foto];
      if(!p.fotos) p.fotos=[];
      return p;
    });

    renderGrid();
  }catch(e){
    console.error(e);
  }
}

// ══════════════════════════════════
// GRID
// ══════════════════════════════════

function renderGrid(){
  const grid=inp('grid');
  if(!grid) return;

  grid.innerHTML=productos.map(p=>{

    const disp = (p.disponibilidad || '').toLowerCase().trim();

    return `
<div class="producto-card">

  ${adminOk ? `
  <div class="card-admin-btns">
    <button onclick="editarProducto('${p.id}')">✏️</button>
    <button onclick="eliminarProducto('${p.id}')">🗑</button>
  </div>` : ''}

  ${p.fotos.length?`
  <div class="galeria">
    <div class="galeria-track">
      ${p.fotos.map(f=>`<img src="${f}">`).join('')}
    </div>
  </div>`:''}

  <div class="producto-info">

    <div class="producto-badge badge-${disp}">
      ${disp === 'disponible' ? '✅ Disponible' : '❌ Agotado'}
    </div>

    <div class="producto-nombre">${p.nombre}</div>
    <div class="producto-precio">$${Number(p.precio).toFixed(2)}</div>

  </div>

</div>`;
  }).join('');
}

// ══════════════════════════════════
// ELIMINAR
// ══════════════════════════════════

async function eliminarProducto(id){
  if(!confirm('¿Eliminar producto?')) return;

  await supaFetch(`productos?id=eq.${id}`,{
    method:'DELETE',
    prefer:'return=minimal'
  });

  cargarProductos();
}

// ══════════════════════════════════
// GUARDAR
// ══════════════════════════════════

async function guardarProducto(){

const nombre=inp('inp-nombre').value.trim();
const precio=parseFloat(inp('inp-precio').value);

if(!nombre||!precio)return toast('Datos inválidos');

await supaFetch('productos',{
method:'POST',
body:JSON.stringify({
nombre,
precio,
disponibilidad:'disponible',
fotos:fotosArray,
creado:Date.now()
})
});

limpiarForm();
cargarProductos();
cerrarOverlay('overlay-panel');
toast('✅ Guardado');
}

// ══════════════════════════════════
// FOTOS
// ══════════════════════════════════

function previsualizarFoto(e){

const files=[...e.target.files];

if(files.length+fotosArray.length>8)
return toast('Máx 8 fotos');

files.forEach(f=>{
const r=new FileReader();
r.onload=x=>{
fotosArray.push(x.target.result);
renderPreview();
};
r.readAsDataURL(f);
});
}

function renderPreview(){
const c=inp('foto-preview-container');
if(!c)return;

c.innerHTML=fotosArray.map((f,i)=>
`<div class="mini-img">
   <img src="${f}">
   <button onclick="quitarFoto(${i})">✕</button>
 </div>`
).join('');
}

function quitarFoto(i){
fotosArray.splice(i,1);
renderPreview();
}

function limpiarForm(){
fotosArray=[];
inp('foto-preview-container').innerHTML='';
}

// ══════════════════════════════════
// HELPERS
// ══════════════════════════════════

function inp(id){return document.getElementById(id);}
function toggle(id,v){
const e=inp(id);
if(e)e.style.display=v?'':'none';
}

function toast(t){
  const el=inp('toast');
  if(!el)return console.log(t);
  el.textContent=t;
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),3000);
}

// ══════════════════════════════════
// ACCESO SECRETO – 3 TOQUES
// ══════════════════════════════════

(function () {

  let count = 0;
  let timer = null;

  function activarAdmin() {
    if (adminOk) abrirPanel();
    else abrirLogin();
  }

  function onTap() {
    count++;
    clearTimeout(timer);
    timer = setTimeout(() => count = 0, 2000);
    if (count >= 3) {
      count = 0;
      activarAdmin();
    }
  }

  const logo = document.getElementById('logo-secreto');

  if (logo) {
    logo.addEventListener('click', onTap);
    logo.addEventListener('touchstart', onTap);
  }

})();

// INIT
refrescarNav();
cargarProductos();2
