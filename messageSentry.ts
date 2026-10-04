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
  //get the player id
  let playerId = await sendDBRequest("players", "findUnique", {
    where: { userId: msg.author.id },
  });
  if(!playerId) {
    //register the player
    playerId = await sendDBRequest("players", "create", {
      data: {
        userId: msg.author.id,
      },
    });
  }
  //attempt to find the user
  let user = await sendDBRequest("userXp", "findUnique", {
    where: { userId: playerId?.id },
  });
  if (!user) {
    //award xp
    await sendDBRequest("userXp", "create", {
      data: {
        userId: playerId?.id,
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
        where: { userId: playerId?.id },
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

async function award(msg: Message,multiplier = 1) {
  const ignoredChars = ignoredCharacters.map(
    (c: { ignoredChar: any }) => c.ignoredChar
  );
  const messageContent = msg.content;
  console.log(`Awarding XP for message: ${messageContent}`);
  console.log(`Multiplier applied: ${multiplier}`);
  switch (botConfig?.xpAwardTypes?.awardType) {
    case "Message":
      await xp(msg, (botConfig?.xpPerAward || 0) * multiplier);
      break;
    case "Character":
      //count the characters in the message ignoring characters in ignoredCharacters
      const characterCount = messageContent
        .split("")
        .filter((c) => !ignoredChars.includes(c)).length;
      await xp(msg, characterCount * (botConfig?.xpPerAward || 0) * multiplier);
      break;
    case "Word":
      //count the words in the message
      const wordCount = messageContent.split(" ").length;
      await xp(msg, wordCount * (botConfig?.xpPerAward || 0) * multiplier);
      break;
  }
  return;
}

async function checkThreshold(msg: Message) {
  // Retrieve XP using relational filter (players holds Discord userId)
  const xp = await sendDBRequest("userXp", "findFirst", {
    where: {
      players: {
        userId: msg.author.id,
      },
    },
    select: {
      userId: true,
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
      where: { userId: xp.userId },
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
  let multiplier = 1;
  if (!Loaded) return; //ignore messages until configuration is loaded
  if (msg.author.bot) return; //ignore bot messages
  //apply multiplier based on channel configuration
  const channelConfigEntry = channelConfig.find(
    (c: { channelId: any }) => c.channelId === msg.channelId
  );
  console.log(`channel config entry:`);
  //it has bigInt which json stringify cannot handle properly, lets process it so it doesn't throw an error
  const safeChannelConfigEntry = JSON.parse(JSON.stringify(channelConfigEntry, (_, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
  console.log(`channel config entry: ${JSON.stringify(safeChannelConfigEntry)}`);
  multiplier = channelConfigEntry?.rpXpLevel ?? 0; //we hold it in here for now, save up on variables
  console.log(`initial multiplier: ${multiplier}`);
  console.log(`direct Read: ${channelConfigEntry.rpXpLevel}`);

  switch(multiplier) {
    case 0:
      multiplier = 1;
      break;
    case 1:
      multiplier = 1.15;
      break;
    case 2:
      multiplier = 1.3;
      break;
    default:
      multiplier = 1;
      break;
  }
  
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
    await award(msg, multiplier);
    await checkThreshold(msg);
  }
  //check if message was sent in the honeypot channel, if so, ban the user that sent the message
  if (msg.channelId === botConfig?.honeypotChannel) {
    const guild = msg.guild;
    if (!guild) return;
    const member = await guild.members.fetch(msg.author.id);
    if (!member) return;
    //ban and delete the messages
    await member.ban({ reason: "Sent a message in the honeypot channel", deleteMessageSeconds: 604800});
    return;
  }
  let isListed = channelBlacklist.find(
    (c: { channelId: any }) => c.channelId === msg.channelId
  );
  if (botConfig?.whitelistmode && !isListed) return; //ignore if whitelist mode is enabled and the channel is not whitelisted
  if (!botConfig?.whitelistmode && isListed) return;
  await award(msg, multiplier);
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
