// ══════════════════════════════════
const SUPA_URL = 'https://biwhblujvlhvdhlxgabt.supabase.co';
const SUPA_KEY = 'sb_publishable_HV1KAe9scUJzefWQdTgEHg_DnU8vecX';
async function supaFetch(path, options = {}) {
  const res = await fetch(SUPA_URL + '/rest/v1/' + path, {
    headers: {
      'apikey': SUPA_KEY,
      'Authorization': 'Bearer ' + SUPA_KEY,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation',
      ...options.headers
    },
    ...options
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}
// ══════════════════════════════════
// ADMIN CONFIG
// ══════════════════════════════════
const ADMIN_USER = 'chels';
const ADMIN_PASS = 'shoppinkprojetc';
// ══════════════════════════════════
// ESTADO
// ══════════════════════════════════
let productos    = [];
let filtroActivo = 'todos';
let fotoBase64   = '';
let adminOk      = sessionStorage.getItem('elara-admin') === '1';
// ══════════════════════════════════
// CARGAR PRODUCTOS
// ══════════════════════════════════
async function cargarProductos() {
  try {
    const data = await supaFetch('productos?select=*&order=creado.desc');
    productos = data;
    renderGrid(filtroActivo);
    renderLista();
  } catch(e) {
    console.error(e);
    document.getElementById('grid').innerHTML =
      '<div class="vacio">❌ Error al cargar productos. Verifica tu conexión.</div>';
  }
}
// ══════════════════════════════════
// AUTH
// ══════════════════════════════════
function iniciarSesion() {
  const u   = document.getElementById('inp-user').value.trim();
  const p   = document.getElementById('inp-pass').value;
  const err = document.getElementById('login-error');
  if (u === ADMIN_USER && p === ADMIN_PASS) {
    adminOk = true;
    sessionStorage.setItem('elara-admin','1');
    err.style.display = 'none';
    cerrarOverlay('overlay-login');
    refrescarNav();
    renderGrid(filtroActivo);
    toast('👋 Bienvenida, Admin 🌸');
    document.getElementById('inp-pass').value = '';
    document.getElementById('inp-user').value = '';
  } else {
    err.style.display = 'block';
    document.getElementById('inp-pass').value = '';
    document.getElementById('inp-pass').focus();
  }
}
function cerrarSesion() {
  adminOk = false;
  sessionStorage.removeItem('elara-admin');
  refrescarNav();
  renderGrid(filtroActivo);
  toast('👋 Sesión cerrada');
}
function refrescarNav() {
  document.getElementById('badge-admin').style.display   = adminOk ? 'inline'      : 'none';
  document.getElementById('btn-logout').style.display    = adminOk ? 'inline-block' : 'none';
  document.getElementById('btn-panel-nav').style.display = adminOk ? 'inline-block' : 'none';
  document.body.classList.toggle('admin-logged', adminOk);
}
// ══════════════════════════════════
// RENDER GRID
// ══════════════════════════════════
function renderGrid(filtro = 'todos') {
  const grid  = document.getElementById('grid');
  const lista = filtro === 'todos' ? productos : productos.filter(p => p.disponibilidad === filtro);
  if (!lista.length) {
    grid.innerHTML = '<div class="vacio">✨ No hay productos en esta categoría.</div>';
    return;
  }
  grid.innerHTML = lista.map((p, i) => `
    <div class="producto-card" style="animation-delay:${i * .07}s">
      ${p.foto
        ? `<img class="producto-img" src="${p.foto}" alt="${p.nombre}">`
        : '<div class="producto-img-placeholder">🛍️</div>'}
      <div class="card-admin-btns">
        <button class="card-btn"        onclick="editarProducto('${p.id}')">✏️ Editar</button>
        <button class="card-btn danger" onclick="eliminarProducto('${p.id}')">🗑 Borrar</button>
      </div>
      <div class="producto-info">
        <span class="producto-badge badge-${p.disponibilidad}">
          ${p.disponibilidad === 'disponible' ? '✅ Disponible' : '❌ Agotado'}
        </span>
        <div class="producto-nombre">${p.nombre}</div>
        <div class="producto-precio">$${parseFloat(p.precio).toFixed(2)}</div>
      </div>
    </div>`).join('');
}
// ══════════════════════════════════
// RENDER LISTA ADMIN
// ══════════════════════════════════
function renderLista() {
  const div = document.getElementById('lista-admin');
  if (!productos.length) {
    div.innerHTML = '<p style="color:var(--muted);font-size:.9rem;text-align:center;padding:1rem">Sin productos aún.</p>';
    return;
  }
  div.innerHTML = productos.map(p => `
    <div class="item-admin">
      <div class="item-admin-img">${p.foto ? `<img src="${p.foto}" alt="">` : '🛍️'}</div>
      <div class="item-admin-info">
        <strong>${p.nombre}</strong>
        <span>$${parseFloat(p.precio).toFixed(2)} · ${p.disponibilidad}</span>
      </div>
      <div class="item-admin-actions">
        <button class="icon-btn edit" onclick="editarProducto('${p.id}')"   title="Editar">✏️</button>
        <button class="icon-btn del"  onclick="eliminarProducto('${p.id}')" title="Eliminar">🗑</button>
      </div>
    </div>`).join('');
}
// ══════════════════════════════════
// CRUD — SUPABASE
// ══════════════════════════════════
async function guardarProducto() {
  const nombre = document.getElementById('inp-nombre').value.trim();
  const precio = parseFloat(document.getElementById('inp-precio').value);
  const disp   = document.getElementById('inp-disp').value;
  const editId = document.getElementById('edit-id').value;
  if (!nombre)           return toast('⚠️ Ingresa el nombre del producto');
  if (!precio || precio <= 0) return toast('⚠️ Ingresa un precio válido');
  mostrarCarga(true);
  try {
    if (editId) {
      const datos = { nombre, precio, disponibilidad: disp };
      if (fotoBase64) datos.foto = fotoBase64;
      await supaFetch(`productos?id=eq.${editId}`, {
        method: 'PATCH',
        body: JSON.stringify(datos)
      });
      cancelarEdicion();
      toast('✅ Producto actualizado');
    } else {
      await supaFetch('productos', {
        method: 'POST',
        body: JSON.stringify({
          nombre, precio,
          disponibilidad: disp,
          foto: fotoBase64 || null,
          creado: Date.now()
        })
      });
      limpiarForm();
      toast('✅ Producto agregado 🌸');
    }
    await cargarProductos();
  } catch(e) {
    console.error(e);
    toast('❌ Error al guardar. Verifica tu conexión.');
  }
  mostrarCarga(false);
}
function editarProducto(id) {
  const p = productos.find(x => x.id === id);
  if (!p) return;
  document.getElementById('edit-id').value    = p.id;
  document.getElementById('inp-nombre').value = p.nombre;
  document.getElementById('inp-precio').value = p.precio;
  document.getElementById('inp-disp').value   = p.disponibilidad;
  document.getElementById('panel-titulo').textContent = '✏️ Editar producto';
  document.getElementById('btn-guardar').textContent  = 'Guardar cambios';
  document.getElementById('btn-cancelar').style.display = 'block';
  if (p.foto) {
    fotoBase64 = p.foto;
    const prev = document.getElementById('foto-preview');
    prev.src = p.foto; prev.style.display = 'block';
    document.getElementById('upload-text').textContent = '🔄 Foto actual (cambia si deseas)';
  }
  abrirPanel();
  setTimeout(() => document.querySelector('#overlay-panel .panel').scrollTop = 0, 50);
}
async function eliminarProducto(id) {
  if (!confirm('¿Eliminar este producto permanentemente?')) return;
  mostrarCarga(true);
  try {
    await supaFetch(`productos?id=eq.${id}`, {
      method: 'DELETE',
      prefer: 'return=minimal'
    });
    toast('🗑 Producto eliminado');
    await cargarProductos();
  } catch(e) {
    toast('❌ Error al eliminar');
  }
  mostrarCarga(false);
}
function cancelarEdicion() {
  document.getElementById('edit-id').value = '';
  document.getElementById('panel-titulo').textContent = 'Agregar producto';
  document.getElementById('btn-guardar').textContent  = '+ Agregar Producto';
  document.getElementById('btn-cancelar').style.display = 'none';
  limpiarForm();
}
// ══════════════════════════════════
// FOTO
// ══════════════════════════════════
function previsualizarFoto(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    fotoBase64 = ev.target.result;
    const prev = document.getElementById('foto-preview');
    prev.src = fotoBase64; prev.style.display = 'block';
    document.getElementById('upload-text').textContent = '✅ ' + file.name;
  };
  reader.readAsDataURL(file);
}
function limpiarForm() {
  ['inp-nombre','inp-precio'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('inp-disp').value = 'disponible';
  document.getElementById('inp-foto').value = '';
  document.getElementById('foto-preview').style.display = 'none';
  document.getElementById('upload-text').textContent = '📷 Toca aquí para subir una foto';
  fotoBase64 = '';
}
// ══════════════════════════════════
// FILTROS
// ══════════════════════════════════
function filtrar(tipo, btn) {
  filtroActivo = tipo;
  document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderGrid(tipo);
}
// ══════════════════════════════════
// OVERLAYS
// ══════════════════════════════════
function abrirLogin() {
  abrirOverlay('overlay-login');
  setTimeout(() => document.getElementById('inp-user').focus(), 300);
}
function abrirPanel() {
  if (!adminOk) { abrirLogin(); return; }
  renderLista();
  abrirOverlay('overlay-panel');
}
function abrirOverlay(id)  { document.getElementById(id).classList.add('open'); }
function cerrarOverlay(id) { document.getElementById(id).classList.remove('open'); }
function cerrarSi(e, id)   { if (e.target.id === id) cerrarOverlay(id); }
// ══════════════════════════════════
// HELPERS
// ══════════════════════════════════
function mostrarCarga(v) {
  document.getElementById('loading-overlay').classList.toggle('show', v);
}
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 3200);
}
// ══════════════════════════════════
// ACCESO SECRETO — 3 toques al logo
// ══════════════════════════════════
(function() {
  var count = 0, timer = null, hideTimer = null;
  function mostrarContador(n) {
    var el  = document.getElementById('tap-contador');
    var num = document.getElementById('tap-num');
    if (!el || !num) return;
    num.textContent = n;
    el.style.display = 'block';
    el.style.opacity = '1';
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function() {
      el.style.opacity = '0';
      setTimeout(function() { el.style.display = 'none'; }, 300);
    }, 1200);
  }
  function onTap(e) {
    var x = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    var y = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    var dot = document.createElement('div');
    dot.className = 'tap-dot';
    dot.style.left = x + 'px';
    dot.style.top  = y + 'px';
    document.body.appendChild(dot);
    setTimeout(function() { dot.remove(); }, 500);
    count++;
    mostrarContador(count);
    clearTimeout(timer);
    timer = setTimeout(function() { count = 0; }, 2000);
    if (count >= 3) {
      count = 0;
      clearTimeout(timer);
      if (adminOk) abrirPanel();
      else abrirLogin();
    }
  }
  var logo = document.getElementById('logo-secreto');
  if (logo) {
    logo.addEventListener('click',      onTap, { passive: true });
    logo.addEventListener('touchstart', onTap, { passive: true });
  }
})();
// ══════════════════════════════════
// INIT
// ══════════════════════════════════
refrescarNav();
cargarProductos();