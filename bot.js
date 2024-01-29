const mineflayer = require('mineflayer');
const Movements = require('mineflayer-pathfinder').Movements;
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const { GoalBlock, GoalXZ } = require('mineflayer-pathfinder').goals;

const config = require('./settings.json');

const loggers = require('./logging.js');
const logger = loggers.logger;

function createBot() {
  const bot = mineflayer.createBot({
    username: config['bot-account']['username'],
    host: config.server.ip,
    port: config.server.port,
    version: config.server.version,
  });

  bot.loadPlugin(pathfinder);

  const mcData = require('minecraft-data')(bot.version);
  const defaultMove = new Movements(bot, mcData);

  bot.once('spawn', () => {
    logger.info("Bot sunucuya giriş yaptı!");

    if (config.utils['auto-auth'].enabled) {
      logger.info('Otomatik kimlik doğrulama modülü başlatıldı!');

      let password = config.utils['auto-auth'].password;
      setTimeout(() => {
        bot.chat(`/register ${password} ${password}`);
        bot.chat(`/login ${password}`);
      }, 500);

      logger.info(`Kimlik doğrulama komutları çalıştırıldı!`);
    }

    if (config.utils['chat-messages'].enabled) {
      logger.info('Sohbet mesajları modülü başlatıldı!');

      let messages = config.utils['chat-messages']['messages'];

      if (config.utils['chat-messages'].repeat) {
        let delay = config.utils['chat-messages']['repeat-delay'];
        let i = 0;

        setInterval(() => {
          bot.chat(`${messages[i]}`);

          if (i + 1 === messages.length) {
            i = 0;
          } else i++;
        }, delay * 1000);
      } else {
        messages.forEach((msg) => {
          bot.chat(msg);
        });
      }
    }

    const pos = config.position;

    if (config.position.enabled) {
      logger.info(
        `(${pos.x}, ${pos.y}, ${pos.z}) konumunda hareket etmeye başlandı!`
      );
      bot.pathfinder.setGoal(new GoalBlock(pos.x, pos.y, pos.z));
    }

    if (config.utils['anti-afk'].enabled) {
      if (config.utils['anti-afk'].sneak) {
        bot.setControlState('sneak', true);
      }

      if (config.utils['anti-afk'].jump) {
        bot.setControlState('jump', true);
      }

      if (config.utils['anti-afk'].rotate) {
        setInterval(() => {
          bot.look(bot.entity.yaw + 1, bot.entity.pitch, true);
        }, 100);
      }

      if (config.utils['anti-afk']['circle-walk'].enabled) {
        let radius = config.utils['anti-afk']['circle-walk']['radius']
        circleWalk(bot, radius);
      }
    }
  });

  bot.on('chat', (username, message) => {
    if (config.utils['chat-log']) {
      logger.info(`<${username}> ${message}`);
    }
  });

  bot.on('goal_reached', () => {
    if (config.position.enabled) {
      logger.info(
        `Bot şu konuma ulaştı; ${bot.entity.position}`
      );
    }
  });

  bot.on('death', () => {
    logger.warn(
      `Bot öldü ve şu noktada yeniden doğdu; ${bot.entity.position}`
    );
  });

  if (config.utils['auto-reconnect']) {
    bot.on('end', () => {
      setTimeout(() => {
        createBot();
      }, config.utils['auto-reconnect-delay']);
    });
  }

  bot.on('kicked', (reason) => {
    let reasonText = JSON.parse(reason).text;
    if (reasonText === '') {
      reasonText = JSON.parse(reason).extra[0].text
    }
    reasonText = reasonText.replace(/§./g, '');

    logger.warn(`Bot sunucudan atıldı. Sebep; ${reasonText}`)
  }
  );

  bot.on('error', (err) =>
    logger.error(`${err.message}`)
  );
}

function circleWalk(bot, radius) {
  return new Promise(() => {
    const pos = bot.entity.position;
    const x = pos.x;
    const y = pos.y;
    const z = pos.z;

    const points = [
      [x + radius, y, z],
      [x, y, z + radius],
      [x - radius, y, z],
      [x, y, z - radius],
    ];

    let i = 0;
    setInterval(() => {
      if (i === points.length) i = 0;
      bot.pathfinder.setGoal(new GoalXZ(points[i][0], points[i][2]));
      i++;
    }, 1000);
  });
}

createBot();

var http = require('http');

http.createServer(function(req, res) {
  res.write("Bu linki kopyalayın ve Uptime sistemine ekleyin!");
  res.end();
}).listen(8080);