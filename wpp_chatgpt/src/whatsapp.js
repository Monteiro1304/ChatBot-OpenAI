// src/whatsapp.js

let clientVenom;

function setClient(client) {
  clientVenom = client;
}

function enviarMensagem(numero, mensagem) {
  if (!clientVenom) {
    console.error("Cliente do Venom ainda não configurado.");
    return;
  }

  // Garante que o número não é de grupo ou status, e adiciona @c.us apenas se necessário
  if (!numero.endsWith("@c.us",) && !numero.endsWith("@g.us") && !numero.endsWith("@broadcast")) {
    numero += "@c.us";
  }

  clientVenom.sendText(numero, mensagem)
    .then(() => console.log(`✅ Mensagem enviada para ${numero}`))
    .catch((err) => console.error(`❌ Erro ao enviar mensagem para ${numero}:`, err));
}


module.exports = { setClient, enviarMensagem };
