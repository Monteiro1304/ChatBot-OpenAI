const axios = require("axios");
const venom = require("venom-bot");
const { setClient } = require("./src/whatsapp");
const { checarEEnviarRenovacoes } = require("./src/mensagens");
const banco = require("./src/banco");


const treinamento = `
Seu nome é Vinicius da StarVisa Corretora de Seguros. 

Sempre responda de acordo com as perguntas do cliente

Responda sempre com clareza e em poucas palavras.

Informações sobre a empresa:
- Nome: StarVisa Corretora de Seguros
- Site oficial: https://starvisaseguros.com.br
- Horário de atendimento humano: Segunda a sexta-feira, das 9h às 20h
- Localização: Rua Henri Dunnant, 792 - sala 1005 Chácara Santo Antônio

Quando perguntar de seguro Auto responda:
- Seguro Auto 
  * Veiculos de Passeio.
  * Veiculos Esportivo. 
  * Moto.
  * E Frotas.
  

- Quando perguntar de seguro Residencial responda:
  * Habitual .
  * Veraneio.
  * E Residência Premeium.


- Quando perguntar de Seguro de Vida responda:
    * Vida Individual.
    * Vida Coletivo.
    * Acidentes Pessoais.
  
- Quando perguntar de Seguro Viagem responda:
  * Nacional e Internacional.

- Quando perguntar de Seguro Empresarial responda:
  * Consultorios e Clinicas
  * Comércios.
  * Industrial.
  * Escritórios.
  * 
- Quando perguntar sobre Planos de Saude responda:
  * Plano de Saude Individual.
  * Plano de Saude empresarial

- Quando perguntar sobre Consorcios responda:
  * Consorcio de Automoveis.
  * Consorcio de imoveis.
  * Consorcio de Pesados.
  * Consorcio de Placas Solares.

Quando Perguntar sobre as companhias de Seguro que trabalhamos responda :
  * Porto Seguro
  * Bradesco Seguros
  * Azul Seguros
  * MAPFRE
  * Liberty Seguros
  * HDI Seguros
  * E mais algumas outras ...

Missão:
Oferecer segurança, tranquilidade .

Política de atendimento:
- Sempre tratar o cliente com empatia, clareza e agilidade.
- Oferecer informações reais e úteis.

Importante:
- Responder sempre de uma maneira bem humanizada.
`;

const header = {
  "Content-Type": "application/json",
  "Authorization": "Bearer sk-proj" // Substitua com sua chave
};

const mensagensProcessadas = new Set();

venom.create({
  session: "StarVisaBOT",
  multidevice: true,
  headless: "new"
})
.then((client) => {
  setClient(client); // se você usa essa função em algum lugar para setar o client manualmente

client.onMessage(async (message) => {
  console.log('Mensagem recebida:', {
    id: message.id,
    from: message.from,
    type: message.type,
    isGroupMsg: message.isGroupMsg,
    isStatus: message.isStatus,
    body: message.body
  });

  const tiposPermitidos = ['chat', 'text'];

  if (
    !message ||
    !message.body ||
    message.isGroupMsg ||
    message.fromMe ||
    message.isStatus === true ||
    !tiposPermitidos.includes(message.type)
  ) return;

    console.log("📥 Mensagem recebida:", message.body);

    // Evita processar a mesma mensagem várias vezes
    if (mensagensProcessadas.has(message.id)) return;
    mensagensProcessadas.add(message.id);
    setTimeout(() => mensagensProcessadas.delete(message.id), 60000);

    // Gerencia histórico do usuário
    let userCadastrado = banco.db.find((u) => u.num === message.from);
    if (!userCadastrado) {
      banco.db.push({ num: message.from, historico: [] });
      userCadastrado = banco.db[banco.db.length - 1];
    }

    userCadastrado.historico.push("user: " + message.body);
    if (userCadastrado.historico.length > 20) {
      userCadastrado.historico = userCadastrado.historico.slice(-20);
    }

    const historicoUsuario = userCadastrado.historico
      .filter((msg) => msg.startsWith("user:"))
      .slice(-10);

    const messages = [
      { role: "system", content: treinamento },
      ...historicoUsuario
        .map((msg) => {
          const content = msg.replace("user:", "").trim();
          return content ? { role: "user", content } : null;
        })
        .filter(Boolean),
      { role: "user", content: message.body.trim() || "Olá" }
    ];

    console.log("🧠 Enviando para OpenAI:", JSON.stringify(messages, null, 2));

    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o",
          messages,
          temperature: 0.7
        },
        { headers: header }
      );

      const resposta = response?.data?.choices?.[0]?.message?.content;

      if (resposta && typeof resposta === "string") {
        await client.sendText(message.from, resposta);
        console.log("📤 Mensagem enviada com sucesso!");
      } else {
        console.error("⚠️ Resposta da OpenAI inválida:", JSON.stringify(response.data, null, 2));
        await client.sendText(message.from, "Desculpe, não consegui gerar uma resposta agora.");
      }
    } catch (err) {
      if (err.response && err.response.data) {
        console.error("❌ Erro na API OpenAI:", JSON.stringify(err.response.data, null, 2));
      } else {
        console.error("❌ Erro inesperado na API OpenAI:", JSON.stringify(err, null, 2));
      }

      try {
        await client.sendText(message.from, "Ocorreu um erro ao acessar a IA. Tente novamente mais tarde.");
      } catch (erroEnvio) {
        console.error("❌ Erro ao tentar enviar mensagem de erro:", erroEnvio);
      }
    }
  });
})
.catch((err) => {
  console.error("❌ Erro ao iniciar o Venom:", err);
});
