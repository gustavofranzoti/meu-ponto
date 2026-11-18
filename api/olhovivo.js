// Função serverless (Vercel): faz login na API Olho Vivo com o token
// guardado em variável de ambiente e repassa as consultas do front-end.
const BASE = 'https://api.olhovivo.sptrans.com.br/v2.1';
const PERMITIDOS = [
  '/Linha/Buscar', '/Parada/Buscar', '/Parada/BuscarParadasPorLinha',
  '/Posicao/Linha', '/Previsao/Parada', '/Previsao', '/Corredor'
];
let cookie = null;

async function autenticar() {
  const r = await fetch(`${BASE}/Login/Autenticar?token=${process.env.OLHOVIVO_TOKEN}`, { method: 'POST' });
  if ((await r.text()).trim() !== 'true') throw new Error('Token inválido ou não liberado');
  cookie = r.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
}

async function consultar(url) {
  if (!cookie) await autenticar();
  let r = await fetch(url, { headers: { Cookie: cookie } });
  if (r.status === 401) {          // sessão expirou: autentica de novo
    await autenticar();
    r = await fetch(url, { headers: { Cookie: cookie } });
  }
  return r;
}

module.exports = async (req, res) => {
  const { path, ...params } = req.query;
  if (!PERMITIDOS.includes(path)) return res.status(400).json({ erro: 'Endpoint não permitido' });
  if (!process.env.OLHOVIVO_TOKEN) return res.status(500).json({ erro: 'OLHOVIVO_TOKEN não configurado' });
  try {
    const url = `${BASE}${path}?${new URLSearchParams(params)}`;
    const r = await consultar(url);
    const dados = await r.json();
    res.setHeader('Cache-Control', 's-maxage=10');
    res.status(200).json(dados);
  } catch (e) {
    res.status(502).json({ erro: e.message });
  }
};
