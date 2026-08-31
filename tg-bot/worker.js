const MINI_APP_URL = 'https://itslemme.github.io/party-bets/';
const SUPPORT_URL = 'https://t.me/LLLEMME';
const ADMIN_USERNAME = 'LLLEMME'; // only this Telegram @username can use /stats

const KEYBOARD = {
  inline_keyboard: [
    [{ text: '🎮 Играть', web_app: { url: MINI_APP_URL } }],
    [{ text: '🛟 Поддержка', url: SUPPORT_URL }],
  ],
};

const WELCOME_TEXT =
  'Привет! 👋 Это Party Bets — игра в ставки на события вечеринки.\n\n' +
  '🎮 Жми «Играть», чтобы открыть приложение\n' +
  '🛟 «Поддержка» — если что-то не работает';

async function tg(token, method, payload) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

// Records this chat as a known user (first time only) and returns whether it was new.
async function trackUser(kv, msg) {
  if (!kv) return false;
  const key = `user:${msg.chat.id}`;
  const existing = await kv.get(key);
  if (existing) return false;
  await kv.put(
    key,
    JSON.stringify({
      firstSeen: new Date().toISOString(),
      username: msg.from?.username || null,
      name: msg.from?.first_name || '',
    })
  );
  return true;
}

// Counts all tracked users, paging through KV list results.
async function countUsers(kv) {
  let count = 0;
  let cursor;
  do {
    const page = await kv.list({ prefix: 'user:', cursor });
    count += page.keys.length;
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return count;
}

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Party Bets bot webhook is running.', { status: 200 });
    }

    // Verify the request actually came from Telegram
    const secret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (!env.WEBHOOK_SECRET || secret !== env.WEBHOOK_SECRET) {
      return new Response('forbidden', { status: 403 });
    }

    let update;
    try {
      update = await request.json();
    } catch (e) {
      return new Response('bad request', { status: 400 });
    }

    const msg = update.message;
    if (msg && msg.chat && msg.chat.id) {
      await trackUser(env.USERS_KV, msg);

      if (msg.text === '/stats') {
        if (msg.from?.username === ADMIN_USERNAME) {
          const total = await countUsers(env.USERS_KV);
          await tg(env.BOT_TOKEN, 'sendMessage', {
            chat_id: msg.chat.id,
            text: `👥 Уникальных пользователей бота: ${total}`,
          });
        }
        return new Response('ok', { status: 200 });
      }

      await tg(env.BOT_TOKEN, 'sendMessage', {
        chat_id: msg.chat.id,
        text: WELCOME_TEXT,
        reply_markup: KEYBOARD,
      });
    }

    // Telegram just needs a 200 OK; it doesn't care about the body.
    return new Response('ok', { status: 200 });
  },
};
