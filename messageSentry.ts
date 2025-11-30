//@ts-nocheck
// Licensed under CC BY 4.0
// © Massimiliano Biondi, 2025
// https://creativecommons.org/licenses/by/4.0/


import { type Message, type TextChannel } from "discord.js";
import { parentPort } from "worker_threads";
import client from "./singletons/discordClient";
import util from 'node:util'
let botConfig: any;
let channelBlacklist: any[];
let channelConfig: any[];
let ignoredCharacters: any[];
let thresholds: any[];
let Loaded = false;
interface message {
  type: string;
  content: any;
}
const pending = new Map();

function sendDBRequest(type: string, action: string, data?: any) {
  return new Promise((resolve, reject) => {
    const id = Math.random().toString(36).substring(2, 15);
    pending.set(id, { resolve, reject });
    parentPort?.postMessage({
      type: "DB_REQUEST",
      content: {
        id,
        type,
        action,
        data,
      },
    });
  });
}

parentPort?.postMessage({
  type: "LOAD_CONFIG",
});
parentPort?.on("message", async (message: message) => {
  // Handle the message
  switch (message.type) {
    case "CONFIG_LOAD":
      botConfig = message.content.botConfig;
      channelBlacklist = message.content.channelBlacklist;
      channelConfig = message.content.channelConfig;
      ignoredCharacters = message.content.ignoredCharacters;
      thresholds = message.content.thresholds;
      Loaded = true;
      break;
    case "DB_RESPONSE":
      if (pending.has(message.content.id)) {
        const { resolve } = pending.get(message.content.id);
        resolve(message.content.data);
        pending.delete(message.content.id);
      }
      break;
    case "CONFIG_UPDATE":
      parentPort?.postMessage({
        type: "LOAD_CONFIG",
      });
      break;
    default:
      console.warn(`Message Sentry: Unknown message type - ${message.type}`);
  }
});

async function xp(msg: Message, amt: number) {
  //attempt to find the user
  let user = await sendDBRequest("userXp", "findUnique", {
    where: { userId: msg.author.id },
  });
  if (!user) {
    //register user and award xp
    await sendDBRequest("userXp", "create", {
      data: {
        userId: msg.author.id,
        xp: amt,
        last_message: new Date(),
      },
    });
  } else {
    //compare last_message date against the cooldown, only award new date exceeds the cooldown (seconds)
    const cooldown = botConfig?.cooldown || 0;
    const lastMessageDate = new Date(user.last_message); // Ensure it's a Date object
    const currentDate = new Date();

    if (
      currentDate.getTime() - lastMessageDate.getTime() >
      Number(cooldown) * 1000
    ) {
      //award xp
      await sendDBRequest("userXp", "update", {
        where: { userId: msg.author.id },
        data: {
          xp: {
            increment: amt,
          },
          last_message: new Date(),
        },
      });
    }
  }
}

async function award(msg: Message) {
  const ignoredChars = ignoredCharacters.map(
    (c: { ignoredChar: any }) => c.ignoredChar
  );
  const messageContent = msg.content;
  switch (botConfig?.xpAwardTypes?.awardType) {
    case "Message":
      await xp(msg, botConfig?.xpPerAward || 0);
      break;
    case "Character":
      //count the characters in the message ignoring characters in ignoredCharacters
      const characterCount = messageContent
        .split("")
        .filter((c) => !ignoredChars.includes(c)).length;
      await xp(msg, characterCount * (botConfig?.xpPerAward || 0));
      break;
    case "Word":
      //count the words in the message
      const wordCount = messageContent.split(" ").length;
      await xp(msg, wordCount * (botConfig?.xpPerAward || 0));
      break;
  }
  return;
}

async function checkThreshold(msg: Message) {
  // Retrieve the user's XP and rank
  const xp = await sendDBRequest("userXp", "findUnique", {
    where: { userId: msg.author.id },
    select: {
      xp: true,
      rank: true,
    },
  });

  if (!xp) return;

  // Find the threshold the user meets or exceeds
  const userThreshold = thresholds.find(
    (t: { xpRequired: any; tier: number }) =>
      Number(t.xpRequired) <= xp.xp && // User's XP meets or exceeds the threshold
      (!xp.rank || t.tier > xp.rank) // User's rank is less than the threshold's tier
  );

  if (userThreshold) {
    // Award the user the new rank
    await sendDBRequest("userXp", "update", {
      where: { userId: msg.author.id },
      data: { rank: userThreshold.tier },
    });
  } else {
    return;
  }

  // Send a message to the award channel
  if (botConfig?.awardChannel) {
    const awardChannel = client.channels.cache.get(
      botConfig?.awardChannel
    ) as TextChannel;
    let message = `<@${msg.author.id}>
${botConfig?.awardMessage}
\`\`\`!xp ${userThreshold.xpGiven}\`\`\``;

    // Reassign the result of each replace call back to the message variable
    message = message.replace("{user}", `${msg.author.displayName}`);
    message = message.replace("{tier}", `${userThreshold.tier}`);
    message = message.replace(/\\n/g, "\n");

    await awardChannel.send(message);
  }
}

client.on("messageCreate", async (msg: Message<boolean>) => {
  if (!Loaded) return; //ignore messages until configuration is loaded
  if (msg.author.bot) return; //ignore bot messages
  if (msg.channel.isThread()) {
    //get the id of the parent channel
    const parentChannelId = msg.channel.parentId;
    let isListed = channelBlacklist.find(
      (c: { channelId: any }) => c.channelId === parentChannelId
    );
    if (botConfig?.whitelistmode && !isListed) return; //ignore if whitelist mode is enabled and the parent channel is not whitelisted
    if (!botConfig?.whitelistmode && isListed) return; //ignore if blacklist mode is enabled and the parent channel is blacklisted
    const parentChannelConfig = channelConfig.find(
      (c: { channelId: any }) => c.channelId === parentChannelId
    );
    //ignore if the parent channel is set to not follow threads, default to following threads
    let followThreads = parentChannelConfig?.followThreads ?? true;
    if (!followThreads) return;
    await award(msg);
    await checkThreshold(msg);
  }
  let isListed = channelBlacklist.find(
    (c: { channelId: any }) => c.channelId === msg.channelId
  );
  if (botConfig?.whitelistmode && !isListed) return; //ignore if whitelist mode is enabled and the channel is not whitelisted
  if (!botConfig?.whitelistmode && isListed) return;
  await award(msg);
  await checkThreshold(msg);
});

await fetch(
  "https://sm.hetrixtools.net/hb/?s=e48cc2868e3c4ecaa485e50944fbc66d",
  {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  }
);
setInterval(async () => {
  //curl --retry 3 --retry-delay 1 -m 15 https://sm.hetrixtools.net/hb/?s=e48cc2868e3c4ecaa485e50944fbc66d
  await fetch(
    "https://sm.hetrixtools.net/hb/?s=e48cc2868e3c4ecaa485e50944fbc66d",
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  ); // Send heartbeat request
}, 1000 * 60); // Every Minute
