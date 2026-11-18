// Meu Ponto – painel de próximos ônibus com a API Olho Vivo (SPTrans)
const INTERVALO = 30; // segundos entre atualizações
const $ = id => document.getElementById(id);
const estado = { ponto: null, timer: null, restante: 0, mapa: null, camada: null, previsao: null };

// ---------- API ----------
async function api(path, params = {}) {
  const qs = new URLSearchParams({ path, ...params });
  const r = await fetch(`/api/olhovivo?${qs}`);
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).erro || 'Erro ao consultar a SPTrans');
  return r.json();
}

// ---------- Favoritos (localStorage, com proteção) ----------
const favoritos = {
  ler() { try { return JSON.parse(localStorage.getItem('favoritos')) || []; } catch { return []; } },
  salvar(lista) { try { localStorage.setItem('favoritos', JSON.stringify(lista)); } catch { /* sem armazenamento */ } },
  tem(cp) { return this.ler().some(p => p.cp === cp); },
  alternar(p) {
    const lista = this.ler();
    this.salvar(this.tem(p.cp) ? lista.filter(f => f.cp !== p.cp) : [...lista, p]);
  }
};

// ---------- Busca ----------
function itemPonto(p) {
  const li = document.createElement('li');
  const b = document.createElement('button');
  b.className = 'item';
  b.innerHTML = `<strong></strong><small></small>`;
  b.querySelector('strong').textContent = p.np;
  b.querySelector('small').textContent = p.ed || '';
  b.addEventListener('click', () => abrirPonto(p));
  li.append(b);
  return li;
}

function listar(ul, pontos) {
  ul.replaceChildren(...pontos.map(itemPonto));
}

$('form-busca').addEventListener('submit', async e => {
  e.preventDefault();
  const msg = $('msg-busca');
  msg.textContent = 'Buscando…';
  try {
    const pontos = await api('/Parada/Buscar', { termosBusca: $('termo').value.trim() });
    msg.textContent = pontos.length ? `${pontos.length} pontos encontrados. Escolha um:` : 'Nenhum ponto encontrado. Tente outro nome ou endereço.';
    listar($('resultados'), pontos.slice(0, 20));
  } catch (err) {
    msg.textContent = `Não foi possível buscar: ${err.message}`;
  }
});

// ---------- Painel de previsões ----------
function minutosAte(hr, t) {
  const m = s => { const [h, mi] = s.split(':').map(Number); return h * 60 + mi; };
  return (m(t) - m(hr) + 1440) % 1440;
}

function abrirPonto(p) {
  estado.ponto = p;
  $('painel').hidden = false;
  $('t-painel').textContent = p.np;
  $('endereco').textContent = p.ed || '';
  atualizarBotaoFav();
  desenharMapa();
  carregarPrevisao();
  iniciarTimer();
  $('painel').scrollIntoView({ behavior: 'smooth' });
}

async function carregarPrevisao() {
  try {
    estado.previsao = await api('/Previsao/Parada', { codigoParada: estado.ponto.cp });
    renderPrevisoes();
  } catch (err) {
    $('atualizacao').textContent = `Falha ao atualizar: ${err.message}`;
  }
}

function renderPrevisoes() {
  const { hr, p } = estado.previsao;
  const soAcessiveis = $('so-acessiveis').checked;
  const chegadas = [];
  (p?.l || []).forEach(linha => (linha.vs || []).forEach(v => {
    if (soAcessiveis && !v.a) return;
    chegadas.push({ letreiro: linha.c, destino: linha.sl === 1 ? linha.lt0 : linha.lt1, min: minutosAte(hr, v.t), acessivel: v.a, py: v.py, px: v.px });
  }));
  chegadas.sort((a, b) => a.min - b.min);

  const ul = $('previsoes');
  if (!chegadas.length) {
    ul.innerHTML = '<li class="aviso">Nenhum ônibus previsto neste ponto agora.</li>';
  } else {
    ul.replaceChildren(...chegadas.map(c => {
      const li = document.createElement('li');
      li.className = 'prev';
      li.innerHTML = `<span class="letreiro"></span><div><span class="dest"></span><small></small></div><span class="min"></span>`;
      li.querySelector('.letreiro').textContent = c.letreiro;
      li.querySelector('.dest').textContent = `Sentido ${c.destino}`;
      li.querySelector('small').innerHTML = c.acessivel ? '<span class="sel">♿ Acessível</span>' : 'Sem acessibilidade informada';
      li.querySelector('.min').textContent = c.min === 0 ? 'Chegando' : `${c.min} min`;
      return li;
    }));
  }
  desenharOnibus(chegadas);
  $('atualizacao').textContent = `Atualizado às ${hr}`;
}

$('so-acessiveis').addEventListener('change', () => estado.previsao && renderPrevisoes());

function iniciarTimer() {
  clearInterval(estado.timer);
  estado.restante = INTERVALO;
  estado.timer = setInterval(() => {
    if (--estado.restante <= 0) { estado.restante = INTERVALO; carregarPrevisao(); }
  }, 1000);
}

// ---------- Mapa ----------
function desenharMapa() {
  const { py, px, np } = estado.ponto;
  if (!estado.mapa) {
    estado.mapa = L.map('mapa');
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(estado.mapa);
    estado.camada = L.layerGroup().addTo(estado.mapa);
  }
  estado.mapa.setView([py, px], 16);
  estado.camada.clearLayers();
  L.marker([py, px]).addTo(estado.camada).bindPopup(np);
}

function desenharOnibus(chegadas) {
  estado.camada.clearLayers();
  const { py, px, np } = estado.ponto;
  L.marker([py, px]).addTo(estado.camada).bindPopup(np);
  chegadas.slice(0, 10).forEach(c => {
    L.circleMarker([c.py, c.px], { radius: 8, color: c.acessivel ? '#00794f' : '#0f1b2d', fillOpacity: .9 })
      .addTo(estado.camada).bindPopup(`${c.letreiro} – ${c.min === 0 ? 'chegando' : c.min + ' min'}`);
  });
}

// ---------- Favoritos na tela ----------
function atualizarBotaoFav() {
  const ativo = favoritos.tem(estado.ponto.cp);
  const b = $('btn-fav');
  b.textContent = ativo ? '★ Favorito' : '☆ Favoritar';
  b.setAttribute('aria-pressed', ativo);
}

$('btn-fav').addEventListener('click', () => {
  favoritos.alternar(estado.ponto);
  atualizarBotaoFav();
  renderFavoritos();
});

function renderFavoritos() {
  const lista = favoritos.ler();
  $('favoritos-sec').hidden = !lista.length;
  listar($('favoritos'), lista);
}

// ---------- Acessibilidade ----------
$('btn-contraste').addEventListener('click', e => {
  const ativo = document.body.classList.toggle('contraste');
  e.currentTarget.setAttribute('aria-pressed', ativo);
  try { localStorage.setItem('contraste', ativo); } catch { /* ignora */ }
});

try { if (localStorage.getItem('contraste') === 'true') $('btn-contraste').click(); } catch { /* ignora */ }
renderFavoritos();
