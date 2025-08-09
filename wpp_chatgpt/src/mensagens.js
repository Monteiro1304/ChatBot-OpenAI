// src/mensagens.js

const { buscarContratosVencendo } = require("./segfy");
const { enviarMensagem } = require("./whatsapp");

async function checarEEnviarRenovacoes() {
  const contratos = await buscarContratosVencendo();

  contratos.forEach((contrato) => {
    const msg = `Olá ${contrato.nome}, seu seguro vence em ${contrato.vencimento}. Para renovar, clique no link: ${contrato.linkRenovacao}`;
    enviarMensagem(contrato.telefone, msg);
  });
}

module.exports = { checarEEnviarRenovacoes };
