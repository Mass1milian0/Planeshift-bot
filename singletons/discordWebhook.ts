// Licensed under CC BY 4.0
// © Massimiliano Biondi, 2025
// https://creativecommons.org/licenses/by/4.0/
import client,{awaitClientReady} from "./discordClient.ts";
import { sendDBRequest } from "./database.ts";
import type { TextChannel } from "discord.js";

//from db get donation channel

const donationChannel = await sendDBRequest("botConfig", "findUnique", {
  where: { id: 1 },
  select: { donationChannel: true },
});

if (!donationChannel) {
  throw new Error("Donation channel not found");
}

let webhookRemote = await sendDBRequest("webhookInfo", "findUnique", {
  where: { id: 1 },
});
await awaitClientReady;
const channel = client.channels.cache.get(donationChannel.donationChannel);

if (!webhookRemote) {
  //create webhook
  let webhook = await (channel as TextChannel).createWebhook({
    name: "Planeshift Webhook",
    //yes imma hardcode it, idgaf
    avatar:
      "https://cdn.discordapp.com/attachments/345160831006146562/1460446561631866921/57fddf539a14f5f234b6251ff0208d31.webp?ex=6966f25a&is=6965a0da&hm=b6b0cb33e7546317e01e652e1f8a304b4bcc800c3dbb6edca76fb626bae01d0d&",
  });
  sendDBRequest("webhookInfo", "create", {
    data: {
      webhookId: webhook.id,
      webhookToken: webhook.token,
    },
  });
  webhookRemote = webhook;
} else {
  if (channel?.isTextBased()) {
    let webhooks = await (channel as TextChannel).fetchWebhooks();
    let webhook = webhooks.find(
      (webhook) => webhook.id == webhookRemote.webhookId
    );
    if (webhook) {
      webhookRemote = webhook;
    }else{
        //funky shit happened here, technically this else block shouldn't be hit but if it is simply throw balls
        throw new Error("Balls");
    }
  }
}

export default { webhook: webhookRemote };
