# Planeshift Bot

Planeshift Bot is a Discord bot designed to manage XP systems, thresholds, and channel configurations for a server. It provides a variety of commands to configure and interact with the bot.

## Features

- **XP System**: Tracks user XP and ranks based on thresholds.
- **Channel Configuration**: Allows administrators to configure channel-specific settings, such as blacklisting channels or enabling XP rewards for threads.
- **Customizable Settings**: Configure XP award types, cooldowns, and award messages.
- **Worker Thread**: Offloads tasks to a worker thread for better performance.
- **Database Integration**: Uses Prisma and PostgreSQL for data persistence.

## Commands

### Utility Commands
- `/ping`: Replies with "Pong!" to check if the bot is responsive.
- `/getblacklist`: Retrieves the current blacklist status for the server.
- `/resetleaderboard`: Resets the XP leaderboard.
- `/fetchxp`: Fetches the XP and rank of a user.

### Configuration Commands
- `/blacklist`: Toggles the blacklist status of the current channel.
- `/channelconfig`: Configures whether threads in a channel reward XP.
- `/ignorechar`: Configures characters to ignore for XP calculations.
- `/setawardchannel`: Sets the channel where XP award messages will be sent.
- `/threshold`: Creates or updates XP thresholds.
- `/botconfig`: Configures bot-wide settings such as XP award type, cooldowns, and whitelist mode.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/planeshift-bot.git
   cd planeshift-botbun install
   ```
2. Install dependencies:
   ```bash    
    bun install
   ```
3. Set up the environment variables: Create a .env file in the root directory and configure the following:
    ```
    CLIENT_ID="your-client-id"
    TOKEN="your-bot-token"
    GUILD_ID="your-guild-id"
    DATABASE_URL="your-database-url"
    ```
4. Generate the Prisma client:
   ```bash
   npx prisma generate
   ```
5. Run the bot:
   ```bash
   bun run index.ts
   ```

# License
This project is licensed under the Creative Commons Attribution 4.0 International (CC BY 4.0).
To view a copy of this license, visit https://creativecommons.org/licenses/by/4.0/.

Attribution
© Massimiliano Biondi, 2025
Planeshift Bot

You are free to:

- Share — copy and redistribute the material in any medium or format.
- Adapt — remix, transform, and build upon the material for any purpose, even commercially.

Under the following terms:

- Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.
